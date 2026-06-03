"""
Tests for the secret scanner.

Verifies that the scanner detects real secrets and ignores placeholders
and binary files. Uses tmp_path fixtures to keep the test isolated.
"""

import subprocess
import sys
from pathlib import Path

SCANNER = Path(__file__).parent.parent / "tools" / "secret_scanner.py"


def _write(tmp_path: Path, name: str, content: str) -> Path:
    p = tmp_path / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)
    return p


def _run_scanner(root: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCANNER), str(root), "--quiet"],
        capture_output=True,
        text=True,
    )


def test_scanner_detects_github_pat(tmp_path):
    _write(tmp_path, "leak.py", 'TOKEN = "ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789ab"\n')
    result = _run_scanner(tmp_path)
    assert (
        result.returncode == 1
    ), f"expected exit 1, got {result.returncode}\nstderr: {result.stderr}"
    assert "GitHub PAT" in result.stderr
    assert "leak.py" in result.stderr


def test_scanner_detects_openai_key(tmp_path):
    _write(
        tmp_path,
        "config.py",
        'OPENAI = "sk-proj-aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789aBcDeFgHiJk"\n',
    )
    result = _run_scanner(tmp_path)
    assert result.returncode == 1
    assert "OpenAI" in result.stderr


def test_scanner_detects_private_key(tmp_path):
    _write(
        tmp_path,
        "key.pem",
        "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAK...\n-----END RSA PRIVATE KEY-----\n",
    )
    result = _run_scanner(tmp_path)
    assert result.returncode == 1
    assert "Private Key" in result.stderr


def test_scanner_detects_password_in_url(tmp_path):
    _write(tmp_path, "config.py", 'DB = "postgresql://admin:hunter2@db.example.com:5432/app"\n')
    result = _run_scanner(tmp_path)
    assert result.returncode == 1
    assert "Password in URL" in result.stderr


def test_scanner_ignores_placeholders(tmp_path):
    _write(tmp_path, "config.py", "TOKEN = 'your_github_token_here'\nAPI_KEY = 'changeme'\n")
    result = _run_scanner(tmp_path)
    assert result.returncode == 0, f"false positive:\n{result.stderr}"


def test_scanner_ignores_https_urls(tmp_path):
    _write(
        tmp_path,
        "config.py",
        'GITHUB = "https://github.com/owner/repo"\nSOURCE = "https://example.com/page"\n',
    )
    result = _run_scanner(tmp_path)
    assert result.returncode == 0, f"false positive:\n{result.stderr}"


def test_scanner_clean_directory(tmp_path):
    _write(tmp_path, "app.py", "x = 1\ny = 'hello'\nz = [1, 2, 3]\n")
    result = _run_scanner(tmp_path)
    assert result.returncode == 0
    # In --quiet mode, scanner produces no output on success
    assert result.stdout == "" and result.stderr == ""


def test_scanner_clean_directory_verbose(tmp_path):
    _write(tmp_path, "app.py", "x = 1\ny = 'hello'\n")
    result = subprocess.run(
        [sys.executable, str(SCANNER), str(tmp_path)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    assert "OK" in result.stdout


def test_scanner_handles_binary_files(tmp_path):
    # PNG header bytes
    binary = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
    p = tmp_path / "image.png"
    p.write_bytes(binary)
    result = _run_scanner(tmp_path)
    assert result.returncode == 0


def test_scanner_skips_node_modules(tmp_path):
    nm = tmp_path / "node_modules" / "leaked"
    nm.mkdir(parents=True)
    _write(nm, "config.js", 'const TOKEN = "ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789ab";\n')
    result = _run_scanner(tmp_path)
    assert result.returncode == 0, "node_modules should be ignored"


def test_scanner_skips_git_directory(tmp_path):
    gitdir = tmp_path / ".git" / "objects"
    gitdir.mkdir(parents=True)
    _write(gitdir, "pack", "ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789ab\n")
    result = _run_scanner(tmp_path)
    assert result.returncode == 0


def test_scanner_reports_line_number(tmp_path):
    _write(
        tmp_path,
        "leak.py",
        "x = 1\ny = 2\nTOKEN = 'ghp_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789ab'\nz = 4\n",
    )
    result = _run_scanner(tmp_path)
    assert result.returncode == 1
    assert "leak.py:3" in result.stderr


def test_scanner_exits_with_error_on_missing_path(tmp_path):
    result = subprocess.run(
        [sys.executable, str(SCANNER), str(tmp_path / "nonexistent"), "--quiet"],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 2
