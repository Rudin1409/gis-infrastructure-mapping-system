import React from 'react';
import Link from 'next/link';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import {
  PlusCircle,
  Search,
  MapPin,
  Calendar,
  Building2,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Layers,
  Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PolesListPage({
  searchParams,
}: {
  searchParams?: { q?: string; condition?: string; provider?: string };
}) {
  const poleRepo = getPoleRepository();
  const providerRepo = getProviderRepository();

  const [allPoles, providers] = await Promise.all([
    poleRepo.findAll(),
    providerRepo.findAll(),
  ]);

  const query = searchParams?.q?.toLowerCase() || '';
  const conditionFilter = searchParams?.condition || 'ALL';
  const providerFilter = searchParams?.provider || 'ALL';

  const filteredPoles = allPoles.filter((pole) => {
    if (conditionFilter !== 'ALL' && pole.condition !== conditionFilter) return false;
    if (providerFilter !== 'ALL' && pole.providerId !== providerFilter) return false;
    if (query) {
      const matchId = pole.id.toLowerCase().includes(query);
      const matchRoad = pole.road.toLowerCase().includes(query);
      const matchKecamatan = pole.kecamatan.toLowerCase().includes(query);
      const matchProvider = (pole.providerName || '').toLowerCase().includes(query);
      if (!matchId && !matchRoad && !matchKecamatan && !matchProvider) return false;
    }
    return true;
  });

  return (
    <div className="p-4 space-y-3.5 text-slate-800 font-sans pb-10 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Data Inventaris Tiang
          </h1>
          <p className="text-xs text-slate-500">
            Total <strong className="text-blue-600 font-mono">{filteredPoles.length} tiang</strong> terpetakan
          </p>
        </div>

        <Link
          href="/poles/new"
          className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Tambah</span>
        </Link>
      </div>

      {/* Search Input Bar */}
      <form method="GET" className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          name="q"
          defaultValue={searchParams?.q || ''}
          placeholder="Cari ID tiang, nama jalan, provider..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 shadow-sm focus:border-blue-500 outline-none transition-all font-medium"
        />
        {conditionFilter !== 'ALL' && (
          <input type="hidden" name="condition" value={conditionFilter} />
        )}
      </form>

      {/* Filter Badges Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        <Link
          href={`/poles${query ? `?q=${query}` : ''}`}
          className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
            conditionFilter === 'ALL'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Semua ({allPoles.length})
        </Link>

        <Link
          href={`/poles?condition=GOOD${query ? `&q=${query}` : ''}`}
          className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
            conditionFilter === 'GOOD'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          Baik
        </Link>

        <Link
          href={`/poles?condition=NEEDS_REPAIR${query ? `&q=${query}` : ''}`}
          className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
            conditionFilter === 'NEEDS_REPAIR'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          Perlu Cek / Servis
        </Link>

        <Link
          href={`/poles?condition=DAMAGED${query ? `&q=${query}` : ''}`}
          className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
            conditionFilter === 'DAMAGED'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          Rusak Parah
        </Link>
      </div>

      {/* Poles List */}
      <div className="space-y-2.5">
        {filteredPoles.map((pole) => {
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
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                    {pole.id}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[9px] font-bold uppercase">
                    {pole.poleType} ({pole.height || '7m'})
                  </span>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
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
                  <span>{pole.providerName || pole.providerId}</span>
                  {pole.poleCode && (
                    <span className="text-[10px] text-slate-400 font-mono">({pole.poleCode})</span>
                  )}
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
                  <span>{pole.surveyDate}</span>
                </span>

                <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                  <span>Lihat Detail Lengkap</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredPoles.length === 0 && (
        <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">Belum Ada Data Tiang Sesuai Filter</h3>
          <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
            Coba ganti filter status di atas atau input data tiang baru dari lapangan.
          </p>
          <Link
            href="/poles/new"
            className="inline-flex items-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Input Tiang Baru</span>
          </Link>
        </div>
      )}
    </div>
  );
}
