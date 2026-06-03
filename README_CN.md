# MCP Hub

精选的 Model Context Protocol (MCP) 服务器注册中心，自带 FastAPI 后端、
React/Vite 单页应用和给 AI agent 用的稳定 JSON 接口。

> 4,403 个已索引服务器 · 51 个官方 · 23 个分类 · 每日自动同步上游。
> 38 个 REST 端点 · 提供 `servers-index.json` 离线快照。

[在线演示](https://badhope.github.io/MCP-HUB/) · [API 文档](docs/API.md) · [English](README.md)

---

## 项目能做什么

MCP Hub 索引了所有公开的 MCP 服务器，对每条数据做完整性评分，然后
通过稳定的 HTTP API 暴露出去，让三类用户都能直接受益：

- **终端用户** —— 浏览目录，复制 Claude Desktop、Cursor 或任何
  stdio-based MCP 客户端开箱即用的配置。
- **AI agent** —— 调用 `/servers`、`/servers/{name}`、`/config/{name}`、
  `/stats` 等端点即可推荐合适的工具，无需自行抓取。
- **服务器作者** —— 提交一次就能触达整个 MCP 生态。

数据层刻意做成了单个静态 JSON 文件，让 agent 在需要确定性离线视图时
能把目录快照和模型一起打包发布。

---

## 快速开始

### 方式 A —— Docker Compose

```bash
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB
docker compose up -d --build

# Web UI  : http://localhost:5173
# REST API: http://localhost:8080
# API docs: http://localhost:8080/docs
```

`docker-compose.yml` 把后端和一个支持热重载的前端拼在一起。首次启动会
从上游拉取索引（~5 MB）缓存到 `servers-index.json`（被 `.gitignore`
忽略；需要重建时跑 `python tools/sync_index.py`）。

### 方式 B —— 本地 Python

```bash
pip install -r requirements.txt
python tools/sync_index.py          # 一次性，把上游索引写进 servers-index.json
python main.py                      # API 监听 :8080
```

再开一个终端：

```bash
cd frontend
npm install
npm run dev                         # UI 监听 :5173，/servers 代理到 :8080
```

### 方式 C —— 只用 REST

```bash
curl http://localhost:8080/health
curl "http://localhost:8080/servers?search=github&limit=5"
curl http://localhost:8080/config/github-mcp-server
```

`GET /health` 是编排器唯一需要轮询的路径。其余全是 JSON。

---

## 目录结构

```
.
├── main.py              # FastAPI 应用：lifespan、CORS、GZip、限流
├── api.py               # 路由定义（薄层）
├── services.py          # 搜索、评分、配置生成
├── query.py             # 自然语言查询端点
├── user_data.py         # 收藏、评分、评论、提交
├── core/                # 内存索引、哈希、Server 模型
├── tools/               # 19 个 CLI 工具（同步、评分、扫描、导出）
├── templates/           # 50 个预制 MCP 配置模板
├── tests/               # pytest 套件（9 个文件，130+ 用例）
├── frontend/            # Vite + React 19 + TypeScript SPA
├── docs/                # 用户文档（EN + CN）
└── docs/internal/       # 维护者专用设计笔记
```

跑 `make help` 看完整任务列表。常用几个：

```bash
make install-dev   # 后端 + 前端 + pre-commit
make dev           # 后端 + 前端，热重载
make test          # pytest
make lint          # ruff + black + isort + eslint + secret-scan
make build         # 前端生产构建
make docker-up     # 全栈启动
```

---

## REST API

`main:app` 是一个 FastAPI 进程。OpenAPI schema 由 `/openapi.json` 提供，
交互式 UI 在 `/docs`（Swagger）和 `/redoc`。

| 分组 | 端点 |
|---|---|
| 健康与统计 | `GET /`, `GET /health`, `GET /stats` |
| 检索 | `GET /servers`, `GET /servers/{name}`, `GET /servers/popular`, `GET /servers/recent`, `GET /servers/curated`, `GET /servers/by-category/{category}`, `GET /servers/by-quality` |
| 配置 | `GET /config/{name}`, `GET /export/markdown/{name}`, `POST /export/batch-json`, `POST /export/batch-markdown` |
| 推荐 | `GET /recommend/for-use-case`, `GET /recommend/similar`, `GET /compare` |
| 校验 | `GET /validate/server/{name}`, `GET /validate/all`, `GET /validate/health`, `GET /validate/low-quality` |
| 用户 | `POST/GET /favorites/*`, `POST/GET /ratings/*`, `POST/GET /comments/*` |
| 提交 | `POST /submissions/submit`, `GET /submissions`, `POST /submissions/review` |

`GET /servers` 支持的查询参数：`search`、`category`、`language`、
`sort`（`stars` / `updated`）、`min_stars`、`limit`、`offset`。

两条横切行为需要单独说明 —— 完整参考见 [`docs/API.md`](docs/API.md)：

- **GZip**。≥ 1 KB 的响应会被 FastAPI 内置中间件 gzip 压缩。
  `servers.json` 从 ~100 KB 降到 <15 KB。
- **限流**。按 IP 令牌桶，默认 120 req / 60 s。豁免 `/`、`/health`、
  `/docs`、`/redoc`、`/openapi.json` 和 CORS 预检。可用
  `RATE_LIMIT_REQUESTS` / `RATE_LIMIT_WINDOW` /
  `RATE_LIMIT_TRUST_PROXY` / `RATE_LIMIT_DISABLED` 调整。横向扩容时
  把限流放到反向代理。

---

## 面向 AI Agent

这个目录对 agent 友好体现在三点：

1. **REST API** 是一等公民。每个响应都是 JSON，每个入参都是查询参数，
   无需抓页面。
2. **`servers-index.json`** 随每次 release 发布，agent 可以把目录快照
   和模型一起打包，提供确定性离线视图。
3. **`/openapi.json`** 能被任何 OpenAPI 感知的工具生成器消费
   （LangChain、LlamaIndex 等）。

```python
import httpx

# 检索
r = httpx.get("https://mcp-hub.example.com/servers",
              params={"search": "github", "limit": 5}).json()

# 生成配置
cfg = httpx.get("https://mcp-hub.example.com/config/github-mcp-server").json()
```

给 AI 编程助手的约定在 [`AGENTS.md`](AGENTS.md)。给最终用户 agent
的接入指南在 [`docs/internal/AGENT_GUIDE.md`](docs/internal/AGENT_GUIDE.md)。

---

## 架构

```
            HTTP / JSON
   ┌──────────────────────┐         ┌───────────────────────┐
   │  React + Vite SPA    │ ──────► │  FastAPI 应用         │
   │  (开发期 :5173，     │         │  (main.py，Pydantic   │
   │   生产期 gh-pages)   │ ◄────── │   v2，async，lifespan)│
   └──────────────────────┘         └───────────────────────┘
                                                │
                                                ▼
                                       ┌───────────────────┐
                                       │ servers-index.json│
                                       │ (~5 MB，内存 +    │
                                       │  文件变更监听)    │
                                       └───────────────────┘
                                                ▲
                                                │ tools/sync_index.py
                                                │ (每日 GitHub Action)
                                       ┌───────────────────┐
                                       │  上游：           │
                                       │  awesome-mcp +    │
                                       │  精选源           │
                                       └───────────────────┘
```

- 目录在 **CI 里重建**，不在请求时计算，延迟只受内存字典查找影响。
- 前端是 **GitHub Pages 上的静态 SPA**。API 不可用时回落
  到已提交的 `static-data/*.json` 快照，并显示 `data_snapshot_date`
  横幅 —— 演示永远能跑。
- 所有写路径（`favorites`、`ratings`、`comments`、`submissions`）
  集中在一个 `user_data.py` 模块里，底层是 gitignored 的本地 JSON
  文件。要换成 Postgres，改 `core/_version.py:USER_DATA_BACKEND`
  即可，路由不用动。

完整设计说明、决策记录和取舍见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

---

## 贡献

Bug 报告、功能请求、服务器提交、安全披露各有一个专用 issue 模板
—— 从 **New issue** 下拉里选一个就行。

- Bug 报告 → `.github/ISSUE_TEMPLATE/bug_report.md`
- 功能请求 → `.github/ISSUE_TEMPLATE/feature_request.md`
- 服务器提交 → `.github/ISSUE_TEMPLATE/server_submission.md`（或者
  不想走 PR 的话直接 `POST /submissions/submit`）
- 提问 → `.github/ISSUE_TEMPLATE/question.md`
- 安全问题 → 先看 [`SECURITY.md`](SECURITY.md)，**不要** 公开提 issue

开发流程、代码规范、PR 自检清单在 [`CONTRIBUTING.md`](CONTRIBUTING.md)。
能让 PR 最快被合的两件事：`make test && make lint` 全绿，并写一条
[`CHANGELOG.md`](CHANGELOG.md)。

---

## 许可

[MIT](LICENSE)。

上游数据从
[awesome-mcp](https://github.com/Rodert/awesome-mcp) 和每个精选源的
公开 GitHub API 同步；逐源署名见
[`docs/internal/SERVER_CATALOG.md`](docs/internal/SERVER_CATALOG.md)。
