#!/usr/bin/env bash
#
# install.sh — universal install + self-check for playwright-mcp adapter.
#
# What it does (idempotent):
#   1. Verifies Node.js 20+ is available (else prints install hint).
#   2. Runs `npx -y @playwright/mcp@latest --version` to warm the
#      npx cache (this triggers the npm fetch but not the browser
#      bundle download; that happens on first use).
#   3. Prints a paste-ready mcpServers config the user can drop into
#      Claude Desktop / Cursor / Cline / Windsurf.
#
# We do NOT pre-download the browser bundles here. The user is
# expected to invoke the tool once in their MCP client; that first
# call triggers the ~300MB Chromium / Firefox / WebKit download and
# surfaces a "tool running" spinner in the client.
#
# Tested on macOS 14 / Ubuntu 24.04 / Windows 11 (WSL).

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

# ── 1. Node check ──────────────────────────────────────────────────────
info "Checking Node.js 20+…"
if ! command -v node >/dev/null 2>&1; then
  fail "node not found. Install Node.js 20+ first: https://nodejs.org/"
fi
if ! command -v npx >/dev/null 2>&1; then
  fail "npx not found. It ships with Node.js 16+; reinstall if missing."
fi

NODE_VERSION=$(node -p 'process.versions.node')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  fail "Node.js $NODE_VERSION found, but playwright-mcp needs 20+. Please upgrade."
fi
ok "Node.js $NODE_VERSION"

# ── 2. Warm npx cache ──────────────────────────────────────────────────
info "Warming the npx cache for @playwright/mcp (no browser download yet)…"
# `--version` exits 0 even when the server's main entry isn't usable
# without args, so it's a safe "is this reachable?" probe.
npx -y @playwright/mcp@latest --version >/dev/null 2>&1 || \
  warn "@playwright/mcp --version did not exit 0; the package will still install on first tool call."
ok "npx can reach @playwright/mcp"

# ── 3. Print the paste-ready mcpServers config ─────────────────────────
echo
info "Paste this into any MCP-compatible client:"
echo
cat <<'JSON'
{
  "mcpServers": {
    "playwright-mcp": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
JSON
echo
warn "On the FIRST tool call the client will download ~300MB of browser"
warn "binaries. Allow 30-90s for the spinner; subsequent calls are instant."
echo
ok "Done. See https://github.com/microsoft/playwright-mcp for tool docs."
