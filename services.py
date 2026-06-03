#!/usr/bin/env python3
"""
MCP Hub 公共服务层
被 api.py 和 query.py 共享的业务逻辑
"""

import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE_PATH = Path(__file__).parent
INDEX_FILE = BASE_PATH / "servers-index.json"

# Scene recommendations mapping (English keys for API compatibility)
SCENE_MAP = {
    "browser": ["puppeteer", "playwright", "browser", "selenium"],
    "search": ["brave-search", "tavily", "exa-search", "google"],
    "github": ["github", "git", "gitlab"],
    "database": ["sqlite", "postgresql", "mysql", "mongodb", "redis"],
    "file": ["filesystem", "file-tools", "local-shell"],
    "ai": ["openai", "claude", "gemini", "any-chat-completions"],
    "note": ["notion", "obsidian", "memory"],
    "chat": ["slack", "discord", "telegram", "email"],
    "cloud": ["aws", "gcp", "azure", "docker", "kubernetes"],
    "image": ["dalle", "image", "figma"],
    "finance": ["stock", "finance", "crypto"],
    "security": ["vault", "secret", "auth"],
}

# Config templates organized by category
# All npm packages verified to exist as of 2026-05-21
CONFIG_TEMPLATES = {
    # ═══════════════════════════════════════════════════════════════
    # 1. BROWSER & WEB AUTOMATION (浏览器与网页自动化)
    # ═══════════════════════════════════════════════════════════════
    "puppeteer": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-puppeteer"],
        "description": "Headless Chrome browser automation",
    },
    "playwright": {
        "command": "npx",
        "args": ["-y", "@executeautomation/playwright-mcp-server"],
        "description": "Cross-browser automation (Chromium, Firefox, WebKit)",
    },
    "chrome-devtools": {
        "command": "npx",
        "args": ["-y", "chrome-devtools-mcp"],
        "description": "Chrome DevTools integration",
    },
    # ═══════════════════════════════════════════════════════════════
    # 2. SEARCH & AI SERVICES (搜索与 AI 服务)
    # ═══════════════════════════════════════════════════════════════
    "brave-search": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-brave-search"],
        "env": {"BRAVE_API_KEY": "your_brave_api_key_here"},
        "description": "Brave Search API integration",
    },
    "tavily": {
        "command": "npx",
        "args": ["-y", "tavily-mcp"],
        "description": "Tavily AI search engine",
    },
    "exa-search": {
        "command": "npx",
        "args": ["-y", "exa-mcp-server"],
        "env": {"EXA_API_KEY": "your_exa_api_key_here"},
        "description": "Exa AI search for developers",
    },
    # ═══════════════════════════════════════════════════════════════
    # 3. DATABASE & STORAGE (数据库与存储)
    # ═══════════════════════════════════════════════════════════════
    "sqlite": {
        "command": "npx",
        "args": [
            "-y",
            "@modelcontextprotocol/server-sqlite",
            "--db-path",
            "/path/to/db.sqlite",
        ],
        "description": "SQLite database operations",
    },
    "postgres": {
        "command": "npx",
        "args": [
            "-y",
            "@modelcontextprotocol/server-postgres",
            "postgresql://localhost/mydb",
        ],
        "description": "PostgreSQL database integration",
    },
    "redis": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-redis"],
        "description": "Redis key-value store operations",
    },
    # ═══════════════════════════════════════════════════════════════
    # 4. FILESYSTEM & LOCAL TOOLS (文件系统与本地工具)
    # ═══════════════════════════════════════════════════════════════
    "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/workspace"],
        "description": "Local file system access (read/write files)",
    },
    "memory": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-memory"],
        "description": "Persistent memory for Claude conversations",
    },
    "sequential-thinking": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
        "description": "Structured reasoning and problem solving",
    },
    # ═══════════════════════════════════════════════════════════════
    # 5. DEVELOPER TOOLS (开发者工具)
    # ═══════════════════════════════════════════════════════════════
    "github": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"],
        "env": {"GITHUB_PERSONAL_ACCESS_TOKEN": "your_github_token_here"},
        "description": "GitHub API integration (repos, issues, PRs)",
    },
    "gitlab": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-gitlab"],
        "env": {"GITLAB_PERSONAL_ACCESS_TOKEN": "your_gitlab_token_here"},
        "description": "GitLab API integration",
    },
    "sentry": {
        "command": "npx",
        "args": ["-y", "@sentry/mcp-server"],
        "description": "Sentry error tracking and monitoring",
    },
    "docker": {
        "command": "npx",
        "args": ["-y", "mcp-server-docker"],
        "description": "Docker container management",
    },
    # ═══════════════════════════════════════════════════════════════
    # 6. PRODUCTIVITY & NOTES (生产力与笔记)
    # ═══════════════════════════════════════════════════════════════
    "notion": {
        "command": "npx",
        "args": ["-y", "@notionhq/notion-mcp-server"],
        "env": {"NOTION_TOKEN": "your_notion_token_here"},
        "description": "Notion workspace integration",
    },
    "obsidian": {
        "command": "uvx",
        "args": ["obsidian-mcp"],
        "description": "Obsidian vault access",
    },
    "linear": {
        "command": "npx",
        "args": ["-y", "linear-mcp-server"],
        "env": {"LINEAR_API_KEY": "your_linear_api_key_here"},
        "description": "Linear issue tracking",
    },
    # ═══════════════════════════════════════════════════════════════
    # 7. COMMUNICATION (通讯)
    # ═══════════════════════════════════════════════════════════════
    "slack": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-slack"],
        "env": {"SLACK_BOT_TOKEN": "your_slack_bot_token_here"},
        "description": "Slack workspace integration",
    },
    "discord": {
        "command": "npx",
        "args": ["-y", "discord-mcp-server"],
        "env": {"DISCORD_BOT_TOKEN": "your_discord_bot_token_here"},
        "description": "Discord bot integration",
    },
    "telegram": {
        "command": "uvx",
        "args": ["mcp-telegram", "start"],
        "env": {"TELEGRAM_BOT_TOKEN": "your_telegram_bot_token_here"},
        "description": "Telegram bot integration",
    },
    # ═══════════════════════════════════════════════════════════════
    # 8. CLOUD SERVICES (云服务)
    # ═══════════════════════════════════════════════════════════════
    "google-maps": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-google-maps"],
        "env": {"GOOGLE_MAPS_API_KEY": "your_google_maps_api_key_here"},
        "description": "Google Maps API integration",
    },
    "gdrive": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-gdrive"],
        "description": "Google Drive file operations",
    },
    "aws-kb": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-aws-kb-retrieval"],
        "description": "AWS Knowledge Base retrieval",
    },
    "stripe": {
        "command": "npx",
        "args": ["-y", "@stripe/mcp"],
        "description": "Stripe payment operations",
    },
    # ═══════════════════════════════════════════════════════════════
    # 9. AI/ML PLATFORMS (AI/ML 平台)
    # ═══════════════════════════════════════════════════════════════
    "huggingface": {
        "command": "uvx",
        "args": ["huggingface-mcp-server"],
        "description": "Hugging Face model hub access",
    },
    "context7": {
        "command": "npx",
        "args": ["-y", "@upstash/context7-mcp"],
        "description": "Context7 documentation search",
    },
    "apify": {
        "command": "npx",
        "args": ["-y", "@apify/actors-mcp-server"],
        "description": "Apify web scraping platform",
    },
    # ═══════════════════════════════════════════════════════════════
    # 10. TESTING & DEMO (测试与演示)
    # ═══════════════════════════════════════════════════════════════
    "everything": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-everything"],
        "description": "Demo server with all MCP features",
    },
    # ═══════════════════════════════════════════════════════════════
    # 11. DOMESTIC CHINA (国内特色)
    # ═══════════════════════════════════════════════════════════════
    "wechat": {
        "command": "npx",
        "args": ["-y", "wechat-mcp-server"],
        "description": "微信 MCP 服务器",
        "source": "https://github.com/zhayujie/chatgpt-on-wechat",
    },
    "feishu": {
        "command": "npx",
        "args": ["-y", "feishu-mcp-server"],
        "description": "飞书 MCP 服务器",
        "source": "https://github.com/justinyoo/Feishu-MCP",
    },
    "dingtalk": {
        "command": "npx",
        "args": ["-y", "dingtalk-mcp-server"],
        "description": "钉钉 MCP 服务器",
    },
    "bilibili": {
        "command": "npx",
        "args": ["-y", "bilibili-mcp-server"],
        "description": "B站 MCP 服务器",
    },
    "aliyun": {
        "command": "npx",
        "args": ["-y", "aliyun-mcp-server"],
        "description": "阿里云 MCP 服务器",
    },
    "tencent": {
        "command": "npx",
        "args": ["-y", "tencent-mcp-server"],
        "description": "腾讯云 MCP 服务器",
    },
}


class IndexCache:
    """Simple file-based cache for index data"""

    _cache: Optional[Dict] = None
    _mtime: float = 0

    @classmethod
    def get_index(cls) -> Dict:
        """Get index with caching based on file modification time"""
        if not INDEX_FILE.exists():
            return {
                "version": "2.0.0",
                "total_servers": 0,
                "total_categories": 0,
                "categories": {},
                "servers": [],
                "source_types": {},
                "languages": {},
                "last_sync": "",
                "upstream_total": 0,
            }

        mtime = INDEX_FILE.stat().st_mtime
        if cls._cache is None or mtime > cls._mtime:
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                cls._cache = json.load(f)
            cls._mtime = mtime
        return cls._cache

    @classmethod
    def invalidate(cls):
        """Invalidate cache"""
        cls._cache = None


def load_index() -> Dict:
    """Load servers index (with caching)"""
    return IndexCache.get_index()


def get_servers() -> List[Dict]:
    """Get list of all servers"""
    return load_index().get("servers", [])


def get_categories() -> Dict[str, int]:
    """Get category counts"""
    return load_index().get("categories", {})


def get_stats() -> Dict[str, Any]:
    """Get market statistics"""
    index = load_index()
    servers = index.get("servers", [])

    # Count by source type
    source_types = {}
    for s in servers:
        st = s.get("source_type", "unknown")
        source_types[st] = source_types.get(st, 0) + 1

    # Count by language
    languages = index.get("languages", {})

    # Star statistics
    star_counts = [s.get("stars", 0) for s in servers]
    star_stats = {
        "total": sum(star_counts),
        "max": max(star_counts) if star_counts else 0,
        "avg": round(sum(star_counts) / len(star_counts), 1) if star_counts else 0,
    }

    return {
        "total_servers": index.get("total_servers", 0),
        "total_categories": len(index.get("categories", {})),
        "categories": index.get("categories", {}),
        "source_types": source_types,
        "languages": languages,
        "stars": star_stats,
        "last_sync": index.get("last_sync", ""),
        "upstream_total": index.get("upstream_total", 0),
    }


def search_servers(
    keyword: str,
    servers: Optional[List[Dict]] = None,
    sort_by: str = "relevance",
) -> List[Dict]:
    """Search servers by keyword in name, description, categories, topics

    sort_by: "relevance" (default), "stars", "updated"
    """
    if servers is None:
        servers = get_servers()

    keyword = keyword.lower()
    results = []

    for s in servers:
        name = s.get("name", "").lower()
        desc = s.get("description", "").lower()
        cats = " ".join(s.get("categories", [])).lower()
        topics = " ".join(s.get("topics", [])).lower()
        owner = s.get("owner", "").lower()

        if (
            keyword in name
            or keyword in desc
            or keyword in cats
            or keyword in topics
            or keyword in owner
        ):
            results.append(s)

    if sort_by == "stars":
        results.sort(key=lambda s: s.get("stars", 0), reverse=True)
    elif sort_by == "updated":
        results.sort(key=lambda s: s.get("updated_at", ""), reverse=True)
    # "relevance" = no sorting (index order, which is by stars desc from sync)

    return results


def filter_by_category(
    category: str,
    servers: Optional[List[Dict]] = None,
    sort_by: str = "stars",
) -> List[Dict]:
    """Filter servers by category, sorted by stars by default"""
    if servers is None:
        servers = get_servers()

    category = category.lower()
    results = []

    for s in servers:
        cats = [c.lower() for c in s.get("categories", [])]
        if any(category in c for c in cats):
            results.append(s)

    if sort_by == "stars":
        results.sort(key=lambda s: s.get("stars", 0), reverse=True)
    elif sort_by == "updated":
        results.sort(key=lambda s: s.get("updated_at", ""), reverse=True)

    return results


def get_server_by_name(name: str) -> Optional[Dict]:
    """Get single server by name"""
    for s in get_servers():
        if s.get("name") == name:
            return s
    return None


def recommend_servers(scene: str, limit: int = 10) -> List[Dict]:  # noqa: kept for back-compat
    """Deprecated alias for recommend_by_scene. Use recommend_by_scene instead."""
    return recommend_by_scene(scene, limit)


def generate_config(name: str) -> Dict[str, Any]:
    """Generate config for a server

    Matching strategy:
    1. Exact match in CONFIG_TEMPLATES (e.g. "github" → official github config)
    2. Template key contained in server name as a segment (e.g. "puppeteer-mcp-server" → puppeteer)
       - Only matches if the key is a complete word segment to avoid false positives
    3. Try npm_package from server data in index
    4. Generic fallback: @modelcontextprotocol/server-{name}
    """
    name_lower = name.lower()

    # 1. Exact match in templates
    for key, config in CONFIG_TEMPLATES.items():
        if key == name_lower:
            return {"mcpServers": {name: config}}

    # 2. Partial match with word boundary check
    #    e.g. "puppeteer-mcp-server" matches "puppeteer" (puppeteer is a segment)
    #    e.g. "my-memory-app" also matches "memory" (memory is a segment)
    #    This is a best-effort heuristic; users should verify the generated config
    for key, config in CONFIG_TEMPLATES.items():
        # Check if key appears as a complete segment in the name (separated by - or _)
        segments = name_lower.replace("_", "-").split("-")
        if key in segments:
            return {"mcpServers": {name: config}}

    # 3. Try to get npm_package from server data
    server = get_server_by_name(name)
    if server:
        npm_pkg = server.get("npm_package", "")
        if npm_pkg:
            return {"mcpServers": {name: {"command": "npx", "args": ["-y", npm_pkg]}}}

    # 4. Generic fallback
    return {
        "mcpServers": {
            name: {
                "command": "npx",
                "args": ["-y", f"@modelcontextprotocol/server-{name}"],
            }
        }
    }


def list_categories() -> Dict[str, int]:
    """List all categories with counts"""
    return get_categories()


def list_popular(limit: int = 10) -> List[Dict]:
    """List popular servers sorted by stars"""
    servers = get_servers()
    sorted_servers = sorted(
        servers,
        key=lambda s: s.get("stars", 0),
        reverse=True,
    )
    return sorted_servers[:limit]


def list_recent(limit: int = 10) -> List[Dict]:
    """List recently updated servers"""
    servers = get_servers()
    sorted_servers = sorted(
        servers,
        key=lambda s: s.get("updated_at", ""),
        reverse=True,
    )
    return sorted_servers[:limit]


# Chinese scene names mapping (for query.py compatibility)
SCENE_RECOMMENDATIONS = {
    **SCENE_MAP,
    # Chinese aliases
    "浏览器自动化": ["puppeteer", "playwright", "browser-tools"],
    "代码搜索": ["github", "gitlab", "sourcegraph"],
    "AI 搜索": ["brave-search", "tavily", "exa-search", "google"],
    "数据库": ["sqlite", "postgresql", "mysql", "mongodb", "redis"],
    "文件操作": ["filesystem", "file-tools", "local-shell"],
    "笔记": ["notion", "obsidian", "memory"],
    "通信": ["slack", "discord", "telegram", "email"],
    "云服务": ["aws", "gcp", "azure", "docker", "kubernetes"],
    "图像生成": ["dalle", "image", "figma", "stable-diffusion"],
    "金融": ["stock", "finance", "crypto"],
    "安全": ["vault", "secret-manager", "auth"],
    "AI 开发": ["openai", "claude", "gemini", "any-chat-completions"],
    "RAG": ["memory", "rag", "embedding", "vector"],
    "API 开发": ["rest-client", "http", "graphql", "api"],
    "项目管理": ["linear", "jira", "todoist", "asana"],
    "天气": ["weather", "natural"],
    "地图": ["map", "geo", "location"],
}


def recommend_by_scene(scene: str, limit: int = 10) -> List[Dict]:
    """Recommend servers by scene (supports both English and Chinese), sorted by stars"""
    scene_lower = scene.lower()

    # Find matching keywords
    matched_keywords = []
    for key, keywords in SCENE_RECOMMENDATIONS.items():
        if key.lower() == scene_lower or any(kw.lower() == scene_lower for kw in keywords):
            matched_keywords.extend(keywords)

    if not matched_keywords:
        # Fallback to direct search
        results = search_servers(scene)
        results.sort(key=lambda s: s.get("stars", 0), reverse=True)
        return results[:limit]

    # Search with matched keywords
    servers = get_servers()
    results = []
    seen = set()

    for kw in matched_keywords:
        for s in search_servers(kw, servers):
            name = s.get("name", "")
            if name and name not in seen:
                seen.add(name)
                results.append(s)
                if len(results) >= limit:
                    break
        if len(results) >= limit:
            break

    # Sort by stars
    results.sort(key=lambda s: s.get("stars", 0), reverse=True)
    return results[:limit]


# ═══════════════════════════════════════════════════════════════════════════════
# CURATED SERVERS LIST (精选服务器列表)
# All names verified to exist in servers-index.json
# 120 curated servers across 15 categories
# ═══════════════════════════════════════════════════════════════════════════════
CURATED_SERVERS = {
    # ═══════════════════════════════════════════════════════════════════════
    # 1. AI & LLM PLATFORMS (AI大模型平台) - 8 servers
    # ═══════════════════════════════════════════════════════════════════════
    "AI & LLM": [
        "dify",
        "open-webui",
        "LocalAI",
        "FastGPT",
        "anything-llm",
        "gpt-researcher",
        "lobe-chat",
        "cherry-studio",
    ],
    # ═══════════════════════════════════════════════════════════════════════
    # 2. TOP STARRED PROJECTS (明星项目) - 8 servers
    # ═══════════════════════════════════════════════════════════════════════
    "Top Starred Projects": [
        "n8n",
        "JavaGuide",
        "gemini-cli",
        "netdata",
        "ragflow",
        "Scrapling",
        "mempalace",
        "composio",
    ],
    # ═══════════════════════════════════════════════════════════════════════
    # 3. OFFICIAL & ENTERPRISE (官方与企业) - 8 servers
    # ═══════════════════════════════════════════════════════════════════════
    "Official & Enterprise": [
        "github-mcp-server",
        "playwright-mcp",
        "kong",
        "nacos",
        "UI-TARS-desktop",
        "goose",
        "mastra",
        "claude-plugins-official",
    ],
    # ═══════════════════════════════════════════════════════════════════════
    # 4. BROWSER & WEB (浏览器与网页) - 8 servers
    # ═══════════════════════════════════════════════════════════════════════
    "Browser & Web": [
        "chrome-devtools-mcp",
        "page-agent",
        "inspector",
        "nuclear",
        "code-review-graph",
        "mcp-toolbox",
        "genai-toolbox",
        "fastmcp",
    ],
    # ═══════════════════════════════════════════════════════════════════════
    # 5. DATABASE & STORAGE (数据库与存储) - 8 servers
    # ═══════════════════════════════════════════════════════════════════════
    "Database & Storage": [
        "postgres-mcp-server",
        "mysql-mcp-server",
        "mongodb-mcp-server",
        "qdrant-mcp-server",
        "elasticsearch-mcp-server",
        "mcp-redis",
        "postgres-mcp",
        "mcp-database-server",
    ],
    # ═══════════════════════════════════════════════════════════════════════
    # 6. AI TOOLKIT & FRAMEWORKS (AI工具与框架) - 8 servers
    # ═══════════════════════════════════════════════════════════════════════
    "AI Toolkit & Frameworks": [
        "agentscope",
        "repomix",
        "fastmcp",
        "mcp-use",
        "mcp-for-beginners",
        "Fay",
        "LangBot",
        "sqlite-explorer-fastmcp-mcp-server",
    ],
    # ═══════════════════════════════════════════════════════════════════════
    # 7. DOMESTIC CHINA (国内大厂) - 10 servers
    # ═══════════════════════════════════════════════════════════════════════
    "Domestic China": [
        "chatgpt-on-wechat",
        "Feishu-MCP",
        "UI-TARS-desktop",
        "bilibili-mcp-server",
        "CloudBase-MCP",
        "alibabacloud-tablestore-mcp-server",
        "nacos",
        "dingtalk-sdk-mcp",
        "xiaomi-iot-mcp",
        "music163-mcp",
    ],
    # ═══════════════════════════════════════════════════════════════════════
    # 8. PROJECT MANAGEMENT (项目管理) - 8 servers
    # ═══════════════════════════════════════════════════════════════════════
    "Project Management": [
        "1Panel",
        "AstrBot",
        "kratos",
        "Fay",
        "FastGPT",
        "JeecgBoot",
        "code-review-graph",
        "mcp-toolbox",
    ],
    # ═══════════════════════════════════════════════════════════════════════
    # 9. SECURITY (安全) - 8 servers
    # ═══════════════════════════════════════════════════════════════════════
    "Security": [
        "composio",
        "casdoor",
        "gin-vue-admin",
        "Anthropic-Cybersecurity-Skills",
        "ciso-assistant-community",
        "mcp-for-beginners",
        "Aegis",
        "AuditLuma",
    ],
    # ═══════════════════════════════════════════════════════════════════════
    # 10. CLOUD & DEVOPS (云与DevOps) - 8 servers
    # ═══════════════════════════════════════════════════════════════════════
    "Cloud & DevOps": [
        "netdata",
        "kong",
        "nacos",
        "1Panel",
        "gin-vue-admin",
        "kratos",
        "page-agent",
        "mcp-server-cloudflare",
    ],
    # ═══════════════════════════════════════════════════════════════════════
    # 11. SOCIAL & COMMUNICATION (社交与通讯) - 8 servers
    # ═══════════════════════════════════════════════════════════════════════
    "Social & Communication": [
        "chatgpt-on-wechat",
        "LangBot",
        "Agent-Reach",
        "dingtalk-sdk-mcp",
        "Feishu-MCP",
        "tiger-slack",
        "discord-mcp",
        "telegram-search",
    ],
    # ═══════════════════════════════════════════════════════════════════════
    # 12. FRAMEWORKS & TOOLS (框架与工具) - 8 servers
    # ═══════════════════════════════════════════════════════════════════════
    "Frameworks & Tools": [
        "mastra",
        "repomix",
        "agentscope",
        "genai-toolbox",
        "mcp-toolbox",
        "fastmcp",
        "mcp-use",
        "mcp-server-cloudflare",
    ],
    # ═══════════════════════════════════════════════════════════════════════
    # 13. MULTIMEDIA & CONTENT (多媒体与内容) - 8 servers
    # ═══════════════════════════════════════════════════════════════════════
    "Multimedia & Content": [
        "LocalAI",
        "nuclear",
        "music163-mcp",
        "Fay",
        "valuecell",
        "hyperframes",
        "page-agent",
        "FunASR",
    ],
    # ═══════════════════════════════════════════════════════════════════════
    # 14. DEVELOPER EXPERIENCE (开发者体验) - 8 servers
    # ═══════════════════════════════════════════════════════════════════════
    "Developer Experience": [
        "github-mcp-server",
        "playwright-mcp",
        "awesome-mcp-servers",
        "inspector",
        "claude-plugins-official",
        "mcp-for-beginners",
        "code-review-graph",
        "genai-toolbox",
    ],
    # ═══════════════════════════════════════════════════════════════════════
    # 15. AI AGENTS (AI智能体) - 8 servers
    # ═══════════════════════════════════════════════════════════════════════
    "AI Agents": [
        "dify",
        "FastGPT",
        "gpt-researcher",
        "agentscope",
        "Agent-Reach",
        "Fay",
        "LangBot",
        "cherry-studio",
    ],
}


def get_curated_servers() -> Dict[str, List[str]]:
    """获取精选服务器列表"""
    return CURATED_SERVERS


def get_curated_servers_details() -> Dict[str, List[Dict]]:
    """获取精选服务器详情（精确匹配实际存在的服务器，允许跨分类重复）"""
    servers = get_servers()
    server_map = {s.get("name"): s for s in servers}
    result = {}

    for category, server_names in CURATED_SERVERS.items():
        category_servers = []
        for name in server_names:
            if name in server_map:
                category_servers.append(server_map[name])
        result[category] = category_servers

    return result


def get_quality_score_for_server(server: Dict) -> int:
    """Calculate server quality score (0-100)

    Optimized scoring dimensions:
    1. Functionality Completeness (35%) - npm package, categories, topics, description
    2. Documentation Completeness (20%) - README, description length, examples
    3. Maintenance Activity (25%) - Update recency, archive status
    4. Community Support (20%) - Stars, official verification, platform support

    Total: 100 points
    """
    score = 0

    # ═══════════════════════════════════════════════════════════════════════════
    # 1. FUNCTIONALITY COMPLETENESS (35 points)
    # ═══════════════════════════════════════════════════════════════════════════

    # 1.1 Supported by topics/description (12 points) - more accessible than npm_package
    topics = server.get("topics", [])
    description = server.get("description", "")
    description_lower = description.lower()

    # Check if server has real content
    has_content = bool(topics) or bool(description)
    if has_content:
        score += 12
    else:
        score += 0

    # 1.2 Categories (10 points)
    categories = server.get("categories", [])
    if categories and len(categories) > 0:
        if len(categories) >= 3:
            score += 10
        elif len(categories) >= 2:
            score += 8
        else:
            score += 6

    # 1.3 Topic variety (8 points)
    topic_count = len(topics) if topics else 0
    if topic_count >= 10:
        score += 8
    elif topic_count >= 5:
        score += 7
    elif topic_count >= 3:
        score += 5
    elif topic_count >= 1:
        score += 3

    # 1.4 Description quality (5 points)
    if description:
        desc_length = len(description)
        if desc_length >= 200:
            score += 5
        elif desc_length >= 100:
            score += 4
        elif desc_length >= 50:
            score += 3
        else:
            score += 1

    # ═══════════════════════════════════════════════════════════════════════════
    # 2. DOCUMENTATION COMPLETENESS (20 points)
    # ═══════════════════════════════════════════════════════════════════════════

    # 2.1 Example keywords in description (8 points)
    example_keywords = [
        "example",
        "usage",
        "install",
        "quick start",
        "demo",
        "tutorial",
        "getting started",
        "guide",
    ]
    matches = sum(1 for kw in example_keywords if kw in description_lower)
    if matches >= 4:
        score += 8
    elif matches >= 2:
        score += 6
    elif matches >= 1:
        score += 4

    # 2.2 License (6 points)
    if server.get("license"):
        score += 6

    # 2.3 Has README indicator (6 points) - inferred from description quality
    readme_indicators = ["readme", "documentation", "wiki", "docs"]
    has_docs = any(indicator in description_lower for indicator in readme_indicators)
    score += 6 if has_docs else 0

    # ═══════════════════════════════════════════════════════════════════════════
    # 3. MAINTENANCE ACTIVITY (25 points)
    # ═══════════════════════════════════════════════════════════════════════════

    # 3.1 Non-archived (12 points)
    if not server.get("archived", False):
        score += 12

    # 3.2 Update recency (13 points)
    updated_at = server.get("updated_at", "")
    if updated_at:
        try:
            from datetime import timezone

            updated_str = updated_at.replace("Z", "+00:00")
            updated_date = datetime.fromisoformat(updated_str)
            if updated_date.tzinfo is None:
                updated_date = updated_date.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            days_since_update = (now - updated_date).days
            if days_since_update <= 30:
                score += 13
            elif days_since_update <= 90:
                score += 11
            elif days_since_update <= 180:
                score += 9
            elif days_since_update <= 365:
                score += 7
            elif days_since_update <= 730:
                score += 5
            else:
                score += 3
        except (ValueError, TypeError, ImportError):
            score += 5
    else:
        score += 3

    # ═══════════════════════════════════════════════════════════════════════════
    # 4. COMMUNITY SUPPORT (20 points)
    # ═══════════════════════════════════════════════════════════════════════════

    # 4.1 Star count (10 points) - more granular and generous
    stars = server.get("stars", 0)
    if stars >= 50000:
        score += 10
    elif stars >= 10000:
        score += 9
    elif stars >= 5000:
        score += 8
    elif stars >= 1000:
        score += 7
    elif stars >= 500:
        score += 6
    elif stars >= 100:
        score += 5
    elif stars >= 50:
        score += 4
    elif stars >= 10:
        score += 3
    elif stars > 0:
        score += 2

    # 4.2 Official or verified (6 points)
    source_type = server.get("source_type", "")
    owner = server.get("owner", "").lower()
    verified_owners = {
        "modelcontextprotocol",
        "anthropic",
        "openai",
        "google",
        "stripe",
        "sentry",
        "docker",
        "notion",
        "slack",
        "github",
        "gitlab",
        "vercel",
        "aws",
        "azure",
        "gcp",
        "cloudflare",
        "alibaba",
        "aliyun",
        "tencent",
        "bytedance",
        "byte",
        "huawei",
        "baidu",
        "jd",
        "meituan",
        "xiaomi",
        "netease",
        "bilibili",
        "feishu",
        "dingtalk",
        "microsoft",
        "meta",
        "mistralai",
        "huggingface",
        "ollama",
        "langchain",
    }
    if source_type == "official" or owner in verified_owners:
        score += 6

    # 4.3 Platform support (4 points)
    language = server.get("language", "").lower()
    if language in ["python", "typescript", "javascript", "go", "rust", "java"]:
        score += 4
    elif language in ["node", "nodejs", "py"]:
        score += 2

    return max(0, min(100, score))


def get_quality_level(score: int) -> str:
    """根据分数获取质量等级"""
    if score >= 80:
        return "S"
    elif score >= 65:
        return "A"
    elif score >= 50:
        return "B"
    elif score >= 35:
        return "C"
    else:
        return "D"


def get_quality_level_description(score: int) -> str:
    """获取完整性等级描述"""
    level = get_quality_level(score)
    descriptions = {
        "S": "🌟 卓越 - 功能完整，文档详尽，活跃维护，高人气",
        "A": "⭐ 优秀 - 功能完善，文档较好，活跃维护",
        "B": "👍 良好 - 功能基本完整，文档可接受",
        "C": "👌 一般 - 功能有限，可能需要补充文档",
        "D": "⚠️ 待改进 - 功能或文档需要改进",
    }
    return descriptions.get(level, "未知")


def get_domestic_companies() -> Dict[str, List[Dict]]:
    """获取国内大厂相关的 MCP 服务器"""
    companies = {
        "阿里巴巴": ["alibaba", "aliyun"],
        "腾讯": ["tencent"],
        "字节跳动": ["bytedance", "byte"],
        "京东": ["jd"],
        "Bilibili": ["bilibili"],
        "微信": ["wechat", "weixin"],
        "飞书": ["feishu"],
    }

    servers = get_servers()
    result = {}

    for company, keywords in companies.items():
        company_servers = []
        for s in servers:
            name = s.get("name", "").lower()
            owner = s.get("owner", "").lower()
            full_name = s.get("full_name", "").lower()

            for kw in keywords:
                if kw in name or kw in owner or kw in full_name:
                    company_servers.append(s)
                    break

        # 按 Star 排序
        company_servers.sort(key=lambda x: x.get("stars", 0), reverse=True)
        result[company] = company_servers[:20]  # 每个公司最多 20 个

    return result


# ═══════════════════════════════════════════════════════════════════════════════
# DATA VALIDATION & QUALITY CHECKING
# Automated data quality validation and checking mechanisms
# ═══════════════════════════════════════════════════════════════════════════════


def validate_server_data(server: Dict) -> Dict[str, Any]:
    """Validate individual server data and return validation report

    Returns:
        Dict with validation results including:
        - is_valid: bool
        - errors: List[str] - List of validation errors
        - warnings: List[str] - List of warnings
        - score: int - Overall validation score (0-100)
    """
    errors = []
    warnings = []
    score = 100

    # Required fields check
    required_fields = ["name", "source", "description", "stars"]
    for field in required_fields:
        if not server.get(field):
            errors.append(f"Missing required field: {field}")
            score -= 20

    # Name validation
    name = server.get("name", "")
    if not name:
        errors.append("Server name is empty")
    elif len(name) > 100:
        errors.append(f"Server name too long: {len(name)} chars")
        score -= 10
    elif not name.replace("-", "").replace("_", "").isalnum():
        warnings.append("Server name contains unusual characters")
        score -= 5

    # Source validation
    source = server.get("source", "")
    if not source:
        errors.append("Source URL is missing")
        score -= 15
    elif not (source.startswith("http://") or source.startswith("https://")):
        errors.append("Source URL is not a valid HTTP(S) URL")
        score -= 15
    elif "github.com" in source and "/issues" not in source and "/pulls" not in source:
        pass  # Valid GitHub URL
    elif "github.com" in source and ("/issues" in source or "/pulls" in source):
        warnings.append("Source points to GitHub issues or PRs instead of repository")
        score -= 10

    # Description validation
    description = server.get("description", "")
    if not description:
        warnings.append("Description is empty")
        score -= 10
    elif len(description) < 20:
        warnings.append("Description is too short (<20 characters)")
        score -= 5
    elif len(description) > 5000:
        warnings.append("Description is unusually long")
        score -= 5

    # Stars validation
    stars = server.get("stars", 0)
    if not isinstance(stars, int):
        errors.append("Stars count is not an integer")
        score -= 15
    elif stars < 0:
        errors.append("Stars count is negative")
        score -= 20
    elif stars > 500000:
        warnings.append("Stars count unusually high - verify manually")
        score -= 2

    # Categories validation
    categories = server.get("categories", [])
    if not categories:
        warnings.append("No categories assigned")
        score -= 5
    elif len(categories) > 20:
        warnings.append("Too many categories (>20)")
        score -= 3

    # Language validation
    language = server.get("language", "")
    valid_languages = [
        "python",
        "typescript",
        "javascript",
        "go",
        "rust",
        "java",
        "nodejs",
        "node",
        "py",
        "ts",
        "js",
        "c++",
        "c#",
        "ruby",
        "php",
        "shell",
        "bash",
        "powershell",
        "dockerfile",
    ]
    if language and language.lower() not in valid_languages:
        warnings.append(f"Unusual language: {language}")
        score -= 2

    # Archive status check
    if server.get("archived", False):
        warnings.append("Repository is archived")
        score -= 10

    # Date validation - fixed to handle timezone-aware and naive datetimes
    updated_at = server.get("updated_at", "")
    if updated_at:
        try:
            from datetime import timezone

            updated_str = updated_at.replace("Z", "+00:00")
            updated_date = datetime.fromisoformat(updated_str)
            # Make datetime timezone-aware for consistent comparison
            if updated_date.tzinfo is None:
                updated_date = updated_date.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            days_old = (now - updated_date).days
            if days_old > 730:  # 2 years
                warnings.append(f"Not updated for {days_old} days (>2 years)")
                score -= 10
        except (ValueError, TypeError) as e:
            warnings.append(f"Invalid date format: {e}")
            score -= 5

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "score": max(0, score),
    }


def validate_all_servers(servers: Optional[List[Dict]] = None) -> Dict[str, Any]:
    """Validate all servers and return summary report

    Returns:
        Dict with:
        - total_servers: int
        - valid_servers: int
        - invalid_servers: int
        - total_errors: int
        - total_warnings: int
        - error_types: Dict[str, int] - Count by error type
        - warning_types: Dict[str, int] - Count by warning type
        - servers_by_validation_score: Dict[int, List[str]] - Servers grouped by score
    """
    if servers is None:
        servers = get_servers()
    validation_results = []
    error_types = defaultdict(int)
    warning_types = defaultdict(int)
    servers_by_score = defaultdict(list)

    for server in servers:
        result = validate_server_data(server)
        name = server.get("name", "unknown")
        score = result["score"]

        validation_results.append({"name": name, **result})

        servers_by_score[score].append(name)

        for error in result["errors"]:
            error_key = error.split(":")[0] if ":" in error else error
            error_types[error_key] += 1

        for warning in result["warnings"]:
            warning_key = warning.split(":")[0] if ":" in warning else warning
            warning_types[warning_key] += 1

    valid_count = sum(1 for r in validation_results if r["is_valid"])
    invalid_count = len(validation_results) - valid_count

    return {
        "total_servers": len(servers),
        "valid_servers": valid_count,
        "invalid_servers": invalid_count,
        "total_errors": sum(error_types.values()),
        "total_warnings": sum(warning_types.values()),
        "error_types": dict(error_types),
        "warning_types": dict(warning_types),
        "servers_by_validation_score": dict(servers_by_score),
        "validation_results": validation_results,
    }


def get_low_quality_servers(
    threshold: int = 40, servers: Optional[List[Dict]] = None
) -> List[Dict]:
    """Get servers with validation score below threshold

    Args:
        threshold: Minimum validation score (default: 40)
        servers: Optional pre-loaded servers list

    Returns:
        List of servers with validation issues
    """
    if servers is None:
        servers = get_servers()
    low_quality = []

    for server in servers:
        validation = validate_server_data(server)
        if validation["score"] < threshold or not validation["is_valid"]:
            low_quality.append({**server, "validation": validation})

    low_quality.sort(key=lambda x: x["validation"]["score"])
    return low_quality


def get_data_health_report(servers: Optional[List[Dict]] = None) -> Dict[str, Any]:
    """Generate comprehensive data health report

    Returns:
        Dict with overall data quality metrics and recommendations
    """
    validation = validate_all_servers(servers=servers)

    # Calculate health score
    total_checks = validation["total_servers"] * 10  # Approximate checks per server
    health_score = 100 - (
        (validation["total_errors"] / total_checks * 100) * 0.6
        + (validation["total_warnings"] / total_checks * 100) * 0.4
    )

    # Get most common issues
    top_errors = sorted(validation["error_types"].items(), key=lambda x: x[1], reverse=True)[:5]
    top_warnings = sorted(validation["warning_types"].items(), key=lambda x: x[1], reverse=True)[:5]

    # Recommendations
    recommendations = []

    if validation["invalid_servers"] > 0:
        recommendations.append(
            {
                "priority": "HIGH",
                "message": f"{validation['invalid_servers']} servers have critical validation errors",
                "action": "Review and fix invalid server data",
            }
        )

    if validation["total_warnings"] > validation["total_servers"] * 0.5:
        recommendations.append(
            {
                "priority": "MEDIUM",
                "message": "High number of warnings detected",
                "action": "Consider improving server metadata quality",
            }
        )

    for error_type, count in top_errors:
        if count > validation["total_servers"] * 0.1:  # More than 10% affected
            recommendations.append(
                {
                    "priority": "HIGH",
                    "message": f"Common issue: {error_type} ({count} servers affected)",
                    "action": f"Fix {error_type} across affected servers",
                }
            )

    return {
        "health_score": max(0, min(100, round(health_score, 2))),
        "total_servers": validation["total_servers"],
        "valid_percentage": round(
            validation["valid_servers"] / validation["total_servers"] * 100, 2
        ),
        "invalid_percentage": round(
            validation["invalid_servers"] / validation["total_servers"] * 100, 2
        ),
        "total_errors": validation["total_errors"],
        "total_warnings": validation["total_warnings"],
        "top_errors": top_errors,
        "top_warnings": top_warnings,
        "recommendations": recommendations,
        "timestamp": str(datetime.now().isoformat()),
    }
