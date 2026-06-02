import React from 'react';
import { FallbackProps } from 'react-error-boundary';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ErrorFallback = React.memo<FallbackProps>(({
  error,
  resetErrorBoundary,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500" />

        <div className="p-8">
          <div className="flex items-center mb-6">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mr-4">
              <AlertTriangle size={28} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                An unexpected error occurred. Please try again.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-500 font-medium mb-1">Error Details</p>
            <p className="text-sm text-gray-700 font-mono break-all leading-relaxed">
              {error instanceof Error ? error.message : String(error)}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={resetErrorBoundary}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors"
            >
              <RefreshCw size={18} />
              <span>Try Again</span>
            </button>
            <Link
              to="/"
              className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition-colors"
            >
              <Home size={18} />
              <span>Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
});