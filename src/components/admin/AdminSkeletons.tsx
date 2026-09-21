import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* 6 Core Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-4 rounded-xl border bg-card space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>

      {/* Assets & Liabilities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border bg-card space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="p-4 rounded-xl border bg-card space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-40" />
        </div>
      </div>

      {/* Performance Graph Skeleton */}
      <div className="p-6 rounded-xl border bg-card space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>

      {/* 7 Days Table Skeleton */}
      <div className="p-4 rounded-xl border bg-card space-y-3">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}
