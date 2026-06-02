import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { Server } from '../types';

export function useServers(params?: {
  search?: string;
  category?: string;
  language?: string;
  sort?: string;
  minStars?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['servers', params],
    queryFn: () => apiClient.getServers(params),
    select: (data) => ({
      servers: data.servers as Server[],
      total: data.total,
    }),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePopularServers(limit: number = 20) {
  return useQuery({
    queryKey: ['servers', 'popular', limit],
    queryFn: () => apiClient.getPopularServers(limit),
    select: (data) => data.servers as Server[],
  });
}

export function useRecentServers(limit: number = 20) {
  return useQuery({
    queryKey: ['servers', 'recent', limit],
    queryFn: () => apiClient.getRecentServers(limit),
    select: (data) => data.servers as Server[],
  });
}

export function useCuratedServers(limit: number = 20) {
  return useQuery({
    queryKey: ['servers', 'curated', limit],
    queryFn: () => apiClient.getCuratedServers(limit),
    select: (data) => data.servers as Server[],
  });
}

export function useServersByCategory(category: string, limit: number = 20) {
  return useQuery({
    queryKey: ['servers', 'by-category', category, limit],
    queryFn: () => apiClient.getServersByCategory(category, limit),
    select: (data) => data.servers as Server[],
    enabled: !!category,
  });
}

export function useServersByQuality(
  minScore?: number,
  level?: string,
  limit: number = 20
) {
  return useQuery({
    queryKey: ['servers', 'by-quality', minScore, level, limit],
    queryFn: () => apiClient.getServersByQuality(minScore, level, limit),
    select: (data) => data.servers as Server[],
  });
}

export function usePrefetchServers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.prefetchQuery({
      queryKey: ['servers', {}],
      queryFn: () => apiClient.getServers({}),
    });
  };
}