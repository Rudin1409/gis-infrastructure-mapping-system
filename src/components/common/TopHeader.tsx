'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Radio,
  ChevronLeft,
  MapPin,
  Database,
  Map,
  Cable,
  PlusCircle,
  Sparkles,
  RotateCw,
  User,
  ShieldAlert,
  Monitor,
  Smartphone,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useViewMode } from '@/context/ViewModeContext';

export default function TopHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Determine dynamic title and subtitle based on route
  const getHeaderMeta = () => {
    if (pathname === '/') {
      return {
        title: 'INFRA-MAP GIS',
        subtitle: 'Kota Lubuklinggau',
        icon: Radio,
        showBack: false,
      };
    }
    if (pathname === '/map') {
      return {
        title: 'Peta Sebaran GIS',
        subtitle: 'Monitoring & Inventarisasi Tiang',
        icon: Map,
        showBack: false,
      };
    }
    if (pathname === '/poles/new') {
      return {
        title: 'Survey Tiang Baru',
        subtitle: 'Kunci GPS & Data Lapangan',
        icon: PlusCircle,
        showBack: true,
      };
    }
    if (pathname === '/poles') {
      return {
        title: 'Katalog Data Tiang',
        subtitle: 'Daftar Inventaris Infrastruktur',
        icon: Database,
        showBack: false,
      };
    }
    if (pathname.startsWith('/poles/')) {
      return {
        title: 'Detail Spesifikasi Tiang',
        subtitle: 'Informasi & Audit GIS',
        icon: MapPin,
        showBack: true,
      };
    }
    if (pathname === '/ai') {
      return {
        title: 'Asisten Cerdas INFRA-AI',
        subtitle: 'Konsultasi Data & Inventaris GIS',
        icon: Sparkles,
        showBack: true,
      };
    }
    if (pathname === '/segments') {
      return {
        title: 'Audit & Penataan Kabel',
        subtitle: 'Monitoring Kabel Semrawut & Bahaya',
        icon: ShieldAlert,
        showBack: false,
      };
    }
    return {
      title: 'INFRA-MAP GIS',
      subtitle: 'Kota Lubuklinggau',
      icon: Radio,
      showBack: false,
    };
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      if (pathname.startsWith('/poles/new') || pathname.startsWith('/poles/')) {
        router.push('/map');
      } else {
        router.push('/');
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gis:hard-refresh'));
    }
    router.refresh();
    try {
      await Promise.all([
        fetch('/api/poles', { cache: 'no-store' }),
        fetch('/api/dashboard', { cache: 'no-store' }),
      ]);
    } catch (_) {}
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const { viewMode, toggleViewMode, isFullscreen, toggleFullscreen } = useViewMode();
  const meta = getHeaderMeta();
  const Icon = meta.icon;

  return (
    <header className="sticky top-0 w-full z-30 bg-slate-950/95 backdrop-blur-xl text-white shadow-[0_4px_20px_rgba(0,0,0,0.35)] border-b border-slate-800/80 select-none flex-shrink-0">
      <div className={`px-3 sm:px-4 py-2 flex items-center justify-between gap-2.5 transition-all duration-300 ${viewMode === 'DESKTOP' ? 'w-full max-w-7xl mx-auto' : 'max-w-md mx-auto lg:w-full lg:max-w-7xl'}`}>
        {/* Left Side: Back Button OR Brand Emblem + Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          {meta.showBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 flex items-center justify-center text-slate-200 hover:text-white border border-slate-700/80 transition-all flex-shrink-0 cursor-pointer shadow-xs"
              aria-label="Kembali ke Beranda"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : (
            <Link
              href="/"
              className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center shadow-md flex-shrink-0 border border-slate-700/60 hover:scale-105 transition-transform"
            >
              <img
                src="/images/app-logo.png"
                alt="Logo GIS Lubuklinggau"
                className="w-full h-full object-contain rounded-md"
              />
            </Link>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-[13px] font-black tracking-tight text-white truncate uppercase font-mono leading-tight">
                {meta.title}
              </h1>
              {pathname === '/' && (
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 text-[9px] font-bold font-mono border border-blue-500/30">
                  PRO
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate leading-none mt-0.5">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* Right Side: Desktop Mode Toggle, Fullscreen, Reload/Refresh Button & Active User */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Desktop Widescreen / Mobile Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleViewMode}
            className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-[10.5px] font-bold transition-all cursor-pointer ${
              viewMode === 'DESKTOP'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30 ring-1 ring-blue-400/40'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white'
            }`}
            title={
              viewMode === 'DESKTOP'
                ? 'Mode Desktop Aktif (Layar Lebar) - Klik untuk Mode Mobile'
                : 'Buka Ukuran Desktop Penuh (Layar Lebar & Pas)'
            }
          >
            {viewMode === 'DESKTOP' ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-blue-200" />
                <span className="hidden sm:inline">Mobile View</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Desktop</span>
              </>
            )}
          </button>

          {/* Fullscreen F11 Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-7 h-7 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-90 flex items-center justify-center text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer"
            title={isFullscreen ? 'Keluar dari Layar Penuh' : 'Layar Penuh (Fullscreen)'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Reload / Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-7 h-7 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-90 flex items-center justify-center text-slate-300 hover:text-white border border-slate-700/80 transition-all cursor-pointer disabled:opacity-50"
            title="Muat Ulang / Refresh Data"
            aria-label="Refresh Halaman"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`}
            />
          </button>

          {/* Active User Avatar Chip */}
          {user && (
            <Link
              href="/profile"
              className="flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-full text-[10.5px] text-slate-200 font-bold backdrop-blur-md transition-all active:scale-95 group"
              title={`Akun Aktif: ${user.name} (${user.roleLabel}) - Buka Halaman Profil`}
            >
              <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center text-[10px] font-black shadow-xs">
                {user.avatar || user.name.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[80px] truncate text-[10px] text-slate-300 group-hover:text-white transition-colors">
                {user.name.split(' ')[0]}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
