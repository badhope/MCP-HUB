# playwright-mcp — universal adapter

> The second universal adapter we ship (Phase 9 of
> [`REFACTOR_PLAN.md`](../../../../REFACTOR_PLAN.md)). The first
> was `fastmcp` (Python); this one is `playwright-mcp`
> (TypeScript, by Microsoft).

## What this adapter does

- **Upstream**: [`microsoft/playwright-mcp`](https://github.com/microsoft/playwright-mcp)
- **What it is**: Playwright is the de-facto browser-automation
  library (Chromium, Firefox, WebKit). `playwright-mcp` exposes it
  as a Model Context Protocol server so an AI agent can drive a
  real browser for testing, scraping, or visual inspection.
- **Why we adapted it**: it's the highest-quality, most-official
  browser-automation MCP server, it's published to npm as
  `@playwright/mcp`, and `npx -y @playwright/mcp@latest` is
  genuinely the install command — no per-platform divergence.

## One-line install

```bash
curl -fsSL https://raw.githubusercontent.com/badhope/MCP-HUB/main/frontend/public/adapters/playwright-mcp/install.sh | bash
```

The script:
1. Verifies Node.js 20+ is on `PATH`.
2. Warms the npx cache by running `npx -y @playwright/mcp@latest --version`.
3. Prints a paste-ready `mcpServers` JSON block.

The script does **not** pre-download the browser bundles. That
happens on the first tool call (in your MCP client), and is a
~300MB one-time fetch that takes 30-90s.

## The `mcpServers` config

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

This is byte-identical across all four clients we tested.

## Tested on

- ✅ **Claude Desktop** — `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS), `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
- ✅ **Cursor** — `~/.cursor/mcp.json`
- ✅ **Cline** — VSCode `settings.json` under `cline.mcpServers`
- ✅ **Windsurf** — `~/.codeium/windsurf/mcp_config.json`

## Known gotchas

- First tool call downloads ~300MB of browser binaries. Allow 30-90s
  for the spinner in your client.
- Headless is the default. Add `"--headed"` to args for a visible
  browser.
- Default viewport is 1280x720. Override with
  `"--viewport-size 1920,1080"` for retina.
- On Docker / Linux without a display, add `"--no-sandbox"` to args.

## How this is wired into MCP Hub

Same as the `fastmcp` adapter:

1. `tools/_our_signal.py` reads `adapter.json`, sees
   `"status": "adapted"`, and assigns `our_signal = 1.0` to the
   `playwright-mcp` server in the static index.
2. `tools/gen_static_data.py` writes that score into
   `frontend/public/servers-index.json`.
3. The SPA's `useStats()` reports `our_tools_count = 2` (after this
   adapter lands), and the Home page surfaces playwright-mcp under
   "Our tools".
4. On the ServerDetail page, the InstallPanel + UniversalConfig
   surface the install command and the paste-ready JSON.

## Files

- `adapter.json` — manifest the build pipeline reads.
- `install.sh` — one-line installer.
- `README.md` — this file.
- `tests/README.md` — per-client smoke test log.

## License

Inherits from upstream `microsoft/playwright-mcp` (Apache 2.0). The
adapter itself is MIT — see the repo's top-level `LICENSE`.
