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

  // Splash loader while checking session (Modern Bright White Theme with Animated Logo)
  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white via-slate-50 to-blue-50/40 text-slate-800 p-6 text-center select-none relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-teal-100/60 rounded-full blur-3xl pointer-events-none" />

        {/* Animated App Logo Card */}
        <div className="relative z-10 mb-5">
          <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-2xl animate-pulse" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white p-3 shadow-[0_12px_40px_rgba(37,99,235,0.12)] border border-slate-100 flex items-center justify-center animate-bounce-subtle">
            <img
              src="/images/app-logo.png"
              alt="Logo InfraMap GIS Kota Lubuklinggau"
              className="w-full h-full object-contain drop-shadow-md transform transition-transform hover:scale-105"
            />
          </div>
        </div>

        {/* Brand Typography */}
        <div className="relative z-10 space-y-1.5 max-w-xs">
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider font-mono text-slate-900 leading-tight">
            INFRA-MAP GIS
          </h2>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Sistem Inventarisasi &amp; Pemetaan Infrastruktur Spasial
          </p>
          <div className="pt-1">
            <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-200 shadow-2xs">
              Pemerintah Kota Lubuklinggau
            </span>
          </div>
        </div>

        {/* Loading Indicator */}
        <div className="relative z-10 mt-6 flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span>Memuat Sistem...</span>
        </div>
      </div>
    );
  }

  // If not logged in and not on login page, wait for redirect (Bright theme)
  if (!isAuthenticated && !isLoginPage) {
    return (
      <div className="w-full h-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white via-slate-50 to-blue-50/40 text-slate-800 p-6">
        <div className="w-16 h-16 rounded-2xl bg-white p-2 shadow-lg border border-slate-100 flex items-center justify-center mb-3">
          <img
            src="/images/app-logo.png"
            alt="Logo InfraMap GIS"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Mengalihkan ke halaman login...</span>
        </div>
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
