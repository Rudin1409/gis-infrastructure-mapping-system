'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_ACCOUNTS } from '@/types/auth';
import { Pole } from '@/types/pole';
import { Provider } from '@/types/provider';
import { DEFAULT_PROVIDERS } from '@/config/providers';
import { DashboardStats } from '@/services/DashboardService';
import {
  Map,
  Plus,
  PlusCircle,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  MapPin,
  Clock,
  Compass,
  Cable,
  Database,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Navigation,
  ChevronRight,
  Search,
  AlertCircle,
  Lightbulb,
  BarChart3,
  TrendingUp,
  Radio,
  Zap,
  Flame,
} from 'lucide-react';

interface HomeDashboardClientProps {
  stats: DashboardStats;
  allPoles: Pole[];
}

export default function HomeDashboardClient({ stats, allPoles }: HomeDashboardClientProps) {
  const { user } = useAuth();
  const currentUser = user || DEFAULT_ACCOUNTS[0];

  // Dynamic Indonesian time greeting
  const [greeting, setGreeting] = useState('Halo');
  const [timeEmoji, setTimeEmoji] = useState('👋');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) {
      setGreeting('Selamat Pagi');
      setTimeEmoji('🌅');
    } else if (hour >= 11 && hour < 15) {
      setGreeting('Selamat Siang');
      setTimeEmoji('☀️');
    } else if (hour >= 15 && hour < 18.5) {
      setGreeting('Selamat Sore');
      setTimeEmoji('🌇');
    } else {
      setGreeting('Selamat Malam');
      setTimeEmoji('🌙');
    }
  }, []);

  // Compute 5 Most Recent Surveys
  const recentPoles = [...allPoles].reverse().slice(0, 5);

  // Compute Provider Distribution
  const providerCountMap: Record<string, { name: string; count: number; colorHex: string; code: string }> = {};
  DEFAULT_PROVIDERS.forEach((prov) => {
    providerCountMap[prov.id] = {
      name: prov.name.replace(/^\d+\.\s*/, ''),
      count: 0,
      colorHex: prov.colorHex || '#3b82f6',
      code: prov.code,
    };
  });

  allPoles.forEach((pole) => {
    const provId = pole.providerId || 'UNKNOWN';
    if (providerCountMap[provId]) {
      providerCountMap[provId].count += 1;
    } else {
      providerCountMap[provId] = {
        name: pole.providerName || provId,
        count: 1,
        colorHex: '#64748b',
        code: 'ISP',
      };
    }
  });

  const sortedProviders = Object.values(providerCountMap)
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // Problematic & Hazard Poles Count
  const hazardPolesCount = allPoles.filter(
    (p) =>
      p.condition === 'NEEDS_REPAIR' ||
      p.condition === 'DAMAGED' ||
      p.isTilted ||
      p.isHazardous ||
      p.isMessyCable ||
      p.isLowCable
  ).length;

  // Infrastructure Breakdown
  const pjuCount = allPoles.filter(
    (p) =>
      p.infrastructureCategory === 'PJU_MANDIRI' ||
      p.infrastructureCategory === 'GABUNG_PLN_PJU' ||
      p.providerId === 'PRV_PJU_PEMKOT' ||
      p.providerId === 'PRV_PLN_PJU_GABUNG'
  ).length;

  const foCount = allPoles.filter(
    (p) => !p.infrastructureCategory || p.infrastructureCategory === 'FO_WIFI'
  ).length;

  const plnCount = allPoles.filter(
    (p) => p.infrastructureCategory === 'PLN_MURNI' || p.providerId === 'PRV_PLN_DISTRIBUSI'
  ).length;

  const undergroundCount = allPoles.filter(
    (p) =>
      p.cableInstallationType === 'BAWAH_TANAH' ||
      p.cableInstallationType === 'TRANSISI_RISER'
  ).length;

  const ductingPercentage =
    allPoles.length > 0 ? Math.round((undergroundCount / allPoles.length) * 100) : 0;

  // 8 Quick Menus
  const surveyorMenus = [
    {
      label: 'Survey Baru',
      desc: 'GPS & Foto',
      href: '/poles/new',
      icon: PlusCircle,
      bgColor: 'bg-blue-50 text-blue-600 border-blue-100',
      isHot: true,
    },
    {
      label: 'Peta Spasial',
      desc: 'Satelit & Jalur',
      href: '/map',
      icon: Map,
      bgColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      label: 'Data Tiang',
      desc: `${stats.totalPoles} Titik`,
      href: '/poles',
      icon: Database,
      bgColor: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    },
    {
      label: 'Penataan Kabel',
      desc: 'Audit & Bahaya',
      href: '/segments',
      icon: ShieldAlert,
      bgColor: 'bg-amber-50 text-amber-600 border-amber-100',
      badge: hazardPolesCount > 0 ? `${hazardPolesCount}` : undefined,
    },
    {
      label: 'Lampu PJU',
      desc: `${pjuCount} Titik Lampu`,
      href: '/poles?provider=PRV_PJU_PEMKOT',
      icon: Lightbulb,
      bgColor: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    },
    {
      label: 'Bawah Tanah',
      desc: `${undergroundCount} Titik Ducting`,
      href: '/segments?filter=UNDERGROUND',
      icon: Cable,
      bgColor: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    {
      label: 'Katalog Provider',
      desc: 'Warna Cat Tiang',
      href: '/providers',
      icon: Building2,
      bgColor: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    },
    {
      label: '8 Kecamatan',
      desc: '72 Kelurahan',
      href: '/districts',
      icon: MapPin,
      bgColor: 'bg-purple-50 text-purple-600 border-purple-100',
    },
  ];

  return (
    <div className="min-h-full pb-24 text-slate-800 font-sans space-y-4 animate-in fade-in duration-150">
      {/* ============================================================ */}
      {/* 1. HERO GREETING & DYNAMIC USER CARD                         */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white pt-4 pb-9 px-4 rounded-b-[36px] shadow-lg shadow-blue-600/15">
        {/* Decorative Background Ambient Circles */}
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 rounded-full bg-blue-900/40 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          {/* Top User Status & Agency Pill */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-[10px] font-bold backdrop-blur-md shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span className="truncate max-w-[200px]">
                DISKOMINFOTIKSAN Kota Lubuklinggau
              </span>
            </div>

            <Link
              href="/profile"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 border border-white/30 text-[10px] text-white font-bold backdrop-blur-md transition-all active:scale-95 shadow-2xs"
            >
              <span>{currentUser.avatar || '🏢'}</span>
              <span className="max-w-[75px] truncate font-medium">
                {currentUser.name.split(' ')[0]}
              </span>
            </Link>
          </div>

          {/* Dynamic Personalized Greeting */}
          <div className="flex items-start gap-3 pt-0.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
              {currentUser.avatar || '🏢'}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-xs text-blue-100 font-semibold">
                <span>{greeting},</span>
                <span>{timeEmoji}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight truncate">
                {currentUser.name}
              </h1>
              <p className="text-[11px] text-cyan-200 font-medium leading-tight mt-0.5 truncate">
                {currentUser.roleLabel}
              </p>
            </div>
          </div>

          {/* Primary Call to Action Button */}
          <div className="pt-1 flex gap-2">
            <Link
              href="/poles/new"
              className="flex-1 py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.98] text-blue-700 font-black text-xs shadow-md shadow-blue-900/20 flex items-center justify-center gap-2 transition-all group cursor-pointer"
            >
              <div className="w-6 h-6 rounded-xl bg-blue-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="w-4 h-4 stroke-[3]" />
              </div>
              <span>Input Survey Tiang Baru (GPS)</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              href="/map"
              className="py-3 px-3.5 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-[0.98] text-white font-bold text-xs border border-white/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer backdrop-blur-md"
              title="Buka Peta GIS"
            >
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Peta</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. FLOATING EXECUTIVE SPATIAL STATS CARDS                   */}
      {/* ============================================================ */}
      <div className="px-4 -mt-6 relative z-20">
        <div className="grid grid-cols-3 gap-2">
          {/* Total Tiang */}
          <Link
            href="/poles"
            className="bg-white rounded-2xl p-3 shadow-[0_4px_20px_rgba(15,23,42,0.06)] border border-slate-100 text-center hover:border-blue-200 transition-all group"
          >
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
              TOTAL TIANG
            </span>
            <span className="text-xl font-black text-slate-900 font-mono block mt-0.5 group-hover:text-blue-600 transition-colors">
              {stats.totalPoles}
            </span>
            <span className="text-[9px] text-blue-600 font-bold">
              🌐 {foCount} • 💡 {pjuCount}
            </span>
          </Link>

          {/* Hari Ini */}
          <div className="bg-white rounded-2xl p-3 shadow-[0_4px_20px_rgba(15,23,42,0.06)] border border-slate-100 text-center">
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">
              HARI INI
            </span>
            <span className="text-xl font-black text-emerald-600 font-mono block mt-0.5">
              +{stats.todayCount}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">terinput</span>
          </div>

          {/* Perlu Penataan / Bahaya */}
          <Link
            href="/segments"
            className="bg-white rounded-2xl p-3 shadow-[0_4px_20px_rgba(15,23,42,0.06)] border border-slate-100 text-center hover:border-amber-200 transition-all group"
          >
            <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">
              PENATAAN
            </span>
            <span className="text-xl font-black text-amber-600 font-mono block mt-0.5 group-hover:scale-105 transition-transform">
              {hazardPolesCount}
            </span>
            <span className="text-[9px] text-amber-700 font-bold">miring/bahaya</span>
          </Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2.5 HAZARD ALERT BANNER (IF PROBLEMATIC POLES EXIST)         */}
      {/* ============================================================ */}
      {hazardPolesCount > 0 && (
        <div className="px-4">
          <Link
            href="/segments"
            className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-xs flex items-center justify-between gap-3 hover:border-amber-300 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-xs animate-pulse">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-black text-amber-950 block leading-tight">
                  Perlu Penataan &amp; Audit Lapangan ({hazardPolesCount} Titik)
                </span>
                <span className="text-[10px] text-amber-800/90 leading-tight block">
                  Tercatat kabel semrawut / melorot rendah yang butuh perbaikan operator
                </span>
              </div>
            </div>

            <div className="w-6 h-6 rounded-full bg-amber-200/80 text-amber-900 flex items-center justify-center flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. QUICK SEARCH TIANG                                       */}
      {/* ============================================================ */}
      <div className="px-4">
        <form action="/poles" method="GET" className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            name="q"
            placeholder="Cari ID tiang, provider, nama jalan..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs text-slate-800 placeholder-slate-400 shadow-[0_2px_10px_rgba(15,23,42,0.04)] focus:border-blue-500 outline-none transition-all font-medium"
          />
        </form>
      </div>

      {/* ============================================================ */}
      {/* 4. MENU CEPAT LAPANGAN (8 SQUIRCLE GRID)                    */}
      {/* ============================================================ */}
      <div className="px-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Menu Cepat Lapangan</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-medium">8 Akses Terpadu</span>
        </div>

        <div className="grid grid-cols-4 gap-2.5">
          {surveyorMenus.map((menu, idx) => {
            const Icon = menu.icon;
            return (
              <Link
                key={idx}
                href={menu.href}
                className="bg-white rounded-2xl p-2.5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100/90 active:scale-95 hover:shadow-md transition-all flex flex-col items-center text-center relative group"
              >
                {menu.isHot && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-blue-600 text-white font-black text-[8px] rounded-full uppercase shadow">
                    Hot
                  </span>
                )}
                {menu.badge && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-amber-500 text-white font-black text-[8px] rounded-full shadow">
                    {menu.badge}
                  </span>
                )}

                {/* Squircle Icon Container */}
                <div
                  className={`w-11 h-11 rounded-2xl ${menu.bgColor} border flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>

                <span className="text-[11px] font-bold text-slate-800 leading-tight block line-clamp-1">
                  {menu.label}
                </span>
                <span className="text-[9px] text-slate-400 block line-clamp-1 mt-0.5">
                  {menu.desc}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. SEBARAN KEPEMILIKAN PROVIDER TERATAS                     */}
      {/* ============================================================ */}
      {sortedProviders.length > 0 && (
        <div className="px-4">
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Pangsa Kepemilikan Tiang Provider</span>
              </h3>
              <Link href="/providers" className="text-[10px] font-bold text-blue-600 hover:underline">
                Lihat Semua ({DEFAULT_PROVIDERS.length}) &rarr;
              </Link>
            </div>

            <div className="space-y-2.5">
              {sortedProviders.map((prov) => {
                const percentage = allPoles.length
                  ? Math.round((prov.count / allPoles.length) * 100)
                  : 0;

                return (
                  <div key={prov.code} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: prov.colorHex }}
                        />
                        <span className="font-bold text-slate-800 truncate text-[11px]">
                          {prov.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-600 text-[10px]">
                        {prov.count} Tiang ({percentage}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(percentage, 6)}%`,
                          backgroundColor: prov.colorHex,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. PETA GIS & DATA SURVEI LAPANGAN TERKINI                  */}
      {/* ============================================================ */}
      <div className="px-4 space-y-3">
        {/* Quick Map Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-3.5 shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <Navigation className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xs font-black">Peta GIS Sebaran Kota</h3>
              <p className="text-[10px] text-slate-300">Pantau titik koordinat &amp; jalur kabel</p>
            </div>
          </div>

          <Link
            href="/map"
            className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 flex-shrink-0"
          >
            <span>Buka Peta</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Recent 5 Surveys List */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Data Input Lapangan Terkini</span>
            </h3>
            <Link href="/poles" className="text-[10px] font-bold text-blue-600 hover:underline">
              Lihat Semua &rarr;
            </Link>
          </div>

          {recentPoles.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              Belum ada data tiang yang disurvei.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPoles.map((pole) => (
                <Link
                  key={pole.id}
                  href={`/poles/${pole.id}`}
                  className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 px-1 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-[10px] font-mono font-black flex-shrink-0">
                      {pole.id.replace('LL-', '#')}
                    </div>

                    <div className="min-w-0">
                      <span className="text-xs font-black font-mono text-slate-900 block truncate group-hover:text-blue-600 transition-colors">
                        {pole.poleCode || pole.id}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {pole.road} &bull; {pole.providerName || pole.providerId}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        pole.condition === 'GOOD'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : pole.condition === 'NEEDS_REPAIR'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {pole.condition === 'GOOD'
                        ? 'Baik'
                        : pole.condition === 'NEEDS_REPAIR'
                        ? 'Miring'
                        : 'Rusak'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
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
