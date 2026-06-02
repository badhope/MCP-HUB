import React from 'react';
import { Download, FileJson, FileText, X, CheckSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { useBatchExport } from '../../hooks/useExport';

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
  onDeselectAll,
}) => {
  const { exporting, exportBatchAsJson, exportBatchAsMarkdown } = useBatchExport();

  if (selectedServers.length === 0) return null;

  const allSelected = selectedServers.length === totalCount;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-50 animate-slide-up">
      <div className="px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div className="flex items-center justify-between sm:justify-start sm:space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <CheckSquare size={14} className="sm:size-4 text-primary-600" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-gray-900">
                {selectedServers.length} selected
              </span>
            </div>
            <div className="hidden sm:block h-5 w-px bg-gray-200" />
            <button
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="text-xs sm:text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {allSelected ? 'Deselect' : 'Select All'}
            </button>
            <button
              onClick={onClearSelection}
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 ml-2 sm:ml-0"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportBatchAsJson(selectedServers)}
              disabled={exporting}
              className="flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <FileJson size={14} className="mr-1 hidden sm:inline" />
              <span className="sm:hidden">JSON</span>
              <span className="hidden sm:inline">Export JSON</span>
              <Download size={12} className="ml-1 hidden sm:inline" />
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => exportBatchAsMarkdown(selectedServers)}
              disabled={exporting}
              className="flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <FileText size={14} className="mr-1 hidden sm:inline" />
              <span className="sm:hidden">MD</span>
              <span className="hidden sm:inline">Export MD</span>
              <Download size={12} className="ml-1 hidden sm:inline" />
            </Button>
            <button
              onClick={onClearSelection}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
