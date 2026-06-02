import React from 'react';
import { getQualityLevel } from '../../lib/quality';

interface QualityBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

export const QualityBadge = React.memo<QualityBadgeProps>(({
  score,
  size = 'sm',
  showScore = false,
  className = '',
}) => {
  const level = getQualityLevel(score);

  return (
    <span
      className={`inline-flex items-center space-x-0.5 font-bold rounded-md border ${level.bg} ${level.color} ${sizeClasses[size]} ${className}`}
      title={`Quality Score: ${score}/100`}
    >
      <span>{level.label}</span>
      {showScore && (
        <span className="opacity-75 font-normal">{score}</span>
      )}
    </span>
  );
});