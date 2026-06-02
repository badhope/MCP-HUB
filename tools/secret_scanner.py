#!/usr/bin/env python3
"""
Secret Scanner - Detect accidentally committed credentials.

Scans the working tree for common secret patterns (API keys, tokens,
private keys, etc.) and reports them with file path, line number, and
context. Designed to be run in pre-commit hooks, CI, or manually.

Usage:
    python tools/secret_scanner.py [path]

Exit codes:
    0 - No secrets found
    1 - At least one potential secret detected
    2 - Scanner error
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, NamedTuple


class Finding(NamedTuple):
    file: str
    line_no: int
    pattern: str
    line: str
    matched: str


# Comprehensive pattern catalogue. Add new ones as needed.
PATTERNS: Dict[str, str] = {
    "GitHub PAT (ghp_)": r"\bghp_[A-Za-z0-9]{36,255}\b",
    "GitHub OAuth (gho_)": r"\bgho_[A-Za-z0-9]{36,255}\b",
    "GitHub App (ghu_)": r"\bghu_[A-Za-z0-9]{36,255}\b",
    "GitHub Refresh (ghr_)": r"\bghr_[A-Za-z0-9]{36,255}\b",
    "GitHub Server (ghs_)": r"\bghs_[A-Za-z0-9]{36,255}\b",
    "GitHub Fine-grained (github_pat_)": r"\bgithub_pat_[A-Za-z0-9_]{82}\b",
    "AWS Access Key ID": r"\bAKIA[0-9A-Z]{16}\b",
    "OpenAI (sk-)": r"\bsk-(?:proj-)?[A-Za-z0-9]{40,}\b",
    "Anthropic (sk-ant-)": r"\bsk-ant-[A-Za-z0-9-]{40,}\b",
    "Google API Key": r"\bAIza[0-9A-Za-z_-]{35}\b",
    "Slack Token": r"\bxox[abprs]-[A-Za-z0-9-]{20,72}\b",
    "Stripe Live Key": r"\bsk_live_[0-9a-zA-Z]{24,99}\b",
    "Stripe Test Key": r"\bsk_test_[0-9a-zA-Z]{24,99}\b",
    "Private Key (PEM)": r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----",
    "JWT Token (long)": r"\beyJ[A-Za-z0-9_-]{50,}\.eyJ[A-Za-z0-9_-]{50,}\.[A-Za-z0-9_-]{50,}\b",
    "Password in URL": r"://[A-Za-z0-9._%+\-]+:[A-Za-z0-9._%+\-]+@[A-Za-z0-9.-]+",
    "Heroku API Key": r"(?i)heroku[a-z0-9_ .\-,]{0,25}(?:api[_-]?key|token)['\"\s:=]+[A-Za-z0-9-]{20,}",
    "npm Auth Token": r"\b//registry\.npmjs\.org/:_authToken=[A-Za-z0-9-]{36,}\b",
    "PyPI Token": r"\bpypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{50,}\b",
}

# Directories that should not be scanned
EXCLUDE_DIRS = {
    "node_modules",
    ".git",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    "frontend/dist",
    "frontend/node_modules",
    "servers",
    ".venv",
    "venv",
    "env",
    "ENV",
    "dist",
    "build",
    ".cache",
}

# File extensions that are always binary / irrelevant
EXCLUDE_EXT = {
    ".pyc", ".wasm", ".map", ".lock", ".png", ".jpg", ".jpeg", ".gif",
    ".ico", ".svg", ".woff", ".woff2", ".ttf", ".eot", ".mp3", ".mp4",
    ".webm", ".zip", ".tar", ".gz", ".bz2", ".pdf", ".bin", ".so",
    ".dll", ".dylib", ".class", ".jar", ".exe",
}

# Substrings that mark a value as a placeholder (always safe to ignore)
PLACEHOLDER_HINTS = (
    "your_", "xxx", "changeme", "placeholder", "todo_replace",
    "<your", "<changeme", "example_value", "<token>",
)

# Files where example-looking secrets legitimately appear (documentation, tests).
# These must remain tracked in git so the scanner can self-verify, but should
# never cause CI to fail. Add to this list only with justification.
DOCUMENTATION_FILE_HINTS = (
    "SECURITY.md",     # pattern reference table
    "CHANGELOG.md",    # historical incident references
    "tests/test_secret_scanner.py",  # test fixtures
    "tools/secret_scanner.py",       # pattern definitions
)


def is_placeholder(value: str, line: str) -> bool:
    """Return True if a match looks like a documentation placeholder."""
    combined = (value + " " + line).lower()
    return any(p in combined for p in PLACEHOLDER_HINTS)


def scan_file(path: Path) -> List[Finding]:
    # Skip files that legitimately contain pattern examples
    if any(hint in str(path) for hint in DOCUMENTATION_FILE_HINTS):
        return []
    findings: List[Finding] = []
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except (OSError, UnicodeDecodeError):
        return findings

    for name, pattern in PATTERNS.items():
        for m in re.finditer(pattern, text):
            matched = m.group(0)
            line_no = text[: m.start()].count("\n") + 1
            line = text.splitlines()[line_no - 1].strip() if line_no <= text.count("\n") + 1 else ""
            if is_placeholder(matched, line):
                continue
            findings.append(Finding(
                file=str(path),
                line_no=line_no,
                pattern=name,
                line=line[:160],
                matched=matched[:80] + ("..." if len(matched) > 80 else ""),
            ))
    return findings


def scan(root: Path) -> List[Finding]:
    findings: List[Finding] = []
    for current, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for fname in files:
            fpath = Path(current) / fname
            if fpath.suffix in EXCLUDE_EXT:
                continue
            try:
                if fpath.stat().st_size > 5 * 1024 * 1024:
                    continue
            except OSError:
                continue
            findings.extend(scan_file(fpath))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan for accidentally committed secrets.")
    parser.add_argument("path", nargs="?", default=".", help="Root path to scan (default: cwd)")
    parser.add_argument("--quiet", action="store_true", help="Only print findings, no banner")
    args = parser.parse_args()

    root = Path(args.path).resolve()
    if not root.exists():
        print(f"ERROR: path not found: {root}", file=sys.stderr)
        return 2

    if not args.quiet:
        print(f"Scanning {root} ...")

    findings = scan(root)
    if not findings:
        if not args.quiet:
            print("OK: no secrets detected.")
        return 0

    print(f"\nFOUND {len(findings)} potential secret(s):\n", file=sys.stderr)
    for f in findings:
        print(f"  {f.file}:{f.line_no}  [{f.pattern}]", file=sys.stderr)
        print(f"    Line:   {f.line}", file=sys.stderr)
        print(f"    Match:  {f.matched}", file=sys.stderr)
        print(file=sys.stderr)
    print("→ If these are real secrets, rotate them IMMEDIATELY.", file=sys.stderr)
    print("→ To allow a specific pattern, edit PATTERNS in this script.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
