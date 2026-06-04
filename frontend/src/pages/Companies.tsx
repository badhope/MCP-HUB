import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Building2, Star, AlertCircle, ExternalLink, Search } from 'lucide-react';
import { useServers } from '../hooks/useServers';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

const knownCompanies = [
  { id: 'anthropic', name: 'Anthropic', keyword: 'anthropic', description: 'AI safety company behind Claude' },
  { id: 'openai', name: 'OpenAI', keyword: 'openai', description: 'Leading AI research organization' },
  { id: 'google', name: 'Google', keyword: 'google', description: 'Global technology leader' },
  { id: 'microsoft', name: 'Microsoft', keyword: 'microsoft', description: 'Enterprise software giant' },
  { id: 'github', name: 'GitHub', keyword: 'github', description: 'Developer platform' },
  { id: 'aws', name: 'AWS', keyword: 'aws', description: 'Cloud computing services' },
  { id: 'vercel', name: 'Vercel', keyword: 'vercel', description: 'Frontend deployment platform' },
  { id: 'supabase', name: 'Supabase', keyword: 'supabase', description: 'Open source Firebase alternative' },
  { id: 'alibaba', name: 'Alibaba', keyword: 'alibaba', description: 'Chinese e-commerce & cloud giant' },
  { id: 'tencent', name: 'Tencent', keyword: 'tencent', description: 'Chinese technology conglomerate' },
  { id: 'baidu', name: 'Baidu', keyword: 'baidu', description: 'Chinese search engine & AI leader' },
  { id: 'bytedance', name: 'ByteDance', keyword: 'bytedance', description: 'AI & content platform creator' },
  { id: 'huawei', name: 'Huawei', keyword: 'huawei', description: 'Global ICT solutions provider' },
  { id: 'xiaomi', name: 'Xiaomi', keyword: 'xiaomi', description: 'Consumer electronics & IoT' },
  { id: 'meituan', name: 'Meituan', keyword: 'meituan', description: 'Chinese e-commerce platform' },
  { id: 'jd', name: 'JD.com', keyword: 'jd', description: 'Chinese e-commerce company' },
  { id: 'netease', name: 'NetEase', keyword: 'netease', description: 'Chinese internet technology' },
  { id: 'meta', name: 'Meta', keyword: 'meta', description: 'Social media & VR technology' },
  { id: 'apple', name: 'Apple', keyword: 'apple', description: 'Consumer electronics leader' },
  { id: 'netflix', name: 'Netflix', keyword: 'netflix', description: 'Streaming entertainment' },
  { id: 'uber', name: 'Uber', keyword: 'uber', description: 'Ride-sharing & delivery' },
  { id: 'airbnb', name: 'Airbnb', keyword: 'airbnb', description: 'Hospitality marketplace' },
  { id: 'shopify', name: 'Shopify', keyword: 'shopify', description: 'E-commerce platform' },
  { id: 'docker', name: 'Docker', keyword: 'docker', description: 'Containerization platform' },
  { id: 'cloudflare', name: 'Cloudflare', keyword: 'cloudflare', description: 'CDN & security provider' },
  { id: 'datadog', name: 'Datadog', keyword: 'datadog', description: 'Cloud monitoring platform' },
  { id: 'elastic', name: 'Elastic', keyword: 'elastic', description: 'Search & analytics' },
  { id: 'mongodb', name: 'MongoDB', keyword: 'mongodb', description: 'NoSQL database platform' },
  { id: 'redis', name: 'Redis', keyword: 'redis', description: 'In-memory data store' },
  { id: 'stripe', name: 'Stripe', keyword: 'stripe', description: 'Payment processing platform' },
];

const Companies = React.memo(() => {
  const { data: serverData, isLoading, error } = useServers();
  const [searchQuery, setSearchQuery] = useState('');
  const servers = useMemo(() => serverData?.servers || [], [serverData?.servers]);

  const companyMap = useMemo(() => {
    const map = new Map<string, typeof servers>();
    
    knownCompanies.forEach((company) => {
      const keyword = company.keyword.toLowerCase();
      const companyServers = servers.filter((server) => {
        const owner = server.owner.toLowerCase();
        return owner.includes(keyword) || server.name.toLowerCase().includes(keyword);
      });
      if (companyServers.length > 0) {
        map.set(company.id, companyServers);
      }
    });

    return map;
  }, [servers]);

  const filteredCompanies = useMemo(() => {
    const entries = Array.from(companyMap.entries())
      .sort((a, b) => b[1].length - a[1].length);

    if (!searchQuery) return entries;

    const query = searchQuery.toLowerCase();
    return entries.filter(([id]) => {
      const company = knownCompanies.find((c) => c.id === id);
      return company && (
        company.name.toLowerCase().includes(query) ||
        company.description.toLowerCase().includes(query)
      );
    });
  }, [companyMap, searchQuery]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-12">
        <Helmet>
          <title>Companies &amp; Organizations | MCP Hub</title>
          <meta name="description" content="MCP servers maintained by well-known companies and organizations worldwide." />
        </Helmet>
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <div className="h-8 w-64 bg-gray-200 dark:bg-slate-800 rounded-lg animate-pulse mb-3"></div>
            <div className="h-5 w-96 bg-gray-200 dark:bg-slate-800 rounded-lg animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 animate-pulse">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-gray-200 dark:bg-slate-800 rounded-2xl"></div>
                  <div className="w-16 h-8 bg-gray-200 dark:bg-slate-800 rounded-lg"></div>
                </div>
                <div className="h-5 bg-gray-200 dark:bg-slate-800 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-full mb-4"></div>
                <div className="flex gap-2 mb-3">
                  <div className="h-6 bg-gray-200 dark:bg-slate-800 rounded-full w-20"></div>
                  <div className="h-6 bg-gray-200 dark:bg-slate-800 rounded-full w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && companyMap.size === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-12">
        <Helmet>
          <title>Companies &amp; Organizations | MCP Hub</title>
          <meta name="description" content="MCP servers maintained by well-known companies and organizations worldwide." />
        </Helmet>
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">Companies &amp; Organizations</h1>
            <p className="text-gray-600 dark:text-slate-300">MCP servers maintained by well-known companies and organizations</p>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center space-x-3">
            <AlertCircle size={20} className="flex-shrink-0" />
            <span className="text-sm">{error.message || 'Failed to load'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-12">
      <Helmet>
        <title>Companies &amp; Organizations | MCP Hub</title>
        <meta name="description" content="MCP servers maintained by well-known companies and organizations worldwide." />
      </Helmet>
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
            <Building2 size={32} className="text-primary-600 flex-shrink-0" />
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white">Companies &amp; Organizations</h1>
          </div>
          <p className="text-gray-600 dark:text-slate-300 mb-6">
            MCP servers maintained by {knownCompanies.length} well-known companies and organizations worldwide
          </p>

          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-6 py-4 rounded-xl mb-8 flex items-center">
            <div className="flex items-center space-x-3 min-w-0">
              <AlertCircle size={20} className="flex-shrink-0" />
              <span className="text-sm truncate">{error.message || 'Error'} - Showing partial data</span>
            </div>
          </div>
        )}

        {filteredCompanies.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Building2 size={40} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'No Companies Found' : 'No Company Servers Found'}
            </h2>
            <p className="text-gray-500 dark:text-slate-400 mb-6">
              {searchQuery
                ? `No companies matching "${searchQuery}" were found`
                : 'No servers associated with known companies were found in the database'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCompanies.map(([companyId, companyServers]) => {
              const company = knownCompanies.find((c) => c.id === companyId);
              if (!company) return null;

              const totalStars = companyServers.reduce((sum, s) => sum + s.stars, 0);

              return (
                <Card key={companyId}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg flex-shrink-0">
                          {company.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{company.name}</h2>
                          <p className="text-gray-500 dark:text-slate-400 text-sm truncate">{company.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 sm:gap-6 pl-14 sm:pl-0 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{companyServers.length}</div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">servers</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center text-amber-600">
                            <Star size={16} className="fill-current mr-1" />
                            <span className="text-xl sm:text-2xl font-bold">{totalStars.toLocaleString()}</span>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">total stars</div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {companyServers.slice(0, 6).map((server) => (
                        <Link
                          key={server.name}
                          to={`/servers/${encodeURIComponent(server.name)}`}
                          className="block p-4 border border-gray-100 dark:border-slate-800 rounded-xl hover:bg-gray-50 dark:bg-slate-950 hover:border-primary-100 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-primary-600 transition-colors flex items-center">
                                {server.name}
                                <ExternalLink size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 mt-1">{server.description}</p>
                              <div className="flex items-center space-x-2 mt-2">
                                <div className="flex items-center text-amber-600 text-xs">
                                  <Star size={12} className="fill-current mr-0.5" />
                                  <span>{server.stars}</span>
                                </div>
                                {server.language && (
                                  <Badge variant="default" size="sm">
                                    {server.language}
                                  </Badge>
                                )}
                                {server.source_type === 'official' && (
                                  <Badge variant="success" size="sm">
                                    Official
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                      {companyServers.length > 6 && (
                        <Link
                          to={`/servers?search=${encodeURIComponent(company.keyword)}`}
                          className="block p-4 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl hover:border-primary-200 hover:bg-primary-50 transition-all duration-200 text-center flex items-center justify-center"
                        >
                          <div>
                            <div className="text-primary-600 font-semibold">
                              +{companyServers.length - 6} more
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">View all</div>
                          </div>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default Companies;