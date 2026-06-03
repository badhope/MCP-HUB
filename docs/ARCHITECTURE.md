# Architecture

This document explains how the codebase is organised, what the
seams are between subsystems, and which decisions were deliberate.
It is meant to be read by a new engineer before their first PR.

If you are looking for end-user documentation, see
[`docs/QUICKSTART.md`](QUICKSTART.md) and
[`docs/USER_GUIDE.md`](USER_GUIDE.md) instead.

---

## 1. Bird's-eye view

```
                ┌──────────────────────────────────────────────────────────┐
                │                    GitHub repository                      │
                │  badhope/MCP-HUB                                          │
                └──────────┬──────────────────────────────────────┬─────────┘
                           │  PR / push                            │  push to main
                           ▼                                       ▼
              ┌────────────────────────┐               ┌──────────────────────┐
              │  CI: backend tests,    │               │  CI: build & deploy  │
              │  lint, typecheck       │               │  frontend SPA →      │
              │  (.github/workflows/)  │               │  gh-pages branch     │
              └────────┬───────────────┘               └──────────┬───────────┘
                       │ daily cron                                │
                       ▼                                           ▼
        ┌──────────────────────────┐                  ┌──────────────────────────┐
        │  tools/sync_index.py     │                  │  GitHub Pages CDN        │
        │  tools/score_servers.py  │                  │  static SPA +            │
        │  rebuilds the catalog    │                  │  static-data/*.json      │
        │  → servers-index.json    │                  │  snapshot fallback       │
        └──────────┬───────────────┘                  └──────────┬───────────────┘
                   │ commit                                         │
                   ▼                                                │
        ┌──────────────────────────┐                                │
        │  main branch             │                                │
        │  (source of truth)       │                                │
        └──────────┬───────────────┘                                │
                   │ pip install / docker pull                      │
                   ▼                                                ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │  Runtime                                                          │
        │                                                                  │
        │   ┌─────────────┐       JSON          ┌──────────────────────┐    │
        │   │  React SPA  │ ─────────────────► │  FastAPI process     │    │
        │   │  (gh-pages) │                    │  (main.py)           │    │
        │   └─────────────┘ ◄───────────────── │  - Pydantic v2       │    │
        │                                      │  - GZip middleware   │    │
        │                                      │  - token-bucket RL   │    │
        │                                      │  - in-memory index   │    │
        │                                      └──────────┬───────────┘    │
        │                                                 │                │
        │                                                 ▼                │
        │                                      ┌──────────────────────┐    │
        │                                      │  servers-index.json  │    │
        │                                      │  user-data.json      │    │
        │                                      │  submissions.json    │    │
        │                                      └──────────────────────┘    │
        └──────────────────────────────────────────────────────────────────┘
```

---

## 2. Subsystems

### 2.1 Data layer — `core/`, `tools/`, `servers-index.json`

The catalog lives in **one static JSON file**, `servers-index.json`,
gitignored, rebuilt from upstream sources by `tools/sync_index.py`
on a daily GitHub Action (`tools/sync_index.py` plus the workflow in
`.github/workflows/sync.yml`).

`core/__init__.py` defines `MCPServer`, an in-memory wrapper around
each row. There is no ORM and no DB driver on the request path: the
file is read once at process start (lifespan in `main.py`) and
periodically re-read when its mtime changes — see
`main.py:_data_refresh_thread`.

Source of truth for individual fields:

| Field | Authoritative source |
|---|---|
| `name`, `owner`, `full_name` | upstream `awesome-mcp` registry + manual `server_registry.json` overrides |
| `stars`, `updated_at`, `archived` | GitHub REST API, refreshed daily |
| `categories` | `server_registry.json` (manually curated) + heuristic inference from topics |
| `source_type` | `market-config.json` (`official` vs `community`) |
| `description` | upstream registry, normalised length, no truncation |
| `npm_package` | `server_registry.json` |
| `completeness_score` | `services.py:get_quality_score_for_server` (recomputed on each sync) |

### 2.2 HTTP layer — `main.py`, `api.py`

`main.py` is the **composition root**. It owns:

- the FastAPI `app` instance and the `lifespan` context manager
- the middleware stack: `CORSMiddleware`, `GZipMiddleware` (1 KB
  threshold), and the in-house `RateLimitMiddleware`
- the CLI entry point (`cli()`) wired up to `pyproject.toml`'s
  `[project.scripts]`

`api.py` is a thin router — handlers there are 5–10 lines and
delegate to `services.py` for the actual work. This split exists so
that `services.py` can be imported by `query.py` and the
`tools/` scripts without dragging in FastAPI request objects.

`query.py` exposes `GET /query`, a small natural-language router
that picks the right service function based on keyword matching
("search …", "compare …", "popular …", etc.). It is intentionally
rule-based, not LLM-backed, so the response is deterministic and
testable.

### 2.3 Write paths — `user_data.py`

Favorites, ratings, comments, and submissions are all funnelled
through `user_data.py`. The current backend is a JSON file with
an in-process write lock; this is **deliberately the bottleneck**
for a single-node demo, and the only thing you need to swap if
you want Postgres / Redis / SQLite-WAL is the implementation
behind the same public functions.

### 2.4 Frontend — `frontend/`

Vite + React 19 + TypeScript SPA, lazy-routed, served as a static
bundle on GitHub Pages. The interesting design choice is the
**offline-first fallback**: every public route tries the live API
first (`src/hooks/useServers.ts`) and falls back to a committed
`static-data/*.json` snapshot. This is what makes the GitHub Pages
demo always render even when the API is sleeping or being
re-deployed.

The snapshot dates are surfaced in the UI: a `Clock` icon and
"Data last synced …" line in the banner, a `snapshot` badge next
to each star count, and a footnote in the Quality section.

### 2.5 Tooling — `tools/`

19 CLI scripts, each one a `main()` that exits 0/1. They are
importable but not coupled to each other; `tools/sync_index.py`
calls the others via subprocess when needed (`comprehensive_collector.py`,
`notable_projects_navigator.py`, `completeness_scoring.py`).
There is no Makefile-driven dependency graph — each script reads
what it needs and writes its own output file.

### 2.6 Tests — `tests/`

9 pytest files:

- `test_core.py` — `MCPServer` model, indexes, hashing
- `test_api.py` — end-to-end FastAPI tests via a fixture that
  boots a real uvicorn process
- `test_fastapi.py` — same surface, different test fixtures
  (compatibility shim for the older `live_server` style)
- `test_query.py` — `query.py` keyword router
- `test_export.py` — markdown / JSON export endpoints
- `test_downloader.py` — `tools/downloader.py` upstream fetch
  (mocked)
- `test_user_functions.py` — favourites / ratings / comments /
  submissions
- `test_secret_scanner.py` — pure unit, no I/O
- `conftest.py` — shared fixtures

Front-end tests live in `frontend/src/test/`, run with Vitest, and
use MSW to intercept the API.

---

## 3. Decision log

The notable choices, with the alternatives that were rejected.

### 3.1 Static JSON index, not Postgres

- **Picked** because (a) the whole dataset is < 10 MB, fits in
  memory, (b) it makes the catalog trivially shippable in the
  npm / PyPI / Docker package, (c) agents can embed a snapshot
  with the model.
- **Rejected** SQLite / Postgres because the deployment story
  is "one binary, one file" and we did not want to ship a DB
  driver or a migration tool. The trade-off is no random writes
  on the read path, which is fine — writes are user-data and
  go through `user_data.py`.

### 3.2 In-process rate limit, not Redis

- **Picked** the token-bucket in `main.py` for zero-dep,
  single-node correctness.
- **Rejected** slowapi / Redis because the dependency surface
  is bigger than the problem. For horizontal scale, terminate
  the limit at nginx / Cloudflare — see the "Cross-cutting
  middleware" section in `docs/API.md`.

### 3.3 GitHub Pages for the SPA, not Vercel / Netlify

- **Picked** because the entire deliverable is already on
  GitHub, and the Pages quota is generous for a static SPA.
  The deploy is one workflow: `.github/workflows/frontend-deploy.yml`.
- **Rejected** Vercel because the project does not need edge
  functions or per-route SSR; React Router's `basename` is
  enough to make `/MCP-HUB/…` work.

### 3.4 CI-driven index rebuild, not request-time fetch

- **Picked** so request latency is bounded by in-memory dict
  lookups (~1 ms p50 on `GET /servers`), and so a broken
  upstream does not propagate to the API.
- **Rejected** fetching on demand because (a) latency would
  spike to hundreds of ms, (b) the GitHub API rate limit
  would force us into Redis-backed caching, (c) the catalog
  only changes a few times a day.

### 3.5 GZip by default, not opt-in

- **Picked** because `servers.json` is the only payload that
  matters and it compresses 6–8×.
- The 1 KB threshold prevents gzipping tiny JSON error
  envelopes where the CPU cost is worse than the savings.

---

## 4. Boundary contracts

If you change one side, the other side should be a one-line diff.

| Contract | Owner | Consumer |
|---|---|---|
| `MCPServer` dataclass shape | `core/__init__.py` | `services.py`, `api.py`, `user_data.py` |
| `servers-index.json` schema | `tools/sync_index.py` | `main.py:_load_data_from_disk` |
| `user-data.json` schema | `user_data.py` | only `user_data.py` itself |
| OpenAPI schema | FastAPI introspection | `tools/gen_api_docs.py`, agent tool generators |
| Static-data `*.json` | `tools/gen_static_data.py` | `frontend/src/hooks/useServers.ts` |
| CLI flags of `main.py` | `main.py:cli` | `pyproject.toml [project.scripts]`, `Makefile`, Docker entrypoint |

Tests for these contracts live next to their owners.

---

## 5. Where to add what

| You want to … | Touch this file, not that |
|---|---|
| Add an endpoint | `api.py` (and the test in `tests/test_api.py`) — leave `main.py` alone |
| Change a business rule (scoring, ranking) | `services.py` — leave `api.py` alone |
| Add a CLI script | `tools/your_script.py` — invoke from `tools/sync_index.py` if part of the daily pipeline |
| Change the upstream data source | `tools/sync_index.py` only — verify the schema in `core/__init__.py` still holds |
| Tweak the SPA | files under `frontend/src/` — do not edit files under `frontend/dist/` (they are generated) |
| Update the changelog | `CHANGELOG.md` and `CHANGELOG_CN.md` together, same day |
| Bump a version | `pyproject.toml` + `frontend/package.json` + `core/_version.py` |
