"""
MCP Hub FastAPI Backend - Production Ready
Modern, high-performance async API server with type safety and security features.
"""
import os
import json
import threading
import time
import uvicorn
from contextlib import asynccontextmanager
from typing import Any, List, Dict, Optional
from fastapi import FastAPI, Query, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from pathlib import Path
from pydantic import BaseModel, Field

try:
    from core._version import __version__ as APP_VERSION
except ImportError:
    APP_VERSION = "2.0.1"

# ------------------------------
# Pydantic Models for Type Safety
# ------------------------------
class Server(BaseModel):
    name: str
    full_name: str
    source: str
    description: str
    source_type: str
    categories: List[str]
    language: str
    stars: int
    owner: str
    topics: List[str]
    updated_at: str
    created_at: str
    archived: bool
    license: Optional[str] = None


class StatsResponse(BaseModel):
    total_servers: int = Field(..., description="Total number of servers in index")
    total_categories: int = Field(..., description="Number of unique categories")
    last_sync: str = Field(..., description="ISO 8601 timestamp of last sync")
    source_types: Dict[str, int] = Field(default_factory=dict, description="Count by source type")
    categories: Dict[str, int] = Field(default_factory=dict, description="Count by category")


class ServerListResponse(BaseModel):
    total: int = Field(..., description="Total number of servers matching criteria")
    servers: List[Server] = Field(default_factory=list, description="List of server objects")


class ServerConfig(BaseModel):
    name: str
    mcpServers: Optional[Dict[str, Any]] = None
    commands: Optional[Dict[str, List[str]]] = None
    docker: Optional[Dict[str, Any]] = None
    snippets: Optional[Dict[str, str]] = None
    install: Optional[Dict[str, str]] = None


# ------------------------------
# User Function Models
# ------------------------------
class FavoriteRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    server_name: str = Field(..., description="Server name")


class RatingRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    server_name: str = Field(..., description="Server name")
    rating: int = Field(..., ge=1, le=5, description="Rating 1-5")
    comment: Optional[str] = Field(None, description="Optional comment")


class CommentRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    server_name: str = Field(..., description="Server name")
    text: str = Field(..., description="Comment text")


class SubmissionRequest(BaseModel):
    user_id: str = Field(..., description="User ID")
    name: str = Field(..., description="Server name")
    source: str = Field(..., description="Source URL")
    description: str = Field(..., description="Description")
    categories: Optional[List[str]] = Field(default_factory=list, description="Categories")
    npm_package: Optional[str] = Field(None, description="NPM package name")


class ReviewRequest(BaseModel):
    submission_id: str = Field(..., description="Submission ID")
    status: str = Field(..., pattern="^(approved|rejected)$", description="Review status")
    reviewer: str = Field(..., description="Reviewer ID/name")
    comment: Optional[str] = Field(None, description="Review comment")


# ------------------------------
# Data & Lifespan Management
# ------------------------------
DATA_FILE = Path(__file__).parent / "servers-index.json"
DATA_REFRESH_INTERVAL = int(os.environ.get("DATA_REFRESH_INTERVAL", "60"))


def _load_data_from_disk() -> Dict[str, Any]:
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _data_refresh_thread(app_state: Any, stop_event: threading.Event):
    last_mtime: float = 0
    while not stop_event.is_set():
        try:
            if DATA_FILE.exists():
                current_mtime = DATA_FILE.stat().st_mtime
                if current_mtime > last_mtime:
                    new_data = _load_data_from_disk()
                    # Mutate in place: replacing the dict under a hot read path
                    # can race with concurrent request handlers iterating it.
                    existing = app_state.data
                    existing.clear()
                    existing.update(new_data)
                    last_mtime = current_mtime
        except Exception as e:
            # Swallow + log so a transient load error doesn't kill the daemon.
            # The next interval will retry. Don't crash the watcher.
            import logging
            logging.getLogger("mcp_hub.refresh").warning(
                "data refresh skipped: %s", e
            )
        stop_event.wait(DATA_REFRESH_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.data = _load_data_from_disk()

    stop_event = threading.Event()
    refresh_thread = threading.Thread(
        target=_data_refresh_thread,
        args=(app.state, stop_event),
        daemon=True,
    )
    refresh_thread.start()

    yield

    stop_event.set()
    refresh_thread.join(timeout=5)


def get_app_data(request: Request) -> Dict[str, Any]:
    return request.app.state.data


# ------------------------------
# Initialize FastAPI
# ------------------------------
app = FastAPI(
    title="MCP Hub API",
    description="API for exploring Model Context Protocol (MCP) servers",
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ------------------------------
# CORS Middleware - Secure by Default
# ------------------------------
allowed_origins = os.environ.get(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# ------------------------------
# GZip Middleware - compress responses >= 1KB
# ------------------------------
# The catalog endpoints (servers.json ~100KB+, stats, categories) compress
# to <15KB on the wire. Static /health and /docs responses are skipped
# automatically by FastAPI's GZipMiddleware (responses smaller than
# ``minimum_size`` are left untouched).
app.add_middleware(GZipMiddleware, minimum_size=1024)


# ------------------------------
# Rate Limiting Middleware (in-memory token bucket per client IP)
# ------------------------------
# Lightweight, dependency-free protection against accidental abuse and
# noisy scrapers. Tunable via environment variables:
#   RATE_LIMIT_REQUESTS  - max requests per window per IP (default 120)
#   RATE_LIMIT_WINDOW    - window length in seconds (default 60)
#   RATE_LIMIT_DISABLED  - set to "1" to bypass the limiter (for tests)
#
# This is an in-process limiter intended for single-instance deployments.
# For horizontally scaled deployments put a reverse proxy / API gateway
# in front (nginx limit_req, Cloudflare, etc.) instead.
class _InMemoryTokenBucket:
    """Thread-safe per-key token bucket."""

    def __init__(self, capacity: int, refill_window: float) -> None:
        self.capacity = capacity
        self.refill_window = refill_window
        self._buckets: Dict[str, Dict[str, float]] = {}
        self._lock = threading.Lock()

    def take(self, key: str, cost: int = 1) -> bool:
        now = time.monotonic()
        with self._lock:
            bucket = self._buckets.get(key)
            if bucket is None:
                bucket = {"tokens": float(self.capacity), "updated": now}
                self._buckets[key] = bucket
            elapsed = now - bucket["updated"]
            # Refill at a linear rate: capacity tokens per refill_window.
            refill = (elapsed / self.refill_window) * self.capacity
            if refill > 0:
                bucket["tokens"] = min(self.capacity, bucket["tokens"] + refill)
                bucket["updated"] = now
            if bucket["tokens"] >= cost:
                bucket["tokens"] -= cost
                return True
            return False

    def cleanup_expired(self) -> None:
        """Drop buckets that have not been touched for 2x the window."""
        now = time.monotonic()
        threshold = self.refill_window * 2
        with self._lock:
            stale = [k for k, v in self._buckets.items() if now - v["updated"] > threshold]
            for k in stale:
                del self._buckets[k]


_RATE_LIMIT_DISABLED = os.environ.get("RATE_LIMIT_DISABLED", "").lower() in {"1", "true", "yes"}
_RATE_LIMIT_REQUESTS = int(os.environ.get("RATE_LIMIT_REQUESTS", "120"))
_RATE_LIMIT_WINDOW = float(os.environ.get("RATE_LIMIT_WINDOW", "60"))
_bucket = _InMemoryTokenBucket(
    capacity=_RATE_LIMIT_REQUESTS,
    refill_window=_RATE_LIMIT_WINDOW,
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP token-bucket rate limiter.

    Exempts:
    - CORS preflight (OPTIONS) — they carry no payload
    - ``/health`` and ``/`` — used by orchestrators
    - ``/docs``, ``/redoc``, ``/openapi.json`` — interactive docs UI
    """

    EXEMPT_PATHS = {"/", "/health", "/docs", "/redoc", "/openapi.json"}

    async def dispatch(self, request: Request, call_next):
        if _RATE_LIMIT_DISABLED:
            return await call_next(request)

        if request.method == "OPTIONS" or request.url.path in self.EXEMPT_PATHS:
            return await call_next(request)

        # Pick the most specific client identifier available.
        client_host = request.client.host if request.client else "unknown"
        # Honour X-Forwarded-For only if we are configured to trust the
        # upstream proxy (RATE_LIMIT_TRUST_PROXY=1). Otherwise the immediate
        # peer is the authoritative source.
        if os.environ.get("RATE_LIMIT_TRUST_PROXY", "").lower() in {"1", "true", "yes"}:
            fwd = request.headers.get("x-forwarded-for")
            if fwd:
                client_host = fwd.split(",")[0].strip()

        if not _bucket.take(client_host):
            retry_after = int(_RATE_LIMIT_WINDOW) or 1
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded",
                    "limit": _RATE_LIMIT_REQUESTS,
                    "window_seconds": int(_RATE_LIMIT_WINDOW),
                },
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)


app.add_middleware(RateLimitMiddleware)


# ------------------------------
# API Routes
# ------------------------------
@app.get("/", summary="API Health Check", tags=["Health"])
async def root():
    """Health check endpoint that returns basic API information"""
    return {
        "status": "ok",
        "name": "MCP Hub API",
        "version": APP_VERSION,
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health", summary="Liveness probe", tags=["Health"])
async def liveness():
    """
    Lightweight liveness/readiness probe for orchestrators (Docker HEALTHCHECK,
    Kubernetes, load balancers). Always returns 200 OK if the process is up
    — does not touch disk, network, or the catalog, so it is safe to poll
    every few seconds. Use ``/validate/health`` for a deep data health
    report.
    """
    return {"status": "ok"}


@app.get("/stats", response_model=StatsResponse, tags=["Stats"], summary="Get API statistics")
async def get_stats(data: Dict[str, Any] = Depends(get_app_data)):
    """Get overall market statistics including total servers and categories"""
    return StatsResponse(
        total_servers=data.get("total_servers", 0),
        total_categories=data.get("total_categories", 0),
        last_sync=data.get("last_sync", ""),
        source_types=data.get("source_types", {}),
        categories=data.get("categories", {})
    )


@app.get("/servers", response_model=ServerListResponse, tags=["Servers"], summary="List servers with filters")
async def list_servers(
    data: Dict[str, Any] = Depends(get_app_data),
    search: Optional[str] = Query(None, description="Search servers by name or description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    language: Optional[str] = Query(None, description="Filter by programming language"),
    sort: str = Query("stars", description="Sort by 'stars' or 'updated'"),
    min_stars: int = Query(0, description="Minimum star count filter"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of results per request"),
):
    """
    Get a filtered list of MCP servers.
    Supports search, category, language, and star count filtering.
    Results are paginated by limit parameter.
    """
    servers = data.get("servers", [])
    
    filtered = servers
    
    # Search filter
    if search:
        search_lower = search.lower()
        filtered = [
            s for s in filtered 
            if search_lower in s.get("name", "").lower() 
            or search_lower in s.get("description", "").lower()
        ]
    
    # Category filter
    if category:
        filtered = [s for s in filtered if category in s.get("categories", [])]
    
    # Language filter
    if language:
        filtered = [s for s in filtered if s.get("language", "") == language]
    
    # Min stars filter
    if min_stars > 0:
        filtered = [s for s in filtered if s.get("stars", 0) >= min_stars]
    
    # Sort
    if sort == "updated":
        filtered.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    else:
        filtered.sort(key=lambda x: x.get("stars", 0), reverse=True)
    
    return ServerListResponse(
        total=len(filtered),
        servers=filtered[:limit]
    )


@app.get("/servers/popular", tags=["Servers"], summary="Get most popular servers")
async def get_popular(
    data: Dict[str, Any] = Depends(get_app_data),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
):
    """Get the top N most starred servers"""
    servers = data.get("servers", [])
    servers.sort(key=lambda x: x.get("stars", 0), reverse=True)
    return ServerListResponse(total=len(servers), servers=servers[:limit])


@app.get("/servers/recent", tags=["Servers"], summary="Get recently updated servers")
async def get_recent(
    data: Dict[str, Any] = Depends(get_app_data),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
):
    """Get the N most recently updated servers"""
    servers = data.get("servers", [])
    servers.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    return ServerListResponse(total=len(servers), servers=servers[:limit])


@app.get("/servers/curated", tags=["Servers"], summary="Get curated popular servers")
async def get_curated(
    data: Dict[str, Any] = Depends(get_app_data),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
):
    """A curated list of popular and useful MCP servers"""
    servers = data.get("servers", [])
    
    curated = [
        s for s in servers
        if s.get("source_type") == "official" 
        or s.get("stars", 0) > 1000
    ]
    curated.sort(key=lambda x: x.get("stars", 0), reverse=True)
    return ServerListResponse(total=len(curated), servers=curated[:limit])


@app.get("/servers/by-quality", tags=["Servers"], summary="Get servers filtered by quality score")
async def get_servers_by_quality(
    data: Dict[str, Any] = Depends(get_app_data),
    min_score: int = Query(50, ge=0, le=100, description="Minimum quality score (0-100)"),
    level: str = Query(None, description="Quality level filter: S, A, B, C, or D"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of results"),
):
    """
    Get servers filtered by quality score.
    - min_score: Minimum quality score (0-100)
    - level: Quality level (S=85+, A=70+, B=55+, C=40+, D=<40)
    """
    from services import get_quality_score_for_server, get_quality_level
    
    servers = data.get("servers", [])
    
    def calculate_score(server):
        return get_quality_score_for_server(server)
    
    scored_servers = [(s, calculate_score(s)) for s in servers]
    
    filtered = [
        (s, score) for s, score in scored_servers
        if score >= min_score
    ]
    
    if level:
        level = level.upper()
        filtered = [
            (s, score) for s, score in filtered
            if get_quality_level(score) == level
        ]
    
    filtered.sort(key=lambda x: x[1], reverse=True)
    
    return {
        "total": len(filtered),
        "servers": [s for s, _ in filtered[:limit]],
        "min_score": min_score,
        "level_filter": level,
    }


@app.get("/servers/by-category/{category}", tags=["Servers"], summary="Get servers by category")
async def get_servers_by_category(
    category: str,
    data: Dict[str, Any] = Depends(get_app_data),
    min_stars: int = Query(0, ge=0, description="Minimum star count"),
    limit: int = Query(100, ge=1, le=1000, description="Max number of results"),
):
    """Get all servers in a specific category, optionally filtered by minimum stars"""
    servers = data.get("servers", [])
    
    category_lower = category.lower()
    filtered = [
        s for s in servers
        if any(category_lower in c.lower() for c in s.get("categories", []))
        and s.get("stars", 0) >= min_stars
    ]
    
    filtered.sort(key=lambda x: x.get("stars", 0), reverse=True)
    
    return ServerListResponse(total=len(filtered), servers=filtered[:limit])


@app.get("/servers/{name:path}", tags=["Servers"], summary="Get a single server by name")
async def get_server(name: str, data: Dict[str, Any] = Depends(get_app_data)):
    """Get detailed information about a specific server by name"""
    servers = data.get("servers", [])
    
    for server in servers:
        if server.get("name") == name:
            return server
    
    raise HTTPException(status_code=404, detail="Server not found")


@app.get("/config/{name:path}", response_model=ServerConfig, tags=["Configuration"], summary="Get server config")
async def get_server_config(name: str, data: Dict[str, Any] = Depends(get_app_data)):
    """
    Generate a configuration example for an MCP server.
    This includes installation commands, MCP config, and Docker configuration.
    """
    servers = data.get("servers", [])
    
    server = None
    for s in servers:
        if s.get("name") == name:
            server = s
            break
    
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    owner = server.get("owner", "")
    repo_name = server.get("name", "")

    # Generate install commands based on repository content
    install = {}
    source = server.get("source", "")
    language = (server.get("language") or "").lower()
    description = (server.get("description") or "").lower()

    # NPM
    if (
        "npm" in source.lower()
        or "npmjs" in source.lower()
        or language in {"javascript", "typescript", "nodejs", "node", "ts", "js"}
    ):
        install["npm"] = f"npm install -g {repo_name}"

    # Pip — only suggest when the repo is a Python project. Earlier this
    # branch was guarded by `"pyproject.toml" in str(data)` which is
    # nonsense: it serialised the whole index and matched any project
    # whose description mentioned the string, so every server ended up
    # with a `pip install` hint regardless of language.
    is_python = (
        language in {"python", "py"}
        or "pypi.org" in source.lower()
        or "pyproject.toml" in description
        or "setup.py" in description
    )
    if is_python:
        install["pip"] = f"pip install {repo_name}"

    # Git - general fallback
    install["git"] = f"git clone {source}.git"
    
    config = ServerConfig(
        name=repo_name,
        install=install,
        mcpServers={
            repo_name: {
                "command": "mcp-server",
                "args": []
            }
        },
        commands={
            "install": [
                f"# Clone repository",
                f"git clone {source}.git",
                f"cd {repo_name}",
                "",
                f"# Install dependencies (choose appropriate method)",
                f"npm install",
                f"# or",
                f"pip install -e ."
            ],
            "run": [
                f"cd {repo_name}",
                f"npm run start",
                f"# or",
                f"python -m {repo_name}"
            ]
        },
        docker={
            "image": f"{owner}/{repo_name}:latest",
            "args": [],
            "env": {}
        },
        snippets={
            "basic": json.dumps({
                "mcpServers": {
                    repo_name: {
                        "command": repo_name
                    }
                }
            }, indent=2)
        }
    )
    return config


# ------------------------------
# Data Validation Endpoints
# ------------------------------
@app.get("/validate/server/{name}", tags=["Validation"], summary="Validate a single server")
async def validate_server(name: str, data: Dict[str, Any] = Depends(get_app_data)):
    """
    Validate a single server's data quality.
    Returns validation report with errors, warnings, and score.
    """
    from services import validate_server_data, get_quality_score_for_server, get_quality_level
    
    servers = data.get("servers", [])
    
    server = None
    for s in servers:
        if s.get("name") == name:
            server = s
            break
    
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    validation = validate_server_data(server)
    quality_score = get_quality_score_for_server(server)
    quality_level = get_quality_level(quality_score)
    
    return {
        "server": name,
        "validation": validation,
        "quality_score": quality_score,
        "quality_level": quality_level
    }


@app.get("/validate/all", tags=["Validation"], summary="Validate all servers")
async def validate_all(data: Dict[str, Any] = Depends(get_app_data)):
    """
    Validate all servers and return summary report.
    Use sparingly - this can be slow for large datasets.
    """
    from services import validate_all_servers
    return validate_all_servers(servers=data.get("servers", []))


@app.get("/validate/health", tags=["Validation"], summary="Get data health report")
async def get_health_report(data: Dict[str, Any] = Depends(get_app_data)):
    """
    Get comprehensive data health report with recommendations.
    """
    from services import get_data_health_report
    return get_data_health_report(servers=data.get("servers", []))


@app.get("/validate/low-quality", tags=["Validation"], summary="Get low quality servers")
async def get_low_quality_servers(
    threshold: int = Query(40, ge=0, le=100),
    data: Dict[str, Any] = Depends(get_app_data),
):
    """
    Get servers with validation score below threshold.
    Default threshold is 40.
    """
    from services import get_low_quality_servers
    low_quality = get_low_quality_servers(threshold, servers=data.get("servers", []))
    return {
        "total": len(low_quality),
        "threshold": threshold,
        "servers": low_quality
    }


# ------------------------------
# Server Comparison & Recommendations
# ------------------------------
@app.get("/compare", tags=["Comparison"], summary="Compare multiple servers")
async def compare_servers(
    servers: str = Query(..., description="Comma-separated server names to compare"),
    data: Dict[str, Any] = Depends(get_app_data),
):
    """
    Compare multiple servers side by side.
    Returns detailed comparison with quality scores, features, and recommendations.
    """
    from services import get_quality_score_for_server, get_quality_level
    
    all_servers = data.get("servers", [])
    server_map = {s.get("name"): s for s in all_servers}
    names = [n.strip() for n in servers.split(",")]
    comparison_data = []
    
    for name in names:
        server = server_map.get(name)
        if server:
            quality_score = get_quality_score_for_server(server)
            quality_level = get_quality_level(quality_score)
            comparison_data.append({
                **server,
                "quality_score": quality_score,
                "quality_level": quality_level,
                "comparison": {
                    "has_npm_package": bool(server.get("npm_package")),
                    "category_count": len(server.get("categories", [])),
                    "topic_count": len(server.get("topics", [])),
                    "description_length": len(server.get("description", "")),
                    "is_archived": server.get("archived", False),
                    "has_license": bool(server.get("license")),
                }
            })
    
    if not comparison_data:
        raise HTTPException(status_code=404, detail="No matching servers found")
    
    # Find best server for each dimension
    best_for = {
        "stars": max(comparison_data, key=lambda x: x.get("stars", 0)),
        "quality_score": max(comparison_data, key=lambda x: x.get("quality_score", 0)),
        "category_count": max(comparison_data, key=lambda x: x["comparison"]["category_count"]),
        "description_length": max(comparison_data, key=lambda x: x["comparison"]["description_length"]),
    }
    
    return {
        "total": len(comparison_data),
        "servers": comparison_data,
        "best_for": {
            "stars": {"name": best_for["stars"]["name"], "value": best_for["stars"].get("stars", 0)},
            "quality": {"name": best_for["quality_score"]["name"], "value": best_for["quality_score"].get("quality_score", 0)},
            "categories": {"name": best_for["category_count"]["name"], "value": best_for["category_count"]["comparison"]["category_count"]},
            "documentation": {"name": best_for["description_length"]["name"], "value": best_for["description_length"]["comparison"]["description_length"]},
        }
    }


@app.get("/recommend/similar", tags=["Recommendations"], summary="Get similar servers")
async def get_similar_servers(
    name: str = Query(..., description="Server name to find similar servers for"),
    limit: int = Query(5, ge=1, le=20, description="Number of similar servers to return"),
    data: Dict[str, Any] = Depends(get_app_data),
):
    """
    Find servers similar to the given server based on categories and topics.
    """
    from services import get_quality_score_for_server

    all_servers = data.get("servers", [])
    target_server = None
    for s in all_servers:
        if s.get("name") == name:
            target_server = s
            break

    if not target_server:
        raise HTTPException(status_code=404, detail="Server not found")
    
    target_categories = set(target_server.get("categories", []))
    target_topics = set(target_server.get("topics", []))
    target_name = target_server.get("name", "").lower()
    
    similar = []
    
    for server in all_servers:
        if server.get("name") == target_name:
            continue
        
        server_categories = set(server.get("categories", []))
        server_topics = set(server.get("topics", []))
        
        # Calculate similarity score
        category_overlap = len(target_categories & server_categories)
        topic_overlap = len(target_topics & server_topics)
        
        if category_overlap > 0 or topic_overlap > 0:
            similarity = category_overlap * 2 + topic_overlap
            quality_score = get_quality_score_for_server(server)
            similar.append({
                **server,
                "similarity_score": similarity,
                "quality_score": quality_score,
                "matching_categories": list(target_categories & server_categories),
                "matching_topics": list(target_topics & server_topics),
            })
    
    # Sort by similarity and quality
    similar.sort(key=lambda x: (x["similarity_score"], x["quality_score"]), reverse=True)
    
    return {
        "target": name,
        "total": len(similar),
        "similar_servers": similar[:limit]
    }


@app.get("/recommend/for-use-case", tags=["Recommendations"], summary="Get servers for a specific use case")
async def get_servers_for_use_case(
    use_case: str = Query(..., description="Use case description (e.g., 'web scraping', 'database access')"),
    limit: int = Query(10, ge=1, le=50, description="Number of servers to return"),
    data: Dict[str, Any] = Depends(get_app_data),
):
    """
    Recommend servers for a specific use case.
    Uses keyword matching across name, description, categories, and topics.
    """
    from services import search_servers, get_quality_score_for_server, get_quality_level
    
    results = search_servers(use_case, servers=data.get("servers", []))
    
    # Score and sort results
    scored = []
    for server in results:
        quality_score = get_quality_score_for_server(server)
        level = get_quality_level(quality_score)
        
        # Boost score for exact category matches
        category_match = any(use_case.lower() in c.lower() for c in server.get("categories", []))
        topic_match = any(use_case.lower() in t.lower() for t in server.get("topics", []))
        
        boosted_score = quality_score
        if category_match:
            boosted_score += 20
        if topic_match:
            boosted_score += 10
        
        scored.append({
            **server,
            "quality_score": quality_score,
            "quality_level": level,
            "match_boost": (20 if category_match else 0) + (10 if topic_match else 0),
            "final_score": min(boosted_score, 100),
        })
    
    # Sort by final score
    scored.sort(key=lambda x: x["final_score"], reverse=True)
    
    return {
        "use_case": use_case,
        "total_found": len(scored),
        "servers": scored[:limit],
        "tip": "Use 'quality_score' for reliability, 'final_score' for use-case relevance"
    }


# ------------------------------
# User Function Endpoints (Favorites, Ratings, Comments)
# ------------------------------

@app.post("/favorites/add", tags=["User Functions"], summary="Add server to favorites")
async def add_favorite_endpoint(request: FavoriteRequest):
    """Add a server to user's favorites"""
    import user_data
    success = user_data.add_favorite(request.user_id, request.server_name)
    return {
        "success": success,
        "user_id": request.user_id,
        "server_name": request.server_name,
        "message": "Added to favorites" if success else "Already in favorites"
    }


@app.post("/favorites/remove", tags=["User Functions"], summary="Remove server from favorites")
async def remove_favorite_endpoint(request: FavoriteRequest):
    """Remove a server from user's favorites"""
    import user_data
    success = user_data.remove_favorite(request.user_id, request.server_name)
    return {
        "success": success,
        "user_id": request.user_id,
        "server_name": request.server_name,
        "message": "Removed from favorites" if success else "Not found in favorites"
    }


@app.get("/favorites/{user_id}", tags=["User Functions"], summary="Get user's favorites")
async def get_favorites_endpoint(user_id: str):
    """Get list of server names in user's favorites"""
    import user_data
    favorites = user_data.get_favorites(user_id)
    return {
        "user_id": user_id,
        "favorites": favorites,
        "count": len(favorites)
    }


@app.get("/favorites/check/{user_id}/{server_name}", tags=["User Functions"], summary="Check if favorited")
async def is_favorite_endpoint(user_id: str, server_name: str):
    """Check if a server is in user's favorites"""
    import user_data
    is_fav = user_data.is_favorite(user_id, server_name)
    return {
        "user_id": user_id,
        "server_name": server_name,
        "is_favorite": is_fav
    }


@app.get("/favorites/count/{server_name}", tags=["User Functions"], summary="Get favorite count for server")
async def get_favorites_count_endpoint(server_name: str):
    """Get total number of users who have favorited this server"""
    import user_data
    count = user_data.get_favorites_count(server_name)
    return {
        "server_name": server_name,
        "favorites_count": count
    }


@app.post("/ratings/add", tags=["User Functions"], summary="Add or update rating")
async def add_rating_endpoint(request: RatingRequest):
    """Add or update a user's rating for a server"""
    import user_data
    rating_info = user_data.add_rating(
        request.user_id, 
        request.server_name, 
        request.rating, 
        request.comment
    )
    return {
        "success": True,
        "rating": rating_info
    }


@app.get("/ratings/{server_name}", tags=["User Functions"], summary="Get ratings for server")
async def get_ratings_endpoint(server_name: str):
    """Get all ratings for a server"""
    import user_data
    ratings = user_data.get_ratings(server_name)
    avg_rating = user_data.get_average_rating(server_name)
    return {
        "server_name": server_name,
        "ratings": ratings,
        "average_rating": avg_rating,
        "count": len(ratings)
    }


@app.get("/ratings/user/{user_id}/{server_name}", tags=["User Functions"], summary="Get user's rating")
async def get_user_rating_endpoint(user_id: str, server_name: str):
    """Get a specific user's rating for a server"""
    import user_data
    rating = user_data.get_user_rating(user_id, server_name)
    return {
        "user_id": user_id,
        "server_name": server_name,
        "rating": rating
    }


@app.post("/comments/add", tags=["User Functions"], summary="Add comment")
async def add_comment_endpoint(request: CommentRequest):
    """Add a comment to a server"""
    import user_data
    comment = user_data.add_comment(
        request.user_id,
        request.server_name,
        request.text
    )
    return {
        "success": True,
        "comment": comment
    }


@app.get("/comments/{server_name}", tags=["User Functions"], summary="Get comments for server")
async def get_comments_endpoint(server_name: str):
    """Get all comments for a server"""
    import user_data
    comments = user_data.get_comments(server_name)
    return {
        "server_name": server_name,
        "comments": comments,
        "count": len(comments)
    }


@app.get("/server-stats/{server_name}", tags=["User Functions"], summary="Get server stats")
async def get_server_stats_endpoint(server_name: str):
    """Get comprehensive stats for a server (favorites, ratings, comments)"""
    import user_data
    stats = user_data.get_server_stats(server_name)
    return {
        "server_name": server_name,
        "stats": stats
    }


@app.get("/user-stats/{user_id}", tags=["User Functions"], summary="Get user stats")
async def get_user_stats_endpoint(user_id: str):
    """Get statistics for a user"""
    import user_data
    stats = user_data.get_user_stats(user_id)
    return {
        "user_id": user_id,
        "stats": stats
    }


# ------------------------------
# Submission Endpoints
# ------------------------------

@app.post("/submissions/submit", tags=["Submissions"], summary="Submit a new server")
async def submit_server_endpoint(request: SubmissionRequest):
    """Submit a new server for review"""
    import user_data
    submission = user_data.submit_server(
        request.user_id,
        request.name,
        request.source,
        request.description,
        request.categories,
        request.npm_package
    )
    return {
        "success": True,
        "submission": submission
    }


@app.get("/submissions", tags=["Submissions"], summary="Get submissions")
async def get_submissions_endpoint(status: Optional[str] = None):
    """Get all submissions, optionally filtered by status"""
    import user_data
    submissions = user_data.get_submissions(status)
    return {
        "total": len(submissions),
        "status": status,
        "submissions": submissions
    }


@app.get("/submissions/user/{user_id}", tags=["Submissions"], summary="Get user's submissions")
async def get_user_submissions_endpoint(user_id: str):
    """Get all submissions by a user"""
    import user_data
    submissions = user_data.get_user_submissions(user_id)
    return {
        "user_id": user_id,
        "submissions": submissions,
        "count": len(submissions)
    }


@app.post("/submissions/review", tags=["Submissions"], summary="Review submission")
async def review_submission_endpoint(request: ReviewRequest):
    """Review a submission (approve or reject)"""
    import user_data
    result = user_data.review_submission(
        request.submission_id,
        request.status,
        request.reviewer,
        request.comment
    )
    if result:
        return {
            "success": True,
            "submission": result
        }
    raise HTTPException(status_code=404, detail="Submission not found")


@app.get("/stats/all", tags=["User Functions"], summary="Get overall stats")
async def get_all_stats_endpoint():
    """Get overall platform statistics"""
    import user_data
    stats = user_data.get_all_stats()
    return stats


class BatchExportRequest(BaseModel):
    server_names: List[str] = Field(..., description="List of server names to export")


# ------------------------------
# Export Endpoints
# ------------------------------
def _generate_server_markdown(server: Dict[str, Any], config: Optional[Dict[str, Any]] = None) -> str:
    lines = []
    name = server.get("name", "unknown")
    lines.append(f"# {name}")
    lines.append("")
    lines.append(f"> {server.get('description', 'No description available.')}")
    lines.append("")
    lines.append("## Overview")
    lines.append("")
    lines.append("| Property | Value |")
    lines.append("|----------|-------|")
    lines.append(f"| **Owner** | @{server.get('owner', 'N/A')} |")
    lines.append(f"| **Stars** | {server.get('stars', 0):,} ⭐ |")
    lines.append(f"| **Language** | {server.get('language', 'N/A')} |")
    lines.append(f"| **License** | {server.get('license', 'N/A')} |")
    lines.append(f"| **Source Type** | {server.get('source_type', 'N/A')} |")
    lines.append(f"| **Status** | {'Archived' if server.get('archived') else 'Active'} |")
    lines.append(f"| **Last Updated** | {server.get('updated_at', 'N/A')} |")
    lines.append(f"| **Source** | [{server.get('source', '')}]({server.get('source', '')}) |")
    lines.append("")

    categories = server.get("categories", [])
    if categories:
        lines.append("## Categories")
        lines.append("")
        lines.append(" · ".join(f"`{c}`" for c in categories))
        lines.append("")

    topics = server.get("topics", [])
    if topics:
        lines.append("## Topics")
        lines.append("")
        lines.append(" · ".join(f"`{t}`" for t in topics))
        lines.append("")

    if config:
        lines.append("## Installation")
        lines.append("")
        install = config.get("install", {})
        if install:
            if install.get("npm"):
                lines.append("### npm")
                lines.append("")
                lines.append("```bash")
                lines.append(install["npm"])
                lines.append("```")
                lines.append("")
            if install.get("pip"):
                lines.append("### pip")
                lines.append("")
                lines.append("```bash")
                lines.append(install["pip"])
                lines.append("```")
                lines.append("")
            if install.get("brew"):
                lines.append("### Homebrew")
                lines.append("")
                lines.append("```bash")
                lines.append(install["brew"])
                lines.append("```")
                lines.append("")
            if install.get("cargo"):
                lines.append("### Cargo")
                lines.append("")
                lines.append("```bash")
                lines.append(install["cargo"])
                lines.append("```")
                lines.append("")
            if install.get("git"):
                lines.append("### From Source")
                lines.append("")
                lines.append("```bash")
                lines.append(install["git"])
                lines.append("```")
                lines.append("")
            if install.get("docker"):
                lines.append("### Docker")
                lines.append("")
                lines.append("```bash")
                lines.append(install["docker"])
                lines.append("```")
                lines.append("")

        lines.append("## MCP Configuration")
        lines.append("")
        lines.append("Add the following to your MCP configuration file:")
        lines.append("")

        mcp_servers = config.get("mcpServers")
        if mcp_servers:
            lines.append("```json")
            lines.append(json.dumps({"mcpServers": mcp_servers}, indent=2))
            lines.append("```")
            lines.append("")

        docker_config = config.get("docker")
        if docker_config:
            lines.append("### Docker Configuration")
            lines.append("")
            lines.append("```json")
            docker_entry = {
                "command": "docker",
                "args": ["run", docker_config.get("image", ""), *(docker_config.get("args", []))],
                "env": docker_config.get("env", {})
            }
            lines.append(json.dumps({"mcpServers": {name: docker_entry}}, indent=2))
            lines.append("```")
            lines.append("")

        commands = config.get("commands")
        if commands:
            lines.append("## Commands")
            lines.append("")
            for cmd_name, cmds in commands.items():
                lines.append(f"### {cmd_name}")
                lines.append("")
                lines.append("```bash")
                lines.append("\n".join(cmds))
                lines.append("```")
                lines.append("")

        snippets = config.get("snippets")
        if snippets:
            lines.append("## Configuration Snippets")
            lines.append("")
            for snippet_name, snippet in snippets.items():
                lines.append(f"### {snippet_name}")
                lines.append("")
                lines.append("```json")
                lines.append(snippet)
                lines.append("```")
                lines.append("")
    else:
        lines.append("## MCP Configuration")
        lines.append("")
        lines.append("```json")
        lines.append(json.dumps({
            "mcpServers": {
                name: {
                    "command": "your-command-here",
                    "args": [],
                    "env": {}
                }
            }
        }, indent=2))
        lines.append("```")
        lines.append("")
        source = server.get("source", "")
        lines.append("> **Note:** Replace `your-command-here` with the actual command for this server.")
        if source:
            lines.append(f"> Check the [source repository]({source}) for installation instructions.")
        lines.append("")

    lines.append("---")
    lines.append("")
    from datetime import date
    lines.append(f"*Generated by MCP Hub · {date.today().isoformat()}*")
    return "\n".join(lines)


def _generate_config_for_server(server: Dict[str, Any]) -> ServerConfig:
    owner = server.get("owner", "")
    repo_name = server.get("name", "")
    source = server.get("source", "")

    install = {}
    if "npm" in source.lower() or "npmjs" in source.lower():
        install["npm"] = f"npm install -g {repo_name}"
    if "pypi" in source.lower():
        install["pip"] = f"pip install {repo_name}"
    install["git"] = f"git clone {source}.git"

    return ServerConfig(
        name=repo_name,
        install=install,
        mcpServers={
            repo_name: {
                "command": "mcp-server",
                "args": []
            }
        },
        commands={
            "install": [
                f"# Clone repository",
                f"git clone {source}.git",
                f"cd {repo_name}",
                "",
                f"# Install dependencies (choose appropriate method)",
                f"npm install",
                f"# or",
                f"pip install -e ."
            ],
            "run": [
                f"cd {repo_name}",
                f"npm run start",
                f"# or",
                f"python -m {repo_name}"
            ]
        },
        docker={
            "image": f"{owner}/{repo_name}:latest",
            "args": [],
            "env": {}
        },
        snippets={
            "basic": json.dumps({
                "mcpServers": {
                    repo_name: {
                        "command": repo_name
                    }
                }
            }, indent=2)
        }
    )


@app.get("/export/markdown/{name:path}", tags=["Export"], summary="Export server as Markdown")
async def export_server_markdown(name: str, data: Dict[str, Any] = Depends(get_app_data)):
    """
    Generate a Markdown installation guide for a specific server.
    Returns the Markdown content as plain text.
    """
    servers = data.get("servers", [])

    server = None
    for s in servers:
        if s.get("name") == name:
            server = s
            break

    if not server:
        raise HTTPException(status_code=404, detail="Server not found")

    config = _generate_config_for_server(server)
    markdown = _generate_server_markdown(server, config.model_dump())

    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        content=markdown,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename={name}-mcp.md"
        }
    )


@app.post("/export/batch-json", tags=["Export"], summary="Batch export configs as JSON")
async def export_batch_json(request: BatchExportRequest, data: Dict[str, Any] = Depends(get_app_data)):
    """
    Export configurations for multiple servers as a single combined JSON file.
    All mcpServers entries are merged into one configuration object.
    """
    servers = data.get("servers", [])
    server_map = {s.get("name"): s for s in servers}

    combined_mcp_servers: Dict[str, Any] = {}
    found_servers: List[Dict[str, Any]] = []
    not_found: List[str] = []

    for name in request.server_names:
        server = server_map.get(name)
        if not server:
            not_found.append(name)
            continue

        found_servers.append(server)
        config = _generate_config_for_server(server)
        if config.mcpServers:
            combined_mcp_servers.update(config.mcpServers)

    return {
        "total_requested": len(request.server_names),
        "total_found": len(found_servers),
        "not_found": not_found,
        "config": {
            "mcpServers": combined_mcp_servers
        },
        "servers": found_servers
    }


@app.post("/export/batch-markdown", tags=["Export"], summary="Batch export as Markdown")
async def export_batch_markdown(request: BatchExportRequest, data: Dict[str, Any] = Depends(get_app_data)):
    """
    Export a combined Markdown installation guide for multiple servers.
    Includes a table of contents, combined configuration, and individual server sections.
    """
    from datetime import date

    servers = data.get("servers", [])
    server_map = {s.get("name"): s for s in servers}

    found_servers: List[Dict[str, Any]] = []
    not_found: List[str] = []

    for name in request.server_names:
        server = server_map.get(name)
        if server:
            found_servers.append(server)
        else:
            not_found.append(name)

    if not found_servers:
        raise HTTPException(status_code=404, detail="No matching servers found")

    lines = []
    lines.append("# MCP Server Configuration Guide")
    lines.append("")
    lines.append(f"> Exported from MCP Hub · {date.today().isoformat()}")
    lines.append(f"> {len(found_servers)} server{'s' if len(found_servers) != 1 else ''} included")
    lines.append("")

    lines.append("## Table of Contents")
    lines.append("")
    for server in found_servers:
        slug = server.get("name", "").lower().replace(" ", "-")
        lines.append(f"- [{server.get('name')}]({slug})")
    lines.append("")

    lines.append("## Combined MCP Configuration")
    lines.append("")
    lines.append("Add all servers to your MCP configuration at once:")
    lines.append("")

    combined_mcp_servers: Dict[str, Any] = {}
    for server in found_servers:
        config = _generate_config_for_server(server)
        if config.mcpServers:
            combined_mcp_servers.update(config.mcpServers)

    lines.append("```json")
    lines.append(json.dumps({"mcpServers": combined_mcp_servers}, indent=2))
    lines.append("```")
    lines.append("")

    for server in found_servers:
        config = _generate_config_for_server(server)
        lines.append(_generate_server_markdown(server, config.model_dump()))
        lines.append("")

    if not_found:
        lines.append("## Not Found")
        lines.append("")
        lines.append("The following servers were not found:")
        lines.append("")
        for name in not_found:
            lines.append(f"- `{name}`")
        lines.append("")

    markdown = "\n".join(lines)

    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(
        content=markdown,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": "attachment; filename=mcp-servers-config.md"
        }
    )


# ------------------------------
# CLI entry-point (referenced by pyproject.toml [project.scripts])
# ------------------------------
def cli() -> None:
    """Console entry-point for ``mcp-hub`` / ``mcp-hub-server`` / ``mcp-market``.

    Equivalent to running ``python main.py`` and forwards the same
    ``--host`` / ``--port`` / ``--reload`` flags. Lets users install the
    package with ``pip install mcp-hub`` and then start the server via
    a real CLI command on their ``$PATH``.
    """
    import argparse
    import sys

    parser = argparse.ArgumentParser(
        prog="mcp-hub",
        description="MCP Hub FastAPI Server — start the catalog API.",
    )
    parser.add_argument(
        "--host",
        default=os.environ.get("HOST", "0.0.0.0"),
        help="Host address to bind (env: HOST)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", "8080")),
        help="Port number (env: PORT)",
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload (development only)",
    )
    args = parser.parse_args()

    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )


# ------------------------------
# Run Server
# ------------------------------
if __name__ == "__main__":
    cli()
