# MCP Hub 配置示例

本目录包含 Claude Desktop 的配置示例。

## 快速开始

1. 复制 `claude-config.json` 的内容
2. 替换所有 `your_xxx_here` 占位符为你的实际密钥
3. 粘贴到 Claude Desktop 配置文件中

## 配置文件路径

| 平台 | 路径 |
|------|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

## 更多配置

MCP Hub 提供 30 个内置配置模板，可通过 API 或 CLI 自动生成：

```bash
# API 方式
curl http://localhost:8080/config/github
curl http://localhost:8080/config/notion
curl http://localhost:8080/config/playwright

# CLI 方式
python query.py config github
python query.py config notion
python query.py config playwright
```

### 内置模板列表 (30个)

| 分类 | 模板 | 说明 |
|------|------|------|
| **浏览器** | puppeteer, playwright, chrome-devtools | 网页自动化 |
| **搜索** | brave-search, tavily, exa-search | AI 搜索引擎 |
| **数据库** | sqlite, postgres, redis | 数据库操作 |
| **文件** | filesystem, memory, sequential-thinking | 本地文件与记忆 |
| **开发** | github, gitlab, sentry, docker | 开发者工具 |
| **笔记** | notion, obsidian, linear | 生产力工具 |
| **通讯** | slack, discord, telegram | 消息平台 |
| **云服务** | google-maps, gdrive, aws-kb, stripe | 云与支付 |
| **AI/ML** | huggingface, context7, apify | AI 平台 |
| **测试** | everything | 演示服务器 |

## 支持的客户端

| 客户端 | 配置路径 |
|--------|----------|
| Claude Desktop | 见上表 |
| Cursor | `.cursor/mcp.json` (项目根目录) |
| VS Code (Copilot) | `.vscode/mcp.json` (项目根目录) |
