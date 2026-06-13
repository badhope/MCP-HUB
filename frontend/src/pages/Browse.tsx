/**
 * Browse — full list of all categories. Sits behind the "All categories"
 * link in the IconHome page footer and the Navbar.
 *
 * Two views:
 *   - "All categories" tab: a list of every category with the server
 *     count and a one-click filter.
 *   - "By language" tab: same shape but grouped by primary language.
 *
 * Both tabs reuse the data from `useStats()` (which pulls from the
 * build-time `categories` / `languages` maps in servers-index.json).
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { IconSearch, IconTag, IconCode, IconArrowRight } from '@tabler/icons-react';
import { useStats } from '../hooks/useStats';

type Tab = 'categories' | 'languages';

const Browse = React.memo(() => {
  const { data: stats } = useStats();
  const [tab, setTab] = useState<Tab>('categories');
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const map: Record<string, number> =
      tab === 'categories' ? stats?.categories || {} : stats?.languages || {};
    return (Object.entries(map) as Array<[string, number]>)
      .filter(([name]) => name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b[1] - a[1]);
  }, [tab, query, stats]);

  const totalCategories = Object.keys(stats?.categories || {}).length;
  const totalLanguages = Object.keys(stats?.languages || {}).length;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Browse — MCP Hub</title>
        <meta
          name="description"
          content={`Browse all ${totalCategories} categories and ${totalLanguages} languages in the MCP server catalog.`}
        />
      </Helmet>

      <div className="container mx-auto px-4 py-10 sm:py-14">
        <div className="max-w-3xl mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Browse
          </h1>
          <p className="text-muted-foreground">
            {totalCategories.toLocaleString()} categories · {totalLanguages.toLocaleString()} languages.
            Click any tag to filter the full server list.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <TabButton
            active={tab === 'categories'}
            onClick={() => setTab('categories')}
            icon={<IconTag size={14} />}
            label="Categories"
            count={totalCategories}
          />
          <TabButton
            active={tab === 'languages'}
            onClick={() => setTab('languages')}
            icon={<IconCode size={14} />}
            label="Languages"
            count={totalLanguages}
          />
        </div>

        {/* IconSearch */}
        <div className="relative max-w-md mb-6">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={`IconFilter ${tab}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* IconTag grid */}
        {items.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {items.map(([name, count]) => {
              const qp = tab === 'categories' ? `category=${encodeURIComponent(name)}` : `language=${encodeURIComponent(name)}`;
              return (
                <Link
                  key={name}
                  to={`/servers?${qp}`}
                  className="group inline-flex items-center gap-2 px-3.5 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:border-primary-300 hover:text-foreground transition-colors"
                >
                  {name}
                  <span className="text-xs text-muted-foreground group-hover:text-foreground">
                    {count.toLocaleString()}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              No {tab} match <code className="font-mono">{query}</code>.
            </p>
            <button
              onClick={() => setQuery('')}
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              Clear search
              <IconArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}> = ({ active, onClick, icon, label, count }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-primary text-primary-foreground'
        : 'bg-card text-foreground border border-border hover:border-primary-300'
    }`}
  >
    {icon}
    {label}
    <span
      className={`text-xs ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
    >
      {count.toLocaleString()}
    </span>
  </button>
);

export default Browse;
