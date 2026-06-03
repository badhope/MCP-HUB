# Development workflow

The end-to-end loop for changing code, getting it reviewed, and
shipping it. If you have not read [`CONTRIBUTING.md`](../CONTRIBUTING.md)
yet, read that first — this file is the longer version that
explains the *why*.

---

## 1. Local setup

### One-time

```bash
# Clone and enter the repo
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB

# Backend: Python 3.9+ recommended (3.10+ for `match` statements)
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -e ".[dev]"

# Frontend
cd frontend && npm install && cd ..

# Pre-commit hooks (runs secret-scan, ruff, black, isort, eslint)
pip install pre-commit
pre-commit install
```

`make install-dev` wraps all of the above.

### Day-to-day

```bash
make dev            # backend on :8080 (reload) + frontend on :5173
```

Open `http://localhost:5173`. Edits to `main.py` reload the API
within a second; edits to `frontend/src/**` hot-reload the SPA.

If you do not have Make:

```bash
# Terminal 1
RATE_LIMIT_DISABLED=1 python main.py

# Terminal 2
cd frontend && npm run dev
```

`RATE_LIMIT_DISABLED=1` is recommended for local dev so a flurry
of requests during manual testing does not get cut off. **Do not**
set it in any deployed environment.

---

## 2. Branch and commit

- Branch off `main` with the prefix that matches the change:
  `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`, `ci/`.
- Commit messages follow Conventional Commits:
  `<type>(<scope>): <subject>`. The body should explain *why*,
  not *what* — the diff already shows *what*.
- One logical change per commit. If a refactor is required before
  a feature, the refactor is its own commit.
- If the change is user-visible, add a `CHANGELOG.md` entry under
  `[Unreleased]` in the **same** commit. The CI changelog check
  will fail otherwise (see `.github/workflows/lint.yml`).

---

## 3. Test, lint, typecheck

The minimum bar to get a green CI:

```bash
make test           # pytest
make lint           # ruff + black --check + isort --check + eslint + secret-scan
make typecheck      # mypy (backend) + tsc --noEmit (frontend)
```

`make ci` runs all three in order, with the same flags the
GitHub Action uses.

### What runs in CI, and where

| Check | Workflow | Trigger |
|---|---|---|
| Backend tests | `ci.yml` | every push, every PR |
| Frontend tests + build | `ci.yml` | every push, every PR |
| Ruff / black / isort / eslint | `lint.yml` | every push, every PR |
| mypy / tsc --noEmit | `lint.yml` | every push, every PR |
| Secret scan | `lint.yml` | every push, every PR |
| Container build | `ci.yml` (matrix) | PRs that touch `Dockerfile*`, `docker-compose*`, `requirements.txt`, `pyproject.toml` |
| Frontend deploy | `frontend-deploy.yml` | push to `main` |
| Daily catalog sync | `sync.yml` | cron: `0 6 * * *` |
| Release drafter | `release.yml` | push of `v*.*.*` tag |

If a check fails, the workflow logs link to the exact line; fix
the code, do not silence the check.

---

## 4. Writing a new test

- Backend: place it in `tests/test_<module>.py`. If the test needs
  a running server, use the `live_server` fixture in
  `tests/conftest.py` — it boots a real uvicorn in a background
  thread and tears it down.
- Frontend: place it next to the code it tests, in
  `frontend/src/test/`. Component tests use `@testing-library/react`
  with `happy-dom`. Network calls are intercepted by MSW
  (`frontend/src/test/mocks/handlers.ts`).
- For both, prefer **behavioural** assertions over snapshot tests.
  Snapshots rot.

A new endpoint should add **at least**:

1. One happy-path test (200, payload shape).
2. One failure-path test (404 or 422, error envelope shape).
3. One rate-limit test if it is a write path.

---

## 5. Adding a new dependency

### Python

1. Add it to `pyproject.toml` under `[project.dependencies]` (or
   `[project.optional-dependencies.<group>]` for test/dev only).
2. Run `pip install -e ".[dev]"` to regenerate `requirements.txt`
   if you use `pip-tools`. Otherwise just `pip freeze | grep <pkg>`
   and append.
3. Mention the new dep in the `CHANGELOG.md` "Added" section.
4. Verify it does not pull in a runtime-only dep that is unused
   at import time — `python -c "import main"` should still work.

### npm

1. Add it to `frontend/package.json` (`dependencies` for runtime,
   `devDependencies` for build / test).
2. `npm install` to refresh `package-lock.json`.
3. Commit the lockfile change.
4. Mention it in the changelog.

`dependabot.yml` will keep both ecosystems current on a weekly
cadence; you do not have to file dep-bump PRs by hand.

---

## 6. Reviewing a PR

The reviewer checklist is in `CONTRIBUTING.md`. The short version:

- Does the diff match the commit message?
- Is there a CHANGELOG entry? Is it accurate?
- Is there a test for the new behaviour? Did CI go green?
- Did the author run `make lint` locally? (Check the CI log.)
- Any new env vars, new endpoints, new dependencies? Are they
  mentioned in `docs/API.md` / `docs/ARCHITECTURE.md`?
- Anything in `docs/SECURITY-MODEL.md` that needs a new TM
  entry?

For non-trivial changes, the reviewer should pull the branch
and run `make dev` themselves before approving.

---

## 7. Releasing

`AGENTS.md` has the short version. The full version:

1. Pick a version: `MAJOR.MINOR.PATCH`. The current is in
   `pyproject.toml` and `frontend/package.json` and
   `core/_version.py`. Bump all three in one commit.
2. Update `CHANGELOG.md`: move `[Unreleased]` items under a new
   heading with the version and today's date.
3. `git commit -am "chore(release): vX.Y.Z"`
4. `git tag vX.Y.Z && git push --tags`
5. The `release.yml` workflow will draft a GitHub Release from
   the changelog section.
6. `frontend-deploy.yml` will re-deploy the SPA on the next push
   to `main` (typically done right after the release commit).
7. Verify:
   - `https://github.com/badhope/MCP-HUB/releases` shows the new
     release with notes
   - `https://pypi.org/project/mcp-hub/#history` shows it (after
     the manual `twine upload dist/*` if you have PyPI access)

If something goes wrong mid-release, **never rewrite published
tags** — cut a follow-up patch. Tags are immutable from the
consumer's point of view.
