/**
 * Home — the 3-layer product in one page.
 *
 * 6 sections, top to bottom:
 *   1. Hero (search + filter + CTA)
 *   2. 🏆 精选 (top 10 by 5-factor score)
 *   3. 🛠 我们的工具 (Layer 2 — adapted servers, empty for now)
 *   4. 🔥 热门 (top 20 by stars)
 *   5. 🆕 新上架 (last 7 days, top 12)
 *   6. 📂 分类浏览 (top categories + link to /browse)
 *
 * Plus a "data updates daily" badge at the bottom of the hero so users
 * know they're looking at a snapshot, not a live feed.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Sparkles, Search, Database, Star, Wrench, Zap, Tag, ArrowRight,
  Clock, TrendingUp, BookOpen,
} from 'lucide-react';
import { useServers } from '../hooks/useServers';
import { useStats } from '../hooks/useStats';
import { ServerCard } from '../components/server/ServerCard';
import { OurSignalBadge } from '../components/server/OurSignalBadge';

const Home = React.memo(() => {
  const { data: serverData } = useServers();
  const { data: stats } = useStats();

  const servers = useMemo(() => serverData?.servers || [], [serverData?.servers]);

  const totalServers = stats?.total_servers ?? servers.length;
  const totalCategories = stats?.total_categories ?? Object.keys(stats?.categories || {}).length;
  const ourToolsCount = stats?.our_tools_count ?? 0;
  const snapshotDate = stats?.data_snapshot_date ?? stats?.last_sync ?? 'unknown';
  const categoriesMap = stats?.categories || {};

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
    const cutoff = Date.now() - 7 * 86_400_000;
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Helmet>
        <title>MCP Hub — {totalServers.toLocaleString()}+ MCP servers, {ourToolsCount} universal adapters</title>
        <meta
          name="description"
          content={`The 3-layer MCP server directory: ${totalServers.toLocaleString()}+ upstream servers, ${ourToolsCount} universal adapters we've built, and an open contribution channel.`}
        />
      </Helmet>

      {/* ───── Section 1: Hero + search ───── */}
      <section className="relative bg-gradient-to-br from-primary-600 via-violet-600 to-accent-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="container mx-auto px-4 py-16 sm:py-24 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-5 border border-white/20">
              <Sparkles size={14} className="text-yellow-300" />
              <span className="text-sm text-white/90">
                {totalServers.toLocaleString()}+ MCP servers · {ourToolsCount} universal adapters
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 leading-tight">
              Discover, evaluate, install.
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-400">
                One config, every client.
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-white/80 mb-8 max-w-2xl leading-relaxed">
              The 3-layer directory of MCP servers. Browse {totalServers.toLocaleString()}+
              {' '}upstream repos, install the {ourToolsCount} we've already adapted as
              universal configs, or contribute a new one.
            </p>

            {/* Search bar */}
            <form
              action="/servers"
              method="get"
              className="flex flex-col sm:flex-row gap-3 max-w-2xl"
            >
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  name="q"
                  placeholder="Search servers, e.g. github, postgres, browser…"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-white/30 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-400 placeholder-slate-400"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all"
              >
                Search
              </button>
            </form>

            <div className="mt-4 text-xs text-white/60 flex items-center gap-1.5">
              <Clock size={12} />
              Data updates daily · snapshot {formatSnapshotDate(snapshotDate)}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-50 to-transparent dark:from-slate-950" />
      </section>

      {/* ───── Section 2: 🏆 精选 (top 10 by score) ───── */}
      <Section
        icon={<TrendingUp size={22} className="text-amber-500" />}
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
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench size={22} className="text-emerald-600" />
              <span>Our tools</span>
              <OurSignalBadge label="adapted" size="sm" iconOnly />
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Universal configs we've built, downloaded and tested.
            </p>
          </div>
          <Link
            to="/our-tools"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium flex items-center text-sm"
          >
            {ourToolsCount > 0 ? `See all ${ourToolsCount}` : 'Why empty?'}
            <ArrowRight size={16} className="ml-1" />
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
                <Wrench size={20} className="text-emerald-700 dark:text-emerald-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                  {ourToolsCount} / {totalServers.toLocaleString()} adapted
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
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
        icon={<Star size={22} className="text-amber-500" />}
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
        icon={<Zap size={22} className="text-amber-500" />}
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
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Tag size={22} className="text-violet-500" />
              <span>Browse by category</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {totalCategories.toLocaleString()} categories in total
            </p>
          </div>
          <Link
            to="/browse"
            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium flex items-center text-sm"
          >
            All categories
            <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {topCategories.map(([name, count]) => (
            <Link
              key={name}
              to={`/servers?category=${encodeURIComponent(name)}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-primary-300 hover:text-primary-600 dark:hover:border-primary-500 dark:hover:text-primary-400 transition-colors"
            >
              {name}
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {count.toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ───── Section 7: Data badge ───── */}
      <section className="container mx-auto px-4 pb-16">
        <div className="rounded-2xl bg-gradient-to-br from-primary-600 via-violet-600 to-accent-600 text-white p-6 sm:p-10 text-center">
          <BookOpen size={36} className="mx-auto mb-4 text-white/80" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">
            Snapshot data, refreshed daily
          </h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-5">
            The catalog above is the daily-upstream MCP index, frozen at
            {' '}
            <code className="font-mono text-sm bg-white/10 px-1.5 py-0.5 rounded">
              {formatSnapshotDate(snapshotDate)}
            </code>
            . The page itself runs as a static SPA on GitHub Pages; no
            backend, no live API.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/servers"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 text-primary-700 dark:text-primary-300 font-semibold rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
            >
              <Database size={16} />
              Full server list
            </Link>
            <Link
              to="/more"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/20"
            >
              <Clock size={16} />
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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
      </div>
      <Link
        to={linkTo}
        className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium flex items-center text-sm"
      >
        {linkLabel}
        <ArrowRight size={16} className="ml-1" />
      </Link>
    </div>
    {children}
  </section>
);

const EmptyHint: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
    {children}
  </div>
);

export default Home;
