'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import TopHeader from './TopHeader';
import BottomNav from './BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Map and survey wizard need full-height flex container for Leaflet map canvas
  const isFullScreenPage = pathname.startsWith('/map') || pathname.startsWith('/poles/new');

  return (
    <div className="min-h-screen bg-[#0b1120] flex justify-center items-start text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* Centered Clean Mobile App Container */}
      <div className="w-full max-w-[430px] h-screen max-h-screen bg-[#f4f7fb] border-x border-slate-200/50 shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative flex flex-col overflow-hidden">
        {/* Sticky Universal Top Header on All Pages */}
        <TopHeader />

        {/* Dynamic Page Content with Layout Adaptation */}
        <main
          className={`flex-1 w-full relative min-h-0 ${
            isFullScreenPage
              ? 'overflow-hidden pb-0 flex flex-col'
              : 'overflow-y-auto pb-24 scroll-smooth'
          }`}
        >
          <div
            key={pathname}
            className={`w-full ${
              isFullScreenPage
                ? 'h-full flex flex-col flex-1 overflow-hidden'
                : 'min-h-full'
            } animate-in fade-in duration-150`}
          >
            {children}
          </div>
        </main>

        {/* Modern Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
}
