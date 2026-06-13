# Security model

This document is the engineering team's working threat model. It is
deliberately short. If you find a gap, open a PR — do not wait for
the next security review.

The end-user-facing security policy is in [`SECURITY.md`](../SECURITY.md)
and [`SECURITY_CN.md`](../SECURITY_CN.md). This file is for
contributors.

---

## What we are protecting

1. The **integrity of the catalog**: every server in
   `servers-index.json` should be a real, publicly indexable MCP
   server. Bad entries degrade recommendations for everyone.
2. The **availability of the static site**: GitHub Pages should
   remain accessible to all users.
3. **User-generated content** (favorites, ratings): an attacker
   should not be able to mass-pollute the user data layer to skew
   recommendations.
4. **Secrets**: nobody should be able to exfiltrate GitHub tokens,
   API keys, or PII from the codebase or the running process.

The project does **not** handle PII, payment data, or auth on
behalf of third parties, so this threat model intentionally does
not cover those.

---

## Threat model

### TM-1 — Mass pollute user-generated content

- **Attacker**: anonymous, can write to `localStorage` via the
  browser console or a malicious script.
- **Asset**: integrity of the user-data layer; trust in
  community ratings.
- **Mitigations**:
  - User data (favorites, ratings) is stored in `localStorage`,
    which is per-browser and not synced across devices.
  - There is no server-side persistence of user data, so mass
    pollution is limited to a single browser instance.
  - The SPA does not expose any write endpoints — all user data
    is client-side only.
- **Known gap**: a malicious browser extension or XSS attack could
  manipulate `localStorage`. Mitigated by the fact that the SPA
  is fully static and has no `eval`, no `dangerouslySetInnerHTML`,
  no `Function()` constructor — see `frontend/src/lib/markdown.ts`
  for the sanitised markdown renderer.

### TM-2 — DoS the static site

- **Attacker**: any caller, no auth needed.
- **Asset**: GitHub Pages availability.
- **Mitigations**:
  - The catalog is a static JSON file served by GitHub Pages CDN.
  - There is no backend to exhaust (no DB connection pool, no
    in-memory state).
  - GitHub Pages has built-in DDoS protection and rate limiting.
- **Known gap**: a determined attacker could flood the GitHub Pages
  CDN with requests. Mitigated by GitHub's infrastructure and the
  fact that the static file is cacheable.

### TM-3 — Inject executable content into a generated config

- **Attacker**: a server author who wants to ship a malicious
  snippet into MCP Hub.
- **Asset**: trust in the generated configs that users paste into
  their Claude Desktop / Cursor.
- **Mitigations**:
  - The `install_hint` is derived from the server's language/source
    by `tools/_install_hint.py`, which uses a static template.
    User-provided strings are not interpolated into the command.
  - For Layer 2 adapters, the `install_universal` command is
    hardcoded in `adapter.json` and reviewed by a maintainer.
  - The submission reviewer is gated to maintainers (`@badhope`
    per `CODEOWNERS`).
- **Known gap**: a reviewer can still approve a malicious entry.
  Mitigated by `CODEOWNERS` requiring the repo owner for any
  change to the registry.

### TM-4 — Secret leak into the repo

- **Attacker**: a contributor with commit access, or a malicious
  dependency.
- **Asset**: GitHub PAT, OpenAI / AWS keys, customer tokens.
- **Mitigations**:
  - `tools/secret_scanner.py` runs on every push via
    `.github/workflows/lint.yml` and locally via
    `tools/pre-commit`. It matches 19 patterns including GitHub
    PATs (`ghp_*`, `gho_*`), AWS keys (`AKIA*`), OpenAI
    (`sk-*`), and PEM blocks.
  - `.gitattributes` marks binary files so encoded payloads
    inside PNGs / PDFs do not produce false negatives (or false
    positives) during scans.
  - `.gitignore` blocks `.env`, `*.pem`, `id_rsa*`,
    `.aws/`, `.gcp/`, `.kube/`, etc.
- **Known gap**: scanner is regex-based. It does not catch every
  possible encoding (base64'd keys, homoglyph tricks). Pair it
  with GitHub's built-in secret scanning on push.

### TM-5 — Compromised frontend dependency

- **Attacker**: a malicious update to a transitive npm package.
- **Asset**: visitor browsers, GitHub Pages integrity.
- **Mitigations**:
  - `dependabot.yml` opens weekly PRs for `frontend/package.json`.
  - `package-lock.json` is committed, so CI installs exact
    versions, not semver ranges.
  - Frontend code is fully static; there is no eval, no
    `dangerouslySetInnerHTML`, no `Function()` constructor —
    see `frontend/src/lib/markdown.ts` for the sanitised
    markdown renderer.
- **Known gap**: no Subresource Integrity hashes for the
  GitHub Pages CDN. Acceptable because the SPA is fully
  self-contained (no third-party `<script>` tags).

### TM-6 — Data pipeline integrity

- **Attacker**: a malicious upstream registry or a compromised
  GitHub Action.
- **Asset**: integrity of `servers-index.json`.
- **Mitigations**:
  - The data pipeline (`tools/sync_index.py` + `tools/gen_static_data.py`)
    only reads from public GitHub APIs and the upstream `awesome-mcp`
    registry.
  - The pipeline is run by a GitHub Action with read-only permissions
    (except for committing the updated `servers-index.json`).
  - The `servers-index.json` file is reviewed by a maintainer before
    merging (via the daily sync PR).
- **Known gap**: a malicious upstream could inject bad entries.
  Mitigated by the fact that the pipeline only reads public metadata
  (stars, description, language) and does not execute any code from
  the upstream repos.

---

## What we deliberately do not do

- **No authentication on the public site.** There is no user
  concept at the read level. Adding auth would break the
  "agent-friendly" promise and add a stateful system to maintain.
- **No telemetry, no analytics, no third-party scripts.** The
  SPA loads zero pixels. User data (favorites, ratings) is
  stored in `localStorage` and never sent to a server.
- **No persistence of the user's GitHub token.** The data pipeline
  uses `GITHUB_TOKEN` for API rate limiting, but it is injected
  via GitHub Actions secrets and never written to disk.

---

## How to add a new threat

1. Add a `TM-N` section above.
2. List the asset, the attacker capability, the existing
   mitigations, and the residual risk.
3. If the residual risk is unacceptable, also open a tracking
   issue and link it from the section.
4. Update the "Known gap" lists in the relevant section.

The CI threat-model check (none yet — see ROADMAP) will eventually
refuse to merge a PR that adds a new top-level route without a
matching `TM-N` entry.
