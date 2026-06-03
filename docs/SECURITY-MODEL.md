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
2. The **availability of the catalog API**: a single noisy client
   should not be able to knock the public instance offline.
3. **User-generated content** (favorites, ratings, comments,
   submissions): an attacker should not be able to mass-pollute the
   user data layer to skew recommendations.
4. **Secrets**: nobody should be able to exfiltrate GitHub tokens,
   API keys, or PII from the codebase or the running process.

The project does **not** handle PII, payment data, or auth on
behalf of third parties, so this threat model intentionally does
not cover those.

---

## Threat model

### TM-1 — Mass pollute user-generated content

- **Attacker**: anonymous, can call `POST /comments`, `POST /rate`,
  `POST /favorites`, `POST /submissions/submit`.
- **Asset**: integrity of the user-data layer; trust in
  community ratings.
- **Mitigations**:
  - All write endpoints are rate-limited by the per-IP token bucket
    in `main.py:RateLimitMiddleware` (default 120 req / 60 s).
  - `user_data.py` validates every input through Pydantic v2 models
    with `ge` / `le` / `max_length` constraints before persisting.
  - Submissions are quarantined (`status: "pending"`) until a
    maintainer approves them via `POST /submissions/review`; they
    do not enter `servers-index.json` until then.
  - User IDs are opaque strings; there is no password store.
- **Known gap**: there is no captcha or proof-of-work, so a
  determined attacker with a botnet can still pollute. For
  production scale, terminate the limit at the edge and require
  email-verified accounts for write paths.

### TM-2 — DoS the public API

- **Attacker**: any caller, no auth needed.
- **Asset**: API availability.
- **Mitigations**:
  - `RateLimitMiddleware` per IP.
  - The catalog is in-memory — no DB connection pool to exhaust.
  - Reads are dict scans over a 5 MB dataset; the p99 latency
    budget on the demo instance is < 30 ms (see
    [`BENCHMARKS.md`](BENCHMARKS.md)).
- **Known gap**: the rate limit is in-process. Behind multiple
  workers, multiply by the worker count. The README explicitly
  tells operators to terminate the limit at nginx / Cloudflare.

### TM-3 — Inject executable content into a generated config

- **Attacker**: a server author who wants to ship a malicious
  snippet into MCP Hub.
- **Asset**: trust in the generated configs that users paste into
  their Claude Desktop / Cursor.
- **Mitigations**:
  - `services.py` builds configs from a template; user-provided
    strings are escaped through Pydantic's `str` type, which
    rejects control characters in the description field.
  - Every config snippet is rendered from the same Jinja-style
    template, never from a free-form string the submitter gave us.
  - The submission reviewer (`POST /submissions/review`) is gated
    to maintainers (`@badhope` per `CODEOWNERS`).
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
  - The `download_manager.py` upstream fetch never embeds a
    token in the URL — it uses `x-access-token` + `GIT_ASKPASS`
    (see `CHANGELOG.md` 1.x entry).
- **Known gap**: scanner is regex-based. It does not catch every
  possible encoding (base64'd keys, homoglyph tricks). Pair it
  with GitHub's built-in secret scanning on push.

### TM-5 — SSRF / RCE via the natural-language query endpoint

- **Attacker**: anyone who can call `GET /query?q=…`.
- **Asset**: server process integrity.
- **Mitigation**: `query.py` is **purely rule-based** — there is
  no `eval`, no `subprocess`, no template engine. The input is
  matched against a static keyword table, then handed to a
  `services.py` function whose arguments are themselves
  type-checked. The endpoint cannot reach the network.

### TM-6 — Compromised frontend dependency

- **Attacker**: a malicious update to a transitive npm package.
- **Asset**: visitor browsers, GitHub Pages integrity.
- **Mitigations**:
  - `dependabot.yml` opens weekly PRs for both the root
    `package.json` and `frontend/package.json`.
  - `package-lock.json` is committed, so CI installs exact
    versions, not semver ranges.
  - Frontend code is fully static; there is no eval, no
    `dangerouslySetInnerHTML`, no `Function()` constructor —
    see `frontend/src/lib/markdown.ts` for the sanitised
    markdown renderer.
- **Known gap**: no Subresource Integrity hashes for the
  GitHub Pages CDN. Acceptable because the SPA is fully
  self-contained (no third-party `<script>` tags).

---

## What we deliberately do not do

- **No authentication on the public API.** There is no user
  concept at the read level. Adding auth would break the
  "agent-friendly curl one-liner" promise and add a stateful
  system to maintain.
- **No telemetry, no analytics, no third-party scripts.** The
  SPA loads zero pixels. A future "improve recommendations" loop
  must use only data the user explicitly submitted via
  `POST /comments` etc.
- **No persistence of the user's GitHub token.** `downloader.py`
  passes the token in via `GIT_ASKPASS` for the duration of one
  fetch; it is not written to disk.

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
