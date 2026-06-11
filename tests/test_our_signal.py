"""Unit tests for the our_signal scanner.

The scanner walks frontend/public/adapters/<name>/adapter.json at
build time and returns the per-server our_signal value (0.0 / 0.4 /
0.7 / 1.0). The frontend surfaces this in the OurSignalBadge, the
Home "Our tools" section, and the ServerDetail UniversalConfig card.

Phase 9 caught a path bug: the original `_our_signal.py` looked at
`<root>/public/adapters/` (Phase 5's location) but the SPA bundle
actually ships from `<root>/frontend/public/adapters/`. These
tests lock down the corrected location.
"""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "tools"))

from _our_signal import scan_adapters, signal_label  # noqa: E402


def _write_adapter(repo: Path, name: str, status: str, upstream: str = None) -> Path:
    adapter_dir = repo / "frontend" / "public" / "adapters" / name
    adapter_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "upstream": upstream or name,
        "name": name,
        "status": status,
    }
    (adapter_dir / "adapter.json").write_text(json.dumps(manifest))
    return adapter_dir


class TestScanAdapters:
    def test_empty_dir_returns_empty(self, tmp_path):
        (tmp_path / "frontend" / "public" / "adapters").mkdir(parents=True)
        assert scan_adapters(tmp_path) == {}

    def test_no_adapters_dir_returns_empty(self, tmp_path):
        assert scan_adapters(tmp_path) == {}

    def test_adapted_status_maps_to_1_0(self, tmp_path):
        _write_adapter(tmp_path, "fastmcp", "adapted")
        out = scan_adapters(tmp_path)
        assert out == {"fastmcp": 1.0}

    def test_in_progress_maps_to_0_7(self, tmp_path):
        _write_adapter(tmp_path, "playwright-mcp", "in_progress")
        out = scan_adapters(tmp_path)
        assert out == {"playwright-mcp": 0.7}

    def test_researched_maps_to_0_4(self, tmp_path):
        _write_adapter(tmp_path, "x", "researched")
        out = scan_adapters(tmp_path)
        assert out == {"x": 0.4}

    def test_unknown_status_maps_to_0_0(self, tmp_path):
        # A manifest with status="foo" (typo / unknown) shouldn't
        # crash; it just doesn't get credit.
        _write_adapter(tmp_path, "x", "foo")
        out = scan_adapters(tmp_path)
        assert out == {"x": 0.0}

    def test_missing_status_field_maps_to_0_0(self, tmp_path):
        adapter_dir = tmp_path / "frontend" / "public" / "adapters" / "x"
        adapter_dir.mkdir(parents=True)
        (adapter_dir / "adapter.json").write_text(json.dumps({"upstream": "x"}))
        out = scan_adapters(tmp_path)
        assert out == {"x": 0.0}

    def test_upstream_with_owner_prefix_is_stripped(self, tmp_path):
        # `upstream: jlowin/fastmcp` should map under "fastmcp" so
        # the index (which uses repo name only) picks it up.
        _write_adapter(tmp_path, "fastmcp", "adapted", upstream="jlowin/fastmcp")
        out = scan_adapters(tmp_path)
        assert out == {"fastmcp": 1.0}

    def test_missing_upstream_falls_back_to_dir_name(self, tmp_path):
        adapter_dir = tmp_path / "frontend" / "public" / "adapters" / "fastmcp"
        adapter_dir.mkdir(parents=True)
        (adapter_dir / "adapter.json").write_text(json.dumps({"status": "adapted"}))
        out = scan_adapters(tmp_path)
        assert out == {"fastmcp": 1.0}

    def test_directory_with_no_manifest_is_0_4(self, tmp_path):
        # Phase 5 spec: dir present + no manifest = "in progress".
        (tmp_path / "frontend" / "public" / "adapters" / "x").mkdir(parents=True)
        out = scan_adapters(tmp_path)
        assert out == {"x": 0.4}

    def test_malformed_json_falls_back_to_0_0(self, tmp_path):
        adapter_dir = tmp_path / "frontend" / "public" / "adapters" / "x"
        adapter_dir.mkdir(parents=True)
        (adapter_dir / "adapter.json").write_text("{ this is not json")
        out = scan_adapters(tmp_path)
        assert out == {"x": 0.0}

    def test_non_dir_entries_ignored(self, tmp_path):
        # .gitkeep and any stray files in the adapters dir should
        # not appear in the output.
        adapters = tmp_path / "frontend" / "public" / "adapters"
        adapters.mkdir(parents=True)
        (adapters / ".gitkeep").write_text("")
        (adapters / "README.md").write_text("not an adapter")
        _write_adapter(tmp_path, "real", "adapted")
        out = scan_adapters(tmp_path)
        assert out == {"real": 1.0}

    def test_multiple_adapters(self, tmp_path):
        _write_adapter(tmp_path, "a", "adapted")
        _write_adapter(tmp_path, "b", "in_progress")
        _write_adapter(tmp_path, "c", "researched")
        out = scan_adapters(tmp_path)
        assert out == {"a": 1.0, "b": 0.7, "c": 0.4}


class TestSignalLabel:
    """signal_label maps the numeric value back to a Chinese label
    for the OurSignalBadge. Boundary checks."""

    def test_1_0_is_adapted(self):
        assert signal_label(1.0) == "已适配"

    def test_0_9_is_adapted(self):
        # Threshold: >= 0.9
        assert signal_label(0.9) == "已适配"

    def test_0_89_is_in_progress(self):
        assert signal_label(0.89) == "适配中"

    def test_0_7_is_in_progress(self):
        assert signal_label(0.7) == "适配中"

    def test_0_6_is_in_progress(self):
        # Threshold: >= 0.6
        assert signal_label(0.6) == "适配中"

    def test_0_59_is_researched(self):
        assert signal_label(0.59) == "调研过"

    def test_0_4_is_researched(self):
        assert signal_label(0.4) == "调研过"

    def test_0_3_is_researched(self):
        # Threshold: >= 0.3
        assert signal_label(0.3) == "调研过"

    def test_0_29_is_unknown(self):
        assert signal_label(0.29) == "未处理"

    def test_zero_is_unknown(self):
        assert signal_label(0.0) == "未处理"
