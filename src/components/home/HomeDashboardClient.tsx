'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_ACCOUNTS } from '@/types/auth';
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
  const currentUser = user || DEFAULT_ACCOUNTS[0];

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
    return livePoles.filter((pole) => {
      const sDate = pole.surveyDate || (pole.createdAt ? pole.createdAt.split('T')[0] : '');
      return sDate === todayStr;
    }).length;
  }, [livePoles, todayStr]);

  // Compute 5 Most Recent Surveys
  const recentPoles = useMemo(() => {
    return [...livePoles].reverse().slice(0, 5);
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
      } else if (p.infrastructureCategory === 'PLN_MURNI' || p.providerId === 'PRV_PLN_DISTRIBUSI') {
        pln++;
      } else {
        fo++;
      }

      if (p.cableInstallationType === 'BAWAH_TANAH' || p.cableInstallationType === 'TRANSISI_RISER') {
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
    const healthScore = Math.round(((good) / total) * 100);

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
      <div className="relative overflow-hidden bg-slate-950 text-white pt-5 pb-8 px-4 sm:px-6 rounded-b-[40px] shadow-2xl shadow-slate-950/40 border-b border-slate-800/80">
        {/* Ambient Spatial Radial Glows */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] pointer-events-none opacity-40" />

        <div className="relative z-10 max-w-5xl mx-auto space-y-4">
          {/* Top Status Strip */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10.5px] font-mono text-slate-300 backdrop-blur-md shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-bold text-white tracking-wide">DISKOMINFOTIKSAN</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 truncate max-w-[140px] sm:max-w-none">Kota Lubuklinggau</span>
            </div>

            <div className="flex items-center gap-2">
              {isSyncing ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.8 bg-blue-950/80 border border-blue-500/40 rounded-full text-[10px] text-blue-300 font-mono font-bold animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Syncing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-0.8 bg-slate-900/80 border border-slate-700 rounded-full text-[10px] text-slate-400 font-mono">
                  <span>GPS Siap</span>
                </div>
              )}

              <Link
                href="/profile"
                className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-200 transition-all active:scale-95"
              >
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {currentUser.name.charAt(0)}
                </span>
                <span className="hidden sm:inline font-bold pr-1">
                  {currentUser.name.split(' ')[0]}
                </span>
              </Link>
            </div>
          </div>

          {/* User Welcome & Mission Statement */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div>
              <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold mb-0.5 font-mono">
                <span>{greeting}, {currentUser.name.split(' ')[0]}</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-400 font-sans text-[11px]">{timeStr}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                Pusat Kendali Spasial Infrastruktur
              </h1>
              <p className="text-xs text-slate-400 font-medium max-w-xl mt-0.5">
                Pemetaan tiang fiber optik, penerangan jalan umum (PJU), dan jaringan kabel Kota Lubuklinggau.
              </p>
            </div>

            {/* Quick Action Group */}
            <div className="flex items-center gap-2.5">
              <Link
                href="/poles/new"
                className="flex-1 sm:flex-none py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all border border-blue-400/30 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Input Survei GPS</span>
              </Link>

              <Link
                href="/map"
                className="py-2.5 px-3.5 bg-slate-800/90 hover:bg-slate-700/90 active:scale-95 text-slate-200 font-bold text-xs rounded-2xl border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer backdrop-blur-md"
              >
                <Map className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">Buka Peta</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-5 -mt-8 relative z-20">
        {/* ============================================================ */}
        {/* 2. SPATIAL TELEMETRY BENTO GRID                             */}
        {/* ============================================================ */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Card 1: Total Tiang Terdata */}
            <Link
              href="/poles"
              className="bg-white/95 backdrop-blur-md rounded-3xl p-4 border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.06)] hover:border-blue-300 hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  TOTAL ASET TIANG
                </span>
                <div className="w-6 h-6 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Database className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-slate-900 font-mono tracking-tight group-hover:text-blue-600 transition-colors">
                  {livePoles.length}
                </span>
                <span className="text-[10.5px] font-bold text-slate-500">Titik</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="text-slate-500">🌐 FO: {infrastructureCounts.fo}</span>
                <span className="text-slate-500">💡 PJU: {infrastructureCounts.pju}</span>
              </div>
            </Link>

            {/* Card 2: Survei Hari Ini */}
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.06)] relative overflow-hidden">
              <div className="flex items-center justify-between text-emerald-600 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700">
                  SURVEI HARI INI
                </span>
                <div className="w-6 h-6 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                  +{todayCount}
                </span>
                <span className="text-[10.5px] font-bold text-slate-500">Titik baru</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
                <span className="text-slate-400 font-mono">{todayStr}</span>
              </div>
            </div>

            {/* Card 3: Skor Kesehatan & Keamanan */}
            <Link
              href="/segments"
              className="bg-white/95 backdrop-blur-md rounded-3xl p-4 border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.06)] hover:border-amber-300 hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-amber-600 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700">
                  KONDISI FISIK
                </span>
                <div className="w-6 h-6 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {infrastructureCounts.healthScore}%
                </span>
                <span className="text-[10.5px] font-bold text-emerald-600">Kondisi Baik</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="text-amber-700 font-bold">
                  ⚠️ {infrastructureCounts.hazard} Perlu Audit
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* Card 4: Cakupan 8 Kecamatan */}
            <Link
              href="/districts"
              className="bg-white/95 backdrop-blur-md rounded-3xl p-4 border border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.06)] hover:border-purple-300 hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="flex items-center justify-between text-purple-600 mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700">
                  CAKUPAN KOTA
                </span>
                <div className="w-6 h-6 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-slate-900 font-mono tracking-tight group-hover:text-purple-600 transition-colors">
                  8 / 8
                </span>
                <span className="text-[10.5px] font-bold text-slate-500">Kecamatan</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="text-purple-700 font-bold">72 Kelurahan</span>
                <span className="text-slate-400 font-mono">100% Aktif</span>
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
            <span className="text-[10.5px] text-slate-400 font-medium">Terintegrasi DISKOMINFOTIKSAN</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. Input Survei GPS */}
            <Link
              href="/poles/new"
              className="p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
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
                <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                  Pin koordinat, foto fisik tiang &amp; auto-reverse geocoding jalan.
                </p>
              </div>
            </Link>

            {/* 2. Peta Spasial GIS */}
            <Link
              href="/map"
              className="p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-emerald-400 hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
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
                <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                  Visualisasi sebaran titik, poligon kelurahan &amp; jalur segmen FO.
                </p>
              </div>
            </Link>

            {/* 3. Penataan Kabel & Bahaya */}
            <Link
              href="/segments"
              className="p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-amber-400 hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
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
                <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                  Laporan tiang miring, kabel semrawut &amp; potensi bahaya jalan.
                </p>
              </div>
            </Link>

            {/* 4. Database Tiang & Filter */}
            <Link
              href="/poles"
              className="p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-cyan-400 hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
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
                <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                  Tabel data inventarisasi, pencarian spesifikasi &amp; ekspor laporan.
                </p>
              </div>
            </Link>

            {/* 5. Lampu PJU Pemkot */}
            <Link
              href="/poles?provider=PRV_PJU_PEMKOT"
              className="p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-yellow-400 hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
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
                <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                  Inventarisasi lampu jalan Pemkot, daya watt &amp; kondisi nyala.
                </p>
              </div>
            </Link>

            {/* 6. Katalog 20+ Provider & Marka */}
            <Link
              href="/providers"
              className="p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-indigo-400 hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
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
                <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                  Panduan standar ciri warna cat tiang, Telkom, PLN, Iconnet &amp; ISP.
                </p>
              </div>
            </Link>

            {/* 7. Master 8 Kecamatan & Kelurahan */}
            <Link
              href="/districts"
              className="p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-purple-400 hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
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
                <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                  Rekapitulasi 72 kelurahan &amp; fitur edit/manajemen data master.
                </p>
              </div>
            </Link>

            {/* 8. Jaringan Kabel Bawah Tanah */}
            <Link
              href="/segments?filter=UNDERGROUND"
              className="p-3.5 bg-white rounded-3xl border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] hover:border-teal-400 hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
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
                <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                  Jalur kabel tanam dan transisi riser pole perkotaan.
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. LIVE SPATIAL RADAR & CITY ANALYTICS                       */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 animate-in fade-in">
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
                  {Math.round((infrastructureCounts.fo / (livePoles.length || 1)) * 100)}% dari total aset kota
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
                  {Math.round((infrastructureCounts.pju / (livePoles.length || 1)) * 100)}% dari total aset kota
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
                  {Math.round((infrastructureCounts.pln / (livePoles.length || 1)) * 100)}% dari total aset kota
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 animate-in fade-in">
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
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Aktivitas Survei Terkini
                </h3>
                <p className="text-[11px] text-slate-500">
                  Data koordinat dan foto tiang yang baru diinput surveyor
                </p>
              </div>
            </div>

            <Link
              href="/poles"
              className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
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
              {recentPoles.map((pole) => (
                <Link
                  key={pole.id}
                  href={`/poles/${pole.id}`}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 px-2 -mx-2 rounded-2xl transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex flex-col items-center justify-center flex-shrink-0 group-hover:bg-blue-50 group-hover:border-blue-200 group-hover:text-blue-700 transition-colors">
                      <span className="text-[11px] font-mono font-black">
                        {pole.id.slice(-4)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {pole.poleCode || pole.id}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">•</span>
                        <span className="text-[10px] font-bold text-slate-600 truncate">
                          {pole.providerName || pole.providerId}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span>{pole.road}, {pole.kelurahan || pole.kecamatan}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
