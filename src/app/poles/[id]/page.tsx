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
    <div className="p-4 space-y-3.5 text-slate-800 font-sans pb-10">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between pt-1">
        <Link
          href="/poles"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 py-1.5 px-3 rounded-xl bg-white border border-slate-200 shadow-sm transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali</span>
        </Link>

        <Link
          href={`/map?search=${pole.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-white py-1.5 px-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all"
        >
          <Map className="w-4 h-4" />
          <span>Fokus Peta</span>
        </Link>
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
                ? 'Baik'
                : pole.condition === 'NEEDS_REPAIR'
                ? 'Perlu Servis'
                : 'Rusak'}
            </span>
          </span>
        </div>
      </div>

      {/* Grid: Photo & Map */}
      <div className="space-y-3.5">
        {/* Photo Container */}
        <div className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-blue-600" /> Dokumentasi Foto
          </span>

          {pole.photoUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-slate-100 group h-52 bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pole.photoUrl}
                alt={`Foto Tiang ${pole.id}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="h-44 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Camera className="w-7 h-7 mb-1.5 opacity-50" />
              <span>Foto belum tersedia</span>
            </div>
          )}
        </div>

        {/* Mini Map Location */}
        <div className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Posisi Koordinat GIS
          </span>
          <div className="rounded-2xl overflow-hidden border border-slate-200 h-48">
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
              Koordinat GIS
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
            <span className="text-slate-400 text-[10px] block">Status Validasi</span>
            <span className="font-bold text-blue-600">{pole.validationStatus}</span>
          </div>
        </div>
      </div>
    </div>
  );
}


