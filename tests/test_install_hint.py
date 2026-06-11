"""Unit tests for the per-server install-hint generator."""
import sys
from pathlib import Path

# Allow `python tests/test_install_hint.py` from the repo root.
sys.path.insert(0, str(Path(__file__).parent.parent / "tools"))

from _install_hint import build_install_hint, _repo_zip_url  # noqa: E402


def _server(**kw):
    base = {
        "name": "demo",
        "full_name": "acme/demo",
        "source": "https://github.com/acme/demo",
        "language": "python",
    }
    base.update(kw)
    return base


class TestBuildInstallHint:
    def test_python_repo_gets_uvx_primary(self):
        h = build_install_hint(_server(language="python"))
        assert h["primary"] == "uvx demo"
        assert h["alternatives"]["pip"] == "pip install demo"
        assert h["alternatives"]["git"].startswith("git clone ")

    def test_javascript_repo_gets_npx(self):
        h = build_install_hint(_server(language="javascript"))
        assert h["primary"] == "npx -y demo"
        assert h["alternatives"]["npm"] == "npm install -g demo"

    def test_typescript_repo_gets_npx(self):
        h = build_install_hint(_server(language="typescript"))
        assert h["primary"] == "npx -y demo"

    def test_go_repo_uses_bare_name(self):
        h = build_install_hint(_server(language="go"))
        assert h["primary"] == "demo"

    def test_unknown_language_falls_back_to_empty(self):
        # We don't fabricate commands we can't actually run.
        h = build_install_hint(_server(language="cobol", source="https://github.com/acme/demo"))
        assert h["primary"] == ""
        assert h["alternatives"]["git"] is not None

    def test_pypi_url_overrides_unknown_language(self):
        h = build_install_hint(
            _server(language="", source="https://pypi.org/project/demo")
        )
        assert h["primary"] == "uvx demo"

    def test_npm_url_overrides_unknown_language(self):
        h = build_install_hint(
            _server(language="", source="https://www.npmjs.com/package/demo")
        )
        assert h["primary"] == "npx -y demo"

    def test_zip_url_from_github(self):
        h = build_install_hint(_server(source="https://github.com/acme/demo"))
        assert h["zip_url"] == "https://codeload.github.com/acme/demo/zip/refs/heads/main"

    def test_zip_url_handles_dot_git_suffix(self):
        h = build_install_hint(_server(source="https://github.com/acme/demo.git"))
        assert h["zip_url"] == "https://codeload.github.com/acme/demo/zip/refs/heads/main"

    def test_no_zip_url_for_non_github_source(self):
        h = build_install_hint(_server(source="https://gitlab.com/acme/demo"))
        assert h["zip_url"] is None

    def test_empty_source_yields_safe_output(self):
        h = build_install_hint(_server(source="", language="python"))
        assert h["primary"] == "uvx demo"
        assert h["alternatives"]["git"] is None
        assert h["zip_url"] is None


class TestRepoZipUrl:
    def test_basic(self):
        assert _repo_zip_url("https://github.com/foo/bar") == \
            "https://codeload.github.com/foo/bar/zip/refs/heads/main"

    def test_trailing_slash(self):
        assert _repo_zip_url("https://github.com/foo/bar/") == \
            "https://codeload.github.com/foo/bar/zip/refs/heads/main"

    def test_dot_git(self):
        assert _repo_zip_url("https://github.com/foo/bar.git") == \
            "https://codeload.github.com/foo/bar/zip/refs/heads/main"
