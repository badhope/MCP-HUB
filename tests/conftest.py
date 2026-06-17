"""
Pytest 配置 - 添加项目根目录到 Python 路径
"""

import sys
from pathlib import Path

import pytest

project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# servers-index.json is a runtime-generated file (produced by
# tools/update_index.py / tools/sync_index.py and .gitignore'd). A fresh clone
# won't have it, so data-dependent integration tests would fail with
# FileNotFoundError / empty-result assertions rather than real regressions.
INDEX_FILE = project_root / "servers-index.json"


def pytest_collection_modifyitems(config, items):
    """Skip data-dependent integration tests when the index file is absent.

    Several test modules are designed to run against a real servers-index.json
    snapshot (see .gitignore — it's built by tools/update_index.py). When it's
    missing they fail for environmental reasons (`assert 0 > 0`,
    `IndexError`, `catalog must have at least 2 servers`), not code
    regressions — so skip them with a clear message instead of reporting
    false failures.
    """
    if INDEX_FILE.exists():
        return
    skip_marker = pytest.mark.skip(
        reason="servers-index.json missing — run `python tools/update_index.py` "
        "to fetch the latest snapshot from the upstream registry."
    )
    # Whole modules that need a populated index to make any meaningful
    # assertion (every test in them reads from the server catalog).
    data_dependent_modules = {
        "tests.test_api",
        "tests.test_core",
        "tests.test_fastapi",
        "tests.test_query",
        "tests.test_export",
    }
    # Granular skips inside test_user_functions: most user-function tests
    # (favorites, ratings, comments, submissions) work without server data,
    # but a handful of "enhanced" endpoints require a populated catalog.
    data_dependent_tests = {
        "test_compare_servers",
        "test_get_similar_servers",
    }
    for item in items:
        if item.module.__name__ in data_dependent_modules:
            item.add_marker(skip_marker)
        elif item.module.__name__ == "tests.test_user_functions" and (
            item.name in data_dependent_tests or item.name.split("[")[0] in data_dependent_tests
        ):
            item.add_marker(skip_marker)
