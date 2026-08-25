import React from 'react';

export default function PoleDetailLoading() {
  return (
    <div className="p-4 space-y-3.5 font-sans animate-pulse pb-24">
      {/* Top Action Bar Skeleton */}
      <div className="flex items-center justify-between pt-1">
        <div className="h-8 w-20 rounded-xl bg-slate-200" />
        <div className="flex gap-2">
          <div className="h-8 w-28 rounded-xl bg-slate-200" />
          <div className="h-8 w-16 rounded-xl bg-slate-200" />
        </div>
      </div>

      {/* Main Pole Header Card Skeleton */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-3 w-28 bg-slate-200 rounded-md" />
            <div className="h-6 w-36 bg-slate-200 rounded-md" />
          </div>
          <div className="h-6 w-20 rounded-full bg-slate-200" />
        </div>

        {/* Photo Container Skeleton */}
        <div className="h-44 rounded-2xl bg-slate-200/80 w-full" />

        {/* 4 Specs Grid Skeletons */}
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 rounded-2xl bg-slate-100" />
          <div className="h-16 rounded-2xl bg-slate-100" />
          <div className="h-16 rounded-2xl bg-slate-100" />
          <div className="h-16 rounded-2xl bg-slate-100" />
          <div className="h-16 rounded-2xl bg-slate-100 col-span-2" />
          <div className="h-16 rounded-2xl bg-slate-100 col-span-2" />
        </div>
      </div>

      {/* Mini Map Skeleton */}
      <div className="h-48 rounded-3xl bg-slate-200/80 w-full" />
    </div>
  );
}
