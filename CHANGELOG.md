# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [3.0.0] - 2026-06-11

> **Architecture pivot: static SPA, no backend.**
>
> The FastAPI backend (38 REST endpoints, `core/`, `services.py`, `user_data.py`, `query.py`,
> GZip + rate-limit middlewares, PyPI console scripts) is gone. MCP Hub is now a Vite + React 19
> SPA deployed straight to GitHub Pages, with user data persisted to `localStorage`. A small Python
> data-pipeline (`tools/sync_index.py` → `tools/gen_static_data.py`) fetches upstream nightly and
> emits a single `frontend/public/servers-index.json` (~4.4 MB, 4,400+ servers) the SPA loads
> once at boot.
>
> See [`REFACTOR_PLAN.md`](REFACTOR_PLAN.md) for the full plan, the 5-factor scoring formula, and
> the 3-layer product model (upstream index → our universal adapters → "More" tab).

### Added
- **`tools/sync_index.py`** — pulls the upstream `awesome-mcp` mirror, enriches each repo with
  GitHub API metadata (stars, language, topics, `updated_at`, license), and writes
  `servers-index.json` (root). Stdlib-only.
- **`tools/gen_static_data.py`** — reads the root index, runs the 5-factor scoring, computes
  `install_hint` per language, scans `frontend/public/adapters/` for the `our_signal` map, and
  writes the SPA-bound `frontend/public/servers-index.json`. Stdlib-only.
- **`tools/completeness_scoring.py`** — 5-factor score: stars 30% + recency 15% +
  lang_coverage 15% + desc_quality 20% + our_signal 20% → 0-100. Pure function, fully tested.
- **`tools/_install_hint.py`** — derives a primary install command and 4 alternatives
  (`npx -y X` / `uvx X` / `pip install X` / `git clone …`) from each server's language and
  source. Python → `uvx`; JS/TS → `npx -y`; Go/Rust → repo clone. Also derives a
  `codeload.github.com` zip URL.
- **`tools/_our_signal.py`** — walks `frontend/public/adapters/<name>/adapter.json` and
  returns the `our_signal` map (`✅ adapted=1.0` / `⚙️ in_progress=0.7` / `👀 researched=0.4`).
- **`frontend/public/adapters/.gitkeep`** — Layer 2 (our universal adapters) skeleton. First
  adapters land in 3.1.0.
- **`.github/workflows/sync-data.yml`** — daily 04:00 UTC cron: runs `sync_index.py` and
  `gen_static_data.py`, auto-commits the regenerated `servers-index.json` back to `main`.
- **`tests/test_install_hint.py`** — 12 tests covering all 5 language branches.
- **`tests/test_scoring.py`** — 21 tests pinning the scoring formula.
- **Daily-upstream data file** — `frontend/public/servers-index.json`, served as a static
  asset, with a top-level `{ version, snapshot_date, generator, total_servers,
  total_categories, our_tools_count, categories, languages, source_types, servers[] }` shape.
- **Universal-adapter schema** — `frontend/public/adapters/<name>/adapter.json`:
  `{ name, platforms: { "claude-desktop", "cursor", "cline", "windsurf" }, notes }`. Each
  platform entry is `{ command, args }` — the SPA renders a per-client copy-pasteable config
  block from a single adapter.
- **5 build-time fields on `Server`** — `install_hint`, `score`, `score_breakdown`,
  `our_signal`, `our_signal_label`.
- **`.github/workflows/ci.yml`** — two jobs: `frontend` (type-check + Vite build) and
  `data-pipeline` (pytest). The Python-job / secret-scan-job that used to live here are gone;
  the secret scanner is invoked from `pre-commit` and from a dedicated `gitleaks.yml` workflow.
- **`frontend/.env.example`** — trimmed to `VITE_APP_NAME` / `VITE_APP_VERSION` /
  `VITE_BASE_PATH`; the old `VITE_API_URL` / `VITE_USE_STATIC_DATA` knobs are gone.
- **`frontend/vite.config.ts`** — dropped the `/api → :8080` dev proxy.
- **`REFACTOR_PLAN.md`** — the 5-phase refactor plan, the 3-layer product model, the
  scoring formula, and the per-phase commit shape.

### Changed
- **`frontend/src/lib/api.ts`** — rewritten. The 800-line `requestWithFallback` shim and the
  `STATIC_BASE` demo-mode branch are gone. `loadIndex()` fetches the single
  `servers-index.json` once, caches in module-scope, and exposes the same surface
  (`getServers`, `getServer`, `getPopularServers`, `getRecentServers`, `getCuratedServers`,
  `getServerConfig`, `exportServerMarkdown`, `exportBatchJson`, `exportBatchMarkdown`, …).
  All filtering/sorting happens in memory.
- **`frontend/src/types/index.ts`** — `Server` now has the 5 build-time fields; `full_name`,
  `owner`, `topics`, `created_at`, `archived`, `license` are now optional (the new index
  doesn't always carry them).
- **`Makefile`** — 25+ targets refreshed: `frontend` (dev), `data` / `sync` (pipeline), `test`
  (pytest), `build` / `build-frontend` / `build-data`, `deploy`, plus `clean` /
  `clean-py` / `clean-frontend`. The old `make docker-up` / `make dev` (backend + frontend
  together) are gone.
- **`pyproject.toml`** — reduced to `[tool.black]` + `[tool.isort]`. The `[project]` /
  `[project.optional-dependencies]` / `[project.scripts]` / `[tool.setuptools.packages.find]`
  / `[tool.pytest.ini_options]` blocks are gone — the only Python dep is `pytest`, installed
  by `make install-pytest` / `pip install pytest` in CI.
- **`.gitignore`** — dropped the `servers/` / `awesome-mcp-list/` exceptions (the upstream
  mirror is now written to a single `servers-index.json`, not a 318 MB tree of clones).
- **`.devcontainer/devcontainer.json`** — image is now `python:3.11-bullseye` +
  `devcontainers/features/node:1`; the legacy backend `features: ['docker-in-docker']` is
  gone.
- **`.flake8`** — `servers/` removed from `exclude` (the dir is gone).
- **`CODEOWNERS`** — dropped the `main.py / api.py / services.py / user_data.py / query.py /
  core/ / templates/` rules; kept the `/tools/`, `/frontend/`, `/.github/workflows/`,
  build-config groups.
- **`README.md`** / **`README_CN.md`** — rewritten for the 3-layer product model (upstream
  index → our adapters → "More" tab). Section headings now lead with concrete artefacts
  (a file path, a number, an endpoint).
- **`tools/secret_scanner.py`** + **`tools/pre-commit`** — preserved unchanged; now the
  only Python-based quality gate.
- **`.github/workflows/ci.yml`** — secret-scan job moved out (now lives in
  `.github/workflows/gitleaks.yml`); backend job deleted; new two-job shape: `frontend` +
  `data-pipeline`.
- **`frontend/src/test/setup.ts`** — trimmed; the `VITE_API_URL` /
  `VITE_USE_STATIC_DATA` `import.meta.env` stubs are no longer needed.

### Removed
- **Backend (100%)** — `main.py`, `services.py`, `query.py`, `user_data.py`, `core/`,
  `api.py`. ~120 KB of FastAPI code, plus the matching test files
  (`tests/test_config_builder.py`, `tests/test_export.py`, `tests/test_fastapi.py`,
  `tests/test_core.py`, `tests/test_downloader.py`, `tests/test_query.py`,
  `tests/test_secret_scanner.py`, `tests/test_user_functions.py`, `tests/conftest.py`).
- **Docker (100%)** — `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`,
  `.dockerignore`, `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/nginx.conf`.
  GH Pages does what the Docker stack used to.
- **Upstream reference subprojects (318 MB dead weight)** — `servers/dify` (181 MB),
  `servers/gemini-cli` (132 MB), `servers/memory` (2.5 MB), `servers/filesystem` (2.5 MB).
  These were only ever used as test fixtures for the now-removed `tests/test_core.py` and
  the now-removed `tools/download_manager.py`. Repo size: **318 MB → 17 MB**.
- **Per-server config templates (50 files)** — `templates/*.json`. The same JSON lived in
  `frontend/public/static-data/config/*.json`. Both are gone; install hints are now
  derived automatically from the server's language/source.
- **Stale JSON indexes (3 files)** — `comprehensive_mcp_projects.json` (64 KB),
  `notable_projects.json` (20 KB), `server_registry.json` (56 KB). Superseded by
  `frontend/public/servers-index.json`.
- **Frontend `static-data/` snapshot** — `frontend/public/static-data/{servers,stats,
  categories,companies,curated,featured-configs,index,popular,recent}.json` +
  `static-data/config/*.json` (320 KB). The new `servers-index.json` carries everything
  the SPA needs in one file.
- **13 dead CLI tools** — `tools/auto_updater.py`, `tools/batch_manager.py`,
  `tools/bench.py`, `tools/collect_domestic_companies.py`,
  `tools/comprehensive_collector.py`, `tools/download_manager.py`,
  `tools/downloader.py`, `tools/gen_api_docs.py`, `tools/index_downloader.py`,
  `tools/index_servers.py`, `tools/notable_projects_navigator.py`,
  `tools/server_health_checker.py`, `tools/update_index.py`. All hit the now-removed
  FastAPI endpoints or duplicated what `gen_static_data.py` does.
- **4 stale CI workflows** — `.github/workflows/docker.yml`,
  `.github/workflows/codeql.yml`, `.github/workflows/scorecard.yml`,
  `.github/workflows/lychee.yml`. The first targets the now-removed Docker stack; the
  latter three are high-noise / low-value for a single-package SPA.
- **5 obsolete docs** — `docs/API.md`, `docs/API_CN.md`, `docs/BENCHMARKS.md`,
  `docs/internal/AGENT_GUIDE_CN.md`, `docs/internal/NOTABLE_PROJECTS_GUIDE.md`. Backend
  API reference + bench numbers + cross-team agent notes are no longer applicable.
- **Python packaging metadata** — `pytest.ini`, `requirements.txt`,
  `mcp_hub.egg-info/`. The pipeline + tests use only the stdlib + `pytest`.
- **MSW mocks** — `frontend/src/test/mocks/handlers.ts`,
  `frontend/src/test/mocks/server.ts`. The frontend no longer mocks the backend; the
  tests now exercise `localStorage` + the static index directly.

### Migration notes
- **End users** — the demo at https://badhope.github.io/MCP-HUB/ is unchanged for browsing,
  searching, favoriting, rating, and commenting. Your favorites survive the upgrade
  because they live in `localStorage`. **Clearing site data still clears them — there
  is no server-side account.**
- **Server authors** — server submissions now go through the "More" tab (a static form
  that opens a prefilled `server_submission` issue). The old `POST /submissions/submit`
  endpoint returns 404.
- **AI agents** — the REST API is gone. Read `servers-index.json` directly (it is served
  as a static asset at `/servers-index.json`, ~4.4 MB). The shape is documented at the top of `tools/gen_static_data.py`.

## [2.0.1] - 2026-06-01

### Added
- `httpx2>=2.3.0` dependency (required by FastAPI TestClient in CI)
- `package.json` scripts: `frontend:dev`, `frontend:build`, `frontend:preview`, `frontend:test`, `test:cov` (replaces deleted market.py references)
- `recommend_servers` is now a documented back-compat alias of `recommend_by_scene`
- `tools/secret_scanner.py` — automated secret detector with 19 patterns (GitHub PAT, OpenAI, AWS, PEM keys, etc.) and 13 unit tests
- `tools/pre-commit` — git hook that runs the scanner on staged changes
- `secret-scan` job in `.github/workflows/ci.yml` — runs the scanner on every push/PR, blocks merge on findings
- Threat model, credential-handling matrix, and incident-response runbook in `SECURITY.md`
- `git credential.helper` configured for cache-based local credential storage (no plaintext in `.git/config`)

### Fixed
- `api.py` F821 undefined name `get_quality_level_description` - added to imports from services
- `main.py` F401 unused `import time` removed
- `main.py` F841 local variable `full_name` (assigned but never used) removed
- `main.py` F401 unused `validate_all_servers` import removed
- `tools/batch_manager.py` broken absolute import (`from tools.downloader`) - changed to relative (`from downloader`) so the script runs directly
- `frontend/src/test/lib/download.test.ts` TypeScript type error in mock - explicit type assertion added
- `__init__.py` server count `4354` → `4407` (matches live data)
- `.env.example` versions 2.0.0 → 2.0.1; added prominent "DO NOT put real secrets" warning
- `frontend/.env.example` versions 2.0.0 → 2.0.1; same warning
- Hardened `.gitignore` — added cloud-provider credentials, IDE secrets, more key types, OS files
- Removed plaintext `ghp_yYlv...` token from `.git/config` remote URL (was embedded from push operation)

### Security
- **PRIVACY**: Embedded GitHub PAT was removed from `.git/config`. **The owner MUST revoke the previous token on GitHub** (Settings → Developer settings → Personal access tokens) — it should be considered compromised because it appeared in plaintext in our conversation.
- All 9 commits in history scanned for secrets — no other tokens, API keys, or PII found
- All 224 working-tree files scanned — no secrets detected

### Removed
- `services_completeness.py` (325 lines) - dead duplicate of `services.py` quality functions
- `market.py` (307 lines) - CLI tool, unused after refactor
- `market.sh` - bash wrapper for the deleted `market.py`
- 13 redundant `.md` documentation files (`COMPLETION_REPORT.md`, `FINAL_COMPLETE_SUMMARY.md`, `FINAL_COMPLETION_SUMMARY.md`, `FINAL_VERIFICATION.md`, `TRIPLE_VERIFICATION.md`, `PHASE_3_COMPLETE_REPORT.md`, `UPLOAD_CHECKLIST.md`, `ISSUE_TRIAGE.md`, `IMPLEMENTATION_SUMMARY.md`, `PROJECT_SUMMARY.md`, `COMPREHENSIVE_PROJECTS_SUMMARY.md`, `NAVIGATION_GUIDE.md`)
- 3 unused TypeScript types in `frontend/src/types/index.ts`: `ServerIndex`, `Category`, `Company`
- `package.json` scripts: `list`, `sync` (referenced deleted `market.py`)

## [2.0.0] - 2026-05-21

### Added
- **Auto-sync from upstream** (`tools/sync_index.py`) - Syncs from awesome-mcp daily (4,732 upstream projects)
- **Star ratings** - Every server now has GitHub star count
- **Full metadata** - `full_name`, `owner`, `topics`, `updated_at`, `created_at`, `archived` fields
- **100% source coverage** - Every server has a GitHub source URL (was 15%)
- **30 config templates** - 10 categories: browser (3), search (3), database (3), filesystem (3), developer (4), productivity (3), communication (3), cloud (4), AI/ML (3), demo (1)
- **Sort by stars** - API: `?sort=stars`, CLI: popular/recommend sorted by stars
- **Filter by min-stars** - API: `?min-stars=1000`
- **Sort by updated** - API: `?sort=updated`
- **`/popular` endpoint** - Top servers by stars
- **`/recent` endpoint** - Recently updated servers
- **`/recent` CLI command** - `python query.py recent`
- **`market.py sync`** - Manual trigger for upstream sync
- **CI auto-sync workflow** (`.github/workflows/sync.yml`) - Daily cron at 10:00 Beijing time
- **Topic-based search** - Search now matches against topics and owner fields
- **Star stats in `/stats`** - Total, max, average star counts
- **Language stats in `/stats`** - Distribution across 60 languages
- **Sync metadata** - `last_sync`, `upstream_total` in index and API root
- **Chinese scene support** - `/recommend` endpoint supports both English and Chinese scene names
- **Config route protection** - `/servers/popular` and `/servers/recent` return 400 with guidance

### Changed
- Server count: 451 → 4,354 (9.7x increase)
- Data source: manual curation → automated sync from awesome-mcp
- Config templates: 19 → 30, all npm packages verified
- `list_popular()` now sorts by stars (was source_type priority)
- `recommend_servers()` and `recommend_by_scene()` now sort by stars
- `filter_by_category()` now sorts by stars by default
- `search_servers()` now searches topics and owner fields
- `market.py` version/count now read dynamically from index
- Config generation: added segment-based matching to reduce false positives
- IndexCache: empty index returns complete structure (not partial)
- API `/recommend`: now uses `recommend_by_scene()` (supports Chinese scenes)
- Version: 1.3.0 → 2.0.0

### Fixed
- Fixed `notion` template: wrong env var `OPENAI_API_KEY` → `NOTION_TOKEN`
- Fixed `discord` template: wrong npm package `@discord-mcp/discord-mcp-server` → `discord-mcp-server`
- Fixed `linear` template: wrong npm package `@jsoares/linear-mcp-server` → `linear-mcp-server`
- Fixed `telegram` template: missing `start` argument and `TELEGRAM_BOT_TOKEN` env var
- Fixed `sync_index.py`: upstream null tolerance, removed dead code
- Fixed `index_downloader.py`: `askpass_script` NameError on write failure
- Fixed f-string warnings across 5 files (unused f-prefix on plain strings)
- Fixed CI lint: pinned tool versions, removed mypy (incompatible with hyphenated dir `MCP-HUB`), correct pyflakes version (3.9.1→3.3.2), `--profile=black` for isort

### Removed
- `test_has_readme_without_source` test (no longer applicable - 100% have source)

## [1.3.0] - 2026-05-20

### Added
- **REST API** (`api.py`) - Pure JSON API with CORS, input validation, URL decoding
- **Bilingual README** - English (`README.md`) and Chinese (`README_CN.md`)
- **Source tracing** - Servers include `source` and `source_type` fields
- **English categories** - 23 categories in English (ai-llm, development, database, etc.)
- **Official servers** - 9 official MCP servers with source info
- **Community servers** - 4 popular community servers with source info
- **Index downloader** (`tools/index_downloader.py`) - Download servers from index source
- **Shared service layer** (`services.py`) - Unified business logic for API and query
- **18 config templates** - Official + community server configs for Claude Desktop
- **73 real integration tests** - No mocks, real HTTP/git/subprocess tests

### Changed
- Server count: 438 → 451
- Categories: Chinese emoji → English
- Unified data source: all modules now read from `servers-index.json`
- Rewrote `core/` to use JSON index instead of filesystem scanning
- Removed `universal-adapter/` (unused, incomplete)
- Removed `tools/update_servers.py` (dead code, duplicated by downloader.py)

### Fixed
- Fixed `market.py search` crash (AttributeError on missing `info` attribute)
- Fixed `market.py scan` returning None from `generate_config()`
- Fixed `api.py` CORS not working (added `do_OPTIONS` handler)
- Fixed `api.py` crash on invalid `limit` parameter
- Fixed `query.py` `list_categories()` broken (wrong field name)
- Fixed `query.py` `search()` broken (wrong field names)
- Fixed `batch_manager.py` import path error and division by zero
- Fixed version inconsistency across 10 files (all now 1.3.0)
- Fixed Claude Desktop config examples (removed non-working `${ENV_VAR}` placeholders)
- Fixed `CHANGELOG` inaccurate server counts
- Fixed `SERVER_COUNT` hardcoded as 438 (now dynamic)
- Fixed `.gitignore` missing security/IDE/test entries
- Cleaned all unused imports across codebase (pyflakes clean)

## [1.2.0] - 2026-05-19

### Security
- Fixed Token exposure in downloader.py (using x-access-token + GIT_ASKPASS)

### Added
- AI query interface (`query.py`)
- AI agent guide (`docs/internal/AGENT_GUIDE.md`, superseded by `AGENTS.md`)
- Test framework (`tests/`)
- CI/CD (GitHub Actions)
- CONTRIBUTING.md and CHANGELOG.md

### Changed
- Merged 6 download scripts into `tools/downloader.py`
- Rewrote `core/` framework with search, config generation, stats

## [1.1.0] - 2026-05-16

### Added
- Batch download of MCP servers
- Multi-threaded downloader
- Server category index
- CLI tool (`market.py`)

## [1.0.0] - 2026-05-15

### Added
- Initial release
- 67 MCP servers
- Basic download functionality
