"""Replace all 'mcp-hub' / 'MCP Hub' / 'MCP-HUB' / 'mcp_hub' references
with the new 'MCP-HUB' brand across the project.

Replacement map (order matters — most specific first):

    badhope/MCP-HUB         -> badhope/MCP-HUB
    MCP-HUB                  -> MCP-HUB
    mcp-hub                  -> mcp-hub
    mcp_hub                  -> mcp_hub
    MCP Hub                  -> MCP Hub
    MCP Hub                  -> MCP Hub
    MCP 市场                    -> MCP 中心
    万能 MCP 中心             -> 万能 MCP 中心
    MCP-HUB                  -> MCP-HUB   (uppercase variant)
    MCP-HUB                  -> MCP-HUB   (all caps)

Skip auto-generated / untracked:
    .git/, node_modules/, dist/, __pycache__/, .mypy_cache/, .pytest_cache/,
    .trae/, mcp_hub.egg-info/, servers-index.json, .env*
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()

SKIP_DIRS = {
    ".git", "node_modules", "dist", "__pycache__", ".mypy_cache",
    ".pytest_cache", ".trae", "mcp_hub.egg-info", "mcp_hub.egg-info",
    ".vscode", ".idea",
}

SKIP_FILE_SUFFIXES = {
    ".pyc", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg",
    ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".webp",
}

SKIP_FILE_EXACT = {
    "servers-index.json", "market-index.json", "package-lock.json",
    "yarn.lock", "pnpm-lock.yaml", "user-data.json", "submissions.json",
    "social-preview.png",  # avoid byte-level corruption if any
}

# (regex, replacement, flags) — applied in order
REPLACEMENTS = [
    # Most specific first
    (r"badhope/MCP-HUB", r"badhope/MCP-HUB", 0),
    (r"badhope/mcp-hub", r"badhope/mcp-hub", 0),
    (r"MCP-HUB", r"MCP-HUB", 0),
    (r"MCP-HUB", r"MCP-HUB", 0),
    (r"MCP-HUB", r"MCP-HUB", 0),
    (r"mcp_hub", r"mcp_hub", 0),
    (r"mcp-hub", r"mcp-hub", 0),
    # Display text (must come after the identifier forms so we don't double-replace)
    (r"MCP Hub", r"MCP Hub", 0),
    (r"万能 MCP 中心", r"万能 MCP 中心", 0),
    (r"MCP 中心", r"MCP 中心", 0),
    (r"MCP中心", r"MCP中心", 0),
]

# Compile
PATTERNS = [(re.compile(p), r) for p, r, _ in REPLACEMENTS]


def should_skip(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    for part in rel.parts:
        if part in SKIP_DIRS:
            return True
    if path.suffix.lower() in SKIP_FILE_SUFFIXES:
        return True
    if path.name in SKIP_FILE_EXACT:
        return True
    return False


def transform(text: str) -> tuple[str, int]:
    total = 0
    for pat, rep in PATTERNS:
        text, n = pat.subn(rep, text)
        total += n
    return text, total


def main() -> None:
    changed = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue
        if should_skip(path):
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        new, n = transform(content)
        if n > 0 and new != content:
            path.write_text(new, encoding="utf-8")
            changed.append((str(path.relative_to(ROOT)), n))
    print(f"Modified {len(changed)} files:")
    for p, n in changed:
        print(f"  {n:4d}  {p}")


if __name__ == "__main__":
    main()
