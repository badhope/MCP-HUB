import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export function useComments(serverName: string) {
  return useQuery({
    queryKey: ['comments', serverName],
    queryFn: () => apiClient.getComments(serverName),
    enabled: !!serverName,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      serverName,
      text,
    }: {
      userId: string;
      serverName: string;
      text: string;
    }) => apiClient.addComment(userId, serverName, text),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.serverName] });
    },
  });
}