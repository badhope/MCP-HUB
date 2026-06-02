# Changelog

All notable changes to this project will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
- AI agent guide (`AGENT_GUIDE.md`)
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
