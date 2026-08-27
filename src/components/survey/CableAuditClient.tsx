'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Pole } from '@/types/pole';
import { Provider } from '@/types/provider';
import { KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';
import {
  ShieldAlert,
  AlertTriangle,
  Cable,
  Flame,
  CheckCircle2,
  Search,
  Filter,
  MapPin,
  Building2,
  Layers,
  ArrowRight,
  ExternalLink,
  Edit3,
  RotateCcw,
  Lightbulb,
  Zap,
  Radio,
  Eye,
  Info,
  ChevronRight,
  Map,
} from 'lucide-react';

interface CableAuditClientProps {
  poles: Pole[];
  providers: Provider[];
  initialFilter?: AuditFilterType;
  initialQuery?: string;
}

export type AuditFilterType =
  | 'ALL_ISSUES'
  | 'MESSY_CABLE'
  | 'LOW_CABLE'
  | 'TILTED'
  | 'CORRODED'
  | 'OBSTRUCTING'
  | 'PJU_BROKEN'
  | 'UNDERGROUND'
  | 'ALL_POLES'
  | 'NORMAL_ONLY';

import { useSupabaseRealtimePoles } from '@/hooks/useSupabaseRealtimePoles';

export default function CableAuditClient({
  poles: initialPoles,
  providers,
  initialFilter = 'ALL_ISSUES',
  initialQuery = '',
}: CableAuditClientProps) {
  const { poles, isLoading } = useSupabaseRealtimePoles(initialPoles);

  // Filter States
  const [activeIssueFilter, setActiveIssueFilter] = useState<AuditFilterType>(initialFilter);
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');
  const [selectedKecamatan, setSelectedKecamatan] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);

  React.useEffect(() => {
    if (initialFilter) {
      setActiveIssueFilter(initialFilter);
    }
  }, [initialFilter]);

  // 1. Calculate Real-Time Audit Metrics from Surveyed Poles
  const metrics = useMemo(() => {
    let messyCableCount = 0;
    let lowCableCount = 0;
    let tiltedCount = 0;
    let corrodedCount = 0;
    let obstructingCount = 0;
    let pjuBrokenCount = 0;
    let undergroundCount = 0;
    let riserCount = 0;
    let aerialCount = 0;
    let totalIssuesCount = 0;

    poles.forEach((p) => {
      const hasIssue =
        p.isMessyCable ||
        p.isLowCable ||
        p.isTilted ||
        p.isCorroded ||
        p.isObstructing ||
        p.condition === 'DAMAGED' ||
        p.condition === 'NEEDS_REPAIR' ||
        (p.infrastructureCategory?.includes('PJU') &&
          p.pjuLampCondition &&
          p.pjuLampCondition !== 'MENYALA_NORMAL');

      if (hasIssue) totalIssuesCount++;
      if (p.isMessyCable) messyCableCount++;
      if (p.isLowCable) lowCableCount++;
      if (p.isTilted) tiltedCount++;
      if (p.isCorroded) corrodedCount++;
      if (p.isObstructing) obstructingCount++;
      if (
        p.infrastructureCategory?.includes('PJU') &&
        p.pjuLampCondition &&
        p.pjuLampCondition !== 'MENYALA_NORMAL'
      ) {
        pjuBrokenCount++;
      }

      if (p.cableInstallationType === 'BAWAH_TANAH') {
        undergroundCount++;
      } else if (p.cableInstallationType === 'TRANSISI_RISER') {
        riserCount++;
      } else {
        aerialCount++;
      }
    });

    const ductingTotal = undergroundCount + riserCount;
    const ductingPercentage =
      poles.length > 0 ? Math.round((ductingTotal / poles.length) * 100) : 0;

    return {
      totalPoles: poles.length,
      totalIssuesCount,
      messyCableCount,
      lowCableCount,
      tiltedCount,
      corrodedCount,
      obstructingCount,
      pjuBrokenCount,
      undergroundCount,
      riserCount,
      aerialCount,
      ductingTotal,
      ductingPercentage,
    };
  }, [poles]);

  // 2. Filter Poles matching criteria
  const filteredPoles = useMemo(() => {
    return poles.filter((pole) => {
      // Issue filter
      const isMessy = !!pole.isMessyCable;
      const isLow = !!pole.isLowCable;
      const isTilted = !!pole.isTilted;
      const isCorroded = !!pole.isCorroded;
      const isObstructing = !!pole.isObstructing;
      const isPjuBroken =
        !!pole.infrastructureCategory?.includes('PJU') &&
        !!pole.pjuLampCondition &&
        pole.pjuLampCondition !== 'MENYALA_NORMAL';
      const isUndergroundOrRiser =
        pole.cableInstallationType === 'BAWAH_TANAH' ||
        pole.cableInstallationType === 'TRANSISI_RISER';
      const hasAnyIssue =
        isMessy ||
        isLow ||
        isTilted ||
        isCorroded ||
        isObstructing ||
        isPjuBroken ||
        pole.condition === 'DAMAGED' ||
        pole.condition === 'NEEDS_REPAIR';

      if (activeIssueFilter === 'ALL_ISSUES' && !hasAnyIssue) return false;
      if (activeIssueFilter === 'MESSY_CABLE' && !isMessy) return false;
      if (activeIssueFilter === 'LOW_CABLE' && !isLow) return false;
      if (activeIssueFilter === 'TILTED' && !isTilted) return false;
      if (activeIssueFilter === 'CORRODED' && !isCorroded) return false;
      if (activeIssueFilter === 'OBSTRUCTING' && !isObstructing) return false;
      if (activeIssueFilter === 'PJU_BROKEN' && !isPjuBroken) return false;
      if (activeIssueFilter === 'UNDERGROUND' && !isUndergroundOrRiser) return false;
      if (activeIssueFilter === 'NORMAL_ONLY' && hasAnyIssue) return false;

      // Provider filter
      if (selectedProvider !== 'ALL') {
        const matchesProvider =
          pole.providerId === selectedProvider ||
          pole.providerName?.toLowerCase().includes(selectedProvider.toLowerCase());
        if (!matchesProvider) return false;
      }

      // Kecamatan filter
      if (selectedKecamatan !== 'ALL') {
        if (pole.kecamatan !== selectedKecamatan) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = (pole.poleCode || '').toLowerCase().includes(q);
        const matchRoad = (pole.road || '').toLowerCase().includes(q);
        const matchKel = (pole.kelurahan || '').toLowerCase().includes(q);
        const matchKec = (pole.kecamatan || '').toLowerCase().includes(q);
        const matchProv = (pole.providerName || '').toLowerCase().includes(q);
        const matchDesc = (pole.description || '').toLowerCase().includes(q);
        const matchPatokan = (pole.patokanLokasi || '').toLowerCase().includes(q);

        if (!matchCode && !matchRoad && !matchKel && !matchKec && !matchProv && !matchDesc && !matchPatokan) {
          return false;
        }
      }

      return true;
    });
  }, [poles, activeIssueFilter, selectedProvider, selectedKecamatan, searchQuery]);

  const resetFilters = () => {
    setActiveIssueFilter('ALL_ISSUES');
    setSelectedProvider('ALL');
    setSelectedKecamatan('ALL');
    setSearchQuery('');
  };

  return (
    <div className="p-4 space-y-4 text-slate-800 font-sans pb-24 animate-in fade-in duration-150">
      {/* 1. Header Banner */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <span>Audit &amp; Penataan Kabel</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring kabel semrawut, kabel melorot &amp; utilitas Kota Lubuklinggau
          </p>
        </div>

        <Link
          href="/map"
          className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
        >
          <Map className="w-4 h-4" />
          <span>Peta GIS</span>
        </Link>
      </div>

      {/* 2. Top Metric Highlight Cards (Clickable for Quick Filter) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Kabel Semrawut */}
        <button
          type="button"
          onClick={() => setActiveIssueFilter('MESSY_CABLE')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            activeIssueFilter === 'MESSY_CABLE'
              ? 'bg-amber-500 text-white border-amber-600 shadow-md shadow-amber-500/20 scale-[1.02]'
              : 'bg-white hover:bg-amber-50/50 border-slate-100 text-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider ${
                activeIssueFilter === 'MESSY_CABLE' ? 'text-amber-100' : 'text-slate-500'
              }`}
            >
              Kabel Semrawut
            </span>
            <AlertTriangle
              className={`w-3.5 h-3.5 ${
                activeIssueFilter === 'MESSY_CABLE' ? 'text-amber-200' : 'text-amber-500'
              }`}
            />
          </div>
          <div className="text-xl font-black font-mono">
            {metrics.messyCableCount}{' '}
            <span
              className={`text-xs font-normal ${
                activeIssueFilter === 'MESSY_CABLE' ? 'text-amber-100' : 'text-slate-400'
              }`}
            >
              titik
            </span>
          </div>
          <span
            className={`text-[9px] font-medium block mt-0.5 ${
              activeIssueFilter === 'MESSY_CABLE' ? 'text-amber-100' : 'text-slate-400'
            }`}
          >
            Perlu bundling operator
          </span>
        </button>

        {/* Kabel Rendah (< 4m) */}
        <button
          type="button"
          onClick={() => setActiveIssueFilter('LOW_CABLE')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            activeIssueFilter === 'LOW_CABLE'
              ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/20 scale-[1.02]'
              : 'bg-white hover:bg-rose-50/50 border-slate-100 text-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider ${
                activeIssueFilter === 'LOW_CABLE' ? 'text-rose-100' : 'text-slate-500'
              }`}
            >
              Kabel Rendah
            </span>
            <Flame
              className={`w-3.5 h-3.5 ${
                activeIssueFilter === 'LOW_CABLE' ? 'text-rose-200' : 'text-rose-500'
              }`}
            />
          </div>
          <div className="text-xl font-black font-mono">
            {metrics.lowCableCount}{' '}
            <span
              className={`text-xs font-normal ${
                activeIssueFilter === 'LOW_CABLE' ? 'text-rose-100' : 'text-slate-400'
              }`}
            >
              titik
            </span>
          </div>
          <span
            className={`text-[9px] font-medium block mt-0.5 ${
              activeIssueFilter === 'LOW_CABLE' ? 'text-rose-100' : 'text-slate-400'
            }`}
          >
            Rawan tersangkut truk
          </span>
        </button>

        {/* Tiang Miring */}
        <button
          type="button"
          onClick={() => setActiveIssueFilter('TILTED')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            activeIssueFilter === 'TILTED'
              ? 'bg-orange-600 text-white border-orange-700 shadow-md shadow-orange-600/20 scale-[1.02]'
              : 'bg-white hover:bg-orange-50/50 border-slate-100 text-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider ${
                activeIssueFilter === 'TILTED' ? 'text-orange-100' : 'text-slate-500'
              }`}
            >
              Tiang Miring
            </span>
            <ShieldAlert
              className={`w-3.5 h-3.5 ${
                activeIssueFilter === 'TILTED' ? 'text-orange-200' : 'text-orange-500'
              }`}
            />
          </div>
          <div className="text-xl font-black font-mono">
            {metrics.tiltedCount}{' '}
            <span
              className={`text-xs font-normal ${
                activeIssueFilter === 'TILTED' ? 'text-orange-100' : 'text-slate-400'
              }`}
            >
              titik
            </span>
          </div>
          <span
            className={`text-[9px] font-medium block mt-0.5 ${
              activeIssueFilter === 'TILTED' ? 'text-orange-100' : 'text-slate-400'
            }`}
          >
            Butuh penegakan fisik
          </span>
        </button>

        {/* Kabel Bawah Tanah / Ducting */}
        <button
          type="button"
          onClick={() => setActiveIssueFilter('UNDERGROUND')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            activeIssueFilter === 'UNDERGROUND'
              ? 'bg-teal-600 text-white border-teal-700 shadow-md shadow-teal-600/20 scale-[1.02]'
              : 'bg-white hover:bg-teal-50/50 border-slate-100 text-slate-800 shadow-[0_2px_10px_rgba(15,23,42,0.04)]'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[9px] font-bold uppercase tracking-wider ${
                activeIssueFilter === 'UNDERGROUND' ? 'text-teal-100' : 'text-slate-500'
              }`}
            >
              Bawah Tanah
            </span>
            <Cable
              className={`w-3.5 h-3.5 ${
                activeIssueFilter === 'UNDERGROUND' ? 'text-teal-200' : 'text-teal-500'
              }`}
            />
          </div>
          <div className="text-xl font-black font-mono">
            {metrics.ductingTotal}{' '}
            <span
              className={`text-xs font-normal ${
                activeIssueFilter === 'UNDERGROUND' ? 'text-teal-100' : 'text-slate-400'
              }`}
            >
              titik
            </span>
          </div>
          <span
            className={`text-[9px] font-medium block mt-0.5 ${
              activeIssueFilter === 'UNDERGROUND' ? 'text-teal-100' : 'text-slate-400'
            }`}
          >
            {metrics.undergroundCount} Tanam • {metrics.riserCount} Riser
          </span>
        </button>
      </div>

      {/* 3. Ducting & Underground Progress Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-3xl p-4 text-white shadow-lg shadow-slate-900/10 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <Cable className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-tight uppercase font-mono text-teal-300">
                Progres Kabel Bawah Tanah (*Ducting*)
              </h3>
              <p className="text-[10px] text-slate-400">
                Target penataan kawasan tertib utilitas Kota Lubuklinggau
              </p>
            </div>
          </div>
          <span className="text-sm font-black font-mono text-teal-400 bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-500/40">
            {metrics.ductingPercentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-700/60 h-2.5 rounded-full overflow-hidden flex">
          <div
            className="bg-gradient-to-r from-teal-400 to-cyan-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(metrics.ductingPercentage, 3)}%` }}
            title={`Bawah Tanah: ${metrics.ductingTotal} tiang`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium">
          <span>🕳️ Bawah Tanah / Riser: <strong>{metrics.ductingTotal}</strong> tiang</span>
          <span>⚡ Kabel Udara: <strong>{metrics.aerialCount}</strong> tiang</span>
        </div>
      </div>

      {/* 4. Filter Chips Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="w-3 h-3 text-blue-600" />
            <span>Kategori Masalah Lapangan</span>
          </span>
          {(activeIssueFilter !== 'ALL_ISSUES' ||
            selectedProvider !== 'ALL' ||
            selectedKecamatan !== 'ALL' ||
            searchQuery) && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-[10px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setActiveIssueFilter('ALL_ISSUES')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              activeIssueFilter === 'ALL_ISSUES'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>Semua Temuan Bahaya ({metrics.totalIssuesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveIssueFilter('MESSY_CABLE')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              activeIssueFilter === 'MESSY_CABLE'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            <span>⚠️ Kabel Semrawut ({metrics.messyCableCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveIssueFilter('LOW_CABLE')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              activeIssueFilter === 'LOW_CABLE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
            }`}
          >
            <span>🚨 Kabel Rendah ({metrics.lowCableCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveIssueFilter('TILTED')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              activeIssueFilter === 'TILTED'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200'
            }`}
          >
            <span>📐 Tiang Miring ({metrics.tiltedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveIssueFilter('CORRODED')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              activeIssueFilter === 'CORRODED'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>🧱 Karat/Keropos ({metrics.corrodedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveIssueFilter('OBSTRUCTING')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              activeIssueFilter === 'OBSTRUCTING'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
            }`}
          >
            <span>🚶 Halangi Trotoar ({metrics.obstructingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveIssueFilter('PJU_BROKEN')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              activeIssueFilter === 'PJU_BROKEN'
                ? 'bg-yellow-500 text-slate-950 shadow-xs font-black'
                : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-900 border border-yellow-200'
            }`}
          >
            <span>💡 PJU Mati/Rusak ({metrics.pjuBrokenCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveIssueFilter('UNDERGROUND')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              activeIssueFilter === 'UNDERGROUND'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
            }`}
          >
            <span>🕳️ Bawah Tanah ({metrics.ductingTotal})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveIssueFilter('ALL_POLES')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
              activeIssueFilter === 'ALL_POLES'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>Semua Tiang ({metrics.totalPoles})</span>
          </button>
        </div>
      </div>

      {/* 5. Search Bar & Dropdown Selectors */}
      <div className="bg-white rounded-3xl p-3 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-2">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari jalan, kelurahan, kode tiang, atau provider..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
          />
        </div>

        {/* Dropdowns for Provider & Kecamatan */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <select
              value={selectedKecamatan}
              onChange={(e) => setSelectedKecamatan(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">Semua 8 Kecamatan</option>
              {KECAMATAN_LUBUKLINGGAU.map((kec) => (
                <option key={kec.name} value={kec.name}>
                  {kec.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 outline-none focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">Semua Provider / Instansi</option>
              {providers.map((prv) => (
                <option key={prv.id} value={prv.id}>
                  {prv.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 6. Filter Summary Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
        <span>
          Menampilkan <strong className="text-slate-900 font-bold">{filteredPoles.length}</strong>{' '}
          titik infrastruktur
        </span>
        {activeIssueFilter !== 'ALL_ISSUES' && (
          <span className="text-[10px] text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full font-bold border border-blue-200">
            Filter Aktif
          </span>
        )}
      </div>

      {/* 7. Problem & Hazard Cards List */}
      {filteredPoles.length > 0 ? (
        <div className="space-y-3">
          {filteredPoles.map((pole) => {
            const isMessy = !!pole.isMessyCable;
            const isLow = !!pole.isLowCable;
            const isTilted = !!pole.isTilted;
            const isCorroded = !!pole.isCorroded;
            const isObstructing = !!pole.isObstructing;
            const isPjuBroken =
              !!pole.infrastructureCategory?.includes('PJU') &&
              !!pole.pjuLampCondition &&
              pole.pjuLampCondition !== 'MENYALA_NORMAL';

            return (
              <div
                key={pole.id}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.05)] hover:shadow-md transition-all space-y-3 relative overflow-hidden"
              >
                {/* Top Header: Pole Code & Badges */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black font-mono text-slate-900 tracking-tight">
                        {pole.poleCode || pole.id}
                      </span>
                      <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                        {pole.providerName || 'Provider'}
                      </span>
                      {pole.cableInstallationType === 'BAWAH_TANAH' ? (
                        <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          🕳️ Bawah Tanah
                        </span>
                      ) : pole.cableInstallationType === 'TRANSISI_RISER' ? (
                        <span className="text-[9px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                          ↕️ Riser
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          ⚡ Kabel Udara
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-700 leading-tight">
                      {pole.road}
                    </p>
                  </div>

                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-lg flex-shrink-0 ${
                      pole.condition === 'DAMAGED'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : pole.condition === 'NEEDS_REPAIR'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {pole.condition === 'DAMAGED'
                      ? 'RUSAK'
                      : pole.condition === 'NEEDS_REPAIR'
                      ? 'PERLU REPARASI'
                      : 'BAIK'}
                  </span>
                </div>

                {/* Location & Details with Photo Thumbnail */}
                <div className="flex items-start gap-3">
                  {/* Photo or Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                    {pole.photoUrl ? (
                      <img
                        src={pole.photoUrl}
                        alt={`Foto tiang ${pole.poleCode}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Cable className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1 text-xs">
                    <p className="text-[11px] text-slate-500 leading-snug">
                      📍 {pole.kelurahan}, {pole.kecamatan}
                    </p>
                    {pole.patokanLokasi && (
                      <p className="text-[10px] text-slate-600 font-medium italic">
                        Patokan: {pole.patokanLokasi}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>Tinggi: {pole.height || '7m'}</span>
                      <span>•</span>
                      <span>Jenis: {pole.poleType || 'BETON'}</span>
                      <span>•</span>
                      <span>Kordinat: {pole.poleLatitude.toFixed(5)}, {pole.poleLongitude.toFixed(5)}</span>
                    </div>
                  </div>
                </div>

                {/* Vivid Hazard Badges */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {isMessy && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200 flex items-center gap-1 shadow-2xs">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>Kabel Semrawut (Butuh Bundling)</span>
                    </span>
                  )}

                  {isLow && (
                    <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 flex items-center gap-1 shadow-2xs">
                      <Flame className="w-3 h-3 text-rose-600" />
                      <span>Kabel Rendah &lt; 4m (Bahaya Kendaraan)</span>
                    </span>
                  )}

                  {isTilted && (
                    <span className="text-[10px] font-bold text-orange-800 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-200 flex items-center gap-1 shadow-2xs">
                      <ShieldAlert className="w-3 h-3 text-orange-600" />
                      <span>Tiang Miring (Rawan Roboh)</span>
                    </span>
                  )}

                  {isCorroded && (
                    <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200 flex items-center gap-1">
                      <span>🧱 Keropos / Karat Fisik</span>
                    </span>
                  )}

                  {isObstructing && (
                    <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200 flex items-center gap-1">
                      <span>🚶 Halangi Trotoar / Akses</span>
                    </span>
                  )}

                  {isPjuBroken && (
                    <span className="text-[10px] font-bold text-yellow-900 bg-yellow-100 px-2.5 py-1 rounded-xl border border-yellow-300 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3 text-yellow-700" />
                      <span>Lampu PJU Padam / Rusak</span>
                    </span>
                  )}

                  {!isMessy &&
                    !isLow &&
                    !isTilted &&
                    !isCorroded &&
                    !isObstructing &&
                    !isPjuBroken && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Kondisi Kabel Normal &amp; Aman</span>
                      </span>
                    )}
                </div>

                {/* Field Notes (if any) */}
                {pole.description && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                    💬 <span className="font-semibold">Catatan Lapangan:</span> {pole.description}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <Link
                    href={`/map?lat=${pole.poleLatitude}&lng=${pole.poleLongitude}&pole=${pole.id}`}
                    className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Lihat di Peta</span>
                  </Link>

                  <Link
                    href={`/poles/${pole.id}/edit`}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Tindak Lanjut</span>
                  </Link>

                  <Link
                    href={`/poles/${pole.id}`}
                    className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center justify-center transition-all"
                    title="Detail Lengkap"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] text-center space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900">
              Tidak Ada Tiang Bermasalah pada Kategori Ini
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Semua tiang dan bentangan kabel pada filter ini berada dalam kondisi standar dan aman.
            </p>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
          >
            Tampilkan Semua Data
          </button>
        </div>
      )}
    </div>
  );
}
