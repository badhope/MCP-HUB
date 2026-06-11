/**
 * Universal adapter config — Layer 2 of the 3-layer product model.
 *
 * Given a server record (and, if we have an adapter, the adapter manifest),
 * synthesize a single JSON snippet that any MCP-compatible client
 * (Claude Desktop, Cursor, Cline, Windsurf, Continue, etc.) can paste
 * into its `mcp_servers` config and have the same working setup.
 *
 * The point of "universal" is that the same JSON works across all of
 * those clients because they share the de-facto `mcpServers` shape;
 * we don't generate one snippet per client.
 *
 * For more details, see REFACTOR_PLAN.md §3 (3-layer model) and §7.3
 * (universal config generator).
 */

import type { Server } from '../types';

/** Shape of a single `mcpServers.<name>` entry across all known clients. */
export interface McpServerEntry {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  /** Some clients (Claude Desktop) also accept a `type` field. */
  type?: 'stdio' | 'sse' | 'http';
}

/** The full `mcp_servers` config object, ready to drop into any client. */
export interface UniversalConfig {
  mcpServers: Record<string, McpServerEntry>;
}

/**
 * Minimal subset of an adapter.json that we need to compose the
 * universal config. The actual adapter.json has more fields (install
 * command, our_signal label, README, etc.) — we only consume the
 * bits that influence the synthesized `mcpServers` payload.
 */
export interface AdapterManifest {
  /** Override the upstream install command. Optional. */
  install_universal?: string;
  /** Override args split (e.g. "npx -y fastmcp" -> ["-y", "fastmcp"]). */
  install_universal_args?: string[];
  /** Extra env vars the adapter needs. */
  env?: Record<string, string>;
  /** Our internal status; surfaced in the UI, not the JSON. */
  our_signal?: 'adapted' | 'in_progress' | 'researched' | 'unknown';
  /** Tested clients — surfaced as a trust signal. Optional. */
  tested_clients?: string[];
}

/**
 * Parse a one-line install command into (command, args).
 * Handles whitespace; ignores quoted whitespace for simplicity.
 */
function splitCommand(cmd: string): { command: string; args: string[] } {
  const parts = cmd.trim().split(/\s+/).filter(Boolean);
  const command = parts[0] ?? '';
  return { command, args: parts.slice(1) };
}

/**
 * Build a universal `mcpServers` config from a server + optional adapter.
 *
 * Resolution order for the primary command:
 *   1. `adapter.install_universal` (if provided; the adapter overrides)
 *   2. `server.install_hint.primary` (the upstream default)
 *   3. empty string (caller decides what to do)
 *
 * Resolution order for env:
 *   1. `adapter.env` (our additions / overrides)
 *   2. (no env hint in the upstream index today)
 */
export function buildUniversalConfig(
  server: Server,
  adapter?: AdapterManifest
): UniversalConfig {
  const commandLine =
    adapter?.install_universal ?? server.install_hint?.primary ?? '';
  const { command, args: splitArgs } = splitCommand(commandLine);

  // If the adapter specifies its own args, use them verbatim.
  const args =
    adapter?.install_universal_args && adapter.install_universal_args.length > 0
      ? adapter.install_universal_args
      : splitArgs.length > 0
        ? splitArgs
        : undefined;

  const entry: McpServerEntry = {
    command,
  };
  if (args && args.length > 0) entry.args = args;
  if (adapter?.env && Object.keys(adapter.env).length > 0) entry.env = adapter.env;

  return {
    mcpServers: {
      [server.name]: entry,
    },
  };
}

/**
 * Pretty-print a universal config to JSON. We always pretty-print
 * because the value is meant to be human-pasted, not wire-encoded.
 */
export function stringifyUniversalConfig(config: UniversalConfig): string {
  return JSON.stringify(config, null, 2);
}

/**
 * Walk a list of servers and return one big universal config with all
 * of them. Useful for "export every adapted server" buttons.
 */
export function buildBatchUniversalConfig(
  servers: Server[],
  adapters: Record<string, AdapterManifest> = {}
): UniversalConfig {
  const merged: UniversalConfig = { mcpServers: {} };
  for (const s of servers) {
    const cfg = buildUniversalConfig(s, adapters[s.name]);
    Object.assign(merged.mcpServers, cfg.mcpServers);
  }
  return merged;
}
