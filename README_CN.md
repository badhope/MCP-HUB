# MCP Hub · 万能 MCP 中心

> **收录 4,400+ MCP 服务器**，统一适配 Claude / Cursor / ChatGPT / DeepSeek 等所有 AI 平台

<p align="center">
  <a href="https://github.com/badhope/MCP-HUB/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge"></a>
  <a href="https://github.com/badhope/MCP-HUB/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/badhope/MCP-HUB/ci.yml?branch=main&style=for-the-badge&label=CI"></a>
  <a href="https://github.com/badhope/MCP-HUB/releases"><img alt="Release" src="https://img.shields.io/github/v/release/badhope/MCP-HUB?style=for-the-badge"></a>
  <a href="https://github.com/badhope/MCP-HUB/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/badhope/MCP-HUB?style=for-the-badge"></a>
  <a href="https://github.com/badhope/MCP-HUB/blob/main/README.md"><img alt="English" src="https://img.shields.io/badge/English-Switch-blue?style=for-the-badge"></a>
</p>

<p align="center">
  <img src="frontend/public/social-preview.png" alt="MCP Hub" width="800">
</p>

---

## 这是什么？

**MCP Hub** 是一个免费、开源、社区驱动的 **MCP（Model Context Protocol）服务器市场**，面向三类用户：

1. **AI 应用使用者** — 浏览、下载即用的 Claude Desktop / Cursor / ChatGPT 配置
2. **AI 智能体（Agent）** — 提供稳定的 REST API 与可下载的离线索引，让你的 Agent 随时按需推荐工具
3. **MCP 服务器作者** — 提交一次，被整个 MCP 生态发现

| 指标 | 数量 |
|---|---|
| 收录 MCP 服务器 | **4,400+** |
| 官方精选 | **51** |
| 分类数 | **23** |
| REST API 端点 | **35+** |
| 每日上游同步 | ✅ |
| Claude / Cursor 配置生成 | ✅ |
| 面向 AI 智能体可发现 | ✅ |

> 数据每日从上游 [awesome-mcp](https://github.com/Rodert/awesome-mcp) 仓库同步。索引在每次 CI 运行时重建并发布。

---

## ✨ 特性

- 🔍 **强大的检索** — 全文搜索、分类 / 语言 / 质量 / stars 过滤、按 stars 或最近更新排序
- 🎨 **现代化 Web UI** — React + TypeScript + Tailwind，暗黑模式，移动端自适应，一键生成配置
- ⚡ **FastAPI 后端** — 异步、类型安全（Pydantic v2），自动 Swagger / ReDoc
- 🤖 **AI Agent 优先** — 每个端点都是稳定的 JSON 契约，并随版本发布离线索引
- 📤 **配置生成** — 即用即粘的 Claude Desktop / Cursor / 任意 stdio MCP 客户端配置
- ⭐ **质量评分** — 自动计算完整性、健康度、质量分
- 🔄 **每日自动同步** — GitHub Actions 工作流每日重建索引并提交
- 🐳 **一键部署** — `docker compose up` 起完整服务
- 🛡️ **安全** — 自动密钥扫描、分支保护、签名发布、零遥测

---

## 🚀 快速开始

### 方式一：Docker Compose（推荐）

```bash
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB

# 首次构建服务器索引（约 5 MB 下载）
python tools/sync_index.py

# 启动完整服务
docker compose up -d --build

# Web UI  : http://localhost:5173
# REST API: http://localhost:8080
# API 文档: http://localhost:8080/docs
```

### 方式二：本地 Python（无需 Docker）

```bash
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB

pip install -r requirements.txt
python tools/sync_index.py            # 填充 servers-index.json
python main.py                        # API 监听 :8080
```

另一个终端启动前端：

```bash
cd frontend
npm install
npm run dev                           # UI 监听 :5173，自动连上面 API
```

### 方式三：纯 REST API（任意语言）

```bash
# 健康检查
curl http://localhost:8080/

# 搜索
curl "http://localhost:8080/servers?search=github&limit=5"

# 按分类浏览
curl "http://localhost:8080/servers/by-category/development?limit=5"

# 生成 Claude Desktop 配置
curl http://localhost:8080/config/github-mcp-server
```

完整端点列表在 **[`/docs`](http://localhost:8080/docs)**（Swagger UI）和 **[`/redoc`](http://localhost:8080/docs)**（ReDoc）。

---

## 📡 REST API 速览

| 分组 | 端点 |
|---|---|
| 健康与统计 | `GET /`, `GET /stats`, `GET /stats/all` |
| 发现 | `GET /servers`, `GET /servers/{name}`, `GET /servers/popular`, `GET /servers/recent`, `GET /servers/curated`, `GET /servers/by-category/{category}`, `GET /servers/by-quality` |
| 配置 | `GET /config/{name}`, `GET /export/markdown/{name}`, `POST /export/batch-json`, `POST /export/batch-markdown` |
| 推荐 | `GET /recommend/for-use-case`, `GET /recommend/similar`, `GET /compare` |
| 校验 | `GET /validate/server/{name}`, `GET /validate/all`, `GET /validate/health`, `GET /validate/low-quality` |
| 用户 | `POST/GET /favorites/*`, `POST/GET /ratings/*`, `POST/GET /comments/*` |
| 提交 | `POST /submissions/submit`, `GET /submissions`, `POST /submissions/review` |

`GET /servers` 支持参数：`search`、`category`、`language`、`sort`（`stars` / `updated`）、`min_stars`、`limit`、`offset`。

完整参考见 **[docs/API.md](docs/API.md)**。

---

## 🤖 面向 AI 智能体

MCP Hub **为 Agent 消费而索引**：

- **REST API** 返回纯 JSON，无需抓取
- 每个 release 都附带静态 **`servers-index.json`** 供离线使用
- **`/openapi.json`** 是 OpenAPI 兼容的，可被任何支持 OpenAPI 的 Agent 直接消费

```python
import requests

# 发现
servers = requests.get("https://mcp-hub.example.com/servers", params={"search": "github"}).json()

# 生成配置
config = requests.get("https://mcp-hub.example.com/config/github-mcp-server").json()
```

让你的 Agent 直接调用在线 API，告别自己维护服务器列表。

---

## 🏗️ 架构

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

- **后端** — 单进程 FastAPI（`main.py`），Pydantic v2 模型，异步路由，lifespan 管理的索引缓存
- **前端** — Vite + React 18 + TypeScript + TanStack Query + Zustand，路由懒加载，暗黑模式
- **索引** — 每日从上游 [awesome-mcp](https://github.com/Rodert/awesome-mcp) 重建的静态 JSON
- **CI/CD** — GitHub Actions：密钥扫描 → 后端测试 → 前端构建 → 发布 release

---

## 📚 文档

| 文档 | 说明 | 语言 |
|---|---|---|
| [README_CN.md](README_CN.md) | 本文件 · 总览、特性、快速上手 | 🇨🇳 中文 |
| [README.md](README.md) | Overview, features, quick start | 🇬🇧 English |
| [docs/USER_GUIDE_CN.md](docs/USER_GUIDE_CN.md) | **完整用户指南** — 5 个真实使用场景（安装 / 检索 / Agent 接入 / 提交 / 私有化部署）、CLI 工具、故障排查、FAQ | 🇨🇳 中文 |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | **Complete user guide** — 5 real workflows (install / discover / agent-consume / submit / self-host), CLI tools, troubleshooting, FAQ | 🇬🇧 English |
| [docs/QUICKSTART_CN.md](docs/QUICKSTART_CN.md) | 5 分钟本地启动 | 🇨🇳 中文 |
| [docs/QUICKSTART.md](docs/QUICKSTART.md) | 5-minute local setup | 🇬🇧 English |
| [docs/API.md](docs/API.md) | 完整 REST API 参考（自动从 OpenAPI 生成） | 🇬🇧 English |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 如何贡献（开发流程、代码规范、PR 检查清单） | 🇨🇳 中文 |
| [CODE_OF_CONDUCT_CN.md](CODE_OF_CONDUCT_CN.md) | 社区行为准则 | 🇨🇳 中文 |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community standards | 🇬🇧 English |
| [SECURITY_CN.md](SECURITY_CN.md) | 安全与隐私策略 | 🇨🇳 中文 |
| [SECURITY.md](SECURITY.md) | Security policy & threat model | 🇬🇧 English |
| [SUPPORT_CN.md](SUPPORT_CN.md) | 寻求帮助 | 🇨🇳 中文 |
| [SUPPORT.md](SUPPORT.md) | Where to get help | 🇬🇧 English |
| [CHANGELOG.md](CHANGELOG.md) | 版本历史 | 🇨🇳 / 🇬🇧 |
| [AGENTS.md](AGENTS.md) | 给 AI 编程 Agent 的约定 | 🇬🇧 English |

---

## 🤝 贡献

欢迎 issue 与 PR。最快的方式：

- 🐛 **报告 Bug** — 使用 [bug 报告模板](.github/ISSUE_TEMPLATE/bug_report.md)
- 💡 **功能请求** — 使用 [feature request 模板](.github/ISSUE_TEMPLATE/feature_request.md)
- 🆕 **提交服务器** — 使用 [server submission 模板](.github/ISSUE_TEMPLATE/server_submission.md) **或** 调用 `POST /submissions/submit`
- ❓ **提问** — 使用 [Q&A 模板](.github/ISSUE_TEMPLATE/question.md)
- 🔒 **上报安全问题** — 见 [SECURITY.md](SECURITY.md)，**不要**开公开 issue

开发流程、代码规范、PR 检查表见 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 📄 协议

[MIT](LICENSE) © MCP Hub contributors。

---

## 🙏 致谢

- [awesome-mcp](https://github.com/Rodert/awesome-mcp) — 每日同步的上游仓库
- [Model Context Protocol](https://modelcontextprotocol.io) — 让这一切成为可能的标准
- 每一位 MCP 服务器作者与贡献者

---

<p align="center">
  <sub>为 MCP 社区用心构建。<a href="https://github.com/badhope/MCP-HUB/discussions">加入讨论 →</a></sub>
</p>
