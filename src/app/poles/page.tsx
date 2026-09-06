import React from 'react';
import Link from 'next/link';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import { Database, Map, PlusCircle, ShieldCheck } from 'lucide-react';
import PoleListFilterClient from '@/components/survey/PoleListFilterClient';

export const dynamic = 'force-dynamic';

export default async function PolesListPage({
  searchParams,
}: {
  searchParams?: {
    q?: string;
    kecamatan?: string;
    kelurahan?: string;
    provider?: string;
    condition?: string;
  };
}) {
  const poleRepo = getPoleRepository();
  const providerRepo = getProviderRepository();

  const [allPoles, providers] = await Promise.all([poleRepo.findAll(), providerRepo.findAll()]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-24 animate-in fade-in duration-150">
      <div className="bg-slate-950 text-white px-4 sm:px-6 py-6 rounded-b-[34px] shadow-2xl shadow-slate-950/35">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>KATALOG INVENTARIS</span>
              <span className="text-slate-500">•</span>
              <span>Lubuklinggau</span>
            </div>
            <h1 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Katalog Data Tiang
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
              Daftar inventaris tiang lengkap dengan provider, lokasi, kondisi fisik, dan koordinat
              lapangan.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Link
              href="/map"
              className="flex-1 sm:flex-none py-2.5 px-4 bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-slate-100 font-bold text-xs rounded-2xl border border-slate-700/80 flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Map className="w-4 h-4 text-cyan-400" />
              <span className="whitespace-nowrap">Peta GIS</span>
            </Link>
            <Link
              href="/poles/new"
              className="flex-1 sm:flex-none py-2.5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-black text-xs rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all border border-blue-400/30"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="whitespace-nowrap">Tambah Data</span>
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-3 gap-2.5 mt-5">
          <div className="rounded-2xl bg-white/95 text-slate-900 p-3 border border-white/70">
            <Database className="w-4 h-4 text-blue-600" />
            <p className="mt-2 text-xl font-black font-mono leading-none">{allPoles.length}</p>
            <span className="text-[10px] font-bold text-slate-500">Total tiang</span>
          </div>
          <div className="rounded-2xl bg-white/95 text-slate-900 p-3 border border-white/70">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <p className="mt-2 text-xl font-black font-mono leading-none">
              {allPoles.filter((pole) => pole.condition === 'GOOD').length}
            </p>
            <span className="text-[10px] font-bold text-slate-500">Kondisi baik</span>
          </div>
          <div className="rounded-2xl bg-white/95 text-slate-900 p-3 border border-white/70">
            <Database className="w-4 h-4 text-amber-600" />
            <p className="mt-2 text-xl font-black font-mono leading-none">
              {allPoles.filter((pole) => pole.condition !== 'GOOD').length}
            </p>
            <span className="text-[10px] font-bold text-slate-500">Perlu audit</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-2 relative z-10">
        <PoleListFilterClient
          initialPoles={allPoles}
          providers={providers}
          initialQuery={searchParams?.q}
          initialKecamatan={searchParams?.kecamatan}
          initialKelurahan={searchParams?.kelurahan}
          initialProvider={searchParams?.provider}
          initialCondition={searchParams?.condition}
        />
      </div>
    </div>
  );
}
