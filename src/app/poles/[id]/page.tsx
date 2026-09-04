import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import MiniMap from '@/components/map/MiniMap';
import { formatDistance } from '@/lib/gis/haversine';
import { PoleMiniGraphic } from '@/components/survey/PoleVisualGuideModal';
import { formatGoogleDriveImageUrl, getGoogleDriveThumbnailUrl } from '@/lib/utils/driveImage';
import { formatIndonesianDate } from '@/lib/utils/formatDate';
import PoleDetailActions from '@/components/survey/PoleDetailActions';
import BackButton from '@/components/common/BackButton';
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
  Info,
  Check,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

import { DEFAULT_PROVIDERS, resolveProviderInfo } from '@/config/providers';

export default async function PoleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const poleRepo = getPoleRepository();
  const providerRepo = getProviderRepository();

  const [pole, providers] = await Promise.all([
    poleRepo.findById(params.id),
    providerRepo.findAll(),
  ]);

  if (!pole) {
    notFound();
  }

  const resolvedProvider = resolveProviderInfo({
    providerId: pole.providerId,
    providerName: pole.providerName,
    infrastructureCategory: pole.infrastructureCategory,
  });

  const selectedProviderObj =
    resolvedProvider.selectedProviderObj ||
    providers.find((p) => p.id === pole.providerId) ||
    DEFAULT_PROVIDERS.find((p) => p.id === pole.providerId);

  const hasHazards =
    pole.isTilted ||
    pole.isMessyCable ||
    pole.isLowCable ||
    pole.isCorroded ||
    pole.isObstructing ||
    pole.isHazardous;

  // Format Direct Google Drive Image CDN URL for 100% reliable in-app browser rendering
  const displayPhotoUrl = formatGoogleDriveImageUrl(pole.photoUrl, pole.photoFileId, 1000);
  const rawHdUrl = pole.photoUrl || (pole.photoFileId ? `https://drive.google.com/uc?id=${pole.photoFileId}&export=view` : undefined);

  return (
    <div className="p-4 space-y-3.5 text-slate-800 font-sans pb-24 animate-in fade-in duration-150">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between pt-1">
        <BackButton fallbackUrl="/map" />

        <PoleDetailActions poleId={pole.id} poleCode={pole.poleCode} />
      </div>

      {/* Main Review-Style Pole Summary Card */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
        {/* Card Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">
              Detail Tiang Utilitas GIS
            </span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <h1 className="text-base font-black text-slate-900 font-mono tracking-tight">
                {pole.poleCode || pole.id}
              </h1>
              <span className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 font-mono font-bold">
                ID: {pole.id}
              </span>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              pole.condition === 'GOOD'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : pole.condition === 'NEEDS_REPAIR'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {pole.condition === 'GOOD'
              ? '🟢 Baik'
              : pole.condition === 'NEEDS_REPAIR'
              ? '🟡 Perlu Cek'
              : '🔴 Rusak'}
          </span>
        </div>

        {/* Photo Container (if exists) with Direct Google Drive CDN Embed */}
        {displayPhotoUrl && (
          <div className="relative rounded-2xl overflow-hidden h-48 border border-slate-100 bg-slate-900 shadow-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayPhotoUrl}
              alt={`Foto Lapangan Tiang ${pole.id}`}
              className="w-full h-full object-cover"
              loading="eager"
            />
            {rawHdUrl && (
              <a
                href={rawHdUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute top-2 right-2 px-2.5 py-1 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold rounded-xl hover:bg-black/90 transition-colors flex items-center gap-1 shadow-md"
              >
                <span>Lihat HD</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        )}

        {/* Data Summary Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {/* Category Card */}
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 col-span-2">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Kategori Infrastruktur</span>
            <span className="font-bold text-slate-900 block mt-0.5 text-xs">
              {pole.infrastructureCategory === 'PJU_MANDIRI'
                ? '💡 Tiang Penerangan Jalan Umum (PJU Mandiri Pemkot)'
                : pole.infrastructureCategory === 'GABUNG_PLN_PJU'
                ? '⚡💡 Tiang Gabungan (PLN Distribusi + Lampu PJU)'
                : pole.infrastructureCategory === 'PLN_MURNI'
                ? '⚡ Tiang Distribusi Jaringan Listrik PLN'
                : '🌐 Tiang Fiber Optik / Provider WiFi Internet'}
            </span>
          </div>

          {/* Provider Card */}
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center gap-2">
            {selectedProviderObj && (
              <div className="flex-shrink-0">
                <PoleMiniGraphic provider={selectedProviderObj} height={32} />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Instansi / Pemilik</span>
              <span className="font-bold text-slate-800 truncate block mt-0.5">
                {resolvedProvider.providerName}
              </span>
            </div>
          </div>

          {/* Material & Tinggi */}
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Material &amp; Tinggi</span>
            <span className="font-bold text-slate-800 block mt-0.5 capitalize">
              {pole.poleType} • {pole.height || '5m'}
            </span>
          </div>

          {/* Sisi Jalan & Kepemilikan */}
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Sisi Jalan</span>
            <span className="font-bold text-slate-800 block mt-0.5">
              {pole.sisiJalan === 'MEDIAN'
                ? 'Median Tengah'
                : pole.sisiJalan === 'KANAN'
                ? 'Kanan Jalan'
                : pole.sisiJalan === 'KIRI'
                ? 'Kiri Jalan'
                : 'Tidak Ditentukan'}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Kepemilikan</span>
            <span className="font-bold text-slate-800 block mt-0.5 capitalize">
              {pole.infrastructureCategory === 'PLN_MURNI'
                ? 'Milik PT PLN'
                : pole.infrastructureCategory === 'GABUNG_PLN_PJU'
                ? 'Joint PLN & Pemkot'
                : pole.infrastructureCategory === 'PJU_MANDIRI'
                ? 'Milik Pemkot Lubuklinggau'
                : pole.ownershipStatus === 'BERSAMA_PLN'
                ? 'Joint PLN'
                : pole.ownershipStatus === 'SEWA'
                ? 'Sewa'
                : pole.ownershipStatus === 'SENDIRI'
                ? 'Sendiri'
                : 'Tidak Tahu'}
            </span>
          </div>

          {/* Tipe Jalur Kabel */}
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 col-span-2">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Tipe Pemasangan Jalur Kabel</span>
            <span className="font-bold text-slate-800 block mt-0.5 text-xs">
              {pole.cableInstallationType === 'BAWAH_TANAH'
                ? '🕳️ Kabel Bawah Tanah / Tanam (Underground / Ducting)'
                : pole.cableInstallationType === 'TRANSISI_RISER'
                ? '↕️ Riser Pole (Transisi Naik/Turun Bawah Tanah)'
                : '🌐 Kabel Udara (Di Atas Tiang / Aerial)'}
            </span>
          </div>

          {/* Alamat Spasial */}
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 col-span-2">
            <span className="text-slate-400 block text-[9px] uppercase font-bold">Alamat Spasial</span>
            <span className="font-bold text-slate-900 block mt-0.5 text-xs">
              {pole.road}
            </span>
            {pole.patokanLokasi && (
              <span className="text-[10px] text-slate-600 block mt-0.5">
                Patokan: <strong>{pole.patokanLokasi}</strong>
              </span>
            )}
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Kel. {pole.kelurahan}, Kec. {pole.kecamatan}
            </span>
          </div>

          {/* Koordinat & Akurasi */}
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Koordinat Presisi GIS</span>
              <span className="text-[9px] font-bold text-blue-600">WGS84</span>
            </div>
            <span className="font-mono text-emerald-600 font-bold block mt-0.5 text-xs">
              {pole.poleLatitude.toFixed(6)}, {pole.poleLongitude.toFixed(6)}
            </span>
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-[10px] text-slate-500">
                Akurasi: {pole.gpsAccuracy ? `±${pole.gpsAccuracy.toFixed(1)}m` : 'Presisi'} • Deviasi: {formatDistance(pole.distanceFromDevice || 0)}
              </span>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${pole.poleLatitude},${pole.poleLongitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 transition-all active:scale-95 shadow-sm"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* PJU Technical Card (If PJU) */}
        {(pole.infrastructureCategory === 'PJU_MANDIRI' || pole.infrastructureCategory === 'GABUNG_PLN_PJU' || pole.pjuLampType) && (
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>💡</span>
                <span>Spesifikasi Penerangan Jalan (PJU)</span>
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-200 text-amber-950 rounded-full">
                {pole.pjuLampCondition === 'MENYALA_NORMAL'
                  ? '🟢 Menyala'
                  : pole.pjuLampCondition === 'REDUP'
                  ? '🟡 Redup'
                  : pole.pjuLampCondition === 'MATI_TOTAL'
                  ? '🔴 Mati'
                  : '💥 Pecah/Rusak'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
              <div className="bg-white p-2 rounded-xl border border-amber-200">
                <span className="text-slate-400 block text-[8px] font-bold uppercase">Tipe Lampu</span>
                <span className="font-bold text-slate-800 block mt-0.5">
                  {pole.pjuLampType || 'LED'}
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-amber-200">
                <span className="text-slate-400 block text-[8px] font-bold uppercase">Daya Lampu</span>
                <span className="font-bold text-slate-800 block mt-0.5">
                  {pole.pjuLampPower || '90 Watt'}
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-amber-200">
                <span className="text-slate-400 block text-[8px] font-bold uppercase">KWh Meter</span>
                <span className="font-bold text-slate-800 block mt-0.5">
                  {pole.hasKwhMeter ? 'Ada Meter' : 'Non-Meter'}
                </span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-amber-200">
                <span className="text-slate-400 block text-[8px] font-bold uppercase">Kabel Jaringan</span>
                <span className={`font-bold block mt-0.5 ${pole.hasNetworkCable ? 'text-blue-700 font-black' : 'text-slate-700'}`}>
                  {pole.hasNetworkCable ? '🌐 Ada Kabel FO' : '🚫 PJU Murni'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Temuan Masalah di Lapangan */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">
            Temuan Masalah di Lapangan:
          </span>
          {hasHazards ? (
            <div className="flex flex-wrap gap-1.5">
              {pole.isTilted && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-bold">
                  ⚠️ Tiang Miring
                </span>
              )}
              {pole.isMessyCable && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-bold">
                  🔌 Kabel Semrawut
                </span>
              )}
              {pole.isLowCable && (
                <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-[10px] font-bold">
                  🚨 Kabel Rendah
                </span>
              )}
              {pole.isCorroded && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-bold">
                  ⚙️ Karat / Retak
                </span>
              )}
              {pole.isObstructing && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-bold">
                  🚧 Ganggu Trotoar/Jalan
                </span>
              )}
              {pole.isHazardous && (
                <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-[10px] font-bold">
                  ⚡ Potensi Bahaya
                </span>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-bold">
              <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
              <span>Semua Kondisi Normal &amp; Aman</span>
            </span>
          )}
        </div>

        {/* Catatan Lapangan (jika ada) */}
        {pole.description && (
          <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] space-y-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase block">
              Catatan Lapangan:
            </span>
            <p className="text-slate-700 italic">
              &ldquo;{pole.description}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Mini Map Card */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
            <span>Peta Lokasi Tiang GIS</span>
          </h2>
          <Link
            href={`/poles/${pole.id}/edit`}
            className="text-[10px] text-blue-600 font-bold hover:underline"
          >
            Atur Titik 📍
          </Link>
        </div>

        <div className="h-44 rounded-2xl overflow-hidden border border-slate-200/80 relative">
          <MiniMap
            coord={{ lat: pole.poleLatitude, lng: pole.poleLongitude }}
            condition={pole.condition}
            poleId={pole.id}
            poleCode={pole.poleCode}
            providerColorHex={selectedProviderObj?.colorHex}
          />
        </div>
      </div>

      {/* Audit Trail Card */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-2">
        <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Audit Lapangan</span>
        </h2>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 text-[9px] block uppercase font-bold">Petugas Surveyor</span>
            <span className="font-bold text-blue-600 truncate block mt-0.5" title={pole.surveyorName}>
              {pole.surveyorName || 'Admin DISKOMINFO'}
            </span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
            <span className="text-slate-400 text-[9px] block uppercase font-bold">Waktu Input</span>
            <span className="font-bold text-slate-900 truncate block mt-0.5">
              {formatIndonesianDate(pole.createdAt || pole.surveyDate, pole.surveyTime)}
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
