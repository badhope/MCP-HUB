# MCP Hub — User Guide

> **The complete, opinionated guide to getting value out of MCP Hub as an end user, an AI agent, or a server author.**

This guide assumes you have already read the [README](../README.md) and the [Quickstart](QUICKSTART.md). It picks up where they leave off and walks you through **real workflows**, not just command lists.

---

## Table of contents

1. [Who this guide is for](#1-who-this-guide-is-for)
2. [Core concepts](#2-core-concepts)
3. [Workflow A — "I want to install an MCP server into Claude Desktop / Cursor / ChatGPT"](#3-workflow-a--i-want-to-install-an-mcp-server)
4. [Workflow B — "I want to find a server for a specific job"](#4-workflow-b--i-want-to-find-a-server-for-a-specific-job)
5. [Workflow C — "I want my AI agent to consume MCP Hub"](#5-workflow-c--i-want-my-ai-agent-to-consume-mcp-hub)
6. [Workflow D — "I want to submit my own server"](#6-workflow-d--i-want-to-submit-my-own-server)
7. [Workflow E — "I want to self-host MCP Hub for my team"](#7-workflow-e--i-want-to-self-host-mcp-hub-for-my-team)
8. [CLI tools reference](#8-cli-tools-reference)
9. [Quality, freshness, and trust signals](#9-quality-freshness-and-trust-signals)
10. [Troubleshooting](#10-troubleshooting)
11. [FAQ](#11-faq)

---

## 1. Who this guide is for

| You are… | Start at | Read time |
|---|---|---|
| An end user who just wants to add a tool to Claude / Cursor | [Workflow A](#3-workflow-a--i-want-to-install-an-mcp-server) | 5 min |
| A power user searching for a server that does X | [Workflow B](#4-workflow-b--i-want-to-find-a-server-for-a-specific-job) | 5 min |
| An AI agent builder / tool author | [Workflow C](#5-workflow-c--i-want-my-ai-agent-to-consume-mcp-hub) | 15 min |
| A server author who wants to be listed | [Workflow D](#6-workflow-d--i-want-to-submit-my-own-server) | 10 min |
| A platform / DevOps engineer self-hosting | [Workflow E](#7-workflow-e--i-want-to-self-host-mcp-hub-for-my-team) | 20 min |

---

## 2. Core concepts

| Term | Definition |
|---|---|
| **MCP** | [Model Context Protocol](https://modelcontextprotocol.io) — an open standard that lets an AI client (Claude, Cursor, etc.) call external "tools" exposed by a *server*. |
| **MCP server** | A small program (Node.js / Python / Go / …) that exposes a set of tools to MCP clients. Examples: GitHub, filesystem, Postgres. |
| **Config** | The JSON snippet an MCP client loads at startup that lists which servers to launch and how. For Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows). |
| **Index** | MCP Hub's local snapshot of every known MCP server (`servers-index.json`), rebuilt daily from upstream registries. |
| **Quality score** | A 0-100 number combining README completeness, recency of commits, license presence, and test coverage signals. Higher = more trustworthy. |
| **Curated** | The hand-picked subset (~50) of servers that pass a stricter bar. Look for the `Curated` page. |

---

## 3. Workflow A — "I want to install an MCP server"

Goal: add a server (e.g. `github`) to your AI client without writing a config from scratch.

### Step 1 — Find a server

- Open the [Web UI](https://github.com/badhope/MCP-HUB#-quick-start) and search for what you want (e.g. `github`, `postgres`, `playwright`).
- Or use the API:

  ```bash
  curl "http://localhost:8080/servers?search=github&limit=5" | jq '.servers[].name'
  ```

### Step 2 — Inspect the candidate

- Click the server card in the UI to see its `description`, `stars`, `language`, `last commit`, `license`, and any quality warnings.
- API:

  ```bash
  curl http://localhost:8080/servers/github | jq '{name, stars, language, license, quality: .quality_score}'
  ```

### Step 3 — Generate a ready-to-paste config

The server detail page has a **"Copy config"** button. From the API:

```bash
curl http://localhost:8080/config/github-mcp-server
```

returns:

```json
{
  "name": "github-mcp-server",
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-token-here>" }
    }
  },
  "commands": { "install": "npm install -g @modelcontextprotocol/server-github" },
  "docker":   { "image": "mcp/github", "command": "docker run -i --rm mcp/github" },
  "install":  { "claude_desktop": "Add the mcpServers block to claude_desktop_config.json and restart Claude." }
}
```

Copy the `mcpServers` block.

### Step 4 — Paste it into your client

| Client | Config file |
|---|---|
| Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | Settings → Models → Model Context Protocol → Add server |
| ChatGPT Desktop | Settings → Connectors → Add MCP server |
| Anything stdio-based | Standard `{"command": "...", "args": [...]}` |

### Step 5 — Restart the client and verify

The new tools should now appear in the client's tool picker. If they don't, see [Troubleshooting §10](#10-troubleshooting).

---

## 4. Workflow B — "I want to find a server for a specific job"

The Web UI has filters for category, language, and quality. The API is faster for programmatic discovery.

### Discover by use case (semantic-ish, server-side)

```bash
curl "http://localhost:8080/recommend/for-use-case?use_case=find+and+fix+security+issues&limit=5"
```

### Browse by category

```bash
curl "http://localhost:8080/servers/by-category/development?limit=10" | jq '.servers[].name'
```

### Find similar servers

```bash
curl "http://localhost:8080/recommend/similar?server=github-mcp-server&limit=5"
```

### Compare two or more side-by-side

```bash
curl "http://localhost:8080/compare?servers=github-mcp-server,playwright-mcp" | jq
```

### Filter by quality

```bash
# Only "high quality" curated servers
curl "http://localhost:8080/servers/curated" | jq '.servers[].name'

# Anything below threshold 60 (often stale or incomplete)
curl "http://localhost:8080/validate/low-quality?threshold=60" | jq
```

---

## 5. Workflow C — "I want my AI agent to consume MCP Hub"

MCP Hub is **indexed for agent consumption** out of the box. Three integration paths, pick what fits.

### Option 1 — Live REST calls (most up-to-date)

```python
import requests

BASE = "https://mcp-hub.example.com"   # or http://localhost:8080

# Discover
results = requests.get(f"{BASE}/servers", params={"search": "github", "limit": 5}).json()
for s in results["servers"]:
    print(s["name"], s["stars"], s["description"])

# Generate a config your agent can hand to the user
cfg = requests.get(f"{BASE}/config/github-mcp-server").json()
print(cfg["mcpServers"])
```

Every endpoint returns a stable JSON shape (see [API.md](API.md)).

### Option 2 — Offline index (for air-gapped / low-latency agents)

```bash
# Download the static index (rebuilt daily)
curl -O https://github.com/badhope/MCP-HUB/releases/latest/download/servers-index.json
```

The file is a flat array of `Server` records, see the `Server` Pydantic model in `main.py`.

### Option 3 — OpenAPI schema (for typed clients)

```bash
curl http://localhost:8080/openapi.json > mcp-hub-openapi.json
```

Use it with any OpenAPI generator (`openapi-generator`, `fern`, `speakeasy`, …) to produce a typed client in Python, TypeScript, Go, etc.

### Recommended pattern: tool-search step

Point your agent's "which tool should I use?" step at `GET /recommend/for-use-case` and stop maintaining a private server list.

---

## 6. Workflow D — "I want to submit my own server"

Two paths, both work.

### Path 1 — Web form (easiest)

Open a new issue from the [server_submission template](../.github/ISSUE_TEMPLATE/server_submission.md). Fill in the quality checklist. A maintainer reviews within a week.

### Path 2 — API (faster, scriptable)

```bash
curl -X POST http://localhost:8080/submissions/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-cool-server",
    "repo_url": "https://github.com/me/my-cool-server",
    "category": "development",
    "language": "typescript",
    "license": "MIT",
    "description": "Does one thing very well."
  }'
```

Status endpoint:

```bash
curl http://localhost:8080/submissions | jq
```

### What happens next

1. Submission enters the triage queue.
2. CI fetches the repo, runs the quality scorer, and opens a draft PR against `main`.
3. A maintainer reviews the PR; on approval the server is merged into the index and goes live on the next daily sync.

---

## 7. Workflow E — "I want to self-host MCP Hub for my team"

### Architecture

```
┌──────────────────┐    HTTP/JSON    ┌──────────────────┐
│   React + Vite   │ ──────────────► │  FastAPI backend │
│   Web UI (:5173) │                 │     (:8080)      │
└──────────────────┘                 └──────────────────┘
                                              │
                                              ▼
                                     ┌──────────────────┐
                                     │ servers-index    │
                                     │   .json (4,400+) │
                                     └──────────────────┘
                                              ▲
                                              │ daily
                                     ┌──────────────────┐
                                     │ GitHub Actions   │
                                     │  tools/sync_…    │
                                     └──────────────────┘
```

### One-command deploy

```bash
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB
python tools/sync_index.py             # ~5 MB download
docker compose up -d --build
```

Ports:

| Service | Port | URL |
|---|---|---|
| Web UI | 5173 | `http://localhost:5173` |
| REST API | 8080 | `http://localhost:8080` |
| Swagger UI | 8080 | `http://localhost:8080/docs` |
| ReDoc | 8080 | `http://localhost:8080/redoc` |

### Production checklist

- [ ] Put the API behind a reverse proxy (Caddy / nginx) with TLS
- [ ] Mount `servers-index.json` and `user-data.json` on a persistent volume
- [ ] Schedule `python tools/sync_index.py` to run daily (cron / GitHub Action on a schedule)
- [ ] Enable GitHub secret scanning & push protection (already on by default in this repo's settings)
- [ ] Set up log shipping to your aggregator
- [ ] Pin the docker image tag (don't use `:latest` in prod)

### Updating

```bash
git pull
docker compose pull
docker compose up -d --build
```

Your data in `user-data.json` and `submissions.json` is preserved by the named volume.

---

## 8. CLI tools reference

All under [`tools/`](../tools/). Run from the repo root.

| Command | What it does |
|---|---|
| `python tools/sync_index.py` | Download the latest upstream index, rebuild `servers-index.json` |
| `python tools/index_servers.py <file>` | Add a server from a local `servers/<name>/` directory |
| `python tools/comprehensive_collector.py` | Crawl multiple upstream registries and merge |
| `python tools/index_downloader.py` | Bulk download referenced repos (use carefully, see `--help`) |
| `python tools/completeness_scoring.py` | Re-score every server in the index |
| `python tools/auto_updater.py` | Cron-friendly: pull upstream, re-score, write back |
| `python tools/secret_scanner.py` | Scan the repo for accidentally committed secrets |
| `python tools/gen_api_docs.py` | Regenerate [`docs/API.md`](API.md) from the live OpenAPI schema |
| `python tools/build_social_preview.py` | Rebuild the social preview banner |
| `python tools/notable_projects_navigator.py` | Generate `notable_projects.json` |
| `python tools/collect_domestic_companies.py` | Generate the Chinese-domestic-company catalog |
| `python tools/server_health_checker.py` | HEAD-check every repo's URL and report dead links |
| `python tools/update_index.py` | One-shot: pull → score → publish |
| `python tools/downloader.py awesome 10` | Download top-10 from `awesome-mcp` into `servers/` |
| `python tools/batch_manager.py` | Bulk-apply operations across `servers/*` |
| `python tools/rebrand_to_mcp_hub.py` | One-off: rewrite all `mcp-market` references to `MCP-HUB` (used during the 2026-06 rebrand) |

---

## 9. Quality, freshness, and trust signals

| Signal | Where to see it | What it means |
|---|---|---|
| `quality_score` (0-100) | server card + `/servers/{name}` | Composite of README completeness, commit recency, license, tests |
| `stars` | server card | GitHub stargazers — popularity, not quality |
| `archived` | server card (red badge) | **Do not install** — the upstream is gone |
| `updated_at` | server card | If > 1 year old, plan for breakage |
| `license` | server detail | OSI-approved = safe to use commercially |
| `curated` flag | `Curated` page | Hand-picked by a maintainer; safest starting point |
| Last sync timestamp | footer of Web UI | When the index was last refreshed |

**Rule of thumb:** for a production deployment, install only servers that are `!archived`, have `quality_score >= 60`, were updated in the last 6 months, and have an OSI-approved license.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Client can't see the new tool | Config JSON malformed | Validate with `python -m json.tool < claude_desktop_config.json` |
| Client can't see the new tool | Client not restarted | Quit and reopen Claude Desktop / Cursor |
| `npx` error on macOS | Node not on PATH | Install Node 20+ via nvm or Homebrew |
| `pip install` fails on Apple Silicon | Some deps lack arm64 wheels | Use the Docker option, or use `conda` / `pyenv` |
| API returns 500 | Stale index | Run `python tools/sync_index.py` |
| Web UI shows "no servers" | API not running, or CORS blocked | Make sure backend is up on :8080 |
| `python tools/secret_scanner.py` complains in CI | A test fixture triggered a pattern | Run with `--quiet`, or update `tools/secret_scanner.py`'s allowlist |
| `403` on submitting a server | You hit the submission rate-limit | Wait an hour, or use the issue template |
| "Branch update failed" when pushing to main | Branch protection is on (good!) | Open a PR instead |

---

## 11. FAQ

**Q: Is MCP Hub an official Anthropic product?**
No. It's a community registry that indexes servers speaking the open Model Context Protocol. The protocol is from Anthropic; the directory is ours.

**Q: How often is the data refreshed?**
Daily, via a GitHub Actions cron job. The `updated_at` on the Web UI footer tells you the exact timestamp.

**Q: Can I trust the configs you generate?**
The `command` and `args` are taken verbatim from the upstream README. Always review them — the `env` block often contains placeholders for tokens you must supply yourself.

**Q: My server was rejected from the curated list. What now?**
Improve the three things the scorer cares about most: a complete README, recent commits, and a permissive license. Re-submit after the next sync.

**Q: Can I run MCP Hub offline?**
Yes — `python tools/sync_index.py` downloads a one-time snapshot, and the Web UI works against the local index. The only thing that needs the network is the daily sync.

**Q: Does MCP Hub phone home?**
No. The server is stateless. The only network egress is the optional daily sync to upstream registries.

**Q: Where's the data stored?**
- The catalog — `servers-index.json` (regenerable from upstream)
- User data — `user-data.json` (favorites, ratings, comments). Local-only, gitignored in private deployments.
- Submissions — `submissions.json` (queue + review history)

**Q: How do I add a private / internal server that isn't on GitHub?**
Edit `market-config.json` and add an entry with `source_type: "private"`. The indexer will pick it up on the next run.

---

<p align="center">
  <sub>Last updated: 2026-06-02 · MCP-HUB v2.0.1</sub>
</p>
