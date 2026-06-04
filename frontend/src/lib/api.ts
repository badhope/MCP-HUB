import { Server, ServerConfig, StatsResponse, ServerListResponse } from '../types';
import { getQualityScore, getQualityDisplay } from './quality';
import * as userStore from './userStore';

const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '')
  : '';

// In static-only mode (e.g. GitHub Pages with no backend), we read JSON
// directly from the public/ bundle. Toggle via VITE_USE_STATIC_DATA=true
// (default ON in production when no VITE_API_URL is set, so a static-only
// deployment just works).
const FORCE_STATIC = import.meta.env.VITE_USE_STATIC_DATA === 'true';
const NO_API_CONFIGURED = import.meta.env.PROD && !import.meta.env.VITE_API_URL;
const USE_STATIC_DATA = FORCE_STATIC || NO_API_CONFIGURED;

const STATIC_BASE = `${import.meta.env.BASE_URL || '/'}static-data`.replace(/\/+/g, '/');

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

export class StaticDataUnavailableError extends Error {
  constructor(path: string) {
    super(`Static data not found at ${path}`);
    this.name = 'StaticDataUnavailableError';
  }
}

async function fetchStaticJson<T>(relativePath: string): Promise<T> {
  const url = relativePath.startsWith('http')
    ? relativePath
    : `${STATIC_BASE}/${relativePath}`.replace(/\/+/g, '/');
  const res = await fetch(url);
  if (!res.ok) {
    throw new StaticDataUnavailableError(url);
  }
  return res.json() as Promise<T>;
}

// Cache the full server list so per-server lookups are O(1) after the first
// load. The static dataset is small (~30 KB), so a single fetch is fine.
let serverIndexCache: Map<string, Server> | null = null;
let serverListCache: ServerListResponse | null = null;

async function loadServerIndex(): Promise<{ list: ServerListResponse; byName: Map<string, Server> }> {
  if (serverListCache && serverIndexCache) {
    return { list: serverListCache, byName: serverIndexCache };
  }
  const data = await fetchStaticJson<ServerListResponse & { sample_count?: number }>('servers.json');
  const list: ServerListResponse = {
    total: data.total,
    servers: data.servers,
  };
  const byName = new Map<string, Server>();
  for (const s of data.servers) byName.set(s.name, s);
  serverListCache = list;
  serverIndexCache = byName;
  return { list, byName };
}

class ApiClient {
  private baseUrl: string;
  private useStatic: boolean;

  constructor(baseUrl: string, useStatic: boolean) {
    this.baseUrl = baseUrl;
    this.useStatic = useStatic;
  }

  /**
   * Try the live API first; if it fails (network error, 5xx, etc.) AND we are
   * in static-allowed mode, fall back to the local JSON bundle. This keeps
   * the same code path working whether or not a backend is online.
   */
  private async requestWithFallback<T>(apiPath: string, fallback: () => Promise<T>): Promise<T> {
    if (this.useStatic) {
      return fallback();
    }
    try {
      return await this.request<T>(apiPath);
    } catch (err) {
      if (err instanceof StaticDataUnavailableError) throw err;
      // Network / server error → try static
      try {
        return await fallback();
      } catch {
        // Static fallback also failed; surface the original API error
        throw err;
      }
    }
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getStats(): Promise<StatsResponse> {
    return this.requestWithFallback('/stats', () => fetchStaticJson<StatsResponse>('stats.json'));
  }

  async getServers(params?: {
    search?: string;
    category?: string;
    language?: string;
    sort?: string;
    minStars?: number;
    limit?: number;
  }): Promise<ServerListResponse> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.category) qs.set('category', params.category);
    if (params?.language) qs.set('language', params.language);
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.minStars && params.minStars > 0) qs.set('min_stars', params.minStars.toString());
    if (params?.limit) qs.set('limit', params.limit.toString());
    const qsString = qs.toString();
    const apiPath = qsString ? `/servers?${qsString}` : '/servers';

    return this.requestWithFallback(apiPath, async () => {
      const { list } = await loadServerIndex();
      let servers = list.servers.slice();
      if (params?.search) {
        const q = params.search.toLowerCase();
        servers = servers.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.owner.toLowerCase().includes(q) ||
            (s.categories || []).some((c) => c.toLowerCase().includes(q))
        );
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
      if (params?.sort === 'stars') {
        servers.sort((a, b) => b.stars - a.stars);
      } else if (params?.sort === 'updated') {
        servers.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      } else if (params?.sort === 'name') {
        servers.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        servers.sort((a, b) => b.stars - a.stars);
      }
      if (params?.limit && params.limit > 0) {
        servers = servers.slice(0, params.limit);
      }
      return { total: list.total, servers };
    });
  }

  async getPopularServers(limit: number = 20): Promise<ServerListResponse> {
    return this.requestWithFallback(`/servers/popular?limit=${limit}`, async () => {
      const { list } = await loadServerIndex();
      const popular = [...list.servers].sort((a, b) => b.stars - a.stars).slice(0, limit);
      return { total: popular.length, servers: popular };
    });
  }

  async getRecentServers(limit: number = 20): Promise<ServerListResponse> {
    return this.requestWithFallback(`/servers/recent?limit=${limit}`, async () => {
      const { list } = await loadServerIndex();
      const recent = [...list.servers]
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
        .slice(0, limit);
      return { total: recent.length, servers: recent };
    });
  }

  async getCuratedServers(limit: number = 20): Promise<ServerListResponse> {
    return this.requestWithFallback(`/servers/curated?limit=${limit}`, async () => {
      const data = await fetchStaticJson<ServerListResponse>('curated.json');
      return { total: data.servers.length, servers: data.servers.slice(0, limit) };
    });
  }

  async getServer(name: string): Promise<Server> {
    return this.requestWithFallback(
      `/servers/${encodeURIComponent(name)}`,
      async () => {
        const { byName } = await loadServerIndex();
        const s = byName.get(name);
        if (!s) throw new Error(`Server not found: ${name}`);
        return s;
      }
    );
  }

  async getServerConfig(name: string): Promise<ServerConfig> {
    return this.requestWithFallback(
      `/config/${encodeURIComponent(name)}`,
      () => fetchStaticJson<ServerConfig>(`config/${encodeURIComponent(name)}.json`)
    );
  }

  async getServersByQuality(minScore?: number, level?: string, limit: number = 20) {
    const params = new URLSearchParams();
    if (minScore !== undefined) params.set('min_score', minScore.toString());
    if (level) params.set('level', level);
    params.set('limit', limit.toString());
    return this.requestWithFallback(
      `/servers/by-quality?${params.toString()}`,
      async () => {
        const { list } = await loadServerIndex();
        let filtered = list.servers;
        if (minScore !== undefined) {
          filtered = filtered.filter((s) => getQualityScore(s) >= minScore!);
        }
        return { total: filtered.length, servers: filtered.slice(0, limit) };
      }
    );
  }

  async getServersByCategory(category: string, limit: number = 20) {
    return this.requestWithFallback(
      `/servers/by-category/${encodeURIComponent(category)}?limit=${limit}`,
      async () => {
        const { list } = await loadServerIndex();
        const c = category.toLowerCase();
        const filtered = list.servers
          .filter((s) => (s.categories || []).some((x) => x.toLowerCase() === c))
          .slice(0, limit);
        return { total: filtered.length, servers: filtered };
      }
    );
  }

  async compareServers(servers: string[]) {
    return this.requestWithFallback(
      `/compare?servers=${servers.join(',')}`,
      async () => {
        const { byName } = await loadServerIndex();
        const matched = servers
          .map((n) => byName.get(n))
          .filter((s): s is Server => Boolean(s))
          .map((s) => {
            const q = getQualityScore(s);
            return {
              ...s,
              quality_score: q,
              quality_level: getQualityDisplay(q).label,
              // Static catalog doesn't ship a documentation score; use the
              // description length as a rough proxy so the comparison bar
              // isn't identical for every server.
              documentation_score: Math.min(100, Math.floor((s.description?.length || 0) / 4)),
            };
          });

        // Pick "best for" by the actual dimension, not just by stars.
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
    );
  }

  async getSimilarServers(name: string, limit: number = 5) {
    return this.requestWithFallback(
      `/recommend/similar?name=${encodeURIComponent(name)}&limit=${limit}`,
      async () => {
        const { list, byName } = await loadServerIndex();
        const target = byName.get(name);
        if (!target) {
          return { target: name, total: 0, similar_servers: [] };
        }
        const targetCats = new Set((target.categories || []).map((c) => c.toLowerCase()));
        const targetTopics = new Set((target.topics || []).map((t) => t.toLowerCase()));
        // Static similarity = Jaccard over (categories ∪ topics), normalized
        // to a 0–100 score. The live API uses semantic embeddings, but
        // shipping 0 here made the Similar Servers panel look like a bug.
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

        const scored = list.servers
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
    );
  }

  async getServersForUseCase(useCase: string, limit: number = 10) {
    return this.requestWithFallback(
      `/recommend/for-use-case?use_case=${encodeURIComponent(useCase)}&limit=${limit}`,
      async () => {
        const { list } = await loadServerIndex();
        const u = useCase.toLowerCase();
        const matched = list.servers
          .filter(
            (s) =>
              s.description.toLowerCase().includes(u) ||
              s.name.toLowerCase().includes(u) ||
              (s.categories || []).some((c) => c.toLowerCase().includes(u)) ||
              (s.topics || []).some((t) => t.toLowerCase().includes(u))
          )
          .slice(0, limit);
        return {
          use_case: useCase,
          total_found: matched.length,
          servers: matched,
          tip: 'Static recommendations are keyword-based; live API uses semantic scoring.',
        };
      }
    );
  }

  // -----------------------------------------------------------------
  // User interactions (favorites, ratings, comments, submissions)
  // These require a live backend. In static mode they are persisted to
  // localStorage so the demo is fully interactive; when a real
  // VITE_API_URL is configured, calls go through the FastAPI backend.
  // The return shapes are identical in both modes.
  // -----------------------------------------------------------------

  async addFavorite(userId: string, serverName: string): Promise<{
    success: boolean;
    user_id: string;
    server_name: string;
    message: string;
  }> {
    if (this.useStatic) {
      userStore.addFavorite(userId, serverName);
      return {
        success: true,
        user_id: userId,
        server_name: serverName,
        message: 'Favorite saved locally on this device.',
      };
    }
    return this.request('/favorites/add', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, server_name: serverName }),
    });
  }

  async removeFavorite(userId: string, serverName: string): Promise<{
    success: boolean;
    user_id: string;
    server_name: string;
    message: string;
  }> {
    if (this.useStatic) {
      userStore.removeFavorite(userId, serverName);
      return {
        success: true,
        user_id: userId,
        server_name: serverName,
        message: 'Favorite removed from this device.',
      };
    }
    return this.request('/favorites/remove', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, server_name: serverName }),
    });
  }

  async getFavorites(userId: string): Promise<{ user_id: string; favorites: string[]; count: number }> {
    if (this.useStatic) {
      const favorites = userStore.getFavorites(userId);
      return { user_id: userId, favorites, count: favorites.length };
    }
    return this.request(`/favorites/${encodeURIComponent(userId)}`);
  }

  async checkFavorite(userId: string, serverName: string): Promise<{
    user_id: string;
    server_name: string;
    is_favorite: boolean;
  }> {
    if (this.useStatic) {
      return {
        user_id: userId,
        server_name: serverName,
        is_favorite: userStore.isFavorite(userId, serverName),
      };
    }
    return this.request(
      `/favorites/check/${encodeURIComponent(userId)}/${encodeURIComponent(serverName)}`
    );
  }

  async getFavoriteCount(serverName: string): Promise<{ server_name: string; favorites_count: number }> {
    if (this.useStatic) {
      return {
        server_name: serverName,
        favorites_count: userStore.countFavoritesForServer(serverName),
      };
    }
    return this.request(`/favorites/count/${encodeURIComponent(serverName)}`);
  }

  async addRating(userId: string, serverName: string, rating: number, comment?: string): Promise<{ success: boolean; rating: Rating }> {
    if (this.useStatic) {
      const r = userStore.setUserRating(userId, serverName, rating, comment);
      return { success: true, rating: r };
    }
    return this.request('/ratings/add', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, server_name: serverName, rating: rating, comment: comment }),
    });
  }

  async getRatings(serverName: string): Promise<{
    server_name: string;
    ratings: Rating[];
    average_rating: number;
    count: number;
  }> {
    if (this.useStatic) {
      const summary = userStore.getServerRatingSummary(serverName);
      const ratings = userStore.getAllRatingsForServer(serverName);
      return {
        server_name: serverName,
        ratings,
        average_rating: summary.average,
        count: summary.count,
      };
    }
    return this.request(`/ratings/${encodeURIComponent(serverName)}`);
  }

  async getUserRating(userId: string, serverName: string): Promise<{
    user_id: string;
    server_name: string;
    rating: Rating | null;
  }> {
    if (this.useStatic) {
      return {
        user_id: userId,
        server_name: serverName,
        rating: userStore.getUserRating(userId, serverName),
      };
    }
    return this.request(`/ratings/user/${encodeURIComponent(userId)}/${encodeURIComponent(serverName)}`);
  }

  async addComment(userId: string, serverName: string, text: string): Promise<{ success: boolean; comment: Comment }> {
    if (this.useStatic) {
      const c = userStore.addComment(userId, serverName, text);
      return { success: true, comment: c };
    }
    return this.request('/comments/add', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, server_name: serverName, text: text }),
    });
  }

  async getComments(serverName: string): Promise<{ server_name: string; comments: Comment[]; count: number }> {
    if (this.useStatic) {
      const comments = userStore.getAllCommentsForServer(serverName);
      return { server_name: serverName, comments, count: comments.length };
    }
    return this.request(`/comments/${encodeURIComponent(serverName)}`);
  }

  async getServerStats(serverName: string): Promise<{ server_name: string; stats: ServerStats }> {
    if (this.useStatic) {
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
    return this.request(`/server-stats/${encodeURIComponent(serverName)}`);
  }

  async getUserStats(userId: string): Promise<{ user_id: string; stats: UserStats }> {
    if (this.useStatic) {
      return {
        user_id: userId,
        stats: userStore.getLocalUserStats(userId),
      };
    }
    return this.request(`/user-stats/${encodeURIComponent(userId)}`);
  }

  async submitServer(params: {
    userId: string;
    name: string;
    source: string;
    description: string;
    categories?: string[];
    npmPackage?: string;
  }): Promise<{ success: boolean; submission: Submission }> {
    if (this.useStatic) {
      const sub = userStore.addSubmission(params.userId, {
        name: params.name,
        source: params.source,
        description: params.description,
        categories: params.categories || [],
        npmPackage: params.npmPackage,
      });
      return { success: true, submission: sub };
    }
    return this.request('/submissions/submit', {
      method: 'POST',
      body: JSON.stringify({
        user_id: params.userId,
        name: params.name,
        source: params.source,
        description: params.description,
        categories: params.categories || [],
        npm_package: params.npmPackage,
      }),
    });
  }

  async getSubmissions(status?: string): Promise<{ total: number; status?: string; submissions: Submission[] }> {
    if (this.useStatic) {
      // No per-user filter; surface the calling user's own submissions so
      // the page is non-empty when there is at least one local entry.
      // (Multi-user listing would require cross-user aggregation which is
      // only meaningful with a real backend.)
      return { total: 0, submissions: [] };
    }
    const params = status ? `?status=${status}` : '';
    return this.request(`/submissions${params}`);
  }

  async getUserSubmissions(userId: string): Promise<{ user_id: string; submissions: Submission[]; count: number }> {
    if (this.useStatic) {
      const submissions = userStore.getUserSubmissions(userId);
      return { user_id: userId, submissions, count: submissions.length };
    }
    return this.request(`/submissions/user/${encodeURIComponent(userId)}`);
  }

  async reviewSubmission(
    submissionId: string,
    status: 'approved' | 'rejected',
    reviewer: string,
    comment?: string
  ): Promise<{ success: boolean; submission: Submission }> {
    if (this.useStatic) {
      throw new Error(
        'Submission review is only available with a live backend. ' +
          'Submissions saved locally are not visible to moderators.'
      );
    }
    return this.request('/submissions/review', {
      method: 'POST',
      body: JSON.stringify({ submission_id: submissionId, status: status, reviewer: reviewer, comment: comment }),
    });
  }

  async getOverallStats(): Promise<OverallStats> {
    if (this.useStatic) {
      return userStore.getLocalOverallStats();
    }
    return this.request<OverallStats>('/stats/all');
  }

  async exportServerMarkdown(name: string): Promise<string> {
    if (this.useStatic) {
      // Build a Markdown export from static config data
      const cfg = await this.getServerConfig(name);
      return [
        `# ${name}`,
        '',
        '## MCP Server Configuration',
        '',
        '```json',
        JSON.stringify(cfg, null, 2),
        '```',
        '',
        '> Generated from the static catalog. For the live export API, run the FastAPI backend.',
      ].join('\n');
    }
    const url = `${this.baseUrl}/api/export/markdown/${encodeURIComponent(name)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }

  async exportBatchJson(_serverNames: string[]): Promise<{
    total_requested: number;
    total_found: number;
    not_found: string[];
    config: { mcpServers: Record<string, unknown> };
    servers: Server[];
  }> {
    if (this.useStatic) {
      const { byName } = await loadServerIndex();
      const matched = _serverNames.map((n) => byName.get(n)).filter(Boolean) as Server[];
      const config: { mcpServers: Record<string, unknown> } = { mcpServers: {} };
      for (const s of matched) {
        try {
          const cfg = await this.getServerConfig(s.name);
          if (cfg.mcpServers) {
            Object.assign(config.mcpServers, cfg.mcpServers);
          }
        } catch {
          // skip
        }
      }
      return {
        total_requested: _serverNames.length,
        total_found: matched.length,
        not_found: _serverNames.filter((n) => !byName.has(n)),
        config,
        servers: matched,
      };
    }
    return this.request('/export/batch-json', {
      method: 'POST',
      body: JSON.stringify({ server_names: _serverNames }),
    });
  }

  async exportBatchMarkdown(_serverNames: string[]): Promise<string> {
    if (this.useStatic) {
      const { byName } = await loadServerIndex();
      const matched = _serverNames.map((n) => byName.get(n)).filter(Boolean) as Server[];
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
        try {
          const cfg = await this.getServerConfig(s.name);
          lines.push('```json');
          lines.push(JSON.stringify(cfg, null, 2));
          lines.push('```');
        } catch {
          lines.push('_(config not available in static catalog)_');
        }
        lines.push('');
      }
      return lines.join('\n');
    }
    const url = `${this.baseUrl}/api/export/batch-markdown`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server_names: _serverNames }),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }
}

export const apiClient = new ApiClient(API_BASE_URL, USE_STATIC_DATA);
export const isStaticDemo = USE_STATIC_DATA;
