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
import { IconTool, IconSparkles, IconArrowRight, IconStar } from '@tabler/icons-react';
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
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Our Tools — MCP Hub</title>
        <meta
          name="description"
          content="Universal MCP adapters we've built, downloaded and tested across Claude / Cursor / Cline / Windsurf."
        />
      </Helmet>

      {/* Hero */}
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-muted/50 rounded-full px-4 py-1.5 mb-4 border border-border">
              <IconTool size={14} />
              <span className="text-sm text-foreground">Layer 2 · Universal adapters</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              Our Tools
            </h1>
            <p className="text-lg text-primary-foreground/80 leading-relaxed">
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
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <IconSparkles size={20} className="text-primary" />
                  Adapted servers
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
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
        <div className="mt-12 text-xs text-muted-foreground max-w-2xl">
          <p>
            <strong className="text-foreground">
              Why "Our Tools"?
            </strong>{' '}
            The catalog above the homepage has {servers.length.toLocaleString()}+
            {' '}upstream MCP servers. Most of them work, but their install steps
            differ in subtle ways. We pick a handful, study them, and ship a
            single tested config that works on Claude, Cursor, Cline, and
            Windsurf without per-client tweaks.
            {' '}
            <Link to="/more" className="text-primary hover:underline">
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
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 sm:p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center">
          <IconTool className="w-7 h-7 text-primary-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No adapters yet
        </h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          We're still picking the first upstream MCP server to study and adapt.
          The catalog above the homepage has 4,400+ candidates; we're going
          through them in order of how often they're downloaded by Claude /
          Cursor users.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/servers?sort=stars"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <IconStar size={14} />
            Browse the most popular
          </Link>
          <Link
            to="/more"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Suggest one
            <IconArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OurTools;
