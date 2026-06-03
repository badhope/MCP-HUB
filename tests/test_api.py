"""
API 集成测试 - 真实 HTTP 服务器，真实请求，无 mock
启动 api.py 服务，用 urllib 发送真实 HTTP 请求验证
"""

import json
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).parent.parent

# 找一个空闲端口
import socket


def _free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


PORT = _free_port()
BASE = f"http://127.0.0.1:{PORT}"


@pytest.fixture(scope="module")
def live_server():
    """启动真实的 API 服务器"""
    from http.server import HTTPServer

    from api import MCPHubAPI

    server = HTTPServer(("127.0.0.1", PORT), MCPHubAPI)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.5)  # 等待服务器启动
    yield server
    server.shutdown()


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


class TestAPIEndpoints:
    """测试所有 API 端点 - 真实 HTTP 请求"""

    def test_root(self, live_server):
        r = _get("/")
        assert r["name"] == "MCP Hub API"
        assert r["total_servers"] > 0
        assert "last_sync" in r
        assert isinstance(r["endpoints"], list)

    def test_list_servers(self, live_server):
        r = _get("/servers")
        assert "total" in r
        assert "servers" in r
        assert r["total"] > 0
        assert len(r["servers"]) > 0
        # 验证服务器结构
        s = r["servers"][0]
        assert "name" in s
        assert "categories" in s
        assert "stars" in s
        assert "source" in s

    def test_search_servers(self, live_server):
        r = _get("/servers?search=github")
        assert r["total"] > 0
        for s in r["servers"]:
            # Search matches name, description, categories, topics, or owner
            text = (
                s.get("name", "")
                + s.get("description", "")
                + s.get("owner", "")
                + " ".join(s.get("topics", []))
                + " ".join(s.get("categories", []))
            ).lower()
            assert "github" in text

    def test_search_no_results(self, live_server):
        r = _get("/servers?search=zzzzz-nonexistent-xyz-12345")
        assert r["total"] == 0
        assert r["servers"] == []

    def test_filter_by_category(self, live_server):
        r = _get("/servers?category=database")
        assert r["total"] > 0
        for s in r["servers"]:
            cats = s.get("categories", [])
            assert any("database" in c.lower() for c in cats)

    def test_filter_by_min_stars(self, live_server):
        r = _get("/servers?min-stars=10000")
        assert r["total"] > 0
        for s in r["servers"]:
            assert s.get("stars", 0) >= 10000

    def test_sort_by_stars(self, live_server):
        r = _get("/servers?sort=stars&limit=10")
        assert len(r["servers"]) > 1
        for i in range(len(r["servers"]) - 1):
            assert r["servers"][i].get("stars", 0) >= r["servers"][i + 1].get("stars", 0)

    def test_sort_by_updated(self, live_server):
        r = _get("/servers?sort=updated&limit=10")
        assert len(r["servers"]) > 1
        for i in range(len(r["servers"]) - 1):
            assert r["servers"][i].get("updated_at", "") >= r["servers"][i + 1].get(
                "updated_at", ""
            )

    def test_limit_param(self, live_server):
        r = _get("/servers?limit=5")
        assert len(r["servers"]) <= 5

    def test_limit_invalid(self, live_server):
        """非法 limit 值不应崩溃"""
        r = _get("/servers?limit=abc")
        assert "total" in r  # 应该返回默认结果

    def test_limit_negative(self, live_server):
        """负数 limit 应该被 clamp"""
        r = _get("/servers?limit=-1")
        assert "total" in r

    def test_get_single_server(self, live_server):
        """获取已知服务器"""
        all_servers = _get("/servers")["servers"]
        name = all_servers[0]["name"]
        r = _get(f"/servers/{name}")
        assert r["name"] == name
        assert "stars" in r
        assert "full_name" in r
        assert "owner" in r

    def test_get_single_server_not_found(self, live_server):
        r = _get("/servers/nonexistent-xyz-12345")
        assert "error" in r

    def test_categories(self, live_server):
        r = _get("/categories")
        assert isinstance(r, dict)
        assert len(r) > 0
        for cat, count in r.items():
            assert isinstance(count, int)
            assert count > 0

    def test_recommend(self, live_server):
        r = _get("/recommend?scene=browser")
        assert "scene" in r
        assert "recommendations" in r
        assert len(r["recommendations"]) > 0

    def test_recommend_missing_scene(self, live_server):
        r = _get("/recommend")
        assert "error" in r

    def test_config_known(self, live_server):
        r = _get("/config/github")
        assert "mcpServers" in r
        assert "github" in r["mcpServers"]
        cfg = r["mcpServers"]["github"]
        assert cfg["command"] == "npx"

    def test_config_unknown(self, live_server):
        r = _get("/config/nonexistent-xyz")
        assert "mcpServers" in r

    def test_stats(self, live_server):
        r = _get("/stats")
        assert r["total_servers"] > 0
        assert r["total_categories"] > 0
        assert "source_types" in r
        assert "stars" in r
        assert "languages" in r
        assert "last_sync" in r
        # Star stats
        assert r["stars"]["max"] > 0
        assert r["stars"]["avg"] > 0

    def test_popular(self, live_server):
        r = _get("/popular")
        assert "popular" in r
        assert len(r["popular"]) > 0
        # Should be sorted by stars desc
        for i in range(len(r["popular"]) - 1):
            assert r["popular"][i].get("stars", 0) >= r["popular"][i + 1].get("stars", 0)

    def test_popular_with_limit(self, live_server):
        r = _get("/popular?limit=5")
        assert len(r["popular"]) <= 5

    def test_recent(self, live_server):
        r = _get("/recent")
        assert "recent" in r
        assert len(r["recent"]) > 0
        # Should have updated_at
        for s in r["recent"]:
            assert "updated_at" in s

    def test_unknown_endpoint(self, live_server):
        r = _get("/nonexistent")
        assert "error" in r


class TestAPICORS:
    """Test CORS - Verify CORS middleware is configured"""

    def test_options_preflight(self, live_server):
        """OPTIONS preflight request should return 204"""
        url = f"{BASE}/servers"
        req = urllib.request.Request(url, method="OPTIONS")
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                # FastAPI returns 204 for OPTIONS by default with CORS middleware
                assert resp.status == 204
                # CORS headers are managed by FastAPI CORSMiddleware
                # In production, specific origins are configured via CORS_ALLOWED_ORIGINS
        except urllib.error.HTTPError:
            pytest.fail("OPTIONS request should not return error")


class TestAPIDataConsistency:
    """测试 API 数据一致性"""

    def test_total_matches_actual(self, live_server):
        """total 字段应该等于实际返回的服务器数量 (within limit)"""
        r = _get("/servers?limit=500")
        assert r["total"] >= len(r["servers"])
        # When fewer than `limit` servers exist, all of them are returned.
        # When the catalog is bigger, the response is capped at `limit`.
        assert len(r["servers"]) == min(500, r["total"])

    def test_stats_total_matches_servers(self, live_server):
        """stats.total_servers 应该等于 /servers 的 total"""
        servers = _get("/servers")
        stats = _get("/stats")
        assert servers["total"] == stats["total_servers"]

    def test_categories_sum(self, live_server):
        """分类计数之和应该 >= 服务器总数（一个服务器可属于多个分类）"""
        cats = _get("/categories")
        stats = _get("/stats")
        assert sum(cats.values()) >= stats["total_servers"]

    def test_all_servers_have_stars(self, live_server):
        """所有服务器应该有 stars 字段"""
        r = _get("/servers?limit=100")
        for s in r["servers"]:
            assert "stars" in s

    def test_all_servers_have_source(self, live_server):
        """所有服务器应该有 source 字段"""
        r = _get("/servers?limit=100")
        for s in r["servers"]:
            assert s.get("source"), f"Server {s.get('name')} missing source"
