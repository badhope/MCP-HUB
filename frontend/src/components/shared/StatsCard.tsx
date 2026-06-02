import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  color?: 'blue' | 'cyan' | 'purple' | 'green' | 'orange';
}

export const StatsCard = React.memo<StatsCardProps>(({
  title,
  value,
  icon: Icon,
  description,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-primary-50',
      text: 'text-primary-600',
      border: 'border-primary-100',
      gradient: 'from-primary-500 to-primary-600',
    },
    cyan: {
      bg: 'bg-cyan-50',
      text: 'text-cyan-600',
      border: 'border-cyan-100',
      gradient: 'from-cyan-500 to-cyan-600',
    },
    purple: {
      bg: 'bg-violet-50',
      text: 'text-violet-600',
      border: 'border-violet-100',
      gradient: 'from-violet-500 to-violet-600',
    },
    green: {
      bg: 'bg-accent-50',
      text: 'text-accent-600',
      border: 'border-accent-100',
      gradient: 'from-accent-500 to-accent-600',
    },
    orange: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
      gradient: 'from-amber-500 to-amber-600',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="group glass-hero rounded-2xl p-5 sm:p-6 border border-white/20 hover:border-white/30 transition-all duration-300 hover:shadow-lg hover:shadow-white/10 animate-stagger-in-1">
      <div className="flex items-center justify-between mb-4">
        <div className={`relative p-3 sm:p-4 rounded-2xl ${colors.bg} ${colors.border} border group-hover:scale-110 transition-transform duration-300`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
          <Icon size={24} className={`sm:size-6 ${colors.text} relative group-hover:text-white transition-colors duration-300`} />
        </div>
      </div>
      <div>
        <p className="text-primary-100 text-sm font-medium mb-1.5">{title}</p>
        <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{value}</p>
        {description && (
          <p className="text-primary-200 text-sm mt-2">{description}</p>
        )}
      </div>
    </div>
  );
});
