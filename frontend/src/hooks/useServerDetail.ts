import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { Server } from '../types';

export function useServerConfig(name: string) {
  return useQuery({
    queryKey: ['server', 'config', name],
    queryFn: () => apiClient.getServerConfig(name),
    enabled: !!name,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSimilarServers(name: string, limit: number = 5) {
  return useQuery({
    queryKey: ['server', 'similar', name, limit],
    queryFn: () => apiClient.getSimilarServers(name, limit),
    select: (data) => ({
      servers: data.similar_servers as Server[],
      total: data.total,
    }),
    enabled: !!name,
  });
}

export function useCompareServers(serverNames: string[]) {
  return useQuery({
    queryKey: ['servers', 'compare', serverNames],
    queryFn: () => apiClient.compareServers(serverNames),
    enabled: serverNames.length > 0,
  });
}

export function useServersForUseCase(useCase: string, limit: number = 10) {
  return useQuery({
    queryKey: ['servers', 'use-case', useCase, limit],
    queryFn: () => apiClient.getServersForUseCase(useCase, limit),
    enabled: !!useCase,
  });
}