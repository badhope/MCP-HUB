# Security & Privacy

This project takes privacy and security seriously. This document is the
authoritative reference for what may and may not be committed, and how
to handle credentials safely.

## 🔒 Threat Model

| Asset | Sensitivity | Where it lives |
|-------|-------------|----------------|
| Public repo data (server catalog) | Public | GitHub, all branches |
| API tokens used in development | **High** | Local `.env` only, never git |
| Deployment credentials | **High** | GitHub Actions secrets / hosting-provider env |
| User-submitted data (ratings, comments) | Medium | `submissions.json`, `user-data.json` |
| Personal info (real names, emails) | **High** | **Never committed** |

## 🚫 Never Commit

The following types of data must never appear in any file tracked by git:

- **Personal access tokens** — GitHub, npm, PyPI, etc.
- **API keys** — OpenAI, Anthropic, Google Cloud, etc.
- **Database credentials** — connection strings with embedded passwords
- **Private SSH keys / `.pem` / `.pfx` files**
- **Real email addresses, phone numbers, or other PII** of any contributor
  or third party
- **Webhook secrets**, **OAuth client secrets**, **JWT signing keys**

The project includes an automated scanner at
[tools/secret_scanner.py](tools/secret_scanner.py) that detects these
patterns. It is wired into:

1. **Pre-commit hook** ([tools/pre-commit](tools/pre-commit)) — runs on
   every `git commit`
2. **GitHub Actions** ([.github/workflows/ci.yml](.github/workflows/ci.yml))
   — runs on every push and pull request, blocks merge on findings
3. **Manual use** — `python tools/secret_scanner.py .`

The scanner has its own test suite at
[tests/test_secret_scanner.py](tests/test_secret_scanner.py).

## 🛡️ Current Repository State (verified 2026-06-01)

- ✅ `.gitignore` excludes `.env`, `*.pem`, `*.key`, SSH keys, cloud
  provider credentials, IDE settings, and other secret-bearing files
- ✅ No real secrets, API keys, or PII in any tracked file
- ✅ No secrets in any commit's diff (all 9 commits scanned)
- ✅ No secrets in `.git/` logs, reflog, or stash
- ✅ Dev email in git config is a placeholder (`dev@example.com`)
- ✅ Public username (`badhope`) is the GitHub account that owns the
  repo and is therefore already public knowledge

## 📋 Credential Handling by Environment

| Environment | Where secrets live | How to set |
|-------------|-------------------|------------|
| **Local dev** (`.env`) | `/.env` and `/frontend/.env` (gitignored) | Copy from `.env.example` and fill in |
| **CI** (GitHub Actions) | Repository Settings → Secrets and variables → Actions | Add via web UI; reference as `${{ secrets.NAME }}` |
| **Netlify** | Site settings → Environment variables | Add via web UI; available as `process.env.NAME` |
| **Vercel** | Project settings → Environment Variables | Add via web UI; available as `process.env.NAME` |
| **Docker deploy** | External secrets manager (Doppler, Vault, etc.) | Inject at runtime as env vars |

## 🚨 Incident Response: If You Accidentally Commit a Secret

Act within minutes. Once a secret is in git history it must be considered
compromised even after deletion.

1. **Revoke the credential immediately**
   - GitHub PAT: Settings → Developer settings → Personal access tokens
     → Delete or Regenerate
   - OpenAI: <https://platform.openai.com/api-keys>
   - AWS: <https://console.aws.amazon.com/iam/home#/security_credentials>
   - etc.

2. **Remove the secret from git history**
   ```bash
   # If it's in a single file that should never have been committed
   git filter-repo --path <file> --invert-paths

   # Or using BFG Repo-Cleaner
   bfg --delete-files <file>
   bfg --replace-text passwords.txt   # for inline secrets
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

3. **Force-push the cleaned history** (coordinate with collaborators):
   ```bash
   git push origin --force --all
   ```

4. **Notify collaborators** — they must re-clone or `git rebase` onto
   the rewritten history.

5. **Audit downstream usage** — search GitHub, internal logs, and any
   CI caches for the leaked value.

GitHub also runs
[secret scanning](https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning)
on public repos and will email the owner automatically when a known
provider's token is detected. Enable it under repository Settings →
Code security and analysis.

## 🧪 Running the Secret Scanner

```bash
# Scan the whole repository
python tools/secret_scanner.py

# Scan a specific path
python tools/secret_scanner.py frontend/src

# Quiet mode (CI-friendly)
python tools/secret_scanner.py --quiet

# Run as a one-off in a pre-commit workflow
git diff --cached --name-only | xargs python tools/secret_scanner.py
```

Exit codes:
- `0` — no secrets found
- `1` — at least one finding (review output)
- `2` — scanner error (e.g. invalid path)

## 🔍 What the Scanner Detects

| Pattern | Example |
|---------|---------|
| GitHub PATs | `ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789ab` |
| GitHub fine-grained | `github_pat_11AAAA...` |
| AWS Access Key | `AKIAIOSFODNN7EXAMPLE` |
| OpenAI | `sk-proj-...`, `sk-...` |
| Anthropic | `sk-ant-api03-...` |
| Google API | `AIzaSy...` |
| Slack | `xoxb-...`, `xoxp-...` |
| Stripe | `sk_live_...`, `sk_test_...` |
| PEM private keys | `-----BEGIN RSA PRIVATE KEY-----` |
| JWT (long) | `eyJhbG...` (≥150 chars total) |
| Password in URL | `postgresql://user:hunter2@host` |
| npm auth token | `//registry.npmjs.org/:_authToken=...` |
| PyPI token | `pypi-AgEIcHlwaS5vcmc...` |
| Heroku key | `heroku_api_key=...` |

## 📦 Reporting a Vulnerability

If you discover a security issue, please email the maintainer privately
(do not file a public issue with exploit details). For low-severity
findings, open a private security advisory on GitHub:
<https://github.com/badhope/MCP-HUB/security/advisories/new>

## 📜 Audit Log

| Date | Action | Verifier |
|------|--------|----------|
| 2026-06-01 | Removed `ghp_yYlv...` from `.git/config` | local |
| 2026-06-01 | Verified no secrets in working tree (224 files) | `tools/secret_scanner.py` |
| 2026-06-01 | Verified no secrets in 9 commit diffs | `tools/secret_scanner.py` + git log |
| 2026-06-01 | Added `.env.example` warnings + bumped version 2.0.0 → 2.0.1 | manual review |
| 2026-06-01 | Hardened `.gitignore` (cloud creds, more key types) | manual review |
| 2026-06-01 | Created `tools/secret_scanner.py` with 19 patterns | 13 unit tests |
| 2026-06-01 | Created `tools/pre-commit` hook | manual smoke test |
| 2026-06-01 | Wired scanner into `.github/workflows/ci.yml` | YAML review |
