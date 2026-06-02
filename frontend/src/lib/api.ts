import { Server, ServerConfig, StatsResponse, ServerListResponse } from '../types';

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
      } catch (staticErr) {
        // If both fail, surface the original API error
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

  async getHealth() {
    return this.request<{ status: string; name: string; version: string }>('/');
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
          filtered = filtered.filter((s) => {
            let score = 35;
            if (s.stars > 5000) score += 30;
            else if (s.stars > 1000) score += 25;
            else if (s.stars > 100) score += 15;
            else if (s.stars > 10) score += 8;
            if (s.source_type === 'official') score += 15;
            if (!s.archived) score += 10;
            if (s.description && s.description.length > 80) score += 5;
            if (s.categories && s.categories.length > 1) score += 5;
            if (s.topics && s.topics.length > 2) score += 5;
            if (s.license) score += 5;
            return Math.min(score, 100) >= minScore!;
          });
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
          .filter((s): s is Server => Boolean(s));
        const byStars = [...matched].sort((a, b) => b.stars - a.stars);
        const byCategories = [...matched].sort(
          (a, b) => (b.categories?.length || 0) - (a.categories?.length || 0)
        );
        return {
          total: matched.length,
          servers: matched.map((s) => ({
            ...s,
            quality_score: 0,
            quality_level: '',
          })),
          best_for: {
            stars: {
              name: byStars[0]?.name || '',
              value: byStars[0]?.stars || 0,
            },
            quality: { name: byStars[0]?.name || '', value: 0 },
            categories: {
              name: byCategories[0]?.name || '',
              value: byCategories[0]?.categories?.length || 0,
            },
            documentation: { name: byStars[0]?.name || '', value: 0 },
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
        const scored = list.servers
          .filter((s) => s.name !== name)
          .map((s) => {
            const overlap = (s.categories || []).filter((c) =>
              targetCats.has(c.toLowerCase())
            ).length;
            return { server: s, score: overlap };
          })
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score || b.server.stars - a.server.stars)
          .slice(0, limit)
          .map((x) => x.server);
        return {
          target: name,
          total: scored.length,
          similar_servers: scored.map((s) => ({
            ...s,
            quality_score: 0,
            quality_level: '',
            matching_categories: (s.categories || []).filter((c) =>
              targetCats.has(c.toLowerCase())
            ),
            matching_topics: [],
            similarity_score: 0,
          })),
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
  // These require a live backend. In static mode we throw a clear
  // error so the UI can show a "feature unavailable in static demo"
  // message and link to the GitHub repo.
  // -----------------------------------------------------------------

  private requireBackend(method: string): never {
    throw new Error(
      `${method} is not available in the static demo. ` +
        'Clone the repository and run the FastAPI backend, ' +
        'or visit https://github.com/badhope/MCP-HUB for the live API.'
    );
  }

  async addFavorite(_userId: string, _serverName: string): Promise<{
    success: boolean;
    user_id: string;
    server_name: string;
    message: string;
  }> {
    if (this.useStatic) this.requireBackend('addFavorite');
    return this.request('/favorites/add', {
      method: 'POST',
      body: JSON.stringify({ user_id: _userId, server_name: _serverName }),
    });
  }

  async removeFavorite(_userId: string, _serverName: string): Promise<{
    success: boolean;
    user_id: string;
    server_name: string;
    message: string;
  }> {
    if (this.useStatic) this.requireBackend('removeFavorite');
    return this.request('/favorites/remove', {
      method: 'POST',
      body: JSON.stringify({ user_id: _userId, server_name: _serverName }),
    });
  }

  async getFavorites(_userId: string): Promise<{ user_id: string; favorites: string[]; count: number }> {
    if (this.useStatic) return { user_id: _userId, favorites: [], count: 0 };
    return this.request(`/favorites/${encodeURIComponent(_userId)}`);
  }

  async checkFavorite(_userId: string, _serverName: string): Promise<{
    user_id: string;
    server_name: string;
    is_favorite: boolean;
  }> {
    if (this.useStatic)
      return { user_id: _userId, server_name: _serverName, is_favorite: false };
    return this.request(
      `/favorites/check/${encodeURIComponent(_userId)}/${encodeURIComponent(_serverName)}`
    );
  }

  async getFavoriteCount(_serverName: string): Promise<{ server_name: string; favorites_count: number }> {
    if (this.useStatic) return { server_name: _serverName, favorites_count: 0 };
    return this.request(`/favorites/count/${encodeURIComponent(_serverName)}`);
  }

  async addRating(_userId: string, _serverName: string, _rating: number, _comment?: string): Promise<{ success: boolean; rating: Rating }> {
    if (this.useStatic) this.requireBackend('addRating');
    return this.request('/ratings/add', {
      method: 'POST',
      body: JSON.stringify({ user_id: _userId, server_name: _serverName, rating: _rating, comment: _comment }),
    });
  }

  async getRatings(_serverName: string): Promise<{
    server_name: string;
    ratings: Rating[];
    average_rating: number;
    count: number;
  }> {
    if (this.useStatic) return { server_name: _serverName, ratings: [], average_rating: 0, count: 0 };
    return this.request(`/ratings/${encodeURIComponent(_serverName)}`);
  }

  async getUserRating(_userId: string, _serverName: string): Promise<{
    user_id: string;
    server_name: string;
    rating: Rating | null;
  }> {
    if (this.useStatic)
      return { user_id: _userId, server_name: _serverName, rating: null };
    return this.request(`/ratings/user/${encodeURIComponent(_userId)}/${encodeURIComponent(_serverName)}`);
  }

  async addComment(_userId: string, _serverName: string, _text: string): Promise<{ success: boolean; comment: Comment }> {
    if (this.useStatic) this.requireBackend('addComment');
    return this.request('/comments/add', {
      method: 'POST',
      body: JSON.stringify({ user_id: _userId, server_name: _serverName, text: _text }),
    });
  }

  async getComments(_serverName: string): Promise<{ server_name: string; comments: Comment[]; count: number }> {
    if (this.useStatic) return { server_name: _serverName, comments: [], count: 0 };
    return this.request(`/comments/${encodeURIComponent(_serverName)}`);
  }

  async getServerStats(_serverName: string): Promise<{ server_name: string; stats: ServerStats }> {
    if (this.useStatic)
      return {
        server_name: _serverName,
        stats: { favorites_count: 0, average_rating: 0, ratings_count: 0, comments_count: 0 },
      };
    return this.request(`/server-stats/${encodeURIComponent(_serverName)}`);
  }

  async getUserStats(_userId: string): Promise<{ user_id: string; stats: UserStats }> {
    if (this.useStatic)
      return {
        user_id: _userId,
        stats: { favorites_count: 0, ratings_count: 0, comments_count: 0 },
      };
    return this.request(`/user-stats/${encodeURIComponent(_userId)}`);
  }

  async submitServer(_params: {
    userId: string;
    name: string;
    source: string;
    description: string;
    categories?: string[];
    npmPackage?: string;
  }): Promise<{ success: boolean; submission: Submission }> {
    if (this.useStatic) this.requireBackend('submitServer');
    return this.request('/submissions/submit', {
      method: 'POST',
      body: JSON.stringify({
        user_id: _params.userId,
        name: _params.name,
        source: _params.source,
        description: _params.description,
        categories: _params.categories || [],
        npm_package: _params.npmPackage,
      }),
    });
  }

  async getSubmissions(_status?: string): Promise<{ total: number; status?: string; submissions: Submission[] }> {
    if (this.useStatic) return { total: 0, submissions: [] };
    const params = _status ? `?status=${_status}` : '';
    return this.request(`/submissions${params}`);
  }

  async getUserSubmissions(_userId: string): Promise<{ user_id: string; submissions: Submission[]; count: number }> {
    if (this.useStatic) return { user_id: _userId, submissions: [], count: 0 };
    return this.request(`/submissions/user/${encodeURIComponent(_userId)}`);
  }

  async reviewSubmission(
    _submissionId: string,
    _status: 'approved' | 'rejected',
    _reviewer: string,
    _comment?: string
  ): Promise<{ success: boolean; submission: Submission }> {
    if (this.useStatic) this.requireBackend('reviewSubmission');
    return this.request('/submissions/review', {
      method: 'POST',
      body: JSON.stringify({ submission_id: _submissionId, status: _status, reviewer: _reviewer, comment: _comment }),
    });
  }

  async getOverallStats(): Promise<OverallStats> {
    if (this.useStatic)
      return { total_users: 0, total_favorites: 0, total_ratings: 0, total_comments: 0, total_submissions: 0 };
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
    if (!response.text) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }
}

export const apiClient = new ApiClient(API_BASE_URL, USE_STATIC_DATA);
export const isStaticDemo = USE_STATIC_DATA;
