/**
 * More — Layer 3 of the 3-layer product model.
 *
 * This is the "admin / about" page that absorbs the old SubmitServer
 * concept. It surfaces:
 *   1. 📊 Data status (snapshot date, server count, our tools count, sync health)
 *   2. 🛠 How to contribute a new adapter (PR workflow with link to spec)
 *   3. 📖 Quick links to docs, repo, and the upstream MCP project
 *
 * There is no live form yet — submissions go through GitHub PRs to keep
 * the GH Pages deployment pure-static. When we want to add a form later,
 * it lives here too.
 */

import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  IconDatabase, IconGitPullRequest, IconBook,
  IconExternalLink, IconCircleCheck, IconAlertTriangle, IconClock, IconFileCode, IconTool,
} from '@tabler/icons-react';
import { Github } from '../components/icons/Github';
import { useStats } from '../hooks/useStats';
import { useServers } from '../hooks/useServers';

const More = React.memo(() => {
  const { data: stats } = useStats();
  const { data: serverData } = useServers();

  const servers = useMemo(() => serverData?.servers || [], [serverData?.servers]);

  const totalServers = stats?.total_servers ?? servers.length;
  const ourToolsCount = stats?.our_tools_count ?? 0;
  const snapshotDate = stats?.data_snapshot_date ?? stats?.last_sync ?? 'unknown';

  // Health: snapshot < 30 days = ✅, 30-90 days = ⚠️, > 90 days = ❌
  const health = useMemo(() => {
    if (!snapshotDate || snapshotDate === 'unknown') {
      return { label: 'Unknown', icon: IconAlertTriangle, classes: 'text-amber-600 dark:text-amber-400' };
    }
    const days = Math.floor((new Date().getTime() - new Date(snapshotDate).getTime()) / 86_400_000);
    if (Number.isNaN(days) || days < 0) {
      return { label: 'Unknown', icon: IconAlertTriangle, classes: 'text-amber-600 dark:text-amber-400' };
    }
    if (days < 30) {
      return { label: `${days}d ago · healthy`, icon: IconCircleCheck, classes: 'text-emerald-600 dark:text-emerald-400' };
    }
    if (days < 90) {
      return { label: `${days}d ago · stale`, icon: IconClock, classes: 'text-amber-600 dark:text-amber-400' };
    }
    return { label: `${days}d ago · very stale`, icon: IconAlertTriangle, classes: 'text-rose-600 dark:text-rose-400' };
  }, [snapshotDate]);

  const HealthIcon = health.icon;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>More — MCP Hub</title>
        <meta
          name="description"
          content="Data status, contribution guide, and links to the MCP Hub repo and upstream MCP project."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-10 sm:py-14 max-w-5xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
          More
        </h1>
        <p className="text-muted-foreground mb-10 max-w-2xl">
          Data status, contribution guide, and the project's open-source links.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data status */}
          <Card
            icon={<IconDatabase size={20} className="text-primary" />}
            title="Data status"
            subtitle="What this site is showing right now"
          >
            <dl className="space-y-3 text-sm">
              <Stat label="Snapshot date" value={snapshotDate} />
              <Stat
                label="Total servers indexed"
                value={totalServers.toLocaleString()}
              />
              <Stat
                label="Our universal adapters"
                value={ourToolsCount.toLocaleString()}
                valueExtra={
                  ourToolsCount === 0 ? (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400 font-normal">
                      (none yet — Phase 9)
                    </span>
                  ) : null
                }
              />
              <Stat
                label="Sync health"
                value={
                  <span className={`inline-flex items-center gap-1.5 ${health.classes}`}>
                    <HealthIcon size={14} />
                    {health.label}
                  </span>
                }
              />
              <Stat
                label="Refresh cadence"
                value="Daily · 04:00 UTC"
              />
            </dl>
            <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
              The data is built nightly by
              {' '}
              <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted">
                tools/gen_static_data.py
              </code>
              {' '}
              from the
              {' '}
              <a
                href="https://github.com/badhope/awesome-mcp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                upstream MCP mirror
                <IconExternalLink size={11} />
              </a>
              . This GitHub Pages deployment ships a single
              {' '}
              <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted">
                servers-index.json
              </code>
              {' '}
              baked at build time.
            </p>
          </Card>

          {/* Contribute */}
          <Card
            icon={<IconGitPullRequest size={20} className="text-emerald-600" />}
            title="Contribute an adapter"
            subtitle="Help us adapt more MCP servers"
          >
            <ol className="space-y-3 text-sm text-foreground">
              <Step
                n={1}
                title="Pick a server"
                body={
                  <>
                    Browse the{' '}
                    <Link to="/servers?sort=stars" className="text-primary hover:underline">
                      top-starred
                    </Link>
                    {' '}list, or any server you actually use. The goal is to
                    pick servers that are popular but have quirky install
                    instructions.
                  </>
                }
              />
              <Step
                n={2}
                title="Open a PR"
                body={
                  <>
                    In{' '}
                    <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted">
                      frontend/public/adapters/&lt;name&gt;/
                    </code>
                    {' '}create an{' '}
                    <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted">
                      adapter.json
                    </code>
                    {' '}+{' '}
                    <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted">
                      install.sh
                    </code>
                    {' '}+ a short README. Use one of our adapters as a
                    template (Phase 9 will add the first one).
                  </>
                }
              />
              <Step
                n={3}
                title="We review + adapt"
                body={
                  <>
                    We test the install on Claude Desktop, Cursor, Cline and
                    Windsurf. If all four boot cleanly we merge and bump the
                    server's{' '}
                    <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted">
                      our_signal
                    </code>
                    {' '}to{' '}
                    <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted">
                      adapted
                    </code>
                    . It then shows up under{' '}
                    <Link to="/our-tools" className="text-primary hover:underline">
                      Our Tools
                    </Link>
                    .
                  </>
                }
              />
            </ol>
            <a
              href="https://github.com/your-org/mcp-hub/pulls"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Github size={16} />
              Open a PR
              <IconExternalLink size={12} className="opacity-70" />
            </a>
          </Card>

          {/* Quick links */}
          <Card
            icon={<IconBook size={20} className="text-violet-600" />}
            title="Quick links"
            subtitle="The rest of the project"
          >
            <ul className="space-y-2 text-sm">
              <LinkRow
                to="/our-tools"
                icon={<IconTool size={14} />}
                label="Our Tools"
                hint="The 0 → N adapted servers we maintain"
              />
              <LinkRow
                to="/about"
                icon={<IconFileCode size={14} />}
                label="About MCP Hub"
                hint="Project history, architecture, and license"
              />
              <LinkRow
                to="/servers?sort=stars"
                icon={<IconDatabase size={14} />}
                label="Browse all servers"
                hint={`${totalServers.toLocaleString()} indexed`}
              />
            </ul>
            <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
              <a
                href="https://github.com/your-org/mcp-hub"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-foreground hover:text-foreground transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <Github size={14} /> MCP Hub on GitHub
                </span>
                <IconExternalLink size={12} className="opacity-60" />
              </a>
              <a
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between text-foreground hover:text-foreground transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <IconBook size={14} /> modelcontextprotocol.io
                </span>
                <IconExternalLink size={12} className="opacity-60" />
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
});

// ----- sub-components -----

const Card: React.FC<React.PropsWithChildren<{ icon: React.ReactNode; title: string; subtitle: string }>> = ({
  icon, title, subtitle, children,
}) => (
  <div className="rounded-2xl border border-border bg-card p-6">
    <div className="flex items-start gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
    {children}
  </div>
);

const Stat: React.FC<{ label: string; value: React.ReactNode; valueExtra?: React.ReactNode }> = ({
  label, value, valueExtra,
}) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="font-medium text-foreground text-right">
      {value}
      {valueExtra}
    </dd>
  </div>
);

const Step: React.FC<{ n: number; title: string; body: React.ReactNode }> = ({ n, title, body }) => (
  <li className="flex items-start gap-3">
    <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center flex-shrink-0">
      {n}
    </span>
    <div className="min-w-0">
      <div className="font-medium text-foreground">{title}</div>
      <div className="text-muted-foreground text-[13px] leading-relaxed mt-0.5">
        {body}
      </div>
    </div>
  </li>
);

const LinkRow: React.FC<{ to: string; icon: React.ReactNode; label: string; hint: string }> = ({
  to, icon, label, hint,
}) => (
  <li>
    <Link
      to={to}
      className="flex items-center justify-between text-foreground hover:text-foreground transition-colors"
    >
      <span className="inline-flex items-center gap-2">
        {icon} {label}
      </span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </Link>
  </li>
);

export default More;
