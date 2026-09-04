'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ViewMode = 'MOBILE' | 'DESKTOP';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

const ViewModeContext = createContext<ViewModeContextType>({
  viewMode: 'MOBILE',
  setViewMode: () => {},
  toggleViewMode: () => {},
  isFullscreen: false,
  toggleFullscreen: () => {},
});

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>('MOBILE');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize from localStorage or screen width on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gis_screen_view_mode') as ViewMode | null;
      const isLargeScreen = typeof window !== 'undefined' && window.innerWidth >= 1024;
      if (!isLargeScreen) {
        // Mobile phones and narrow screens always start in optimal MOBILE mode
        setViewModeState('MOBILE');
      } else if (saved === 'MOBILE') {
        setViewModeState('MOBILE');
      } else {
        // Large desktop screens default to DESKTOP mode
        setViewModeState('DESKTOP');
      }
    } catch (_) {}

    // Listen to native browser fullscreen change events
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem('gis_screen_view_mode', mode);
    } catch (_) {}
  };

  const toggleViewMode = () => {
    const next = viewMode === 'MOBILE' ? 'DESKTOP' : 'MOBILE';
    setViewMode(next);
  };

  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
      // Auto enable desktop view mode when entering true fullscreen
      setViewMode('DESKTOP');
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <ViewModeContext.Provider
      value={{
        viewMode,
        setViewMode,
        toggleViewMode,
        isFullscreen,
        toggleFullscreen,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
