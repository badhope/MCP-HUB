"""
Unit tests for the server-config builder.

The builder used to live inline in the `/config/{name}` route handler
with a hard-coded `command: "mcp-server"` placeholder — which is what
README described as "copy-paste ready" (it wasn't). After the refactor
the builder is a pure function exported from `main.py`; these tests
cover the new behaviour:

  - command is generated from `language` (npx for JS, uvx for Python, …)
  - install hints use the same primary signal (no more spurious pip)
  - `snippets.basic` and `mcpServers` agree (no more internal contradiction)
  - missing fields don't crash (degraded, not broken)
"""

from main import _build_run_command, _is_python_project, build_server_config


class TestIsPythonProject:
    def test_explicit_python_language(self):
        assert _is_python_project("python", "", "")

    def test_py_alias(self):
        assert _is_python_project("py", "", "")

    def test_pypi_url(self):
        assert _is_python_project("javascript", "https://pypi.org/project/x", "")

    def test_javascript_is_not_python(self):
        assert not _is_python_project("javascript", "", "")

    def test_typescript_is_not_python(self):
        assert not _is_python_project("typescript", "", "")

    def test_description_mentioning_pyproject_does_not_overmatch(self):
        # The old code marked any server with the substring "pyproject.toml"
        # in its description as Python — even when `language` was empty.
        # The new code only falls back to that heuristic when language is empty,
        # so an explicit "javascript" with a passing reference to pyproject
        # in the description stays non-Python.
        assert not _is_python_project("javascript", "", "uses pyproject.toml in CI")

    def test_empty_language_with_description_heuristic(self):
        assert _is_python_project("", "", "managed with pyproject.toml")

    def test_empty_inputs_default_to_false(self):
        assert not _is_python_project("", "", "")


class TestBuildRunCommand:
    def test_typescript_uses_npx(self):
        assert _build_run_command("typescript", "my-server") == "npx -y my-server"

    def test_javascript_uses_npx(self):
        assert _build_run_command("javascript", "my-server") == "npx -y my-server"

    def test_python_uses_uvx(self):
        assert _build_run_command("python", "my-server") == "uvx my-server"

    def test_unknown_language_falls_back_to_repo_name(self):
        assert _build_run_command("cobol", "my-server") == "my-server"

    def test_empty_language_falls_back_to_repo_name(self):
        assert _build_run_command("", "my-server") == "my-server"

    def test_no_placeholder_mcp_server_anywhere(self):
        # Regression guard: the old code returned "mcp-server" verbatim for
        # every server, regardless of language. Catch any regression.
        for lang in ("python", "javascript", "typescript", "go", "rust", "", "cobol"):
            cmd = _build_run_command(lang, "anything")
            assert cmd != "mcp-server", f"placeholder leaked for language={lang!r}"


class TestBuildServerConfig:
    def _server(self, **overrides):
        base = {
            "name": "my-server",
            "full_name": "acme/my-server",
            "source": "https://github.com/acme/my-server",
            "description": "An MCP server",
            "source_type": "community",
            "categories": [],
            "language": "python",
            "stars": 0,
            "owner": "acme",
            "topics": [],
            "updated_at": "",
            "created_at": "",
            "archived": False,
            "license": None,
        }
        base.update(overrides)
        return base

    def test_python_server_returns_uvx_command(self):
        cfg = build_server_config(self._server(language="python"))
        assert cfg.mcpServers == {
            "my-server": {"command": "uvx my-server", "args": []}
        }
        assert "pip" in cfg.install
        assert "git" in cfg.install

    def test_javascript_server_returns_npx_command(self):
        cfg = build_server_config(self._server(language="javascript"))
        assert cfg.mcpServers == {
            "my-server": {"command": "npx -y my-server", "args": []}
        }
        assert "npm" in cfg.install
        assert "pip" not in cfg.install  # regression: no spurious pip

    def test_typescript_server_returns_npx_command(self):
        cfg = build_server_config(self._server(language="typescript"))
        assert cfg.mcpServers["my-server"]["command"] == "npx -y my-server"
        assert "pip" not in cfg.install

    def test_snippet_matches_mcp_servers(self):
        # Regression: the old `snippets.basic` had `command: repo_name`
        # while `mcpServers` had `command: "mcp-server"` — internally
        # contradictory. The snippet is a full paste-ready JSON block, so
        # we compare its `mcpServers` key to the model's `mcpServers`.
        import json

        cfg = build_server_config(self._server(language="python"))
        snippet = json.loads(cfg.snippets["basic"])
        assert snippet["mcpServers"] == cfg.mcpServers

    def test_no_placeholder_in_command(self):
        # End-to-end regression: nowhere in the produced config should the
        # literal "mcp-server" appear (it used to be the universal placeholder).
        cfg = build_server_config(self._server(language="javascript"))
        for entry in cfg.mcpServers.values():
            assert entry["command"] != "mcp-server"

    def test_missing_optional_fields_do_not_crash(self):
        cfg = build_server_config(
            {"name": "x", "language": "python", "source": "", "description": ""}
        )
        assert cfg.mcpServers["x"]["command"] == "uvx x"
        # No `git` install hint when source is empty.
        assert "git" not in cfg.install

    def test_docker_image_uses_owner_and_name(self):
        cfg = build_server_config(self._server(owner="acme", name="widget"))
        assert cfg.docker["image"] == "acme/widget:latest"

    def test_install_commands_have_no_placeholder(self):
        cfg = build_server_config(self._server(language="python"))
        joined = " ".join(cfg.commands["install"])
        assert "mcp-server" not in joined
