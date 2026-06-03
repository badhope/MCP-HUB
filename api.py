#!/usr/bin/env python3
"""
MCP Hub REST API
Pure JSON API for AI agents to query MCP servers (no Python dependency required for callers)

Usage:
    python api.py                    # Start server on port 8080
    python api.py --port 3000        # Start on custom port

Endpoints:
    GET /                        API info
    GET /servers                 List all servers (JSON)
    GET /servers?search=xxx      Search servers
    GET /servers?category=xxx    Filter by category
    GET /servers?sort=stars      Sort by stars/updated/relevance
    GET /servers?min-stars=100   Filter by minimum stars
    GET /servers/{name}          Get server details
    GET /categories              List all categories
    GET /recommend?scene=xxx     Recommend servers for a scene
    GET /config/{name}           Generate config for a server
    GET /stats                   Get statistics
    GET /popular                 List popular servers
    GET /recent                  List recently updated servers
    GET /curated                 List curated servers
    GET /curated/{category}      List curated servers by category
    GET /companies               List domestic companies
    GET /companies/{company}     Get company details
    GET /quality/{name}          Get server quality score

Examples (curl):
    curl http://localhost:8080/servers
    curl "http://localhost:8080/servers?search=github"
    curl "http://localhost:8080/servers?sort=stars&min-stars=1000"
    curl "http://localhost:8080/recommend?scene=browser"
    curl http://localhost:8080/config/puppeteer
    curl http://localhost:8080/popular
"""

import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from services import (
    filter_by_category,
    generate_config,
    get_categories,
    get_curated_servers,
    get_curated_servers_details,
    get_domestic_companies,
    get_quality_level,
    get_quality_level_description,
    get_quality_score_for_server,
    get_server_by_name,
    get_servers,
    get_stats,
    list_popular,
    list_recent,
    recommend_by_scene,
    search_servers,
)


class MCPHubAPI(BaseHTTPRequestHandler):
    """HTTP request handler for MCP Hub API"""

    def _cors_headers(self):
        """Set CORS headers for cross-origin requests - PRODUCTION READY"""
        import os
        allowed_origins = os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
        origin = self.headers.get("Origin")
        
        if origin in allowed_origins:
            self.send_header("Access-Control-Allow-Origin", origin)
        elif os.environ.get("CORS_ALLOW_ALL", "false").lower() == "true":
            # Only for DEV environment, never use in production!
            self.send_header("Access-Control-Allow-Origin", "*")
        
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Vary", "Origin")

    def _json_response(self, data: Any, status: int = 200):
        """Send JSON response"""
        body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def _error_response(self, message: str, status: int = 404):
        """Send error response"""
        self._json_response({"error": message}, status)

    def do_GET(self):
        """Handle GET requests"""
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        query = parse_qs(parsed.query)

        servers = get_servers()

        # Root
        if path == "" or path == "/":
            index = __import__("services").load_index()
            self._json_response(
                {
                    "name": "MCP Hub API",
                    "version": index.get("version", "2.0.0"),
                    "total_servers": len(servers),
                    "last_sync": index.get("last_sync", ""),
                    "endpoints": [
                        "GET /servers - List all servers",
                        "GET /servers?search=xxx - Search servers",
                        "GET /servers?category=xxx - Filter by category",
                        "GET /servers?sort=stars|updated|relevance - Sort",
                        "GET /servers?min-stars=N - Filter by min stars",
                        "GET /servers/{name} - Get server details",
                        "GET /categories - List categories",
                        "GET /recommend?scene=xxx - Recommend servers",
                        "GET /config/{name} - Generate config",
                        "GET /stats - Statistics",
                        "GET /popular - Popular servers (by stars)",
                        "GET /recent - Recently updated servers",
                    ],
                }
            )

        # List servers
        elif path == "/servers":
            result = servers

            # Search
            if "search" in query:
                result = search_servers(query["search"][0], result)

            # Filter by category
            if "category" in query:
                result = filter_by_category(query["category"][0], result)

            # Filter by min-stars
            if "min-stars" in query:
                try:
                    min_stars = int(query["min-stars"][0])
                    result = [s for s in result if s.get("stars", 0) >= min_stars]
                except (ValueError, IndexError):
                    pass

            # Sort
            sort_by = query.get("sort", ["relevance"])[0]
            if sort_by == "stars":
                result = sorted(result, key=lambda s: s.get("stars", 0), reverse=True)
            elif sort_by == "updated":
                result = sorted(
                    result, key=lambda s: s.get("updated_at", ""), reverse=True
                )

            # Limit results (with input validation)
            try:
                limit = int(query.get("limit", [100])[0])
                limit = max(1, min(limit, 1000))  # clamp between 1 and 1000
            except (ValueError, IndexError):
                limit = 100
            self._json_response({"total": len(result), "servers": result[:limit]})

        # Get single server (must be after /servers list but before /popular etc.)
        elif path.startswith("/servers/"):
            name = unquote(path[9:])
            # Avoid route conflict with /popular and /recent
            if name in ("popular", "recent"):
                self._error_response(f"Use /{name} endpoint instead", 400)
                return
            server = get_server_by_name(name)
            if server:
                self._json_response(server)
            else:
                self._error_response(f"Server '{name}' not found")

        # Categories
        elif path == "/categories":
            self._json_response(get_categories())

        # Recommend
        elif path == "/recommend":
            if "scene" not in query:
                self._error_response("Missing 'scene' parameter", 400)
                return
            result = recommend_by_scene(query["scene"][0])
            self._json_response(
                {"scene": query["scene"][0], "recommendations": result}
            )

        # Config
        elif path.startswith("/config/"):
            name = unquote(path[8:])
            config = generate_config(name)
            self._json_response(config)

        # Stats
        elif path == "/stats":
            self._json_response(get_stats())

        # Popular
        elif path == "/popular":
            try:
                limit = int(query.get("limit", [10])[0])
                limit = max(1, min(limit, 100))
            except (ValueError, IndexError):
                limit = 10
            self._json_response({"popular": list_popular(limit)})

        # Recent
        elif path == "/recent":
            try:
                limit = int(query.get("limit", [10])[0])
                limit = max(1, min(limit, 100))
            except (ValueError, IndexError):
                limit = 10
            self._json_response({"recent": list_recent(limit)})

        # Curated servers list
        elif path == "/curated":
            self._json_response(get_curated_servers())

        # Curated servers by category
        elif path.startswith("/curated/"):
            category = unquote(path[9:])
            curated_details = get_curated_servers_details()
            if category in curated_details:
                self._json_response({
                    "category": category,
                    "servers": curated_details[category]
                })
            else:
                self._error_response(f"Category '{category}' not found")

        # Domestic companies list
        elif path == "/companies":
            companies = get_domestic_companies()
            # Format as list for cleaner API response
            companies_list = [
                {
                    "name": name,
                    "project_count": len(servers),
                    "total_stars": sum(s.get("stars", 0) for s in servers),
                    "official_count": sum(1 for s in servers if s.get("source_type") == "official"),
                    "servers": servers[:10]  # Return top 10 for each company
                }
                for name, servers in companies.items() if servers
            ]
            self._json_response({"companies": companies_list})

        # Single company details
        elif path.startswith("/companies/"):
            company_name = unquote(path[11:])
            companies = get_domestic_companies()
            if company_name in companies:
                servers = companies[company_name]
                self._json_response({
                    "name": company_name,
                    "project_count": len(servers),
                    "total_stars": sum(s.get("stars", 0) for s in servers),
                    "official_count": sum(1 for s in servers if s.get("source_type") == "official"),
                    "servers": servers
                })
            else:
                self._error_response(f"Company '{company_name}' not found")

        # Server completeness score (功能完整性评分)
        elif path.startswith("/quality/"):
            name = unquote(path[9:])
            server = get_server_by_name(name)
            if server:
                # 计算完整性评分
                score = get_quality_score_for_server(server)
                level = get_quality_level(score)
                
                # 收集详细信息
                details = {
                    "stars": server.get("stars", 0),
                    "source_type": server.get("source_type", "unknown"),
                    "categories": server.get("categories", []),
                    "topics": server.get("topics", []),
                    "archived": server.get("archived", False),
                    "owner": server.get("owner", ""),
                    "language": server.get("language", ""),
                    "npm_package": server.get("npm_package", ""),
                    "license": server.get("license", ""),
                    "description_length": len(server.get("description", "")),
                    "updated_at": server.get("updated_at", ""),
                }
                
                self._json_response({
                    "server": name,
                    "completeness_score": score,
                    "level": level,
                    "description": f"{level}级 - {get_quality_level_description(score)}",
                    "dimensions": {
                        "functionality": "功能完整性",
                        "documentation": "文档完整性",
                        "maintenance": "维护活跃度",
                        "community": "社区支持"
                    },
                    "details": details
                })
            else:
                self._error_response(f"Server '{name}' not found")

        # Unknown
        else:
            self._error_response(f"Unknown endpoint: {path}")

    def log_message(self, format_str, *args):
        """Custom log format"""
        print(f"[API] {format_str % args}")


def main():
    port = 8080
    if "--port" in sys.argv:
        idx = sys.argv.index("--port")
        if idx + 1 < len(sys.argv):
            port = int(sys.argv[idx + 1])

    index = __import__("services").load_index()
    version = index.get("version", "2.0.0")
    total = index.get("total_servers", 0)
    last_sync = index.get("last_sync", "")

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║              MCP Hub REST API v{version:<28}║
║              Pure JSON API for AI Agents                     ║
╚══════════════════════════════════════════════════════════════╝

Server running at: http://localhost:{port}
Total servers: {total} | Last sync: {last_sync}

Endpoints:
  GET /                        API info
  GET /servers                 List all servers
  GET /servers?search=xxx      Search servers
  GET /servers?category=xxx    Filter by category
  GET /servers?sort=stars      Sort by stars/updated/relevance
  GET /servers?min-stars=N     Filter by min stars
  GET /servers/{{name}}        Get server details
  GET /categories              List categories
  GET /recommend?scene=xxx     Recommend servers
  GET /config/{{name}}         Generate config
  GET /stats                   Statistics
  GET /popular                 Popular servers
  GET /recent                  Recently updated
  GET /curated                 Curated servers
  GET /curated/{{category}}    Curated by category
  GET /companies               Domestic companies
  GET /companies/{{company}}   Company details
  GET /quality/{{name}}        Server quality score

Examples:
  curl http://localhost:{port}/servers
  curl "http://localhost:{port}/servers?search=github&sort=stars"
  curl "http://localhost:{port}/servers?min-stars=1000"
  curl "http://localhost:{port}/recommend?scene=browser"
  curl http://localhost:{port}/popular

Press Ctrl+C to stop.
""")

    server = HTTPServer(("", port), MCPHubAPI)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[API] Server stopped.")
        server.shutdown()


if __name__ == "__main__":
    main()
