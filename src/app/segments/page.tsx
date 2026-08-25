import React from 'react';
import Link from 'next/link';
import { getSegmentRepository } from '@/repositories/GoogleSheetsSegmentRepository';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import {
  Cable,
  MapPin,
  Building2,
  ArrowRight,
  Info,
  Layers,
  Map,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SegmentsPage({
  searchParams,
}: {
  searchParams?: { q?: string; type?: string; provider?: string };
}) {
  const segmentRepo = getSegmentRepository();
  const poleRepo = getPoleRepository();

  const [segments, poles] = await Promise.all([
    segmentRepo.findAll(),
    poleRepo.findAll(),
  ]);

  const poleMap: Record<string, { road: string; kelurahan: string; providerName?: string }> = {};
  poles.forEach((p) => {
    poleMap[p.id] = {
      road: p.road,
      kelurahan: p.kelurahan,
      providerName: p.providerName,
    };
  });

  const query = searchParams?.q?.toLowerCase() || '';
  const typeFilter = searchParams?.type || 'ALL';

  const filteredSegments = segments.filter((seg) => {
    if (typeFilter !== 'ALL' && seg.installationType !== typeFilter) return false;
    if (query) {
      const matchId = seg.id.toLowerCase().includes(query);
      const matchCode = (seg.segmentCode || '').toLowerCase().includes(query);
      const matchFrom = seg.fromNodeId.toLowerCase().includes(query);
      const matchTo = seg.toNodeId.toLowerCase().includes(query);
      const matchProvider = (seg.providerName || '').toLowerCase().includes(query);
      const matchRoad =
        (poleMap[seg.fromNodeId]?.road || '').toLowerCase().includes(query) ||
        (poleMap[seg.toNodeId]?.road || '').toLowerCase().includes(query);

      if (!matchId && !matchCode && !matchFrom && !matchTo && !matchProvider && !matchRoad) {
        return false;
      }
    }
    return true;
  });

  const totalDistanceMeters = segments.reduce((sum, s) => sum + (s.estimatedDistance || 0), 0);
  const aerialCount = segments.filter((s) => s.installationType === 'AERIAL').length;
  const undergroundCount = segments.filter((s) => s.installationType === 'UNDERGROUND').length;

  return (
    <div className="p-4 space-y-4 text-slate-800 font-sans pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Cable className="w-4 h-4" />
            </div>
            <span>Jalur Kabel &amp; Topologi FO</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Inventarisasi bentangan kabel optik antar tiang se-Kota Lubuklinggau
          </p>
        </div>

        <Link
          href="/map"
          className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center gap-1 transition-all"
        >
          <Map className="w-4 h-4" />
          <span>Lihat di Peta</span>
        </Link>
      </div>

      {/* 4 Executive Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
            TOTAL SEGMEN
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-slate-900 font-mono">
              {segments.length}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">bentangan span</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">
            TOTAL PANJANG FO
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-blue-600 font-mono">
              {(totalDistanceMeters / 1000).toFixed(2)}
            </span>
            <span className="text-[10px] text-blue-600 font-bold">KM</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">
            KABEL UDARA (AERIAL)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-amber-600 font-mono">
              {aerialCount}
            </span>
            <span className="text-[10px] text-slate-400">
              ({segments.length ? Math.round((aerialCount / segments.length) * 100) : 0}%)
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
          <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wider block">
            BAWAH TANAH (DUCT)
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-purple-600 font-mono">
              {undergroundCount}
            </span>
            <span className="text-[10px] text-purple-600 font-medium">tertib kota</span>
          </div>
        </div>
      </div>

      {/* Educational Notice Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/80 rounded-2xl p-3 border border-blue-100 text-xs text-slate-700 flex items-start gap-2.5 shadow-xs">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-slate-900 text-[11px]">
            Fungsi Pendataan Jalur &amp; Topologi Kabel
          </p>
          <p className="text-[10px] leading-relaxed text-slate-600">
            Digunakan oleh Dinas Kominfo &amp; Bapenda untuk memantau <strong>kepadatan bentangan kabel FO</strong>, menghitung total retribusi panjang utilitas, serta mengidentifikasi kabel udara yang perlu dipindahkan ke bawah tanah (*ducting*).
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <form method="GET" className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          name="q"
          defaultValue={searchParams?.q || ''}
          placeholder="Cari ID jalur, ID tiang, provider, nama jalan..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 shadow-xs focus:border-blue-500 outline-none font-medium"
        />
        {typeFilter !== 'ALL' && <input type="hidden" name="type" value={typeFilter} />}
      </form>

      {/* Type Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        <Link
          href={`/segments${query ? `?q=${query}` : ''}`}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all ${
            typeFilter === 'ALL'
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Semua Jalur ({segments.length})
        </Link>

        <Link
          href={`/segments?type=AERIAL${query ? `&q=${query}` : ''}`}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all ${
            typeFilter === 'AERIAL'
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          🪂 Kabel Udara ({aerialCount})
        </Link>

        <Link
          href={`/segments?type=UNDERGROUND${query ? `&q=${query}` : ''}`}
          className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap border transition-all ${
            typeFilter === 'UNDERGROUND'
              ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          🚇 Bawah Tanah ({undergroundCount})
        </Link>
      </div>

      {/* Segments List */}
      <div className="space-y-3">
        {filteredSegments.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-2">
            <Cable className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Tidak Ada Jalur Ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Tidak ada data bentangan kabel yang cocok dengan pencarian atau filter yang dipilih.
            </p>
          </div>
        ) : (
          filteredSegments.map((seg) => {
            const fromInfo = poleMap[seg.fromNodeId];
            const toInfo = poleMap[seg.toNodeId];
            const isIdealSpan = seg.estimatedDistance <= 50;

            return (
              <div
                key={seg.id}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_14px_rgba(15,23,42,0.04)] space-y-3 hover:border-blue-200 transition-colors"
              >
                {/* Header: ID, Provider, Type Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-mono font-black text-xs border border-blue-100">
                      ⚡
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-xs text-slate-900">
                          {seg.id}
                        </span>
                        {seg.segmentCode && (
                          <span className="text-[10px] font-mono text-slate-400">
                            ({seg.segmentCode})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 block">
                        {seg.providerName || seg.providerId}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-black border flex items-center gap-1 ${
                      seg.installationType === 'UNDERGROUND'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {seg.installationType === 'UNDERGROUND' ? '🚇 Bawah Tanah' : '🪂 Kabel Udara'}
                  </span>
                </div>

                {/* Connection Span Visualizer */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    {/* From Pole */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-blue-600 uppercase block">
                        Titik Awal (Node 1)
                      </span>
                      <Link
                        href={`/poles/${seg.fromNodeId}`}
                        className="font-black text-slate-900 font-mono text-xs hover:underline block truncate"
                      >
                        📍 {seg.fromNodeId}
                      </Link>
                      <span className="text-[10px] text-slate-500 truncate block">
                        {fromInfo?.road || 'Lokasi Tiang'}
                      </span>
                    </div>

                    {/* Span Distance & Arrow */}
                    <div className="flex flex-col items-center px-3 flex-shrink-0">
                      <span className="text-[10px] font-mono font-black text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                        📏 {seg.estimatedDistance} m
                      </span>
                      <div className="w-16 h-0.5 bg-blue-300 relative my-1">
                        <ArrowRight className="w-3.5 h-3.5 text-blue-600 absolute -right-1 -top-1.5" />
                      </div>
                      <span
                        className={`text-[8px] font-bold ${
                          isIdealSpan ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {isIdealSpan ? 'Rentang Ideal' : 'Bentangan Panjang'}
                      </span>
                    </div>

                    {/* To Pole */}
                    <div className="flex-1 min-w-0 text-right">
                      <span className="text-[9px] font-bold text-emerald-600 uppercase block">
                        Titik Akhir (Node 2)
                      </span>
                      <Link
                        href={`/poles/${seg.toNodeId}`}
                        className="font-black text-slate-900 font-mono text-xs hover:underline block truncate ml-auto"
                      >
                        📍 {seg.toNodeId}
                      </Link>
                      <span className="text-[10px] text-slate-500 truncate block ml-auto">
                        {toInfo?.road || 'Lokasi Tiang'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Specs & Description */}
                <div className="text-[11px] text-slate-600 flex items-center justify-between px-1">
                  <span className="font-semibold text-slate-700">
                    Tipe Kabel: <strong className="text-slate-900">Fiber Optic (FO)</strong>
                  </span>
                  <span className="flex items-center gap-1 font-bold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Status Aktif
                  </span>
                </div>

                {seg.description && (
                  <p className="text-[10px] text-slate-600 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                    &ldquo;{seg.description}&rdquo;
                  </p>
                )}

                {/* Action Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/map`}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Sorot Jalur di Peta GIS</span>
                  </Link>

                  <span className="text-[10px] font-mono text-slate-400">
                    ID: {seg.id}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
