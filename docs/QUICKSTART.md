# Quick start — 5 minutes to a running MCP Hub

This is a minimal local-only setup. For the full deployment story, see the
[README](../README.md).

## 1. Clone

```bash
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB
```

## 2. Backend

```bash
pip install -r requirements.txt
python tools/sync_index.py            # fetches the latest index from upstream
python main.py                        # API on http://localhost:8080
```

Verify with:

```bash
curl http://localhost:8080/stats
# → {"total_servers": 4403, ...}
```

## 3. Frontend (optional, second terminal)

```bash
cd frontend
npm install
npm run dev                           # UI on http://localhost:5173
```

The dev server proxies `/servers`, `/config`, etc. to `http://localhost:8080`.

## 4. Docker (alternative)

```bash
docker compose up -d --build
```

This brings up the backend and the frontend together with the same ports.

## 5. Where to go next

- Read [`API.md`](API.md) for the full REST reference
- Try the agent-friendly endpoints: `GET /servers`, `GET /config/{name}`,
  `GET /recommend/for-use-case`
- Browse the Swagger UI at <http://localhost:8080/docs>
- Submit your own server via `POST /submissions/submit` or the
  [server-submission issue template](../.github/ISSUE_TEMPLATE/server_submission.md)
