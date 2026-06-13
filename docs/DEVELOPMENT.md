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

# Frontend
cd frontend && npm install

# Pre-commit hooks (runs secret-scan, eslint)
pip install pre-commit
pre-commit install
```

`make install-frontend` wraps the frontend setup.

### Day-to-day

```bash
make frontend       # frontend on :5173 (hot-reload)
```

Open `http://localhost:5173`. Edits to `frontend/src/**` hot-reload the SPA.

If you do not have Make:

```bash
cd frontend && npm run dev
```

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
  `[Unreleased]` in the **same** commit.

---

## 3. Test, lint, typecheck

The minimum bar to get a green CI:

```bash
make test           # pytest (tools/) + vitest (frontend/)
make lint           # eslint + secret-scan
make build          # vite build
```

`make ci` runs all three in order, with the same flags the
GitHub Action uses.

### What runs in CI, and where

| Check | Workflow | Trigger |
|---|---|---|
| Frontend tests + build | `ci.yml` | every push, every PR |
| Python tests (tools/) | `ci.yml` | every push, every PR |
| eslint | `ci.yml` | every push, every PR |
| Secret scan | `gitleaks.yml` | every push, every PR |
| Frontend deploy | `deploy-pages.yml` | push to `main` |
| Daily catalog sync | `sync-data.yml` | cron: `0 4 * * *` |

If a check fails, the workflow logs link to the exact line; fix
the code, do not silence the check.

---

## 4. Writing a new test

- **Python (tools/)**: place it in `tests/test_<module>.py`. Prefer
  **behavioural** assertions over snapshot tests. Snapshots rot.
- **Frontend**: place it in `frontend/src/test/`. Component tests use
  `@testing-library/react` with `happy-dom`. No MSW mocks — the tests
  exercise `localStorage` + the static index directly.

A new adapter should add **at least**:
1. One happy-path test (install script runs, prints JSON).
2. One failure-path test (missing Python/Node, prints install hint).

---

## 5. Adding a new dependency

### Python

1. Add it to `pyproject.toml` under `[tool.black]` or `[tool.isort]`
   (the only Python deps are test/dev tools).
2. Mention the new dep in the `CHANGELOG.md` "Added" section.
3. Verify it does not pull in a runtime-only dep that is unused
   at import time — `python -c "import tools.sync_index"` should
   still work with stdlib only.

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
- Any new env vars, new dependencies? Are they mentioned in
  `docs/ARCHITECTURE.md`?
- Anything in `docs/SECURITY-MODEL.md` that needs a new TM
  entry?

For non-trivial changes, the reviewer should pull the branch
and run `make frontend` themselves before approving.

---

## 7. Releasing

The short version:

1. Pick a version: `MAJOR.MINOR.PATCH`. The current is in
   `frontend/package.json`. Bump it in one commit.
2. Update `CHANGELOG.md`: move `[Unreleased]` items under a new
   heading with the version and today's date.
3. `git commit -am "chore(release): vX.Y.Z"`
4. `git tag vX.Y.Z && git push --tags`
5. The `deploy-pages.yml` workflow will re-deploy the SPA on the
   next push to `main` (typically done right after the release commit).
6. Verify:
   - `https://github.com/badhope/MCP-HUB/releases` shows the new
     release with notes
   - `https://badhope.github.io/MCP-HUB/` shows the new version

If something goes wrong mid-release, **never rewrite published
tags** — cut a follow-up patch. Tags are immutable from the
consumer's point of view.

---

## 8. Adding a new adapter

See [`REFACTOR_PLAN.md`](../REFACTOR_PLAN.md) §9 for the full spec.
The short version:

1. Create `frontend/public/adapters/<name>/` with 4 files:
   - `adapter.json` — manifest (upstream, status, platforms, install_universal,
     tested_clients, gotchas, notes)
   - `install.sh` — one-line installer (idempotent, self-checking)
   - `README.md` —改造说明 (what this adapter does, how to install, known gotchas)
   - `tests/README.md` — install verification log (smoke test results on each client)
2. Run `python3 tools/_our_signal.py` to verify the scanner picks it up.
3. Run `python3 tools/gen_static_data.py` to regenerate the static index.
4. Verify the server's `our_signal` field is now 1.0 in `frontend/public/servers-index.json`.
5. Commit: `feat(adapter): add <name> universal adapter`.
