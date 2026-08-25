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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
        title: 'Data Inventaris Tiang',
        subtitle: 'Master Data Infrastruktur',
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
    if (pathname === '/segments') {
      return {
        title: 'Topologi Jalur Kabel',
        subtitle: 'Koneksi Antar Node Jaringan',
        icon: Cable,
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
    if (pathname.startsWith('/poles/new')) {
      router.push('/');
    } else if (pathname.startsWith('/poles/')) {
      router.push('/poles');
    } else {
      router.push('/');
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  const meta = getHeaderMeta();
  const Icon = meta.icon;

  return (
    <header className="sticky top-0 w-full z-30 bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#3b82f6] text-white shadow-[0_2px_12px_rgba(30,64,175,0.2)] border-b border-blue-400/20 select-none flex-shrink-0">
      <div className="px-3.5 py-2 flex items-center justify-between gap-2 max-w-md mx-auto">
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

        {/* Right Side: Reload/Refresh Button & Active Agency Avatar */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
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
              <span className="max-w-[65px] truncate text-[9px]">
                {user.role?.includes('BAPENDA')
                  ? 'Bapenda'
                  : user.role?.includes('KOMINFO')
                  ? 'Kominfo'
                  : 'Surveyor'}
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
