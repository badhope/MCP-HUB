/**
 * OurTools — Layer 2 of the 3-layer product model.
 *
 * "Servers we've downloaded and turned into a universal install." Today
 * this is empty (Phase 9 will add the first adapters — fastmcp et al.);
 * when empty, we show a guided empty state that points users at the
 * More tab.
 *
 * When non-empty, we render a grid of adapted servers with their
 * OurSignalBadge, install hint, and a one-line "tested on" trust
 * signal. Clicking a card lands on its ServerDetail (which now shows
 * the UniversalConfig block).
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Wrench, Sparkles, ArrowRight, Star } from 'lucide-react';
import { useServers } from '../hooks/useServers';
import { useStats } from '../hooks/useStats';
import { ServerCard } from '../components/server/ServerCard';

const OurTools = React.memo(() => {
  const { data: serverData } = useServers();
  const { data: stats } = useStats();

  const servers = useMemo(() => serverData?.servers || [], [serverData?.servers]);
  const ourTools = useMemo(
    () => servers.filter((s) => (s.our_signal ?? 0) >= 0.7),
    [servers]
  );

  // Stats: prefer the index's own our_tools_count; fall back to the
  // in-memory count. Both should agree; the index is just a sanity
  // header for the page.
  const ourToolsCount: number = stats?.our_tools_count ?? ourTools.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Helmet>
        <title>Our Tools — MCP Hub</title>
        <meta
          name="description"
          content="Universal MCP adapters we've built, downloaded and tested across Claude / Cursor / Cline / Windsurf."
        />
      </Helmet>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 via-violet-600 to-accent-600 text-white">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-4 border border-white/20">
              <Wrench size={14} />
              <span className="text-sm text-white/90">Layer 2 · Universal adapters</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Our Tools
            </h1>
            <p className="text-lg text-white/80 leading-relaxed">
              MCP servers we've downloaded, studied, and turned into a
              one-line install. One config, every client.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto px-4 py-10 sm:py-14">
        {ourTools.length === 0 ? (
          <EmptyState />
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles size={20} className="text-primary-600" />
                  Adapted servers
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {ourToolsCount} of {servers.length.toLocaleString()} indexed
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {ourTools.map((s) => (
                <ServerCard key={s.name} server={s} />
              ))}
            </div>
          </div>
        )}

        {/* Always-on "what this is" footer */}
        <div className="mt-12 text-xs text-slate-400 dark:text-slate-500 max-w-2xl">
          <p>
            <strong className="text-slate-500 dark:text-slate-400">
              Why "Our Tools"?
            </strong>{' '}
            The catalog above the homepage has {servers.length.toLocaleString()}+
            {' '}upstream MCP servers. Most of them work, but their install steps
            differ in subtle ways. We pick a handful, study them, and ship a
            single tested config that works on Claude, Cursor, Cline, and
            Windsurf without per-client tweaks.
            {' '}
            <Link to="/more" className="text-primary-600 hover:underline">
              Want to recommend one?
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
});

const EmptyState: React.FC = () => {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 sm:p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mx-auto mb-4 flex items-center justify-center">
          <Wrench className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          No adapters yet
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
          We're still picking the first upstream MCP server to study and adapt.
          The catalog above the homepage has 4,400+ candidates; we're going
          through them in order of how often they're downloaded by Claude /
          Cursor users.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/servers?sort=stars"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Star size={14} />
            Browse the most popular
          </Link>
          <Link
            to="/more"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Suggest one
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OurTools;
