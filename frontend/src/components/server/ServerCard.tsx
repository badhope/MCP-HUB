import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconStar, IconClock, IconCode, IconArrowUpRight, IconCircleCheck } from '@tabler/icons-react';
import { Github } from '../icons/Github';
import { Card, CardContent, CardFooter } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { QualityBadge } from '../shared/QualityBadge';
import { getQualityScore } from '../../lib/quality';
import type { Server } from '../../types';

interface ServerCardProps {
  server: Server;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (name: string) => void;
}

export const ServerCard = React.memo<ServerCardProps>(({ server, selectable = false, selected = false, onSelect }) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const getColorScheme = (name: string) => {
    const colors = [
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300',
      'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
      'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
      'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300',
      'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(server.name);
    } else {
      navigate(`/servers/${encodeURIComponent(server.name)}`);
    }
  };

  return (
    <Card
      onClick={handleClick}
      className={`cursor-pointer group card-lift card-border relative h-full ${selected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      {selectable && (
        <div className="absolute top-3 right-3 z-10">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            selected
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-border bg-card group-hover:border-primary-400'
          }`}>
            {selected && <IconCircleCheck size={14} />}
          </div>
        </div>
      )}
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start min-w-0 gap-3 sm:gap-4">
            {/* Avatar */}
            <div className={`relative w-12 h-12 sm:w-14 sm:h-14 ${getColorScheme(server.name)} rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-lg sm:text-xl flex-shrink-0`}>
              {getInitials(server.name)}
            </div>

            {/* Name and Owner */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-base sm:text-lg truncate group-hover:text-primary transition-colors flex items-center">
                {server.name}
                <IconArrowUpRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </h3>
              <p className="text-sm text-muted-foreground truncate">@{server.owner}</p>
            </div>
          </div>

          {/* Stars Badge — marked as snapshot to keep the demo honest about freshness */}
          <div className="flex flex-col items-end space-y-0.5 flex-shrink-0">
            <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-100 text-amber-600 px-2.5 py-1.5 rounded-xl group-hover:bg-amber-100 transition-colors">
              <IconStar className="w-4 h-4 fill-current" />
              <span className="text-sm font-semibold">{server.stars.toLocaleString()}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wide text-amber-700/70 font-medium pr-1">
              snapshot
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-foreground text-sm line-clamp-2 mb-4 leading-relaxed">
          {server.description}
        </p>

        {/* Categories */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
          {server.categories.slice(0, 3).map((category, idx) => (
            <Badge 
              key={idx} 
              variant="primary" 
              size="sm"
              className="bg-secondary text-foreground border-border hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {category}
            </Badge>
          ))}
          {server.categories.length > 3 && (
            <Badge 
              variant="default" 
              size="sm"
              className="bg-muted text-muted-foreground border-border"
            >
              +{server.categories.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="flex items-center justify-between gap-2 py-3 sm:py-4 px-4 sm:px-6">
        <div className="flex items-center min-w-0 gap-3 sm:gap-4 text-sm text-muted-foreground">
          {server.language && (
            <div className="flex items-center min-w-0 gap-1.5">
              <IconCode className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{server.language}</span>
            </div>
          )}
          <div className="flex items-center min-w-0 gap-1.5">
            <IconClock className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{formatDate(server.updated_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Quality Badge */}
          <QualityBadge score={getQualityScore(server)} size="sm" />

          {/* Source Type Badge */}
          {server.source_type === 'official' && (
            <Badge
              variant="success"
              size="sm"
              className="bg-accent-50 text-accent-700 border-accent-100 dark:bg-accent-950/40 dark:text-accent-300 dark:border-accent-900/50"
            >
              Official
            </Badge>
          )}

          {/* GitHub Link */}
          <a
            href={server.source}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </CardFooter>
    </Card>
  );
});
