/**
 * InstallPanel — the 3-action install panel for a single server:
 *
 *   1. 📦 Install (primary install command)        [Copy]
 *   2. 🚀 Run with npx (or uvx / docker, by lang)  [Copy]
 *   3. 🐙 View on GitHub                          [Open ↗]
 *
 * Plus a 4th line:
 *   4. 📥 Download source ZIP                     (link)
 *
 * Primary copy comes from `server.install_hint.primary`; alternative
 * copy comes from `server.install_hint.alternatives.{npm,pip,git,docker}`
 * (whichever the build-time script filled in).
 *
 * If `install_hint` is missing (very old index, or upstream record
 * with no detectable language), we degrade gracefully — show the
 * "View on GitHub" + "Download ZIP" lines and a note that the
 * one-liner isn't available.
 */

import React from 'react';
import { Terminal, ExternalLink, Download, Package } from 'lucide-react';
import { CopyButton } from '../shared/CopyButton';
import type { Server } from '../../types';

export interface InstallPanelProps {
  server: Server;
  /** Optional className for layout. */
  className?: string;
}

interface AlternativeRow {
  key: 'npm' | 'pip' | 'git' | 'docker';
  label: string;
  command: string;
  iconColor: string;
}

function pickAlternatives(server: Server): AlternativeRow[] {
  const alts = server.install_hint?.alternatives;
  if (!alts) return [];
  const rows: AlternativeRow[] = [];
  if (alts.npm) {
    rows.push({
      key: 'npm',
      label: 'Run with npx',
      command: alts.npm,
      iconColor: 'text-rose-600 dark:text-rose-400',
    });
  }
  if (alts.pip) {
    rows.push({
      key: 'pip',
      label: 'Run with uvx',
      command: alts.pip,
      iconColor: 'text-sky-600 dark:text-sky-400',
    });
  }
  if (alts.git) {
    rows.push({
      key: 'git',
      label: 'Install from git',
      command: alts.git,
      iconColor: 'text-amber-600 dark:text-amber-400',
    });
  }
  if (alts.docker) {
    rows.push({
      key: 'docker',
      label: 'Run with docker',
      command: alts.docker,
      iconColor: 'text-blue-600 dark:text-blue-400',
    });
  }
  return rows;
}

export const InstallPanel: React.FC<InstallPanelProps> = ({ server, className = '' }) => {
  const primary = server.install_hint?.primary;
  const zipUrl = server.install_hint?.zip_url;
  const alternatives = pickAlternatives(server);

  return (
    <div
      className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 ${className}`}
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Terminal size={16} className="text-primary-600 dark:text-primary-400" />
          Install
        </h3>
      </div>

      {/* Primary install */}
      {primary ? (
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
              <Package size={14} className="text-primary-600 dark:text-primary-400" />
              Primary install
            </div>
            <CopyButton value={primary} label="Copy" />
          </div>
          <pre className="bg-slate-950 text-slate-100 rounded-lg p-3 text-sm font-mono overflow-x-auto whitespace-pre">
            {primary}
          </pre>
        </div>
      ) : (
        <div className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
          No one-line install command is available for this server. Use the GitHub link
          below to install it manually.
        </div>
      )}

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div className="px-5 py-4 space-y-3">
          {alternatives.map((alt) => (
            <div key={alt.key}>
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div
                  className={`text-sm font-medium ${alt.iconColor}`}
                >
                  {alt.label}
                </div>
                <CopyButton value={alt.command} label="Copy" />
              </div>
              <pre className="bg-slate-950 text-slate-100 rounded-lg p-2.5 text-xs font-mono overflow-x-auto whitespace-pre">
                {alt.command}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* GitHub + ZIP */}
      <div className="px-5 py-3 space-y-2">
        <a
          href={server.source}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink size={14} />
            View on GitHub
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[60%]">
            {server.source.replace(/^https?:\/\//, '')}
          </span>
        </a>
        {zipUrl && (
          <a
            href={zipUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Download size={14} />
              Download source ZIP
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">codeload</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default InstallPanel;
