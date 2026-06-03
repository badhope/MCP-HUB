import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Database, AlertCircle, Code, Info } from 'lucide-react';
import { useServers } from '../hooks/useServers';
import { useStats } from '../hooks/useStats';

const Categories = React.memo(() => {
  const { data: serverData, isLoading, error } = useServers();
  const { data: stats } = useStats();

  const servers = useMemo(() => serverData?.servers || [], [serverData?.servers]);

  const categoryStats = useMemo(() => {
    const counts = new Map<string, number>();
    servers.forEach((server) => {
      (server.categories || []).forEach((cat) => {
        counts.set(cat, (counts.get(cat) || 0) + 1);
      });
    });
    // Merge with the full-registry category list (from /stats) so the page
    // can show all 21 categories even though only 17 of them have at least
    // one curated server in the sample. The bar visual compares against the
    // full count to keep proportions honest.
    const registry = stats?.categories || {};
    const merged = new Map<string, { name: string; curated: number; total: number }>();
    for (const [name, total] of Object.entries(registry)) {
      merged.set(name, { name, curated: counts.get(name) || 0, total: Number(total) || 0 });
    }
    // Include any sample-only categories not in the registry (shouldn't happen,
    // but keep the page safe if the data drifts).
    for (const [name, curated] of counts.entries()) {
      if (!merged.has(name)) {
        merged.set(name, { name, curated, total: curated });
      }
    }
    return Array.from(merged.values()).sort((a, b) => b.total - a.total);
  }, [servers, stats]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Helmet>
          <title>Browse Categories | MCP Hub</title>
          <meta name="description" content="Explore MCP servers by category. Find the right MCP server for your AI application needs." />
        </Helmet>
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse mb-3"></div>
            <div className="h-5 w-96 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="h-6 bg-gray-200 rounded w-2/3 mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && categoryStats.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Helmet>
          <title>Browse Categories | MCP Hub</title>
          <meta name="description" content="Explore MCP servers by category. Find the right MCP server for your AI application needs." />
        </Helmet>
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Browse Categories</h1>
            <p className="text-gray-600">Explore MCP servers by category</p>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center space-x-3">
            <AlertCircle size={20} />
            <span className="text-sm">{error.message || 'Failed to load'}</span>
          </div>
        </div>
      </div>
    );
  }

  if (categoryStats.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <Helmet>
          <title>Browse Categories | MCP Hub</title>
          <meta name="description" content="Explore MCP servers by category. Find the right MCP server for your AI application needs." />
        </Helmet>
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">Browse Categories</h1>
            <p className="text-gray-600">Explore MCP servers by category</p>
          </div>
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Database size={40} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Categories Found</h2>
            <p className="text-gray-500 mb-6">No categories were found in the database</p>
          </div>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...categoryStats.map((c) => c.total), 1);
  const sampleSize = stats?.sample_size || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <Helmet>
        <title>Browse Categories | MCP Hub</title>
        <meta name="description" content="Explore MCP servers by category. Find the right MCP server for your AI application needs." />
      </Helmet>
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <div className="flex items-center space-x-3 mb-3">
            <Database size={32} className="text-primary-600" />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Browse Categories</h1>
          </div>
          <p className="text-gray-600">
            Explore {categoryStats.length} categories of MCP servers
            {sampleSize > 0 && (
              <span className="text-gray-400">
                {' '}
                · {servers.length} curated in this demo
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categoryStats.map((cat, index) => (
            <Link
              key={cat.name}
              to={`/servers?category=${encodeURIComponent(cat.name)}`}
              className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-primary-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 card-border"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors text-base">
                    {cat.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {cat.total.toLocaleString()} server{cat.total !== 1 ? 's' : ''}
                    {sampleSize > 0 && cat.curated > 0 && cat.curated < cat.total && (
                      <span className="text-slate-400">
                        {' '}
                        · {cat.curated} curated
                      </span>
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                  <Code className="w-6 h-6 text-primary-600" />
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((cat.total / maxCount) * 100, 100)}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
        {sampleSize > 0 && (
          <p className="mt-6 text-xs text-gray-500 flex items-center gap-1.5">
            <Info size={12} className="text-gray-400" />
            Bar widths are proportional to the full {stats?.total_servers.toLocaleString()}-server registry
            count, not the curated sample.
          </p>
        )}
      </div>
    </div>
  );
});

export default Categories;
