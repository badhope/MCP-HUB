#!/usr/bin/env python3
"""
Update servers-index.json:
1. Add source (溯源) information - IMPROVED extraction
2. Convert categories to English
3. Add more servers from official sources
"""

import json
import re
from pathlib import Path
from typing import Dict, Tuple

BASE_PATH = Path(__file__).parent.parent
INDEX_FILE = BASE_PATH / "servers-index.json"

# Chinese to English category mapping
CATEGORY_MAP = {
    "🔤 语言模型 & AI 桥接": "ai-llm",
    "💻 开发工具": "development",
    "🔗 聚合与集成": "integration",
    "☁️ 云服务与 DevOps": "cloud-devops",
    "📊 数据与数据库": "database",
    "🌐 浏览器与网页": "browser-web",
    "🎨 艺术与设计": "art-design",
    "📝 文档与笔记": "document-notes",
    "🖥️ 终端与系统": "terminal-system",
    "🕐 日历与时间": "calendar-time",
    "🔒 安全与隐私": "security",
    "🌍 地图与地理": "map-geo",
    "🧠 记忆与 RAG": "memory-rag",
    "🏛️ 博物馆与文化": "culture",
    "📦 其他": "other",
    "🎬 视频与媒体": "video-media",
    "🎮 游戏与娱乐": "game",
    "📱 社交与通信": "social-communication",
    "💳 金融与加密货币": "finance-crypto",
    "🎵 音乐与音频": "music-audio",
    "📚 学习与研究": "learning-research",
    "🌤️ 天气与自然": "weather-nature",
    "🧬 生物与医疗": "bio-medical",
}

# Official MCP servers with source info
OFFICIAL_SERVERS = [
    {
        "name": "filesystem",
        "source": "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem",
        "source_type": "official",
        "categories": ["terminal-system", "development"],
        "description": "Official MCP server for filesystem operations - read, write, list directories",
        "language": "nodejs",
        "npm_package": "@modelcontextprotocol/server-filesystem",
    },
    {
        "name": "github",
        "source": "https://github.com/modelcontextprotocol/servers/tree/main/src/github",
        "source_type": "official",
        "categories": ["development", "integration"],
        "description": "Official MCP server for GitHub API - repos, issues, PRs, search",
        "language": "nodejs",
        "npm_package": "@modelcontextprotocol/server-github",
    },
    {
        "name": "brave-search",
        "source": "https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search",
        "source_type": "official",
        "categories": ["ai-llm", "integration"],
        "description": "Official MCP server for Brave Search API",
        "language": "nodejs",
        "npm_package": "@modelcontextprotocol/server-brave-search",
    },
    {
        "name": "puppeteer",
        "source": "https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer",
        "source_type": "official",
        "categories": ["browser-web", "development"],
        "description": "Official MCP server for Puppeteer browser automation",
        "language": "nodejs",
        "npm_package": "@modelcontextprotocol/server-puppeteer",
    },
    {
        "name": "sqlite",
        "source": "https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite",
        "source_type": "official",
        "categories": ["database"],
        "description": "Official MCP server for SQLite database operations",
        "language": "nodejs",
        "npm_package": "@modelcontextprotocol/server-sqlite",
    },
    {
        "name": "memory",
        "source": "https://github.com/modelcontextprotocol/servers/tree/main/src/memory",
        "source_type": "official",
        "categories": ["memory-rag", "ai-llm"],
        "description": "Official MCP server for persistent memory storage",
        "language": "nodejs",
        "npm_package": "@modelcontextprotocol/server-memory",
    },
    {
        "name": "sequential-thinking",
        "source": "https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking",
        "source_type": "official",
        "categories": ["ai-llm"],
        "description": "Official MCP server for sequential thinking / chain of thought",
        "language": "nodejs",
        "npm_package": "@modelcontextprotocol/server-sequential-thinking",
    },
    {
        "name": "slack",
        "source": "https://github.com/modelcontextprotocol/servers/tree/main/src/slack",
        "source_type": "official",
        "categories": ["social-communication"],
        "description": "Official MCP server for Slack API",
        "language": "nodejs",
        "npm_package": "@modelcontextprotocol/server-slack",
    },
    {
        "name": "google-maps",
        "source": "https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps",
        "source_type": "official",
        "categories": ["map-geo"],
        "description": "Official MCP server for Google Maps API",
        "language": "nodejs",
        "npm_package": "@modelcontextprotocol/server-google-maps",
    },
    {
        "name": "postgres",
        "source": "https://github.com/modelcontextprotocol/servers/tree/main/src/postgres",
        "source_type": "official",
        "categories": ["database"],
        "description": "Official MCP server for PostgreSQL database",
        "language": "nodejs",
        "npm_package": "@modelcontextprotocol/server-postgres",
    },
]

# Community servers with source info
COMMUNITY_SERVERS = [
    {
        "name": "playwright",
        "source": "https://github.com/executeautomation/playwright-mcp-server",
        "source_type": "community",
        "categories": ["browser-web", "development"],
        "description": "Playwright browser automation MCP server",
        "language": "nodejs",
    },
    {
        "name": "notion",
        "source": "https://github.com/makenotion/notion-mcp-server",
        "source_type": "community",
        "categories": ["document-notes"],
        "description": "Notion API MCP server by MakeNotion",
        "language": "python",
    },
    {
        "name": "huggingface",
        "source": "https://github.com/huggingface/hf-mcp-server",
        "source_type": "community",
        "categories": ["ai-llm"],
        "description": "HuggingFace MCP server for AI models",
        "language": "python",
    },
    {
        "name": "tavily",
        "source": "https://github.com/tavily-ai/tavily-mcp",
        "source_type": "community",
        "categories": ["ai-llm", "integration"],
        "description": "Tavily AI search MCP server",
        "language": "python",
    },
    {
        "name": "exa-search",
        "source": "https://github.com/exa-labs/exa-mcp-server",
        "source_type": "community",
        "categories": ["ai-llm", "integration"],
        "description": "Exa semantic search MCP server",
        "language": "nodejs",
    },
    {
        "name": "docker",
        "source": "https://github.com/ioredis/mcp-server-docker",
        "source_type": "community",
        "categories": ["cloud-devops", "development"],
        "description": "Docker MCP server for container management",
        "language": "nodejs",
    },
    {
        "name": "obsidian",
        "source": "https://github.com/MarkusPfaffeneder/obsidian-mcp",
        "source_type": "community",
        "categories": ["document-notes"],
        "description": "Obsidian notes MCP server",
        "language": "python",
    },
    {
        "name": "discord",
        "source": "https://github.com/discord-mcp/discord-mcp-server",
        "source_type": "community",
        "categories": ["social-communication"],
        "description": "Discord MCP server",
        "language": "nodejs",
    },
    {
        "name": "telegram",
        "source": "https://github.com/sooperset/mcp-telegram",
        "source_type": "community",
        "categories": ["social-communication"],
        "description": "Telegram MCP server",
        "language": "python",
    },
    {
        "name": "linear",
        "source": "https://github.com/jsoares/linear-mcp-server",
        "source_type": "community",
        "categories": ["development", "document-notes"],
        "description": "Linear project management MCP server",
        "language": "nodejs",
    },
]

# Known npm package to GitHub repo mappings
NPM_TO_GITHUB: Dict[str, str] = {
    "@modelcontextprotocol/server-filesystem": "modelcontextprotocol/servers",
    "@modelcontextprotocol/server-github": "modelcontextprotocol/servers",
    "@modelcontextprotocol/server-brave-search": "modelcontextprotocol/servers",
    "@modelcontextprotocol/server-puppeteer": "modelcontextprotocol/servers",
    "@modelcontextprotocol/server-sqlite": "modelcontextprotocol/servers",
    "@modelcontextprotocol/server-memory": "modelcontextprotocol/servers",
    "@modelcontextprotocol/server-sequential-thinking": "modelcontextprotocol/servers",
    "@modelcontextprotocol/server-slack": "modelcontextprotocol/servers",
    "@modelcontextprotocol/server-google-maps": "modelcontextprotocol/servers",
    "@modelcontextprotocol/server-postgres": "modelcontextprotocol/servers",
}


def convert_category(cat: str) -> str:
    """Convert Chinese category to English"""
    return CATEGORY_MAP.get(cat, cat)


def is_valid_github_repo_url(url: str) -> bool:
    """Check if URL is a valid GitHub repo URL (not badge, image, etc.)"""
    if not url:
        return False
    # Must start with https://github.com/
    if not url.startswith("https://github.com/"):
        return False
    # Skip common non-repo patterns
    invalid_patterns = [
        "/badge/",
        "/badges/",
        "/img/",
        "/images/",
        "/assets/",
        ".svg",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".ico",
        "shields.io",
        "img.shields.io",
        "badge.fury.io",
        "/releases/tag/",
        "/releases/download/",
        "/actions?",
        "/security",
        "/insights",
        "/projects",
        "#readme",
        "#issues",
        "#pulls",
    ]
    url_lower = url.lower()
    for pattern in invalid_patterns:
        if pattern in url_lower:
            return False
    # Must have owner/repo format: github.com/owner/repo
    parts = url.replace("https://github.com/", "").split("/")
    if len(parts) < 2:
        return False
    owner, repo = parts[0], parts[1]
    # Owner and repo should be valid GitHub names
    if not re.match(r"^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?$", owner):
        return False
    if not re.match(r"^[a-zA-Z0-9._-]+$", repo):
        return False
    return True


def clean_github_url(url: str) -> str:
    """Clean GitHub URL to standard format"""
    if not url:
        return ""
    # Remove trailing slashes, query params, fragments
    url = url.split("?")[0].split("#")[0].rstrip("/")
    # Remove /tree/... and /blob/... suffixes
    url = re.sub(r"/tree/.*$", "", url)
    url = re.sub(r"/blob/.*$", "", url)
    return url


def extract_source_from_description(desc: str, name: str = "") -> Tuple[str, str]:
    """
    Extract GitHub source from description with improved logic.
    Returns (url, source_type)
    """
    if not desc:
        return "", "unknown"

    # Pattern 1: Direct GitHub repo link in markdown [text](url)
    markdown_pattern = r"\[([^\]]+)\]\((https://github\.com/[^/]+/[^/)\s]+)"
    matches = re.findall(markdown_pattern, desc)
    for _, url in matches:
        url = clean_github_url(url)
        if is_valid_github_repo_url(url):
            return url, "extracted"

    # Pattern 2: Bare GitHub URL
    bare_pattern = r"https://github\.com/[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+"
    matches = re.findall(bare_pattern, desc)
    for url in matches:
        url = clean_github_url(url)
        if is_valid_github_repo_url(url):
            return url, "extracted"

    # Pattern 3: github.com/owner/repo without https
    short_pattern = r"github\.com/([a-zA-Z0-9._-]+)/([a-zA-Z0-9._-]+)"
    matches = re.findall(short_pattern, desc)
    for owner, repo in matches:
        url = f"https://github.com/{owner}/{repo}"
        if is_valid_github_repo_url(url):
            return url, "extracted"

    return "", "unknown"


def infer_source_from_npm(npm_package: str) -> Tuple[str, str]:
    """Try to infer GitHub source from npm package name"""
    if npm_package in NPM_TO_GITHUB:
        return f"https://github.com/{NPM_TO_GITHUB[npm_package]}", "inferred"
    # For @scope/package format
    if npm_package.startswith("@"):
        parts = npm_package[1:].split("/")
        if len(parts) == 2:
            scope, pkg = parts
            # Common scopes map to orgs
            if scope == "modelcontextprotocol":
                return "https://github.com/modelcontextprotocol/servers", "inferred"
    return "", "unknown"


def infer_source_from_name(name: str, description: str) -> Tuple[str, str]:
    """Try to infer source from server name and description"""
    name_lower = name.lower()

    # Common patterns
    patterns = [
        (r"\bgithub\b", "https://github.com/modelcontextprotocol/servers"),
        (r"\bfilesystem\b", "https://github.com/modelcontextprotocol/servers"),
        (r"\bsqlite\b", "https://github.com/modelcontextprotocol/servers"),
        (r"\bpostgres\b", "https://github.com/modelcontextprotocol/servers"),
        (r"\bmysql\b", "https://github.com/modelcontextprotocol/servers"),
        (r"\bpuppeteer\b", "https://github.com/modelcontextprotocol/servers"),
        (
            r"\bplaywright\b",
            "https://github.com/executeautomation/playwright-mcp-server",
        ),
        (r"\bnotion\b", "https://github.com/makenotion/notion-mcp-server"),
        (r"\bslack\b", "https://github.com/modelcontextprotocol/servers"),
        (r"\bbrave\b", "https://github.com/modelcontextprotocol/servers"),
        (r"\bmemory\b", "https://github.com/modelcontextprotocol/servers"),
    ]

    for pattern, url in patterns:
        if re.search(pattern, name_lower) or re.search(pattern, description.lower()):
            return url, "inferred"

    return "", "unknown"


def update_index():
    """Update servers-index.json with improved source extraction"""
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    servers = data.get("servers", [])
    updated_servers = []
    seen_names = set()

    source_stats = {
        "official": 0,
        "community": 0,
        "extracted": 0,
        "inferred": 0,
        "unknown": 0,
    }

    # Process existing servers
    for s in servers:
        name = s.get("name", "")
        if name in seen_names:
            continue
        seen_names.add(name)

        # Convert categories to English
        cats = s.get("categories", [])
        if cats and isinstance(cats[0], str) and any("\u4e00" <= c <= "\u9fff" for c in cats[0]):
            # Has Chinese characters, convert
            eng_cats = [convert_category(c) for c in cats]
            s["categories"] = eng_cats

        # Add/improve source
        desc = s.get("description", "")
        npm_pkg = s.get("npm_package", "")

        # Try multiple methods to find source
        source = s.get("source", "")
        source_type = s.get("source_type", "unknown")

        # Skip if already has good source
        if not source or source_type == "unknown":
            # Method 1: Extract from description
            extracted_url, extracted_type = extract_source_from_description(desc, name)
            if extracted_url:
                source = extracted_url
                source_type = extracted_type

            # Method 2: Infer from npm package
            elif npm_pkg:
                inferred_url, inferred_type = infer_source_from_npm(npm_pkg)
                if inferred_url:
                    source = inferred_url
                    source_type = inferred_type

            # Method 3: Infer from name patterns
            else:
                inferred_url, inferred_type = infer_source_from_name(name, desc)
                if inferred_url:
                    source = inferred_url
                    source_type = inferred_type

        # Clean and validate final source
        if source:
            source = clean_github_url(source)
            if not is_valid_github_repo_url(source):
                source = ""
                source_type = "unknown"

        s["source"] = source
        s["source_type"] = source_type
        source_stats[source_type] = source_stats.get(source_type, 0) + 1

        # Add language if missing
        if "language" not in s:
            s["language"] = s.get("detected_language", "unknown")

        updated_servers.append(s)

    # Add official servers
    for s in OFFICIAL_SERVERS:
        if s["name"] not in seen_names:
            seen_names.add(s["name"])
            updated_servers.append(s)
            source_stats["official"] += 1

    # Add community servers
    for s in COMMUNITY_SERVERS:
        if s["name"] not in seen_names:
            seen_names.add(s["name"])
            updated_servers.append(s)
            source_stats["community"] += 1

    # Update categories count
    cat_count = {}
    for s in updated_servers:
        for c in s.get("categories", []):
            cat_count[c] = cat_count.get(c, 0) + 1

    # Build output
    output = {
        "version": "2.0.0",
        "total_servers": len(updated_servers),
        "categories": dict(sorted(cat_count.items(), key=lambda x: -x[1])),
        "servers": updated_servers,
    }

    # Write back
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Updated {len(updated_servers)} servers")
    print(f"Categories: {len(cat_count)}")
    print("\nSource distribution:")
    for stype, count in sorted(source_stats.items(), key=lambda x: -x[1]):
        pct = count / len(updated_servers) * 100
        print(f"  {stype}: {count} ({pct:.1f}%)")
    for c, n in sorted(cat_count.items(), key=lambda x: -x[1])[:10]:
        print(f"  {c}: {n}")


if __name__ == "__main__":
    update_index()
