'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import TopHeader from './TopHeader';
import BottomNav from './BottomNav';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Radio, Loader2 } from 'lucide-react';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoaded } = useAuth();
  const isLoginPage = pathname === '/login';

  // Splash loader while checking session
  if (!isLoaded) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center select-none">
        <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-2xl mb-4 animate-pulse">
          <Radio className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-sm font-black uppercase tracking-wider font-mono text-white">
          INFRA-MAP GIS
        </h2>
        <p className="text-xs text-blue-300 mt-0.5">
          Memeriksa Akses Masuk Kota Lubuklinggau...
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Memuat Sistem...</span>
        </div>
      </div>
    );
  }

  // If not logged in and not on login page, wait for redirect
  if (!isAuthenticated && !isLoginPage) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  const isFullScreenPage = pathname.startsWith('/map') || pathname.startsWith('/poles/new') || isLoginPage;

  return (
    <>
      {/* Sticky Universal Top Header on All Pages (except login) */}
      {!isLoginPage && isAuthenticated && <TopHeader />}

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

      {/* Modern Mobile Bottom Navigation (except login) */}
      {!isLoginPage && isAuthenticated && <BottomNav />}
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0b1120] flex justify-center items-start text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
        {/* Centered Clean Mobile App Container */}
        <div className="w-full max-w-[430px] h-screen max-h-screen bg-[#f4f7fb] border-x border-slate-200/50 shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative flex flex-col overflow-hidden">
          <LayoutContent>{children}</LayoutContent>
        </div>
      </div>
    </AuthProvider>
  );
}
