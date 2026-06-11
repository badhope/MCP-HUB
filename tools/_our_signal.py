"""
`our_signal` scanner.

Reads `frontend/public/adapters/<name>/adapter.json` files and returns
the per-server "our signal" value (0.0 / 0.4 / 0.7 / 1.0). The
mapping is in `REFACTOR_PLAN.md §3.1`.

We deliberately don't load the adapter body here — the only thing
`compute_score` needs is the signal value, and pulling 50 KB of JSON
per server to discover that a directory exists is wasteful. The full
adapter manifests are loaded by the frontend at runtime via
`fetch('/adapters/<name>/adapter.json')`.
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Dict, Optional


# Status string -> our_signal value
_STATUS_TO_SIGNAL: Dict[str, float] = {
    "adapted": 1.0,        # ✅ tested & ready
    "in_progress": 0.7,    # ⚙️ adapting now
    "researched": 0.4,     # 👀 looked at
    # "new" or missing  -> 0.0 (handled below)
}

# Human-readable label for the badge
_STATUS_TO_LABEL: Dict[str, str] = {
    "adapted": "已适配",
    "in_progress": "适配中",
    "researched": "调研过",
}


def _adapter_dir(adapters_root: Path) -> Path:
    return adapters_root / "public" / "adapters"


def scan_adapters(repo_root: Path) -> Dict[str, float]:
    """
    Walk the adapters/ directory and return a {server_name: our_signal}
    map. Missing or malformed adapter.json files map to 0.0 (treated
    as "not yet processed").
    """
    out: Dict[str, float] = {}
    root = _adapter_dir(repo_root)
    if not root.exists():
        return out
    for entry in sorted(root.iterdir()):
        if not entry.is_dir():
            continue
        manifest = entry / "adapter.json"
        if not manifest.exists():
            # Directory present but no manifest — treat as in-progress
            out[entry.name] = 0.4
            continue
        try:
            with open(manifest, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError, UnicodeDecodeError):
            out[entry.name] = 0.0
            continue
        # The `upstream` field tells us which server this adapter wraps.
        # If absent, fall back to the directory name.
        upstream = data.get("upstream") or entry.name
        # `upstream` is usually `owner/repo`; the server record uses
        # `full_name` for the same thing. Strip owner to align with
        # the `name` field the index uses.
        if "/" in upstream:
            upstream = upstream.split("/", 1)[1]
        status = (data.get("status") or "").lower()
        out[upstream] = _STATUS_TO_SIGNAL.get(status, 0.0)
    return out


def signal_label(value: float) -> str:
    """Map a numeric signal back to a Chinese label for the badge."""
    if value >= 0.9:
        return "已适配"
    if value >= 0.6:
        return "适配中"
    if value >= 0.3:
        return "调研过"
    return "未处理"


def load_manifest(repo_root: Path, server_name: str) -> Optional[Dict]:
    """
    Load the full adapter manifest for one server. Returns None if
    the server has no adapter on disk. Frontend uses this via fetch,
    not this Python helper — we keep the function here so future
    build-time tooling (badge count, sitemap, etc.) can reuse it.
    """
    root = _adapter_dir(repo_root)
    manifest = root / server_name / "adapter.json"
    if not manifest.exists():
        return None
    try:
        with open(manifest, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError, UnicodeDecodeError):
        return None
