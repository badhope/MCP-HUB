/**
 * InstallPanel — the 3-action install panel for a single server:
 *
 *   1. 📦 Install (primary install command)        [IconCopy]
 *   2. 🚀 Run with npx (or uvx / docker, by lang)  [IconCopy]
 *   3. 🐙 View on GitHub                          [Open ↗]
 *
 * IconPlus a 4th line:
 *   4. 📥 IconDownload source ZIP                     (link)
 *
 * Primary copy comes from `server.install_hint.primary`; alternative
 * copy comes from `server.install_hint.alternatives.{npm,pip,git,docker}`
 * (whichever the build-time script filled in).
 *
 * If `install_hint` is missing (very old index, or upstream record
 * with no detectable language), we degrade gracefully — show the
 * "View on GitHub" + "IconDownload ZIP" lines and a note that the
 * one-liner isn't available.
 */

import React from 'react';
import { IconTerminal, IconExternalLink, IconDownload, IconPackage } from '@tabler/icons-react';
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
      className={`rounded-2xl border border-border bg-card divide-y divide-border ${className}`}
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-border bg-muted/50">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <IconTerminal size={16} className="text-primary" />
          Install
        </h3>
      </div>

      {/* Primary install */}
      {primary ? (
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <IconPackage size={14} className="text-primary" />
              Primary install
            </div>
            <CopyButton value={primary} label="IconCopy" />
          </div>
          <pre className="bg-slate-950 text-slate-100 rounded-lg p-3 text-sm font-mono overflow-x-auto whitespace-pre">
            {primary}
          </pre>
        </div>
      ) : (
        <div className="px-5 py-4 text-sm text-muted-foreground">
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
                <CopyButton value={alt.command} label="IconCopy" />
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
          className="flex items-center justify-between gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          <span className="flex items-center gap-2">
            <IconExternalLink size={14} />
            View on GitHub
          </span>
          <span className="text-xs text-muted-foreground truncate max-w-[60%]">
            {server.source.replace(/^https?:\/\//, '')}
          </span>
        </a>
        {zipUrl && (
          <a
            href={zipUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            <span className="flex items-center gap-2">
              <IconDownload size={14} />
              IconDownload source ZIP
            </span>
            <span className="text-xs text-muted-foreground">codeload</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default InstallPanel;
