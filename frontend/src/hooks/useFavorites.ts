import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export function useFavorites(userId: string) {
  return useQuery({
    queryKey: ['favorites', userId],
    queryFn: () => apiClient.getFavorites(userId),
    enabled: !!userId,
  });
}

export function useCheckFavorite(userId: string, serverName: string) {
  return useQuery({
    queryKey: ['favorites', 'check', userId, serverName],
    queryFn: () => apiClient.checkFavorite(userId, serverName),
    enabled: !!userId && !!serverName,
  });
}

export function useFavoriteCount(serverName: string) {
  return useQuery({
    queryKey: ['favorites', 'count', serverName],
    queryFn: () => apiClient.getFavoriteCount(serverName),
    enabled: !!serverName,
  });
}

export function useAddFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, serverName }: { userId: string; serverName: string }) =>
      apiClient.addFavorite(userId, serverName),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favorites', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['favorites', 'check'] });
      queryClient.invalidateQueries({ queryKey: ['favorites', 'count', variables.serverName] });
    },
  });
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, serverName }: { userId: string; serverName: string }) =>
      apiClient.removeFavorite(userId, serverName),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['favorites', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['favorites', 'check'] });
      queryClient.invalidateQueries({ queryKey: ['favorites', 'count', variables.serverName] });
    },
  });
}