# Labels

GitHub issue / PR labels that the workflows and bots in this repo rely on.
Apply the full set with:

```bash
gh label sync -f .github/labels.yml
```

| Label | Purpose | Applied by |
|-------|---------|-----------|
| `area/backend` | Backend (FastAPI) change | labeler |
| `area/frontend` | Frontend change | labeler |
| `area/docs` | Documentation change | labeler |
| `area/ci` | CI / workflow change | labeler |
| `area/security` | Security-relevant change | labeler |
| `dependencies` | Dependabot update | dependabot |
| `frontend` / `backend` / `root` / `ci` / `docker` | Ecosystem scope | dependabot |
| `stale` | Inactive >30 days, scheduled for close | stale bot |
| `pinned` | Exempt from stale bot | manual |
| `discussion` | Open-ended topic, not a bug | manual |
| `security` | Security-sensitive issue | manual / template |
| `documentation` | Doc typo / improvement | labeler / template |
