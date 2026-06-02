"""
核心框架测试 - 真实数据，无 mock
直接读取 servers-index.json 验证 core 模块功能
"""

import json
from pathlib import Path

import pytest

from core import MCPHub, MCPServer

PROJECT_ROOT = Path(__file__).parent.parent
INDEX_FILE = PROJECT_ROOT / "servers-index.json"


@pytest.fixture(scope="module")
def real_index():
    """读取真实索引"""
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def real_market():
    """创建基于真实索引的 Market"""
    return MCPHub(PROJECT_ROOT)


class TestMCPServer:
    """测试 MCPServer 类 - 使用真实数据"""

    def test_init_from_real_data(self, real_index):
        """用真实索引中的第一条数据初始化"""
        server_data = real_index["servers"][0]
        server = MCPServer(server_data)
        assert server.name == server_data["name"]
        assert server.description == server_data.get("description", "")
        assert isinstance(server.categories, list)

    def test_new_fields_present(self, real_index):
        """新字段 (stars, full_name, owner, topics, updated_at) 存在"""
        server_data = real_index["servers"][0]
        server = MCPServer(server_data)
        assert hasattr(server, "stars")
        assert hasattr(server, "full_name")
        assert hasattr(server, "owner")
        assert hasattr(server, "topics")
        assert hasattr(server, "updated_at")
        assert hasattr(server, "created_at")
        assert hasattr(server, "archived")

    def test_stars_is_number(self, real_index):
        """stars 字段是数字"""
        for s in real_index["servers"][:100]:  # 检查前100个
            assert isinstance(s.get("stars", 0), (int, float))

    def test_all_servers_have_name(self, real_index):
        """所有服务器必须有 name"""
        for s in real_index["servers"]:
            assert "name" in s and s["name"], f"Server missing name: {s}"

    def test_all_servers_have_categories(self, real_index):
        """所有服务器必须有 categories"""
        for s in real_index["servers"]:
            assert "categories" in s and isinstance(
                s["categories"], list
            ), f"Server {s.get('name')} missing categories"

    def test_all_categories_are_english(self, real_index):
        """所有分类必须是英文（无中文字符）"""
        for s in real_index["servers"]:
            for cat in s.get("categories", []):
                assert not any(
                    "\u4e00" <= c <= "\u9fff" for c in cat
                ), f"Server {s['name']} has Chinese category: {cat}"

    def test_all_servers_have_source(self, real_index):
        """所有服务器必须有 source (100% 覆盖)"""
        for s in real_index["servers"]:
            assert s.get("source"), f"Server {s.get('name')} missing source"

    def test_all_servers_have_stars(self, real_index):
        """所有服务器必须有 stars"""
        for s in real_index["servers"]:
            assert "stars" in s, f"Server {s.get('name')} missing stars"

    def test_has_readme_with_source(self, real_index):
        """有 source 的服务器 should report has_readme=True"""
        for s in real_index["servers"][:100]:
            if s.get("source"):
                server = MCPServer(s)
                assert server.has_readme() is True

    def test_to_dict_roundtrip(self, real_index):
        """to_dict 返回原始数据"""
        server_data = real_index["servers"][0]
        server = MCPServer(server_data)
        assert server.to_dict()["name"] == server_data["name"]
        assert server.to_dict()["stars"] == server_data.get("stars", 0)


class TestMCPHub:
    """测试 MCPHub 类 - 使用真实索引"""

    def test_load_real_index(self, real_market):
        """加载真实索引，服务器数量正确"""
        assert len(real_market.servers) > 0
        # 应该和索引中的 total_servers 一致
        with open(INDEX_FILE) as f:
            data = json.load(f)
        assert len(real_market.servers) == data["total_servers"]

    def test_index_version(self, real_index):
        """索引版本应该是 2.0.0"""
        assert real_index["version"] == "2.0.0"

    def test_index_has_sync_metadata(self, real_index):
        """索引应该有同步元数据"""
        assert "last_sync" in real_index
        assert "upstream_total" in real_index
        assert real_index["upstream_total"] > 0

    def test_get_servers_by_type(self, real_market):
        """按语言分组"""
        groups = real_market.get_servers_by_type()
        assert len(groups) > 0
        total = sum(len(v) for v in groups.values())
        assert total == len(real_market.servers)

    def test_get_servers_by_category(self, real_market):
        """按分类获取"""
        dev = real_market.get_servers_by_category("development")
        assert len(dev) > 0
        for s in dev:
            assert any("development" in c.lower() for c in s.categories)

    def test_search_by_name(self, real_market):
        """按名称搜索"""
        results = real_market.search("github")
        assert len(results) > 0
        assert any("github" in r.name.lower() for r in results)

    def test_search_by_owner(self, real_market):
        """按 owner 搜索"""
        results = real_market.search("modelcontextprotocol")
        assert len(results) > 0

    def test_search_by_description(self, real_market):
        """按描述搜索"""
        results = real_market.search("browser")
        assert len(results) > 0

    def test_search_case_insensitive(self, real_market):
        """大小写不敏感"""
        r1 = real_market.search("GITHUB")
        r2 = real_market.search("github")
        assert len(r1) == len(r2)

    def test_search_no_match(self, real_market):
        """无匹配"""
        results = real_market.search("zzzzzzz-nonexistent-xyz")
        assert len(results) == 0

    def test_get_server_exists(self, real_market):
        """获取存在的服务器"""
        first_name = list(real_market.servers.keys())[0]
        server = real_market.get_server(first_name)
        assert server is not None
        assert server.name == first_name

    def test_get_server_not_exists(self, real_market):
        """获取不存在的服务器"""
        assert real_market.get_server("nonexistent-xyz-12345") is None

    def test_generate_config_for_known_server(self, real_market):
        """为已知服务器生成配置"""
        # Use a server name that exists in the index
        first_name = list(real_market.servers.keys())[0]
        config = real_market.generate_config(first_name)
        assert config is not None
        assert "command" in config

    def test_generate_claude_config(self, real_market):
        """生成 Claude 配置"""
        names = list(real_market.servers.keys())[:2]
        config = real_market.generate_claude_config(names)
        assert "mcpServers" in config
        assert names[0] in config["mcpServers"]

    def test_get_stats(self, real_market):
        """统计信息"""
        stats = real_market.get_stats()
        assert stats["total"] == len(real_market.servers)
        assert "by_type" in stats
        assert "by_category" in stats
        assert "by_source" in stats

    def test_get_categories(self, real_market):
        """分类统计"""
        cats = real_market.get_categories()
        assert len(cats) > 0
        assert sum(cats.values()) >= len(real_market.servers)

    def test_export_index(self, real_market, tmp_path):
        """导出索引"""
        output = real_market.export_index(tmp_path / "export.json")
        assert output.exists()
        with open(output) as f:
            data = json.load(f)
        assert data["version"] == "2.0.0"
        assert data["total_servers"] == len(real_market.servers)

    def test_reload(self, real_market, tmp_path):
        """重新加载"""
        count_before = len(real_market.servers)
        assert count_before > 0
        real_market.reload()
        assert len(real_market.servers) == count_before
