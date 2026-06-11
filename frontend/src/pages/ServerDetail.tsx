import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Star, Clock, Code2, ExternalLink, Copy, CheckCircle, MessageSquare, ThumbsUp, TrendingUp, Shield, Tag, BookOpen, ChevronRight, Loader2, Download, FileJson, FileText } from 'lucide-react';
import { Github } from '../components/icons/Github';
import { ServerConfig, Server } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { QualityBadge } from '../components/shared/QualityBadge';
import { getQualityScore, getQualityDisplay } from '../lib/quality';
import { FavoritesButton } from '../components/user/FavoritesButton';
import { RatingSection } from '../components/user/RatingSection';
import { CommentSection } from '../components/user/CommentSection';
import { useServers } from '../hooks/useServers';
import { useServerConfig } from '../hooks/useServerDetail';
import { useDownloadConfig } from '../hooks/useExport';
import { useStats } from '../hooks/useStats';
import { apiClient } from '../lib/api';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const ServerDetail = React.memo(() => {
  const { name } = useParams<{ name: string }>();
  const decodedName = decodeURIComponent(name || '');
  const { data: serverData, isLoading: loadingServer } = useServers();
  const { data: configData, isLoading: loadingConfig } = useServerConfig(decodedName);
  const { data: stats } = useStats();

  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'ratings' | 'comments'>('overview');
  const [similarServers, setSimilarServers] = useState<Server[]>([]);
  const userId = 'default-user';
  const { downloading, downloadConfigJson, downloadConfigMd } = useDownloadConfig();

  const allServers = useMemo(() => serverData?.servers || [], [serverData?.servers]);

  const server = useMemo(() => {
    return allServers.find((s: Server) => s.name === decodedName);
  }, [allServers, decodedName]);

  const qualityScore = useMemo(() => server ? getQualityScore(server) : 0, [server]);
  const qualityLevel = getQualityDisplay(qualityScore);

  useEffect(() => {
    if (configData) {
      setConfig(configData as ServerConfig);
    }
  }, [configData]);

  useEffect(() => {
    if (server) {
      const loadSimilar = async () => {
        try {
          const res = await apiClient.getSimilarServers(server.name, 4);
          setSimilarServers(res.similar_servers || []);
        } catch {
          setSimilarServers([]);
        }
      };
      loadSimilar();
    }
  }, [server]);

  const copyConfig = async (text?: string) => {
    const configToCopy = text || config ? JSON.stringify(config, null, 2) : JSON.stringify({
      mcpServers: {
        [server?.name || 'server']: {
          command: 'your-command-here',
          args: [],
          env: {}
        }
      }
    }, null, 2);
    try {
      await navigator.clipboard.writeText(configToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed:', e);
    }
  };

  const getDisplayConfig = () => {
    if (config) return JSON.stringify(config, null, 2);
    if (server) {
      return JSON.stringify({
        mcpServers: {
          [server.name]: {
            command: 'your-command-here',
            args: [],
            env: {}
          }
        }
      }, null, 2);
    }
    return '';
  };

  if (loadingServer) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-16">
        <Helmet>
          <title>Loading Server | MCP Hub</title>
        </Helmet>
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" aria-hidden="true" />
            <p className="text-gray-500 dark:text-slate-400 text-sm">Loading server…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 py-16">
        <Helmet>
          <title>Server Not Found | MCP Hub</title>
          <meta name="description" content="The server you're looking for doesn't exist or has been removed." />
        </Helmet>
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Code2 size={40} className="text-gray-300 dark:text-slate-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Server Not Found</h1>
            <p className="text-gray-500 dark:text-slate-400 mb-6">The server &quot;{decodedName}&quot; doesn't exist or has been removed from the catalog.</p>
            <Link to="/servers" className="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium">
              <ArrowLeft size={16} className="mr-1" />
              Back to Servers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: BookOpen },
    { id: 'config' as const, label: 'Configuration', icon: Code2 },
    { id: 'ratings' as const, label: 'Ratings', icon: ThumbsUp },
    { id: 'comments' as const, label: 'Comments', icon: MessageSquare },
  ];

  const categories = server.categories || [];
  const topics = server.topics || [];

  return (
    <>
      <Helmet>
        <title>{server.name} - MCP Server Details | MCP Hub</title>
        <meta name="description" content={server.description} />
      </Helmet>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 sticky top-16 z-30">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-12 text-sm text-gray-500 dark:text-slate-400">
            <Link to="/" className="hover:text-primary-600 transition-colors">Home</Link>
            <ChevronRight size={14} className="mx-2" />
            <Link to="/servers" className="hover:text-primary-600 transition-colors">Servers</Link>
            <ChevronRight size={14} className="mx-2" />
            <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">{server.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <Card className="overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary-500 via-accent-500 to-violet-500" />
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                  <div className="flex items-start space-x-5">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-primary-500 via-violet-500 to-accent-500 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-xl flex-shrink-0">
                      {server.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-3 mb-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{server.name}</h1>
                        <QualityBadge score={qualityScore} size="md" showScore />
                      </div>
                      <p className="text-gray-500 dark:text-slate-400">by <span className="font-medium text-gray-700 dark:text-slate-200">@{server.owner}</span></p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                        <div className="flex items-center text-amber-600">
                          <Star size={18} className="fill-current mr-1.5 flex-shrink-0" />
                          <span className="font-bold text-lg">{server.stars.toLocaleString()}</span>
                          <span className="ml-1.5 text-[10px] uppercase tracking-wide font-medium text-amber-700/70 self-start mt-1.5">
                            snapshot
                          </span>
                        </div>
                        <div className="flex items-center text-gray-400 dark:text-slate-500 min-w-0">
                          <Clock size={16} className="mr-1.5 flex-shrink-0" />
                          <span className="text-sm truncate">{formatDate(server.updated_at)}</span>
                        </div>
                        {server.language && (
                          <div className="flex items-center text-gray-400 dark:text-slate-500 min-w-0">
                            <Code2 size={16} className="mr-1.5 flex-shrink-0" />
                            <span className="text-sm truncate">{server.language}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-gray-700 dark:text-slate-200 mt-6 leading-relaxed">{server.description}</p>

                <div className="flex flex-wrap gap-2 mt-6">
                  {categories.map((category: string) => (
                    <Badge key={category} variant="primary" className="bg-primary-50 text-primary-700 border-primary-100">
                      {category}
                    </Badge>
                  ))}
                  {server.source_type === 'official' && (
                    <Badge variant="success" className="bg-accent-50 text-accent-700 border-accent-100">Official</Badge>
                  )}
                  {server.archived && (
                    <Badge variant="warning">Archived</Badge>
                  )}
                  {topics.slice(0, 3).map((topic: string) => (
                    <Badge key={topic} variant="default" className="bg-slate-100 text-slate-600">{topic}</Badge>
                  ))}
                </div>

                <div className="flex items-center flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100 dark:border-slate-800">
                  <FavoritesButton serverName={server.name} userId={userId} />
                  <a
                    href={server.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all hover:shadow-lg text-sm font-medium"
                  >
                    <Github size={16} />
                    <span>View on GitHub</span>
                    <ExternalLink size={14} className="opacity-60" />
                  </a>
                  <Link
                    to="/submit"
                    className="inline-flex items-center space-x-2 px-4 py-2.5 border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200 rounded-xl hover:bg-gray-50 dark:bg-slate-950 transition-all text-sm font-medium"
                  >
                    <Tag size={16} />
                    <span>Report Issue</span>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center space-x-2 mb-6">
                  <Shield size={20} className="text-primary-600" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quality Assessment</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {[
                    { label: 'Stars', value: server.stars > 5000 ? 100 : server.stars > 1000 ? 80 : server.stars > 100 ? 60 : server.stars > 10 ? 40 : 20, detail: server.stars.toLocaleString() },
                    { label: 'Source', value: server.source_type === 'official' ? 100 : 60, detail: server.source_type === 'official' ? 'Official' : 'Community' },
                    { label: 'Maintenance', value: server.archived ? 0 : 80, detail: server.archived ? 'Archived' : 'Active' },
                    { label: 'Documentation', value: (server.description || '').length > 80 ? 100 : (server.description || '').length > 40 ? 70 : 40, detail: `${(server.description || '').length} chars` },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-slate-400">{item.label}</span>
                        <span className="text-xs font-medium text-gray-400 dark:text-slate-500">{item.detail}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            item.value >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                            item.value >= 60 ? 'bg-gradient-to-r from-blue-400 to-blue-500' :
                            item.value >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                            'bg-gradient-to-r from-red-400 to-red-500'
                          }`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Clock size={12} aria-hidden="true" />
                  <span>Snapshot data — last synced {stats?.data_snapshot_date ? new Date(stats.data_snapshot_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'unknown'}. Scores are derived from the snapshot and will refresh once the FastAPI backend is connected.</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1 overflow-x-auto scrollbar-hide">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                          activeTab === tab.id
                            ? 'bg-white dark:bg-slate-900 text-primary-700 shadow-sm'
                            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:text-slate-200'
                        }`}
                      >
                        <Icon size={14} className="sm:size-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </CardHeader>
              <CardContent className="p-6 sm:p-8">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {server.license && (
                      <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-slate-950 rounded-xl">
                        <BookOpen size={20} className="text-gray-400 dark:text-slate-500" />
                        <div>
                          <span className="text-sm text-gray-500 dark:text-slate-400">License</span>
                          <p className="font-medium text-gray-900 dark:text-white">{server.license}</p>
                        </div>
                      </div>
                    )}
                    {topics.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-3">Topics</h3>
                        <div className="flex flex-wrap gap-2">
                          {topics.map((topic: string) => (
                            <span key={topic} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-lg text-sm hover:bg-primary-50 hover:text-primary-700 transition-colors cursor-default">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-3">Categories</h3>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat: string) => (
                          <Link
                            key={cat}
                            to={`/servers?category=${encodeURIComponent(cat)}`}
                            className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm hover:bg-primary-100 transition-colors"
                          >
                            {cat}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'config' && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400">MCP Configuration</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => server && downloadConfigJson(server, config)}
                          disabled={downloading || !server}
                          className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all disabled:opacity-50"
                        >
                          <FileJson size={16} />
                          <span>JSON</span>
                          <Download size={12} />
                        </button>
                        <button
                          onClick={() => server && downloadConfigMd(server, config)}
                          disabled={downloading || !server}
                          className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all disabled:opacity-50"
                        >
                          <FileText size={16} />
                          <span>MD</span>
                          <Download size={12} />
                        </button>
                        <button
                          onClick={() => copyConfig(getDisplayConfig())}
                          className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                        >
                          {copied ? (
                            <><CheckCircle size={16} className="text-green-500" /><span className="text-green-600">Copied</span></>
                          ) : (
                            <><Copy size={16} /><span>Copy</span></>
                          )}
                        </button>
                      </div>
                    </div>
                    {loadingConfig ? (
                      <div className="bg-gray-950 rounded-xl p-5 overflow-x-auto">
                        <div className="flex items-center space-x-2 text-gray-400 dark:text-slate-500">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-sm">Loading configuration...</span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group">
                        <div className="bg-gray-950 rounded-xl p-5 overflow-x-auto">
                          <div className="flex items-center space-x-2 mb-3 pb-3 border-b border-gray-800">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-gray-500 dark:text-slate-400 text-xs ml-2">mcp-config.json</span>
                          </div>
                          <pre className="text-gray-100 text-sm font-mono leading-relaxed">
                            {getDisplayConfig()}
                          </pre>
                        </div>
                        <button
                          onClick={() => copyConfig(getDisplayConfig())}
                          className="absolute top-12 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 dark:text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                          {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-4 text-center">
                      {config ? 'Configuration auto-generated by MCP Hub API' : 'Configure the command and parameters based on the actual project'}
                    </p>
                  </div>
                )}

                {activeTab === 'ratings' && (
                  <RatingSection serverName={server.name} userId={userId} />
                )}

                {activeTab === 'comments' && (
                  <CommentSection serverName={server.name} userId={userId} />
                )}
              </CardContent>
            </Card>

            {similarServers.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <TrendingUp size={18} className="text-primary-600 flex-shrink-0" />
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Similar Servers</h2>
                    </div>
                    <Link to={`/servers?search=${encodeURIComponent(server.name.split('-')[0] ?? '')}`} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                      View All
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {similarServers.slice(0, 4).map((s) => (
                      <Link
                        key={s.name}
                        to={`/servers/${encodeURIComponent(s.name)}`}
                        className="flex items-start space-x-3 p-4 bg-gray-50 dark:bg-slate-950 rounded-xl hover:bg-primary-50 hover:border-primary-100 border border-transparent transition-all group"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-accent-400 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm truncate group-hover:text-primary-600 transition-colors">{s.name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">{s.description}</p>
                          <div className="flex items-center space-x-2 mt-1.5">
                            <div className="flex items-center text-amber-600 text-xs">
                              <Star size={10} className="fill-current mr-0.5" />
                              <span>{s.stars.toLocaleString()}</span>
                            </div>
                            <QualityBadge score={getQualityScore(s)} size="sm" />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Code2 size={18} className="text-primary-600" />
                  <span>Quick Config</span>
                </h3>
              </CardHeader>
              <CardContent className="p-6">
                {loadingConfig ? (
                  <div className="bg-gray-900 rounded-xl p-4 mb-4">
                    <pre className="text-gray-100 text-xs">Loading...</pre>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="bg-gray-950 rounded-xl p-4 mb-4 overflow-x-auto max-h-48 overflow-y-auto">
                      <pre className="text-gray-100 text-xs font-mono">{getDisplayConfig().substring(0, 300)}{getDisplayConfig().length > 300 ? '...' : ''}</pre>
                    </div>
                    <div className="space-y-2">
                      <Button
                        onClick={() => copyConfig(getDisplayConfig())}
                        className="w-full flex items-center justify-center text-sm"
                        size="sm"
                      >
                        {copied ? (
                          <><CheckCircle size={16} className="mr-1.5" />Copied</>
                        ) : (
                          <><Copy size={16} className="mr-1.5" />Copy to Clipboard</>
                        )}
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => server && downloadConfigJson(server, config)}
                          disabled={downloading || !server}
                          className="w-full flex items-center justify-center text-sm"
                          size="sm"
                        >
                          <FileJson size={14} className="mr-1" />
                          <span>JSON</span>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => server && downloadConfigMd(server, config)}
                          disabled={downloading || !server}
                          className="w-full flex items-center justify-center text-sm"
                          size="sm"
                        >
                          <FileText size={14} className="mr-1" />
                          <span>MD</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <TrendingUp size={18} className="text-primary-600" />
                  <span>Stats</span>
                </h3>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[
                    { icon: Star, label: 'Stars', value: server.stars.toLocaleString(), color: 'text-amber-600', bg: 'bg-amber-50' },
                    { icon: Tag, label: 'Categories', value: categories.length.toString(), color: 'text-primary-600', bg: 'bg-primary-50' },
                    { icon: BookOpen, label: 'Topics', value: topics.length.toString(), color: 'text-violet-600', bg: 'bg-violet-50' },
                    { icon: Shield, label: 'Quality', value: `${qualityScore}/100`, color: qualityLevel.color.replace('text-', 'text-'), bg: qualityLevel.bg },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-slate-950">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 ${item.bg} rounded-lg flex items-center justify-center`}>
                            <Icon size={16} className={item.color} />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-slate-300">{item.label}</span>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {server.license && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">License</h3>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                      <BookOpen size={18} className="text-gray-500 dark:text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{server.license}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Open Source License</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Actions</h3>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <a
                  href={server.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all text-sm font-medium"
                >
                  <Github size={16} />
                  <span>View on GitHub</span>
                  <ExternalLink size={14} className="opacity-60" />
                </a>
                <Link
                  to="/submit"
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-200 rounded-xl hover:bg-gray-50 dark:bg-slate-950 transition-all text-sm font-medium"
                >
                  <Tag size={16} />
                  <span>Suggest Edit</span>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
    </>
  );
});

export default ServerDetail;