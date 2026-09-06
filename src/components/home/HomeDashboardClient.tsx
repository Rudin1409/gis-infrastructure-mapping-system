'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useViewMode } from '@/context/ViewModeContext';
import { Pole } from '@/types/pole';
import { DEFAULT_PROVIDERS, resolveProviderInfo } from '@/config/providers';
import { DashboardStats } from '@/services/DashboardService';
import { useSupabaseRealtimePoles } from '@/hooks/useSupabaseRealtimePoles';
import {
  Map,
  Plus,
  PlusCircle,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  ArrowRight,
  MapPin,
  Clock,
  Cable,
  Database,
  Sparkles,
  ShieldAlert,
  Camera,
  Navigation,
  ChevronRight,
  Search,
  Lightbulb,
  BarChart3,
  RefreshCw,
  Wifi,
  ShieldCheck,
  TrendingUp,
  Layers,
  SlidersHorizontal,
  Compass,
  Radio,
  Share2,
  Check,
  ArrowUpRight,
  ExternalLink,
  Info,
  ChevronDown,
  CircleDot,
  Zap,
} from 'lucide-react';

interface HomeDashboardClientProps {
  stats: DashboardStats;
  allPoles: Pole[];
}

export default function HomeDashboardClient({ stats, allPoles }: HomeDashboardClientProps) {
  const { user } = useAuth();
  const { viewMode } = useViewMode();
  const isDesktop = viewMode === 'DESKTOP';
  const currentUser = user || {
    name: 'Petugas',
    role: 'SURVEYOR',
    roleLabel: 'Petugas Survei',
    team: 'KOMINFO',
    agency: '',
    id: '',
    email: '',
  };

  const {
    poles: livePoles,
    isLoading,
    isSyncing,
    refreshPoles,
  } = useSupabaseRealtimePoles(allPoles);

  // Time & Greeting Logic
  const [greeting, setGreeting] = useState('Selamat Bertugas');
  const [timeStr, setTimeStr] = useState('');
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PROVIDERS' | 'DISTRICTS'>('OVERVIEW');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 4 && hour < 11) setGreeting('Selamat Pagi');
      else if (hour >= 11 && hour < 15) setGreeting('Selamat Siang');
      else if (hour >= 15 && hour < 18.5) setGreeting('Selamat Sore');
      else setGreeting('Selamat Malam');

      setTimeStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Today string in Indonesian time (WIB = UTC+7)
  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  }, []);

  // Compute Today's Survey Count
  const todayCount = useMemo(() => {
    if (!Array.isArray(livePoles)) return 0;
    return livePoles.filter((pole) => {
      const sDate = pole.surveyDate
        ? String(pole.surveyDate)
        : pole.createdAt
          ? String(pole.createdAt).split('T')[0]
          : '';
      return sDate === todayStr;
    }).length;
  }, [livePoles, todayStr]);

  // Helper to format human-readable relative time
  const formatRelativeTime = (dateInput?: any, timeInput?: any): string => {
    if (!dateInput) return 'Baru saja';
    try {
      let d: Date;
      if (dateInput instanceof Date) {
        d = dateInput;
      } else {
        const str = String(dateInput);
        if (str.includes('T')) {
          d = new Date(str);
        } else if (timeInput) {
          d = new Date(`${str}T${String(timeInput)}`);
        } else {
          d = new Date(str);
        }
      }
      if (isNaN(d.getTime())) return String(dateInput);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      if (diffMs < 60000 && diffMs >= -300000) return 'Baru saja';
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60 && diffMins > 0) return `${diffMins} mnt lalu`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24 && diffHours > 0) return `${diffHours} jam lalu`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Kemarin';
      if (diffDays < 7 && diffDays > 0) return `${diffDays} hari lalu`;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return String(dateInput || 'Baru saja');
    }
  };

  // Compute Most Recent Surveys (Strictly Newest Timestamp First)
  const recentPoles = useMemo(() => {
    if (!Array.isArray(livePoles)) return [];
    return [...livePoles]
      .sort((a, b) => {
        const timeA = a?.createdAt
          ? new Date(a.createdAt).getTime()
          : a?.surveyDate
            ? new Date(a.surveyDate).getTime()
            : 0;
        const timeB = b?.createdAt
          ? new Date(b.createdAt).getTime()
          : b?.surveyDate
            ? new Date(b.surveyDate).getTime()
            : 0;
        if (timeB !== timeA) return timeB - timeA;
        return String(b?.id || '').localeCompare(String(a?.id || ''));
      })
      .slice(0, 6);
  }, [livePoles]);

  // Infrastructure Breakdown
  const infrastructureCounts = useMemo(() => {
    let fo = 0;
    let pju = 0;
    let pln = 0;
    let underground = 0;
    let good = 0;
    let repair = 0;
    let damaged = 0;
    let hazard = 0;

    livePoles.forEach((p) => {
      if (p.infrastructureCategory === 'PJU_MANDIRI' || p.providerId === 'PRV_PJU_PEMKOT') {
        pju++;
      } else if (
        p.infrastructureCategory === 'PLN_MURNI' ||
        p.providerId === 'PRV_PLN_DISTRIBUSI'
      ) {
        pln++;
      } else {
        fo++;
      }

      if (
        p.cableInstallationType === 'BAWAH_TANAH' ||
        p.cableInstallationType === 'TRANSISI_RISER'
      ) {
        underground++;
      }

      if (p.condition === 'GOOD') good++;
      else if (p.condition === 'NEEDS_REPAIR') repair++;
      else if (p.condition === 'DAMAGED') damaged++;

      if (
        p.isTilted ||
        p.isHazardous ||
        p.isMessyCable ||
        p.isLowCable ||
        p.isCorroded ||
        p.isObstructing ||
        p.condition === 'DAMAGED' ||
        p.condition === 'NEEDS_REPAIR'
      ) {
        hazard++;
      }
    });

    const total = livePoles.length || 1;
    const healthScore = Math.round((good / total) * 100);

    return { fo, pju, pln, underground, good, repair, damaged, hazard, healthScore };
  }, [livePoles]);

  // Compute Top Provider Distribution
  const sortedProviders = useMemo(() => {
    const providerCountMap: Record<
      string,
      { id: string; name: string; count: number; colorHex: string; code: string }
    > = {};

    DEFAULT_PROVIDERS.forEach((prov) => {
      providerCountMap[prov.id] = {
        id: prov.id,
        name: prov.name.replace(/^\d+\.\s*/, ''),
        count: 0,
        colorHex: prov.colorHex || '#3b82f6',
        code: prov.code,
      };
    });

    livePoles.forEach((pole) => {
      const provId = pole.providerId || 'UNKNOWN';
      if (providerCountMap[provId]) {
        providerCountMap[provId].count += 1;
      } else {
        providerCountMap[provId] = {
          id: provId,
          name: pole.providerName || provId,
          count: 1,
          colorHex: '#64748b',
          code: 'ISP',
        };
      }
    });

    return Object.values(providerCountMap)
      .filter((p) => p.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [livePoles]);

  // Compute Kecamatan Distribution
  const kecamatanDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    livePoles.forEach((p) => {
      if (p.kecamatan) {
        map[p.kecamatan] = (map[p.kecamatan] || 0) + 1;
      }
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [livePoles]);

  return (
    <div className="min-h-full pb-28 text-slate-800 font-sans space-y-5 animate-in fade-in duration-200">
      {/* ============================================================ */}
      {/* 1. TOP COMMAND BAR & USER HERO                               */}
      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* 1. TOP COMMAND BAR & USER HERO                               */}
      {/* ============================================================ */}
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-slate-950 via-[#0b1329] to-[#0d1e3d] text-white pt-4 pb-9 rounded-b-[36px] shadow-2xl shadow-black/40 border-b border-blue-900/30 ${isDesktop ? 'px-6' : 'px-4'}`}
      >
        {/* Spatial background accents */}
        <div className="absolute -top-12 right-0 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#33415510_1px,transparent_1px),linear-gradient(to_bottom,#33415510_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none opacity-30" />

        <div className="relative z-10 max-w-5xl mx-auto space-y-3.5">
          {/* Top Telemetry & Status Strip */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/70 text-[10.5px] font-mono text-slate-300 backdrop-blur-md shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-bold text-white tracking-wider">DISKOMINFOTIKSAN</span>
              <span className="text-slate-600">•</span>
              <span
                className={`text-slate-300 truncate ${isDesktop ? 'max-w-none' : 'max-w-[130px]'}`}
              >
                Kota Lubuklinggau
              </span>
            </div>

            <div className="flex items-center gap-2">
              {isSyncing ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-950/90 border border-blue-500/50 rounded-full text-[10px] text-blue-300 font-mono font-bold animate-pulse shadow-xs">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Syncing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 border border-slate-700/80 rounded-full text-[10px] text-emerald-400 font-mono font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>GPS Siap</span>
                </div>
              )}
            </div>
          </div>

          {/* User Welcome & Mission Statement */}
          <div
            className={`flex justify-between gap-3.5 pt-1 ${isDesktop ? 'flex-col md:flex-row md:items-end' : 'flex-col'}`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-blue-400 font-semibold mb-1 font-mono">
                <span className="bg-blue-950/80 border border-blue-800/50 px-2 py-0.5 rounded-md text-blue-300 font-bold">
                  {greeting}, {currentUser?.name ? currentUser.name.split(' ')[0] : 'Admin'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-sans">{timeStr}</span>
              </div>
              <h1
                className={`font-black text-white tracking-tight leading-tight mt-0.5 ${isDesktop ? 'text-xl sm:text-2xl' : 'text-xl'}`}
              >
                Pusat Kendali Spasial Infrastruktur
              </h1>
              <p className="text-xs text-slate-300/90 font-medium max-w-xl mt-1 leading-relaxed">
                Pemetaan tiang fiber optik, penerangan jalan umum (PJU), dan utilitas kabel Kota
                Lubuklinggau.
              </p>
            </div>

            {/* Quick Action Group (Never wrapping awkwardly) */}
            <div
              className={`flex items-center gap-2 sm:gap-2.5 flex-shrink-0 ${isDesktop ? 'w-full md:w-auto' : 'w-full'}`}
            >
              <Link
                href="/poles/new"
                className={`py-2.5 px-3.5 sm:px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-blue-600/35 flex items-center justify-center gap-2 transition-all border border-blue-400/30 cursor-pointer whitespace-nowrap min-w-0 ${isDesktop ? 'flex-1 md:flex-initial' : 'flex-1'}`}
              >
                <Plus className="w-4 h-4 stroke-[3] flex-shrink-0" />
                <span className="truncate">Input Survei GPS</span>
              </Link>

              <Link
                href="/map"
                className={`py-2.5 px-3.5 sm:px-4 bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-slate-200 hover:text-white font-bold text-xs rounded-2xl border border-slate-700/80 hover:border-slate-600 flex items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-md whitespace-nowrap min-w-0 shadow-md ${isDesktop ? 'flex-1 md:flex-initial' : 'flex-1'}`}
              >
                <Map className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="truncate">Buka Peta GIS</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`max-w-5xl mx-auto space-y-5 -mt-7 relative z-20 ${isDesktop ? 'px-6' : 'px-4'}`}
      >
        {/* ============================================================ */}
        {/* 2. SPATIAL TELEMETRY BENTO GRID                             */}
        {/* ============================================================ */}
        {isLoading ? (
          <div
            className={`grid gap-2.5 ${isDesktop ? 'grid-cols-2 md:grid-cols-4 md:gap-3' : 'grid-cols-2'}`}
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm animate-pulse space-y-2.5"
              >
                <div className="h-3 w-20 bg-slate-200 rounded-full" />
                <div className="h-7 w-16 bg-slate-300 rounded-lg" />
                <div className="h-2.5 w-24 bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`grid gap-2.5 ${isDesktop ? 'grid-cols-2 md:grid-cols-4 md:gap-3' : 'grid-cols-2'}`}
          >
            {/* Card 1: Total Tiang Terdata */}
            <Link
              href="/poles"
              className={`bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-[0_4px_20px_rgba(15,23,42,0.06)] hover:border-blue-300 hover:shadow-md transition-all group relative overflow-hidden ${isDesktop ? 'p-4' : 'p-3.5'}`}
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span
                  className={`font-mono font-bold uppercase tracking-wider text-slate-500 truncate ${isDesktop ? 'text-[10px]' : 'text-[9.5px]'}`}
                >
                  TOTAL ASET TIANG
                </span>
                <div className="w-6 h-6 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                  <Database className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5 min-w-0">
                <span
                  className={`font-black text-slate-900 font-mono tracking-tight group-hover:text-blue-600 transition-colors truncate ${isDesktop ? 'text-2xl' : 'text-xl'}`}
                >
                  {livePoles.length.toLocaleString('id-ID')}
                </span>
                <span className="text-[10.5px] font-bold text-slate-500 flex-shrink-0">Titik</span>
              </div>
              <div
                className={`mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500 ${isDesktop ? 'text-[10px]' : 'text-[9.5px]'}`}
              >
                <span className="truncate">🌐 FO: {infrastructureCounts.fo}</span>
                <span className="truncate">💡 PJU: {infrastructureCounts.pju}</span>
              </div>
            </Link>

            {/* Card 2: Survei Hari Ini */}
            <div
              className={`bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-[0_4px_20px_rgba(15,23,42,0.06)] relative overflow-hidden ${isDesktop ? 'p-4' : 'p-3.5'}`}
            >
              <div className="flex items-center justify-between text-emerald-600 mb-1">
                <span
                  className={`font-mono font-bold uppercase tracking-wider text-emerald-700 truncate ${isDesktop ? 'text-[10px]' : 'text-[9.5px]'}`}
                >
                  SURVEI HARI INI
                </span>
                <div className="w-6 h-6 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5 min-w-0">
                <span
                  className={`font-black text-emerald-700 font-mono tracking-tight truncate ${isDesktop ? 'text-2xl' : 'text-xl'}`}
                >
                  +{todayCount}
                </span>
                <span className="text-[10.5px] font-bold text-slate-500 flex-shrink-0">
                  Titik baru
                </span>
              </div>
              <div
                className={`mt-2 pt-2 border-t border-slate-100 flex items-center justify-between ${isDesktop ? 'text-[10px]' : 'text-[9.5px]'}`}
              >
                <span className="text-emerald-700 font-bold flex items-center gap-1 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
                <span
                  className={`text-slate-400 font-mono truncate ${isDesktop ? 'text-[10px]' : 'text-[9px]'}`}
                >
                  {todayStr}
                </span>
              </div>
            </div>

            {/* Card 3: Skor Kesehatan & Keamanan */}
            <Link
              href="/segments"
              className={`bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-[0_4px_20px_rgba(15,23,42,0.06)] hover:border-amber-300 hover:shadow-md transition-all group relative overflow-hidden ${isDesktop ? 'p-4' : 'p-3.5'}`}
            >
              <div className="flex items-center justify-between text-amber-600 mb-1">
                <span
                  className={`font-mono font-bold uppercase tracking-wider text-amber-700 truncate ${isDesktop ? 'text-[10px]' : 'text-[9.5px]'}`}
                >
                  KONDISI FISIK
                </span>
                <div className="w-6 h-6 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5 min-w-0">
                <span
                  className={`font-black text-slate-900 font-mono tracking-tight truncate ${isDesktop ? 'text-2xl' : 'text-xl'}`}
                >
                  {infrastructureCounts.healthScore}%
                </span>
                <span className="text-[10.5px] font-bold text-emerald-600 flex-shrink-0">
                  Kondisi Baik
                </span>
              </div>
              <div
                className={`mt-2 pt-2 border-t border-slate-100 flex items-center justify-between ${isDesktop ? 'text-[10px]' : 'text-[9.5px]'}`}
              >
                <span className="text-amber-700 font-bold truncate">
                  ⚠️ {infrastructureCounts.hazard} Perlu Audit
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
              </div>
            </Link>

            {/* Card 4: Cakupan 8 Kecamatan */}
            <Link
              href="/districts"
              className={`bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-[0_4px_20px_rgba(15,23,42,0.06)] hover:border-purple-300 hover:shadow-md transition-all group relative overflow-hidden ${isDesktop ? 'p-4' : 'p-3.5'}`}
            >
              <div className="flex items-center justify-between text-purple-600 mb-1">
                <span
                  className={`font-mono font-bold uppercase tracking-wider text-purple-700 truncate ${isDesktop ? 'text-[10px]' : 'text-[9.5px]'}`}
                >
                  CAKUPAN WILAYAH
                </span>
                <div className="w-6 h-6 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5 min-w-0">
                <span
                  className={`font-black text-slate-900 font-mono tracking-tight group-hover:text-purple-600 transition-colors truncate ${isDesktop ? 'text-2xl' : 'text-xl'}`}
                >
                  8 Kecamatan
                </span>
              </div>
              <div
                className={`mt-2 pt-2 border-t border-slate-100 flex items-center justify-between ${isDesktop ? 'text-[10px]' : 'text-[9.5px]'}`}
              >
                <span className="text-purple-700 font-bold truncate">72 Kelurahan</span>
                <span
                  className={`text-slate-400 font-mono flex-shrink-0 ${isDesktop ? 'text-[10px]' : 'text-[9px]'}`}
                >
                  100% Aktif
                </span>
              </div>
            </Link>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. QUICK SEARCH BAR                                          */}
        {/* ============================================================ */}
        <form action="/poles" method="GET" className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input
            type="text"
            name="q"
            placeholder="Cari cepat ID tiang (contoh: LLG-T1-TJ-001), nama jalan, atau provider..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 shadow-[0_2px_12px_rgba(15,23,42,0.04)] focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all font-medium"
          />
        </form>

        {/* ============================================================ */}
        {/* 4. WORKFLOW MODULES & QUICK ACCESS HUBS                      */}
        {/* ============================================================ */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
              <span>Modul &amp; Menu Kerja Lapangan</span>
            </h2>
            <span className="text-[10.5px] text-slate-400 font-medium">
              Terintegrasi DISKOMINFOTIKSAN
            </span>
          </div>

          <div
            className={`grid gap-2 sm:gap-2.5 ${isDesktop ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}
          >
            {/* 1. Input Survei GPS */}
            <Link
              href="/poles/new"
              className="min-h-[124px] p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                  <PlusCircle className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[9px] rounded-full uppercase">
                  Utama
                </span>
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                  Survei GPS Baru
                </h3>
                <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wide mt-1">
                  GPS + Foto + Jalan
                </p>
              </div>
            </Link>

            {/* 2. Peta Spasial GIS */}
            <Link
              href="/map"
              className="min-h-[124px] p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-emerald-400 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                  <Map className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[9px] rounded-full">
                  Satelit
                </span>
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Peta Spasial Kota
                </h3>
                <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wide mt-1">
                  Titik + Tim Aktif
                </p>
              </div>
            </Link>

            {/* 3. Penataan Kabel & Bahaya */}
            <Link
              href="/segments"
              className="min-h-[124px] p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-amber-400 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all shadow-xs">
                  <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
                </div>
                {infrastructureCounts.hazard > 0 && (
                  <span className="px-2 py-0.5 bg-amber-500 text-white font-bold text-[9px] rounded-full animate-pulse shadow-xs">
                    {infrastructureCounts.hazard} Titik
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                  Audit Penataan Kabel
                </h3>
                <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wide mt-1">
                  Bahaya + Kabel
                </p>
              </div>
            </Link>

            {/* 4. Database Tiang & Filter */}
            <Link
              href="/poles"
              className="min-h-[124px] p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-cyan-400 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-xs">
                  <Database className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold text-[9px] rounded-full font-mono">
                  {livePoles.length} Data
                </span>
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 group-hover:text-cyan-600 transition-colors">
                  Daftar Data Tiang
                </h3>
                <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wide mt-1">
                  Cari + Ekspor
                </p>
              </div>
            </Link>

            {/* 5. Lampu PJU Pemkot */}
            <Link
              href="/poles?provider=PRV_PJU_PEMKOT"
              className="min-h-[124px] p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-yellow-400 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-yellow-50 text-yellow-700 flex items-center justify-center group-hover:bg-yellow-600 group-hover:text-white transition-all shadow-xs">
                  <Lightbulb className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="px-2 py-0.5 bg-yellow-50 text-yellow-800 border border-yellow-200 font-bold text-[9px] rounded-full">
                  {infrastructureCounts.pju} PJU
                </span>
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 group-hover:text-yellow-700 transition-colors">
                  Penerangan Jalan (PJU)
                </h3>
                <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wide mt-1">
                  Lampu + Daya
                </p>
              </div>
            </Link>

            {/* 6. Katalog 20+ Provider & Marka */}
            <Link
              href="/providers"
              className="min-h-[124px] p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-indigo-400 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
                  <Building2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[9px] rounded-full">
                  20+ Brand
                </span>
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                  Katalog Provider &amp; Marka
                </h3>
                <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wide mt-1">
                  Warna + Brand
                </p>
              </div>
            </Link>

            {/* 7. Master 8 Kecamatan & Kelurahan */}
            <Link
              href="/districts"
              className="min-h-[124px] p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-purple-400 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
                  <MapPin className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[9px] rounded-full">
                  Kelola
                </span>
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 group-hover:text-purple-600 transition-colors">
                  Wilayah 8 Kecamatan
                </h3>
                <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wide mt-1">
                  72 Kelurahan
                </p>
              </div>
            </Link>

            {/* 8. Jaringan Kabel Bawah Tanah */}
            <Link
              href="/segments?filter=UNDERGROUND"
              className="min-h-[124px] p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-teal-400 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all shadow-xs">
                  <Cable className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 font-bold text-[9px] rounded-full font-mono">
                  {infrastructureCounts.underground} Titik
                </span>
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 group-hover:text-teal-700 transition-colors">
                  Ducting Bawah Tanah
                </h3>
                <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wide mt-1">
                  Tanam + Riser
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. LIVE SPATIAL RADAR & CITY ANALYTICS                       */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-4">
          <div
            className={`flex justify-between gap-2.5 pb-3 border-b border-slate-100 ${isDesktop ? 'flex-col sm:flex-row sm:items-center' : 'flex-col'}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Analisis Sebaran &amp; Pangsa Infrastruktur
                </h3>
                <p className="text-[11px] text-slate-500">
                  Visualisasi sebaran kepemilikan aset di seluruh Kota Lubuklinggau
                </p>
              </div>
            </div>

            {/* Sub-Tab Navigation */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('OVERVIEW')}
                className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'OVERVIEW'
                    ? 'bg-white text-blue-700 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kategori Aset
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PROVIDERS')}
                className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'PROVIDERS'
                    ? 'bg-white text-blue-700 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Top Provider ({sortedProviders.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('DISTRICTS')}
                className={`py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'DISTRICTS'
                    ? 'bg-white text-blue-700 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Per Kecamatan
              </button>
            </div>
          </div>

          {/* VIEW A: Kategori Aset */}
          {activeTab === 'OVERVIEW' && (
            <div
              className={`grid gap-2.5 sm:gap-3 pt-1 animate-in fade-in ${isDesktop ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}
            >
              {/* FO / Internet */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between text-indigo-900">
                  <span className="text-[11px] font-bold flex items-center gap-1.5">
                    <span>🌐</span>
                    <span>Provider FO &amp; Internet</span>
                  </span>
                  <span className="font-mono font-black text-sm">{infrastructureCounts.fo}</span>
                </div>
                <div className="w-full bg-indigo-200/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(infrastructureCounts.fo / (livePoles.length || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-indigo-700 font-medium block">
                  {Math.round((infrastructureCounts.fo / (livePoles.length || 1)) * 100)}% dari
                  total aset kota
                </span>
              </div>

              {/* PJU Pemkot */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-2">
                <div className="flex items-center justify-between text-amber-900">
                  <span className="text-[11px] font-bold flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Lampu Jalan (PJU Pemkot)</span>
                  </span>
                  <span className="font-mono font-black text-sm">{infrastructureCounts.pju}</span>
                </div>
                <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-600 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(infrastructureCounts.pju / (livePoles.length || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-amber-700 font-medium block">
                  {Math.round((infrastructureCounts.pju / (livePoles.length || 1)) * 100)}% dari
                  total aset kota
                </span>
              </div>

              {/* Jaringan PLN */}
              <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-2">
                <div className="flex items-center justify-between text-sky-900">
                  <span className="text-[11px] font-bold flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Distribusi Listrik PLN</span>
                  </span>
                  <span className="font-mono font-black text-sm">{infrastructureCounts.pln}</span>
                </div>
                <div className="w-full bg-sky-200/60 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-600 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(infrastructureCounts.pln / (livePoles.length || 1)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-sky-700 font-medium block">
                  {Math.round((infrastructureCounts.pln / (livePoles.length || 1)) * 100)}% dari
                  total aset kota
                </span>
              </div>
            </div>
          )}

          {/* VIEW B: Top Provider Ranking */}
          {activeTab === 'PROVIDERS' && (
            <div className="space-y-3 pt-1 animate-in fade-in">
              {sortedProviders.slice(0, 5).map((prov, idx) => {
                const pct = Math.round((prov.count / (livePoles.length || 1)) * 100);
                return (
                  <div key={prov.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-4 text-center font-mono font-bold text-slate-400 text-[10px]">
                          #{idx + 1}
                        </span>
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: prov.colorHex }}
                        />
                        <span className="font-bold text-slate-800 truncate text-[11px]">
                          {prov.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="font-mono font-bold text-slate-900 text-[11px]">
                          {prov.count} Tiang
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(pct, 4)}%`,
                          backgroundColor: prov.colorHex,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 text-right">
                <Link
                  href="/providers"
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                >
                  <span>Buka Semua Analisis Provider</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* VIEW C: Per Kecamatan */}
          {activeTab === 'DISTRICTS' && (
            <div
              className={`grid gap-2.5 pt-1 animate-in fade-in ${isDesktop ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}
            >
              {kecamatanDistribution.map(([kecName, count]) => {
                const pct = Math.round((count / (livePoles.length || 1)) * 100);
                return (
                  <Link
                    key={kecName}
                    href={`/poles?kecamatan=${encodeURIComponent(kecName)}`}
                    className="p-3 bg-slate-50 hover:bg-purple-50/60 rounded-2xl border border-slate-200/80 hover:border-purple-300 transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="text-xs font-black text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                        {kecName}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {pct}% dari total kota
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-mono font-black text-slate-800 group-hover:text-purple-700">
                        {count} Tiang
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 6. CHRONOLOGICAL RECENT SURVEY TELEMETRY STREAM             */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-[13px] font-black text-slate-900 uppercase tracking-wider">
                    Aktivitas Survei Terkini
                  </h3>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9.5px] font-bold font-mono border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                    Real-time
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Data koordinat, foto fisik, dan kondisi tiang yang baru diinput
                </p>
              </div>
            </div>

            <Link
              href="/poles"
              className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors flex-shrink-0"
            >
              <span>Lihat Semua ({livePoles.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentPoles.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Belum ada data survei yang tercatat di database.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPoles.map((pole) => {
                const cleanProvider = String(
                  pole.providerName || pole.providerId || 'Provider'
                ).replace(/^\d+\.\s*/, '');
                const createdAtStr = pole.createdAt ? String(pole.createdAt) : '';
                const surveyDateStr = pole.surveyDate ? String(pole.surveyDate) : '';
                const isNewToday = Boolean(
                  (surveyDateStr && surveyDateStr === todayStr) ||
                    (createdAtStr && createdAtStr.startsWith(todayStr))
                );
                const relativeTime = formatRelativeTime(pole.createdAt, pole.surveyTime);

                return (
                  <Link
                    key={pole.id}
                    href={`/poles/${pole.id}`}
                    className="py-3 px-2 sm:px-2.5 -mx-2 rounded-2xl hover:bg-slate-50/90 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Photo Thumbnail or Themed Infrastructure Icon */}
                      {pole.photoUrl ? (
                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 shadow-2xs group-hover:border-blue-300 transition-colors">
                          <img
                            src={pole.photoUrl}
                            alt={pole.poleCode || pole.id}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                            onError={(e) => {
                              // Hide broken image and fallback to container icon
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-[8px]">
                            <Camera className="w-2.5 h-2.5" />
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 border transition-all ${
                            pole.infrastructureCategory === 'PJU_MANDIRI' ||
                            pole.providerId === 'PRV_PJU_PEMKOT'
                              ? 'bg-amber-50 text-amber-600 border-amber-200 group-hover:bg-amber-100/70'
                              : pole.infrastructureCategory === 'PLN_MURNI' ||
                                  pole.providerId === 'PRV_PLN_DISTRIBUSI'
                                ? 'bg-sky-50 text-sky-600 border-sky-200 group-hover:bg-sky-100/70'
                                : 'bg-blue-50 text-blue-600 border-blue-200 group-hover:bg-blue-100/70'
                          }`}
                        >
                          {pole.infrastructureCategory === 'PJU_MANDIRI' ||
                          pole.providerId === 'PRV_PJU_PEMKOT' ? (
                            <Lightbulb className="w-5 h-5" />
                          ) : pole.infrastructureCategory === 'PLN_MURNI' ||
                            pole.providerId === 'PRV_PLN_DISTRIBUSI' ? (
                            <Zap className="w-5 h-5" />
                          ) : (
                            <Radio className="w-5 h-5" />
                          )}
                          <span className="text-[8.5px] font-bold font-mono uppercase mt-0.5">
                            {cleanProvider.slice(0, 3)}
                          </span>
                        </div>
                      )}

                      {/* Main Pole Telemetry */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors font-mono truncate">
                            {pole.poleCode || pole.id}
                          </span>

                          {isNewToday && (
                            <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-700 text-[9px] font-extrabold font-mono border border-emerald-500/30 animate-pulse">
                              BARU
                            </span>
                          )}

                          <span className="text-[10px] text-slate-300 font-mono">•</span>
                          <span className="text-[10.5px] font-bold text-slate-600 truncate max-w-[130px] sm:max-w-[200px]">
                            {cleanProvider}
                          </span>
                        </div>

                        {/* Location Details */}
                        <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">
                            {pole.road
                              ? `${pole.road}${pole.kelurahan ? `, Kel. ${pole.kelurahan}` : ''}${pole.kecamatan ? `, Kec. ${pole.kecamatan}` : ''}`
                              : pole.kecamatan
                                ? `Kec. ${pole.kecamatan}`
                                : pole.kelurahan
                                  ? `Kel. ${pole.kelurahan}`
                                  : 'Kota Lubuklinggau'}
                          </span>
                        </p>

                        {/* Relative Timestamp & Surveyor */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 font-medium truncate">
                          <span className="text-blue-600 font-bold">{relativeTime}</span>
                          <span>•</span>
                          <span className="truncate">
                            Petugas: {pole.surveyorName || 'Surveyor Lapangan'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Status Badge & Chevron */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                          pole.condition === 'GOOD'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : pole.condition === 'NEEDS_REPAIR'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {pole.condition === 'GOOD'
                          ? '🟢 Baik'
                          : pole.condition === 'NEEDS_REPAIR'
                            ? '🟡 Miring'
                            : '🔴 Rusak'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
