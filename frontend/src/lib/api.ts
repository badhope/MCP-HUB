import { Server, ServerConfig, StatsResponse, ServerListResponse } from '../types';

const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_URL || '')
  : '';

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

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
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
    return this.request<StatsResponse>('/stats');
  }

  async getServers(params?: {
    search?: string;
    category?: string;
    language?: string;
    sort?: string;
    minStars?: number;
    limit?: number;
  }): Promise<ServerListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.language) searchParams.set('language', params.language);
    if (params?.sort) searchParams.set('sort', params.sort);
    if (params?.minStars && params.minStars > 0) searchParams.set('min_stars', params.minStars.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/servers?${queryString}` : '/servers';
    return this.request<ServerListResponse>(endpoint);
  }

  async getPopularServers(limit: number = 20): Promise<ServerListResponse> {
    return this.request<ServerListResponse>(`/servers/popular?limit=${limit}`);
  }

  async getRecentServers(limit: number = 20): Promise<ServerListResponse> {
    return this.request<ServerListResponse>(`/servers/recent?limit=${limit}`);
  }

  async getCuratedServers(limit: number = 20): Promise<ServerListResponse> {
    return this.request<ServerListResponse>(`/servers/curated?limit=${limit}`);
  }

  async getServer(name: string): Promise<Server> {
    return this.request<Server>(`/servers/${encodeURIComponent(name)}`);
  }

  async getServerConfig(name: string): Promise<ServerConfig> {
    return this.request<ServerConfig>(`/config/${encodeURIComponent(name)}`);
  }

  async getServersByQuality(minScore?: number, level?: string, limit: number = 20) {
    const params = new URLSearchParams();
    if (minScore !== undefined) params.set('min_score', minScore.toString());
    if (level) params.set('level', level);
    params.set('limit', limit.toString());
    return this.request<ServerListResponse>(`/servers/by-quality?${params.toString()}`);
  }

  async getServersByCategory(category: string, limit: number = 20) {
    return this.request<ServerListResponse>(`/servers/by-category/${encodeURIComponent(category)}?limit=${limit}`);
  }

  async compareServers(servers: string[]) {
    return this.request<{
      total: number;
      servers: Array<Server & { quality_score: number; quality_level: string }>;
      best_for: {
        stars: { name: string; value: number };
        quality: { name: string; value: number };
        categories: { name: string; value: number };
        documentation: { name: string; value: number };
      };
    }>(`/compare?servers=${servers.join(',')}`);
  }

  async getSimilarServers(name: string, limit: number = 5) {
    return this.request<{
      target: string;
      total: number;
      similar_servers: Array<Server & { similarity_score: number; quality_score: number; matching_categories: string[]; matching_topics: string[] }>;
    }>(`/recommend/similar?name=${encodeURIComponent(name)}&limit=${limit}`);
  }

  async getServersForUseCase(useCase: string, limit: number = 10) {
    return this.request<{
      use_case: string;
      total_found: number;
      servers: Array<Server & { quality_score: number; quality_level: string; match_boost: number; final_score: number }>;
      tip: string;
    }>(`/recommend/for-use-case?use_case=${encodeURIComponent(useCase)}&limit=${limit}`);
  }

  async addFavorite(userId: string, serverName: string) {
    return this.request<{
      success: boolean;
      user_id: string;
      server_name: string;
      message: string;
    }>('/favorites/add', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, server_name: serverName }),
    });
  }

  async removeFavorite(userId: string, serverName: string) {
    return this.request<{
      success: boolean;
      user_id: string;
      server_name: string;
      message: string;
    }>('/favorites/remove', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, server_name: serverName }),
    });
  }

  async getFavorites(userId: string) {
    return this.request<{
      user_id: string;
      favorites: string[];
      count: number;
    }>(`/favorites/${encodeURIComponent(userId)}`);
  }

  async checkFavorite(userId: string, serverName: string) {
    return this.request<{
      user_id: string;
      server_name: string;
      is_favorite: boolean;
    }>(`/favorites/check/${encodeURIComponent(userId)}/${encodeURIComponent(serverName)}`);
  }

  async getFavoriteCount(serverName: string) {
    return this.request<{
      server_name: string;
      favorites_count: number;
    }>(`/favorites/count/${encodeURIComponent(serverName)}`);
  }

  async addRating(userId: string, serverName: string, rating: number, comment?: string) {
    return this.request<{
      success: boolean;
      rating: Rating;
    }>('/ratings/add', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, server_name: serverName, rating, comment }),
    });
  }

  async getRatings(serverName: string) {
    return this.request<{
      server_name: string;
      ratings: Rating[];
      average_rating: number;
      count: number;
    }>(`/ratings/${encodeURIComponent(serverName)}`);
  }

  async getUserRating(userId: string, serverName: string) {
    return this.request<{
      user_id: string;
      server_name: string;
      rating: Rating | null;
    }>(`/ratings/user/${encodeURIComponent(userId)}/${encodeURIComponent(serverName)}`);
  }

  async addComment(userId: string, serverName: string, text: string) {
    return this.request<{
      success: boolean;
      comment: Comment;
    }>('/comments/add', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, server_name: serverName, text }),
    });
  }

  async getComments(serverName: string) {
    return this.request<{
      server_name: string;
      comments: Comment[];
      count: number;
    }>(`/comments/${encodeURIComponent(serverName)}`);
  }

  async getServerStats(serverName: string) {
    return this.request<{
      server_name: string;
      stats: ServerStats;
    }>(`/server-stats/${encodeURIComponent(serverName)}`);
  }

  async getUserStats(userId: string) {
    return this.request<{
      user_id: string;
      stats: UserStats;
    }>(`/user-stats/${encodeURIComponent(userId)}`);
  }

  async submitServer(params: {
    userId: string;
    name: string;
    source: string;
    description: string;
    categories?: string[];
    npmPackage?: string;
  }) {
    return this.request<{
      success: boolean;
      submission: Submission;
    }>('/submissions/submit', {
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

  async getSubmissions(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<{
      total: number;
      status?: string;
      submissions: Submission[];
    }>(`/submissions${params}`);
  }

  async getUserSubmissions(userId: string) {
    return this.request<{
      user_id: string;
      submissions: Submission[];
      count: number;
    }>(`/submissions/user/${encodeURIComponent(userId)}`);
  }

  async reviewSubmission(submissionId: string, status: 'approved' | 'rejected', reviewer: string, comment?: string) {
    return this.request<{
      success: boolean;
      submission: Submission;
    }>('/submissions/review', {
      method: 'POST',
      body: JSON.stringify({ submission_id: submissionId, status, reviewer, comment }),
    });
  }

  async getOverallStats() {
    return this.request<OverallStats>('/stats/all');
  }

  async exportServerMarkdown(name: string): Promise<string> {
    const url = `${this.baseUrl}/api/export/markdown/${encodeURIComponent(name)}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }

  async exportBatchJson(serverNames: string[]): Promise<{
    total_requested: number;
    total_found: number;
    not_found: string[];
    config: { mcpServers: Record<string, unknown> };
    servers: Server[];
  }> {
    return this.request('/export/batch-json', {
      method: 'POST',
      body: JSON.stringify({ server_names: serverNames }),
    });
  }

  async exportBatchMarkdown(serverNames: string[]): Promise<string> {
    const url = `${this.baseUrl}/api/export/batch-markdown`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server_names: serverNames }),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
