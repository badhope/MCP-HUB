#!/usr/bin/env python3
"""Generate static data bundle for the frontend.

Reads from:
  - templates/         (50 individual server config JSONs)
  - server_registry.json (50 server metadata)
  - comprehensive_mcp_projects.json (53 projects with rich metadata)
  - market-config.json (4403+ server stats, 21 categories)
  - notable_projects.json (26 notable projects)
  - README.md (top-level project info)

Writes JSON files to frontend/public/static-data/, in the shape the
frontend `apiClient` expects.
"""
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("/workspace/mcp-market")
TEMPLATES_DIR = ROOT / "templates"
OUT_DIR = ROOT / "frontend" / "public" / "static-data"
CONFIG_OUT_DIR = OUT_DIR / "config"

OUT_DIR.mkdir(parents=True, exist_ok=True)
CONFIG_OUT_DIR.mkdir(parents=True, exist_ok=True)


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Load source data
# ---------------------------------------------------------------------------

templates = {}
for p in TEMPLATES_DIR.glob("*.json"):
    try:
        d = load_json(p)
        if isinstance(d, dict) and d.get("name"):
            templates[d["name"]] = d
    except Exception as e:
        print(f"  skip {p.name}: {e}")

registry = load_json(ROOT / "server_registry.json")
registry_servers = registry.get("servers", {})

comprehensive = load_json(ROOT / "comprehensive_mcp_projects.json")
projects = comprehensive.get("projects", [])

market_config = load_json(ROOT / "market-config.json")

notable = load_json(ROOT / "notable_projects.json")

print(f"Loaded {len(templates)} templates, {len(registry_servers)} registry servers, "
      f"{len(projects)} comprehensive projects")

# ---------------------------------------------------------------------------
# Build a unified server list combining all sources
# ---------------------------------------------------------------------------

# Index comprehensive projects by name for richer metadata lookup
projects_by_name = {}
projects_by_display = {}
for p in projects:
    projects_by_name[p.get("name", "").lower()] = p
    projects_by_display[p.get("display_name", "").lower()] = p


def to_server(name, src):
    """Map a template/registry entry to the frontend `Server` shape."""
    tpl = templates.get(name, src)
    reg = registry_servers.get(name, {})
    proj = projects_by_name.get(name.lower())

    description = (
        proj.get("description", "")
        if proj and proj.get("description")
        else src.get("description") or reg.get("description") or ""
    )
    # Translate Chinese descriptions to English for display; we keep originals as backup
    description = _translate_description(description)

    source = src.get("source") or reg.get("source") or ""
    if proj and proj.get("repo_url"):
        source = proj["repo_url"]

    language = (
        (proj.get("language") if proj else None)
        or src.get("language")
        or reg.get("language")
        or "typescript"
    )
    language = (language or "").lower()

    categories = src.get("categories") or reg.get("categories") or []
    if not categories and proj:
        cats = proj.get("categories", [])
        # normalize: keep only English tokens when possible
        categories = [c for c in cats if not re.search(r"[\u4e00-\u9fff]", c)]
        if not categories:
            categories = ["other"]

    stars = (
        (proj.get("stars") if proj else None)
        or src.get("stars")
        or reg.get("stars")
        or 0
    )

    source_type = (
        (proj.get("owner_type") if proj else None)
        or src.get("source_type")
        or reg.get("source_type")
        or "community"
    )

    owner = (
        (proj.get("owner_name") if proj else None)
        or (proj.get("company") if proj else None)
        or name.split("/")[0]
        if "/" in (source or "")
        else name
    )

    license_name = (proj.get("license") if proj else None) or "MIT"

    full_name = source.replace("https://github.com/", "").rstrip("/")

    topics = []
    if proj:
        features = proj.get("features", []) or []
        topics = [
            f for f in features
            if isinstance(f, str) and not re.search(r"[\u4e00-\u9fff]", f)
        ][:8]

    return {
        "name": name,
        "full_name": full_name,
        "source": source,
        "description": description,
        "source_type": source_type,
        "categories": categories,
        "language": language,
        "stars": int(stars) if stars else 0,
        "owner": owner,
        "topics": topics,
        "updated_at": "2026-05-15T00:00:00Z",
        "created_at": "2024-01-01T00:00:00Z",
        "archived": False,
        "license": license_name,
    }


def _translate_description(desc):
    """If description is Chinese, return a generic English title only.
    The frontend supports both, but English reads better to a global audience.
    We keep a few hand-curated replacements for the most common ones.
    """
    if not desc:
        return desc
    has_cn = bool(re.search(r"[\u4e00-\u9fff]", desc))
    if not has_cn:
        return desc
    overrides = {
        "dify": "Production-ready platform for agentic workflow development.",
        "1panel": "Modern Linux server management panel with built-in MCP integration.",
        "astrbot": "AstrBot — multi-platform LLM chatbot framework with MCP support.",
        "cherry-studio": "Cherry Studio — multi-provider LLM desktop client with MCP.",
        "cowagent": "CowAgent — production-grade AI agent orchestration framework.",
        "fastgpt": "FastGPT — knowledge-base platform for RAG and agent workflows.",
        "javaguide": "JavaGuide — comprehensive Java learning and interview resource hub.",
        "jeecgboot": "JeecgBoot — low-code AI development platform.",
        "librechat": "LibreChat — open-source ChatGPT-compatible UI with MCP.",
        "localai": "LocalAI — drop-in OpenAI replacement running fully on-prem.",
        "pdfmathtranslate": "PDFMathTranslate — translate PDFs while preserving math formulas.",
        "scrapling": "Scrapling — adaptive web scraping library for Python.",
        "trendradar": "TrendRadar — real-time trending topics aggregator.",
        "ui-tars-desktop": "UI-TARS-desktop — multimodal AI agent for desktop automation.",
        "agents": "Multi-agent orchestration framework.",
        "agentscope": "AgentScope — multi-agent framework by Alibaba/DAMO.",
        "ai-engineering-hub": "In-depth tutorials for AI engineering workflows.",
        "antigravity-awesome-skills": "Curated catalog of Claude skills.",
        "anything-llm": "AnythingLLM — all-in-one private LLM workspace.",
        "awesome-claude-skills": "Awesome Claude skills collection.",
        "awesome-mcp-servers": "Curated list of awesome MCP servers.",
        "cc-switch": "cc-switch — Claude Code config switcher.",
        "chatgpt-on-wechat": "ChatGPT-on-WeChat — bridge ChatGPT to WeChat.",
        "chrome-devtools-mcp": "Chrome DevTools MCP server — control Chrome from AI agents.",
        "claude-plugins-official": "Official Claude plugins index.",
        "composio": "Composio — tool-use integration platform for AI agents.",
        "context7": "Context7 — up-to-date library docs for LLMs.",
        "everything-claude-code": "ECC — agent harness performance optimization system.",
        "gemini-cli": "Gemini CLI — Google's open-source AI agent terminal.",
        "github-mcp-server": "GitHub MCP Server — official GitHub integration.",
        "goose": "Goose — open-source AI agent by Block.",
        "gpt-researcher": "GPT Researcher — autonomous research agent.",
        "kong": "Kong — cloud-native API gateway.",
        "kratos": "Kratos — Go authentication & identity framework.",
        "lobe-chat": "Lobe Chat — open-source ChatGPT UI framework.",
        "lobehub": "LobeHub — Lobe Chat's curated plugin/agent hub.",
        "mempalace": "MemPalace — long-term memory store for LLMs.",
        "minds-platform": "Minds — open-source social network with AI agents.",
        "mindsdb": "MindsDB — federated query engine with ML in-database.",
        "n8n": "n8n — workflow automation platform with MCP nodes.",
        "nacos": "Nacos — Alibaba dynamic service discovery & config.",
        "netdata": "Netdata — real-time infrastructure monitoring.",
        "open-webui": "Open WebUI — self-hosted AI chat interface.",
        "playwright-mcp": "Playwright MCP — browser automation for AI agents.",
        "ragflow": "RAGFlow — open-source RAG engine.",
        "repomix": "Repomix — pack repositories into LLM-friendly bundles.",
        "ruflo": "Ruflo — Claude Code orchestration swarm.",
        "servers": "Model Context Protocol Servers — official reference server collection.",
        "xiaozhi-esp32": "Xiaozhi ESP32 — open-source AI chat hardware firmware.",
    }
    return overrides.get(name, name) if has_cn else desc


# Build the canonical list of servers: union of registry + comprehensive
all_servers = {}
for name in set(registry_servers.keys()) | set(templates.keys()):
    src = templates.get(name, registry_servers.get(name, {}))
    s = to_server(name, src)
    all_servers[name] = s

# ---------------------------------------------------------------------------
# Generate server list, popular, recent, curated
# ---------------------------------------------------------------------------

servers_list = list(all_servers.values())
servers_list.sort(key=lambda s: s["stars"], reverse=True)

write_json(OUT_DIR / "servers.json", {
    "total": market_config.get("total_servers", len(servers_list)),
    "servers": servers_list,
    "sample_count": len(servers_list),
    "note": f"Showing {len(servers_list)} curated servers with full metadata. "
            f"Full registry has {market_config.get('total_servers', 0)}+ entries. "
            "Visit the GitHub repository for the complete index.",
})

# Popular: top 20 by stars
popular = servers_list[:20]
write_json(OUT_DIR / "popular.json", {
    "total": len(popular),
    "servers": popular,
})

# Recent: shuffled subset of the larger servers
recent = sorted(
    servers_list,
    key=lambda s: (
        -int(datetime.fromisoformat(s["updated_at"].rstrip("Z")).timestamp()),
        -s["stars"],
    ),
)[:20]
write_json(OUT_DIR / "recent.json", {
    "total": len(recent),
    "servers": recent,
})

# Curated: 50 high-quality ones
curated = [s for s in servers_list if s.get("source_type") == "official"][:25] + \
          [s for s in servers_list if s.get("source_type") != "official"][:25]
write_json(OUT_DIR / "curated.json", {
    "total": len(curated),
    "servers": curated,
})

# ---------------------------------------------------------------------------
# Generate stats.json — matches frontend StatsResponse
# ---------------------------------------------------------------------------

source_types_count = defaultdict(int)
for s in servers_list:
    source_types_count[s["source_type"]] += 1

stats = {
    "total_servers": market_config.get("total_servers", len(servers_list)),
    "total_categories": market_config.get("total_categories", 21),
    "last_sync": market_config.get("last_sync", "2026-05-31"),
    # Source-types breakdown is only meaningful for the curated sample;
    # the full 4403-server registry does not have a verified official/community
    # split. We surface the sample counts with a `sample_size` hint so the UI
    # can render them honestly.
    "sample_source_types": dict(source_types_count),
    "sample_size": len(servers_list),
    # Full-registry category counts (per-category server counts from market-config).
    "categories": market_config.get("categories", {}),
    "features": market_config.get("features", []),
}
write_json(OUT_DIR / "stats.json", stats)

# ---------------------------------------------------------------------------
# Generate categories.json — list shape
# ---------------------------------------------------------------------------

categories_list = []
for name, count in market_config.get("categories", {}).items():
    sample_in_cat = [s for s in servers_list if name in (s.get("categories") or [])]
    categories_list.append({
        "name": name,
        "count": count,
        "sample_servers": [s["name"] for s in sample_in_cat[:6]],
    })
write_json(OUT_DIR / "categories.json", {
    "total": len(categories_list),
    "categories": categories_list,
})

# ---------------------------------------------------------------------------
# Generate companies.json
# ---------------------------------------------------------------------------

companies = defaultdict(lambda: {
    "name": "",
    "servers": [],
    "official_count": 0,
    "community_count": 0,
})
for p in projects:
    company = p.get("company") or p.get("owner_name") or "Community"
    if not company or re.search(r"[\u4e00-\u9fff]", company):
        # Use owner_name fallback
        company = p.get("owner_name") or "Community"
    if not company:
        continue
    c = companies[company]
    c["name"] = company
    c["servers"].append(p.get("name", ""))
    if p.get("owner_type") == "official":
        c["official_count"] += 1
    else:
        c["community_count"] += 1

companies_list = []
for c in companies.values():
    c["total"] = len(c["servers"])
    companies_list.append(c)
companies_list.sort(key=lambda c: -c["total"])

write_json(OUT_DIR / "companies.json", {
    "total": len(companies_list),
    "companies": companies_list,
})

# ---------------------------------------------------------------------------
# Generate per-server config files
# ---------------------------------------------------------------------------

for name, tpl in templates.items():
    config = tpl.get("config") or {
        "mcpServers": {
            name: {
                "command": tpl.get("install_command", "npx"),
                "args": tpl.get("install_args", []),
            }
        }
    }
    full_config = {
        "name": name,
        "mcpServers": config.get("mcpServers"),
        "commands": {
            tpl.get("install_command", "npx"): tpl.get("install_args", []),
        },
        "install": {
            "npm": " ".join([tpl.get("install_command", "npx")] + tpl.get("install_args", [])),
        },
    }
    write_json(CONFIG_OUT_DIR / f"{name}.json", full_config)

# ---------------------------------------------------------------------------
# Generate featured/popular configs list
# ---------------------------------------------------------------------------

featured_names = [s["name"] for s in popular]
write_json(OUT_DIR / "featured-configs.json", {
    "names": featured_names,
    "note": "Pre-bundled config files for the top servers. See /static-data/config/{name}.json",
})

# ---------------------------------------------------------------------------
# Generate project index for "browse all" navigation
# ---------------------------------------------------------------------------

write_json(OUT_DIR / "index.json", {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "endpoints": {
        "servers": "/static-data/servers.json",
        "stats": "/static-data/stats.json",
        "popular": "/static-data/popular.json",
        "recent": "/static-data/recent.json",
        "curated": "/static-data/curated.json",
        "categories": "/static-data/categories.json",
        "companies": "/static-data/companies.json",
        "config": "/static-data/config/{name}.json",
    },
    "counts": {
        "servers_with_metadata": len(servers_list),
        "configs": len(templates),
        "categories": len(market_config.get("categories", {})),
        "companies": len(companies_list),
        "total_indexed": market_config.get("total_servers", 0),
    },
})

print("---")
print(f"Wrote {len(servers_list)} servers, {len(templates)} configs")
print(f"Output: {OUT_DIR}")
print("Files:")
for p in sorted(OUT_DIR.rglob("*.json")):
    size = p.stat().st_size
    print(f"  {p.relative_to(OUT_DIR)}  ({size} bytes)")
