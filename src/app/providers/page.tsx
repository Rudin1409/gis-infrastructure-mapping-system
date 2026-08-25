import React from 'react';
import Link from 'next/link';
import { DEFAULT_PROVIDERS } from '@/config/providers';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
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
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProvidersPage() {
  const poleRepo = getPoleRepository();
  const allPoles = await poleRepo.findAll();

  // Count poles per provider
  const poleCountPerProvider: Record<string, number> = {};
  allPoles.forEach((p) => {
    poleCountPerProvider[p.providerId] = (poleCountPerProvider[p.providerId] || 0) + 1;
  });

  return (
    <div className="p-4 space-y-4 text-slate-800 font-sans pb-12">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>Katalog Provider &amp; Ciri Tiang</span>
          </h1>
          <p className="text-xs text-slate-500">
            Daftar operator &amp; panduan visual marka tiang
          </p>
        </div>

        <Link
          href="/poles/new"
          className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center gap-1 transition-all"
        >
          <span>Survei</span>
        </Link>
      </div>

      {/* Official Reference Infographic Banner */}
      <div className="bg-slate-950 rounded-3xl p-3 border border-slate-800 shadow-md space-y-2 text-white">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
            <span>Infografis Ciri Fisik Marka Tiang (1 - 20)</span>
          </span>
          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
            Standar Nasional
          </span>
        </div>

        <div className="rounded-2xl overflow-hidden bg-black border border-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/provider-pole-guide.jpg"
            alt="Panduan Ciri Warna Tiang Provider"
            className="w-full h-auto object-contain max-h-48 mx-auto"
          />
        </div>
      </div>

      {/* Provider List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-blue-600" />
            <span>Daftar Ciri Marka per Provider ({DEFAULT_PROVIDERS.length})</span>
          </h2>
          <span className="text-[10px] text-slate-500">
            Total {allPoles.length} Tiang Terdata
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {DEFAULT_PROVIDERS.map((prov, index) => {
            const count = poleCountPerProvider[prov.id] || 0;

            return (
              <div
                key={prov.id}
                className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex items-center justify-between gap-3 hover:border-blue-200 transition-colors"
              >
                {/* Visual SVG Mini Graphic */}
                <div className="w-10 h-16 p-1 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <PoleMiniGraphic provider={prov} height={52} />
                </div>

                {/* Provider Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                      {prov.code}
                    </span>
                    <h3 className="text-xs font-black text-slate-900 truncate">
                      {prov.name}
                    </h3>
                  </div>

                  <p className="text-[10px] text-slate-600 leading-snug">
                    {prov.markingDescription}
                  </p>

                  <div className="mt-1.5 flex items-center gap-2">
                    <Link
                      href={`/poles?q=${encodeURIComponent(prov.code)}`}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                    >
                      <Database className="w-3 h-3" />
                      <span>{count} Tiang Terdata</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
