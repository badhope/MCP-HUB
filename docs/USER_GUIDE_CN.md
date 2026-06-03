# MCP Hub · 用户使用指南

> **完整、实用地讲解如何把 MCP Hub 用起来**：无论是终端用户、AI 智能体、服务器作者，还是私有化部署的运维工程师，都能在这里找到对应路径。

本指南默认你已经读过 [README_CN.md](../README_CN.md) 和 [快速上手](QUICKSTART_CN.md)。它会从「如何做」的角度继续往下走，而不是再列一遍命令清单。

---

## 目录

1. [这本指南写给谁](#1-这本指南写给谁)
2. [核心概念](#2-核心概念)
3. [场景 A ·「我想给 Claude / Cursor / ChatGPT 装一个 MCP 服务器」](#3-场景-a--我想给-claude--cursor--chatgpt-装一个-mcp-服务器)
4. [场景 B ·「我想找一个能完成某项任务的服务器」](#4-场景-b--我想找一个能完成某项任务的服务器)
5. [场景 C ·「我想让我的 AI Agent 接入 MCP Hub」](#5-场景-c--我想让我的-ai-agent-接入-mcp-hub)
6. [场景 D ·「我想提交自己的服务器」](#6-场景-d--我想提交自己的服务器)
7. [场景 E ·「我想给团队自托管 MCP Hub」](#7-场景-e--我想给团队自托管-mcp-hub)
8. [命令行工具参考](#8-命令行工具参考)
9. [质量、时效性与可信度信号](#9-质量时效性与可信度信号)
10. [故障排查](#10-故障排查)
11. [常见问题 FAQ](#11-常见问题-faq)

---

## 1. 这本指南写给谁

| 你是… | 直接看 | 预计用时 |
|---|---|---|
| 想把一个工具装进 Claude / Cursor 的终端用户 | [场景 A](#3-场景-a--我想给-claude--cursor--chatgpt-装一个-mcp-服务器) | 5 分钟 |
| 想找「能解决 X 问题」的服务器的进阶用户 | [场景 B](#4-场景-b--我想找一个能完成某项任务的服务器) | 5 分钟 |
| AI Agent / 工具开发者 | [场景 C](#5-场景-c--我想让我的-ai-agent-接入-mcp-hub) | 15 分钟 |
| 想上架自己服务器的作者 | [场景 D](#6-场景-d--我想提交自己的服务器) | 10 分钟 |
| 平台 / DevOps 工程师（私有化部署） | [场景 E](#7-场景-e--我想给团队自托管-mcp-hub) | 20 分钟 |

---

## 2. 核心概念

| 术语 | 解释 |
|---|---|
| **MCP** | [Model Context Protocol](https://modelcontextprotocol.io)，一种开放标准，让 AI 客户端（Claude、Cursor 等）能调用「服务器」暴露出来的工具。 |
| **MCP 服务器** | 一段小程序（Node.js / Python / Go 等），向 MCP 客户端暴露一组工具。常见例子：GitHub、文件系统、Postgres。 |
| **Config（配置）** | 客户端启动时加载的 JSON 片段，里面列出要拉起哪些服务器、怎么启动。Claude Desktop：macOS 下是 `~/Library/Application Support/Claude/claude_desktop_config.json`，Windows 下是 `%APPDATA%\Claude\claude_desktop_config.json`。 |
| **Index（索引）** | MCP Hub 持有的全量服务器快照（`servers-index.json`），每日从上游仓库重建。 |
| **Quality score（质量分）** | 0-100 的综合分，基于 README 完整度、最近提交时间、License、是否有测试等信号。**越高越值得信任**。 |
| **Curated（精选）** | 维护者人工筛选过的子集（约 50 个），门槛更高。在 Web UI 的「Curated」页面查看。 |

---

## 3. 场景 A ·「我想给 Claude / Cursor / ChatGPT 装一个 MCP 服务器」

目标：把一个服务器（比如 `github`）装进你的 AI 客户端，不用自己手写配置。

### 第 1 步 · 找一个服务器

- 打开 [Web UI](https://github.com/badhope/MCP-HUB#-quick-start)，搜索你想要的（比如 `github`、`postgres`、`playwright`）。
- 或用 API：

  ```bash
  curl "http://localhost:8080/servers?search=github&limit=5" | jq '.servers[].name'
  ```

### 第 2 步 · 看清楚再装

- 在 Web UI 的服务器详情页查看：`description`、`stars`、`language`、`last commit`、`license`、以及任何质量告警。
- API：

  ```bash
  curl http://localhost:8080/servers/github | jq '{name, stars, language, license, quality: .quality_score}'
  ```

### 第 3 步 · 一键生成「即用即粘」的配置

服务器详情页有 **「Copy config」** 按钮。API 调用：

```bash
curl http://localhost:8080/config/github-mcp-server
```

返回：

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
  "install":  { "claude_desktop": "把 mcpServers 块粘到 claude_desktop_config.json 后重启 Claude。" }
}
```

把 `mcpServers` 这块复制下来。

### 第 4 步 · 粘到你的客户端

| 客户端 | 配置文件位置 |
|---|---|
| Claude Desktop（macOS） | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop（Windows） | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | Settings → Models → Model Context Protocol → Add server |
| ChatGPT Desktop | Settings → Connectors → Add MCP server |
| 任何基于 stdio 的客户端 | 标准 `{"command": "...", "args": [...]}` 格式 |

### 第 5 步 · 重启客户端并验证

新工具应该出现在客户端的工具选择面板里。如果没出现，参见 [故障排查 §10](#10-故障排查)。

---

## 4. 场景 B ·「我想找一个能完成某项任务的服务器」

Web UI 提供分类、语言、质量的筛选器。**用 API 做程序化检索更快**。

### 按使用场景找（语义化推荐）

```bash
curl "http://localhost:8080/recommend/for-use-case?use_case=查找并修复安全漏洞&limit=5"
```

### 按分类浏览

```bash
curl "http://localhost:8080/servers/by-category/development?limit=10" | jq '.servers[].name'
```

### 找相似服务器

```bash
curl "http://localhost:8080/recommend/similar?server=github-mcp-server&limit=5"
```

### 并排对比

```bash
curl "http://localhost:8080/compare?servers=github-mcp-server,playwright-mcp" | jq
```

### 按质量过滤

```bash
# 只看「精选」服务器
curl "http://localhost:8080/servers/curated" | jq '.servers[].name'

# 找出质量分低于 60 的（通常过时或残缺）
curl "http://localhost:8080/validate/low-quality?threshold=60" | jq
```

---

## 5. 场景 C ·「我想让我的 AI Agent 接入 MCP Hub」

MCP Hub 默认就**为 Agent 消费而设计**。下面三条集成路径，按需选用。

### 方案 1 · 直接调用 REST API（最实时）

```python
import requests

BASE = "https://mcp-hub.example.com"   # 或 http://localhost:8080

# 发现服务器
results = requests.get(f"{BASE}/servers", params={"search": "github", "limit": 5}).json()
for s in results["servers"]:
    print(s["name"], s["stars"], s["description"])

# 生成配置，再交给用户去安装
cfg = requests.get(f"{BASE}/config/github-mcp-server").json()
print(cfg["mcpServers"])
```

每个端点都返回稳定的 JSON 结构，详见 [API.md](API.md)。

### 方案 2 · 下载离线索引（适合离线 / 低延迟 Agent）

```bash
# 下载静态索引（每日重建）
curl -O https://github.com/badhope/MCP-HUB/releases/latest/download/servers-index.json
```

文件是一个扁平的 `Server` 记录数组，字段定义见 `main.py` 里的 Pydantic 模型。

### 方案 3 · OpenAPI Schema（适合强类型客户端）

```bash
curl http://localhost:8080/openapi.json > mcp-hub-openapi.json
```

搭配 `openapi-generator` / `fern` / `speakeasy` 等工具生成 Python、TypeScript、Go 等语言的强类型客户端。

### 推荐模式 · 把 MCP Hub 作为 Agent 的「选工具」步骤

让 Agent 的「该用哪个工具？」步骤直接调用 `GET /recommend/for-use-case`，你就不用自己维护一份服务器清单了。

---

## 6. 场景 D ·「我想提交自己的服务器」

两种方式都可以。

### 路径 1 · Web 表单（最简单）

从 [server_submission 模板](../.github/ISSUE_TEMPLATE/server_submission_CN.md) 开一个 issue，把质量检查清单勾完。维护者一周内 review。

### 路径 2 · API（更快，可脚本化）

```bash
curl -X POST http://localhost:8080/submissions/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-cool-server",
    "repo_url": "https://github.com/me/my-cool-server",
    "category": "development",
    "language": "typescript",
    "license": "MIT",
    "description": "把一件事做得很漂亮。"
  }'
```

查询状态：

```bash
curl http://localhost:8080/submissions | jq
```

### 接下来会发生什么

1. 提交进入审核队列。
2. CI 自动拉取仓库、跑质量评分，向 `main` 开一个草稿 PR。
3. 维护者 review PR，通过后合入索引，**下一个每日同步周期就会对外发布**。

---

## 7. 场景 E ·「我想给团队自托管 MCP Hub」

### 架构总览

```
┌──────────────────┐    HTTP/JSON    ┌──────────────────┐
│   React + Vite   │ ──────────────► │  FastAPI backend │
│   Web UI (:5173) │                 │     (:8080)      │
└──────────────────┘                 └──────────────────┘
                                              │
                                              ▼
                                     ┌──────────────────┐
                                     │ servers-index    │
                                     │   .json (4,403+) │
                                     └──────────────────┘
                                              ▲
                                              │ 每日
                                     ┌──────────────────┐
                                     │ GitHub Actions   │
                                     │  tools/sync_…    │
                                     └──────────────────┘
```

### 一键部署

```bash
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB
python tools/sync_index.py             # 约 5 MB 下载
docker compose up -d --build
```

端口说明：

| 服务 | 端口 | 访问地址 |
|---|---|---|
| Web UI | 5173 | `http://localhost:5173` |
| REST API | 8080 | `http://localhost:8080` |
| Swagger UI | 8080 | `http://localhost:8080/docs` |
| ReDoc | 8080 | `http://localhost:8080/redoc` |

### 生产环境检查清单

- [ ] API 前面挂反代（Caddy / nginx）并启用 TLS
- [ ] 把 `servers-index.json` 和 `user-data.json` 挂载到持久化卷
- [ ] 用 cron / GitHub Actions 定时跑 `python tools/sync_index.py`（每日）
- [ ] 开启 GitHub Secret Scanning & Push Protection（本仓库默认已开）
- [ ] 把日志接入你们的日志聚合系统
- [ ] 生产环境**固定 docker 镜像 tag**，不要用 `:latest`

### 升级

```bash
git pull
docker compose pull
docker compose up -d --build
```

`user-data.json` 和 `submissions.json` 走命名卷，数据不会丢。

---

## 8. 命令行工具参考

所有工具在 [`tools/`](../tools/) 下，**从仓库根目录运行**。

| 命令 | 作用 |
|---|---|
| `python tools/sync_index.py` | 下载最新上游索引，重建 `servers-index.json` |
| `python tools/index_servers.py <file>` | 把 `servers/<name>/` 下的本地服务器加入索引 |
| `python tools/comprehensive_collector.py` | 同时抓多个上游 registry 并合并 |
| `python tools/index_downloader.py` | 批量下载被引用的仓库（谨慎使用，先看 `--help`） |
| `python tools/completeness_scoring.py` | 对索引里所有服务器重算质量分 |
| `python tools/auto_updater.py` | cron 友好：拉上游 → 重打分 → 写回 |
| `python tools/secret_scanner.py` | 扫描仓库里是否意外提交了密钥 |
| `python tools/gen_api_docs.py` | 从实时 OpenAPI schema 重新生成 [`docs/API.md`](API.md) |
| `python tools/build_social_preview.py` | 重新生成社交预览图 |
| `python tools/notable_projects_navigator.py` | 生成 `notable_projects.json` |
| `python tools/collect_domestic_companies.py` | 生成国内公司目录 |
| `python tools/server_health_checker.py` | HEAD 检查每个仓库 URL，报告死链 |
| `python tools/update_index.py` | 一键：拉 → 打分 → 发布 |
| `python tools/downloader.py awesome 10` | 从 `awesome-mcp` 拉前 10 名到 `servers/` |
| `python tools/batch_manager.py` | 批量操作 `servers/*` |

---

## 9. 质量、时效性与可信度信号

| 信号 | 出现在 | 含义 |
|---|---|---|
| `quality_score` (0-100) | 服务器卡片 + `/servers/{name}` | README 完整度、提交活跃度、License、测试 综合分 |
| `stars` | 服务器卡片 | GitHub star 数，反映**热度而非质量** |
| `archived` | 服务器卡片（红色徽标） | **不要再装**——上游已归档 |
| `updated_at` | 服务器卡片 | 超过 1 年未更新就要为可能失效做预案 |
| `license` | 服务器详情页 | OSI 批准的 license = 可放心商用 |
| `curated` 标志 | `Curated` 页面 | 维护者人工挑选，**最稳的起点** |
| 最后同步时间 | Web UI 页脚 | 上次刷新索引的精确时间 |

**经验法则**：生产环境只装「`!archived` 且 `quality_score >= 60` 且近 6 个月有更新 且 license 是 OSI 批准」的服务器。

---

## 10. 故障排查

| 现象 | 常见原因 | 解决办法 |
|---|---|---|
| 客户端看不到新工具 | 配置文件 JSON 格式错 | 用 `python -m json.tool < claude_desktop_config.json` 校验 |
| 客户端看不到新工具 | 客户端没重启 | 完全退出再打开 Claude Desktop / Cursor |
| macOS 上 `npx` 报错 | Node 不在 PATH | 用 nvm 或 Homebrew 装 Node 20+ |
| Apple Silicon 上 `pip install` 失败 | 某些依赖没 arm64 wheel | 用 Docker 方案，或换 `conda` / `pyenv` |
| API 返回 500 | 索引过期 | 跑 `python tools/sync_index.py` |
| Web UI 显示「no servers」 | API 没起 / CORS 被拦 | 确认后端跑在 :8080 |
| CI 里 `secret_scanner` 误报 | 测试 fixture 命中了某个 pattern | 加 `--quiet`，或在 `tools/secret_scanner.py` 的 allowlist 加白 |
| 提交服务器返回 403 | 触发了提交频率限制 | 等一小时，或直接用 issue 模板 |
| 推送 main 时提示「Branch update failed」 | branch protection 已开启（好事！） | 改用 PR 流程 |

---

## 11. 常见问题 FAQ

**Q: MCP Hub 是 Anthropic 官方产品吗？**
不是。这是社区维护的服务器目录，索引的对象是符合 Anthropic 提出的开放协议（Model Context Protocol）的服务器。协议是 Anthropic 的；目录是我们的。

**Q: 数据多久更新一次？**
每日（通过 GitHub Actions cron）。Web UI 页脚的 `updated_at` 给出精确时间。

**Q: 生成的配置能直接信任吗？**
`command` 和 `args` 是从上游 README 原文拿的，**请自己 review**。`env` 块里通常包含 token 占位符，你必须自己填上。

**Q: 我的服务器没进 Curated 列表怎么办？**
改进质量评分最看重的三件事：完整 README、最近的 commit、宽松 license。下一个 sync 周期后重新提交。

**Q: 能离线跑 MCP Hub 吗？**
可以。`python tools/sync_index.py` 下载一次快照后，Web UI 完全本地工作。唯一需要网络的是每日同步。

**Q: MCP Hub 会「打电话回家」吗？**
不会。服务是无状态的。唯一的对外网络流量是可选的每日上游同步。

**Q: 数据存哪里？**
- 目录：`servers-index.json`（可从上游重建）
- 用户数据：`user-data.json`（收藏、评分、评论）。仅本机，私有化部署时已 gitignore
- 提交：`submissions.json`（队列 + 审核记录）

**Q: 怎么加一个不在 GitHub 上的内部服务器？**
编辑 `market-config.json`，加一条 `source_type: "private"` 的记录，下一次重建就会被索引。

---

<p align="center">
  <sub>最后更新：2026-06-02 · MCP-HUB v2.0.1</sub>
</p>
