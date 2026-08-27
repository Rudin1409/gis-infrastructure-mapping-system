'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Pole } from '@/types/pole';
import { Provider } from '@/types/provider';
import { KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';
import { formatIndonesianDate } from '@/lib/utils/formatDate';
import { useSupabaseRealtimePoles } from '@/hooks/useSupabaseRealtimePoles';
import {
  Search,
  Filter,
  X,
  RotateCcw,
  Building2,
  MapPin,
  Calendar,
  ChevronRight,
  ShieldAlert,
  Layers,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Check,
} from 'lucide-react';

interface PoleListFilterClientProps {
  initialPoles: Pole[];
  providers: Provider[];
  initialQuery?: string;
  initialKecamatan?: string;
  initialKelurahan?: string;
  initialProvider?: string;
  initialCondition?: string;
}

export default function PoleListFilterClient({
  initialPoles,
  providers,
  initialQuery,
  initialKecamatan,
  initialKelurahan,
  initialProvider,
  initialCondition,
}: PoleListFilterClientProps) {
  const { poles: livePoles } = useSupabaseRealtimePoles(initialPoles);

  // --- Filter States ---
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedProvider, setSelectedProvider] = useState(initialProvider || 'ALL');
  const [selectedKecamatan, setSelectedKecamatan] = useState(initialKecamatan || 'ALL');
  const [selectedKelurahan, setSelectedKelurahan] = useState(initialKelurahan || 'ALL');
  const [selectedCondition, setSelectedCondition] = useState(initialCondition || 'ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [hazardFilter, setHazardFilter] = useState<'ALL' | 'HAZARD_ONLY' | 'TILTED' | 'MESSY' | 'LOW'>('ALL');

  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal / Drawer State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Dynamic Kelurahan list for selected Kecamatan
  const currentKecamatanObj = useMemo(() => {
    return KECAMATAN_LUBUKLINGGAU.find((k) => k.name === selectedKecamatan);
  }, [selectedKecamatan]);

  const availableKelurahanList = currentKecamatanObj ? currentKecamatanObj.kelurahan : [];

  const handleKecamatanChange = (kec: string) => {
    setSelectedKecamatan(kec);
    setSelectedKelurahan('ALL');
    setCurrentPage(1);
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedProvider('ALL');
    setSelectedKecamatan('ALL');
    setSelectedKelurahan('ALL');
    setSelectedCondition('ALL');
    setSelectedType('ALL');
    setHazardFilter('ALL');
    setCurrentPage(1);
  };

  // Active filters count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'ALL') count++;
    if (selectedProvider !== 'ALL') count++;
    if (selectedKecamatan !== 'ALL') count++;
    if (selectedKelurahan !== 'ALL') count++;
    if (selectedCondition !== 'ALL') count++;
    if (selectedType !== 'ALL') count++;
    if (hazardFilter !== 'ALL') count++;
    return count;
  }, [
    selectedProvider,
    selectedKecamatan,
    selectedKelurahan,
    selectedCondition,
    selectedType,
    hazardFilter,
  ]);

  // Filtered Poles Computation
  const filteredPoles = useMemo(() => {
    return livePoles.filter((pole) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = pole.id.toLowerCase().includes(q);
        const matchCode = (pole.poleCode || '').toLowerCase().includes(q);
        const matchRoad = pole.road.toLowerCase().includes(q);
        const matchKec = pole.kecamatan.toLowerCase().includes(q);
        const matchKel = pole.kelurahan.toLowerCase().includes(q);
        const matchProvider = (pole.providerName || '').toLowerCase().includes(q);
        const matchDesc = (pole.description || '').toLowerCase().includes(q);

        if (
          !matchId &&
          !matchCode &&
          !matchRoad &&
          !matchKec &&
          !matchKel &&
          !matchProvider &&
          !matchDesc
        ) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'ALL') {
        const cat = pole.infrastructureCategory || 'FO_WIFI';
        if (cat !== selectedCategory) return false;
      }

      // 3. Provider Filter
      if (selectedProvider !== 'ALL') {
        if (pole.providerId !== selectedProvider) return false;
      }

      // 4. Kecamatan Filter
      if (selectedKecamatan !== 'ALL') {
        if (pole.kecamatan.toLowerCase() !== selectedKecamatan.toLowerCase()) return false;
      }

      // 5. Kelurahan Filter
      if (selectedKelurahan !== 'ALL') {
        if (pole.kelurahan.toLowerCase() !== selectedKelurahan.toLowerCase()) return false;
      }

      // 6. Condition Filter
      if (selectedCondition !== 'ALL') {
        if (pole.condition !== selectedCondition) return false;
      }

      // 7. Type Filter
      if (selectedType !== 'ALL') {
        if (pole.poleType !== selectedType) return false;
      }

      // 8. Hazard Filter
      if (hazardFilter === 'HAZARD_ONLY') {
        const isProblem =
          pole.isTilted ||
          pole.isMessyCable ||
          pole.isLowCable ||
          pole.isCorroded ||
          pole.isObstructing ||
          pole.isHazardous;
        if (!isProblem) return false;
      } else if (hazardFilter === 'TILTED' && !pole.isTilted) {
        return false;
      } else if (hazardFilter === 'MESSY' && !pole.isMessyCable) {
        return false;
      } else if (hazardFilter === 'LOW' && !pole.isLowCable) {
        return false;
      }

      return true;
    });
  }, [
    initialPoles,
    searchQuery,
    selectedCategory,
    selectedProvider,
    selectedKecamatan,
    selectedKelurahan,
    selectedCondition,
    selectedType,
    hazardFilter,
  ]);

  // Compute Total Pages & Slice Data
  const totalPages = Math.max(1, Math.ceil(filteredPoles.length / itemsPerPage));
  const paginatedPoles = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPoles.slice(start, start + itemsPerPage);
  }, [filteredPoles, currentPage, itemsPerPage]);

  return (
    <div className="space-y-3.5">
      {/* 1. Search Bar & Filter Drawer Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID, kode wilayah, provider, PJU, jalan..."
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 shadow-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsFilterModalOpen(true)}
          className={`px-3 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs border cursor-pointer flex-shrink-0 ${
            activeFiltersCount > 0
              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filter</span>
          {activeFiltersCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-white text-blue-700 text-[10px] font-black flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. Quick Horizontal Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        <button
          type="button"
          onClick={resetAllFilters}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeFiltersCount === 0 && !searchQuery
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Semua ({initialPoles.length})
        </button>

        {/* Quick Category Chips */}
        <button
          type="button"
          onClick={() => {
            setSelectedCategory(selectedCategory === 'PJU_MANDIRI' ? 'ALL' : 'PJU_MANDIRI');
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === 'PJU_MANDIRI'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          💡 PJU Mandiri
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory(selectedCategory === 'GABUNG_PLN_PJU' ? 'ALL' : 'GABUNG_PLN_PJU');
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === 'GABUNG_PLN_PJU'
              ? 'bg-cyan-600 text-white shadow-xs'
              : 'bg-cyan-50 text-cyan-900 border border-cyan-200 hover:bg-cyan-100'
          }`}
        >
          ⚡💡 Gabung PLN+PJU
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedCategory(selectedCategory === 'FO_WIFI' ? 'ALL' : 'FO_WIFI');
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedCategory === 'FO_WIFI'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100'
          }`}
        >
          🌐 Tiang FO/WiFi
        </button>

        {/* Quick Condition Chips */}
        <button
          type="button"
          onClick={() => {
            setSelectedCondition(selectedCondition === 'GOOD' ? 'ALL' : 'GOOD');
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedCondition === 'GOOD'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          🟢 Baik
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedCondition(selectedCondition === 'NEEDS_REPAIR' ? 'ALL' : 'NEEDS_REPAIR')
          }
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedCondition === 'NEEDS_REPAIR'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
          }`}
        >
          🟡 Perlu Servis
        </button>

        <button
          type="button"
          onClick={() =>
            setSelectedCondition(selectedCondition === 'DAMAGED' ? 'ALL' : 'DAMAGED')
          }
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            selectedCondition === 'DAMAGED'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
          }`}
        >
          🔴 Rusak Parah
        </button>

        {/* Quick Danger/Hazard Chip */}
        <button
          type="button"
          onClick={() =>
            setHazardFilter(hazardFilter === 'HAZARD_ONLY' ? 'ALL' : 'HAZARD_ONLY')
          }
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
            hazardFilter === 'HAZARD_ONLY'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
          }`}
        >
          ⚠️ Bahaya / Miring
        </button>
      </div>

      {/* 3. Active Filters Pill Display (if any) */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap p-2.5 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs animate-in fade-in">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mr-1">
            Filter Aktif:
          </span>

          {selectedCategory !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-slate-800 rounded-lg border border-blue-200 text-[11px] font-bold shadow-2xs">
              <span>
                Kategori: {
                  selectedCategory === 'PJU_MANDIRI'
                    ? '💡 PJU Mandiri'
                    : selectedCategory === 'GABUNG_PLN_PJU'
                    ? '⚡💡 PLN+PJU'
                    : selectedCategory === 'PLN_MURNI'
                    ? '⚡ PLN Listrik'
                    : '🌐 FO/WiFi'
                }
              </span>
              <button onClick={() => setSelectedCategory('ALL')} className="hover:text-rose-600 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedProvider !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-slate-800 rounded-lg border border-blue-200 text-[11px] font-bold shadow-2xs">
              <span>
                Provider: {providers.find((p) => p.id === selectedProvider)?.name.split('.')[1] || selectedProvider}
              </span>
              <button onClick={() => setSelectedProvider('ALL')} className="hover:text-rose-600 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedKecamatan !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-slate-800 rounded-lg border border-blue-200 text-[11px] font-bold shadow-2xs">
              <span>Kec: {selectedKecamatan.replace('Lubuklinggau', '')}</span>
              <button onClick={() => setSelectedKecamatan('ALL')} className="hover:text-rose-600 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedKelurahan !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-slate-800 rounded-lg border border-blue-200 text-[11px] font-bold shadow-2xs">
              <span>Kel: {selectedKelurahan}</span>
              <button onClick={() => setSelectedKelurahan('ALL')} className="hover:text-rose-600 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {selectedType !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-slate-800 rounded-lg border border-blue-200 text-[11px] font-bold shadow-2xs">
              <span>Jenis: {selectedType}</span>
              <button onClick={() => setSelectedType('ALL')} className="hover:text-rose-600 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={resetAllFilters}
            className="text-[10px] font-bold text-rose-600 hover:underline ml-auto flex items-center gap-0.5 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      )}

      {/* 4. Results List of Poles */}
      <div className="space-y-2.5">
        {filteredPoles.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-2 shadow-xs">
            <span className="text-3xl block">🔍</span>
            <h3 className="text-sm font-black text-slate-800">
              Tidak Ada Data Tiang yang Cocok
            </h3>
            <p className="text-xs text-slate-500">
              Coba sesuaikan kata kunci pencarian atau ubah pilihan filter Anda.
            </p>
            <button
              onClick={resetAllFilters}
              className="mt-2 py-2 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Reset Semua Filter
            </button>
          </div>
        ) : (
          paginatedPoles.map((pole) => {
            const hasHazards =
              pole.isTilted ||
              pole.isMessyCable ||
              pole.isLowCable ||
              pole.isCorroded ||
              pole.isObstructing ||
              pole.isHazardous;

            return (
              <Link
                key={pole.id}
                href={`/poles/${pole.id}`}
                className="block bg-white rounded-3xl p-4 shadow-[0_2px_12px_rgba(15,23,42,0.04)] border border-slate-100 active:scale-[0.99] hover:shadow-md transition-all group space-y-2.5"
              >
                {/* Card Top */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 shadow-2xs">
                      {pole.poleCode || pole.id}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-mono font-bold">
                      {pole.id}
                    </span>
                    {/* Category Badge */}
                    {pole.infrastructureCategory === 'PJU_MANDIRI' ? (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-md text-[9px] font-bold">
                        💡 PJU Mandiri
                      </span>
                    ) : pole.infrastructureCategory === 'GABUNG_PLN_PJU' ? (
                      <span className="px-2 py-0.5 bg-cyan-50 text-cyan-900 border border-cyan-200 rounded-md text-[9px] font-bold">
                        ⚡💡 PLN+PJU
                      </span>
                    ) : pole.infrastructureCategory === 'PLN_MURNI' ? (
                      <span className="px-2 py-0.5 bg-sky-50 text-sky-900 border border-sky-200 rounded-md text-[9px] font-bold">
                        ⚡ PLN Listrik
                      </span>
                    ) : null}

                    {/* Cable Type Badge (if underground or riser) */}
                    {pole.cableInstallationType === 'BAWAH_TANAH' ? (
                      <span className="px-2 py-0.5 bg-amber-100/80 text-amber-950 border border-amber-300 rounded-md text-[9px] font-bold">
                        🕳️ Bawah Tanah
                      </span>
                    ) : pole.cableInstallationType === 'TRANSISI_RISER' ? (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-md text-[9px] font-bold">
                        ↕️ Riser Pole
                      </span>
                    ) : null}

                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[9px] font-bold uppercase">
                      {pole.poleType} ({pole.height || '7m'})
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0 ${
                      pole.condition === 'GOOD'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : pole.condition === 'NEEDS_REPAIR'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        pole.condition === 'GOOD'
                          ? 'bg-emerald-500'
                          : pole.condition === 'NEEDS_REPAIR'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    {pole.condition === 'GOOD'
                      ? 'Kondisi Baik'
                      : pole.condition === 'NEEDS_REPAIR'
                      ? 'Perlu Servis'
                      : 'Rusak Parah'}
                  </span>
                </div>

                {/* Provider & Street */}
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span className="truncate">{pole.providerName || pole.providerId}</span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{pole.road}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 pl-5">
                    Kel. {pole.kelurahan}, Kec. {pole.kecamatan}
                  </div>
                </div>

                {/* Hazard Tags (If any) */}
                {hasHazards && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {pole.isTilted && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-900 text-[9px] font-bold rounded-lg border border-amber-200">
                        ⚠️ Miring
                      </span>
                    )}
                    {pole.isMessyCable && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-900 text-[9px] font-bold rounded-lg border border-amber-200">
                        🔌 Kabel Semrawut
                      </span>
                    )}
                    {pole.isLowCable && (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-900 text-[9px] font-bold rounded-lg border border-rose-200">
                        🚨 Kabel Rendah
                      </span>
                    )}
                    {pole.isCorroded && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-900 text-[9px] font-bold rounded-lg border border-amber-200">
                        ⚙️ Karat/Retak
                      </span>
                    )}
                    {pole.isObstructing && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-900 text-[9px] font-bold rounded-lg border border-amber-200">
                        🚧 Ganggu Trotoar
                      </span>
                    )}
                  </div>
                )}

                {/* GPS Coordinates Bar */}
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 text-[10px] font-mono text-slate-600 flex items-center justify-between">
                  <span>{pole.poleLatitude.toFixed(5)}, {pole.poleLongitude.toFixed(5)}</span>
                  <span className="text-slate-500 font-sans">
                    {pole.gpsAccuracy ? `±${pole.gpsAccuracy.toFixed(1)}m` : 'GPS OK'}
                  </span>
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{formatIndonesianDate(pole.createdAt || pole.surveyDate, pole.surveyTime)}</span>
                  </span>

                  <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>Lihat Detail Lengkap</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* 4.5 Pagination Controls Bar */}
      {filteredPoles.length > 0 && (
        <div className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="text-[11px] text-slate-500 font-medium">
            Menampilkan <strong className="text-slate-900 font-mono">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredPoles.length)}</strong> dari <strong className="text-blue-600 font-mono">{filteredPoles.length}</strong> tiang
          </div>

          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            {/* Items Per Page Selector */}
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 outline-none"
            >
              <option value={5}>5 / hal</option>
              <option value={10}>10 / hal</option>
              <option value={20}>20 / hal</option>
              <option value={50}>50 / hal</option>
            </select>

            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold text-slate-700 transition-all cursor-pointer"
            >
              ← Prev
            </button>

            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl font-mono font-bold text-xs">
              Hal {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none font-bold text-slate-700 transition-all cursor-pointer"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 5. FILTER MODAL DRAWER (LENGKAP: PROVIDER, KEC, KEL, JENIS, DLL) */}
      {/* ================================================================= */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col space-y-4 animate-in slide-in-from-bottom-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Filter Data Inventaris Tiang
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Saring berdasarkan instansi, lokasi spasial &amp; kondisi
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-xs">
              {/* 0. Filter Kategori Infrastruktur */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  🏛️ Kategori Infrastruktur Tiang
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'ALL', label: 'Semua Kategori' },
                    { id: 'PJU_MANDIRI', label: '💡 PJU Mandiri' },
                    { id: 'GABUNG_PLN_PJU', label: '⚡💡 Gabung PLN+PJU' },
                    { id: 'FO_WIFI', label: '🌐 Tiang FO / WiFi' },
                    { id: 'PLN_MURNI', label: '⚡ Tiang PLN Listrik' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(c.id);
                        setCurrentPage(1);
                      }}
                      className={`p-2 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer ${
                        selectedCategory === c.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. Filter Provider */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  🏢 Operator Provider / Pemilik Aset
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all"
                >
                  <option value="ALL">Semua Provider ({providers.length} Operator)</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Filter Kecamatan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  📍 Kecamatan di Kota Lubuklinggau
                </label>
                <select
                  value={selectedKecamatan}
                  onChange={(e) => handleKecamatanChange(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all"
                >
                  <option value="ALL">Semua Kecamatan (8 Kecamatan)</option>
                  {KECAMATAN_LUBUKLINGGAU.map((k) => (
                    <option key={k.name} value={k.name}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Filter Kelurahan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  🏘️ Kelurahan / Desa
                </label>
                <select
                  disabled={selectedKecamatan === 'ALL'}
                  value={selectedKelurahan}
                  onChange={(e) => setSelectedKelurahan(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-semibold outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50 disabled:bg-slate-100"
                >
                  <option value="ALL">
                    {selectedKecamatan === 'ALL'
                      ? 'Pilih Kecamatan terlebih dahulu'
                      : 'Semua Kelurahan di Kecamatan ini'}
                  </option>
                  {availableKelurahanList.map((kel) => (
                    <option key={kel} value={kel}>
                      Kel. {kel}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Filter Kondisi Fisik */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  ⚙️ Kondisi Fisik Tiang
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCondition('GOOD')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      selectedCondition === 'GOOD'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🟢 Baik
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCondition('NEEDS_REPAIR')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      selectedCondition === 'NEEDS_REPAIR'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🟡 Perlu Servis
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCondition('DAMAGED')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      selectedCondition === 'DAMAGED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🔴 Rusak Parah
                  </button>
                </div>
              </div>

              {/* 5. Filter Jenis Material Tiang */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  🏗️ Jenis Material Tiang
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['ALL', 'BESI', 'BETON', 'KAYU'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedType(t)}
                      className={`py-2 px-1 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer ${
                        selectedType === t
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {t === 'ALL' ? 'Semua' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Filter Potensi Bahaya */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  ⚠️ Status Masalah Lapangan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHazardFilter(hazardFilter === 'TILTED' ? 'ALL' : 'TILTED')}
                    className={`p-2 rounded-xl border text-left font-bold text-[11px] transition-all cursor-pointer flex items-center justify-between ${
                      hazardFilter === 'TILTED'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>⚠️ Tiang Miring</span>
                    {hazardFilter === 'TILTED' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setHazardFilter(hazardFilter === 'MESSY' ? 'ALL' : 'MESSY')}
                    className={`p-2 rounded-xl border text-left font-bold text-[11px] transition-all cursor-pointer flex items-center justify-between ${
                      hazardFilter === 'MESSY'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>🔌 Kabel Semrawut</span>
                    {hazardFilter === 'MESSY' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setHazardFilter(hazardFilter === 'LOW' ? 'ALL' : 'LOW')}
                    className={`p-2 rounded-xl border text-left font-bold text-[11px] transition-all cursor-pointer flex items-center justify-between ${
                      hazardFilter === 'LOW'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>🚨 Kabel Rendah</span>
                    {hazardFilter === 'LOW' && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setHazardFilter(hazardFilter === 'HAZARD_ONLY' ? 'ALL' : 'HAZARD_ONLY')
                    }
                    className={`p-2 rounded-xl border text-left font-bold text-[11px] transition-all cursor-pointer flex items-center justify-between ${
                      hazardFilter === 'HAZARD_ONLY'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>🔥 Semua Bahaya</span>
                    {hazardFilter === 'HAZARD_ONLY' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={resetAllFilters}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors cursor-pointer"
              >
                Reset Semua
              </button>

              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer text-center"
              >
                Terapkan Filter ({filteredPoles.length} Tiang Cocok)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
