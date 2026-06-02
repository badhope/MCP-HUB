import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export function useSubmitServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      userId: string;
      name: string;
      source: string;
      description: string;
      categories?: string[];
      npmPackage?: string;
    }) => apiClient.submitServer(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
}