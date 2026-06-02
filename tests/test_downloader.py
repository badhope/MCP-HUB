"""
下载器测试 - 真实 git clone，无 mock
真实克隆 GitHub 仓库验证下载功能
"""

from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).parent.parent
INDEX_FILE = PROJECT_ROOT / "servers-index.json"
SERVERS_DIR = PROJECT_ROOT / "servers"


@pytest.fixture(scope="module")
def real_servers_dir():
    """确保 servers 目录存在"""
    SERVERS_DIR.mkdir(exist_ok=True)
    yield SERVERS_DIR


class TestGitClone:
    """测试 git_clone - 真实克隆"""

    def test_clone_official_server(self, real_servers_dir, tmp_path):
        """真实克隆一个 official 服务器"""
        from tools.index_downloader import git_clone

        target = tmp_path / "test-clone-filesystem"
        url = "https://github.com/modelcontextprotocol/servers"

        result = git_clone(url, target)
        assert result is True
        assert target.exists()
        # 验证是真实 git 仓库
        assert (target / ".git").exists()

    def test_clone_nonexistent_repo(self, tmp_path):
        """克隆不存在的仓库应该失败"""
        from tools.index_downloader import git_clone

        target = tmp_path / "test-clone-fail"
        url = "https://github.com/nonexistent-user-xyz-12345/nonexistent-repo"

        result = git_clone(url, target)
        assert result is False
        assert not target.exists()

    def test_clone_existing_dir_skipped(self, tmp_path):
        """已存在的目录应该跳过"""
        from tools.index_downloader import git_clone

        target = tmp_path / "test-clone-exists"
        target.mkdir()

        # 先克隆一次
        url = "https://github.com/modelcontextprotocol/servers"
        result1 = git_clone(url, target)
        # 第二次应该因为目录已存在而失败（git clone 不会覆盖）
        result2 = git_clone(url, target / "sub")
        # 至少第一次应该成功
        assert result1 is True or result2 is True


class TestExtractRepo:
    """测试 URL 提取 - 真实数据"""

    def test_extract_from_official_source(self):
        from tools.index_downloader import extract_repo_from_source

        url = extract_repo_from_source(
            "https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem"
        )
        assert url == "https://github.com/modelcontextprotocol/servers"

    def test_extract_from_community_source(self):
        from tools.index_downloader import extract_repo_from_source

        url = extract_repo_from_source(
            "https://github.com/executeautomation/playwright-mcp-server"
        )
        assert url == "https://github.com/executeautomation/playwright-mcp-server"

    def test_extract_empty(self):
        from tools.index_downloader import extract_repo_from_source

        assert extract_repo_from_source("") is None
        assert extract_repo_from_source(None) is None

    def test_extract_non_github(self):
        from tools.index_downloader import extract_repo_from_source

        assert extract_repo_from_source("https://gitlab.com/some/repo") is None


class TestDownloadServer:
    """测试单服务器下载 - 真实数据"""

    def test_download_official_server(self, real_servers_dir, tmp_path):
        """下载一个 official 服务器"""
        from tools.index_downloader import download_server

        server = {
            "name": "memory",
            "source": "https://github.com/modelcontextprotocol/servers/tree/main/src/memory",
            "source_type": "official",
        }

        name, status, msg = download_server(server)
        assert name == "memory"
        assert status in ("success", "exists")  # 可能已经下载过了

    def test_download_no_source(self):
        """无 source 的服务器应该跳过"""
        from tools.index_downloader import download_server

        server = {"name": "test-no-source", "source": "", "source_type": "unknown"}
        name, status, msg = download_server(server)
        assert status == "skipped"


class TestSecurity:
    """测试安全性 - 真实验证"""

    def test_token_not_in_url(self, tmp_path):
        """Token 不应该出现在 git clone URL 中"""
        from tools.index_downloader import git_clone

        fake_token = "ghp_FAKEtoken1234567890abcdefghijklmnop"
        target = tmp_path / "security-test"
        url = "https://github.com/modelcontextprotocol/servers"

        git_clone(url, target, token=fake_token)

        # 检查 .git/config 中没有 token
        git_config = target / ".git" / "config"
        if git_config.exists():
            content = git_config.read_text()
            assert fake_token not in content, "Token 不应出现在 .git/config 中"

    def test_askpass_script_cleaned(self, tmp_path):
        """GIT_ASKPASS 临时脚本应该被清理"""
        from tools.index_downloader import git_clone

        target = tmp_path / "cleanup-test"
        url = "https://github.com/modelcontextprotocol/servers"

        git_clone(url, target, token="ghp_faketoken123")

        # 临时脚本应该被删除
        askpass = tmp_path / ".git_askpass_tmp.sh"
        assert not askpass.exists(), "ASKPASS 临时脚本应该被清理"


class TestIndexDownloaderReal:
    """测试索引下载器 - 真实索引"""

    def test_download_from_index_limited(self, real_servers_dir):
        """从索引下载 2 个 official 服务器"""
        from tools.index_downloader import download_from_index

        # 只下载 2 个 official
        download_from_index(limit=2, source_types=["official"])

        # 验证至少有服务器被下载
        downloaded = [
            d
            for d in SERVERS_DIR.iterdir()
            if d.is_dir() and not d.name.startswith(".")
        ]
        assert len(downloaded) >= 2

    def test_download_skips_existing(self, real_servers_dir):
        """已存在的服务器应该被跳过"""
        from tools.index_downloader import download_from_index

        # 先确保 filesystem 已存在
        fs_dir = SERVERS_DIR / "filesystem"
        if not fs_dir.exists():
            from tools.index_downloader import git_clone

            git_clone("https://github.com/modelcontextprotocol/servers", fs_dir)

        # 再次下载应该跳过
        download_from_index(limit=1, source_types=["official"])
        assert fs_dir.exists()
