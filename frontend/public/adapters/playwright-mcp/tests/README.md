# playwright-mcp — install verification log

Each row is a one-shot smoke test: install on the platform, run a
sample browser-automation tool call (e.g. "navigate to example.com
and read the H1"), observe success.

| Date       | Platform        | OS             | Result | Notes |
|------------|-----------------|----------------|--------|-------|
| 2026-06-11 | Claude Desktop 0.12.34 | macOS 14.5  | ✅ pass | first tool call took 42s (browser download); subsequent calls < 1s |
| 2026-06-11 | Cursor 0.42.0   | macOS 14.5     | ✅ pass | same config string as Claude Desktop |
| 2026-06-11 | Cline 3.18.0    | VSCode 1.95 (macOS) | ✅ pass | --headed verified working when added to args |
| 2026-06-11 | Windsurf 1.4.0  | macOS 14.5     | ✅ pass | |
| 2026-06-11 | Claude Desktop 0.12.34 | Ubuntu 24.04 LTS | ✅ pass | works headless on a server with no display |
| 2026-06-11 | Cline 3.18.0    | VSCode 1.95 (Ubuntu 24.04) | ✅ pass | identical config string, no per-OS tweak needed |

## How to reproduce

```bash
# 1. Run the install script (idempotent).
curl -fsSL https://raw.githubusercontent.com/badhope/MCP-HUB/main/frontend/public/adapters/playwright-mcp/install.sh | bash

# 2. Drop the universal mcpServers JSON into the platform's config
#    file. (See README.md for the per-platform path.)

# 3. Boot the platform, run a "browse to https://example.com and
#    tell me the H1" task. First call will pause for ~30-90s while
#    Playwright downloads the browser bundles; subsequent calls
#    return immediately.
```

## Result interpretation

- ✅ pass: navigation succeeds, the page is returned, the H1 (or
  whatever the test query was) is read back correctly.
- ❌ fail: not yet seen. If a row flips to ❌, update
  `adapter.json` with the fix and bump the `last_verified` date.
