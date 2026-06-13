import { useCallback, useState } from 'react';

export function useDownloadConfig() {
  const [downloading, setDownloading] = useState(false);

  const downloadConfig = useCallback((config: string, filename: string) => {
    setDownloading(true);
    try {
      const blob = new Blob([config], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }, []);

  const downloadConfigJson = useCallback((config: Record<string, unknown>, filename: string) => {
    downloadConfig(JSON.stringify(config, null, 2), filename);
  }, [downloadConfig]);

  const downloadConfigMd = useCallback((content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return { downloading, downloadConfig, downloadConfigJson, downloadConfigMd };
}
