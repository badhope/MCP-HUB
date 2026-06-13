import React from 'react';

interface PageSkeletonProps {
  variant?: 'default' | 'detail' | 'list' | 'home';
}

export const PageSkeleton = React.memo<PageSkeletonProps>(({ variant = 'default' }) => {
  if (variant === 'home') {
    return (
      <div className="min-h-screen bg-background animate-pulse">
        <div className="h-96 bg-muted/50" />
        <div className="container mx-auto px-4 -mt-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-5 shadow-sm border border-border">
                <div className="w-12 h-12 bg-muted rounded-xl" />
                <div className="h-6 bg-muted rounded w-16 mt-3" />
                <div className="h-3 bg-muted rounded w-20 mt-1" />
              </div>
            ))}
          </div>
          <div className="mt-12">
            <div className="h-7 bg-muted rounded w-48 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-2xl p-5">
                  <div className="flex items-start mb-4">
                    <div className="w-12 h-12 bg-muted rounded-xl" />
                    <div className="ml-3 flex-1">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="min-h-screen bg-background py-8 animate-pulse">
        <div className="container mx-auto px-4">
          <div className="h-10 bg-muted rounded-lg w-96 mb-8" />
          <div className="h-12 bg-muted rounded-xl w-full mb-6" />
          <div className="bg-card rounded-xl p-6 mb-8">
            <div className="flex flex-wrap gap-2">
              <div className="h-10 bg-muted rounded-full w-20" />
              <div className="h-10 bg-muted rounded-full w-24" />
              <div className="h-10 bg-muted rounded-full w-28" />
              <div className="h-10 bg-muted rounded-full w-16" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-5">
                <div className="flex items-start mb-4">
                  <div className="w-12 h-12 bg-muted rounded-xl" />
                  <div className="ml-3 flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className="min-h-screen bg-background animate-pulse">
        <div className="bg-card border-b border-border">
          <div className="container mx-auto px-4">
            <div className="h-12 flex items-center">
              <div className="h-3 bg-muted rounded w-64" />
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-card rounded-2xl overflow-hidden">
                <div className="h-2 bg-muted" />
                <div className="p-8">
                  <div className="flex items-start space-x-5">
                    <div className="w-24 h-24 bg-muted rounded-2xl" />
                    <div className="flex-1">
                      <div className="h-8 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                      <div className="flex space-x-4">
                        <div className="h-5 bg-muted rounded w-20" />
                        <div className="h-5 bg-muted rounded w-24" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 space-y-2">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-card rounded-2xl p-6">
                <div className="h-4 bg-muted rounded w-32 mb-4" />
                <div className="h-24 bg-muted rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
});