import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Star, AlertCircle, RefreshCw } from 'lucide-react';
import { ServerGrid } from '../components/server/ServerGrid';
import { useCuratedServers } from '../hooks/useServers';

const Curated = React.memo(() => {
  const { data: servers = [], isLoading, error, refetch } = useCuratedServers(50);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-12">
      <Helmet>
        <title>Curated Picks | MCP Hub</title>
        <meta name="description" content="High-quality, carefully selected MCP servers hand-picked by our team." />
      </Helmet>
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
            <Star size={32} className="text-yellow-500" fill="currentColor" />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Curated Picks</h1>
          </div>
          <p className="text-gray-600 dark:text-slate-300">High-quality, carefully selected MCP servers</p>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-6 py-4 rounded-xl mb-8 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle size={20} />
              <span className="text-sm">{error instanceof Error ? error.message : 'Failed to load curated servers'}</span>
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
            >
              <RefreshCw size={14} />
              <span>Retry</span>
            </button>
          </div>
        )}

        <ServerGrid
          servers={servers}
          loading={isLoading}
          emptyMessage="No curated servers available"
        />
      </div>
    </div>
  );
});

export default Curated;