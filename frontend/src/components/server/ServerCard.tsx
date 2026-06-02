import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Github, Clock, Code, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardFooter } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { QualityBadge } from '../shared/QualityBadge';
import { Server } from '../../types';

const getQualityScore = (server: Server): number => {
  let score = 35;
  if (server.stars > 5000) score += 30;
  else if (server.stars > 1000) score += 25;
  else if (server.stars > 100) score += 15;
  else if (server.stars > 10) score += 8;
  if (server.source_type === 'official') score += 15;
  if (!server.archived) score += 10;
  if (server.description && server.description.length > 80) score += 5;
  if (server.categories.length > 1) score += 5;
  if (server.topics && server.topics.length > 2) score += 5;
  if (server.license) score += 5;
  return Math.min(score, 100);
};

interface ServerCardProps {
  server: Server;
  index?: number;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (name: string) => void;
}

export const ServerCard = React.memo<ServerCardProps>(({ server, index = 0, selectable = false, selected = false, onSelect }) => {
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
      'from-primary-500 to-primary-600',
      'from-accent-500 to-accent-600',
      'from-violet-500 to-violet-600',
      'from-amber-500 to-amber-600',
      'from-rose-500 to-rose-600',
      'from-cyan-500 to-cyan-600',
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
      className={`cursor-pointer group card-lift card-border relative ${selected ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {selectable && (
        <div className="absolute top-3 right-3 z-10">
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            selected
              ? 'bg-primary-500 border-primary-500 text-white'
              : 'border-gray-300 bg-white group-hover:border-primary-400'
          }`}>
            {selected && <CheckCircle2 size={14} />}
          </div>
        </div>
      )}
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Avatar */}
            <div className={`relative w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${getColorScheme(server.name)} rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              {getInitials(server.name)}
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            
            {/* Name and Owner */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 text-base sm:text-lg truncate group-hover:text-primary-600 transition-colors flex items-center">
                {server.name}
                <ArrowUpRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-300" />
              </h3>
              <p className="text-sm text-slate-500 truncate">@{server.owner}</p>
            </div>
          </div>
          
          {/* Stars Badge */}
          <div className="flex items-center space-x-1.5 bg-amber-50 border border-amber-100 text-amber-600 px-2.5 py-1.5 rounded-xl group-hover:bg-amber-100 transition-colors">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-semibold">{server.stars.toLocaleString()}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-600 text-sm line-clamp-2 mb-4 leading-relaxed">
          {server.description}
        </p>

        {/* Categories */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
          {server.categories.slice(0, 3).map((category, idx) => (
            <Badge 
              key={idx} 
              variant="primary" 
              size="sm"
              className="bg-primary-50 text-primary-700 border-primary-100 hover:bg-primary-100 transition-colors"
            >
              {category}
            </Badge>
          ))}
          {server.categories.length > 3 && (
            <Badge 
              variant="default" 
              size="sm"
              className="bg-slate-100 text-slate-600 border-slate-200"
            >
              +{server.categories.length - 3}
            </Badge>
          )}
        </div>
      </CardContent>

      {/* Footer */}
      <CardFooter className="flex items-center justify-between py-3 sm:py-4 px-5 sm:px-6 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center space-x-3 sm:space-x-4 text-sm text-slate-500">
          {server.language && (
            <div className="flex items-center space-x-1.5">
              <Code className="w-4 h-4" />
              <span className="hidden xs:inline">{server.language}</span>
            </div>
          )}
          <div className="flex items-center space-x-1.5">
            <Clock className="w-4 h-4" />
            <span>{formatDate(server.updated_at)}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Quality Badge */}
          <QualityBadge score={getQualityScore(server)} size="sm" />
          
          {/* Source Type Badge */}
          {server.source_type === 'official' && (
            <Badge 
              variant="success" 
              size="sm"
              className="bg-accent-50 text-accent-700 border-accent-100"
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
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-all duration-200"
          >
            <Github className="w-4 h-4" />
          </a>
        </div>
      </CardFooter>
    </Card>
  );
});
