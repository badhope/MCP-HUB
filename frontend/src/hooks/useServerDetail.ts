import { useState, useEffect } from 'react';
import type { ServerConfig } from '../types';
import { apiClient } from '../lib/api';

export function useServerDetail(serverName: string) {
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!serverName) return;

    const loadConfig = async () => {
      try {
        setLoading(true);
        const cfg = await apiClient.getServerConfig(serverName);
        setConfig(cfg);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load config');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [serverName]);

  return { config, loading, error };
}

// Alias for backward compatibility
export const useServerConfig = useServerDetail;
