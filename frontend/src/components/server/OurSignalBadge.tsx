/**
 * OurSignalBadge — the 4-tier status of "what we've done with this
 * server". Visible on ServerCard, ServerDetail, and the OurTools grid.
 *
 * 4 tiers (from highest to lowest):
 *   - adapted       (✅, our_signal = 1.0)   universal config ships in frontend/public/adapters/<name>/
 *   - in_progress   (⚙️, our_signal = 0.7)   an adapter is being built
 *   - researched    (👀, our_signal = 0.4)   we've taken a look, no plan yet
 *   - unknown       (🆕, our_signal = 0.0)   unprocessed
 *
 * The `our_signal` field on a ServerRecord is the build-time numeric
 * value; `our_signal_label` is the string form. If the server hasn't
 * been touched, `our_signal_label` is `''` (the most common case today
 * — only adapted servers have a label set).
 */

import React from 'react';
import { CheckCircle2, Cog, Eye, Sparkles } from 'lucide-react';

export type OurSignalLabel = 'adapted' | 'in_progress' | 'researched' | 'unknown' | '';

const TIER_META: Record<
  Exclude<OurSignalLabel, ''>,
  { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; description: string; classes: string }
> = {
  adapted: {
    icon: CheckCircle2,
    label: 'Adapted',
    description: 'Universal config available; tested on major clients.',
    classes:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800',
  },
  in_progress: {
    icon: Cog,
    label: 'In progress',
    description: 'An adapter is being built for this server.',
    classes:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800',
  },
  researched: {
    icon: Eye,
    label: 'Researched',
    description: "We've looked at it; no adapter planned yet.",
    classes:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-300 dark:border-sky-800',
  },
  unknown: {
    icon: Sparkles,
    label: 'Not processed',
    description: 'We have not adapted or reviewed this server yet.',
    classes:
      'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700',
  },
};

export interface OurSignalBadgeProps {
  /** The string label as written by gen_static_data.py. */
  label: OurSignalLabel | string;
  /** Optional size override; defaults to 'md'. */
  size?: 'sm' | 'md';
  /** If true, only show the icon (no text). */
  iconOnly?: boolean;
  /** Optional className passthrough. */
  className?: string;
}

export const OurSignalBadge: React.FC<OurSignalBadgeProps> = ({
  label,
  size = 'md',
  iconOnly = false,
  className = '',
}) => {
  const key = (label || 'unknown') as Exclude<OurSignalLabel, ''>;
  const meta = TIER_META[key] ?? TIER_META.unknown;
  const Icon = meta.icon;
  const iconSize = size === 'sm' ? 12 : 14;
  const pad = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 border rounded-full font-medium whitespace-nowrap ${pad} ${meta.classes} ${className}`}
      title={meta.description}
      aria-label={meta.description}
    >
      <Icon size={iconSize} />
      {!iconOnly && <span>{meta.label}</span>}
    </span>
  );
};

export default OurSignalBadge;
