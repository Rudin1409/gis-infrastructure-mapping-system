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
  Pencil,
  ShieldAlert,
  Clock,
  Navigation,
  Sparkles,
  Info,
  Check,
  X,
  Compass,
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

  // 6 Item Safety Checklist Status
  const safetyChecks = [
    {
      id: 'isTilted',
      label: 'Kemiringan Tiang',
      isHazard: !!pole.isTilted,
      hazardText: 'Tiang Miring',
      safeText: 'Tegak Normal',
      icon: AlertTriangle,
    },
    {
      id: 'isMessyCable',
      label: 'Kerapian Kabel FO',
      isHazard: !!pole.isMessyCable,
      hazardText: 'Kabel Semrawut',
      safeText: 'Rapi & Teratur',
      icon: Layers,
    },
    {
      id: 'isLowCable',
      label: 'Ketinggian Kabel',
      isHazard: !!pole.isLowCable,
      hazardText: 'Menjuntai Rendah (<4.5m)',
      safeText: 'Ketinggian Standar Aman',
      icon: AlertTriangle,
    },
    {
      id: 'isCorroded',
      label: 'Kondisi Material Fisik',
      isHazard: !!pole.isCorroded,
      hazardText: 'Karat / Retak / Keropos',
      safeText: 'Bebas Karat & Kokoh',
      icon: ShieldAlert,
    },
    {
      id: 'isObstructing',
      label: 'Akses Jalan / Trotoar',
      isHazard: !!pole.isObstructing,
      hazardText: 'Menghalangi Lalu Lintas/Trotoar',
      safeText: 'Bebas Hambatan Jalan',
      icon: Navigation,
    },
    {
      id: 'isHazardous',
      label: 'Potensi Bahaya Lainnya',
      isHazard: !!pole.isHazardous,
      hazardText: 'Terdapat Potensi Bahaya',
      safeText: 'Nihil Bahaya Tambahan',
      icon: ShieldAlert,
    },
  ];

  const totalHazards = safetyChecks.filter((s) => s.isHazard).length;

  return (
    <div className="p-4 space-y-4 text-slate-800 font-sans pb-24 animate-in fade-in duration-150">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between pt-1">
        <Link
          href="/poles"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 py-1.5 px-3 rounded-xl bg-white border border-slate-200 shadow-2xs transition-all"
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
            <span>Edit &amp; Atur Titik</span>
          </Link>

          <Link
            href={`/map?search=${pole.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-white py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-2xs transition-all"
          >
            <Map className="w-3.5 h-3.5" />
            <span>Peta</span>
          </Link>
        </div>
      </div>

      {/* Main Pole Header Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-black font-mono text-slate-900 tracking-tight">
                {pole.id}
              </h1>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-[10px] font-bold uppercase">
                Tiang {pole.poleType}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span>{pole.providerName || pole.providerId}</span>
              {pole.poleCode && (
                <span className="text-[10px] text-slate-400 font-mono">({pole.poleCode})</span>
              )}
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
              pole.condition === 'GOOD'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : pole.condition === 'NEEDS_REPAIR'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
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
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Tinggi Tiang</span>
            <span className="font-bold text-slate-900 mt-0.5 block">{pole.height || '7m'}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Sisi Jalan</span>
            <span className="font-bold text-slate-900 mt-0.5 block">
              {pole.sisiJalan === 'MEDIAN'
                ? 'Median Tengah'
                : pole.sisiJalan === 'KANAN'
                ? 'Kanan Jalan'
                : pole.sisiJalan === 'KIRI'
                ? 'Kiri Jalan'
                : 'Tidak Ditentukan'}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">Kepemilikan</span>
            <span className="font-bold text-slate-900 mt-0.5 block">
              {pole.ownershipStatus === 'BERSAMA_PLN'
                ? 'Joint PLN'
                : pole.ownershipStatus === 'SEWA'
                ? 'Sewa'
                : pole.ownershipStatus === 'SENDIRI'
                ? 'Sendiri'
                : 'Tidak Tahu'}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. RINCIAN LENGKAP 6 HASIL CEK KONDISI & KESELAMATAN LAPANGAN */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Hasil Pengamatan Kondisi &amp; Bahaya</span>
          </h2>

          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
              totalHazards > 0
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {totalHazards > 0 ? `${totalHazards} Peringatan Bahaya` : 'Semua Kondisi Aman'}
          </span>
        </div>

        {/* 6 Inspection Checklist Table */}
        <div className="grid grid-cols-1 gap-2 text-xs">
          {safetyChecks.map((item, idx) => (
            <div
              key={item.id}
              className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                item.isHazard
                  ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                  : 'bg-slate-50 border-slate-200/70 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] bg-white border border-slate-200 text-slate-600">
                  {idx + 1}
                </span>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">
                    {item.label}
                  </span>
                  <span className="font-bold text-xs text-slate-800">
                    {item.isHazard ? (
                      <span className="text-rose-700 flex items-center gap-1 font-black">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>{item.hazardText}</span>
                      </span>
                    ) : (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                        <span>{item.safeText}</span>
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase ${
                  item.isHazard
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {item.isHazard ? 'BAHAYA' : 'AMAN'}
              </span>
            </div>
          ))}
        </div>

        {/* Catatan Lapangan Khusus */}
        {pole.description && (
          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-1">
            <span className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1">
              <Info className="w-3 h-3" />
              <span>Catatan / Keterangan Tambahan Surveyor</span>
            </span>
            <p className="text-xs font-medium text-slate-700 italic">
              &ldquo;{pole.description}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. FOTO LAPANGAN & PETA INTERAKTIF                           */}
      {/* ============================================================ */}
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

      {/* ============================================================ */}
      {/* 4. INFORMASI LOKASI GEOGRAFIS & ADMINISTRATIF                */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-2.5">
        <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
          <FileText className="w-3.5 h-3.5 text-blue-600" />
          <span>Informasi Alamat &amp; Administratif</span>
        </h2>

        <div className="space-y-2 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-0.5">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">
              Nama Jalan / Lokasi
            </span>
            <span className="font-bold text-slate-900">{pole.road}</span>
            {pole.patokanLokasi && (
              <span className="text-[11px] text-slate-500 block">
                Patokan Gedung: <strong>{pole.patokanLokasi}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-0.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Kecamatan
              </span>
              <span className="font-bold text-slate-900">{pole.kecamatan}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-0.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Kelurahan
              </span>
              <span className="font-bold text-slate-900">{pole.kelurahan}</span>
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">
                Koordinat Presisi GIS
              </span>
              <span className="font-mono font-bold text-emerald-600 text-xs">
                {pole.poleLatitude.toFixed(6)}, {pole.poleLongitude.toFixed(6)}
              </span>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
              WGS84
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. AUDIT TRAIL, GPS & PETUGAS SURVEYOR                       */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-2.5">
        <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Audit Trail &amp; Verifikasi Lapangan</span>
        </h2>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 text-[10px] block font-bold uppercase">Akurasi GPS</span>
            <span className="font-bold text-slate-900 font-mono">
              {pole.gpsAccuracy ? `±${pole.gpsAccuracy.toFixed(1)}m` : 'GPS Presisi Tinggi'}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 text-[10px] block font-bold uppercase">Deviasi Titik</span>
            <span className="font-bold text-emerald-600 font-mono">
              {formatDistance(pole.distanceFromDevice || 0)}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 text-[10px] block font-bold uppercase">Waktu Survey</span>
            <span className="font-bold text-slate-900">
              {pole.surveyDate} {pole.surveyTime ? `(${pole.surveyTime})` : ''}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 text-[10px] block font-bold uppercase">Surveyor Lapangan</span>
            <span className="font-bold text-blue-600 truncate block">
              {pole.surveyorName || 'Surveyor 1 (Kominfo)'}
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
