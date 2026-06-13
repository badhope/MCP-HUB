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
              │  CI: frontend lint,    │               │  CI: build & deploy  │
              │  test, typecheck       │               │  frontend SPA →      │
              │  (.github/workflows/)  │               │  gh-pages branch     │
              └────────┬───────────────┘               └──────────┬───────────┘
                       │ daily cron                                │
                       ▼                                           ▼
        ┌──────────────────────────┐                  ┌──────────────────────────┐
        │  tools/sync_index.py     │                  │  GitHub Pages CDN        │
        │  tools/gen_static_data.py│                  │  static SPA +            │
        │  rebuilds the catalog    │                  │  servers-index.json      │
        │  → servers-index.json    │                  │  (static asset)          │
        └──────────┬───────────────┘                  └──────────┬───────────────┘
                   │ commit                                         │
                   ▼                                                │
        ┌──────────────────────────┐                                │
        │  main branch             │                                │
        │  (source of truth)       │                                │
        └──────────┬───────────────┘                                │
                   │ fetch (static asset)                           │
                   ▼                                                ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │  Runtime (Browser)                                                │
        │                                                                  │
        │   ┌─────────────────────────────────────────────────────────┐   │
        │   │  React 19 SPA (Vite)                                    │   │
        │   │  - Lazy routes                                          │   │
        │   │  - Code splitting                                       │   │
        │   │  - localStorage for user data                           │   │
        │   └────────────────────┬────────────────────────────────────┘   │
        │                        │ fetch /servers-index.json              │
        │                        ▼                                        │
        │   ┌─────────────────────────────────────────────────────────┐   │
        │   │  servers-index.json (~4.4 MB)                           │   │
        │   │  - 4,400+ servers                                       │   │
        │   │  - score + score_breakdown                              │   │
        │   │  - install_hint                                         │   │
        │   │  - our_signal + our_signal_label                        │   │
        │   └─────────────────────────────────────────────────────────┘   │
        │                                                                  │
        │   ┌─────────────────────────────────────────────────────────┐   │
        │   │  adapters/<name>/adapter.json                           │   │
        │   │  - Layer 2: our universal adapters                      │   │
        │   │  - install.sh + README.md + tests/                      │   │
        │   └─────────────────────────────────────────────────────────┘   │
        └──────────────────────────────────────────────────────────────────┘
```

---

## 2. Subsystems

### 2.1 Data pipeline — `tools/`, `frontend/public/servers-index.json`

The catalog lives in **one static JSON file**, `frontend/public/servers-index.json`,
rebuilt from upstream sources by `tools/sync_index.py` and `tools/gen_static_data.py`
on a daily GitHub Action (`.github/workflows/sync-data.yml`).

The pipeline:
1. `tools/sync_index.py` — pulls the upstream `awesome-mcp` mirror, enriches each
   repo with GitHub API metadata (stars, language, topics, `updated_at`, license).
2. `tools/gen_static_data.py` — reads the root index, runs the 5-factor scoring,
   computes `install_hint` per language, scans `frontend/public/adapters/` for the
   `our_signal` map, and writes the SPA-bound `frontend/public/servers-index.json`.

Source of truth for individual fields:

| Field | Authoritative source |
|---|---|
| `name`, `owner`, `full_name` | upstream `awesome-mcp` registry |
| `stars`, `updated_at`, `archived` | GitHub REST API, refreshed daily |
| `categories` | inferred from topics + manual overrides |
| `description` | upstream registry, normalised length |
| `language` | GitHub API `language` field |
| `install_hint` | `tools/_install_hint.py` (derives from language/source) |
| `score`, `score_breakdown` | `tools/completeness_scoring.py` (5-factor formula) |
| `our_signal`, `our_signal_label` | `tools/_our_signal.py` (scans `adapters/` dir) |

### 2.2 Frontend — `frontend/`

Vite + React 19 + TypeScript SPA, lazy-routed, served as a static bundle on
GitHub Pages. **No backend.** All data comes from the static `servers-index.json`
asset, and user data (favorites, ratings) persists to `localStorage`.

The 3-layer product model:
- **Layer 1**: Upstream index (4,400+ servers) — browse/search/filter/sort
- **Layer 2**: Our universal adapters — servers we've personally wrapped with
  a universal install command, score-boosted and labelled "✅ adapted"
- **Layer 3**: The "More" tab — entry point for adding new servers we don't
  yet cover (issue / PR / inline form)

Key components:
- `src/lib/api.ts` — loads `servers-index.json` once, caches in module-scope,
  exposes the same surface (`getServers`, `getServer`, `getPopularServers`, etc.)
- `src/lib/universalConfig.ts` — generates the universal `mcpServers` JSON from
  a server's `install_hint` + optional adapter manifest
- `src/lib/scoring.ts` — front-end real-time scoring (mirrors the build-time
  5-factor formula)
- `src/lib/localStorage.ts` — favorites/ratings persistence

### 2.3 Adapters — `frontend/public/adapters/`

Layer 2 of the product model. Each adapter is a directory with 4 files:
- `adapter.json` — manifest the build pipeline reads (upstream, status, platforms,
  install_universal, tested_clients, gotchas, notes)
- `install.sh` — one-line installer (idempotent, self-checking)
- `README.md` —改造说明 (what this adapter does, how to install, known gotchas)
- `tests/README.md` — install verification log (smoke test results on each client)

The `tools/_our_signal.py` script walks this directory at build time, reads each
`adapter.json`, and assigns `our_signal` scores:
- `status: "adapted"` → 1.0
- `status: "in_progress"` → 0.7
- `status: "researched"` → 0.4
- unknown/missing → 0.0

### 2.4 Tooling — `tools/`

5 Python scripts, each one a `main()` that exits 0/1. They are importable but
not coupled to each other:
- `tools/sync_index.py` — upstream sync
- `tools/gen_static_data.py` — scoring + install_hint + our_signal → static JSON
- `tools/completeness_scoring.py` — 5-factor score (0-100)
- `tools/_install_hint.py` — derives install commands from language/source
- `tools/_our_signal.py` — scans `adapters/` dir for our signal

There is no Makefile-driven dependency graph — each script reads what it needs
and writes its own output file.

### 2.5 Tests — `tests/` and `frontend/src/test/`

**Backend (Python)**:
- `tests/test_install_hint.py` — 12 tests covering all 5 language branches
- `tests/test_scoring.py` — 21 tests pinning the scoring formula
- `tests/test_our_signal.py` — 23 tests pinning the adapter scanner

**Frontend (TypeScript)**:
- `frontend/src/test/` — 9 test files, run with Vitest
- Component tests use `@testing-library/react` with `happy-dom`
- No MSW mocks — the tests exercise `localStorage` + the static index directly

---

## 3. Decision log

The notable choices, with the alternatives that were rejected.

### 3.1 Static JSON index, not Postgres

- **Picked** because (a) the whole dataset is < 10 MB, fits in browser memory,
  (b) it makes the catalog trivially shippable as a static asset, (c) agents
  can embed a snapshot with the model, (d) no backend required.
- **Rejected** SQLite / Postgres because the deployment story is "one static
  site, one JSON file" and we did not want to ship a DB driver or a migration
  tool. The trade-off is no random writes on the read path, which is fine —
  user data goes to `localStorage`.

### 3.2 No backend, not FastAPI

- **Picked** a pure static SPA because (a) 99% of requests are read-only
  catalog browsing, (b) GitHub Pages is free and fast, (c) no server to
  maintain, (d) user data (favorites/ratings) belongs to the user in their
  browser, not on our server.
- **Rejected** FastAPI because the dependency surface is bigger than the
  problem. The old backend had 38 REST endpoints, GZip + rate-limit middlewares,
  PyPI console scripts — overkill for a catalog browser.

### 3.3 GitHub Pages for the SPA, not Vercel / Netlify

- **Picked** because the entire deliverable is already on GitHub, and the
  Pages quota is generous for a static SPA. The deploy is one workflow:
  `.github/workflows/deploy-pages.yml`.
- **Rejected** Vercel because the project does not need edge functions or
  per-route SSR; React Router's `basename` is enough to make `/MCP-HUB/…` work.

### 3.4 CI-driven index rebuild, not request-time fetch

- **Picked** so the SPA loads a pre-computed JSON with all scores and install
  hints already calculated, and so a broken upstream does not propagate to
  the user.
- **Rejected** fetching on demand because (a) latency would spike to hundreds
  of ms, (b) the GitHub API rate limit would force us into Redis-backed caching,
  (c) the catalog only changes a few times a day.

### 3.5 localStorage for user data, not a backend

- **Picked** because (a) user data (favorites, ratings) belongs to the user,
  (b) no server to maintain, (c) works offline, (d) privacy-friendly.
- **Rejected** a backend because the dependency surface is bigger than the
  problem. The trade-off is no cross-device sync, which is fine — users can
  export their data manually if needed.

---

## 4. Boundary contracts

If you change one side, the other side should be a one-line diff.

| Contract | Owner | Consumer |
|---|---|---|
| `servers-index.json` schema | `tools/gen_static_data.py` | `frontend/src/lib/api.ts` |
| `adapter.json` schema | `frontend/public/adapters/<name>/adapter.json` | `tools/_our_signal.py`, `frontend/src/lib/universalConfig.ts` |
| 5-factor scoring formula | `tools/completeness_scoring.py` | `frontend/src/lib/scoring.ts` |
| `install_hint` derivation | `tools/_install_hint.py` | `frontend/src/lib/universalConfig.ts` |
| Static-data `*.json` | `tools/gen_static_data.py` | `frontend/src/hooks/useServers.ts` |

Tests for these contracts live next to their owners.

---

## 5. Where to add what

| You want to … | Touch this file, not that |
|---|---|
| Add a new adapter | `frontend/public/adapters/<name>/` — create `adapter.json` + `install.sh` + `README.md` + `tests/README.md` |
| Change the scoring formula | `tools/completeness_scoring.py` — verify `frontend/src/lib/scoring.ts` still mirrors it |
| Change the install hint derivation | `tools/_install_hint.py` — verify `frontend/src/lib/universalConfig.ts` still consumes it |
| Change the upstream data source | `tools/sync_index.py` only — verify the schema in `tools/gen_static_data.py` still holds |
| Tweak the SPA | files under `frontend/src/` — do not edit files under `frontend/dist/` (they are generated) |
| Update the changelog | `CHANGELOG.md` only |
| Bump a version | `frontend/package.json` only |
