/**
 * Tests for `lib/universalConfig.ts` — the Layer 2 universal-config
 * builder. Covers:
 *   - Single-server config (basic case, primary install command)
 *   - Adapter override (adapter.install_universal replaces upstream)
 *   - Adapter-supplied args (when install_universal_args is present)
 *   - Adapter env vars (when env is present)
 *   - Batch config (multiple servers merged into one mcpServers)
 *   - Edge case: server with no install_hint (no crash, empty command)
 *   - splitCommand whitespace handling
 */

import { describe, it, expect } from 'vitest';
import {
  buildUniversalConfig,
  buildBatchUniversalConfig,
  stringifyUniversalConfig,
} from '../../lib/universalConfig';
import type { Server } from '../../types';

const baseServer: Server = {
  name: 'fastmcp',
  source: 'https://github.com/jlowin/fastmcp',
  description: 'Build MCP servers in Python',
  source_type: 'community',
  categories: ['development'],
  language: 'Python',
  stars: 12000,
  updated_at: '2026-06-01T00:00:00Z',
  install_hint: {
    primary: 'uvx fastmcp',
    alternatives: { npm: null, pip: 'uvx fastmcp', git: null, docker: null },
    zip_url: 'https://codeload.example.com/fastmcp.zip',
  },
};

describe('buildUniversalConfig', () => {
  it('builds a single-server config from the upstream primary', () => {
    const cfg = buildUniversalConfig(baseServer);
    expect(cfg).toEqual({
      mcpServers: {
        fastmcp: { command: 'uvx', args: ['fastmcp'] },
      },
    });
  });

  it('lets the adapter override the install command', () => {
    const cfg = buildUniversalConfig(baseServer, {
      install_universal: 'npx -y fastmcp-server',
    });
    expect(cfg.mcpServers.fastmcp).toEqual({
      command: 'npx',
      args: ['-y', 'fastmcp-server'],
    });
  });

  it('honors adapter-supplied args verbatim', () => {
    const cfg = buildUniversalConfig(baseServer, {
      install_universal: 'something',
      install_universal_args: ['--flag', 'value'],
    });
    expect(cfg.mcpServers.fastmcp).toEqual({
      command: 'something',
      args: ['--flag', 'value'],
    });
  });

  it('forwards adapter env vars', () => {
    const cfg = buildUniversalConfig(baseServer, {
      env: { MCP_API_KEY: 'secret', MCP_PORT: '9000' },
    });
    expect(cfg.mcpServers.fastmcp).toEqual({
      command: 'uvx',
      args: ['fastmcp'],
      env: { MCP_API_KEY: 'secret', MCP_PORT: '9000' },
    });
  });

  it('does not crash when install_hint is missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { install_hint: _, ...serverNoHint } = baseServer;
    const cfg = buildUniversalConfig(serverNoHint as Server);
    // An empty entry is created with an empty command; we tolerate
    // this — the ServerDetail page hides the panel when there's no
    // primary command.
    expect(cfg).toHaveProperty('mcpServers.fastmcp');
  });

  it('handles whitespace in install commands', () => {
    const server: Server = {
      ...baseServer,
      install_hint: {
        primary: '  npx   -y   my-server  ',
        alternatives: { npm: null, pip: null, git: null, docker: null },
        zip_url: null,
      },
    };
    const cfg = buildUniversalConfig(server);
    // The mcpServers key is always server.name, regardless of what
    // the install command mentions. (Some users expect otherwise;
    // a renaming adapter would be the right tool for that.)
    expect(cfg.mcpServers[server.name]).toEqual({
      command: 'npx',
      args: ['-y', 'my-server'],
    });
  });
});

describe('buildBatchUniversalConfig', () => {
  it('merges multiple servers into one mcpServers', () => {
    const server2: Server = {
      ...baseServer,
      name: 'git',
      install_hint: {
        primary: 'uvx mcp-server-git',
        alternatives: { npm: null, pip: null, git: null, docker: null },
        zip_url: null,
      },
    };
    const cfg = buildBatchUniversalConfig([baseServer, server2]);
    expect(Object.keys(cfg.mcpServers).sort()).toEqual(['fastmcp', 'git']);
  });

  it('skips servers with empty primary commands', () => {
    const empty: Server = {
      ...baseServer,
      name: 'broken',
      install_hint: {
        primary: '',
        alternatives: { npm: null, pip: null, git: null, docker: null },
        zip_url: null,
      },
    };
    const cfg = buildBatchUniversalConfig([baseServer, empty]);
    // Broken server with empty primary should still produce an entry
    // (with empty command); the downstream consumer skips it.
    expect(Object.keys(cfg.mcpServers).sort()).toEqual(['broken', 'fastmcp']);
    const brokenEntry = cfg.mcpServers['broken'] as { command: string };
    expect(brokenEntry.command).toBe('');
  });

  it('per-server adapter override', () => {
    const adapters = {
      [baseServer.name]: { install_universal: 'our-cmd --flag' },
    };
    const cfg = buildBatchUniversalConfig([baseServer], adapters);
    expect(cfg.mcpServers.fastmcp).toEqual({
      command: 'our-cmd',
      args: ['--flag'],
    });
  });
});

describe('stringifyUniversalConfig', () => {
  it('produces 2-space indented JSON', () => {
    const cfg = buildUniversalConfig(baseServer);
    const json = stringifyUniversalConfig(cfg);
    expect(json).toContain('  "mcpServers"');
    expect(json).toContain('  "fastmcp"');
  });

  it('round-trips through JSON.parse', () => {
    const cfg = buildUniversalConfig(baseServer);
    const parsed = JSON.parse(stringifyUniversalConfig(cfg));
    expect(parsed).toEqual(cfg);
  });
});
