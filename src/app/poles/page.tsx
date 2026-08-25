import React from 'react';
import Link from 'next/link';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import { PlusCircle } from 'lucide-react';
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

  const [allPoles, providers] = await Promise.all([
    poleRepo.findAll(),
    providerRepo.findAll(),
  ]);

  return (
    <div className="p-4 space-y-3.5 text-slate-800 font-sans pb-16 animate-in fade-in duration-150">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Data Inventaris Tiang
          </h1>
          <p className="text-xs text-slate-500">
            Total <strong className="text-blue-600 font-mono">{allPoles.length} tiang</strong> terpetakan di Lubuklinggau
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

      {/* Interactive Multi-Dimensional Filter Client Component */}
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
  );
}
