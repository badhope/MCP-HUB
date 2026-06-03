# MCP Hub Configuration Examples

This directory contains MCP configuration examples for various AI clients.

## Quick Start

1. Copy the contents from `claude-config.json`
2. Replace all `your_xxx_here` placeholders with your actual API keys
3. Paste into your Claude Desktop configuration file

## Configuration File Paths

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

## More Configurations

MCP Hub provides 50 built-in configuration templates that can be auto-generated via API or CLI:

```bash
# API way
curl http://localhost:8080/config/github
curl http://localhost:8080/config/notion
curl http://localhost:8080/config/playwright

# CLI way
python query.py config github
python query.py config notion
python query.py config playwright
```

### Built-in Templates (50)

| Category | Templates | Description |
|----------|----------|-------------|
| **Browser** | puppeteer, playwright, chrome-devtools | Web automation |
| **Search** | brave-search, tavily, exa-search | AI search engines |
| **Database** | sqlite, postgres, redis | Database operations |
| **File** | filesystem, memory, sequential-thinking | Local files & memory |
| **Dev** | github, gitlab, sentry, docker | Developer tools |
| **Notes** | notion, obsidian, linear | Productivity tools |
| **Communication** | slack, discord, telegram | Messaging platforms |
| **Cloud** | google-maps, gdrive, aws-kb, stripe | Cloud & payments |
| **AI/ML** | huggingface, context7, apify | AI platforms |
| **Demo** | everything | Demo server |

## Supported Clients

| Client | Config Path |
|--------|------------|
| Claude Desktop | See table above |
| Cursor | `.cursor/mcp.json` (project root) |
| VS Code (Copilot) | `.vscode/mcp.json` (project root) |
