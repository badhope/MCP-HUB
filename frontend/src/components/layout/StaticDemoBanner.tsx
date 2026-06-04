import React, { useState } from 'react';
import { Info, X, Github, BookOpen, Clock } from 'lucide-react';
import { useStats } from '../../hooks/useStats';

const formatSnapshotDate = (iso: string): string => {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export const StaticDemoBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  const { data: stats } = useStats();
  if (dismissed) return null;

  const snapshotDate = stats?.data_snapshot_date
    ? formatSnapshotDate(stats.data_snapshot_date)
    : null;

  return (
    <div
      className="bg-amber-50 border-b border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-100"
      role="status"
      aria-live="polite"
    >
      <div className="container mx-auto px-4 py-2.5 flex items-center gap-3 text-sm">
        <Info className="w-4 h-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
        <p className="flex-1 leading-snug">
          <span className="font-semibold">Static demo:</span>{' '}
          browsing 50 curated MCP servers with full metadata, no live backend. Search,
          filter, and inspect configs work; sign-in, favorites, ratings, and submissions
          are disabled until the FastAPI backend is connected.
          {snapshotDate && (
            <span className="hidden sm:inline-flex items-center gap-1 ml-2 text-amber-800/90">
              <Clock className="w-3 h-3" aria-hidden="true" />
              <span>Data last synced {snapshotDate}.</span>
            </span>
          )}
        </p>
        <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
          <a
            href="https://github.com/badhope/MCP-HUB"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-amber-800 hover:text-amber-900 font-medium underline underline-offset-2"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Source</span>
          </a>
          <a
            href="https://github.com/badhope/MCP-HUB/blob/main/docs/USER_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-amber-800 hover:text-amber-900 font-medium underline underline-offset-2"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Guide</span>
          </a>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 p-1 rounded-md hover:bg-amber-100 transition-colors"
          aria-label="Dismiss notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
