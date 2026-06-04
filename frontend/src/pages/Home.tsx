import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Star, Sparkles, Database, Building2, Shield, ChevronRight, Github, Code2, Zap, BookOpen, Info } from 'lucide-react';
import { useServers } from '../hooks/useServers';
import { useStats } from '../hooks/useStats';
import { ServerCard } from '../components/server/ServerCard';

const CompanyLogos: React.FC = () => {
  const companies = [
    { name: 'Anthropic', color: 'from-emerald-500 to-teal-500' },
    { name: 'OpenAI', color: 'from-green-600 to-emerald-600' },
    { name: 'Google', color: 'from-blue-500 to-cyan-500' },
    { name: 'Microsoft', color: 'from-blue-600 to-indigo-600' },
    { name: 'GitHub', color: 'from-gray-800 to-gray-600' },
    { name: 'AWS', color: 'from-amber-500 to-orange-500' },
    { name: 'Vercel', color: 'from-gray-900 to-gray-700' },
    { name: 'Alibaba', color: 'from-red-500 to-orange-500' },
    { name: 'Huawei', color: 'from-red-600 to-rose-600' },
    { name: 'Tencent', color: 'from-blue-500 to-sky-500' },
    { name: 'ByteDance', color: 'from-indigo-500 to-violet-500' },
    { name: 'Baidu', color: 'from-blue-600 to-indigo-600' },
  ];

  return (
    <div className="flex space-x-8 animate-scroll">
      {[...companies, ...companies].map((company, i) => (
        <div key={i} className="flex items-center space-x-3 px-6 py-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex-shrink-0">
          <div className={`w-10 h-10 bg-gradient-to-br ${company.color} rounded-xl flex items-center justify-center text-white font-bold text-sm`}>
            {company.name.charAt(0)}
          </div>
          <span className="font-medium text-slate-700 dark:text-slate-200 text-sm whitespace-nowrap">{company.name}</span>
        </div>
      ))}
    </div>
  );
};

const Home = React.memo(() => {
  const { data: serverData, isLoading } = useServers();
  const { data: stats } = useStats();

  const servers = useMemo(() => serverData?.servers || [], [serverData?.servers]);

  const topRatedServers = useMemo(() => {
    return [...servers]
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 6);
  }, [servers]);

  const recentlyUpdated = useMemo(() => {
    return [...servers]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 4);
  }, [servers]);

  // Prefer the canonical totals from /stats over a recomputation against the
  // 50-server sample. The catalog is wider than what the demo surfaces, so
  // "5 official" derived from the sample would be misleading next to the
  // 4,403 registry total.
  const totalServers = stats?.total_servers || serverData?.total || 0;
  const totalCategories = stats?.total_categories || 0;
  const sampleSourceTypes = stats?.sample_source_types;
  const sampleSize = stats?.sample_size || 0;
  const curatedOfficial = sampleSourceTypes?.official || 0;
  // Companies shown: from the curated sample (only the demo can show this).
  const companyCount = useMemo(
    () => new Set(servers.map((s) => s.owner)).size,
    [servers]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Helmet>
        <title>MCP Hub - Discover MCP Servers</title>
        <meta name="description" content="Discover, evaluate, and integrate the best MCP (Model Context Protocol) servers for your AI applications. Curated collection of open-source tools." />
      </Helmet>
      <section className="relative bg-gradient-to-br from-primary-600 via-violet-600 to-accent-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white dark:bg-slate-900/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white dark:bg-slate-900/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="container mx-auto px-4 py-20 sm:py-28 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 bg-white dark:bg-slate-900/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 border border-white/10">
              <Sparkles size={14} className="text-yellow-300" />
              <span className="text-sm text-white/80">Discover {totalServers.toLocaleString()}+ MCP Servers</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              MCP Server
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-400">Marketplace</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/80 mb-8 max-w-2xl leading-relaxed">
              Discover, evaluate, and integrate the best MCP (Model Context Protocol) servers for your AI applications. 
              Curated collection of {totalServers.toLocaleString()}+ open-source tools.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/servers"
                className="inline-flex items-center space-x-2 px-8 py-4 bg-white dark:bg-slate-800 text-primary-700 dark:text-primary-300 font-semibold rounded-2xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all hover:shadow-2xl hover:-translate-y-0.5"
              >
                <Database size={20} />
                <span>Browse Servers</span>
                <ChevronRight size={18} />
              </Link>
              <Link
                to="/curated"
                className="inline-flex items-center space-x-2 px-8 py-4 bg-white dark:bg-slate-900/10 backdrop-blur-sm text-white font-semibold rounded-2xl hover:bg-white dark:bg-slate-900/20 transition-all border border-white/20"
              >
                <Star size={20} />
                <span>Curated Picks</span>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 to-transparent dark:from-slate-950" />
      </section>

      <section className="container mx-auto px-4 -mt-10 relative z-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: Database, label: 'Total Servers', value: totalServers.toLocaleString(), color: 'from-primary-500 to-violet-500' },
            { icon: Shield, label: 'Official (curated)', value: `${curatedOfficial}/${sampleSize || servers.length}`, color: 'from-emerald-500 to-teal-500' },
            { icon: Code2, label: 'Categories', value: totalCategories.toLocaleString(), color: 'from-blue-500 to-cyan-500' },
            { icon: Building2, label: 'Companies (curated)', value: `${companyCount}`, color: 'from-amber-500 to-orange-500' },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-md border border-slate-100 dark:border-slate-800 flex items-center gap-3 sm:gap-4 min-w-0"
              >
                <div className={`w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center shadow-lg flex-shrink-0`}>
                  <Icon size={20} className="text-white sm:size-[22px]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">{stat.value}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>
        {sampleSize > 0 && totalServers > sampleSize && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info size={12} className="text-slate-400 dark:text-slate-500" />
            Star counts and per-server metadata below reflect the {sampleSize}-server curated
            sample. The wider {totalServers.toLocaleString()}-server registry is indexed
            at the <Link to="/servers" className="text-primary-600 hover:underline">full list</Link>.
          </p>
        )}
      </section>

      <section className="container mx-auto px-4 mt-12">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Featured Companies</h2>
          <Link to="/companies" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium flex items-center">
            View All <ArrowRight size={14} className="ml-1" />
          </Link>
        </div>
        <div className="overflow-hidden">
          <CompanyLogos />
        </div>
      </section>

      <section className="container mx-auto px-4 mt-16">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Star size={24} className="text-amber-500 flex-shrink-0" />
              <span>Top Rated Servers</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Most starred MCP servers in the marketplace</p>
          </div>
          <Link to="/servers?sort=stars" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium flex items-center text-sm">
            View All <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 animate-pulse">
                <div className="flex items-start mb-4">
                  <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                  <div className="ml-3 flex-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topRatedServers.map((server) => (
              <ServerCard key={server.name} server={server} />
            ))}
          </div>
        )}
      </section>

      <section className="container mx-auto px-4 mt-16 mb-16">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Zap size={24} className="text-amber-500 flex-shrink-0" />
              <span>Recently Updated</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Servers with the latest updates</p>
          </div>
          <Link to="/servers?sort=updated" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium flex items-center text-sm">
            View All <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {recentlyUpdated.map((server) => (
            <ServerCard key={server.name} server={server} />
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-br from-primary-600 via-violet-600 to-accent-600 text-white">
        <div className="container mx-auto px-4 py-20 text-center relative">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white dark:bg-slate-900/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-white dark:bg-slate-900/5 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <BookOpen size={48} className="mx-auto mb-6 text-white/80" />
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Join the MCP Ecosystem</h2>
            <p className="text-white/80 text-lg mb-8">
              Have an MCP server to share? Submit it to our marketplace and reach thousands of AI developers worldwide.
            </p>
            <Link
              to="/submit"
              className="inline-flex items-center space-x-2 px-8 py-4 bg-white dark:bg-slate-900 text-primary-700 font-semibold rounded-2xl hover:bg-gray-100 dark:bg-slate-800 transition-all hover:shadow-2xl"
            >
              <Github size={20} />
              <span>Submit Your Server</span>
            </Link>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 30s linear infinite;
          width: fit-content;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
});

export default Home;