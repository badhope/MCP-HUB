# MCP Hub

> **通用适配器平台** — 上游索引 · 我们做的通用适配 · 一键添加更多
>
> *The universal adapter platform for Model Context Protocol servers.*

4,400+ indexed MCP servers · 21 categories · daily upstream sync · zero backend.

[Live demo](https://badhope.github.io/MCP-HUB/) · [中文](README_CN.md)

---

## What it is

MCP Hub is a **static single-page app** that turns the chaotic public
MCP-server landscape into a curated, ranked, easy-to-install catalog. It
sits on three layers:

| Layer | What it is | Where it lives |
|---|---|---|
| **1. Upstream index** | 4,400+ MCP servers mirrored from `awesome-mcp` and friends | `frontend/public/servers-index.json` (~4.4 MB, rebuilt nightly) |
| **2. Our adapters** | A small set of servers we **personally** wrap with a universal install command — score-boosted and labelled "✅ adapted" | `frontend/public/adapters/<name>/adapter.json` |
| **3. The "More" tab** | The entry point for adding new servers we don't yet cover (issue / PR / inline form) | `/more` route |

We are a **mediator / hub**, not a backend: there's no FastAPI, no
Postgres, no auth. The entire stack is a Vite SPA deployed to GitHub
Pages, with a single nightly GitHub Action that fetches the upstream
index, scores every server, and commits a new `servers-index.json`.

---

## Why this exists

The MCP ecosystem is exploding — but the public catalogs are a mess:

- **Install commands differ by language** (`uvx X` vs `npx -y X` vs
  `pip install X` vs `git clone` …), and every client (Claude Desktop,
  Cursor, Cline, Windsurf, …) re-wraps the same server in its own
  config schema.
- **Quality varies wildly** — toy weekend hacks next to production
  systems from Anthropic / Stripe / Microsoft.
- **The "50 templates" problem** — every client integration guide ships
  a hand-maintained JSON for each server, and they all go stale.

MCP Hub fixes that by:

1. **Scoring** every server with a transparent 5-factor formula (see
   [Scoring](#scoring)) so quality is comparable.
2. **Generating the right install command** from the server's
   language/source automatically (`tools/_install_hint.py`).
3. **Labelling the ones we trust** (✅ adapted) so you don't have to
   guess.
4. **Leaving the door open** for new servers via the `/more` tab —
   because we can't adapt everything ourselves.

---

## Quick start

There's no server. Just `npm install` and `npm run dev`.

```bash
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB
cd frontend && npm ci && npm run dev
# → http://localhost:5173
```

That's it. The catalog ships pre-built as
`frontend/public/servers-index.json` (~4.4 MB, ~4,400 servers). No
backend, no DB, no API keys.

### Regenerate the catalog

A daily GitHub Action rebuilds `servers-index.json` from upstream. To
do it locally:

```bash
python3 tools/sync_index.py           # pull upstream + enrich + write servers-index.json (root)
python3 tools/gen_static_data.py      # copy + decorate to frontend/public/servers-index.json
```

Both scripts use only the Python standard library — no `pip install`
needed for the data pipeline. `pytest` is the only Python dep for
running tests:

```bash
pip install pytest
pytest tests/ -v                     # 33 tests, ~0.1 s
```

### Build for production

```bash
make build                           # data + frontend
# or
python3 tools/gen_static_data.py
cd frontend && npm run build
```

The output is `frontend/dist/` — a 7 MB bundle (4.4 MB of which is the
catalog). Drop it on any static host. GitHub Pages works out of the
box (`.github/workflows/frontend-deploy.yml`).

---

## Scoring

Every server in the catalog carries a `score` (0–100) computed at
build time by `tools/completeness_scoring.py`:

| Factor | Weight | What it measures |
|---|---|---|
| `stars` | 30% | `log10(stars + 1) / log10(10_000 + 1)` — diminishing returns past 10k |
| `recency` | 15% | `exp(-Δdays / 30)` — 30-day half-life on the last commit |
| `lang_coverage` | 15% | Whether we have first-class install support for the language |
| `desc_quality` | 20% | Bins on description length (60 / 200 / 500 chars) |
| `our_signal` | 20% | **The most important one.** 0.0 = "we haven't looked at it", 0.4 = "we've researched it", 0.7 = "we're building an adapter", 1.0 = "we ship the adapter" |

The signal weights can be tuned in `tools/completeness_scoring.py`;
tests in `tests/test_scoring.py` lock the formula down.

---

## Universal adapter format

Adapted servers live in `frontend/public/adapters/<server-name>/` and
follow this shape (see `frontend/public/adapters/.gitkeep` — first
adapters land in Phase 9):

```json
{
  "name": "fastmcp",
  "platforms": {
    "claude-desktop": { "command": "uvx", "args": ["fastmcp"] },
    "cursor":        { "command": "uvx", "args": ["fastmcp"] },
    "cline":         { "command": "uvx", "args": ["fastmcp"] },
    "windsurf":      { "command": "uvx", "args": ["fastmcp"] }
  },
  "notes": "Universal uvx invocation; works across all stdio MCP clients."
}
```

`_our_signal.py` walks this directory and tags each catalog server with
its `our_signal` value, which the SPA renders as a colored badge
(✅ adapted / ⚙️ in progress / 👀 researched / 🆕 unprocessed).

---

## Project layout

```
.
├── tools/                            # Python data pipeline (stdlib-only)
│   ├── sync_index.py                 # 1. pull upstream
│   ├── gen_static_data.py            # 2. decorate + write frontend bundle
│   ├── completeness_scoring.py       # 5-factor score
│   ├── _install_hint.py              # uvx/npx/pip/git/docker per language
│   ├── _our_signal.py                # scan adapters/ → our_signal map
│   └── secret_scanner.py             # pre-commit / CI hook
├── tests/                            # 33 pytest tests, no external deps
├── frontend/                         # Vite + React 19 + TypeScript SPA
│   ├── public/
│   │   ├── servers-index.json        # build-time catalog
│   │   └── adapters/                 # Layer 2: our universal adapters
│   └── src/
│       ├── lib/api.ts                # in-memory queries + localStorage
│       ├── pages/                    # Home, OurTools, More, ServerDetail…
│       └── …
├── docs/                             # user-facing docs
├── .github/workflows/                # ci + sync-data + frontend-deploy + …
└── (no main.py, no services.py, no core/, no Dockerfile, no docker-compose)
```

Run `make help` for the full task list.

---

## Architecture

```
                  nightly GitHub Action
                          │
                          ▼
  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
  │  upstream    │ ─► │  sync_index  │ ─► │  gen_static_data │ ─► frontend/public/
  │  awesome-mcp │    │      .py     │    │       .py        │     servers-index.json
  └──────────────┘    └──────────────┘    └──────────────────┘
                                                     │
                                                     ▼
                       ┌─────────────────────────────────────┐
                       │  Vite + React 19 SPA (static)        │
                       │  · reads servers-index.json (4.4 MB) │
                       │  · scores in memory                   │
                       │  · user state in localStorage        │
                       │  · deployed on GitHub Pages          │
                       └─────────────────────────────────────┘
```

- **No request-time work.** The catalog is frozen at build time.
- **No server.** GitHub Pages is enough.
- **No tracking.** Favorites / ratings / comments live in your
  browser's `localStorage`. Clearing site data clears them.

---

## Contributing

- **Add an adapter we don't have yet.** See `frontend/public/adapters/`
  for the format, then open a PR. Score boost is automatic.
- **Add a new server to the catalog.** Most are picked up automatically
  from the upstream `awesome-mcp` mirror on the next daily sync. If it
  isn't, open a `server_submission` issue.
- **Found a bug / have a feature idea / security disclosure?** Use the
  matching template in `.github/ISSUE_TEMPLATE/`.
- Coding standards and PR checklist: [`CONTRIBUTING.md`](CONTRIBUTING.md).

The two things that will get your PR merged fastest are a passing
`make test && make lint` and a [`CHANGELOG.md`](CHANGELOG.md) entry.

---

## License

[MIT](LICENSE). Upstream data is mirrored from
[awesome-mcp](https://github.com/Rodert/awesome-mcp) and each curated
source's public GitHub API — see
[`docs/internal/COMPLETENESS_SCORING_GUIDE.md`](docs/internal/COMPLETENESS_SCORING_GUIDE.md)
for the per-source attribution and scoring rationale.
