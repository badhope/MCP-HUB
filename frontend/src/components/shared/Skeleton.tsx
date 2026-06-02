import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = React.memo<SkeletonProps>(({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
  );
});

interface ServerCardSkeletonProps {
  count?: number;
}

export const ServerCardSkeleton = React.memo<ServerCardSkeletonProps>(({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-2 rounded-md" />
            <Skeleton className="h-4 w-5/6 mb-4 rounded-md" />
            <div className="flex gap-2 mb-4">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
          <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-4 w-20 rounded-md" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

interface StatsCardSkeletonProps {
  count?: number;
}

export const StatsCardSkeleton = React.memo<StatsCardSkeletonProps>(({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
          </div>
          <Skeleton className="h-4 w-24 mb-2 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
});
