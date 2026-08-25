import React from 'react';

export default function PolesListLoading() {
  return (
    <div className="p-4 space-y-3.5 font-sans animate-pulse">
      {/* Header Bar Skeleton */}
      <div className="flex items-center justify-between pt-1">
        <div className="space-y-1">
          <div className="h-5 w-40 bg-slate-200 rounded-md" />
          <div className="h-3 w-28 bg-slate-200 rounded-md" />
        </div>
        <div className="h-9 w-24 bg-slate-200 rounded-2xl" />
      </div>

      {/* Search Input Bar Skeleton */}
      <div className="h-11 rounded-2xl bg-slate-200/80 w-full" />

      {/* Filter Badges Bar Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-20 rounded-xl bg-slate-200/80" />
        <div className="h-8 w-16 rounded-xl bg-slate-200/80" />
        <div className="h-8 w-24 rounded-xl bg-slate-200/80" />
        <div className="h-8 w-20 rounded-xl bg-slate-200/80" />
      </div>

      {/* Poles Card Skeletons */}
      <div className="space-y-2.5 pt-1">
        <div className="h-36 rounded-3xl bg-slate-200/80 w-full" />
        <div className="h-36 rounded-3xl bg-slate-200/80 w-full" />
        <div className="h-36 rounded-3xl bg-slate-200/80 w-full" />
      </div>
    </div>
  );
}
