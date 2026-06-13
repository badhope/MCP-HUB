"""
Multi-factor recommendation scoring for MCP servers.

The 5-factor weighted score in `REFACTOR_PLAN.md §3` is implemented here.
Each factor is normalized to [0.0, 1.0]; the final score is a 0-100
integer for display.

Pure functions, no I/O. Called from `gen_static_data.py` at build time
so the frontend can read pre-computed scores and avoid re-running the
math on every page load.
"""

from __future__ import annotations
import math
from datetime import datetime, timezone
from typing import Any, Dict

WEIGHTS = {
    "stars": 0.30,
    "recency": 0.15,
    "lang_coverage": 0.15,
    "desc_quality": 0.20,
    "our_signal": 0.20,
}

# Stars log-base tuned so 10k stars ≈ 1.0 and 100 stars ≈ 0.5.
_STARS_LOG_BASE = math.log(1 + 10_000)

# Description quality thresholds.
_DESC_MIN_CHARS = 60
_DESC_GOOD_CHARS = 200
_DESC_GREAT_CHARS = 500


def _norm_log(stars: int) -> float:
    """Log-normalized GitHub stars: 10k -> 1.0, 100 -> 0.5, 10 -> 0.25."""
    if stars is None or stars <= 0:
        return 0.0
    return min(1.0, math.log(1 + stars) / _STARS_LOG_BASE)


def _recency(updated_at: str, half_life_days: int = 30, now: datetime | None = None) -> float:
    """Exponential decay: a server updated `half_life_days` ago scores 0.5."""
    if not updated_at:
        return 0.0
    try:
        # Accept both "2026-06-10" and full ISO 8601.
        if "T" in updated_at:
            d = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
        else:
            d = datetime.fromisoformat(updated_at).replace(tzinfo=timezone.utc)
    except (ValueError, AttributeError):
        return 0.0
    if now is None:
        now = datetime.now(timezone.utc)
    age_days = max(0.0, (now - d).total_seconds() / 86400.0)
    return math.pow(0.5, age_days / half_life_days)


def _lang_coverage(language: str) -> float:
    """
    Whether the language field is populated with a recognizable value.
    `unknown` and empty both score 0; everything else scores 1.

    The upstream index populates `language` for ~100% of entries, so
    in practice this factor is almost always 1.0 or 0.0. It's still
    a useful signal for the rare entry that escapes the sync pipeline
    with a missing language.
    """
    if not language:
        return 0.0
    return 0.0 if language.lower() in ("unknown", "n/a", "none", "null", "") else 1.0


def _desc_quality(description: str) -> float:
    """
    Sigmoid-ish ramp on description length. Sub-60 chars scores 0;
    200 chars scores ~0.7; 500+ chars scores 1.0.
    """
    if not description:
        return 0.0
    n = len(description)
    if n < _DESC_MIN_CHARS:
        # Linear ramp 0 -> 1 across [0, 60]
        return n / _DESC_MIN_CHARS * 0.5
    if n < _DESC_GOOD_CHARS:
        # 60 -> 200: 0.5 -> 0.9
        return 0.5 + (n - _DESC_MIN_CHARS) / (_DESC_GOOD_CHARS - _DESC_MIN_CHARS) * 0.4
    if n < _DESC_GREAT_CHARS:
        # 200 -> 500: 0.9 -> 1.0
        return 0.9 + (n - _DESC_GOOD_CHARS) / (_DESC_GREAT_CHARS - _DESC_GOOD_CHARS) * 0.1
    return 1.0


def compute_score(
    server: Dict[str, Any], our_signal: float, now: datetime | None = None
) -> Dict[str, Any]:
    """
    Return the score and its per-factor breakdown for a single server.

    `our_signal` is passed in (not computed here) because it requires
    filesystem knowledge of which adapters exist; the caller is
    `gen_static_data.py` which already has that context.
    """
    breakdown = {
        "stars": _norm_log(server.get("stars") or 0),
        "recency": _recency(server.get("updated_at") or "", now=now),
        "lang_coverage": _lang_coverage(server.get("language") or ""),
        "desc_quality": _desc_quality(server.get("description") or ""),
        "our_signal": max(0.0, min(1.0, our_signal)),
    }
    weighted = sum(breakdown[k] * WEIGHTS[k] for k in WEIGHTS)
    return {
        "score": round(weighted * 100),
        "score_breakdown": {k: round(v, 3) for k, v in breakdown.items()},
    }
