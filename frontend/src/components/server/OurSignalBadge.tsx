import React from 'react';
import { Badge } from '../ui/Badge';

interface OurSignalBadgeProps {
  our_signal?: number;
  our_signal_label?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  iconOnly?: boolean;
}

export const OurSignalBadge: React.FC<OurSignalBadgeProps> = ({
  our_signal = 0,
  our_signal_label = '未处理',
  size = 'sm',
  label,
  iconOnly = false,
}) => {
  if (our_signal === 0) return null;

  const displayText = label || our_signal_label;

  const getVariant = () => {
    if (our_signal >= 1.0) return 'success';
    if (our_signal >= 0.7) return 'default';
    return 'secondary';
  };

  const getClassName = () => {
    if (our_signal >= 1.0) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
    }
    if (our_signal >= 0.7) {
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  };

  return (
    <Badge variant={getVariant()} size={size} className={getClassName()}>
      {iconOnly ? '' : displayText}
    </Badge>
  );
};
