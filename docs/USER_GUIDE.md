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
8. [Data pipeline tools reference](#8-data-pipeline-tools-reference)
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
| A platform / DevOps engineer self-hosting | [Workflow E](#7-workflow-e--i-want-to-self-host-mcp-hub-for-my-team) | 10 min |

---

## 2. Core concepts

| Term | Definition |
|---|---|
| **MCP** | [Model Context Protocol](https://modelcontextprotocol.io) — an open standard that lets an AI client (Claude, Cursor, etc.) call external "tools" exposed by a *server*. |
| **MCP server** | A small program (Node.js / Python / Go / …) that exposes a set of tools to MCP clients. Examples: GitHub, filesystem, Postgres. |
| **Config** | The JSON snippet an MCP client loads at startup that lists which servers to launch and how. For Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows). |
| **Index** | MCP Hub's local snapshot of every known MCP server (`servers-index.json`), rebuilt daily from upstream registries. |
| **Quality score** | A 0-100 number combining 5 factors: stars (30%), recency (15%), language coverage (15%), description quality (20%), and our signal (20%). Higher = more trustworthy. |
| **Our signal** | A trust tier (0.0 / 0.4 / 0.7 / 1.0) indicating whether we've personally adapted the server. Look for the "✅ adapted" badge. |

---

## 3. Workflow A — "I want to install an MCP server"

Goal: add a server (e.g. `github`) to your AI client without writing a config from scratch.

### Step 1 — Find a server

- Open the [Web UI](https://badhope.github.io/MCP-HUB/) and search for what you want (e.g. `github`, `postgres`, `playwright`).
- Or browse by category on the [Browse page](https://badhope.github.io/MCP-HUB/browse).

### Step 2 — Inspect the candidate

- Click the server card in the UI to see its `description`, `stars`, `language`, `last commit`, `license`, and quality score breakdown.
- Look for the "✅ adapted" badge — these are servers we've personally wrapped with a universal install command.

### Step 3 — Generate a ready-to-paste config

The server detail page has a **"Copy config"** button that generates the universal `mcpServers` JSON block.

Example output:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<your-token-here>" }
    }
  }
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

The Web UI has filters for category, language, and quality.

### Browse by category

Open the [Browse page](https://badhope.github.io/MCP-HUB/browse) and click a category card to filter servers.

### Filter by quality

- Look for servers with score ≥ 60 (often stale or incomplete servers score lower).
- Prioritize servers with the "✅ adapted" badge — these are in Layer 2 and have been personally tested.

### Find similar servers

Click a server card to see its detail page, which shows related servers in the same category.

---

## 5. Workflow C — "I want my AI agent to consume MCP Hub"

MCP Hub is **indexed for agent consumption** out of the box. Two integration paths, pick what fits.

### Option 1 — Fetch the static index (most up-to-date)

```python
import requests

# Download the static index (rebuilt daily)
url = "https://badhope.github.io/MCP-HUB/servers-index.json"
index = requests.get(url).json()

# Search for servers
for server in index["servers"]:
    if "github" in server["name"].lower():
        print(server["name"], server["stars"], server["description"])
```

The file is a flat JSON object with a `servers` array. Each server has:
- `name`, `owner`, `full_name`
- `stars`, `updated_at`, `archived`
- `categories`, `description`, `language`
- `install_hint` (command + args + env)
- `score`, `score_breakdown` (5 factors)
- `our_signal`, `our_signal_label` (trust tier)

### Option 2 — Offline index (for air-gapped / low-latency agents)

```bash
# Download the static index (rebuilt daily)
curl -O https://badhope.github.io/MCP-HUB/servers-index.json
```

The file is ~4.4 MB and contains all 4,400+ servers. Load it into memory and query locally.

### Recommended pattern: tool-search step

Point your agent's "which tool should I use?" step at the static index and filter by `score >= 60` and `our_signal >= 0.7` (adapted or in-progress).

---

## 6. Workflow D — "I want to submit my own server"

Two paths, both work.

### Path 1 — Issue template (easiest)

Open a new issue from the [server_submission template](../.github/ISSUE_TEMPLATE/server_submission.md). Fill in the quality checklist. A maintainer reviews within a week.

### Path 2 — Pull request (faster)

If your server is already in the upstream `awesome-mcp` registry, it will be picked up automatically on the next daily sync. If not, you can open a PR to add it to the upstream registry.

### What happens next

1. Submission enters the triage queue.
2. The daily sync workflow fetches the upstream index, scores every server, and writes `servers-index.json`.
3. Your server appears in the catalog with its computed score.

---

## 7. Workflow E — "I want to self-host MCP Hub for my team"

### Architecture

```
┌──────────────────┐
│   React + Vite   │
│   Web UI (:5173) │
└──────────────────┘
         │
         │ fetch /servers-index.json
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
cd frontend && npm install && npm run build
# Serve frontend/dist/ with any static host (nginx, Caddy, S3, etc.)
```

### Production checklist

- [ ] Serve `frontend/dist/` behind a reverse proxy (Caddy / nginx) with TLS
- [ ] Schedule `python3 tools/sync_index.py && python3 tools/gen_static_data.py` to run daily (cron / GitHub Action on a schedule)
- [ ] Enable GitHub secret scanning & push protection (already on by default in this repo's settings)
- [ ] Set up log shipping to your aggregator

### Updating

```bash
git pull
cd frontend && npm install && npm run build
# Redeploy frontend/dist/
```

---

## 8. Data pipeline tools reference

All under [`tools/`](../tools/). Run from the repo root.

| Command | What it does |
|---|---|
| `python3 tools/sync_index.py` | Download the latest upstream index, enrich with GitHub API metadata, write `servers-index.json` (root) |
| `python3 tools/gen_static_data.py` | Score every server, compute install hints, scan adapters/ for our_signal, write `frontend/public/servers-index.json` |
| `python3 tools/completeness_scoring.py` | Re-score every server in the index (5-factor formula) |
| `python3 tools/secret_scanner.py` | Scan the repo for accidentally committed secrets |
| `python3 tools/build_social_preview.py` | Rebuild the social preview banner |

---

## 9. Quality, freshness, and trust signals

| Signal | Where to see it | What it means |
|---|---|---|
| `score` (0-100) | server card + detail page | Composite of 5 factors: stars (30%), recency (15%), lang_coverage (15%), desc_quality (20%), our_signal (20%) |
| `stars` | server card | GitHub stargazers — popularity, not quality |
| `archived` | server card (red badge) | **Do not install** — the upstream is gone |
| `updated_at` | server card | If > 1 year old, plan for breakage |
| `license` | server detail | OSI-approved = safe to use commercially |
| `our_signal` badge | server card (✅ adapted / ⚙️ in progress / 👀 researched / 🆕 unprocessed) | Trust tier — whether we've personally adapted the server |
| Last sync timestamp | footer of Web UI | When the index was last refreshed |

**Rule of thumb:** for a production deployment, install only servers that are `!archived`, have `score >= 60`, were updated in the last 6 months, and have an OSI-approved license. Prioritize servers with `our_signal >= 0.7` (adapted or in-progress).

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Client can't see the new tool | Config JSON malformed | Validate with `python3 -m json.tool < claude_desktop_config.json` |
| Client can't see the new tool | Client not restarted | Quit and reopen Claude Desktop / Cursor |
| `npx` error on macOS | Node not on PATH | Install Node 20+ via nvm or Homebrew |
| `pip install` fails on Apple Silicon | Some deps lack arm64 wheels | Use `conda` / `pyenv` |
| Web UI shows "no servers" | `servers-index.json` not found | Run `python3 tools/gen_static_data.py` to regenerate |
| `python3 tools/secret_scanner.py` complains in CI | A test fixture triggered a pattern | Run with `--quiet`, or update `tools/secret_scanner.py`'s allowlist |
| "Branch update failed" when pushing to main | Branch protection is on (good!) | Open a PR instead |

---

## 11. FAQ

**Q: Is MCP Hub an official Anthropic product?**
No. It's a community registry that indexes servers speaking the open Model Context Protocol. The protocol is from Anthropic; the directory is ours.

**Q: How often is the data refreshed?**
Daily, via a GitHub Actions cron job. The `updated_at` on the Web UI footer tells you the exact timestamp.

**Q: Can I trust the configs you generate?**
The `command` and `args` are taken verbatim from the upstream README or from our adapter manifests. Always review them — the `env` block often contains placeholders for tokens you must supply yourself.

**Q: My server was rejected from the curated list. What now?**
Improve the three things the scorer cares about most: a complete README, recent commits, and a permissive license. Re-submit after the next sync.

**Q: Can I run MCP Hub offline?**
Yes — `python3 tools/sync_index.py` downloads a one-time snapshot, and the Web UI works against the local index. The only thing that needs the network is the daily sync.

**Q: Does MCP Hub phone home?**
No. The SPA is fully static. User data (favorites, ratings) lives in your browser's `localStorage`. Clearing site data clears them.

**Q: Where's the data stored?**
- The catalog — `frontend/public/servers-index.json` (regenerable from upstream)
- User data — browser `localStorage` (favorites, ratings). Local-only, not synced.

**Q: How do I add a private / internal server that isn't on GitHub?**
MCP Hub only indexes public GitHub repos. For private servers, you can fork the repo and manually add entries to `servers-index.json`.

---

<p align="center">
  <sub>Last updated: 2026-06-12 · MCP-HUB v3.1.0</sub>
</p>
