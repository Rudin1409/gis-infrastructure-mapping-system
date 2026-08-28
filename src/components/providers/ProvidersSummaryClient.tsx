'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Pole } from '@/types/pole';
import { Provider } from '@/types/provider';
import { DEFAULT_PROVIDERS, resolveProviderInfo } from '@/config/providers';
import { useSupabaseRealtimePoles } from '@/hooks/useSupabaseRealtimePoles';
import { PoleMiniGraphic } from '@/components/survey/PoleVisualGuideModal';
import {
  Building2,
  Database,
  Search,
  ExternalLink,
  ChevronRight,
  Palette,
  Image as ImageIcon,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Flame,
  BarChart3,
  PieChart,
  Filter,
  PlusCircle,
  Map as MapIcon,
  Layers,
  Sparkles,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

interface ProvidersSummaryClientProps {
  initialPoles: Pole[];
  providers?: Provider[];
}

export default function ProvidersSummaryClient({
  initialPoles,
  providers = [],
}: ProvidersSummaryClientProps) {
  const { poles: livePoles, isLoading } = useSupabaseRealtimePoles(initialPoles);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE_ONLY' | 'GOV_PLN' | 'ISP_FO'>('ALL');
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'VISUAL_GUIDE'>('SUMMARY');

  // 1. Merge default providers with any custom provider records
  const allProvidersList = useMemo(() => {
    const map = new Map<string, Provider>();
    DEFAULT_PROVIDERS.forEach((p) => map.set(p.id, p));
    providers.forEach((p) => map.set(p.id, { ...map.get(p.id), ...p }));
    return Array.from(map.values());
  }, [providers]);

  // 2. Compute comprehensive per-provider statistics
  const providerStats = useMemo(() => {
    const totalPolesCount = livePoles.length;

    // Initialize stats map with all known providers
    const statsMap: Record<
      string,
      {
        provider: Provider;
        count: number;
        percentage: number;
        goodCount: number;
        repairCount: number;
        damagedCount: number;
        hazardCount: number;
        tiltedCount: number;
        messyCount: number;
        undergroundCount: number;
        topKecamatan: string;
        kecamatanDistribution: Record<string, number>;
      }
    > = {};

    allProvidersList.forEach((prov) => {
      statsMap[prov.id] = {
        provider: prov,
        count: 0,
        percentage: 0,
        goodCount: 0,
        repairCount: 0,
        damagedCount: 0,
        hazardCount: 0,
        tiltedCount: 0,
        messyCount: 0,
        undergroundCount: 0,
        topKecamatan: '-',
        kecamatanDistribution: {},
      };
    });

    // Populate with actual pole data
    livePoles.forEach((pole) => {
      const resolved = resolveProviderInfo({
        providerId: pole.providerId,
        providerName: pole.providerName,
        infrastructureCategory: pole.infrastructureCategory,
      });

      let targetId = resolved.providerId;
      if (!statsMap[targetId]) {
        // Fallback for custom or unknown provider
        const customProv: Provider = {
          id: targetId,
          code: resolved.providerId.replace('PRV_', '').substring(0, 5).toUpperCase(),
          name: resolved.providerName,
          colorHex: resolved.selectedProviderObj?.colorHex || '#64748b',
          status: 'ACTIVE',
          markingDescription: 'Provider Khusus / Tambahan',
        };
        statsMap[targetId] = {
          provider: customProv,
          count: 0,
          percentage: 0,
          goodCount: 0,
          repairCount: 0,
          damagedCount: 0,
          hazardCount: 0,
          tiltedCount: 0,
          messyCount: 0,
          undergroundCount: 0,
          topKecamatan: '-',
          kecamatanDistribution: {},
        };
      }

      const st = statsMap[targetId];
      st.count += 1;

      if (pole.condition === 'GOOD') st.goodCount += 1;
      else if (pole.condition === 'NEEDS_REPAIR') st.repairCount += 1;
      else if (pole.condition === 'DAMAGED') st.damagedCount += 1;

      if (pole.isTilted) st.tiltedCount += 1;
      if (pole.isMessyCable) st.messyCount += 1;
      if (
        pole.isTilted ||
        pole.isMessyCable ||
        pole.isLowCable ||
        pole.isCorroded ||
        pole.isObstructing ||
        pole.isHazardous
      ) {
        st.hazardCount += 1;
      }

      if (
        pole.cableInstallationType === 'BAWAH_TANAH' ||
        pole.cableInstallationType === 'TRANSISI_RISER'
      ) {
        st.undergroundCount += 1;
      }

      if (pole.kecamatan) {
        const kec = pole.kecamatan.replace(/^Kecamatan\s+/i, '');
        st.kecamatanDistribution[kec] = (st.kecamatanDistribution[kec] || 0) + 1;
      }
    });

    // Compute percentages & top kecamatan
    const statsList = Object.values(statsMap).map((st) => {
      st.percentage = totalPolesCount > 0 ? (st.count / totalPolesCount) * 100 : 0;

      // Find top kecamatan
      let maxKec = '-';
      let maxKecCount = 0;
      Object.entries(st.kecamatanDistribution).forEach(([kec, cnt]) => {
        if (cnt > maxKecCount) {
          maxKecCount = cnt;
          maxKec = kec;
        }
      });
      st.topKecamatan = maxKec;

      return st;
    });

    // Sort by count descending, then by provider code
    return statsList.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.provider.name.localeCompare(b.provider.name);
    });
  }, [livePoles, allProvidersList]);

  // Filtered list
  const filteredStats = useMemo(() => {
    return providerStats.filter((st) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        st.provider.name.toLowerCase().includes(q) ||
        st.provider.code.toLowerCase().includes(q) ||
        (st.provider.markingDescription || '').toLowerCase().includes(q);

      if (!matchQuery) return false;

      if (filterType === 'ACTIVE_ONLY' && st.count === 0) return false;
      if (filterType === 'GOV_PLN') {
        const isGovOrPln =
          st.provider.id === 'PRV_PLN_DISTRIBUSI' ||
          st.provider.id === 'PRV_PLN_PJU_GABUNG' ||
          st.provider.id === 'PRV_PJU_PEMKOT';
        if (!isGovOrPln) return false;
      }
      if (filterType === 'ISP_FO') {
        const isGovOrPln =
          st.provider.id === 'PRV_PLN_DISTRIBUSI' ||
          st.provider.id === 'PRV_PLN_PJU_GABUNG' ||
          st.provider.id === 'PRV_PJU_PEMKOT';
        if (isGovOrPln) return false;
      }

      return true;
    });
  }, [providerStats, searchQuery, filterType]);

  // Overall Global Counts
  const activeProvidersCount = useMemo(
    () => providerStats.filter((s) => s.count > 0).length,
    [providerStats]
  );
  const totalPolesCount = livePoles.length;

  const plnCount = useMemo(
    () =>
      (providerStats.find((s) => s.provider.id === 'PRV_PLN_DISTRIBUSI')?.count || 0) +
      (providerStats.find((s) => s.provider.id === 'PRV_PLN_PJU_GABUNG')?.count || 0),
    [providerStats]
  );

  const pjuCount = useMemo(
    () => providerStats.find((s) => s.provider.id === 'PRV_PJU_PEMKOT')?.count || 0,
    [providerStats]
  );

  const ispCount = useMemo(
    () => Math.max(0, totalPolesCount - plnCount - pjuCount),
    [totalPolesCount, plnCount, pjuCount]
  );

  return (
    <div className="space-y-4 font-sans text-slate-800 pb-16 animate-in fade-in">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Ringkasan Data per Provider</span>
          </h1>
          <p className="text-xs text-slate-500">
            Rekapitulasi total tiang, kondisi fisik &amp; pangsa aset di Kota Lubuklinggau
          </p>
        </div>

        <Link
          href="/poles/new"
          className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Survei Baru</span>
        </Link>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Tiang</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
            {totalPolesCount}
          </p>
          <span className="text-[10px] text-slate-500 block">
            {activeProvidersCount} Instansi Terdata
          </span>
        </div>

        <div className="bg-sky-50/70 rounded-3xl p-3.5 border border-sky-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-1">
          <div className="flex items-center justify-between text-sky-700">
            <span className="text-[10px] font-bold uppercase tracking-wider">Jaringan PLN</span>
            <span className="text-xs">⚡</span>
          </div>
          <p className="text-2xl font-black text-sky-950 font-mono tracking-tight">
            {plnCount}
          </p>
          <span className="text-[10px] text-sky-700 block font-medium">
            {totalPolesCount > 0 ? ((plnCount / totalPolesCount) * 100).toFixed(0) : 0}% Pangsa Total
          </span>
        </div>

        <div className="bg-amber-50/70 rounded-3xl p-3.5 border border-amber-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-1">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[10px] font-bold uppercase tracking-wider">PJU Pemkot</span>
            <span className="text-xs">💡</span>
          </div>
          <p className="text-2xl font-black text-amber-950 font-mono tracking-tight">
            {pjuCount}
          </p>
          <span className="text-[10px] text-amber-800 block font-medium">
            {totalPolesCount > 0 ? ((pjuCount / totalPolesCount) * 100).toFixed(0) : 0}% Lampu Jalan
          </span>
        </div>

        <div className="bg-indigo-50/70 rounded-3xl p-3.5 border border-indigo-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-1">
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-[10px] font-bold uppercase tracking-wider">Provider ISP / FO</span>
            <span className="text-xs">🌐</span>
          </div>
          <p className="text-2xl font-black text-indigo-950 font-mono tracking-tight">
            {ispCount}
          </p>
          <span className="text-[10px] text-indigo-700 block font-medium">
            {totalPolesCount > 0 ? ((ispCount / totalPolesCount) * 100).toFixed(0) : 0}% Operator Internet
          </span>
        </div>
      </div>

      {/* 3. Navigation View Switcher */}
      <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('SUMMARY')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'SUMMARY'
              ? 'bg-white text-blue-700 shadow-md font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Statistik &amp; Jumlah Tiang ({activeProvidersCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('VISUAL_GUIDE')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'VISUAL_GUIDE'
              ? 'bg-white text-blue-700 shadow-md font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Panduan Marka Warna ({allProvidersList.length})</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* VIEW 1: FULL SUMMARY & DATA STATS PER PROVIDER              */}
      {/* ============================================================ */}
      {activeTab === 'SUMMARY' && (
        <div className="space-y-3.5">
          {/* Search & Filter Chips */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari provider, kode, atau keterangan..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterType === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Semua ({providerStats.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('ACTIVE_ONLY')}
                className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterType === 'ACTIVE_ONLY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Ada Data ({activeProvidersCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('GOV_PLN')}
                className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterType === 'GOV_PLN'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                ⚡💡 PLN &amp; Pemkot
              </button>
              <button
                type="button"
                onClick={() => setFilterType('ISP_FO')}
                className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterType === 'ISP_FO'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                🌐 Provider ISP / FO
              </button>
            </div>
          </div>

          {/* List of Provider Breakdown Cards */}
          <div className="space-y-3">
            {filteredStats.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-2">
                <span className="text-3xl block">🔍</span>
                <h3 className="text-sm font-black text-slate-800">
                  Tidak Ada Provider yang Sesuai
                </h3>
                <p className="text-xs text-slate-500">
                  Coba sesuaikan kata kunci pencarian atau filter tipe instansi.
                </p>
              </div>
            ) : (
              filteredStats.map((st, index) => {
                const prov = st.provider;
                const isTopRanking = index < 3 && st.count > 0;

                return (
                  <div
                    key={prov.id}
                    className={`bg-white rounded-3xl p-4 border transition-all space-y-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] ${
                      st.count > 0
                        ? 'border-slate-200/90 hover:border-blue-300'
                        : 'border-slate-100 opacity-65 hover:opacity-100'
                    }`}
                  >
                    {/* Top Row: Provider Identity & Total Count Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Mini Pole Preview Graphic */}
                        <div className="w-10 h-14 p-1 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-center flex-shrink-0">
                          <PoleMiniGraphic provider={prov} height={46} />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span
                              className="px-2 py-0.5 rounded-md text-[9px] font-black text-white font-mono shadow-2xs"
                              style={{ backgroundColor: prov.colorHex || '#3b82f6' }}
                            >
                              {prov.code}
                            </span>

                            {isTopRanking && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 text-[9px] font-black rounded-md flex items-center gap-0.5">
                                <span>🏆</span>
                                <span>Peringkat #{index + 1}</span>
                              </span>
                            )}

                            {st.count === 0 && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-md">
                                Belum Ada Data
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-black text-slate-900 truncate">
                            {prov.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {prov.markingDescription || 'Identitas fisik resmi'}
                          </p>
                        </div>
                      </div>

                      {/* Count Display */}
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="text-xl font-black text-slate-900 font-mono">
                            {st.count}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">Tiang</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 font-mono">
                          {st.percentage.toFixed(1)}% Pangsa
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar of Market Share */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(st.count > 0 ? 3 : 0, st.percentage)}%`,
                          backgroundColor: prov.colorHex || '#3b82f6',
                        }}
                      />
                    </div>

                    {/* Quality & Spatial Metrics Grid */}
                    {st.count > 0 && (
                      <div className="grid grid-cols-3 gap-2 text-[10px] pt-1">
                        {/* Kondisi Fisik */}
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-0.5">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">
                            Kondisi Fisik
                          </span>
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-emerald-700">🟢 {st.goodCount}</span>
                            <span className="text-amber-700">🟡 {st.repairCount}</span>
                            <span className="text-rose-700">🔴 {st.damagedCount}</span>
                          </div>
                        </div>

                        {/* Potensi Bahaya / Miring */}
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-0.5">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">
                            Masalah Lapangan
                          </span>
                          <span className="font-bold text-slate-800 block">
                            {st.hazardCount > 0 ? (
                              <span className="text-amber-700">⚠️ {st.hazardCount} Tiang Masalah</span>
                            ) : (
                              <span className="text-emerald-700">✅ 100% Aman</span>
                            )}
                          </span>
                        </div>

                        {/* Wilayah Dominan */}
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-0.5">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">
                            Kec. Terbanyak
                          </span>
                          <span className="font-bold text-slate-800 truncate block">
                            📍 {st.topKecamatan}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Links */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                      <Link
                        href={`/map?provider=${encodeURIComponent(prov.id)}`}
                        className="text-[11px] font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 transition-colors"
                      >
                        <MapIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>Lihat di Peta</span>
                      </Link>

                      <Link
                        href={`/poles?provider=${encodeURIComponent(prov.id)}`}
                        className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded-xl flex items-center gap-1 transition-colors"
                      >
                        <span>Lihat Semua Tiang ({st.count})</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 2: VISUAL GUIDE INFOGRAFIS RESMI                        */}
      {/* ============================================================ */}
      {activeTab === 'VISUAL_GUIDE' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Official Reference Infographic Banner */}
          <div className="bg-slate-950 rounded-3xl p-4 border border-slate-800 shadow-md space-y-2.5 text-white">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <span>Infografis Standar Ciri Fisik Marka Tiang (1 - 20)</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800 font-bold">
                Standar Kota Lubuklinggau
              </span>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black border border-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/provider-pole-guide.jpg"
                alt="Panduan Ciri Warna Tiang Provider"
                className="w-full h-auto object-contain max-h-72 mx-auto"
              />
            </div>
          </div>

          {/* Grid of Visual Marking Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allProvidersList.map((prov) => {
              const st = providerStats.find((s) => s.provider.id === prov.id);
              const count = st?.count || 0;

              return (
                <div
                  key={prov.id}
                  className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex items-center gap-3.5 hover:border-blue-200 transition-colors"
                >
                  <div className="w-11 h-18 p-1 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <PoleMiniGraphic provider={prov} height={56} />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="font-mono text-[9px] font-black px-1.5 py-0.2 rounded text-white"
                        style={{ backgroundColor: prov.colorHex || '#64748b' }}
                      >
                        {prov.code}
                      </span>
                      <h4 className="text-xs font-black text-slate-900 truncate">
                        {prov.name}
                      </h4>
                    </div>

                    <p className="text-[10px] text-slate-500 leading-snug">
                      {prov.markingDescription || 'Warna identitas tiang resmi'}
                    </p>

                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-blue-600 font-mono">
                        {count} Tiang Terdata
                      </span>

                      <Link
                        href={`/poles?provider=${encodeURIComponent(prov.id)}`}
                        className="text-[10px] font-bold text-slate-600 hover:text-blue-600 flex items-center gap-0.5"
                      >
                        <span>Data Tiang</span>
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
