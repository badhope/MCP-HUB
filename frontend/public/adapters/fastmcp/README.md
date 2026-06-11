# fastmcp — universal adapter

> Phase 9 of [`REFACTOR_PLAN.md`](../../../../REFACTOR_PLAN.md). The
> first universal adapter we ship. Proves the pipeline: an upstream
> MCP server on the index gets a one-line install that works on
> Claude Desktop, Cursor, Cline, and Windsurf without per-client
> tweaks.

## What this adapter does

- **Upstream**: [`jlowin/fastmcp`](https://github.com/jlowin/fastmcp)
  (formerly `PrefectHQ/fastmcp`).
- **What fastmcp is**: a Python framework for building MCP servers.
  You decorate a class with `@mcp.tool` and `fastmcp run` exposes it
  over stdio. The framework is the most popular pure-MCP server in
  the catalog (25k+ stars).
- **Why we adapted it**: Python is the most popular MCP language
  after TypeScript, fastmcp is the canonical Python framework, and
  the upstream `pip install` + virtualenv dance confuses Claude
  Desktop users more than any other install.

## One-line install

```bash
curl -fsSL https://raw.githubusercontent.com/badhope/MCP-HUB/main/frontend/public/adapters/fastmcp/install.sh | bash
```

The script:
1. Verifies Python 3.10+ is on `PATH`.
2. Installs [`uv`](https://docs.astral.sh/uv/) if missing.
3. `uv tool install fastmcp` into an isolated tool environment.
4. Runs `fastmcp --version` as a smoke test.
5. Prints a paste-ready `mcpServers` JSON block.

The script does **not** auto-edit any client config — the universal
promise is "one JSON, you paste it into Claude / Cursor / Cline /
Windsurf". Auto-editing a user's machine would break that promise
(and would require root access on most platforms).

## The `mcpServers` config

```json
{
  "mcpServers": {
    "fastmcp": {
      "command": "uvx",
      "args": ["fastmcp", "run", "./your-server.py"]
    }
  }
}
```

`./your-server.py` is your own fastmcp module — see the upstream
`examples/` dir for a starter. The config is byte-identical across
all four clients we tested.

## Tested on

- ✅ **Claude Desktop** — `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS), `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
- ✅ **Cursor** — `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project)
- ✅ **Cline** — VSCode settings.json, `cline.mcpServers`
- ✅ **Windsurf** — `~/.codeium/windsurf/mcp_config.json`

## Known gotchas

- `uvx` is the canonical runner. If a client can't find it, set the
  full path (macOS: `/Users/$USER/.local/bin/uvx`) or add
  `~/.local/bin` to the client's PATH.
- For servers that need third-party deps, use `uvx --with pandas …`
  in the args list — no virtualenv required.
- fastmcp reads the server file on every boot, so there's no
  separate "install the server" step after the universal install.

## How this is wired into MCP Hub

1. `tools/_our_signal.py` walks this directory at build time, reads
   `adapter.json`, sees `"status": "adapted"`, and assigns
   `our_signal = 1.0` to the `fastmcp` server in the static index.
2. `tools/gen_static_data.py` writes that score into
   `frontend/public/servers-index.json` (~4.4 MB blob).
3. The SPA's `useStats()` reads the index, sees
   `our_tools_count = 1`, and the Home page surfaces fastmcp under
   "Our tools".
4. On the ServerDetail page, `InstallPanel` renders the install
   hint (already in the index), and `UniversalConfig` renders the
   paste-ready JSON + a "Tested on Claude / Cursor / Cline /
   Windsurf" trust strip (built from this adapter's
   `platforms` + `tested_clients`).

## Files

- `adapter.json` — manifest the build pipeline reads.
- `install.sh` — one-line installer.
- `README.md` — this file.
- `tests/` — output of running the install on each of the four
  clients (see "Tested on" above).

## License

Inherits from upstream `jlowin/fastmcp` (MIT). The adapter itself
is MIT — see the repo's top-level `LICENSE`.
