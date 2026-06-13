/**
 * universalConfig.ts — 通用配置生成器
 *
 * 根据服务器信息和适配器配置，生成全平台通用的 MCP 配置。
 * 一份配置，适用于 Claude Desktop、Cursor、Cline、Windsurf 等所有客户端。
 */

import type { Server, MCPServerEntry } from '../types';

export interface AdapterManifest {
  install_universal?: string;
  install_universal_args?: string[];
  env?: Record<string, string>;
  tested_clients?: string[];
  extensions?: string;
}

/**
 * 解析命令字符串为 command 和 args
 */
function splitCommand(command: string): { command: string; args: string[] } {
  const parts = command.trim().split(/\s+/);
  return {
    command: parts[0] || '',
    args: parts.slice(1),
  };
}

/**
 * 生成通用 MCP 配置
 *
 * @param server - 服务器对象
 * @param adapter - 可选的适配器清单（如果我们有做适配）
 * @returns 全平台通用的 mcpServers 配置对象
 */
export function buildUniversalConfig(
  server: Server,
  adapter?: AdapterManifest
): { mcpServers: Record<string, MCPServerEntry> } {
  let command: string;
  let args: string[];
  let env: Record<string, string> | undefined;

  if (adapter) {
    // 使用适配器的命令
    if (adapter.install_universal) {
      const parsed = splitCommand(adapter.install_universal);
      command = parsed.command;
      // 如果适配器提供了 args，使用它；否则使用解析出的 args
      args = adapter.install_universal_args || parsed.args;
    } else {
      // 没有 install_universal，使用服务器的 primary
      const primary = server.install_hint?.primary || '';
      const parsed = splitCommand(primary);
      command = parsed.command;
      args = parsed.args;
    }
    env = adapter.env;
  } else {
    // 没有适配器，使用服务器的 primary
    const primary = server.install_hint?.primary || '';
    const parsed = splitCommand(primary);
    command = parsed.command;
    args = parsed.args;
  }

  const entry: MCPServerEntry = {
    command,
    args: args.length > 0 ? args : undefined,
  };

  if (env && Object.keys(env).length > 0) {
    entry.env = env;
  }

  return {
    mcpServers: {
      [server.name]: entry,
    },
  };
}

/**
 * 批量生成通用配置（多個服务器合并到一个 mcpServers）
 *
 * @param servers - 服务器数组
 * @param adapters - 可选的适配器映射（server.name -> AdapterManifest）
 * @returns 合并后的 mcpServers 配置对象
 */
export function buildBatchUniversalConfig(
  servers: Server[],
  adapters?: Record<string, AdapterManifest>
): { mcpServers: Record<string, MCPServerEntry> } {
  const mcpServers: Record<string, MCPServerEntry> = {};

  for (const server of servers) {
    const adapter = adapters?.[server.name];
    const config = buildUniversalConfig(server, adapter);
    const entry = config.mcpServers[server.name];
    if (entry) {
      mcpServers[server.name] = entry;
    }
  }

  return { mcpServers };
}

/**
 * 将配置对象格式化为 JSON 字符串（2空格缩进）
 */
export function stringifyUniversalConfig(config: { mcpServers: Record<string, MCPServerEntry> }): string {
  return JSON.stringify(config, null, 2);
}

/**
 * 检查服务器是否有通用配置
 */
export function hasUniversalConfig(server: Server): boolean {
  return Boolean(server.install_hint?.primary);
}
