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

  // Splash loader while checking session (Cinematic Bright White Theme with Animated Logo)
  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-white via-sky-50/40 to-blue-50/60 text-slate-800 p-6 text-center select-none relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-200/40 rounded-full blur-3xl pointer-events-none" />

        {/* GIS Radar Sonar Wave Rings */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute w-36 h-36 rounded-full border-2 border-blue-400/30 animate-radar-1 pointer-events-none" />
          <div className="absolute w-36 h-36 rounded-full border border-teal-400/25 animate-radar-2 pointer-events-none" />
          <div className="absolute w-36 h-36 rounded-full border border-indigo-400/20 animate-radar-3 pointer-events-none" />

          {/* Cinematic Animated App Logo Card */}
          <div className="relative z-10 animate-logo-intro">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white/95 backdrop-blur-xl p-3.5 shadow-[0_16px_50px_rgba(37,99,235,0.18)] border border-white/80 ring-1 ring-blue-100 flex items-center justify-center overflow-hidden animate-bounce-subtle">
              {/* Shimmer Light Reflection */}
              <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/70 to-transparent animate-shimmer pointer-events-none" />

              <img
                src="/images/app-logo.png"
                alt="Logo InfraMap GIS Kota Lubuklinggau"
                className="w-full h-full object-contain drop-shadow-md relative z-10"
              />
            </div>
          </div>
        </div>

        {/* Brand Typography with Staggered Entrance */}
        <div className="relative z-10 space-y-2 max-w-xs">
          <div className="animate-slide-up-1">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider font-mono text-slate-900 leading-tight">
              INFRA-MAP GIS
            </h2>
          </div>
          <div className="animate-slide-up-2">
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              Sistem Pemetaan Infrastruktur &amp; Utilitas Jaringan
            </p>
          </div>
          <div className="pt-0.5 animate-slide-up-3">
            <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50/90 px-3.5 py-1 rounded-full border border-blue-200/90 shadow-2xs">
              🏛️ Pemerintah Kota Lubuklinggau
            </span>
          </div>
        </div>

        {/* Loading Indicator */}
        <div className="relative z-10 mt-7 flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-200/80 shadow-xs animate-slide-up-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span>Memuat Sistem GIS...</span>
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
