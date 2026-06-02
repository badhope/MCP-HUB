import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export const useStats = () =>
  useQuery({
    queryKey: ['stats'],
    queryFn: () => apiClient.getStats(),
    staleTime: 1000 * 60 * 5,
  });
