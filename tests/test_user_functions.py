"""
Test User Function Endpoints (Favorites, Ratings, Comments, Submissions)
"""

import json
import threading
import time
import urllib.request
import socket
from pathlib import Path
import pytest

PROJECT_ROOT = Path(__file__).parent.parent


def _free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


PORT = _free_port()
BASE = f"http://127.0.0.1:{PORT}"
TEST_USER_ID = "test-user-123"
TEST_SERVER_NAME = "github-mcp-server"


@pytest.fixture(scope="module")
def fastapi_server():
    """Launch FastAPI server in background"""
    import uvicorn
    from main import app

    def run_server():
        uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="error")

    thread = threading.Thread(target=run_server, daemon=True)
    thread.start()
    time.sleep(2)
    yield
    thread.join(timeout=1)


def _post(endpoint: str, data: dict):
    url = f"{BASE}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return json.loads(body) if body else {}


def _get(endpoint: str):
    url = f"{BASE}{endpoint}"
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        return json.loads(body) if body else {}


class TestFavorites:
    """Test favorite functionality"""

    def test_add_favorite(self, fastapi_server):
        result = _post("/favorites/add", {
            "user_id": TEST_USER_ID,
            "server_name": TEST_SERVER_NAME
        })
        assert result.get("success") in [True, False]
        assert "user_id" in result
        assert "server_name" in result

    def test_get_favorites(self, fastapi_server):
        result = _get(f"/favorites/{TEST_USER_ID}")
        assert "user_id" in result
        assert "favorites" in result
        assert "count" in result

    def test_check_favorite(self, fastapi_server):
        result = _get(f"/favorites/check/{TEST_USER_ID}/{TEST_SERVER_NAME}")
        assert "user_id" in result
        assert "server_name" in result
        assert "is_favorite" in result

    def test_get_favorites_count(self, fastapi_server):
        result = _get(f"/favorites/count/{TEST_SERVER_NAME}")
        assert "server_name" in result
        assert "favorites_count" in result

    def test_remove_favorite(self, fastapi_server):
        result = _post("/favorites/remove", {
            "user_id": TEST_USER_ID,
            "server_name": TEST_SERVER_NAME
        })
        assert result.get("success") in [True, False]


class TestRatings:
    """Test rating functionality"""

    def test_add_rating(self, fastapi_server):
        result = _post("/ratings/add", {
            "user_id": TEST_USER_ID,
            "server_name": TEST_SERVER_NAME,
            "rating": 5,
            "comment": "Great server!"
        })
        assert result.get("success") is True
        assert "rating" in result

    def test_get_ratings(self, fastapi_server):
        result = _get(f"/ratings/{TEST_SERVER_NAME}")
        assert "server_name" in result
        assert "ratings" in result
        assert "average_rating" in result
        assert "count" in result

    def test_get_user_rating(self, fastapi_server):
        result = _get(f"/ratings/user/{TEST_USER_ID}/{TEST_SERVER_NAME}")
        assert "user_id" in result
        assert "server_name" in result
        assert "rating" in result


class TestComments:
    """Test comment functionality"""

    def test_add_comment(self, fastapi_server):
        result = _post("/comments/add", {
            "user_id": TEST_USER_ID,
            "server_name": TEST_SERVER_NAME,
            "text": "This is a test comment"
        })
        assert result.get("success") is True
        assert "comment" in result

    def test_get_comments(self, fastapi_server):
        result = _get(f"/comments/{TEST_SERVER_NAME}")
        assert "server_name" in result
        assert "comments" in result
        assert "count" in result


class TestServerStats:
    """Test server stats endpoint"""

    def test_get_server_stats(self, fastapi_server):
        result = _get(f"/server-stats/{TEST_SERVER_NAME}")
        assert "server_name" in result
        assert "stats" in result
        stats = result.get("stats", {})
        assert "favorites_count" in stats
        assert "average_rating" in stats
        assert "ratings_count" in stats
        assert "comments_count" in stats


class TestUserStats:
    """Test user stats endpoint"""

    def test_get_user_stats(self, fastapi_server):
        result = _get(f"/user-stats/{TEST_USER_ID}")
        assert "user_id" in result
        assert "stats" in result


class TestSubmissions:
    """Test submission functionality"""

    def test_submit_server(self, fastapi_server):
        result = _post("/submissions/submit", {
            "user_id": TEST_USER_ID,
            "name": "test-mcp-server",
            "source": "https://github.com/test/test-mcp-server",
            "description": "A test MCP server",
            "categories": ["ai", "tools"],
            "npm_package": "test-mcp-server"
        })
        assert result.get("success") is True
        assert "submission" in result

    def test_get_submissions(self, fastapi_server):
        result = _get("/submissions")
        assert "total" in result
        assert "submissions" in result

    def test_get_user_submissions(self, fastapi_server):
        result = _get(f"/submissions/user/{TEST_USER_ID}")
        assert "user_id" in result
        assert "submissions" in result
        assert "count" in result


class TestOverallStats:
    """Test overall stats endpoint"""

    def test_get_overall_stats(self, fastapi_server):
        result = _get("/stats/all")
        assert "total_users" in result
        assert "total_favorites" in result
        assert "total_ratings" in result
        assert "total_comments" in result
        assert "total_submissions" in result


class TestEnhancedEndpoints:
    """Test the new recommendation and comparison endpoints"""

    def test_compare_servers(self, fastapi_server):
        result = _get("/compare?servers=github-mcp-server,notion-mcp-server")
        assert "total" in result
        assert "servers" in result
        assert "best_for" in result

    def test_get_similar_servers(self, fastapi_server):
        result = _get("/recommend/similar?name=github-mcp-server&limit=5")
        assert "target" in result
        assert "total" in result
        assert "similar_servers" in result

    def test_get_servers_for_use_case(self, fastapi_server):
        result = _get("/recommend/for-use-case?use_case=database&limit=10")
        assert "use_case" in result
        assert "total_found" in result
        assert "servers" in result
        assert "tip" in result

    def test_get_servers_by_quality(self, fastapi_server):
        result = _get("/servers/by-quality?min_score=50&limit=10")
        assert "total" in result
        assert "servers" in result

    def test_get_servers_by_category(self, fastapi_server):
        result = _get("/servers/by-category/database?limit=5")
        assert "total" in result
        assert "servers" in result
