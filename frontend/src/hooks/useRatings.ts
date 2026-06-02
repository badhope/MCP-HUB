import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export function useRatings(serverName: string) {
  return useQuery({
    queryKey: ['ratings', serverName],
    queryFn: () => apiClient.getRatings(serverName),
    enabled: !!serverName,
  });
}

export function useUserRating(userId: string, serverName: string) {
  return useQuery({
    queryKey: ['ratings', 'user', userId, serverName],
    queryFn: () => apiClient.getUserRating(userId, serverName),
    enabled: !!userId && !!serverName,
  });
}

export function useAddRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      serverName,
      rating,
      comment,
    }: {
      userId: string;
      serverName: string;
      rating: number;
      comment?: string;
    }) => apiClient.addRating(userId, serverName, rating, comment),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ratings', variables.serverName] });
      queryClient.invalidateQueries({ queryKey: ['ratings', 'user', variables.userId] });
    },
  });
}