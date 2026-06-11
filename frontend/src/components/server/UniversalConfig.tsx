/**
 * UniversalConfig — render the synthesized `mcpServers` JSON block
 * for a server, with a one-click copy.
 *
 * The block is built by `lib/universalConfig.ts:buildUniversalConfig`
 * (which prefers `adapter.install_universal` over
 * `server.install_hint.primary`). When we have an adapter, we also
 * show the "Tested on" badges as a trust signal and, if the adapter
 * ships an install script, a one-liner curl-pipe-sh.
 *
 * This component is only rendered on ServerDetail if
 * `server.our_signal_label === 'adapted'` (or higher). It's
 * always rendered if `adapter` is passed in.
 */

import React, { useMemo } from 'react';
import { Boxes, Wrench, Check } from 'lucide-react';
import { CopyButton } from '../shared/CopyButton';
import {
  buildUniversalConfig,
  stringifyUniversalConfig,
  type AdapterManifest,
} from '../../lib/universalConfig';
import type { Server } from '../../types';

export interface UniversalConfigProps {
  server: Server;
  /** Optional adapter manifest. If absent, the config is built from
   * `install_hint` alone (still useful, but loses any adapter-only
   * override of the install command). */
  adapter?: AdapterManifest;
  className?: string;
}

export const UniversalConfig: React.FC<UniversalConfigProps> = ({
  server,
  adapter,
  className = '',
}) => {
  const json = useMemo(() => {
    const cfg = buildUniversalConfig(server, adapter);
    return stringifyUniversalConfig(cfg);
  }, [server, adapter]);

  const testedClients = adapter?.tested_clients ?? [];
  const installCmd = adapter?.install_universal;
  const ourSignal = (server.our_signal_label || adapter?.our_signal || '') as string;

  return (
    <div
      className={`rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/10 ${className}`}
    >
      <div className="px-5 py-3 border-b border-emerald-200/70 dark:border-emerald-800/40 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <Boxes size={16} />
          Universal config
          {ourSignal && (
            <span className="ml-2 text-[11px] font-normal text-emerald-700/80 dark:text-emerald-300/80">
              ({ourSignal})
            </span>
          )}
        </h3>
        <CopyButton value={json} label="Copy" variant="primary" />
      </div>

      <div className="px-5 py-4 space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Paste this into any MCP-compatible client
          (Claude Desktop, Cursor, Cline, Windsurf, Continue, …).
          Same shape, same result.
        </p>

        <pre className="bg-slate-950 text-slate-100 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre">
          {json}
        </pre>

        {testedClients.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <Check size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Tested on:</span>
            <div className="flex flex-wrap gap-1.5">
              {testedClients.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {installCmd && (
          <div className="flex items-start gap-2 text-sm">
            <Wrench size={14} className="text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-slate-600 dark:text-slate-300 mb-1.5">
                Or run our one-line installer:
              </div>
              <div className="flex items-center gap-2">
                <pre className="flex-1 bg-slate-950 text-slate-100 rounded-lg p-2.5 text-xs font-mono overflow-x-auto whitespace-pre">
                  {installCmd}
                </pre>
                <CopyButton value={installCmd} label="Copy" iconOnly />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversalConfig;
