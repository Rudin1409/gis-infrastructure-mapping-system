'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import TopHeader from './TopHeader';
import BottomNav from './BottomNav';
import GisAiAssistantModal from '@/components/ai/GisAiAssistantModal';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ViewModeProvider, useViewMode } from '@/context/ViewModeContext';
import { useActiveSurveyorPresence } from '@/hooks/useActiveSurveyorPresence';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const isLoginPage = pathname === '/login';
  const isSurveyInputPage = pathname === '/poles/new';

  useActiveSurveyorPresence(user, isAuthenticated);

  // Splash animation control
  const [showSplash, setShowSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      const removeTimer = setTimeout(() => {
        setShowSplash(false);
      }, 700);
      return () => clearTimeout(removeTimer);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  const isFullScreenPage = pathname.startsWith('/map') || pathname.startsWith('/poles/new') || isLoginPage;

  return (
    <>
      {/* Full-Screen Pure Cinematic Logo Splash Screen */}
      {showSplash && (
        <div
          className={`fixed inset-0 z-[99999] w-screen h-screen flex flex-col items-center justify-center bg-white text-slate-800 p-6 select-none overflow-hidden transition-all duration-700 ease-out ${
            isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
          }`}
        >
          {/* Subtle decorative background circles */}
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />

          {/* Centered Pure Animated Logo with Sonar Radar GIS Waves */}
          <div className="relative flex items-center justify-center">
            <div className="absolute w-48 h-48 rounded-full border-2 border-blue-400/40 animate-radar-1 pointer-events-none" />
            <div className="absolute w-48 h-48 rounded-full border border-teal-400/35 animate-radar-2 pointer-events-none" />
            <div className="absolute w-48 h-48 rounded-full border border-indigo-400/30 animate-radar-3 pointer-events-none" />

            {/* Big Cinematic Animated App Logo Card (Solid White) */}
            <div className="relative z-10 animate-logo-intro">
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-[36px] bg-white p-4 sm:p-5 shadow-[0_20px_60px_rgba(37,99,235,0.20)] border border-slate-100 ring-2 ring-blue-100 flex items-center justify-center overflow-hidden animate-bounce-subtle">
                {/* Shimmer Light Reflection Sweep */}
                <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/80 to-transparent animate-shimmer pointer-events-none" />

                <img
                  src="/images/app-logo.png"
                  alt="Logo GIS Kota Lubuklinggau"
                  className="w-full h-full object-contain drop-shadow-lg relative z-10"
                />
              </div>
            </div>
          </div>

          {/* Subtle pulsating loading dots at bottom */}
          <div className="absolute bottom-10 flex items-center gap-2 opacity-85">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse [animation-delay:200ms]" />
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse [animation-delay:400ms]" />
          </div>
        </div>
      )}

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

      {/* AI Assistant Floating Copilot (except login) */}
      {!isLoginPage && !isSurveyInputPage && <GisAiAssistantModal />}

      {/* Modern Mobile Bottom Navigation (except login) */}
      {!isLoginPage && isAuthenticated && <BottomNav />}
    </>
  );
}

function AppLayoutContainer({ children }: { children: React.ReactNode }) {
  const { viewMode } = useViewMode();
  const isDesktop = viewMode === 'DESKTOP';

  return (
    <div className="min-h-screen w-full bg-[#0b1120] flex justify-center items-start text-slate-800 font-sans selection:bg-blue-600 selection:text-white transition-all duration-300">
      {/* Desktop uses the full dashboard canvas; mobile mode stays available for phone-preview work on laptops. */}
      <div
        className={`w-full h-screen max-h-screen bg-[#f4f7fb] relative flex flex-col overflow-hidden transition-all duration-300 ease-out ${
          isDesktop
            ? 'max-w-full shadow-none border-none'
            : 'max-w-[430px] border-x border-slate-200/50 shadow-[0_20px_60px_rgba(0,0,0,0.6)]'
        }`}
      >
        <LayoutContent>{children}</LayoutContent>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ViewModeProvider>
        <AppLayoutContainer>{children}</AppLayoutContainer>
      </ViewModeProvider>
    </AuthProvider>
  );
}
