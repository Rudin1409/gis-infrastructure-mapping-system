'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pole, PoleCondition, PoleType, SisiJalan, OwnershipStatus } from '@/types/pole';
import { Provider } from '@/types/provider';
import { Coordinates } from '@/types/gis';
import { KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';
import { DEFAULT_PROVIDERS } from '@/config/providers';
import { useAuth } from '@/context/AuthContext';
import PinSelectorMap from '@/components/map/PinSelectorMap';
import PhotoUploader from './PhotoUploader';
import PoleVisualGuideModal, { PoleMiniGraphic } from './PoleVisualGuideModal';
import { reverseGeocodeLocation } from '@/lib/gis/geocoding';
import { formatGoogleDriveImageUrl } from '@/lib/utils/driveImage';
import {
  MapPin,
  Locate,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Save,
  Trash2,
  FileText,
  Calendar,
  Sparkles,
  Layers,
  Palette,
  Camera,
  ShieldAlert,
  X,
  Compass,
} from 'lucide-react';
import Link from 'next/link';

interface EditPoleFormProps {
  pole: Pole;
  providers: Provider[];
}

export default function EditPoleForm({ pole, providers }: EditPoleFormProps) {
  const router = useRouter();
  const { user } = useAuth();

  // Mode: Form vs Interactive Map Pin Repositioning
  const [isMapRepositionMode, setIsMapRepositionMode] = useState(false);

  // --- 1. KOORDINAT & LOKASI ---
  const [coord, setCoord] = useState<Coordinates>({
    lat: pole.poleLatitude,
    lng: pole.poleLongitude,
  });
  const [road, setRoad] = useState(pole.road || '');
  const [kecamatan, setKecamatan] = useState(pole.kecamatan || KECAMATAN_LUBUKLINGGAU[0].name);
  const [kelurahan, setKelurahan] = useState(
    pole.kelurahan || KECAMATAN_LUBUKLINGGAU[0].kelurahan[0]
  );
  const [patokanLokasi, setPatokanLokasi] = useState(pole.patokanLokasi || '');
  const [sisiJalan, setSisiJalan] = useState<SisiJalan>(pole.sisiJalan || 'TIDAK_DITENTUKAN');

  // --- 2. DOKUMENTASI FOTO ---
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | undefined>(
    formatGoogleDriveImageUrl(pole.photoUrl, pole.photoFileId, 1000)
  );
  const [photoFileId, setPhotoFileId] = useState<string | undefined>(pole.photoFileId);

  // --- 3. INFORMASI TIANG & SPESIFIKASI ---
  const [infrastructureCategory, setInfrastructureCategory] = useState<import('@/types/pole').InfrastructureCategory>(
    pole.infrastructureCategory || 'FO_WIFI'
  );
  const [cableInstallationType, setCableInstallationType] = useState<import('@/types/pole').CableInstallationType>(
    pole.cableInstallationType || 'UDARA'
  );
  const [pjuLampType, setPjuLampType] = useState<import('@/types/pole').LampuPjuType>(
    pole.pjuLampType || 'LED'
  );
  const [pjuLampPower, setPjuLampPower] = useState(pole.pjuLampPower || '90W');
  const [pjuLampCondition, setPjuLampCondition] = useState<import('@/types/pole').LampuPjuCondition>(
    pole.pjuLampCondition || 'MENYALA_NORMAL'
  );
  const [hasKwhMeter, setHasKwhMeter] = useState(!!pole.hasKwhMeter);

  const [providerList, setProviderList] = useState<Provider[]>(DEFAULT_PROVIDERS);
  const [providerId, setProviderId] = useState(pole.providerId || DEFAULT_PROVIDERS[0]?.id);
  const [showVisualGuideModal, setShowVisualGuideModal] = useState(false);
  const [poleType, setPoleType] = useState<PoleType>(pole.poleType || 'BETON');
  const [condition, setCondition] = useState<PoleCondition>(pole.condition || 'GOOD');
  const [poleCode, setPoleCode] = useState(pole.poleCode || '');
  const [height, setHeight] = useState(pole.height || '7m');
  const [ownershipStatus, setOwnershipStatus] = useState<OwnershipStatus>(
    pole.ownershipStatus || 'SENDIRI'
  );

  // --- 4. SAFETY & HAZARD QUICK TOGGLES ---
  const [isTilted, setIsTilted] = useState(!!pole.isTilted);
  const [isMessyCable, setIsMessyCable] = useState(!!pole.isMessyCable);
  const [isLowCable, setIsLowCable] = useState(!!pole.isLowCable);
  const [isCorroded, setIsCorroded] = useState(!!pole.isCorroded);
  const [isObstructing, setIsObstructing] = useState(!!pole.isObstructing);
  const [isHazardous, setIsHazardous] = useState(!!pole.isHazardous);
  const [description, setDescription] = useState(pole.description || '');

  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter Kelurahan based on selected Kecamatan
  const currentKecamatanObj = KECAMATAN_LUBUKLINGGAU.find((k) => k.name === kecamatan);
  const kelurahanList = currentKecamatanObj ? currentKecamatanObj.kelurahan : [];

  const handleKecamatanChange = (newKec: string) => {
    setKecamatan(newKec);
    const matched = KECAMATAN_LUBUKLINGGAU.find((k) => k.name === newKec);
    if (matched && matched.kelurahan.length > 0) {
      setKelurahan(matched.kelurahan[0]);
    }
  };

  // Handler when map pin is repositioned
  const handleConfirmNewLocation = async (data: {
    poleCoord: Coordinates;
    deviceCoord?: Coordinates;
    gpsAccuracy?: number;
    distanceFromDevice?: number;
  }) => {
    setCoord(data.poleCoord);
    setIsMapRepositionMode(false);

    // Auto Reverse Geocode location
    try {
      const geo = await reverseGeocodeLocation(data.poleCoord);
      if (geo) {
        if (geo.road) setRoad(geo.road);
        if (geo.kecamatan) {
          const matchedKec = KECAMATAN_LUBUKLINGGAU.find((k) =>
            k.name.toLowerCase().includes(geo.kecamatan.toLowerCase())
          );
          if (matchedKec) {
            setKecamatan(matchedKec.name);
            if (geo.kelurahan) {
              const matchedKel = matchedKec.kelurahan.find((kel) =>
                kel.toLowerCase().includes(geo.kelurahan.toLowerCase())
              );
              if (matchedKel) setKelurahan(matchedKel);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Reverse geocode note:', e);
    }
  };

  // Handle Save / Update
  const handleUpdatePole = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let finalPhotoUrl = photoPreviewUrl;
      let finalPhotoFileId = photoFileId;

      // If new photo file selected, upload first
      if (selectedPhotoFile) {
        const formData = new FormData();
        formData.append('photo', selectedPhotoFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          if (uploadJson.success && uploadJson.data) {
            finalPhotoUrl = uploadJson.data.photoUrl;
            finalPhotoFileId = uploadJson.data.photoFileId;
          }
        }
      }

      const activeProviderObj = providerList.find((p) => p.id === providerId);

      const updateData = {
        poleLatitude: coord.lat,
        poleLongitude: coord.lng,
        providerId,
        providerName: activeProviderObj?.name || pole.providerName || providerId,
        poleType,
        condition,
        poleCode: poleCode.trim() || undefined,
        road: road.trim(),
        kelurahan,
        kecamatan,
        patokanLokasi: patokanLokasi.trim() || undefined,
        sisiJalan,
        height,
        ownershipStatus,
        cableInstallationType,
        infrastructureCategory,
        pjuLampType: (infrastructureCategory === 'PJU_MANDIRI' || infrastructureCategory === 'GABUNG_PLN_PJU') ? pjuLampType : undefined,
        pjuLampPower: (infrastructureCategory === 'PJU_MANDIRI' || infrastructureCategory === 'GABUNG_PLN_PJU') ? pjuLampPower : undefined,
        pjuLampCondition: (infrastructureCategory === 'PJU_MANDIRI' || infrastructureCategory === 'GABUNG_PLN_PJU') ? pjuLampCondition : undefined,
        hasKwhMeter: (infrastructureCategory === 'PJU_MANDIRI' || infrastructureCategory === 'GABUNG_PLN_PJU') ? hasKwhMeter : undefined,
        isTilted,
        isMessyCable,
        isLowCable,
        isCorroded,
        isObstructing,
        isHazardous,
        description: description.trim() || undefined,
        photoUrl: finalPhotoUrl,
        photoFileId: finalPhotoFileId,
        // Tetap pertahankan identitas petugas pembuat awal
        surveyorId: pole.surveyorId || user?.id,
        surveyorName: pole.surveyorName || user?.name,
        surveyDate: pole.surveyDate,
        surveyTime: pole.surveyTime,
      };

      const res = await fetch(`/api/poles/${pole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memperbarui data tiang');
      }

      setSuccessMessage('Data tiang & titik koordinat berhasil diperbarui!');
      setTimeout(() => {
        router.push(`/poles/${pole.id}`);
        router.refresh();
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleDeletePole = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/poles/${pole.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menghapus tiang');
      }

      router.push('/poles');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menghapus tiang');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // If in Map Repositioning Mode, show dedicated full-screen Map Modal with original location reference
  if (isMapRepositionMode) {
    return (
      <div className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-900 flex flex-col overflow-hidden animate-in fade-in">
        <PinSelectorMap
          initialPinCoord={coord}
          originalCoord={{ lat: pole.poleLatitude, lng: pole.poleLongitude }}
          poleCode={pole.poleCode || pole.id}
          onConfirmLocation={handleConfirmNewLocation}
          onCancel={() => setIsMapRepositionMode(false)}
        />
      </div>
    );
  }

  const selectedProviderObj = providerList.find((p) => p.id === providerId);

  return (
    <div className="p-4 space-y-4 text-slate-800 font-sans pb-16">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/poles/${pole.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 py-1.5 px-3 rounded-xl bg-white border border-slate-200 shadow-2xs transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Batal</span>
        </Link>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-xl border border-blue-100">
            Edit {pole.id}
          </span>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleUpdatePole} className="space-y-4">
        {/* ============================================================ */}
        {/* SECTION 1: ATUR TITIK KOORDINAT DI PETA                      */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Titik Koordinat GIS</span>
            </h3>

            <button
              type="button"
              onClick={() => setIsMapRepositionMode(true)}
              className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Locate className="w-3.5 h-3.5" />
              <span>Atur Titik di Peta 📍</span>
            </button>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 font-sans block uppercase font-bold">
                Koordinat Presisi
              </span>
              <span className="font-bold text-slate-800">
                {coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}
              </span>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
              Terkunci
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Nama Jalan / Lokasi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={road}
                onChange={(e) => setRoad(e.target.value)}
                placeholder="Contoh: Jl. Yos Sudarso No. 45"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Kecamatan
                </label>
                <select
                  value={kecamatan}
                  onChange={(e) => handleKecamatanChange(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none focus:border-blue-500"
                >
                  {KECAMATAN_LUBUKLINGGAU.map((k) => (
                    <option key={k.name} value={k.name}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Kelurahan
                </label>
                <select
                  value={kelurahan}
                  onChange={(e) => setKelurahan(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none focus:border-blue-500"
                >
                  {kelurahanList.map((kel) => (
                    <option key={kel} value={kel}>
                      {kel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Patokan Lokasi
                </label>
                <input
                  type="text"
                  value={patokanLokasi}
                  onChange={(e) => setPatokanLokasi(e.target.value)}
                  placeholder="Contoh: Depan Toko Roti"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Sisi Jalan
                </label>
                <select
                  value={sisiJalan}
                  onChange={(e) => setSisiJalan(e.target.value as SisiJalan)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none focus:border-blue-500"
                >
                  <option value="KIRI">Kiri Jalan</option>
                  <option value="KANAN">Kanan Jalan</option>
                  <option value="MEDIAN">Median Tengah</option>
                  <option value="TIDAK_DITENTUKAN">Tidak Ditentukan</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 2: KATEGORI, PROVIDER & SPESIFIKASI TIANG           */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Kategori &amp; Fungsi Infrastruktur Tiang</span>
            </h3>
          </div>

          {/* 4 Category Segmented Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setInfrastructureCategory('FO_WIFI');
                if (providerId === 'PRV_PJU_PEMKOT' || providerId === 'PRV_PLN_PJU_GABUNG' || providerId === 'PRV_PLN_DISTRIBUSI') {
                  setProviderId('PRV_TELKOM');
                }
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                infrastructureCategory === 'FO_WIFI'
                  ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20 font-black shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
              }`}
            >
              <div className="text-xs flex items-center gap-1.5 mb-0.5">
                <span>🌐</span>
                <span>Tiang FO / WiFi</span>
              </div>
              <p className="text-[10px] text-slate-500 font-normal">Provider Internet / ISP</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setInfrastructureCategory('PJU_MANDIRI');
                setProviderId('PRV_PJU_PEMKOT');
                setOwnershipStatus('SENDIRI');
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                infrastructureCategory === 'PJU_MANDIRI'
                  ? 'bg-amber-50 border-amber-600 text-amber-950 ring-2 ring-amber-500/20 font-black shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
              }`}
            >
              <div className="text-xs flex items-center gap-1.5 mb-0.5">
                <span>💡</span>
                <span>Tiang PJU Mandiri</span>
              </div>
              <p className="text-[10px] text-slate-500 font-normal">Lampu Jalan Khusus Pemkot</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setInfrastructureCategory('GABUNG_PLN_PJU');
                setProviderId('PRV_PLN_PJU_GABUNG');
                setOwnershipStatus('BERSAMA_PLN');
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                infrastructureCategory === 'GABUNG_PLN_PJU'
                  ? 'bg-cyan-50 border-cyan-600 text-cyan-950 ring-2 ring-cyan-500/20 font-black shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
              }`}
            >
              <div className="text-xs flex items-center gap-1.5 mb-0.5">
                <span>⚡💡</span>
                <span>Gabung PLN + PJU</span>
              </div>
              <p className="text-[10px] text-slate-500 font-normal">Tiang Listrik Numpang Lampu</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setInfrastructureCategory('PLN_MURNI');
                setProviderId('PRV_PLN_DISTRIBUSI');
                setOwnershipStatus('BERSAMA_PLN');
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                infrastructureCategory === 'PLN_MURNI'
                  ? 'bg-sky-50 border-sky-600 text-sky-950 ring-2 ring-sky-500/20 font-black shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
              }`}
            >
              <div className="text-xs flex items-center gap-1.5 mb-0.5">
                <span>⚡</span>
                <span>Tiang PLN Murni</span>
              </div>
              <p className="text-[10px] text-slate-500 font-normal">Jaringan Distribusi Listrik</p>
            </button>
          </div>

          {/* PJU Special Technical Details (Visible if PJU Mandiri or Gabung PLN) */}
          {(infrastructureCategory === 'PJU_MANDIRI' || infrastructureCategory === 'GABUNG_PLN_PJU') && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <span>💡</span>
                  <span>Spesifikasi Lampu Penerangan Jalan (PJU)</span>
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                  PJU Terpasang
                </span>
              </div>

              {/* Tipe Lampu */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Jenis / Tipe Lampu PJU
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'LED', label: '💡 LED' },
                    { id: 'SON_T', label: '🟡 SON-T (Kuning)' },
                    { id: 'SOLAR_CELL', label: '☀️ Solar Panel' },
                    { id: 'MERKURI', label: '⚪ Merkuri' },
                    { id: 'LAINNYA', label: '🔘 Lainnya' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setPjuLampType(t.id as any)}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition-all text-center cursor-pointer ${
                        pjuLampType === t.id
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daya & Meteran */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Estimasi Daya (Watt)
                  </label>
                  <select
                    value={pjuLampPower}
                    onChange={(e) => setPjuLampPower(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="40 Watt">40 Watt</option>
                    <option value="60 Watt">60 Watt</option>
                    <option value="90 Watt">90 Watt (Standar)</option>
                    <option value="120 Watt">120 Watt</option>
                    <option value="150 Watt">150 Watt</option>
                    <option value="250 Watt">250 Watt (Kuning)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Sistem Meteran KWh
                  </label>
                  <select
                    value={hasKwhMeter ? 'METER' : 'ABONEMEN'}
                    onChange={(e) => setHasKwhMeter(e.target.value === 'METER')}
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="ABONEMEN">⚡ Non-Meter (Abonemen)</option>
                    <option value="METER">🔌 Ada KWh Meter PJU</option>
                  </select>
                </div>
              </div>

              {/* Kondisi Nyala Lampu */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Kondisi Operasional Nyala Lampu
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'MENYALA_NORMAL', label: '🟢 Menyala' },
                    { id: 'REDUP', label: '🟡 Redup' },
                    { id: 'MATI_TOTAL', label: '🔴 Mati' },
                    { id: 'PECAH_RUSAK', label: '💥 Pecah' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setPjuLampCondition(c.id as any)}
                      className={`py-1.5 rounded-xl text-[10px] font-bold border transition-all text-center cursor-pointer ${
                        pjuLampCondition === c.id
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Instansi Pemilik &amp; Material Tiang</span>
            </h4>

            <button
              type="button"
              onClick={() => setShowVisualGuideModal(true)}
              className="py-1 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Palette className="w-3 h-3 text-blue-600" />
              <span>Panduan 20 Warna Tiang</span>
            </button>
          </div>

          {/* Provider Selection with Mini Graphic */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {selectedProviderObj && (
                <div className="flex-shrink-0">
                  <PoleMiniGraphic provider={selectedProviderObj} height={36} />
                </div>
              )}
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">
                  Operator Terpilih
                </span>
                <span className="font-bold text-xs text-slate-900 truncate block">
                  {selectedProviderObj?.name || providerId}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowVisualGuideModal(true)}
              className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs flex-shrink-0"
            >
              Ganti
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Kondisi Tiang
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as PoleCondition)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none focus:border-blue-500"
              >
                <option value="GOOD">🟢 Baik / Normal</option>
                <option value="NEEDS_REPAIR">🟡 Perlu Servis (Miring/Kabel)</option>
                <option value="DAMAGED">🔴 Rusak Parah / Patah</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Jenis Tiang
              </label>
              <select
                value={poleType}
                onChange={(e) => setPoleType(e.target.value as PoleType)}
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none focus:border-blue-500"
              >
                <option value="BETON">Tiang Beton</option>
                <option value="BESI">Tiang Besi / Baja</option>
                <option value="KAYU">Tiang Kayu</option>
                <option value="LAINNYA">Lainnya</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Kode Fisik
              </label>
              <input
                type="text"
                value={poleCode}
                onChange={(e) => setPoleCode(e.target.value)}
                placeholder="PL-01"
                className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Tinggi
              </label>
              <select
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none focus:border-blue-500"
              >
                <option value="7m">7 Meter</option>
                <option value="9m">9 Meter</option>
                <option value="11m">11 Meter</option>
                <option value="12m">12 Meter</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                Kepemilikan
              </label>
              <select
                value={ownershipStatus}
                onChange={(e) => setOwnershipStatus(e.target.value as OwnershipStatus)}
                className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none focus:border-blue-500"
              >
                <option value="SENDIRI">Sendiri</option>
                <option value="SEWA">Sewa</option>
                <option value="BERSAMA_PLN">Joint PLN</option>
                <option value="TIDAK_DIKETAHUI">Tidak Diketahui</option>
              </select>
            </div>
          </div>

          {/* Tipe Jalur Kabel (Kabel Udara vs Bawah Tanah vs Riser Transisi) */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>🔌</span>
                <span>Tipe Pemasangan Jalur Kabel</span>
              </span>
              <span className="text-[10px] font-normal text-slate-400 font-mono">
                {cableInstallationType}
              </span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'UDARA',
                  label: '🌐 Kabel Udara',
                  sub: 'Di Atas Tiang (Aerial)',
                  color: 'border-blue-200 bg-blue-50/50 text-blue-900',
                  activeColor: 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/20',
                },
                {
                  id: 'BAWAH_TANAH',
                  label: '🕳️ Bawah Tanah',
                  sub: 'Tanam / Ducting',
                  color: 'border-amber-200 bg-amber-50/50 text-amber-900',
                  activeColor: 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-500/20',
                },
                {
                  id: 'TRANSISI_RISER',
                  label: '↕️ Riser Transisi',
                  sub: 'Tiang Turun ke Tanah',
                  color: 'border-indigo-200 bg-indigo-50/50 text-indigo-900',
                  activeColor: 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-500/20',
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCableInstallationType(item.id as any)}
                  className={`p-2 rounded-2xl border text-left transition-all cursor-pointer ${
                    cableInstallationType === item.id
                      ? `${item.activeColor} shadow-xs font-black`
                      : `${item.color} hover:bg-slate-100 font-semibold opacity-90`
                  }`}
                >
                  <div className="text-[11px] font-bold truncate leading-tight">
                    {item.label}
                  </div>
                  <div className="text-[9px] opacity-80 mt-0.5 truncate font-normal">
                    {item.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 3: SAFETY & HAZARD QUICK TOGGLES                     */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Kondisi Keselamatan &amp; Bahaya</span>
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={isTilted}
                onChange={(e) => setIsTilted(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0"
              />
              <span className="font-bold text-slate-800 text-[11px]">Tiang Miring</span>
            </label>

            <label className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={isMessyCable}
                onChange={(e) => setIsMessyCable(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0"
              />
              <span className="font-bold text-slate-800 text-[11px]">Kabel Semrawut</span>
            </label>

            <label className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={isLowCable}
                onChange={(e) => setIsLowCable(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0"
              />
              <span className="font-bold text-slate-800 text-[11px]">Kabel Rendah</span>
            </label>

            <label className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={isCorroded}
                onChange={(e) => setIsCorroded(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0"
              />
              <span className="font-bold text-slate-800 text-[11px]">Karat / Keropos</span>
            </label>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Catatan / Deskripsi Lapangan
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tambahkan keterangan kondisi tiang atau rute kabel..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 4: FOTO TIANG                                        */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-blue-600" />
            <span>Dokumentasi Foto Lapangan</span>
          </h3>

          <PhotoUploader
            previewUrl={photoPreviewUrl}
            onPhotoSelected={(file, previewUrl) => {
              setSelectedPhotoFile(file);
              setPhotoPreviewUrl(previewUrl);
            }}
            onPhotoRemoved={() => {
              setSelectedPhotoFile(null);
              setPhotoPreviewUrl(undefined);
              setPhotoFileId(undefined);
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan Perubahan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Data Tiang</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 active:scale-[0.98] text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Hapus Tiang Ini dari Database</span>
          </button>
        </div>
      </form>

      {/* Visual Guide Modal */}
      <PoleVisualGuideModal
        isOpen={showVisualGuideModal}
        onClose={() => setShowVisualGuideModal(false)}
        selectedProviderId={providerId}
        onSelectProvider={(prov) => {
          setProviderId(prov.id);
          setShowVisualGuideModal(false);
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full border border-slate-200 shadow-2xl space-y-3 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center font-bold">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base font-black text-slate-900">
                Hapus Tiang {pole.id}?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Tindakan ini akan menghapus data tiang ini dari peta dan Google Spreadsheet secara permanen.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeletePole}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Ya, Hapus</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
