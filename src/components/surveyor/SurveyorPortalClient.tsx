'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Pole } from '@/types/pole';
import { useSupabaseRealtimePoles } from '@/hooks/useSupabaseRealtimePoles';
import {
  Map,
  Plus,
  PlusCircle,
  MapPin,
  Clock,
  Cable,
  Database,
  Sparkles,
  ShieldAlert,
  Lightbulb,
  Camera,
  Monitor,
  Navigation,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface SurveyorPortalClientProps {
  initialPoles: Pole[];
}

export default function SurveyorPortalClient({ initialPoles }: SurveyorPortalClientProps) {
  const {
    poles: livePoles,
    isLoading,
    isSyncing,
    refreshPoles,
  } = useSupabaseRealtimePoles(initialPoles);

  // Today string in Indonesian time (WIB = UTC+7)
  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  }, []);

  // Compute Today's Survey Count
  const todayCount = useMemo(() => {
    return livePoles.filter((pole) => {
      const sDate = pole.surveyDate || (pole.createdAt ? pole.createdAt.split('T')[0] : '');
      return sDate === todayStr;
    }).length;
  }, [livePoles, todayStr]);

  // Compute Problematic/Hazard Poles
  const hazardPolesCount = useMemo(() => {
    return livePoles.filter(
      (p) =>
        p.condition === 'NEEDS_REPAIR' ||
        p.condition === 'DAMAGED' ||
        p.isTilted ||
        p.isHazardous ||
        p.isMessyCable ||
        p.isLowCable
    ).length;
  }, [livePoles]);

  // 5 Most Recent Surveys
  const recentPoles = useMemo(() => {
    return [...livePoles].reverse().slice(0, 5);
  }, [livePoles]);

  const surveyorMenus = [
    {
      label: 'Survey Baru',
      desc: 'GPS & Kamera',
      href: '/poles/new',
      icon: PlusCircle,
      gradient: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/30',
      isHot: true,
    },
    {
      label: 'Peta GIS',
      desc: 'Sebaran Kota',
      href: '/map',
      icon: Map,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/30',
    },
    {
      label: 'Data Tiang',
      desc: `${livePoles.length} Terdata`,
      href: '/poles',
      icon: Database,
      gradient: 'from-cyan-500 to-blue-600',
      shadow: 'shadow-cyan-500/30',
    },
    {
      label: 'Penataan Kabel',
      desc: 'Audit & Bahaya',
      href: '/segments',
      icon: ShieldAlert,
      gradient: 'from-amber-500 to-orange-600',
      shadow: 'shadow-amber-500/30',
    },
    {
      label: 'Lampu PJU',
      desc: 'Lampu Pemkot',
      href: '/poles?provider=PRV_PJU_PEMKOT',
      icon: Lightbulb,
      gradient: 'from-yellow-500 to-amber-600',
      shadow: 'shadow-yellow-500/30',
    },
    {
      label: 'Bawah Tanah',
      desc: 'Ducting & Riser',
      href: '/segments?filter=UNDERGROUND',
      icon: Cable,
      gradient: 'from-teal-500 to-cyan-600',
      shadow: 'shadow-teal-500/30',
    },
    {
      label: '8 Kecamatan',
      desc: 'Wilayah Kota',
      href: '/districts',
      icon: MapPin,
      gradient: 'from-purple-500 to-indigo-600',
      shadow: 'shadow-purple-500/30',
    },
    {
      label: 'Web Kantor',
      desc: 'Mode Desktop',
      href: '/',
      icon: Monitor,
      gradient: 'from-slate-700 to-slate-900',
      shadow: 'shadow-slate-600/30',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pb-24 text-slate-100 font-sans">
      {/* ============================================================ */}
      {/* 1. ROYAL BLUE VIBRANT HERO (UNPIX MOBILE STYLE)             */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden bg-gradient-to-b from-blue-700 via-blue-800 to-indigo-950 px-5 pt-8 pb-16 border-b border-blue-500/30">
        {/* Glow ambient shapes */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 rounded-full bg-indigo-500/25 blur-3xl pointer-events-none" />

        <div className="max-w-md mx-auto relative z-10 space-y-4">
          {/* Top Status Row */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[11px] font-semibold backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>GPS Satelit Siap</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshPoles}
                disabled={isSyncing}
                className="p-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 border border-blue-400/30 text-blue-200 hover:text-white transition-all cursor-pointer"
                title="Refresh Realtime Supabase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>

              <Link
                href="/"
                className="text-[11px] font-bold text-blue-200 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600/30 border border-blue-400/30 transition-all"
              >
                <Monitor className="w-3 h-3" />
                <span>Web Kantor</span>
              </Link>
            </div>
          </div>

          {/* Greeting */}
          <div className="space-y-1">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Halo, Tim Surveyor! 👋
            </h1>
            <p className="text-xs text-blue-200/90 leading-relaxed font-medium">
              Aplikasi Lapangan Pemetaan GIS Tiang Kota Lubuklinggau
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. PRIMARY ACTION & SUMMARY CARD (OVERLAPPING BLUE HERO)    */}
      {/* ============================================================ */}
      <div className="max-w-md mx-auto px-4 -mt-10 relative z-20 space-y-4">
        {/* Big Survey Action Button (Thumb-friendly) */}
        <Link
          href="/poles/new"
          className="w-full p-4 rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-600 to-cyan-500 text-white shadow-[0_12px_30px_rgba(37,99,235,0.45)] border border-blue-400/40 flex items-center justify-between group active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner group-hover:rotate-12 transition-transform duration-300">
              <Camera className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight block">
                Mulai Survey Tiang Baru
              </span>
              <span className="text-xs text-blue-100">
                Kunci Koordinat GPS &amp; Foto Lapangan
              </span>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-white text-blue-700 flex items-center justify-center shadow font-bold">
            <Plus className="w-5 h-5 stroke-[3]" />
          </div>
        </Link>

        {/* Quick Mini Stats Container with Skeleton */}
        {isLoading ? (
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-4 border border-slate-800 shadow-xl grid grid-cols-3 gap-2 text-center animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-2 bg-slate-800/50 rounded-2xl border border-slate-700/50 flex flex-col items-center justify-center space-y-2">
                <div className="h-2.5 w-12 bg-slate-700 rounded-full" />
                <div className="h-5 w-8 bg-slate-600 rounded-md" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-4 border border-slate-800 shadow-xl grid grid-cols-3 gap-2 text-center">
            <Link href="/poles" className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-2xl border border-slate-700/50 transition-colors">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Total Tiang</span>
              <span className="text-lg font-black text-white font-mono">{livePoles.length}</span>
            </Link>

            <div className="p-2 bg-slate-800/50 rounded-2xl border border-slate-700/50">
              <span className="text-[10px] text-emerald-400 font-semibold uppercase block">Hari Ini</span>
              <span className="text-lg font-black text-emerald-400 font-mono">+{todayCount}</span>
            </div>

            <Link href="/segments" className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-2xl border border-slate-700/50 transition-colors">
              <span className="text-[10px] text-amber-400 font-semibold uppercase block">Perlu Cek</span>
              <span className="text-lg font-black text-amber-400 font-mono">{hazardPolesCount}</span>
            </Link>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. FAST MENU GRID (8 SQUIRCLE ICONS - UNPIX STYLE)          */}
      {/* ============================================================ */}
      <div className="max-w-md mx-auto px-4 mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Menu Cepat Lapangan</span>
          </h2>
          <span className="text-[11px] text-slate-400">Pilih Aksi</span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-4 gap-2.5">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 animate-pulse"
              >
                <div className="w-11 h-11 rounded-2xl bg-slate-800" />
                <div className="h-2.5 w-10 bg-slate-700 rounded-full" />
                <div className="h-2 w-8 bg-slate-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2.5">
            {surveyorMenus.map((menu, idx) => {
              const Icon = menu.icon;
              return (
                <Link
                  key={idx}
                  href={menu.href}
                  className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 active:scale-95 transition-all text-center group relative"
                >
                  {menu.isHot && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-blue-500 text-white font-black text-[8px] rounded-full uppercase shadow">
                      Hot
                    </span>
                  )}

                  <div
                    className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${menu.gradient} flex items-center justify-center text-white shadow-lg ${menu.shadow} mb-1.5 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>

                  <span className="text-[11px] font-bold text-slate-200 group-hover:text-white line-clamp-1 leading-tight">
                    {menu.label}
                  </span>
                  <span className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">
                    {menu.desc}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. RADAR TIANG TERDEKAT & AKTIVITAS LAPANGAN                */}
      {/* ============================================================ */}
      <div className="max-w-md mx-auto px-4 mt-6 space-y-4">
        {/* Radar Map Direct CTA */}
        <div className="bg-slate-900/90 rounded-3xl p-4 border border-slate-800 shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Peta Mapping Lapangan</h3>
              <p className="text-[11px] text-slate-400">Lihat persebaran tiang di sekitarmu</p>
            </div>
          </div>

          <Link
            href="/map"
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1"
          >
            <span>Buka Peta</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Survey Terakhir Hari Ini with Skeleton */}
        <div className="bg-slate-900/90 rounded-3xl p-4 border border-slate-800 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Data Input Lapangan Terkini</span>
            </h3>
            <Link href="/poles" className="text-[11px] font-bold text-blue-400 hover:underline">
              Semua ({livePoles.length}) &rarr;
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-2.5 py-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-2xl bg-slate-800/40 animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-700" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 bg-slate-700 rounded-full" />
                      <div className="h-2.5 w-36 bg-slate-800 rounded-full" />
                    </div>
                  </div>
                  <div className="h-5 w-14 bg-slate-700 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentPoles.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              Belum ada data tiang yang disurvei.
            </p>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {recentPoles.map((pole) => (
                <Link
                  key={pole.id}
                  href={`/poles/${pole.id}`}
                  className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/40 px-1 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0">
                      {pole.id.replace('LL-', '#')}
                    </div>

                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate group-hover:text-blue-400 transition-colors">
                        {pole.road || pole.poleCode || pole.id}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {pole.providerName || pole.providerId} &bull; {pole.kelurahan}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        pole.condition === 'GOOD'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : pole.condition === 'NEEDS_REPAIR'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {pole.condition === 'GOOD'
                        ? 'Baik'
                        : pole.condition === 'NEEDS_REPAIR'
                        ? 'Miring'
                        : 'Rusak'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
