# AGENTS.md — for AI agents (Codegen / Claude Code / Devin / etc.)

This file follows the emerging AGENTS.md convention used by top OSS
projects (Cursor, Anthropic, etc.) to give AI coding agents explicit,
project-specific instructions.

## Project overview

**MCP Hub** is a **static single-page app** that turns the chaotic public
MCP-server landscape into a curated, ranked, easy-to-install catalog.

The entire stack is:
- **Frontend**: React 19 + TypeScript + Vite + Tailwind v4 SPA (`frontend/src/`)
- **Data pipeline**: Python scripts for syncing the index, scoring, and generating static data (`tools/`)
- **Static index**: `frontend/public/servers-index.json` (~4.4 MB, 4,400+ servers, rebuilt nightly)
- **Adapters**: Universal adapter manifests in `frontend/public/adapters/<name>/`
- **Deployment**: GitHub Pages (`.github/workflows/deploy-pages.yml`)

There is **no backend**. No FastAPI, no Postgres, no auth. The entire
catalog is a static JSON file loaded by the SPA. User data (favorites,
ratings) persists to `localStorage`.

## Build / run / test commands

```bash
# Install frontend deps
cd frontend && npm install

# Run frontend dev server (port 5173)
cd frontend && npm run dev

# Run all tests
cd frontend && npm test
python3 -m pytest tests/ -v

# Type check frontend
cd frontend && npm run check

# Lint
cd frontend && npm run lint

# Scan for secrets
python3 tools/secret_scanner.py .

# Rebuild the static index from upstream
python3 tools/sync_index.py
python3 tools/gen_static_data.py

# Build for production
cd frontend && npm run build
```

## Code conventions

### Python (tools/)
- Python 3.9+; stdlib-only (no external dependencies for the data pipeline)
- Type hints **required** on all new functions
- Docstrings: one-line for simple functions, multi-line for public APIs
- Style: PEP 8, max line length 120
- Tests live in `tests/`; mirror the module name (e.g. `sync_index.py` →
  `tests/test_sync_index.py`)
- **Do not** add external dependencies to the data pipeline scripts

### TypeScript (frontend)
- Strict mode is on (`tsconfig.json`); no `any` in new code
- Functional components + hooks; no class components
- Tailwind CSS for styling; do not add a CSS-in-JS library
- Use `react-helmet-async` for page titles, not `react-helmet`
- Component files use `.tsx`; utility files use `.ts`
- User data (favorites, ratings) goes to `localStorage`, not a backend

### General
- Never commit secrets (PATs, API keys, real PII). Run
  `python3 tools/secret_scanner.py .` before pushing.
- Update `CHANGELOG.md` for every user-facing change
- Add tests for every new feature or bugfix
- All new dependencies must be added to the appropriate lock file

## File layout (high level)

```
.
├── tools/                          # Python data pipeline (stdlib-only)
│   ├── sync_index.py               # Pull upstream + enrich metadata
│   ├── gen_static_data.py          # Score + install hints → servers-index.json
│   ├── completeness_scoring.py     # 5-factor scoring algorithm
│   ├── _install_hint.py            # Derive install commands from language/source
│   ├── _our_signal.py              # Scan adapters/ → our_signal map
│   └── secret_scanner.py           # Pre-commit / CI hook
├── tests/                          # Pytest suite (56 tests)
├── frontend/
│   ├── public/
│   │   ├── servers-index.json      # Build-time catalog (~4.4 MB)
│   │   └── adapters/               # Layer 2: universal adapters
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   ├── pages/                  # Route-level pages (Home, Browse, OurTools, More, etc.)
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── lib/                    # API client, scoring, localStorage, universalConfig
│   │   ├── store/                  # Zustand stores (favorites, ratings)
│   │   └── types/                  # TypeScript types
│   └── ...
├── .github/
│   ├── workflows/                  # CI / sync / deploy workflows
│   ├── ISSUE_TEMPLATE/             # Issue templates
│   └── PULL_REQUEST_TEMPLATE.md
└── docs/                           # User-facing documentation
```

## Do / do not

✅ **Do**
- Read `CHANGELOG.md` before changing version numbers
- Add a CHANGELOG entry for every change
- Run the full test suite before pushing
- Update `README.md` (English) for any user-facing change; if the change
  is significant, also update `README_CN.md`
- Test adapters locally before opening a PR (see `frontend/public/adapters/<name>/tests/README.md`)

❌ **Do not**
- Add hardcoded secrets or example tokens that match real patterns
- Bypass the secret scanner (`--no-verify` is allowed only for genuine
  emergencies, never for ignoring findings)
- Add `console.log` statements to production code
- Push to the `main` branch directly (PRs only)
- Use `any` in TypeScript or `# type: ignore` in Python without a comment
- Add new heavy dependencies without justification
- Add a backend (FastAPI, Express, etc.) — this is a **static SPA**
- Generate `servers-index.json` in commits (it is rebuilt by CI)

## Testing strategy

| Layer | Tool | Where |
|-------|------|-------|
| Data pipeline unit | pytest | `tests/test_*.py` |
| Frontend unit | Vitest | `frontend/src/test/**/*.test.{ts,tsx}` |
| Frontend component | Vitest + Testing Library | same as above |

Run all of these in CI on every PR. Coverage is not enforced as a gate
but should trend upward.

## Release process

1. Bump version in `frontend/package.json`
2. Update `CHANGELOG.md`
3. Commit: `chore(release): vX.Y.Z`
4. Tag: `git tag vX.Y.Z`
5. Push: `git push && git push --tags`
6. The `deploy-pages.yml` workflow will re-deploy the SPA on the next push to `main`

## When in doubt

- Read the existing code in the same area before writing new code
- Check `docs/ARCHITECTURE.md` for the 3-layer product model
- Check `docs/DEVELOPMENT.md` for the development workflow
- Open a discussion at <https://github.com/badhope/MCP-HUB/discussions>
