# Examples — Universal Adapters

This directory showcases the **universal adapter format** used in MCP Hub's Layer 2.

---

## What is a Universal Adapter?

A universal adapter is a wrapped MCP server that:
- Provides a **single install command** that works across all major MCP clients (Claude Desktop, Cursor, Cline, Windsurf)
- Has been **personally tested** by the MCP Hub team
- Is marked with the **"✅ adapted"** badge in the catalog
- Gets a **score boost** (our_signal = 1.0) in the ranking algorithm

---

## Current Adapters

### 1. fastmcp

**Upstream**: [jlowin/fastmcp](https://github.com/jlowin/fastmcp)

**What it does**: A Python framework for building MCP servers with minimal boilerplate.

**Install command**:
```bash
uv tool install fastmcp
```

**Universal config**:
```json
{
  "mcpServers": {
    "fastmcp": {
      "command": "uvx",
      "args": ["fastmcp"]
    }
  }
}
```

**Tested on**: Claude Desktop, Cursor, Cline, Windsurf

**Files**:
- `frontend/public/adapters/fastmcp/adapter.json` — manifest
- `frontend/public/adapters/fastmcp/install.sh` — one-line installer
- `frontend/public/adapters/fastmcp/README.md` — adaptation notes
- `frontend/public/adapters/fastmcp/tests/README.md` — test results

---

### 2. playwright-mcp

**Upstream**: [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp)

**What it does**: Browser automation via Playwright for MCP clients.

**Install command**:
```bash
npx -y @playwright/mcp@latest
```

**Universal config**:
```json
{
  "mcpServers": {
    "playwright-mcp": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    }
  }
}
```

**Tested on**: Claude Desktop, Cursor, Cline, Windsurf

**Files**:
- `frontend/public/adapters/playwright-mcp/adapter.json` — manifest
- `frontend/public/adapters/playwright-mcp/install.sh` — one-line installer
- `frontend/public/adapters/playwright-mcp/README.md` — adaptation notes
- `frontend/public/adapters/playwright-mcp/tests/README.md` — test results

---

## Adapter Format

Each adapter lives in `frontend/public/adapters/<name>/` and contains 4 files:

### 1. `adapter.json` (required)

Manifest file read by the build pipeline:

```json
{
  "name": "fastmcp",
  "upstream": "jlowin/fastmcp",
  "status": "adapted",
  "platforms": {
    "claude-desktop": { "command": "uvx", "args": ["fastmcp"] },
    "cursor": { "command": "uvx", "args": ["fastmcp"] },
    "cline": { "command": "uvx", "args": ["fastmcp"] },
    "windsurf": { "command": "uvx", "args": ["fastmcp"] }
  },
  "install_universal": "uv tool install fastmcp",
  "tested_clients": ["claude-desktop", "cursor", "cline", "windsurf"],
  "gotchas": [],
  "notes": "Universal uvx invocation; works across all stdio MCP clients."
}
```

**Fields**:
- `name` — adapter name (matches directory name)
- `upstream` — upstream GitHub repo (`owner/repo`)
- `status` — `"adapted"` | `"in_progress"` | `"researched"`
- `platforms` — per-client config (optional, for documentation)
- `install_universal` — single command that works everywhere
- `tested_clients` — list of clients we've tested on
- `gotchas` — known issues or limitations
- `notes` — human-readable description

### 2. `install.sh` (required)

One-line installer script. Should be:
- **Idempotent** — safe to run multiple times
- **Self-checking** — verifies installation succeeded
- **Cross-platform** — works on macOS, Linux, Windows (WSL)

Example:
```bash
#!/usr/bin/env bash
set -euo pipefail

# Check prerequisites
if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed. Install from https://github.com/astral-sh/uv"
    exit 1
fi

# Install
uv tool install fastmcp

# Verify
if command -v fastmcp &> /dev/null; then
    echo "✅ fastmcp installed successfully"
else
    echo "❌ Installation failed"
    exit 1
fi
```

### 3. `README.md` (required)

Human-readable adaptation notes:
- What the adapter does
- How to install it
- Known gotchas or limitations
- Links to upstream documentation

### 4. `tests/README.md` (required)

Test results log. Should include:
- Which clients were tested
- Which platforms (macOS, Linux, Windows)
- Test date
- Pass/fail status
- Any issues encountered

Example:
```markdown
# Test Results

## 2026-06-12

| Client | Platform | Status | Notes |
|---|---|---|---|
| Claude Desktop | macOS 14 | ✅ Pass | — |
| Cursor | macOS 14 | ✅ Pass | — |
| Cline | macOS 14 | ✅ Pass | — |
| Windsurf | macOS 14 | ✅ Pass | — |
```

---

## How Adapters Are Scored

The `tools/_our_signal.py` script scans `frontend/public/adapters/` at build time and assigns `our_signal` scores:

- `status: "adapted"` → 1.0 (20% weight in total score)
- `status: "in_progress"` → 0.7
- `status: "researched"` → 0.4
- unknown/missing → 0.0

This gives adapted servers a significant ranking boost.

---

## Adding a New Adapter

1. Create directory: `frontend/public/adapters/<name>/`
2. Add the 4 required files (see above)
3. Run `python3 tools/_our_signal.py` to verify the scanner picks it up
4. Run `python3 tools/gen_static_data.py` to regenerate the static index
5. Verify the server's `our_signal` field is now 1.0 in `frontend/public/servers-index.json`
6. Commit: `feat(adapter): add <name> universal adapter`

See [`REFACTOR_PLAN.md`](../REFACTOR_PLAN.md) §9 for the full spec.

---

## Why Universal Adapters?

The MCP ecosystem has a **"50 templates" problem**: every client integration guide ships a hand-maintained JSON for each server, and they all go stale.

Universal adapters fix this by:
1. Providing a **single install command** that works everywhere
2. Being **personally tested** by the MCP Hub team
3. Getting a **score boost** to signal trust
4. Leaving a **clear paper trail** (adapter.json + tests/README.md)

---

## License

[MIT](../LICENSE)
