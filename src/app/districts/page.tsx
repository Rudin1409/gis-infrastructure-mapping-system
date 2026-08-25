import React from 'react';
import Link from 'next/link';
import { KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import {
  MapPin,
  Map,
  Layers,
  ChevronRight,
  Database,
  Building,
  Navigation,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DistrictsPage() {
  const poleRepo = getPoleRepository();
  const allPoles = await poleRepo.findAll();

  // Compute pole counts per kecamatan
  const polesPerKecamatan: Record<string, number> = {};
  allPoles.forEach((p) => {
    polesPerKecamatan[p.kecamatan] = (polesPerKecamatan[p.kecamatan] || 0) + 1;
  });

  const totalKelurahan = KECAMATAN_LUBUKLINGGAU.reduce(
    (sum, k) => sum + k.kelurahan.length,
    0
  );

  return (
    <div className="p-4 space-y-4 text-slate-800 font-sans pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <MapPin className="w-5 h-5 text-purple-600" />
            <span>8 Kecamatan Kota Lubuklinggau</span>
          </h1>
          <p className="text-xs text-slate-500">
            Cakupan administrasi wilayah inventarisasi GIS
          </p>
        </div>

        <Link
          href="/map"
          className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center gap-1 transition-all"
        >
          <Map className="w-4 h-4" />
          <span>Peta GIS</span>
        </Link>
      </div>

      {/* Summary Stat Banner */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_10px_rgba(15,23,42,0.04)] text-center">
          <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wider block">
            KECAMATAN
          </span>
          <span className="text-xl font-black text-slate-900 font-mono block mt-0.5">
            8
          </span>
          <span className="text-[9px] text-slate-400">Wilayah Induk</span>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_10px_rgba(15,23,42,0.04)] text-center">
          <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">
            KELURAHAN
          </span>
          <span className="text-xl font-black text-blue-600 font-mono block mt-0.5">
            {totalKelurahan}
          </span>
          <span className="text-[9px] text-slate-400">Total Kel/Desa</span>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_10px_rgba(15,23,42,0.04)] text-center">
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">
            TIANG GIS
          </span>
          <span className="text-xl font-black text-emerald-600 font-mono block mt-0.5">
            {allPoles.length}
          </span>
          <span className="text-[9px] text-slate-400">Titik Terpetakan</span>
        </div>
      </div>

      {/* Districts List */}
      <div className="space-y-3">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Daftar Kecamatan &amp; Kelurahan Resmi</span>
        </h2>

        {KECAMATAN_LUBUKLINGGAU.map((kec, index) => {
          const count = polesPerKecamatan[kec.name] || 0;

          return (
            <div
              key={kec.name}
              className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-mono font-black text-xs border border-purple-100 shadow-2xs">
                    0{index + 1}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      {kec.name}
                    </h3>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {kec.kelurahan.length} Kelurahan
                    </span>
                  </div>
                </div>

                <Link
                  href={`/poles?kecamatan=${encodeURIComponent(kec.name)}`}
                  className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all ${
                    count > 0
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 shadow-2xs'
                      : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  <span>{count} Tiang</span>
                </Link>
              </div>

              {/* Kelurahan Chips (Clickable to Filter) */}
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Kelurahan / Desa (Ketuk untuk filter):
                </span>
                <div className="flex flex-wrap gap-1">
                  {kec.kelurahan.map((kel) => (
                    <Link
                      key={kel}
                      href={`/poles?kecamatan=${encodeURIComponent(kec.name)}&kelurahan=${encodeURIComponent(kel)}`}
                      className="px-2.5 py-1 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 border border-slate-200/80 hover:border-purple-300 rounded-xl text-[10px] font-bold text-slate-700 transition-colors"
                    >
                      {kel}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href={`/map`}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Lihat di Peta Wilayah</span>
                </Link>

                <Link
                  href={`/poles?kecamatan=${encodeURIComponent(kec.name)}`}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                >
                  <span>Daftar Tiang</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
