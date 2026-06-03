# MCP Hub

Curated registry of Model Context Protocol (MCP) servers with a FastAPI
backend, a React/Vite SPA, and a stable JSON contract for AI agents.

> 4,403 indexed servers · 51 official · 23 categories · daily upstream sync.
> 38 REST endpoints · open `servers-index.json` for offline use.

[Live demo](https://badhope.github.io/MCP-HUB/) · [API docs](docs/API.md) · [中文](README_CN.md)

---

## What it does

MCP Hub indexes every public MCP server, scores it for completeness,
and serves it through a stable API so that:

- **End users** can browse the catalog and copy ready-to-paste configs
  for Claude Desktop, Cursor, or any stdio-based MCP client.
- **AI agents** can call `/servers`, `/servers/{name}`, `/config/{name}`,
  `/stats`, etc. to recommend a tool without scraping anything.
- **Server authors** can submit a server once and reach the whole
  ecosystem.

The data layer is intentionally a single static JSON file so that
agents can ship a snapshot of the catalog with the model if they need
a deterministic offline view.

---

## Quick start

### Option A — Docker Compose

```bash
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB
docker compose up -d --build

# Web UI  : http://localhost:5173
# REST API: http://localhost:8080
# API docs: http://localhost:8080/docs
```

The compose file wires the backend to a hot-reloadable dev frontend.
First boot pulls the upstream index (~5 MB) and caches it in
`servers-index.json` (gitignored, rebuild with `python tools/sync_index.py`).

### Option B — Local Python

```bash
pip install -r requirements.txt
python tools/sync_index.py          # one-time, populates servers-index.json
python main.py                      # API on :8080
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev                         # UI on :5173, proxies /servers to :8080
```

### Option C — REST only

```bash
curl http://localhost:8080/health
curl "http://localhost:8080/servers?search=github&limit=5"
curl http://localhost:8080/config/github-mcp-server
```

`GET /health` is the only path the orchestrator needs to poll.
Everything else is JSON.

---

## Project layout

```
.
├── main.py              # FastAPI app: lifespan, CORS, GZip, rate limit
├── api.py               # route definitions (thin layer)
├── services.py          # search, scoring, config generation
├── query.py             # natural-language query endpoint
├── user_data.py         # favorites, ratings, comments, submissions
├── core/                # in-memory indexes, hashing, server model
├── tools/               # 19 CLI utilities (sync, score, scan, export)
├── templates/           # 50 pre-built MCP config templates
├── tests/               # pytest suite (9 files, 130+ tests)
├── frontend/            # Vite + React 19 + TypeScript SPA
├── docs/                # user-facing docs (EN + CN)
└── docs/internal/       # maintainer-only design notes
```

Run `make help` for the full task list. Highlights:

```bash
make install-dev   # backend + frontend + pre-commit
make dev           # backend + frontend, hot reload
make test          # pytest
make lint          # ruff + black + isort + eslint + secret-scan
make build         # frontend production bundle
make docker-up     # full stack
```

---

## REST API

`main:app` is a single FastAPI process. The OpenAPI schema is served at
`/openapi.json`; interactive UIs at `/docs` (Swagger) and `/redoc`.

| Group | Endpoints |
|---|---|
| Health & stats | `GET /`, `GET /health`, `GET /stats` |
| Discovery | `GET /servers`, `GET /servers/{name}`, `GET /servers/popular`, `GET /servers/recent`, `GET /servers/curated`, `GET /servers/by-category/{category}`, `GET /servers/by-quality` |
| Configuration | `GET /config/{name}`, `GET /export/markdown/{name}`, `POST /export/batch-json`, `POST /export/batch-markdown` |
| Recommendations | `GET /recommend/for-use-case`, `GET /recommend/similar`, `GET /compare` |
| Validation | `GET /validate/server/{name}`, `GET /validate/all`, `GET /validate/health`, `GET /validate/low-quality` |
| User | `POST/GET /favorites/*`, `POST/GET /ratings/*`, `POST/GET /comments/*` |
| Submissions | `POST /submissions/submit`, `GET /submissions`, `POST /submissions/review` |

`GET /servers` supports: `search`, `category`, `language`, `sort`
(`stars` / `updated`), `min_stars`, `limit`, `offset`.

Two pieces of cross-cutting behaviour worth knowing about — see
[`docs/API.md`](docs/API.md) for the full reference:

- **GZip**. Responses ≥ 1 KB are gzipped by FastAPI's built-in
  middleware. `servers.json` drops from ~100 KB to <15 KB on the wire.
- **Rate limit**. Per-IP token bucket, default 120 req / 60 s. Exempts
  `/`, `/health`, `/docs`, `/redoc`, `/openapi.json`, and CORS
  preflight. Tunable via `RATE_LIMIT_REQUESTS` / `RATE_LIMIT_WINDOW`
  / `RATE_LIMIT_TRUST_PROXY` / `RATE_LIMIT_DISABLED`. For horizontal
  scale, terminate the limit at a reverse proxy.

---

## For AI agents

Three things make this catalog agent-friendly:

1. The **REST API** is the primary interface. Every response is JSON,
   every input is a query parameter, no scraping required.
2. **`servers-index.json`** ships with every release so an agent can
   embed a snapshot of the catalog with the model for deterministic
   offline use.
3. **`/openapi.json`** is consumable by any OpenAPI-aware tool generator
   (LangChain, LlamaIndex, etc.).

```python
import httpx

# Discover
r = httpx.get("https://mcp-hub.example.com/servers",
              params={"search": "github", "limit": 5}).json()

# Generate a config
cfg = httpx.get("https://mcp-hub.example.com/config/github-mcp-server").json()
```

A coding-agent-side conventions file is at [`AGENTS.md`](AGENTS.md).
For end-user agent integrations, see
[`docs/internal/AGENT_GUIDE.md`](docs/internal/AGENT_GUIDE.md).

---

## Architecture

```
            HTTP / JSON
   ┌──────────────────────┐         ┌───────────────────────┐
   │  React + Vite SPA    │ ──────► │  FastAPI app          │
   │  (:5173 in dev,      │         │  (main.py, Pydantic   │
   │   gh-pages in prod)  │ ◄────── │   v2, async, lifespan)│
   └──────────────────────┘         └───────────────────────┘
                                                │
                                                ▼
                                       ┌───────────────────┐
                                       │ servers-index.json│
                                       │ (~5 MB, in-memory │
                                       │  + file watch)    │
                                       └───────────────────┘
                                                ▲
                                                │ tools/sync_index.py
                                                │ (daily GitHub Action)
                                       ┌───────────────────┐
                                       │  upstream:        │
                                       │  awesome-mcp +    │
                                       │  curated sources  │
                                       └───────────────────┘
```

- The catalog is **rebuilt in CI**, not at request time, so latency is
  bounded by in-memory dict lookups.
- The frontend is a **static SPA on GitHub Pages**. When the API is
  unavailable it falls back to a committed `static-data/*.json` snapshot
  with a `data_snapshot_date` banner, so demos always render.
- All write paths (`favorites`, `ratings`, `comments`, `submissions`)
  go to a single `user_data.py` module backed by a local JSON file
  that is gitignored. Swap it for Postgres in
  `core/_version.py:USER_DATA_BACKEND` without touching the routes.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design
notes, decision log, and trade-offs.

---

## Contributing

Bug reports, feature requests, server submissions, and security
disclosures each have a dedicated issue template — pick the right one
from the **New issue** dropdown.

- Bug report → `.github/ISSUE_TEMPLATE/bug_report.md`
- Feature request → `.github/ISSUE_TEMPLATE/feature_request.md`
- Server submission → `.github/ISSUE_TEMPLATE/server_submission.md`
  (or call `POST /submissions/submit` if you want a PR-free path)
- Question → `.github/ISSUE_TEMPLATE/question.md`
- Security issue → read [`SECURITY.md`](SECURITY.md) first, **do not**
  open a public issue

The dev workflow, coding standards, and PR checklist live in
[`CONTRIBUTING.md`](CONTRIBUTING.md). The two things that will get
your PR merged fastest are a passing `make test && make lint` and a
[`CHANGELOG.md`](CHANGELOG.md) entry.

---

## License

[MIT](LICENSE).

Upstream data is synced from
[awesome-mcp](https://github.com/Rodert/awesome-mcp) and from each
curated source's public GitHub API; see
[`docs/internal/SERVER_CATALOG.md`](docs/internal/SERVER_CATALOG.md)
for the per-source attribution.
