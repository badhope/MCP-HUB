/**
 * IconHome — the 3-layer product in one page.
 *
 * 6 sections, top to bottom:
 *   1. Hero (search + filter + CTA)
 *   2. 🏆 精选 (top 10 by 5-factor score)
 *   3. 🛠 我们的工具 (Layer 2 — adapted servers, empty for now)
 *   4. 🔥 热门 (top 20 by stars)
 *   5. 🆕 新上架 (last 7 days, top 12)
 *   6. 📂 分类浏览 (top categories + link to /browse)
 *
 * IconPlus a "data updates daily" badge at the bottom of the hero so users
 * know they're looking at a snapshot, not a live feed.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  IconSearch, IconDatabase, IconStar, IconTool, IconBolt, IconTag, IconArrowRight,
  IconClock, IconTrendingUp, IconBook,
} from '@tabler/icons-react';
import { useServers } from '../hooks/useServers';
import { useStats } from '../hooks/useStats';
import { ServerCard } from '../components/server/ServerCard';
import { OurSignalBadge } from '../components/server/OurSignalBadge';

const IconHome = React.memo(() => {
  const { data: serverData } = useServers();
  const { data: stats } = useStats();

  const servers = useMemo(() => serverData?.servers || [], [serverData?.servers]);

  const totalServers = stats?.total_servers ?? servers.length;
  const totalCategories = stats?.total_categories ?? Object.keys(stats?.categories || {}).length;
  const ourToolsCount = stats?.our_tools_count ?? 0;
  const snapshotDate = stats?.data_snapshot_date ?? stats?.last_sync ?? 'unknown';
  const categoriesMap = useMemo(() => stats?.categories || {}, [stats?.categories]);

  const topByScore = useMemo(
    () => [...servers]
      .filter((s) => typeof s.score === 'number')
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 10),
    [servers]
  );
  const popular = useMemo(
    () => [...servers].sort((a, b) => b.stars - a.stars).slice(0, 8),
    [servers]
  );
  const recent = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const cutoff = new Date(Date.now() - 7 * 86_400_000).getTime();
    return [...servers]
      .filter((s) => new Date(s.updated_at).getTime() >= cutoff)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 12);
  }, [servers]);
  const ourTools = useMemo(
    () => servers.filter((s) => (s.our_signal ?? 0) >= 0.7).slice(0, 8),
    [servers]
  );
  const topCategories = useMemo(
    () => Object.entries(categoriesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 21),
    [categoriesMap]
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>MCP Hub — {totalServers.toLocaleString()}+ MCP servers, {ourToolsCount} universal adapters</title>
        <meta
          name="description"
          content={`The 3-layer MCP server directory: ${totalServers.toLocaleString()}+ upstream servers, ${ourToolsCount} universal adapters we've built, and an open contribution channel.`}
        />
      </Helmet>

      {/* ───── Section 1: Hero + search ───── */}
      <section className="relative bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-16 sm:py-24 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 leading-tight">
              Discover, evaluate, install.
            </h1>
            <p className="text-lg sm:text-xl text-primary-foreground/80 mb-8 max-w-2xl leading-relaxed">
              The 3-layer directory of MCP servers. Browse {totalServers.toLocaleString()}+
              {' '}upstream repos, install the {ourToolsCount} we've already adapted as
              universal configs, or contribute a new one.
            </p>

            {/* IconSearch bar */}
            <form
              action="/servers"
              method="get"
              className="flex flex-col sm:flex-row gap-3 max-w-2xl"
            >
              <div className="flex-1 relative">
                <IconSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  name="q"
                  placeholder="IconSearch servers, e.g. github, postgres, browser…"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-foreground bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary-400 placeholder-muted-foreground"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3.5 bg-card text-foreground font-semibold rounded-xl hover:bg-accent hover:text-accent-foreground transition-all"
              >
                IconSearch
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ───── Section 2: 🏆 精选 (top 10 by score) ───── */}
      <Section
        icon={<IconTrendingUp size={22} className="text-amber-500" />}
        title="Featured"
        subtitle="Top 10 by our 5-factor score"
        linkTo="/servers?sort=score"
        linkLabel="See all"
      >
        {topByScore.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {topByScore.slice(0, 8).map((s) => (
              <ServerCard key={s.name} server={s} />
            ))}
          </div>
        ) : (
          <EmptyHint>Score breakdown will appear after the next daily sync.</EmptyHint>
        )}
      </Section>

      {/* ───── Section 3: 🛠 我们的工具 (Layer 2) ───── */}
      <section className="container mx-auto px-4 mt-14">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <IconTool size={22} className="text-emerald-600" />
              <span>Our tools</span>
              <OurSignalBadge label="adapted" size="sm" iconOnly />
            </h2>
            <p className="text-muted-foreground mt-1">
              Universal configs we've built, downloaded and tested.
            </p>
          </div>
          <Link
            to="/our-tools"
            className="text-primary hover:text-foreground font-medium flex items-center text-sm"
          >
            {ourToolsCount > 0 ? `See all ${ourToolsCount}` : 'Why empty?'}
            <IconArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        {ourTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {ourTools.map((s) => (
              <ServerCard key={s.name} server={s} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/10 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center flex-shrink-0">
                <IconTool size={20} className="text-emerald-700 dark:text-emerald-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground mb-1">
                  {ourToolsCount} / {totalServers.toLocaleString()} adapted
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We haven't shipped any universal adapters yet. The first one is
                  queued for the next release. Want to help pick which upstream
                  server we adapt first?{' '}
                  <Link to="/more" className="text-emerald-700 dark:text-emerald-300 font-medium hover:underline">
                    Open the More tab
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ───── Section 4: 🔥 热门 (top 20 by stars) ───── */}
      <Section
        icon={<IconStar size={22} className="text-amber-500" />}
        title="Popular"
        subtitle="Most-starred servers in the catalog"
        linkTo="/servers?sort=stars"
        linkLabel="See all"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {popular.map((s) => (
            <ServerCard key={s.name} server={s} />
          ))}
        </div>
      </Section>

      {/* ───── Section 5: 🆕 新上架 (last 7 days) ───── */}
      <Section
        icon={<IconBolt size={22} className="text-amber-500" />}
        title="Newly updated"
        subtitle="Servers touched in the last 7 days"
        linkTo="/servers?sort=updated"
        linkLabel="See all"
      >
        {recent.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recent.map((s) => (
              <ServerCard key={s.name} server={s} />
            ))}
          </div>
        ) : (
          <EmptyHint>Nothing in the last 7 days. Try the popular list instead.</EmptyHint>
        )}
      </Section>

      {/* ───── Section 6: 📂 分类浏览 (top categories) ───── */}
      <section className="container mx-auto px-4 mt-14 mb-16">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <IconTag size={22} className="text-violet-500" />
              <span>Browse by category</span>
            </h2>
            <p className="text-muted-foreground mt-1">
              {totalCategories.toLocaleString()} categories in total
            </p>
          </div>
          <Link
            to="/browse"
            className="text-primary hover:text-foreground font-medium flex items-center text-sm"
          >
            All categories
            <IconArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {topCategories.map(([name, count]) => (
            <Link
              key={name}
              to={`/servers?category=${encodeURIComponent(name)}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:border-primary-300 hover:text-foreground transition-colors"
            >
              {name}
              <span className="text-xs text-muted-foreground">
                {count.toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ───── Section 7: Data badge ───── */}
      <section className="container mx-auto px-4 pb-16">
        <div className="rounded-2xl bg-muted border border-border p-6 sm:p-10 text-center">
          <IconBook size={36} className="mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground">
            Snapshot data, refreshed daily
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-5">
            The catalog above is the daily-upstream MCP index, frozen at
            {' '}
            <code className="font-mono text-sm bg-card px-1.5 py-0.5 rounded">
              {formatSnapshotDate(snapshotDate)}
            </code>
            . The page itself runs as a static SPA on GitHub Pages; no
            backend, no live API.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/servers"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-card text-foreground font-semibold rounded-xl hover:bg-accent hover:text-accent-foreground transition-all"
            >
              <IconDatabase size={16} />
              Full server list
            </Link>
            <Link
              to="/more"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-muted/50 text-foreground font-semibold rounded-xl hover:bg-accent transition-all border border-border"
            >
              <IconClock size={16} />
              How the data flows
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
});

// ----- helpers -----

function formatSnapshotDate(s: string): string {
  if (!s || s === 'unknown') return 'unknown';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const Section: React.FC<React.PropsWithChildren<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  linkTo: string;
  linkLabel: string;
}>> = ({ icon, title, subtitle, linkTo, linkLabel, children }) => (
  <section className="container mx-auto px-4 mt-14">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
      <div className="min-w-0">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </h2>
        <p className="text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <Link
        to={linkTo}
        className="text-primary hover:text-foreground font-medium flex items-center text-sm"
      >
        {linkLabel}
        <IconArrowRight size={16} className="ml-1" />
      </Link>
    </div>
    {children}
  </section>
);

const EmptyHint: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="rounded-2xl border border-dashed border-border bg-muted/50 px-6 py-8 text-center text-sm text-muted-foreground">
    {children}
  </div>
);

export default IconHome;
