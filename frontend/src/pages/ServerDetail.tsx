import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { IconArrowLeft, IconStar, IconClock, IconCode, IconExternalLink, IconCopy, IconCircleCheck, IconMessageCircle, IconThumbUp, IconTrendingUp, IconShield, IconTag, IconBook, IconChevronRight, IconLoader2, IconDownload, IconFileCode, IconFileText } from '@tabler/icons-react';
import { Github } from '../components/icons/Github';
import type { ServerConfig, Server } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { QualityBadge } from '../components/shared/QualityBadge';
import { getQualityScore, getQualityDisplay } from '../lib/quality';
import { FavoritesButton } from '../components/user/FavoritesButton';
import { RatingSection } from '../components/user/RatingSection';
import { CommentSection } from '../components/user/CommentSection';
import { InstallPanel } from '../components/server/InstallPanel';
import { UniversalConfig } from '../components/server/UniversalConfig';
import { ScoreRadar } from '../components/server/ScoreRadar';
import { OurSignalBadge } from '../components/server/OurSignalBadge';
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
  const { config: configData, loading: loadingConfig } = useServerConfig(decodedName);
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
      console.error('IconCopy failed:', e);
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
      <div className="min-h-screen bg-background py-16">
        <Helmet>
          <title>Loading Server | MCP Hub</title>
        </Helmet>
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-col items-center justify-center py-16">
            <IconLoader2 className="w-8 h-8 text-primary animate-spin mb-3" aria-hidden="true" />
            <p className="text-muted-foreground text-sm">Loading server…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="min-h-screen bg-background py-16">
        <Helmet>
          <title>Server Not Found | MCP Hub</title>
          <meta name="description" content="The server you're looking for doesn't exist or has been removed." />
        </Helmet>
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <IconCode size={40} className="text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Server Not Found</h1>
            <p className="text-muted-foreground mb-6">The server &quot;{decodedName}&quot; doesn't exist or has been removed from the catalog.</p>
            <Link to="/servers" className="inline-flex items-center text-primary hover:text-foreground font-medium">
              <IconArrowLeft size={16} className="mr-1" />
              Back to Servers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: IconBook },
    { id: 'config' as const, label: 'Configuration', icon: IconCode },
    { id: 'ratings' as const, label: 'Ratings', icon: IconThumbUp },
    { id: 'comments' as const, label: 'Comments', icon: IconMessageCircle },
  ];

  const categories = server.categories || [];
  const topics = server.topics || [];

  return (
    <>
      <Helmet>
        <title>{server.name} - MCP Server Details | MCP Hub</title>
        <meta name="description" content={server.description} />
      </Helmet>
      <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-16 z-30">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-12 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">IconHome</Link>
            <IconChevronRight size={14} className="mx-2" />
            <Link to="/servers" className="hover:text-foreground transition-colors">Servers</Link>
            <IconChevronRight size={14} className="mx-2" />
            <span className="text-foreground font-medium truncate max-w-[200px]">{server.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <Card className="overflow-hidden">
              <div className="h-2 bg-primary" />
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                  <div className="flex items-start space-x-5">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-3xl shadow-xl flex-shrink-0">
                      {server.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center flex-wrap gap-3 mb-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{server.name}</h1>
                        <QualityBadge score={qualityScore} size="md" showScore />
                        <OurSignalBadge
                          label={server.our_signal_label || 'unknown'}
                          size="sm"
                        />
                      </div>
                      <p className="text-muted-foreground">by <span className="font-medium text-foreground">@{server.owner}</span></p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                        <div className="flex items-center text-amber-600">
                          <IconStar size={18} className="fill-current mr-1.5 flex-shrink-0" />
                          <span className="font-bold text-lg">{server.stars.toLocaleString()}</span>
                          <span className="ml-1.5 text-[10px] uppercase tracking-wide font-medium text-amber-700/70 self-start mt-1.5">
                            snapshot
                          </span>
                        </div>
                        <div className="flex items-center text-muted-foreground min-w-0">
                          <IconClock size={16} className="mr-1.5 flex-shrink-0" />
                          <span className="text-sm truncate">{formatDate(server.updated_at)}</span>
                        </div>
                        {server.language && (
                          <div className="flex items-center text-muted-foreground min-w-0">
                            <IconCode size={16} className="mr-1.5 flex-shrink-0" />
                            <span className="text-sm truncate">{server.language}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-foreground mt-6 leading-relaxed">{server.description}</p>

                <div className="flex flex-wrap gap-2 mt-6">
                  {categories.map((category: string) => (
                    <Badge key={category} variant="primary" className="bg-secondary text-foreground">
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
                    <Badge key={topic} variant="default" className="bg-muted text-foreground">{topic}</Badge>
                  ))}
                </div>

                <div className="flex items-center flex-wrap gap-3 mt-6 pt-6 border-t border-border">
                  <FavoritesButton serverName={server.name} userId={userId} />
                  <a
                    href={server.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all hover:shadow-lg text-sm font-medium"
                  >
                    <Github size={16} />
                    <span>View on GitHub</span>
                    <IconExternalLink size={14} className="opacity-60" />
                  </a>
                  <Link
                    to="/submit"
                    className="inline-flex items-center space-x-2 px-4 py-2.5 border border-border text-foreground rounded-xl hover:bg-accent hover:text-accent-foreground transition-all text-sm font-medium"
                  >
                    <IconTag size={16} />
                    <span>Report Issue</span>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 sm:p-8">
                <div className="flex items-center space-x-2 mb-6">
                  <IconShield size={20} className="text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Quality Assessment</h2>
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
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="text-xs font-medium text-muted-foreground">{item.detail}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
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
                <p className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5">
                  <IconClock size={12} aria-hidden="true" />
                  <span>Snapshot data — last synced {stats?.data_snapshot_date ? new Date(stats.data_snapshot_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'unknown'}. Scores are derived from the snapshot and will refresh once the FastAPI backend is connected.</span>
                </p>
              </CardContent>
            </Card>

            {/* Phase 7: 5-factor score breakdown (radar) — only if build-time
                gen_static_data.py populated score_breakdown for this server. */}
            {server.score_breakdown && (
              <Card>
                <CardContent className="p-6 sm:p-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <IconTrendingUp size={20} className="text-primary" />
                    <h2 className="text-lg font-bold text-foreground">
                      Score breakdown
                    </h2>
                    <span className="ml-auto text-xs text-muted-foreground">
                      weighted: stars 30% · recency 15% · lang 15% · docs 20% · ours 20%
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <ScoreRadar breakdown={server.score_breakdown} size={240} />
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-1 gap-2 w-full">
                      {(
                        [
                          ['Stars', server.score_breakdown.stars],
                          ['Recency', server.score_breakdown.recency],
                          ['Lang coverage', server.score_breakdown.lang_coverage],
                          ['Docs quality', server.score_breakdown.desc_quality],
                          ['Our signal', server.score_breakdown.our_signal],
                        ] as Array<[string, number]>
                      ).map(([label, value]) => (
                        <div
                          key={label}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {label}
                          </span>
                          <span className="font-medium text-foreground">
                            {Math.round(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Phase 7: Install panel — 1-line install + npx/uvx + GitHub + ZIP. */}
            <InstallPanel server={server} />

            {/* Phase 7: Universal config — only when we have an adapter
                (our_signal_label === 'adapted' / 'in_progress'). For now
                this branch never fires because Layer 2 is empty; the
                component will start rendering in Phase 9. */}
            {(server.our_signal ?? 0) >= 0.7 && (
              <UniversalConfig server={server} />
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-1 bg-muted rounded-xl p-1 overflow-x-auto scrollbar-hide">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0 ${
                          activeTab === tab.id
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
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
                      <div className="flex items-center space-x-3 p-4 bg-background rounded-xl">
                        <IconBook size={20} className="text-muted-foreground" />
                        <div>
                          <span className="text-sm text-muted-foreground">License</span>
                          <p className="font-medium text-foreground">{server.license}</p>
                        </div>
                      </div>
                    )}
                    {topics.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">Topics</h3>
                        <div className="flex flex-wrap gap-2">
                          {topics.map((topic: string) => (
                            <span key={topic} className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-default">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3">Categories</h3>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat: string) => (
                          <Link
                            key={cat}
                            to={`/servers?category=${encodeURIComponent(cat)}`}
                            className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-sm hover:bg-accent transition-colors"
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
                      <h3 className="text-sm font-semibold text-muted-foreground">MCP Configuration</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => server && config && downloadConfigJson(config as unknown as Record<string, unknown>, `${server.name}-config.json`)}
                          disabled={downloading || !server || !config}
                          className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all disabled:opacity-50"
                        >
                          <IconFileCode size={16} />
                          <span>JSON</span>
                          <IconDownload size={12} />
                        </button>
                        <button
                          onClick={() => server && config && downloadConfigMd(JSON.stringify(config, null, 2), `${server.name}-config.md`)}
                          disabled={downloading || !server || !config}
                          className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all disabled:opacity-50"
                        >
                          <IconFileText size={16} />
                          <span>MD</span>
                          <IconDownload size={12} />
                        </button>
                        <button
                          onClick={() => copyConfig(getDisplayConfig())}
                          className="flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-foreground hover:text-foreground hover:bg-accent rounded-lg transition-all"
                        >
                          {copied ? (
                            <><IconCircleCheck size={16} className="text-green-500" /><span className="text-green-600">Copied</span></>
                          ) : (
                            <><IconCopy size={16} /><span>IconCopy</span></>
                          )}
                        </button>
                      </div>
                    </div>
                    {loadingConfig ? (
                      <div className="bg-gray-950 rounded-xl p-5 overflow-x-auto">
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <IconLoader2 size={16} className="animate-spin" />
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
                            <span className="text-muted-foreground text-xs ml-2">mcp-config.json</span>
                          </div>
                          <pre className="text-gray-100 text-sm font-mono leading-relaxed">
                            {getDisplayConfig()}
                          </pre>
                        </div>
                        <button
                          onClick={() => copyConfig(getDisplayConfig())}
                          className="absolute top-12 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-muted-foreground hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                          {copied ? <IconCircleCheck size={16} /> : <IconCopy size={16} />}
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-4 text-center">
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
                      <IconTrendingUp size={18} className="text-primary flex-shrink-0" />
                      <h2 className="text-lg font-bold text-foreground">Similar Servers</h2>
                    </div>
                    <Link to={`/servers?search=${encodeURIComponent(server.name.split('-')[0] ?? '')}`} className="text-sm text-primary hover:text-foreground font-medium">
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
                        className="flex items-start space-x-3 p-4 bg-background rounded-xl hover:bg-accent hover:border-primary-100 border border-transparent transition-all group"
                      >
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-sm truncate group-hover:text-foreground transition-colors">{s.name}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{s.description}</p>
                          <div className="flex items-center space-x-2 mt-1.5">
                            <div className="flex items-center text-amber-600 text-xs">
                              <IconStar size={10} className="fill-current mr-0.5" />
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
                <h3 className="text-lg font-bold text-foreground flex items-center space-x-2">
                  <IconCode size={18} className="text-primary" />
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
                          <><IconCircleCheck size={16} className="mr-1.5" />Copied</>
                        ) : (
                          <><IconCopy size={16} className="mr-1.5" />IconCopy to Clipboard</>
                        )}
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          onClick={() => server && config && downloadConfigJson(config as unknown as Record<string, unknown>, `${server.name}-config.json`)}
                          disabled={downloading || !server || !config}
                          className="w-full flex items-center justify-center text-sm"
                          size="sm"
                        >
                          <IconFileCode size={14} className="mr-1" />
                          <span>JSON</span>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => server && config && downloadConfigMd(JSON.stringify(config, null, 2), `${server.name}-config.md`)}
                          disabled={downloading || !server || !config}
                          className="w-full flex items-center justify-center text-sm"
                          size="sm"
                        >
                          <IconFileText size={14} className="mr-1" />
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
                <h3 className="text-lg font-bold text-foreground flex items-center space-x-2">
                  <IconTrendingUp size={18} className="text-primary" />
                  <span>Stats</span>
                </h3>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[
                    { icon: IconStar, label: 'Stars', value: server.stars.toLocaleString(), color: 'text-amber-600', bg: 'bg-amber-50' },
                    { icon: IconTag, label: 'Categories', value: categories.length.toString(), color: 'text-primary', bg: 'bg-muted' },
                    { icon: IconBook, label: 'Topics', value: topics.length.toString(), color: 'text-violet-600', bg: 'bg-violet-50' },
                    { icon: IconShield, label: 'Quality', value: `${qualityScore}/100`, color: qualityLevel.color.replace('text-', 'text-'), bg: qualityLevel.bg },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-background">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 ${item.bg} rounded-lg flex items-center justify-center`}>
                            <Icon size={16} className={item.color} />
                          </div>
                          <span className="text-sm text-muted-foreground">{item.label}</span>
                        </div>
                        <span className="font-bold text-foreground">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {server.license && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-bold text-foreground">License</h3>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                      <IconBook size={18} className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{server.license}</p>
                      <p className="text-xs text-muted-foreground">Open Source License</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <h3 className="text-lg font-bold text-foreground">Actions</h3>
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
                  <IconExternalLink size={14} className="opacity-60" />
                </a>
                <Link
                  to="/submit"
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-border text-foreground rounded-xl hover:bg-accent hover:text-accent-foreground transition-all text-sm font-medium"
                >
                  <IconTag size={16} />
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