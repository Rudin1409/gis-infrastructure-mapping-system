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
    <header className="sticky top-0 w-full z-30 bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#3b82f6] text-white shadow-[0_2px_12px_rgba(30,64,175,0.2)] border-b border-blue-400/20 select-none flex-shrink-0">
      <div className={`px-3.5 py-2 flex items-center justify-between gap-2 transition-all duration-300 ${viewMode === 'DESKTOP' ? 'w-full max-w-7xl mx-auto' : 'max-w-md mx-auto lg:w-full lg:max-w-7xl'}`}>
        {/* Left Side: Back Button OR Brand Emblem + Title */}
        <div className="flex items-center gap-2 min-w-0">
          {meta.showBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white border border-white/20 transition-all flex-shrink-0 cursor-pointer"
              aria-label="Kembali ke Beranda"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-white p-0.5 flex items-center justify-center shadow-md flex-shrink-0 border border-blue-200">
              <img
                src="/images/app-logo.png"
                alt="Logo GIS Lubuklinggau"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
          )}

          <div className="min-w-0">
            <h1 className="text-xs font-black tracking-tight text-white truncate font-mono uppercase leading-tight">
              {meta.title}
            </h1>
            <p className="text-[10px] text-blue-100 font-medium truncate leading-none mt-0.5">
              {meta.subtitle}
            </p>
          </div>
        </div>

        {/* Right Side: Desktop Mode Toggle, Fullscreen, Reload/Refresh Button & Active User */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Desktop Widescreen / Mobile Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleViewMode}
            className={`px-2 py-1 rounded-xl border flex items-center gap-1 text-[10px] font-bold transition-all cursor-pointer ${
              viewMode === 'DESKTOP'
                ? 'bg-white text-blue-700 border-white shadow-md'
                : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
            }`}
            title={
              viewMode === 'DESKTOP'
                ? 'Mode Desktop Aktif (Layar Lebar) - Klik untuk Mode Mobile'
                : 'Buka Ukuran Desktop Penuh (Layar Lebar & Pas)'
            }
          >
            {viewMode === 'DESKTOP' ? (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </>
            )}
          </button>

          {/* Fullscreen F11 Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 flex items-center justify-center text-white border border-white/20 transition-all cursor-pointer"
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
            className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 active:scale-90 flex items-center justify-center text-white border border-white/20 transition-all cursor-pointer disabled:opacity-50"
            title="Muat Ulang / Refresh Data"
            aria-label="Refresh Halaman"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-200' : 'text-white'}`}
            />
          </button>

          {/* Active User Avatar Chip */}
          {user && (
            <Link
              href="/profile"
              className="flex items-center gap-1 px-2 py-0.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-full text-[10px] text-white font-bold backdrop-blur-md transition-all active:scale-95"
              title={`Akun Aktif: ${user.name} (${user.roleLabel})`}
            >
              <span>{user.avatar || '👤'}</span>
              <span className="max-w-[70px] truncate text-[9px]">
                {user.role?.includes('ADMIN') ? 'Kominfo' : 'Surveyor'}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
