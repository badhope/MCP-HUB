"""
Per-server install-hint generator.

Pure functions, no I/O. Picks the best command to suggest for a given
server record based on its `language` and `source` fields. Used by
`gen_static_data.py` at build time so the frontend never has to
re-derive this at runtime.

Why a separate file: this is the one piece of business logic that's
both data-driven and easy to unit-test in isolation. The other
generator pieces (category inference, source-type detection) already
live in `sync_index.py` and are tested implicitly through the sync
pipeline; install-hint is novel here so it gets its own home.
"""

from __future__ import annotations
import re
from typing import Any, Dict, Optional


_JS_LANGS = {
    "javascript", "typescript", "nodejs", "node", "ts", "js",
    "vue", "svelte",
}
_PY_LANGS = {"python", "py"}
_GO_LANGS = {"go", "golang"}
_RUST_LANGS = {"rust"}


def _is_github_source(source: str) -> bool:
    if not source:
        return False
    s = source.lower()
    return "github.com" in s or "githubusercontent.com" in s


def _is_pypi_url(source: str) -> bool:
    if not source:
        return False
    return "pypi.org" in source.lower() or "pypi.python.org" in source.lower()


def _is_npm_url(source: str) -> bool:
    if not source:
        return False
    return "npmjs.com" in source.lower() or "npm.im" in source.lower()


def _repo_zip_url(source: str) -> Optional[str]:
    """
    Derive GitHub codeload ZIP URL.

    `https://github.com/owner/repo` -> `https://codeload.github.com/owner/repo/zip/refs/heads/main`.
    Returns None if the source isn't on github.com.
    """
    if not source:
        return None
    m = re.match(
        r"^https?://github\.com/([\w.\-]+)/([\w.\-]+?)(?:\.git)?/?$",
        source.strip(),
    )
    if not m:
        return None
    owner, repo = m.group(1), m.group(2)
    return f"https://codeload.github.com/{owner}/{repo}/zip/refs/heads/main"


def build_install_hint(server: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build the install-hint block for a single server.

    Output shape (matches the field in `frontend/public/servers-index.json`):
        {
          "primary": "uvx fastmcp",          # the recommended command
          "alternatives": {                   # other ways to get it
            "npm": "npm install -g fastmcp",  # null if not applicable
            "pip": "pip install fastmcp",
            "git": "git clone https://...",
            "docker": null,
          },
          "zip_url": "https://codeload.github.com/owner/repo/zip/...",
        }

    The primary command is the one the user would actually type first.
    For Python projects that's `uvx <repo>` (modern convention; works
    without a prior install). For JS/TS it's `npx -y <repo>`. For
    Go/Rust it's the bare repo name (assumed to be a pre-built binary
    or a tool the user installs separately). For unknown languages we
    fall back to `git clone` so there's at least a useful pointer.
    """
    language = (server.get("language") or "").lower()
    source = server.get("source") or ""
    name = server.get("name") or server.get("full_name") or ""

    primary = ""
    alts: Dict[str, Optional[str]] = {
        "npm": None,
        "pip": None,
        "git": None,
        "docker": None,
    }

    if language in _JS_LANGS or _is_npm_url(source):
        primary = f"npx -y {name}"
        if language in _JS_LANGS:
            alts["npm"] = f"npm install -g {name}"
        elif _is_npm_url(source):
            alts["npm"] = f"npm install -g {name}"
    elif language in _PY_LANGS or _is_pypi_url(source):
        primary = f"uvx {name}"
        alts["pip"] = f"pip install {name}"
    elif language in _GO_LANGS:
        primary = name
    elif language in _RUST_LANGS:
        primary = name
    else:
        # Unknown language — point at the repo so the user can figure
        # it out from the upstream README. We deliberately don't
        # fabricate an install command we can't actually run.
        primary = ""

    if _is_github_source(source):
        alts["git"] = f"git clone {source.rstrip('/')}.git" if not source.endswith(".git") else f"git clone {source}"

    return {
        "primary": primary,
        "alternatives": alts,
        "zip_url": _repo_zip_url(source),
    }
