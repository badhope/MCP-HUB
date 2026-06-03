"""
Query 接口测试 - 真实子进程执行，无 mock
用 subprocess 真实运行 query.py 命令验证输出
"""

import json
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
QUERY_SCRIPT = PROJECT_ROOT / "query.py"

# Make `core` importable so the data-agnostic category lookup works
# without a hard-coded label.
sys.path.insert(0, str(PROJECT_ROOT))
from core import MCPHub  # noqa: E402


def real_market():
    return MCPHub(PROJECT_ROOT)


def _run_query(*args) -> str:
    """执行 query.py 并返回 stdout"""
    result = subprocess.run(
        ["python", str(QUERY_SCRIPT)] + list(args),
        capture_output=True,
        text=True,
        timeout=30,
        cwd=str(PROJECT_ROOT),
    )
    return result.stdout


class TestQuerySearch:
    """测试搜索功能 - 真实执行"""

    def test_search_github(self):
        out = _run_query("search", "github")
        assert "github" in out.lower()
        assert "找到" in out

    def test_search_browser(self):
        out = _run_query("search", "browser")
        assert "找到" in out

    def test_search_shows_stars(self):
        out = _run_query("search", "github")
        assert "⭐" in out

    def test_search_no_results(self):
        out = _run_query("search", "zzzzz-nonexistent-xyz-12345")
        assert "未找到" in out or "0" in out

    def test_search_case_insensitive(self):
        out1 = _run_query("search", "GITHUB")
        out2 = _run_query("search", "github")
        count1 = out1.count("\n")
        count2 = out2.count("\n")
        assert abs(count1 - count2) <= 1

    def test_search_no_args(self):
        out = _run_query("search")
        assert "用法" in out


class TestQueryRecommend:
    """测试推荐功能 - 真实执行"""

    def test_recommend_english(self):
        out = _run_query("recommend", "browser")
        assert "推荐" in out

    def test_recommend_chinese(self):
        out = _run_query("recommend", "浏览器自动化")
        assert "推荐" in out

    def test_recommend_database(self):
        out = _run_query("recommend", "database")
        assert "推荐" in out

    def test_recommend_shows_stars(self):
        out = _run_query("recommend", "browser")
        assert "⭐" in out

    def test_recommend_no_args(self):
        out = _run_query("recommend")
        assert "用法" in out or "支持" in out


class TestQueryConfig:
    """测试配置生成 - 真实执行"""

    def test_config_github(self):
        out = _run_query("config", "github")
        assert "mcpServers" in out
        assert "github" in out
        lines = out.strip().split("\n")
        json_str = "\n".join(lines[1:])
        data = json.loads(json_str)
        assert "mcpServers" in data

    def test_config_no_args(self):
        out = _run_query("config")
        assert "用法" in out


class TestQueryCategories:
    """测试分类列表 - 真实执行"""

    def test_categories(self):
        out = _run_query("categories")
        assert "分类" in out
        # `development` was a legacy label. Assert on any real category
        # from the current catalog so the test stays in sync with the
        # taxonomy changes.
        groups = real_market().get_categories()
        assert groups, "catalog must have at least one category"
        cat = max(groups, key=lambda c: groups[c])
        assert cat in out

    def test_categories_count(self):
        out = _run_query("categories")
        lines = [line for line in out.strip().split("\n") if line.strip()]
        assert len(lines) > 10


class TestQueryPopular:
    """测试热门服务器 - 真实执行"""

    def test_popular_default(self):
        out = _run_query("popular")
        assert "热门" in out
        assert "⭐" in out

    def test_popular_with_limit(self):
        out = _run_query("popular", "5")
        assert "热门" in out


class TestQueryRecent:
    """测试最近更新 - 真实执行"""

    def test_recent_default(self):
        out = _run_query("recent")
        assert "最近更新" in out
        assert "⭐" in out

    def test_recent_with_limit(self):
        out = _run_query("recent", "5")
        assert "最近更新" in out


class TestQueryHelp:
    """测试帮助信息"""

    def test_no_args(self):
        out = _run_query()
        assert "query.py" in out or "搜索" in out or "推荐" in out

    def test_unknown_command(self):
        out = _run_query("nonexistent-command-xyz")
        assert "未知" in out
