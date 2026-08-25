import React from 'react';

export default function DashboardLoading() {
  return (
    <div className="p-4 space-y-4 font-sans animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-28 rounded-3xl bg-slate-200/80 w-full" />

      {/* 4 Quick Stat Cards Skeleton */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-24 rounded-3xl bg-slate-200/80" />
        <div className="h-24 rounded-3xl bg-slate-200/80" />
        <div className="h-24 rounded-3xl bg-slate-200/80" />
        <div className="h-24 rounded-3xl bg-slate-200/80" />
      </div>

      {/* Provider Share Progress Bar Skeleton */}
      <div className="h-32 rounded-3xl bg-slate-200/80 w-full" />

      {/* Recent Items List Skeleton */}
      <div className="space-y-2.5 pt-2">
        <div className="h-4 w-36 bg-slate-200 rounded-md" />
        <div className="h-20 rounded-3xl bg-slate-200/80 w-full" />
        <div className="h-20 rounded-3xl bg-slate-200/80 w-full" />
      </div>
    </div>
  );
}
