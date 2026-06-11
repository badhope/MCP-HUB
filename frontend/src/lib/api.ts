/**
 * Frontend data layer — single-source-of-truth.
 *
 * Phase 5+ architecture: the static catalog is generated at build time by
 * `tools/gen_static_data.py` and written to `frontend/public/servers-index.json`.
 * All server queries (`getServers`, `getServer`, `getPopularServers`, …) read
 * from that one file and filter/sort in-memory.
 *
 * User interactions (favorites, ratings, comments, submissions, reviews)
 * persist to `localStorage` via `lib/userStore`. There is no backend.
 *
 * The old FastAPI backend is gone; the previous `requestWithFallback`
 * branches have been removed in full — a `VITE_API_URL` is no longer
 * honoured. `isStaticDemo` is kept for backwards compatibility and is
 * always `true`.
 */

import type {
  Server,
  ServerConfig,
  ServerListResponse,
  StatsResponse,
} from '../types';
import { getQualityScore, getQualityDisplay } from './quality';
import * as userStore from './userStore';

const INDEX_URL = `${import.meta.env.BASE_URL || '/'}servers-index.json`.replace(/\/+/g, '/');

export interface Rating {
  id: string;
  user_id: string;
  server_name: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  server_name: string;
  text: string;
  created_at: string;
}

export interface Submission {
  id: string;
  user_id: string;
  name: string;
  source: string;
  description: string;
  categories: string[];
  npm_package?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at?: string;
  reviewer?: string;
  review_comment?: string;
}

export interface ServerStats {
  favorites_count: number;
  average_rating: number;
  ratings_count: number;
  comments_count: number;
}

export interface UserStats {
  favorites_count: number;
  ratings_count: number;
  comments_count: number;
}

export interface OverallStats {
  total_users: number;
  total_favorites: number;
  total_ratings: number;
  total_comments: number;
  total_submissions: number;
}

/** New top-level shape of the build-time index. */
interface ServersIndex {
  version: string;
  snapshot_date: string;
  generator: string;
  total_servers: number;
  total_categories: number;
  our_tools_count: number;
  categories: Record<string, number>;
  languages: Record<string, number>;
  source_types: Record<string, number>;
  servers: Server[];
}

let indexPromise: Promise<ServersIndex> | null = null;

function loadIndex(): Promise<ServersIndex> {
  if (!indexPromise) {
    indexPromise = fetch(INDEX_URL).then(async (res) => {
      if (!res.ok) {
        throw new Error(`Failed to load ${INDEX_URL}: ${res.status} ${res.statusText}`);
      }
      return (await res.json()) as ServersIndex;
    });
  }
  return indexPromise;
}

// Per-call filtered list cache (cleared by mutation helpers).
let listCache: Server[] | null = null;
let byNameCache: Map<string, Server> | null = null;

async function getListAndIndex(): Promise<{ list: Server[]; byName: Map<string, Server> }> {
  if (listCache && byNameCache) return { list: listCache, byName: byNameCache };
  const data = await loadIndex();
  const list = data.servers.slice();
  const byName = new Map<string, Server>();
  for (const s of list) byName.set(s.name, s);
  listCache = list;
  byNameCache = byName;
  return { list, byName };
}

function matchesSearch(s: Server, q: string): boolean {
  if (s.name.toLowerCase().includes(q)) return true;
  if (s.description.toLowerCase().includes(q)) return true;
  if ((s.owner || '').toLowerCase().includes(q)) return true;
  return (s.categories || []).some((c) => c.toLowerCase().includes(q));
}

function matchesUseCase(s: Server, q: string): boolean {
  if (s.description.toLowerCase().includes(q)) return true;
  if (s.name.toLowerCase().includes(q)) return true;
  if ((s.categories || []).some((c) => c.toLowerCase().includes(q))) return true;
  return (s.topics || []).some((t) => t.toLowerCase().includes(q));
}

function sortServers(servers: Server[], sort: string | undefined): Server[] {
  const out = servers.slice();
  switch (sort) {
    case 'stars':
      out.sort((a, b) => b.stars - a.stars);
      break;
    case 'updated':
      out.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      break;
    case 'name':
      out.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'score':
      out.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      break;
    default:
      out.sort((a, b) => b.stars - a.stars);
  }
  return out;
}

class ApiClient {
  // ----- server catalog (read from build-time index) -----

  async getStats(): Promise<StatsResponse> {
    const data = await loadIndex();
    return {
      total_servers: data.total_servers,
      total_categories: data.total_categories,
      last_sync: data.snapshot_date,
      data_snapshot_date: data.snapshot_date,
      categories: data.categories,
      our_tools_count: data.our_tools_count,
      languages: data.languages,
    };
  }

  async getServers(params?: {
    search?: string;
    category?: string;
    language?: string;
    sort?: string;
    minStars?: number;
    limit?: number;
  }): Promise<ServerListResponse> {
    const { list } = await getListAndIndex();
    let servers = list.slice();
    if (params?.search) {
      const q = params.search.toLowerCase();
      servers = servers.filter((s) => matchesSearch(s, q));
    }
    if (params?.category) {
      const c = params.category.toLowerCase();
      servers = servers.filter((s) => (s.categories || []).some((x) => x.toLowerCase() === c));
    }
    if (params?.language) {
      const lang = params.language.toLowerCase();
      servers = servers.filter((s) => (s.language || '').toLowerCase() === lang);
    }
    if (params?.minStars && params.minStars > 0) {
      servers = servers.filter((s) => s.stars >= (params.minStars || 0));
    }
    servers = sortServers(servers, params?.sort);
    if (params?.limit && params.limit > 0) {
      servers = servers.slice(0, params.limit);
    }
    return { total: servers.length, servers };
  }

  async getPopularServers(limit: number = 20): Promise<ServerListResponse> {
    const { list } = await getListAndIndex();
    const popular = [...list].sort((a, b) => b.stars - a.stars).slice(0, limit);
    return { total: popular.length, servers: popular };
  }

  async getRecentServers(limit: number = 20): Promise<ServerListResponse> {
    const { list } = await getListAndIndex();
    const recent = [...list]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, limit);
    return { total: recent.length, servers: recent };
  }

  /** Curated = servers we have an adapter for (our_signal ≥ 0.7). */
  async getCuratedServers(limit: number = 20): Promise<ServerListResponse> {
    const { list } = await getListAndIndex();
    const curated = list.filter((s) => (s.our_signal ?? 0) >= 0.7).slice(0, limit);
    return { total: curated.length, servers: curated };
  }

  async getServer(name: string): Promise<Server> {
    const { byName } = await getListAndIndex();
    const s = byName.get(name);
    if (!s) throw new Error(`Server not found: ${name}`);
    return s;
  }

  async getServersByQuality(minScore?: number, level?: string, limit: number = 20) {
    const { list } = await getListAndIndex();
    let filtered = list.filter((s) => {
      const q = getQualityScore(s);
      return minScore === undefined || q >= minScore;
    });
    if (level) {
      filtered = filtered.filter((s) => getQualityDisplay(getQualityScore(s)).label === level);
    }
    return { total: filtered.length, servers: filtered.slice(0, limit) };
  }

  async getServersByCategory(category: string, limit: number = 20) {
    const { list } = await getListAndIndex();
    const c = category.toLowerCase();
    const filtered = list
      .filter((s) => (s.categories || []).some((x) => x.toLowerCase() === c))
      .slice(0, limit);
    return { total: filtered.length, servers: filtered };
  }

  async compareServers(servers: string[]) {
    const { byName } = await getListAndIndex();
    const matched = servers
      .map((n) => byName.get(n))
      .filter((s): s is Server => Boolean(s))
      .map((s) => {
        const q = getQualityScore(s);
        return {
          ...s,
          quality_score: q,
          quality_level: getQualityDisplay(q).label,
          documentation_score: Math.min(100, Math.floor((s.description?.length || 0) / 4)),
        };
      });

    const byStars = [...matched].sort((a, b) => b.stars - a.stars);
    const byQuality = [...matched].sort((a, b) => b.quality_score - a.quality_score);
    const byCategories = [...matched].sort(
      (a, b) => (b.categories?.length || 0) - (a.categories?.length || 0)
    );
    const byDocs = [...matched].sort((a, b) => b.documentation_score - a.documentation_score);

    return {
      total: matched.length,
      servers: matched,
      best_for: {
        stars: { name: byStars[0]?.name || '', value: byStars[0]?.stars || 0 },
        quality: { name: byQuality[0]?.name || '', value: byQuality[0]?.quality_score || 0 },
        categories: {
          name: byCategories[0]?.name || '',
          value: byCategories[0]?.categories?.length || 0,
        },
        documentation: {
          name: byDocs[0]?.name || '',
          value: byDocs[0]?.documentation_score || 0,
        },
      },
    };
  }

  async getSimilarServers(name: string, limit: number = 5) {
    const { list, byName } = await getListAndIndex();
    const target = byName.get(name);
    if (!target) {
      return { target: name, total: 0, similar_servers: [] };
    }
    const targetCats = new Set((target.categories || []).map((c) => c.toLowerCase()));
    const targetTopics = new Set((target.topics || []).map((t) => t.toLowerCase()));
    const jaccard = (s: Server) => {
      const cats = (s.categories || []).map((c) => c.toLowerCase());
      const topics = (s.topics || []).map((t) => t.toLowerCase());
      if (cats.length + topics.length === 0 && targetCats.size + targetTopics.size === 0) {
        return 0;
      }
      let inter = 0;
      for (const c of cats) if (targetCats.has(c)) inter++;
      for (const t of topics) if (targetTopics.has(t)) inter++;
      const union = new Set([...cats, ...topics, ...targetCats, ...targetTopics]).size;
      return union === 0 ? 0 : Math.round((inter / union) * 100);
    };

    const scored = list
      .filter((s) => s.name !== name)
      .map((s) => {
        const matchingCategories = (s.categories || []).filter((c) =>
          targetCats.has(c.toLowerCase())
        );
        const matchingTopics = (s.topics || []).filter((t) =>
          targetTopics.has(t.toLowerCase())
        );
        const overlap = matchingCategories.length + matchingTopics.length;
        return { server: s, score: overlap, similarity: jaccard(s) };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.server.stars - a.server.stars)
      .slice(0, limit)
      .map((x) => {
        const q = getQualityScore(x.server);
        return {
          ...x.server,
          quality_score: q,
          quality_level: getQualityDisplay(q).label,
          matching_categories: (x.server.categories || []).filter((c) =>
            targetCats.has(c.toLowerCase())
          ),
          matching_topics: (x.server.topics || []).filter((t) =>
            targetTopics.has(t.toLowerCase())
          ),
          similarity_score: x.similarity,
        };
      });

    return {
      target: name,
      total: scored.length,
      similar_servers: scored,
    };
  }

  async getServersForUseCase(useCase: string, limit: number = 10) {
    const { list } = await getListAndIndex();
    const u = useCase.toLowerCase();
    const matched = list.filter((s) => matchesUseCase(s, u)).slice(0, limit);
    return {
      use_case: useCase,
      total_found: matched.length,
      servers: matched,
      tip: 'Static recommendations are keyword-based; the catalog itself is built nightly.',
    };
  }

  // ----- user interactions (localStorage-backed) -----

  async addFavorite(userId: string, serverName: string) {
    userStore.addFavorite(userId, serverName);
    return {
      success: true as const,
      user_id: userId,
      server_name: serverName,
      message: 'Favorite saved locally on this device.',
    };
  }

  async removeFavorite(userId: string, serverName: string) {
    userStore.removeFavorite(userId, serverName);
    return {
      success: true as const,
      user_id: userId,
      server_name: serverName,
      message: 'Favorite removed from this device.',
    };
  }

  async getFavorites(userId: string) {
    const favorites = userStore.getFavorites(userId);
    return { user_id: userId, favorites, count: favorites.length };
  }

  async checkFavorite(userId: string, serverName: string) {
    return {
      user_id: userId,
      server_name: serverName,
      is_favorite: userStore.isFavorite(userId, serverName),
    };
  }

  async getFavoriteCount(serverName: string) {
    return {
      server_name: serverName,
      favorites_count: userStore.countFavoritesForServer(serverName),
    };
  }

  async addRating(userId: string, serverName: string, rating: number, comment?: string) {
    const r = userStore.setUserRating(userId, serverName, rating, comment);
    return { success: true as const, rating: r };
  }

  async getRatings(serverName: string) {
    const summary = userStore.getServerRatingSummary(serverName);
    const ratings = userStore.getAllRatingsForServer(serverName);
    return {
      server_name: serverName,
      ratings,
      average_rating: summary.average,
      count: summary.count,
    };
  }

  async getUserRating(userId: string, serverName: string) {
    return {
      user_id: userId,
      server_name: serverName,
      rating: userStore.getUserRating(userId, serverName),
    };
  }

  async addComment(userId: string, serverName: string, text: string) {
    const c = userStore.addComment(userId, serverName, text);
    return { success: true as const, comment: c };
  }

  async getComments(serverName: string) {
    const comments = userStore.getAllCommentsForServer(serverName);
    return { server_name: serverName, comments, count: comments.length };
  }

  async getServerStats(serverName: string) {
    const fav = userStore.countFavoritesForServer(serverName);
    const rating = userStore.getServerRatingSummary(serverName);
    const comments = userStore.getAllCommentsForServer(serverName);
    return {
      server_name: serverName,
      stats: {
        favorites_count: fav,
        average_rating: rating.average,
        ratings_count: rating.count,
        comments_count: comments.length,
      },
    };
  }

  async getUserStats(userId: string) {
    return { user_id: userId, stats: userStore.getLocalUserStats(userId) };
  }

  async submitServer(params: {
    userId: string;
    name: string;
    source: string;
    description: string;
    categories?: string[];
    npmPackage?: string;
  }) {
    const sub = userStore.addSubmission(params.userId, {
      name: params.name,
      source: params.source,
      description: params.description,
      categories: params.categories || [],
      npmPackage: params.npmPackage,
    });
    return { success: true as const, submission: sub };
  }

  async getSubmissions(_status?: string) {
    // No cross-user aggregation in static mode; per-user list lives on
    // `getUserSubmissions` instead.
    return { total: 0, submissions: [] as Submission[] };
  }

  async getUserSubmissions(userId: string) {
    const submissions = userStore.getUserSubmissions(userId);
    return { user_id: userId, submissions, count: submissions.length };
  }

  async reviewSubmission(
    _submissionId?: string,
    _status?: 'approved' | 'rejected',
    _reviewer?: string,
    _comment?: string
  ): Promise<never> {
    throw new Error(
      'Submission review is only available with a live backend. ' +
        'Submissions saved locally are not visible to moderators.'
    );
  }

  async getOverallStats(): Promise<OverallStats> {
    return userStore.getLocalOverallStats();
  }

  async getServerConfig(name: string): Promise<ServerConfig> {
    const s = await this.getServer(name);
    const hint = s.install_hint;
    const primary = hint?.primary || '';
    const [command, ...args] = primary.split(/\s+/);
    return {
      name: s.name,
      mcpServers: {
        [s.name]: {
          command: command || undefined,
          args: args.length ? args : undefined,
        },
      },
      install: {
        npm: hint?.alternatives?.npm || undefined,
        pip: hint?.alternatives?.pip || undefined,
        git: hint?.alternatives?.git || undefined,
        docker: hint?.alternatives?.docker || undefined,
      },
    };
  }

  async exportServerMarkdown(name: string): Promise<string> {
    const s = await this.getServer(name);
    return [
      `# ${s.full_name || s.name}`,
      '',
      `> ${s.description}`,
      '',
      `- **Source:** ${s.source}`,
      `- **Stars:** ${s.stars}`,
      `- **Language:** ${s.language}`,
      `- **Categories:** ${(s.categories || []).join(', ')}`,
      '',
      '## Install',
      '',
      s.install_hint?.primary
        ? ['```bash', s.install_hint.primary, '```'].join('\n')
        : '_(no install command available)_',
      '',
      s.install_hint?.zip_url
        ? `## Download\n\n[Source archive](${s.install_hint.zip_url})`
        : '',
      '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  async exportBatchJson(serverNames: string[]) {
    const { byName } = await getListAndIndex();
    const matched = serverNames
      .map((n) => byName.get(n))
      .filter(Boolean) as Server[];

    const config: { mcpServers: Record<string, unknown> } = { mcpServers: {} };
    for (const s of matched) {
      const hint = s.install_hint;
      if (!hint?.primary) continue;
      // Best-effort parse: "npx -y ECC" → ["-y", "ECC"]
      const parts = hint.primary.split(/\s+/).slice(1);
      const command = hint.primary.split(/\s+/)[0];
      config.mcpServers[s.name] = { command, args: parts };
    }
    return {
      total_requested: serverNames.length,
      total_found: matched.length,
      not_found: serverNames.filter((n) => !byName.has(n)),
      config,
      servers: matched,
    };
  }

  async exportBatchMarkdown(serverNames: string[]): Promise<string> {
    const { byName } = await getListAndIndex();
    const matched = serverNames
      .map((n) => byName.get(n))
      .filter(Boolean) as Server[];
    const lines: string[] = ['# MCP Server Batch Export', ''];
    for (const s of matched) {
      const displayName = s.full_name || s.name;
      lines.push(`## ${displayName}`);
      lines.push('');
      lines.push(`- **Source:** ${s.source}`);
      lines.push(`- **Stars:** ${s.stars}`);
      lines.push(`- **Language:** ${s.language}`);
      lines.push(`- **Categories:** ${(s.categories || []).join(', ')}`);
      lines.push('');
      lines.push(s.description);
      lines.push('');
      if (s.install_hint?.primary) {
        lines.push('Install:');
        lines.push('```bash');
        lines.push(s.install_hint.primary);
        lines.push('```');
        lines.push('');
      }
    }
    return lines.join('\n');
  }
}

export const apiClient = new ApiClient();
/** Always `true` since the backend was removed in Phase 6. */
export const isStaticDemo = true;
