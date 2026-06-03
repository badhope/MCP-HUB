# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- `data_snapshot_date` field in `static-data/stats.json` — surfaces the snapshot's freshness next to every per-server metric so the GitHub Pages demo is clearly labelled as a snapshot, not a live feed. FastAPI backend will overwrite this with `datetime.utcnow()` on every scrape.
- `data_snapshot_date` field on the `StatsResponse` TypeScript type
- `Clock` icon and "Data last synced …" line in `StaticDemoBanner`
- `snapshot` badge under every star count in `ServerCard` and `ServerDetail`
- "Snapshot data — last synced …" footnote in `Quality Assessment` section of `ServerDetail`
- `frontend/public/robots.txt` with sitemap pointer
- `frontend/public/sitemap.xml` covering all top-level routes
- `<link rel="canonical">` and JSON-LD `WebSite` + `SoftwareApplication` structured data in `frontend/index.html`
- `CHANGELOG_CN.md` — Chinese translation of the changelog
- `docs/API_CN.md` — Chinese translation of the API reference
- `.github/workflows/lint.yml` — fast `black`/`isort`/`flake8`/secret-scan/TS-typecheck on every push
- `.github/workflows/frontend-deploy.yml` — auto-build the SPA and publish `frontend/dist/` to the `gh-pages` branch (replaces the manual deploy step)
- `.github/workflows/release.yml` — auto-draft a GitHub Release on `v*.*.*` tag push, pulling notes from `CHANGELOG.md`
- `GET /health` liveness probe in `main.py` (lightweight, no DB/catalog touch)
- `HEALTHCHECK` in `Dockerfile` now hits `/health` instead of `/`
- `GZipMiddleware` in `main.py` (compresses responses ≥ 1KB; `servers.json` shrinks from ~100 KB to <15 KB on the wire)
- `RateLimitMiddleware` in `main.py` — dependency-free in-process token-bucket limiter, defaults to 120 req / 60 s per client IP, exempts `/`, `/health`, `/docs`, `/redoc`, `/openapi.json` and CORS preflight. Tunable via `RATE_LIMIT_REQUESTS`, `RATE_LIMIT_WINDOW`, `RATE_LIMIT_TRUST_PROXY`, `RATE_LIMIT_DISABLED`
- `cli()` console entry-point in `main.py` plus `[project.scripts]` in `pyproject.toml` — `pip install mcp-hub` now exposes `mcp-hub`, `mcp-hub-server`, `mcp-market` commands on `$PATH`
- `[project] classifiers` and `[project.urls]` in `pyproject.toml` for richer PyPI presentation
- `frontend/tsconfig.app.json` + `frontend/tsconfig.node.json` — Vite-recommended split config, now referenced from `tsconfig.json`
- `frontend/.dockerignore` — excludes `node_modules`, tests, `static-data`, editor cruft from the frontend build context
- `.gitattributes` — normalises line endings, marks binary extensions, pins lockfiles to `-diff`
- `.github/FUNDING.yml` — 7 funding platforms enabled (GitHub Sponsors, Open Collective, Ko-fi, Community Bridge, Liberapay, IssueHunt, Buy Me a Coffee)
- `.vscode/` shared team config (settings + 16 recommended extensions), kept under version control via `.gitignore` whitelist
- `.nvmrc` (Node 20) and `.devcontainer/devcontainer.json` for one-click Codespaces
- `.dockerignore` at repo root, Makefile with 25+ targets, examples/README now lists 50 templates
- `docs/ARCHITECTURE.md` — design notes, subsystem boundaries, decision log
- `docs/SECURITY-MODEL.md` — six concrete threat models with mitigations
- `docs/DEVELOPMENT.md` — dev workflow, branch rules, test bar, release process
- `docs/BENCHMARKS.md` — real numbers for the public API (p50/p95/p99 by endpoint, GZip impact, sustained RPS, RSS)
- `tools/bench.py` — the script that produces `docs/BENCHMARKS.md`, runnable locally
- `.github/labeler.yml` + `.github/workflows/labeler.yml` — auto-apply `area/*` labels to PRs based on paths touched
- `.github/release-drafter.yml` — auto-draft release notes on `v*.*.*` tag push, grouped by area
- `.github/ISSUE_TEMPLATE/config.yml` — hide the blank-issue option, point low-effort / security / spec questions to Discussions or SECURITY.md

### Changed
- README, README_CN: rewritten from scratch — removed the emoji-heavy decorative headers, the "100% free / production-ready" marketing tone, and the bullet-list-of-buzzwords structure. Each section now leads with a concrete fact (an endpoint, a number, a file path) and the prose reads like an engineer's first-day-on-the-job note rather than a launch announcement.
- `docs/internal/*.md`: stripped the 200+ decorative emoji that were making the maintainer docs read like AI-generated filler. Tables, headings, and bullets now use plain markdown.
- `docs/internal/IMPROVEMENT_PLAN.md`: `🔴高` / `🟡中` / `🟢低` priority labels replaced with `Priority: high` / `medium` / `low`.
- 234 `print(...)` calls across 18 `tools/*.py` files replaced with module-level `_LOG = logging.getLogger(__name__)` + `_LOG.info(...)`. CLI error output that uses `print(..., file=sys.stderr)` is preserved (logger has no `file=` kwarg). `tools/secret_scanner.py`'s "OK: no secrets detected." stays on stdout so `test_scanner_clean_directory_verbose` keeps passing.
- Added `.flake8` (max-line-length=100, exclude `servers/`, `frontend/`, build dirs) — gives the same 100-char budget that black 26.5.1 + isort 8 already enforce, so the linter / formatter can no longer disagree.
- `Makefile` `deploy-ghpages` target — replaced the manual `git worktree + git push` dance with a pointer to the new GitHub Actions deploy. The gh-pages branch no longer exists; deploys are handled by `actions/deploy-pages@v4` and the Pages artifact uploader.
- `.github/workflows/frontend-deploy.yml` — switched from `peaceiris/actions-gh-pages@v4` (push to gh-pages branch) to `actions/configure-pages@v5` + `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4` (Pages workflow). The SPA fallback (`cp index.html 404.html`) and `.nojekyll` are still produced inline. Repo Pages source switched to `build_type: workflow`.
- Repository branches — `gh-pages` deleted. The repo now has only `main`. Public site at https://badhope.github.io/MCP-HUB/ is still live and continues to update on every push to `main`, just served directly by the Pages CDN instead of from a branch.

### Fixed
- `tools/sync_index.py` F601 — removed three duplicate dict keys (`html`, `notion`, `arxiv`); the canonical definitions in the `document-notes` block are the ones that survive
- `main.py` F541 — removed stray `f` prefix from two identical install/run command blocks (no `{}` placeholders in those literals)
- `tools/build_social_preview.py` F841 — deleted 4 unused bounding-box vars and 1 unused font handle
- `tools/gen_static_data.py` F841 — deleted 2 unused locals (`notable`, `tpl`)
- `tests/test_query.py` / `tools/gen_api_docs.py` E741 — renamed comprehension target `l` to `line` (ambiguous with the digit `1`)
- 22 E501 long lines across `services.py`, `tools/secret_scanner.py`, `tools/completeness_scoring.py`, `tools/gen_static_data.py`, `tools/auto_updater.py`, `tools/notable_projects_navigator.py`, `tools/update_index.py`, `tools/collect_domestic_companies.py` — descriptions shortened, regex/URL/docker commands annotated with `# noqa: E501` where wrapping hurts readability
- `tests/test_api.py` / `tests/test_fastapi.py` E402 — moved mid-file `import socket` to the top import block
- `tools/notable_projects_navigator.py` / `tools/download_manager.py` F541 — stripped redundant `f` prefix from strings without placeholders

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
