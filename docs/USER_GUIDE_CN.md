# MCP Hub — 用户指南

> **完整的、有观点的指南，帮助你作为最终用户、AI 代理或服务器作者从 MCP Hub 中获得价值。**

本指南假设你已经阅读了 [README](../README_CN.md) 和 [快速上手](QUICKSTART_CN.md)。它从它们结束的地方开始，带你了解**真实的工作流程**，而不仅仅是命令列表。

---

## 目录

1. [本指南适合谁](#1-本指南适合谁)
2. [核心概念](#2-核心概念)
3. [工作流程 A — "我想在 Claude Desktop / Cursor / ChatGPT 中安装 MCP 服务器"](#3-工作流程-a--我想在-claude-desktop--cursor--chatgpt-中安装-mcp-服务器)
4. [工作流程 B — "我想找一个能做特定工作的服务器"](#4-工作流程-b--我想找一个能做特定工作的服务器)
5. [工作流程 C — "我想让我的 AI 代理使用 MCP Hub"](#5-工作流程-c--我想让我的-ai-代理使用-mcp-hub)
6. [工作流程 D — "我想提交我自己的服务器"](#6-工作流程-d--我想提交我自己的服务器)
7. [工作流程 E — "我想为我的团队自托管 MCP Hub"](#7-工作流程-e--我想为我的团队自托管-mcp-hub)
8. [数据管道工具参考](#8-数据管道工具参考)
9. [质量、新鲜度和信任信号](#9-质量新鲜度和信任信号)
10. [故障排除](#10-故障排除)
11. [常见问题](#11-常见问题)

---

## 1. 本指南适合谁

| 你是… | 从这里开始 | 阅读时间 |
|---|---|---|
| 只想在 Claude / Cursor 中添加工具的最终用户 | [工作流程 A](#3-工作流程-a--我想在-claude-desktop--cursor--chatgpt-中安装-mcp-服务器) | 5 分钟 |
| 搜索能做 X 的服务器的资深用户 | [工作流程 B](#4-工作流程-b--我想找一个能做特定工作的服务器) | 5 分钟 |
| AI 代理构建者 / 工具作者 | [工作流程 C](#5-工作流程-c--我想让我的-ai-代理使用-mcp-hub) | 15 分钟 |
| 想被收录的服务器作者 | [工作流程 D](#6-工作流程-d--我想提交我自己的服务器) | 10 分钟 |
| 自托管的平台 / DevOps 工程师 | [工作流程 E](#7-工作流程-e--我想为我的团队自托管-mcp-hub) | 10 分钟 |

---

## 2. 核心概念

| 术语 | 定义 |
|---|---|
| **MCP** | [Model Context Protocol](https://modelcontextprotocol.io) — 一个开放标准，让 AI 客户端（Claude、Cursor 等）调用 *服务器* 暴露的外部"工具"。 |
| **MCP 服务器** | 一个小程序（Node.js / Python / Go / …），向 MCP 客户端暴露一组工具。例如：GitHub、文件系统、Postgres。 |
| **配置** | MCP 客户端在启动时加载的 JSON 片段，列出要启动哪些服务器以及如何启动。对于 Claude Desktop：`~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）或 `%APPDATA%\Claude\claude_desktop_config.json`（Windows）。 |
| **索引** | MCP Hub 对每个已知 MCP 服务器的本地快照（`servers-index.json`），每日从上游注册表重建。 |
| **质量分数** | 一个 0-100 的数字，结合 5 个因子：stars（30%）、recency（15%）、语言覆盖率（15%）、描述质量（20%）和我们的信号（20%）。越高 = 越可信。 |
| **我们的信号** | 一个信任等级（0.0 / 0.4 / 0.7 / 1.0），表示我们是否亲自适配了该服务器。寻找"✅ 已适配"徽章。 |

---

## 3. 工作流程 A — "我想安装一个 MCP 服务器"

目标：将服务器（例如 `github`）添加到你的 AI 客户端，而无需从头编写配置。

### 步骤 1 — 查找服务器

- 打开 [Web UI](https://badhope.github.io/MCP-HUB/) 并搜索你想要的（例如 `github`、`postgres`、`playwright`）。
- 或在 [Browse 页面](https://badhope.github.io/MCP-HUB/browse) 按分类浏览。

### 步骤 2 — 检查候选项

- 在 UI 中点击服务器卡片，查看其 `description`、`stars`、`language`、`last commit`、`license` 和质量分数细分。
- 寻找"✅ 已适配"徽章 — 这些是我们亲自用通用安装命令包装的服务器。

### 步骤 3 — 生成可粘贴的配置

服务器详情页面有一个 **"复制配置"** 按钮，生成通用的 `mcpServers` JSON 块。

示例输出：

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

复制 `mcpServers` 块。

### 步骤 4 — 粘贴到你的客户端

| 客户端 | 配置文件 |
|---|---|
| Claude Desktop（macOS） | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Claude Desktop（Windows） | `%APPDATA%\Claude\claude_desktop_config.json` |
| Cursor | Settings → Models → Model Context Protocol → Add server |
| ChatGPT Desktop | Settings → Connectors → Add MCP server |
| 任何基于 stdio 的 | 标准 `{"command": "...", "args": [...]}` |

### 步骤 5 — 重启客户端并验证

新工具现在应该出现在客户端的工具选择器中。如果没有，请参见 [故障排除 §10](#10-故障排除)。

---

## 4. 工作流程 B — "我想找一个能做特定工作的服务器"

Web UI 有分类、语言和质量的过滤器。

### 按分类浏览

打开 [Browse 页面](https://badhope.github.io/MCP-HUB/browse) 并点击分类卡片来过滤服务器。

### 按质量过滤

- 寻找分数 ≥ 60 的服务器（通常过时或不完整的服务器分数较低）。
- 优先选择带有"✅ 已适配"徽章的服务器 — 这些在第 2 层，已经过亲自测试。

### 查找相似的服务器

点击服务器卡片查看其详情页面，显示同一分类中的相关服务器。

---

## 5. 工作流程 C — "我想让我的 AI 代理使用 MCP Hub"

MCP Hub **开箱即支持代理消费**。两种集成路径，选择适合的。

### 选项 1 — 获取静态索引（最新）

```python
import requests

# 下载静态索引（每日重建）
url = "https://badhope.github.io/MCP-HUB/servers-index.json"
index = requests.get(url).json()

# 搜索服务器
for server in index["servers"]:
    if "github" in server["name"].lower():
        print(server["name"], server["stars"], server["description"])
```

该文件是一个扁平的 JSON 对象，带有 `servers` 数组。每个服务器有：
- `name`、`owner`、`full_name`
- `stars`、`updated_at`、`archived`
- `categories`、`description`、`language`
- `install_hint`（command + args + env）
- `score`、`score_breakdown`（5 个因子）
- `our_signal`、`our_signal_label`（信任等级）

### 选项 2 — 离线索引（用于隔离/低延迟代理）

```bash
# 下载静态索引（每日重建）
curl -O https://badhope.github.io/MCP-HUB/servers-index.json
```

该文件约 4.4 MB，包含所有 4,400+ 个服务器。将其加载到内存中并在本地查询。

### 推荐模式：工具搜索步骤

将代理的"我应该使用哪个工具？"步骤指向静态索引，并按 `score >= 60` 和 `our_signal >= 0.7`（已适配或适配中）过滤。

---

## 6. 工作流程 D — "我想提交我自己的服务器"

两种路径都可以。

### 路径 1 — Issue 模板（最简单）

从 [server_submission 模板](../.github/ISSUE_TEMPLATE/server_submission.md) 开启新 issue。填写质量清单。维护者会在一周内审核。

### 路径 2 — Pull request（更快）

如果你的服务器已经在上游 `awesome-mcp` 注册表中，它将在下一次每日同步时自动被收录。如果没有，你可以开 PR 将其添加到上游注册表。

### 接下来会发生什么

1. 提交进入分拣队列。
2. 每日同步工作流获取上游索引，给每个服务器打分，并写入 `servers-index.json`。
3. 你的服务器出现在目录中，带有计算出的分数。

---

## 7. 工作流程 E — "我想为我的团队自托管 MCP Hub"

### 架构

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

### 一键部署

```bash
git clone https://github.com/badhope/MCP-HUB.git
cd MCP-HUB
cd frontend && npm install && npm run build
# 用任何静态托管服务提供 frontend/dist/（nginx、Caddy、S3 等）
```

### 生产检查清单

- [ ] 在反向代理（Caddy / nginx）后提供 `frontend/dist/`，带 TLS
- [ ] 安排 `python3 tools/sync_index.py && python3 tools/gen_static_data.py` 每日运行（cron / GitHub Action 定时任务）
- [ ] 启用 GitHub 秘密扫描和推送保护（在此仓库的设置中默认开启）
- [ ] 设置日志发送到你的聚合器

### 更新

```bash
git pull
cd frontend && npm install && npm run build
# 重新部署 frontend/dist/
```

---

## 8. 数据管道工具参考

全部在 [`tools/`](../tools/) 下。从仓库根目录运行。

| 命令 | 作用 |
|---|---|
| `python3 tools/sync_index.py` | 下载最新上游索引，用 GitHub API 元数据充实，写入 `servers-index.json`（根目录）|
| `python3 tools/gen_static_data.py` | 给每个服务器打分，计算安装提示，扫描 adapters/ 获取 our_signal，写入 `frontend/public/servers-index.json` |
| `python3 tools/completeness_scoring.py` | 重新给索引中的每个服务器打分（5 因子公式）|
| `python3 tools/secret_scanner.py` | 扫描仓库中意外提交的秘密 |
| `python3 tools/build_social_preview.py` | 重建社交预览横幅 |

---

## 9. 质量、新鲜度和信任信号

| 信号 | 在哪里看到 | 含义 |
|---|---|---|
| `score`（0-100）| 服务器卡片 + 详情页 | 5 个因子的综合：stars（30%）、recency（15%）、lang_coverage（15%）、desc_quality（20%）、our_signal（20%）|
| `stars` | 服务器卡片 | GitHub stargazers — 受欢迎程度，不是质量 |
| `archived` | 服务器卡片（红色徽章）| **不要安装** — 上游已消失 |
| `updated_at` | 服务器卡片 | 如果 > 1 年，计划好会出问题 |
| `license` | 服务器详情 | OSI 批准 = 商业使用安全 |
| `our_signal` 徽章 | 服务器卡片（✅ 已适配 / ⚙️ 适配中 / 👀 调研过 / 🆕 未处理）| 信任等级 — 我们是否亲自适配了该服务器 |
| 最后同步时间戳 | Web UI 页脚 | 索引最后刷新时间 |

**经验法则：** 对于生产部署，只安装 `!archived`、`score >= 60`、在过去 6 个月内更新过、且有 OSI 批准许可证的服务器。优先选择 `our_signal >= 0.7`（已适配或适配中）的服务器。

---

## 10. 故障排除

| 症状 | 可能原因 | 修复 |
|---|---|---|
| 客户端看不到新工具 | 配置 JSON 格式错误 | 用 `python3 -m json.tool < claude_desktop_config.json` 验证 |
| 客户端看不到新工具 | 客户端未重启 | 退出并重新打开 Claude Desktop / Cursor |
| macOS 上的 `npx` 错误 | Node 不在 PATH 上 | 通过 nvm 或 Homebrew 安装 Node 20+ |
| `pip install` 在 Apple Silicon 上失败 | 一些依赖缺少 arm64 wheels | 使用 `conda` / `pyenv` |
| Web UI 显示"no servers" | `servers-index.json` 未找到 | 运行 `python3 tools/gen_static_data.py` 重新生成 |
| `python3 tools/secret_scanner.py` 在 CI 中抱怨 | 测试夹具触发了模式 | 用 `--quiet` 运行，或更新 `tools/secret_scanner.py` 的允许列表 |
| 推送到 main 时"Branch update failed" | 分支保护已开启（好！）| 改为开 PR |

---

## 11. 常见问题

**问：MCP Hub 是 Anthropic 的官方产品吗？**
不是。它是一个社区注册表，索引说开放 Model Context Protocol 的服务器。协议来自 Anthropic；目录是我们的。

**问：数据多久刷新一次？**
每日，通过 GitHub Actions 定时任务。Web UI 页脚的 `updated_at` 告诉你确切时间戳。

**问：我可以信任你生成的配置吗？**
`command` 和 `args` 是逐字从上游 README 或我们的适配器清单中获取的。总是审查它们 — `env` 块通常包含你必须自己提供的令牌的占位符。

**问：我的服务器被从精选列表中拒绝了。现在怎么办？**
改进评分器最关心的三件事：完整的 README、最近的提交和宽松的许可证。在下一次同步后重新提交。

**问：我可以离线运行 MCP Hub 吗？**
可以 — `python3 tools/sync_index.py` 下载一次性快照，Web UI 对本地索引工作。唯一需要网络的是每日同步。

**问：MCP Hub 会打电话回家吗？**
不会。SPA 完全是静态的。用户数据（收藏、评分）存在于你浏览器的 `localStorage` 中。清除站点数据会清除它们。

**问：数据存储在哪里？**
- 目录 — `frontend/public/servers-index.json`（可从上游重新生成）
- 用户数据 — 浏览器 `localStorage`（收藏、评分）。仅本地，不同步。

**问：我如何添加不在 GitHub 上的私有/内部服务器？**
MCP Hub 只索引公共 GitHub 仓库。对于私有服务器，你可以 fork 仓库并手动将条目添加到 `servers-index.json`。

---

<p align="center">
  <sub>最后更新：2026-06-12 · MCP-HUB v3.1.0</sub>
</p>
