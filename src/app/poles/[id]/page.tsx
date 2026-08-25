import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import MiniMap from '@/components/map/MiniMap';
import { formatDistance } from '@/lib/gis/haversine';
import {
  ChevronLeft,
  MapPin,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  Locate,
  Layers,
  Map,
  FileText,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Edit,
  Pencil,
  Trash2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PoleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const poleRepo = getPoleRepository();
  const pole = await poleRepo.findById(params.id);

  if (!pole) {
    notFound();
  }

  return (
    <div className="p-4 space-y-3.5 text-slate-800 font-sans pb-24">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between pt-1">
        <Link
          href="/poles"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 py-1.5 px-3 rounded-xl bg-white border border-slate-200 shadow-xs transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/poles/${pole.id}/edit`}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-2xs transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Data &amp; Titik</span>
          </Link>

          <Link
            href={`/map?search=${pole.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-white py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-xs transition-all"
          >
            <Map className="w-3.5 h-3.5" />
            <span>Peta</span>
          </Link>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-black font-mono text-slate-900 tracking-tight">
                {pole.id}
              </h1>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[10px] font-bold uppercase">
                {pole.poleType}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{pole.providerName || pole.providerId}</span>
              {pole.poleCode && (
                <span className="text-[10px] text-slate-400 font-mono">({pole.poleCode})</span>
              )}
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
            <span>
              {pole.condition === 'GOOD'
                ? 'Kondisi Baik'
                : pole.condition === 'NEEDS_REPAIR'
                ? 'Perlu Servis'
                : 'Rusak Parah'}
            </span>
          </span>
        </div>

        {/* Quick Specs Pill Row */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100 text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Tinggi</span>
            <span className="font-bold text-slate-900 mt-0.5 block">{pole.height || '7m'}</span>
          </div>

          <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100 text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Sisi Jalan</span>
            <span className="font-bold text-slate-900 mt-0.5 block capitalize">
              {pole.sisiJalan?.toLowerCase() || 'Kiri'}
            </span>
          </div>

          <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100 text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Kepemilikan</span>
            <span className="font-bold text-slate-900 mt-0.5 block capitalize">
              {pole.ownershipStatus === 'BERSAMA_PLN' ? 'Joint PLN' : pole.ownershipStatus || 'Sendiri'}
            </span>
          </div>
        </div>
      </div>

      {/* Safety Hazards Warning Card (If any) */}
      {(pole.isTilted || pole.isMessyCable || pole.isLowCable || pole.isHazardous || pole.isCorroded || pole.isObstructing) && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-3xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Catatan Bahaya &amp; Kondisi Lapangan:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pole.isTilted && (
              <span className="px-2 py-0.5 bg-white text-amber-900 text-[10px] font-bold rounded-lg border border-amber-200 shadow-2xs">
                ⚠️ Tiang Miring
              </span>
            )}
            {pole.isMessyCable && (
              <span className="px-2 py-0.5 bg-white text-amber-900 text-[10px] font-bold rounded-lg border border-amber-200 shadow-2xs">
                🔌 Kabel Semrawut
              </span>
            )}
            {pole.isLowCable && (
              <span className="px-2 py-0.5 bg-white text-rose-900 text-[10px] font-bold rounded-lg border border-rose-200 shadow-2xs">
                🚨 Kabel Rendah Menjuntai
              </span>
            )}
            {pole.isCorroded && (
              <span className="px-2 py-0.5 bg-white text-amber-900 text-[10px] font-bold rounded-lg border border-amber-200 shadow-2xs">
                ⚙️ Karat / Retak
              </span>
            )}
            {pole.isObstructing && (
              <span className="px-2 py-0.5 bg-white text-amber-900 text-[10px] font-bold rounded-lg border border-amber-200 shadow-2xs">
                🚧 Mengganggu Jalan/Trotoar
              </span>
            )}
          </div>
        </div>
      )}

      {/* Photo Preview & Mini Map */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Photo Container */}
        <div className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              <span>Foto Lapangan</span>
            </h2>
            {pole.photoUrl && (
              <a
                href={pole.photoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-0.5"
              >
                <span>Lihat HD</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>

          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80">
            {pole.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pole.photoUrl}
                alt={`Tiang ${pole.id}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <Camera className="w-8 h-8 stroke-1 mb-1" />
                <span className="text-xs font-medium">Foto belum tersedia</span>
              </div>
            )}
          </div>
        </div>

        {/* Mini Map Container */}
        <div className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Posisi Koordinat GIS</span>
            </h2>
            <Link
              href={`/poles/${pole.id}/edit`}
              className="text-[10px] text-blue-600 font-bold hover:underline"
            >
              Atur Titik 📍
            </Link>
          </div>

          <div className="h-48 rounded-2xl overflow-hidden border border-slate-200/80 relative">
            <MiniMap
              coord={{ lat: pole.poleLatitude, lng: pole.poleLongitude }}
              condition={pole.condition}
              poleId={pole.id}
            />
          </div>
        </div>
      </div>

      {/* Details Specs Table */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-2.5">
        <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>Informasi Lokasi &amp; Keterangan</span>
        </h2>

        <div className="space-y-2 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">
              Nama Jalan / Patokan Lokasi
            </span>
            <span className="font-bold text-slate-900">{pole.road}</span>
            {pole.patokanLokasi && (
              <span className="text-[11px] text-slate-500 block">Patokan: {pole.patokanLokasi}</span>
            )}
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">
              Wilayah Administratif
            </span>
            <span className="font-bold text-slate-900">
              Kel. {pole.kelurahan}, Kec. {pole.kecamatan}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">
              Koordinat Presisi GIS
            </span>
            <span className="font-mono font-bold text-emerald-600">
              {pole.poleLatitude.toFixed(6)}, {pole.poleLongitude.toFixed(6)}
            </span>
          </div>

          {pole.description && (
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-0.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Catatan Lapangan
              </span>
              <span className="text-slate-600 italic">
                &ldquo;{pole.description}&rdquo;
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quality Control & Audit Trail */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-2">
        <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Audit Trail Survey</span>
        </h2>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 text-[10px] block">Akurasi GPS</span>
            <span className="font-bold text-slate-900 font-mono">
              {pole.gpsAccuracy ? `±${pole.gpsAccuracy.toFixed(1)}m` : '-'}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 text-[10px] block">Jarak Deviasi</span>
            <span className="font-bold text-emerald-600 font-mono">
              {formatDistance(pole.distanceFromDevice || 0)}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 text-[10px] block">Tanggal Survey</span>
            <span className="font-bold text-slate-900">{pole.surveyDate}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 text-[10px] block">Petugas Surveyor</span>
            <span className="font-bold text-blue-600 truncate block">
              {pole.surveyorName || 'Surveyor 1'}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Bottom Quick Action Bar for Pole Detail */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[406px] z-40 bg-white/95 backdrop-blur-2xl border border-slate-200/80 shadow-[0_12px_40px_rgba(15,23,42,0.18)] rounded-3xl p-2 flex gap-2">
        <Link
          href={`/poles/${pole.id}/edit`}
          className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 transition-all"
        >
          <Pencil className="w-4 h-4" />
          <span>Edit &amp; Atur Titik Ulang</span>
        </Link>

        <Link
          href={`/map?search=${pole.id}`}
          className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <Map className="w-4 h-4 text-blue-600" />
          <span>Peta</span>
        </Link>
      </div>
    </div>
  );
}
