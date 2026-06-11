#!/usr/bin/env bash
#
# install.sh — universal install + self-check for fastmcp adapter.
#
# What it does (idempotent):
#   1. Verifies Python 3.10+ is available (else prints install hint).
#   2. Installs uv (the Astral CLI runner) if missing.
#   3. Installs fastmcp into a uv tool environment.
#   4. Runs `fastmcp --version` to verify the install.
#   5. Prints a paste-ready mcpServers config the user can drop into
#      Claude Desktop / Cursor / Cline / Windsurf.
#
# This is what the UniversalConfig card on the MCP Hub page exposes as
# "our one-line installer". It does NOT auto-edit any client config —
# that would require touching the user's machine and the universal
# promise is "one JSON, one config block" the user pastes manually.
#
# Tested on macOS 14 / Ubuntu 24.04 / Windows 11 (WSL). On native
# Windows, use WSL — uvx does not yet ship a first-class Windows
# distribution.

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${CYAN}▸${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}!${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

# ── 1. Python check ────────────────────────────────────────────────────
info "Checking Python 3.10+…"
if ! command -v python3 >/dev/null 2>&1; then
  fail "python3 not found. Install Python 3.10+ first: https://python.org/downloads/"
fi

PY_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)
if [ "$PY_MAJOR" -lt 3 ] || { [ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 10 ]; }; then
  fail "Python $PY_VERSION found, but fastmcp needs 3.10+. Please upgrade."
fi
ok "Python $PY_VERSION"

# ── 2. uv check / install ──────────────────────────────────────────────
info "Checking uv (the Astral package runner)…"
if ! command -v uv >/dev/null 2>&1; then
  warn "uv not found. Installing…"
  # The official install script. Idempotent — re-running is a no-op.
  curl -LsSf https://astral.sh/uv/install.sh | sh
  # The installer drops uv into ~/.local/bin; export it for this
  # session so the rest of the script can see it.
  export PATH="$HOME/.local/bin:$PATH"
  ok "uv installed at $(command -v uv)"
else
  ok "uv $(uv --version | awk '{print $2}')"
fi

# ── 3. fastmcp install ────────────────────────────────────────────────
info "Installing fastmcp into a uv tool environment…"
uv tool install fastmcp
ok "fastmcp installed at $(uv tool dir)/bin/fastmcp"

# ── 4. Self-check ──────────────────────────────────────────────────────
info "Running fastmcp --version…"
fastmcp --version || fail "fastmcp --version failed; check the install output above."
ok "fastmcp is on PATH"

# ── 5. Print the paste-ready mcpServers config ─────────────────────────
echo
info "Paste this into any MCP-compatible client:"
echo
cat <<'JSON'
{
  "mcpServers": {
    "fastmcp": {
      "command": "uvx",
      "args": ["fastmcp", "run", "./your-server.py"]
    }
  }
}
JSON
echo
ok "Done. See https://github.com/jlowin/fastmcp for example servers."
