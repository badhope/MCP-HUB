# 快速上手 — 5 分钟跑起一个 MCP Hub

这是**仅本地**的最简启动流程。完整部署请看 [README_CN.md](../README_CN.md)。

## 1. 克隆

```bash
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB
```

## 2. 后端

```bash
pip install -r requirements.txt
python tools/sync_index.py            # 从上游拉取最新索引
python main.py                        # API 跑在 http://localhost:8080
```

验证：

```bash
curl http://localhost:8080/stats
# → {"total_servers": 4403, ...}
```

## 3. 前端（可选，新开一个终端）

```bash
cd frontend
npm install
npm run dev                           # Web UI 跑在 http://localhost:5173
```

dev server 会把 `/servers`、`/config` 等路径代理到 `http://localhost:8080`。

## 4. Docker（替代方案）

```bash
docker compose up -d --build
```

这样后端 + 前端会一起起来，端口和上面一致。

## 5. 下一步

- 看 [`API.md`](API.md) 了解完整的 REST 接口
- 试一下 Agent 友好的端点：`GET /servers`、`GET /config/{name}`、`GET /recommend/for-use-case`
- 打开 Swagger UI：<http://localhost:8080/docs>
- 提交你自己的服务器：`POST /submissions/submit` 或用 [server_submission_CN 模板](../.github/ISSUE_TEMPLATE/server_submission_CN.md)
- 想了解「完整使用流程」请看 [USER_GUIDE_CN.md](USER_GUIDE_CN.md)
