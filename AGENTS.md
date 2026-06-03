# AGENTS.md — for AI agents (Codegen / Claude Code / Devin / etc.)
#
# This file follows the emerging AGENTS.md convention used by top OSS
# projects (Cursor, Anthropic, etc.) to give AI coding agents explicit,
# project-specific instructions. It complements `docs/internal/AGENT_GUIDE.md`
# (which is for AI agents helping *users* find MCP servers) and is the file
# that AI coding assistants should read first.

## Project overview

**MCP Hub** is a free, open marketplace of Model Context Protocol (MCP)
servers. It is a **monorepo** containing:

- **Backend**: FastAPI Python service (`main.py`, `api.py`, `services.py`,
  `core/`) that serves a REST API and serves the bundled catalog of MCP
  servers.
- **Frontend**: React + TypeScript + Vite + Tailwind SPA (`frontend/src/`)
  with TanStack Query, Zustand, react-router.
- **Tools**: Python scripts for syncing the index, scoring, and auditing
  (`tools/`).
- **Templates**: Pre-built MCP configurations for popular clients
  (`templates/`).

The full server catalog lives in `servers-index.json` (a single JSON file
generated from upstream awesome-mcp-servers). It is **gitignored** and
rebuilt by the daily GitHub Actions sync workflow.

## Build / run / test commands

```bash
# Install all deps
pip install -r requirements.txt
pip install -e '.[dev,test]'
cd frontend && npm install && cd ..

# Run backend (port 8080)
python main.py --reload

# Run frontend (port 5173)
cd frontend && npm run dev

# Run all tests
python -m pytest tests/ -q
cd frontend && npm run test

# Type check frontend
cd frontend && npm run check

# Lint
flake8 . --max-line-length=120
cd frontend && npm run lint

# Scan for secrets
python tools/secret_scanner.py .

# Sync the index from upstream (rebuilds servers-index.json)
python tools/sync_index.py
```

## Code conventions

### Python (backend)
- Python 3.9+; target version in `pyproject.toml`
- Type hints **required** on all new functions
- Docstrings: one-line for simple functions, multi-line for public APIs
- Style: PEP 8, max line length 120 (relaxed from PEP 8's 79)
- Tests live in `tests/`; mirror the module name (e.g. `api.py` →
  `tests/test_api.py`)
- Use the existing helpers in `services.py` rather than reaching into
  `core/` directly
- **Do not** use relative imports across packages; use absolute imports
  rooted at the project root

### TypeScript (frontend)
- Strict mode is on (`tsconfig.json`); no `any` in new code
- Functional components + hooks; no class components
- Tailwind CSS for styling; do not add a CSS-in-JS library
- TanStack Query for server state, Zustand for UI state
- Use `react-helmet-async` for page titles, not `react-helmet`
- Component files use `.tsx`; utility files use `.ts`

### General
- Never commit secrets (PATs, API keys, real PII). Run
  `python tools/secret_scanner.py .` before pushing.
- Update `CHANGELOG.md` for every user-facing change
- Add tests for every new feature or bugfix
- All new dependencies must be added to **both** `requirements.txt` (or
  `pyproject.toml` for Python) and the appropriate lock file

## File layout (high level)

```
.
├── api.py                    # FastAPI router definitions
├── main.py                   # App factory, lifespan, CORS, startup
├── services.py               # Business logic (search, scoring, config gen)
├── core/                     # Lower-level data model + indexes
├── user_data.py              # User-data storage (favorites, submissions)
├── tools/                    # CLI utilities (sync, scoring, scanner)
├── templates/                # Pre-built MCP config templates
├── tests/                    # Pytest suite
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route-level pages
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # API client, formatters
│   │   ├── store/            # Zustand stores
│   │   └── types/            # TypeScript types
│   └── ...
├── .github/
│   ├── workflows/            # CI / sync workflows
│   ├── ISSUE_TEMPLATE/       # Issue templates
│   └── PULL_REQUEST_TEMPLATE.md
└── docs (root level)
    ├── README.md             # Main entry
    ├── CONTRIBUTING.md
    ├── CODE_OF_CONDUCT.md
    ├── SECURITY.md
    ├── SUPPORT.md
    └── docs/                  # User-facing documentation (EN + CN pairs)
        ├── QUICKSTART.md
        ├── USER_GUIDE.md
        ├── API.md
        └── internal/           # Maintainer-only docs (AGENT_GUIDE.md, etc.)
```

## Do / do not

✅ **Do**
- Read `CHANGELOG.md` before changing version numbers
- Add a CHANGELOG entry for every change
- Run the full test suite before pushing
- Use the existing patterns (TanStack Query, Zustand, etc.) — do not
  introduce new state-management libraries without discussion
- Update `README.md` (English) for any user-facing change; if the change
  is significant, also update `README_CN.md`

❌ **Do not**
- Add hardcoded secrets or example tokens that match real patterns
- Bypass the secret scanner (`--no-verify` is allowed only for genuine
  emergencies, never for ignoring findings)
- Add `console.log` statements to production code
- Push to the `main` branch directly (PRs only)
- Use `any` in TypeScript or `# type: ignore` in Python without a comment
- Add new heavy dependencies without justification
- Generate `servers-index.json` or modify `submissions.json` in commits
  (they are gitignored runtime artifacts)

## Testing strategy

| Layer | Tool | Where |
|-------|------|-------|
| Backend unit + integration | pytest | `tests/test_*.py` |
| Backend API contract | fastapi TestClient | `tests/test_fastapi.py` |
| Frontend unit | Vitest | `frontend/src/test/**/*.test.{ts,tsx}` |
| Frontend component | Vitest + Testing Library | same as above |
| End-to-end smoke | curl scripts in `tools/` | manual + CI |

Run all of these in CI on every PR. Coverage is not enforced as a gate
but should trend upward.

## Release process

1. Bump version in `pyproject.toml`, `package.json`, and `__init__.py`
2. Update `CHANGELOG.md`
3. Commit: `chore(release): vX.Y.Z`
4. Tag: `git tag vX.Y.Z`
5. Push: `git push && git push --tags`
6. (Optional) GitHub release: `gh release create vX.Y.Z`

## When in doubt

- Read the existing code in the same area before writing new code
- Check `docs/internal/AGENT_GUIDE.md` for guidance targeted at AI agents
  helping users find MCP servers (different purpose)
- Open a discussion at <https://github.com/badhope/MCP-HUB/discussions>
