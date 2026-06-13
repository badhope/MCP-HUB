# Quick start — 5 minutes to a running MCP Hub

This is a minimal local-only setup. For the full deployment story, see the
[README](../README.md).

## 1. Clone

```bash
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB
```

## 2. Frontend

```bash
cd frontend
npm install
npm run dev                           # UI on http://localhost:5173
```

The SPA loads `servers-index.json` from `frontend/public/` as a static asset.
No backend required.

## 3. Data pipeline (optional)

If you want to regenerate the static index from upstream:

```bash
# From repo root
python3 tools/sync_index.py            # fetches the latest index from upstream
python3 tools/gen_static_data.py       # scores + install hints → servers-index.json
```

The output is `frontend/public/servers-index.json` (~4.4 MB, 4,400+ servers).

## 4. Build for production

```bash
cd frontend
npm run build                         # output in dist/
```

The `dist/` directory can be deployed to any static hosting service (GitHub Pages,
Netlify, Vercel, S3, etc.).

## 5. Where to go next

- Read [`ARCHITECTURE.md`](ARCHITECTURE.md) for the 3-layer product model
- Browse the live demo at <https://badhope.github.io/MCP-HUB/>
- Submit your own server via the [More page](https://badhope.github.io/MCP-HUB/more)
  or the [server-submission issue template](../.github/ISSUE_TEMPLATE/server_submission.md)
- Add a new universal adapter: see [`REFACTOR_PLAN.md`](../REFACTOR_PLAN.md) §9
