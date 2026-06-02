import { useState, useCallback } from 'react';
import { apiClient } from '../lib/api';
import { downloadJSON, downloadMarkdown } from '../lib/download';
import { generateServerMarkdown } from '../lib/markdown';
import { Server, ServerConfig } from '../types';

export function useDownloadConfig() {
  const [downloading, setDownloading] = useState(false);

  const downloadConfigJson = useCallback(async (server: Server, config: ServerConfig | null) => {
    setDownloading(true);
    try {
      const configData = config
        ? { mcpServers: config.mcpServers || {} }
        : {
            mcpServers: {
              [server.name]: {
                command: 'your-command-here',
                args: [],
                env: {},
              },
            },
          };
      downloadJSON(configData, `${server.name}-mcp-config.json`);
    } finally {
      setDownloading(false);
    }
  }, []);

  const downloadConfigMd = useCallback(async (server: Server, config: ServerConfig | null) => {
    setDownloading(true);
    try {
      const markdown = generateServerMarkdown(server, config);
      downloadMarkdown(markdown, `${server.name}-mcp.md`);
    } finally {
      setDownloading(false);
    }
  }, []);

  return { downloading, downloadConfigJson, downloadConfigMd };
}

export function useBatchExport() {
  const [exporting, setExporting] = useState(false);

  const exportBatchAsJson = useCallback(async (serverNames: string[]) => {
    if (serverNames.length === 0) return;
    setExporting(true);
    try {
      const result = await apiClient.exportBatchJson(serverNames);
      downloadJSON(result.config, 'mcp-servers-config.json');
    } finally {
      setExporting(false);
    }
  }, []);

  const exportBatchAsMarkdown = useCallback(async (serverNames: string[]) => {
    if (serverNames.length === 0) return;
    setExporting(true);
    try {
      const markdown = await apiClient.exportBatchMarkdown(serverNames);
      downloadMarkdown(markdown, 'mcp-servers-config.md');
    } finally {
      setExporting(false);
    }
  }, []);

  return { exporting, exportBatchAsJson, exportBatchAsMarkdown };
}
