# 🤖 AI Agent Guide - MCP Hub

> **📖 Complete guide for AI agents** - Everything an AI needs to know to use MCP Hub effectively
> 
> [![AI Agent Ready](https://img.shields.io/badge/AI_Agent-Ready-purple?style=for-the-badge)](README.md)
> [![Main README](https://img.shields.io/badge/Main-README-blue?style=for-the-badge)](README.md)
> [![Chinese Version](https://img.shields.io/badge/中文-AGENT_GUIDE_CN-green?style=for-the-badge)](AGENT_GUIDE_CN.md)

---

## 📋 Table of Contents

- [🎯 Overview](#overview)
- [🚀 Quick Start](#quick-start)
- [📊 API Endpoints](#api-endpoints)
- [🔍 Searching & Filtering](#searching--filtering)
- [🏆 Curated Servers](#curated-servers)
- [🌏 Domestic Companies](#domestic-companies)
- [⭐ Quality Scoring](#quality-scoring)
- [⚙️ Config Generation](#config-generation)
- [💡 Usage Scenarios](#usage-scenarios)
- [📁 Direct File Access](#direct-file-access)
- [📚 Documentation Index](#documentation-index)
- [✅ Best Practices](#best-practices)

---

## 🎯 Overview

This repository is **AI Agent First** - designed specifically with AI agents in mind. When a user asks for an MCP server, this guide contains everything you need to know.

**Key Features for AI Agents:**
- ✅ **REST API** - Easy HTTP API for any language
- ✅ **Direct JSON Access** - Read files directly for simpler use cases
- ✅ **Structured Data** - All data in standard JSON format
- ✅ **Quality Scoring** - Smart scoring for better recommendations
- ✅ **Curated Lists** - Hand-picked, high-quality servers
- ✅ **Domestic Coverage** - Complete coverage of Chinese tech companies

---

## 🚀 Quick Start

### Option 1: REST API (Recommended for Agents)

```bash
# Start API server
python api.py

# Test endpoints
curl http://localhost:8080/
curl http://localhost:8080/stats
```

### Option 2: Direct File Access (Simplest)

```python
import json

# Load servers index
with open('servers-index.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    servers = data['servers']
    
# Load comprehensive projects (curated, high-quality)
with open('comprehensive_mcp_projects.json', 'r', encoding='utf-8') as f:
    curated = json.load(f)
    curated_projects = curated['projects']
```

---

## 📊 API Endpoints

### Core Server Operations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info and welcome |
| `/stats` | GET | Statistics summary |
| `/categories` | GET | List all categories |

### Server Query Endpoints

| Endpoint | Method | Description | Example |
|----------|--------|-------------|---------|
| `/servers` | GET | All servers | `curl /servers` |
| `/servers?search=xxx` | GET | Search by keyword | `curl /servers?search=github` |
| `/servers?category=xxx` | GET | Filter by category | `curl /servers?category=database` |
| `/servers?sort=stars\|updated` | GET | Sort results | `curl /servers?sort=stars` |
| `/servers?min-stars=N` | GET | Filter by stars | `curl /servers?min-stars=1000` |
| `/servers?limit=N` | GET | Limit results | `curl /servers?limit=20` |
| `/servers?offset=N` | GET | Pagination | `curl /servers?offset=20` |

### Curated & Special Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/curated` | GET | Curated server list by category |
| `/curated/{category}` | GET | Curated servers for specific category |
| `/companies` | GET | Domestic Chinese company servers |
| `/companies/{name}` | GET | Servers for specific company |
| `/quality/{name}` | GET | Quality score and analysis |
| `/popular` | GET | Top 10 popular servers |
| `/recent` | GET | Recently updated servers |
| `/recommend?scene=xxx` | GET | Scene-based recommendations |
| `/config/{name}` | GET | Generate MCP config for server |

### Scene Recommendations

Available scenes for `/recommend?scene=xxx`:

| Scene | Servers Returned |
|-------|-----------------|
| `browser` | Browser automation tools |
| `git` | Git & GitHub integration |
| `database` | Database servers |
| `search` | Search engines & AI search |
| `productivity` | Productivity tools |
| `developer` | Developer tools |
| `cloud` | Cloud services |
| `china` | Chinese domestic servers |

---

## 🔍 Searching & Filtering

### Search Examples

```bash
# Search for GitHub
curl "http://localhost:8080/servers?search=github"

# Search for Puppeteer or Playwright
curl "http://localhost:8080/servers?search=puppeteer"

# Database search
curl "http://localhost:8080/servers?search=database"
```

### Filter Examples

```bash
# Filter by category
curl "http://localhost:8080/servers?category=database"

# Sort by stars (highest first)
curl "http://localhost:8080/servers?sort=stars"

# Sort by last updated
curl "http://localhost:8080/servers?sort=updated"

# Filter by minimum stars
curl "http://localhost:8080/servers?min-stars=100"

# Combine filters
curl "http://localhost:8080/servers?search=github&sort=stars&min-stars=1000"
```

### Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": [
    {
      "name": "github-mcp-server",
      "description": "Official GitHub MCP server",
      "source": "https://github.com/github/github-mcp-server",
      "stars": 25000,
      "categories": ["DevOps", "CI/CD"],
      "language": "Go",
      "source_type": "official",
      "owner": "github",
      "license": "MIT",
      "updated_at": "2026-05-20T00:00:00Z"
    }
  ],
  "meta": {
    "total": 4403,
    "returned": 100,
    "offset": 0
  }
}
```

---

## 🏆 Curated Servers

Curated servers are **50+ hand-picked, high-quality MCP servers** organized into 9 categories.

### Using Curated Endpoint

```bash
# Get all curated categories
curl http://localhost:8080/curated

# Get curated servers by category
curl "http://localhost:8080/curated/Official Projects"
curl "http://localhost:8080/curated/Browser Automation"
curl "http://localhost:8080/curated/Domestic"
```

### Curated Categories

| Category | Description | Examples |
|----------|-------------|----------|
| **Official Projects** | Official MCP servers from companies | GitHub, Playwright, Notion |
| **Browser Automation** | Browser control and automation | Puppeteer, Chrome DevTools, Playwright |
| **Search & AI** | AI-powered search engines | Tavily, Brave Search, Exa |
| **Databases** | Database connectivity servers | PostgreSQL, SQLite, Redis |
| **Git & Code** | Git integration and code tools | GitHub, GitLab |
| **Productivity** | Work and collaboration tools | Notion, Slack, Linear |
| **Cloud Services** | Cloud provider integrations | AWS, GCP, Azure, Cloudflare |
| **Domestic** | Chinese domestic MCP servers | Feishu, Dingtalk, WeChat, Bilibili |
| **General Purpose** | Utility and general tools | Filesystem, Memory, Fetch |

---

## 🌏 Domestic Companies

**100% coverage of major Chinese tech companies**. Perfect for Chinese users or international users doing business in China.

### Using Domestic Endpoint

```bash
# Get all domestic companies
curl http://localhost:8080/companies

# Get servers for specific company
curl "http://localhost:8080/companies/Alibaba"
curl "http://localhost:8080/companies/Tencent"
curl "http://localhost:8080/companies/Huawei"
```

### Domestic Companies Covered

| Company | Status | Key Projects |
|---------|--------|--------------|
| **Alibaba** (阿里巴巴) | ✅ Complete | Dingtalk, Aliyun |
| **Tencent** (腾讯) | ✅ Complete | WeChat, Tencent Cloud |
| **Baidu** (百度) | ✅ Complete | Ernie (文心一言) |
| **Huawei** (华为) | ✅ Complete | Huawei Cloud, HarmonyOS |
| **ByteDance** (字节跳动) | ✅ Complete | Feishu, Douyin |
| **Xiaomi** (小米) | ✅ Complete | Miloco, Xiaomi Home |
| **NetEase** (网易) | ✅ Complete | NetEase Cloud, Yunxin |
| **Meituan** (美团) | ✅ Complete | Meituan APIs |
| **Gitee** (开源中国) | ✅ Complete | Gitee MCP |

---

## ⭐ Quality Scoring

Quality scoring evaluates servers based on **completeness and functionality**, not just popularity.

### Getting Quality Score

```bash
# Get quality analysis for a server
curl http://localhost:8080/quality/github-mcp-server
```

### Quality Response Format

```json
{
  "success": true,
  "server": "github-mcp-server",
  "completeness_score": 85,
  "level": "S",
  "description": "S级 - Excellent, complete, and well-documented",
  "dimensions": {
    "functionality": "Function completeness (40%)",
    "documentation": "Documentation completeness (20%)",
    "maintenance": "Maintenance activity (20%)",
    "community": "Community support (20%)"
  },
  "details": {
    "stars": 25000,
    "has_description": true,
    "has_license": true,
    "has_npm_package": false,
    "categories_count": 2,
    "topics_count": 3,
    "language": "Go",
    "owner_type": "official",
    "updated_at": "2026-05-20T00:00:00Z"
  }
}
```

### Quality Levels

| Level | Score | Description | Recommendation |
|-------|-------|-------------|----------------|
| **S** | 85-100 | 🌟 Excellent - Complete and documented | STRONG RECOMMEND |
| **A** | 70-84 | ⭐ Good - Complete and usable | RECOMMEND |
| **B** | 55-69 | 👍 OK - Basic but functional | OK to use |
| **C** | 40-54 | 👌 Basic - Limited features | Use if no alternatives |
| **D** | <40 | ⚠️ Needs improvement | Not recommended |

---

## ⚙️ Config Generation

Generate ready-to-use MCP configs for Claude Desktop, Cursor, VS Code, and more.

### Generate Config

```bash
# Generate config for a server
curl http://localhost:8080/config/puppeteer
curl http://localhost:8080/config/github-mcp-server
```

### Config Output Format

```json
{
  "success": true,
  "server": "puppeteer",
  "config": {
    "mcpServers": {
      "puppeteer": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
        "env": {}
      }
    }
  },
  "usage": "Add to your Claude Desktop config file"
}
```

### Config File Locations

| Platform | Location |
|----------|----------|
| **Claude Desktop** | `~/.config/Claude/claude_desktop_config.json` (Linux/macOS)<br>`%APPDATA%/Claude/claude_desktop_config.json` (Windows) |
| **Cursor** | Project root `.cursor/mcp.json` |
| **VS Code** | User settings or workspace |

---

## 💡 Usage Scenarios

### Scenario 1: User asks for browser automation

**User request:** "I need a browser automation MCP server"

**Agent steps:**
1. Call: `GET /recommend?scene=browser`
2. Get results: Playwright, Puppeteer, Chrome DevTools
3. Check quality scores (all should be S/A level)
4. Generate configs for user

**Example workflow:**
```bash
# Get recommendations
curl "http://localhost:8080/recommend?scene=browser"

# Generate config for top pick
curl http://localhost:8080/config/playwright-mcp
```

### Scenario 2: User asks for Chinese server

**User request:** "I need a Dingtalk MCP server"

**Agent steps:**
1. Call: `GET /companies/Dingtalk`
2. Get Dingtalk MCP servers
3. Check quality score
4. Generate config

**Example workflow:**
```bash
# Get Dingtalk servers
curl "http://localhost:8080/companies/Dingtalk"

# Or search directly
curl "http://localhost:8080/servers?search=dingtalk"
```

### Scenario 3: User asks for popular server

**User request:** "What are the most popular MCP servers?"

**Agent steps:**
1. Call: `GET /popular`
2. Show top 10 servers sorted by stars
3. Include quality scores for each

**Example workflow:**
```bash
# Get popular servers
curl http://localhost:8080/popular
```

### Scenario 4: User asks for curated list

**User request:** "Show me the best, most reliable MCP servers"

**Agent steps:**
1. Call: `GET /curated`
2. Show curated categories
3. Allow user to pick category

**Example workflow:**
```bash
# Get curated list
curl http://localhost:8080/curated
```

---

## 📁 Direct File Access

For simpler use cases, you can read JSON files directly without running the API server.

### File Index

| File | Purpose | Location |
|------|---------|----------|
| **servers-index.json** | Complete server index (Comprehensive servers) | Root directory |
| **comprehensive_mcp_projects.json** | Curated, high-quality projects (53 projects) | Root directory |
| **notable_projects.json** | Notable and high-star projects | Root directory |
| **server_registry.json** | Download status tracking | Root directory |

### Reading Servers Index

```python
import json

with open('servers-index.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    
    print(f"Total servers: {data['total_servers']}")
    print(f"Total categories: {data['total_categories']}")
    print(f"Source types: {data['source_types']}")
    
    # Get all servers
    servers = data['servers']
    
    # Sort by stars
    sorted_servers = sorted(servers, key=lambda x: x.get('stars', 0), reverse=True)
    
    # Get top 10
    top_10 = sorted_servers[:10]
    
    # Search
    search_term = "github"
    results = [s for s in servers if search_term.lower() in s.get('name', '').lower() or search_term.lower() in s.get('description', '').lower()]
```

### Reading Comprehensive Projects

```python
import json

with open('comprehensive_mcp_projects.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    
    print(f"Total curated projects: {data['total_projects']}")
    print(f"By owner type: {data['categories']['by_owner_type']}")
    
    projects = data['projects']
    
    # Filter downloadable
    downloadable = [p for p in projects if p.get('is_downloadable', False)]
    
    # Filter S-level
    s_level = [p for p in projects if p.get('completeness_level') == 'S']
    
    # Filter by category
    from collections import defaultdict
    category_map = defaultdict(list)
    for p in projects:
        for cat in p.get('categories', []):
            category_map[cat].append(p)
```

---

## 📚 Documentation Index

All documentation you might need:

### Primary Documents

| Document | Purpose | For AI Agents |
|----------|---------|---------------|
| [README.md](README.md) | Main documentation | ✅ Quick reference |
| [AGENT_GUIDE.md](AGENT_GUIDE.md) | **THIS FILE** - Complete AI guide | ✅ Primary resource |
| [FULL_SYSTEM_GUIDE.md](FULL_SYSTEM_GUIDE.md) | Full system details | ✅ Deep dive |
| [COMPLETENESS_SCORING_GUIDE.md](COMPLETENESS_SCORING_GUIDE.md) | Quality scoring explained | ✅ For scoring |

### Reference Documents

| Document | Purpose |
|----------|---------|
| [PROJECT_STRUCTURE_GUIDE.md](PROJECT_STRUCTURE_GUIDE.md) | File structure and conventions |
| [NOTABLE_PROJECTS_GUIDE.md](NOTABLE_PROJECTS_GUIDE.md) | Notable projects showcase |
| [DOMESTIC_COMPANIES_REPORT.md](DOMESTIC_COMPANIES_REPORT.md) | Chinese companies report |
| [NAVIGATION_GUIDE.md](NAVIGATION_GUIDE.md) | User navigation guide |

### Chinese Documents

| Document | Purpose |
|----------|---------|
| [README_CN.md](README_CN.md) | 中文主文档 |

---

## ✅ Best Practices

### 1. Prioritize Curated Servers

When recommending, prefer curated servers from `/curated` - these are hand-picked and verified.

### 2. Check Quality Scores

Always check quality scores before recommending. Prefer S/A level servers.

```bash
curl http://localhost:8080/quality/{server-name}
```

### 3. Show Multiple Options

Give users 3-5 options, sorted by quality/relevance.

### 4. Include Complete Information

For each recommendation, include:
- Server name and description
- Quality level (S/A/B/C/D)
- Star count
- GitHub link
- Installation commands
- Config file snippet

### 5. Respect Language Preferences

- Chinese users: Prioritize domestic companies
- International users: Prioritize curated servers

### 6. Use Scene Recommendations

The `/recommend?scene=xxx` endpoint is optimized for common use cases.

---

## 📋 Quick Reference Cheat Sheet

### Common Commands

| Need | Command |
|------|---------|
| **Start API** | `python api.py` |
| **All servers** | `GET /servers` |
| **Search** | `GET /servers?search=xxx` |
| **Curated** | `GET /curated` |
| **Domestic companies** | `GET /companies` |
| **Popular** | `GET /popular` |
| **Recommend browser** | `GET /recommend?scene=browser` |
| **Generate config** | `GET /config/{name}` |
| **Quality score** | `GET /quality/{name}` |

### Common Scenes

| User Request | Scene Parameter |
|--------------|-----------------|
| Browser automation | `browser` |
| Git/GitHub | `git` |
| Database | `database` |
| Search engine | `search` |
| Productivity tools | `productivity` |
| Developer tools | `developer` |
| Cloud services | `cloud` |
| Chinese servers | `china` |

---

## 🎯 Final Checklist

Before helping a user:

✅ **1. Check the request type** (search, recommendation, config generation)

✅ **2. Use appropriate endpoint** (API vs direct file access)

✅ **3. Check quality scores** (prefer S/A level)

✅ **4. Provide complete info** (name, description, stars, install command, config)

✅ **5. Give multiple options** (3-5 suggestions)

✅ **6. Show curated first** (prioritize curated servers)

✅ **7. Respect user's language** (Chinese vs international)

---

**📌 Remember:** The goal is to help users find and configure MCP servers easily!

<p align="center">
  <strong>Made with 💝 for AI agents</strong>
</p>
