"""Unit tests for the 5-factor recommendation scoring."""

import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "tools"))

from completeness_scoring import (  # noqa: E402
    compute_score,
    _norm_log,
    _recency,
    _lang_coverage,
    _desc_quality,
    WEIGHTS,
)


def _server(**kw):
    base = {
        "name": "demo",
        "stars": 1000,
        "language": "python",
        "description": "x" * 250,
        "updated_at": "2026-06-10",
    }
    base.update(kw)
    return base


class TestNormLog:
    def test_zero_stars(self):
        assert _norm_log(0) == 0.0

    def test_ten_k_stars_is_near_one(self):
        # 10k stars -> log(10001) / log(10001) ~= 1.0
        assert _norm_log(10_000) > 0.99

    def test_hundred_stars(self):
        # log(101) / log(10001) ~ 0.5
        v = _norm_log(100)
        assert 0.45 < v < 0.55


class TestRecency:
    def test_today_is_near_one(self):
        # A few hours of drift on a 30-day half-life is
        # negligible (0.5^(hours/24/30) ≈ 0.99 for 12h).
        today = "2026-06-10T00:00:00+00:00"
        now = datetime(2026, 6, 10, 12, 0, tzinfo=timezone.utc)
        assert _recency(today, now=now) > 0.98

    def test_thirty_days_ago_is_half(self):
        old = "2026-05-11T00:00:00+00:00"
        now = datetime(2026, 6, 10, tzinfo=timezone.utc)
        v = _recency(old, half_life_days=30, now=now)
        assert 0.49 < v < 0.51

    def test_empty_string_is_zero(self):
        assert _recency("") == 0.0

    def test_garbage_string_is_zero(self):
        assert _recency("not-a-date") == 0.0


class TestLangCoverage:
    def test_known(self):
        assert _lang_coverage("Python") == 1.0

    def test_unknown(self):
        assert _lang_coverage("unknown") == 0.0

    def test_empty(self):
        assert _lang_coverage("") == 0.0


class TestDescQuality:
    def test_empty(self):
        assert _desc_quality("") == 0.0

    def test_short(self):
        v = _desc_quality("hi")
        assert 0.0 < v < 0.2

    def test_good(self):
        v = _desc_quality("x" * 200)
        assert 0.85 < v < 0.95

    def test_great(self):
        v = _desc_quality("x" * 600)
        assert v == 1.0


class TestComputeScore:
    def test_perfect_score(self):
        now = datetime(2026, 6, 10, tzinfo=timezone.utc)
        result = compute_score(
            _server(
                stars=20_000,
                language="python",
                description="x" * 600,
                updated_at="2026-06-10",
            ),
            our_signal=1.0,
            now=now,
        )
        assert 95 <= result["score"] <= 100

    def test_zero_signal_still_scores(self):
        # Upstream-only servers should still get a respectable score
        # from stars + recency + description alone.
        now = datetime(2026, 6, 10, tzinfo=timezone.utc)
        result = compute_score(
            _server(stars=5000, description="x" * 250, updated_at="2026-06-10"),
            our_signal=0.0,
            now=now,
        )
        assert 50 <= result["score"] <= 90

    def test_our_signal_dominates(self):
        # Two otherwise-identical servers, one with our_signal=0 and
        # one with our_signal=1, should differ by roughly 0.20 * 100
        # = 20 points (our_signal's weight in the score).
        now = datetime(2026, 6, 10, tzinfo=timezone.utc)
        server = _server(stars=2000, description="x" * 200, updated_at="2026-06-10")
        a = compute_score(server, our_signal=0.0, now=now)["score"]
        b = compute_score(server, our_signal=1.0, now=now)["score"]
        assert 18 <= b - a <= 22

    def test_breakdown_keys_present(self):
        now = datetime(2026, 6, 10, tzinfo=timezone.utc)
        result = compute_score(_server(), our_signal=0.0, now=now)
        assert set(result["score_breakdown"].keys()) == set(WEIGHTS.keys())

    def test_our_signal_clamped(self):
        now = datetime(2026, 6, 10, tzinfo=timezone.utc)
        # Negative or >1 signals shouldn't break the math
        a = compute_score(_server(), our_signal=-0.5, now=now)
        b = compute_score(_server(), our_signal=2.0, now=now)
        assert 0 <= a["score"] <= 100
        assert 0 <= b["score"] <= 100
