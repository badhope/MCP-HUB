"""
FastAPI Backend Integration Tests
Tests the FastAPI backend endpoints including new comparison and recommendation features.
"""

import json
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).parent.parent

import socket


def _free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


PORT = _free_port()
BASE = f"http://127.0.0.1:{PORT}"


@pytest.fixture(scope="module")
def fastapi_server():
    """启动真实的 FastAPI 服务器"""
    import uvicorn

    from main import app

    def run_server():
        uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="error")

    thread = threading.Thread(target=run_server, daemon=True)
    thread.start()
    time.sleep(2)
    yield
    thread.join(timeout=1)


def _get(path: str) -> dict:
    """发送 GET 请求并返回 JSON"""
    url = f"{BASE}{path}"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return json.loads(body) if body else {}


class TestFastAPIHealth:
    """测试 FastAPI 健康检查"""

    def test_root_endpoint(self, fastapi_server):
        r = _get("/")
        assert r["status"] == "ok"
        assert r["name"] == "MCP Hub API"
        assert r["version"] == "2.0.1"

    def test_stats_endpoint(self, fastapi_server):
        r = _get("/stats")
        assert r["total_servers"] > 0
        assert r["total_categories"] > 0
        assert "last_sync" in r


class TestFastAPIServers:
    """测试服务器相关端点"""

    def test_list_servers(self, fastapi_server):
        r = _get("/servers")
        assert "total" in r
        assert "servers" in r
        assert r["total"] > 0

    def test_popular_servers(self, fastapi_server):
        r = _get("/servers/popular?limit=10")
        assert r["total"] > 0
        assert len(r["servers"]) <= 10
        for s in r["servers"]:
            assert s.get("stars", 0) >= 0

    def test_recent_servers(self, fastapi_server):
        r = _get("/servers/recent?limit=10")
        assert r["total"] > 0
        assert len(r["servers"]) <= 10

    def test_curated_servers(self, fastapi_server):
        r = _get("/servers/curated?limit=10")
        assert r["total"] > 0

    def test_get_single_server(self, fastapi_server):
        r = _get("/servers")
        name = r["servers"][0]["name"]
        r = _get(f"/servers/{name}")
        assert r["name"] == name
        assert "stars" in r
        assert "source" in r


class TestFastAPIQuality:
    """测试质量评分相关端点"""

    def test_servers_by_quality(self, fastapi_server):
        r = _get("/servers/by-quality?min_score=50&limit=10")
        assert "total" in r
        assert "servers" in r

    def test_servers_by_quality_level(self, fastapi_server):
        r = _get("/servers/by-quality?level=B&limit=10")
        assert "total" in r

    def test_servers_by_category(self, fastapi_server):
        r = _get("/servers/by-category/database?limit=5")
        assert "total" in r
        assert "servers" in r
        for s in r["servers"]:
            assert any("database" in c.lower() for c in s.get("categories", []))


class TestFastAPIValidation:
    """测试数据验证端点"""

    def test_validate_single_server(self, fastapi_server):
        r = _get("/validate/server/github-mcp-server")
        assert "server" in r
        assert "quality_score" in r
        assert "quality_level" in r
        assert "validation" in r

    def test_validate_low_quality(self, fastapi_server):
        r = _get("/validate/low-quality?threshold=40")
        assert "total" in r
        assert "threshold" in r
        assert "servers" in r

    def test_validate_health(self, fastapi_server):
        r = _get("/validate/health")
        assert "health_score" in r
        assert "total_servers" in r
        assert "valid_percentage" in r
        assert r["health_score"] >= 0 and r["health_score"] <= 100


class TestFastAPIComparison:
    """测试服务器对比端点"""

    def test_compare_servers(self, fastapi_server):
        # Pick any two servers present in the catalog. The original
        # hard-coded "github-mcp-server,notion-mcp-server" pair only
        # exists in the full upstream mirror; the community-curated
        # fixture and trimmed dev fixtures may not include both.
        servers = _get("/servers?limit=2")
        names = [s["name"] for s in servers["servers"][:2]]
        assert len(names) == 2, "catalog must have at least 2 servers"
        r = _get(f"/compare?servers={names[0]},{names[1]}")
        assert "total" in r
        assert "servers" in r
        assert len(r["servers"]) == 2
        for s in r["servers"]:
            assert "quality_score" in s
            assert "quality_level" in s
            assert "comparison" in s

    def test_compare_best_for(self, fastapi_server):
        servers = _get("/servers?limit=2")
        names = [s["name"] for s in servers["servers"][:2]]
        assert len(names) == 2, "catalog must have at least 2 servers"
        r = _get(f"/compare?servers={names[0]},{names[1]}")
        assert "best_for" in r
        assert "stars" in r["best_for"]
        assert "quality" in r["best_for"]
        assert "categories" in r["best_for"]
        assert "documentation" in r["best_for"]

    def test_compare_not_found(self, fastapi_server):
        r = _get("/compare?servers=nonexistent-server")
        assert r.get("detail") == "No matching servers found"


class TestFastAPIRecommendations:
    """测试推荐相关端点"""

    def test_recommend_similar(self, fastapi_server):
        r = _get("/recommend/similar?name=github-mcp-server&limit=5")
        assert "target" in r
        assert "total" in r
        assert "similar_servers" in r
        assert r["target"] == "github-mcp-server"
        for s in r["similar_servers"]:
            assert "similarity_score" in s
            assert "quality_score" in s

    def test_recommend_similar_not_found(self, fastapi_server):
        r = _get("/recommend/similar?name=nonexistent-server")
        assert "detail" in r

    def test_recommend_for_use_case(self, fastapi_server):
        r = _get("/recommend/for-use-case?use_case=database&limit=10")
        assert "use_case" in r
        assert "total_found" in r
        assert "servers" in r
        assert "tip" in r
        assert r["use_case"] == "database"

    def test_recommend_for_use_case_ai(self, fastapi_server):
        r = _get("/recommend/for-use-case?use_case=AI&limit=5")
        assert len(r["servers"]) > 0
        for s in r["servers"]:
            assert "quality_score" in s
            assert "final_score" in s
            assert "match_boost" in s


class TestFastAPIDataConsistency:
    """测试数据一致性"""

    def test_total_consistency(self, fastapi_server):
        servers = _get("/servers?limit=1000")
        stats = _get("/stats")
        assert servers["total"] == stats["total_servers"]

    def test_quality_score_range(self, fastapi_server):
        r = _get("/servers/by-quality?min_score=0&limit=100")
        for s in r["servers"][:10]:
            score = s.get("quality_score", 0)
            assert score >= 0 and score <= 100


class TestFastAPIErrorHandling:
    """测试错误处理"""

    def test_invalid_server_name(self, fastapi_server):
        r = _get("/servers/invalid@@@server$$$name")
        assert r.get("detail") == "Server not found"

    def test_compare_empty(self, fastapi_server):
        r = _get("/compare?servers=")
        assert "detail" in r or r.get("total") == 0

    def test_similar_empty_name(self, fastapi_server):
        r = _get("/recommend/similar?name=")
        assert "detail" in r or r.get("total") == 0
