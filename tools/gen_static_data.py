"""
Build-time pipeline: read `servers-index.json` (from sync_index.py),
decorate each server with install_hint + score + our_signal, and write
the result to `frontend/public/servers-index.json` for the SPA to
fetch at runtime.

The frontend never re-computes these fields — they're frozen at
build time. This keeps the static bundle cheap and the data
deterministic for any single snapshot.

Run order:
  1. python tools/sync_index.py     # fetches upstream, writes root
  2. python tools/gen_static_data.py  # this file: writes frontend/public

The `sync-data.yml` workflow runs both back-to-back daily.
"""

from __future__ import annotations
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

# Allow `python tools/gen_static_data.py` from the repo root.
sys.path.insert(0, str(Path(__file__).parent))

from _install_hint import build_install_hint  # noqa: E402
from _our_signal import scan_adapters, signal_label  # noqa: E402
from completeness_scoring import compute_score  # noqa: E402

_LOG = logging.getLogger("gen_static_data")
REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_INDEX = REPO_ROOT / "servers-index.json"
TARGET_INDEX = REPO_ROOT / "frontend" / "public" / "servers-index.json"


def load_source() -> Dict[str, Any]:
    if not SOURCE_INDEX.exists():
        raise FileNotFoundError(
            f"{SOURCE_INDEX} not found. Run `python tools/sync_index.py` first."
        )
    with open(SOURCE_INDEX, "r", encoding="utf-8") as f:
        return json.load(f)


def enrich_server(server: Dict[str, Any], our_signal: float, now: datetime) -> Dict[str, Any]:
    """Decorate one server record with our generated fields."""
    enriched = dict(server)  # shallow copy
    enriched["install_hint"] = build_install_hint(server)
    score = compute_score(server, our_signal=our_signal, now=now)
    enriched["score"] = score["score"]
    enriched["score_breakdown"] = score["score_breakdown"]
    enriched["our_signal"] = round(our_signal, 2)
    enriched["our_signal_label"] = signal_label(our_signal)
    return enriched


def build_static_data(
    source: Dict[str, Any], signals: Dict[str, float], now: datetime
) -> Dict[str, Any]:
    """Compose the final frontend-facing index."""
    servers_out = []
    our_tools_count = 0
    for server in source.get("servers", []):
        # The index uses `name` (e.g. "fastmcp") — that's what we keyed
        # our signals map on.
        signal = signals.get(server.get("name", ""), 0.0)
        if signal >= 0.7:
            our_tools_count += 1
        servers_out.append(enrich_server(server, our_signal=signal, now=now))

    return {
        "version": "3.0.0",
        "snapshot_date": now.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "generator": "tools/gen_static_data.py",
        "total_servers": len(servers_out),
        "total_categories": len(source.get("categories", {})),
        "our_tools_count": our_tools_count,
        "categories": source.get("categories", {}),
        "languages": source.get("languages", {}),
        "source_types": source.get("source_types", {}),
        "servers": servers_out,
    }


def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
    )
    now = datetime.now(timezone.utc)
    _LOG.info("📦 Loading source index: %s", SOURCE_INDEX)
    source = load_source()
    _LOG.info("   %d servers in source", len(source.get("servers", [])))

    _LOG.info("🔍 Scanning adapters/ for our_signal ...")
    signals = scan_adapters(REPO_ROOT)
    _LOG.info("   %d servers have an adapter on disk", len(signals))

    payload = build_static_data(source, signals, now)
    TARGET_INDEX.parent.mkdir(parents=True, exist_ok=True)
    with open(TARGET_INDEX, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = TARGET_INDEX.stat().st_size / 1024
    _LOG.info("✅ Wrote %s (%.1f KB)", TARGET_INDEX, size_kb)
    _LOG.info(
        "   %d servers (%d with our_signal ≥ 0.7)",
        payload["total_servers"],
        payload["our_tools_count"],
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
