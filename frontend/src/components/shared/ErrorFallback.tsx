import React from 'react';
import { FallbackProps } from 'react-error-boundary';
import { IconAlertTriangle, IconRefresh, IconHome } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export const ErrorFallback = React.memo<FallbackProps>(({
  error,
  resetErrorBoundary,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="h-2 bg-primary" />

        <div className="p-8">
          <div className="flex items-center mb-6">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mr-4">
              <IconAlertTriangle size={28} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                An unexpected error occurred. Please try again.
              </p>
            </div>
          </div>

          <div className="bg-background rounded-xl p-4 mb-6">
            <p className="text-xs text-muted-foreground font-medium mb-1">Error Details</p>
            <p className="text-sm text-foreground font-mono break-all leading-relaxed">
              {error instanceof Error ? error.message : String(error)}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={resetErrorBoundary}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-colors"
            >
              <IconRefresh size={18} />
              <span>Try Again</span>
            </button>
            <Link
              to="/"
              className="flex items-center justify-center space-x-2 px-4 py-3 border border-border text-foreground hover:bg-accent hover:text-accent-foreground font-medium rounded-xl transition-colors"
            >
              <IconHome size={18} />
              <span>IconHome</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
});