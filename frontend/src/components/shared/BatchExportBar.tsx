import React from 'react';
import { Button } from '../ui/Button';
import { IconDownload } from '@tabler/icons-react';

interface BatchExportBarProps {
  selectedServers: string[];
  totalCount: number;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const BatchExportBar = React.memo<BatchExportBarProps>(({ 
  selectedServers, 
  totalCount,
  onClearSelection,
  onSelectAll,
  onDeselectAll 
}) => {
  if (selectedServers.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-lg shadow-lg p-3 flex items-center gap-3">
      <span className="text-sm text-muted-foreground">
        {selectedServers.length} / {totalCount} server{selectedServers.length > 1 ? 's' : ''} selected
      </span>
      <Button size="sm" variant="outline" onClick={onSelectAll}>
        Select All
      </Button>
      <Button size="sm" variant="outline" onClick={onDeselectAll}>
        Deselect All
      </Button>
      <Button size="sm" variant="outline" onClick={onClearSelection}>
        Clear
      </Button>
      <Button size="sm">
        <IconDownload size={14} />
        Export
      </Button>
    </div>
  );
});
