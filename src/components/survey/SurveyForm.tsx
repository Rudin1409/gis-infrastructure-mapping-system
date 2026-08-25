'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Coordinates } from '@/types/gis';
import { PoleCondition, PoleType, SisiJalan, OwnershipStatus } from '@/types/pole';
import { Provider } from '@/types/provider';
import { KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';
import PhotoUploader from './PhotoUploader';
import { formatDistance } from '@/lib/gis/haversine';
import { reverseGeocodeLocation } from '@/lib/gis/geocoding';
import {
  MapPin,
  Locate,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Save,
  FileText,
  User,
  Calendar,
  Sparkles,
  Cable,
  Hash,
  Info,
  X,
  Camera,
  ShieldAlert,
  Compass,
  Layers,
  Palette,
  Check,
} from 'lucide-react';
import { DEFAULT_PROVIDERS } from '@/config/providers';
import PoleVisualGuideModal, { PoleMiniGraphic } from './PoleVisualGuideModal';
import { useAuth } from '@/context/AuthContext';

interface SurveyFormProps {
  confirmedCoord: Coordinates;
  deviceCoord?: Coordinates;
  gpsAccuracy?: number;
  distanceFromDevice?: number;
  providers: Provider[];
  onBackToMap: () => void;
}

type FormTab = 'LOCATION' | 'PHOTO' | 'SPECS' | 'REVIEW';

export default function SurveyForm({
  confirmedCoord,
  deviceCoord,
  gpsAccuracy,
  distanceFromDevice,
  providers,
  onBackToMap,
}: SurveyFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FormTab>('LOCATION');

  // --- 1. LOKASI & ALAMAT ---
  const [road, setRoad] = useState('');
  const [kecamatan, setKecamatan] = useState(KECAMATAN_LUBUKLINGGAU[0].name);
  const [kelurahan, setKelurahan] = useState(KECAMATAN_LUBUKLINGGAU[0].kelurahan[0]);
  const [patokanLokasi, setPatokanLokasi] = useState('');
  const [sisiJalan, setSisiJalan] = useState<SisiJalan>('TIDAK_DITENTUKAN');

  // --- 2. DOKUMENTASI FOTO ---
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | undefined>(undefined);

  // --- 3. INFORMASI TIANG & SPESIFIKASI ---
  const [providerList, setProviderList] = useState<Provider[]>(DEFAULT_PROVIDERS);
  const [providerId, setProviderId] = useState(DEFAULT_PROVIDERS[0]?.id || 'PRV_TELKOM');
  const [showVisualGuideModal, setShowVisualGuideModal] = useState(false);
  const [poleType, setPoleType] = useState<PoleType>('BETON');
  const [condition, setCondition] = useState<PoleCondition>('GOOD');
  const [poleCode, setPoleCode] = useState('');
  const [segmentCode, setSegmentCode] = useState('');
  const [height, setHeight] = useState('7m');
  const [ownershipStatus, setOwnershipStatus] = useState<OwnershipStatus>('SENDIRI');

  // --- 4. SAFETY & HAZARD QUICK TOGGLES (Hasil Pengamatan) ---
  const [isTilted, setIsTilted] = useState(false);
  const [isMessyCable, setIsMessyCable] = useState(false);
  const [isLowCable, setIsLowCable] = useState(false);
  const [isCorroded, setIsCorroded] = useState(false);
  const [isObstructing, setIsObstructing] = useState(false);
  const [isHazardous, setIsHazardous] = useState(false);
  const [description, setDescription] = useState('');

  const { user } = useAuth();
  const surveyorName = `${user.name} (${user.roleLabel})`;
  const [surveyDate] = useState(new Date().toISOString().split('T')[0]);
  const [surveyTime] = useState(
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );

  const [isAutoDetecting, setIsAutoDetecting] = useState(true);
  const [showCodeInfoModal, setShowCodeInfoModal] = useState(false);

  // --- SUBMISSION STATE ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState<
    'IDLE' | 'UPLOADING_PHOTO' | 'SAVING_SHEET' | 'SUCCESS'
  >('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-reverse geocode location from GPS coordinate
  useEffect(() => {
    let isMounted = true;
    async function fetchSmartDetails() {
      setIsAutoDetecting(true);
      try {
        const geo = await reverseGeocodeLocation(confirmedCoord);
        if (isMounted) {
          if (geo.road) setRoad(geo.road);
          if (geo.kecamatan) setKecamatan(geo.kecamatan);
          if (geo.kelurahan) setKelurahan(geo.kelurahan);
          if (geo.smartPoleCode) setPoleCode(geo.smartPoleCode);
          if (geo.smartSegmentCode) setSegmentCode(geo.smartSegmentCode);
        }
      } catch (err) {
        console.warn('Auto geocode failed:', err);
      } finally {
        if (isMounted) setIsAutoDetecting(false);
      }
    }
    fetchSmartDetails();
    return () => {
      isMounted = false;
    };
  }, [confirmedCoord]);

  // Available kelurahan for current selected kecamatan
  const currentKecamatanObj = KECAMATAN_LUBUKLINGGAU.find((k) => k.name === kecamatan);
  const availableKelurahan = currentKecamatanObj ? currentKecamatanObj.kelurahan : [];

  const handleKecamatanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKec = e.target.value;
    setKecamatan(newKec);
    const found = KECAMATAN_LUBUKLINGGAU.find((k) => k.name === newKec);
    if (found && found.kelurahan.length > 0) {
      setKelurahan(found.kelurahan[0]);
    }
  };

  const handlePhotoSelected = (file: File, previewUrl: string) => {
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(previewUrl);
  };

  const handlePhotoRemoved = () => {
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(undefined);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!road.trim()) {
      setActiveTab('LOCATION');
      setErrorMessage('Nama jalan / patokan lokasi wajib diisi.');
      return;
    }

    setIsSubmitting(true);

    try {
      let photoFileId = '';
      let photoUrl = '';

      // Step 1: Upload Photo to Google Drive / API if selected
      if (selectedPhotoFile) {
        setSubmitStage('UPLOADING_PHOTO');
        const uploadFormData = new FormData();
        uploadFormData.append('photo', selectedPhotoFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          if (uploadJson.success && uploadJson.data) {
            photoFileId = uploadJson.data.photoFileId || '';
            photoUrl = uploadJson.data.photoUrl || '';
          }
        }
      }

      // Step 2: Save record to Google Sheets / API
      setSubmitStage('SAVING_SHEET');

      const selectedProviderObj = providers.find((p) => p.id === providerId);

      const payload = {
        poleLatitude: confirmedCoord.lat,
        poleLongitude: confirmedCoord.lng,
        deviceLatitude: deviceCoord?.lat,
        deviceLongitude: deviceCoord?.lng,
        gpsAccuracy,
        distanceFromDevice,
        locationMethod: 'MANUAL_MAP_PIN',
        providerId,
        providerName: selectedProviderObj?.name || 'Unknown',
        poleType,
        condition,
        road: road.trim(),
        kelurahan,
        kecamatan,
        kota: 'Kota Lubuklinggau',
        patokanLokasi: patokanLokasi.trim() || undefined,
        sisiJalan,
        height,
        ownershipStatus,
        isTilted,
        isMessyCable,
        isLowCable,
        isHazardous,
        isCorroded,
        isObstructing,
        poleCode: poleCode.trim() || undefined,
        description: description.trim() || undefined,
        photoFileId: photoFileId || undefined,
        photoUrl: photoUrl || undefined,
        surveyorId: user.id,
        surveyorName,
        surveyDate,
        surveyTime,
        validationStatus: 'SUBMITTED',
      };

      const res = await fetch('/api/poles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan data tiang ke server.');
      }

      setSubmitStage('SUCCESS');

      // Auto redirect to pole detail or home after brief confirmation
      setTimeout(() => {
        router.push(`/poles/${json.data.id}`);
        router.refresh();
      }, 1200);
    } catch (err: any) {
      console.error('Survey submission error:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan data survei.');
      setIsSubmitting(false);
      setSubmitStage('IDLE');
    }
  };

  const selectedProviderObj = providerList.find((p) => p.id === providerId) || DEFAULT_PROVIDERS[0];

  return (
    <div className="space-y-3 font-sans pb-4">
      {/* 4-Step Segmented Tab Bar */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-200/80 rounded-2xl shadow-inner select-none">
        <button
          type="button"
          onClick={() => setActiveTab('LOCATION')}
          className={`py-1.5 px-1 rounded-xl text-center transition-all ${
            activeTab === 'LOCATION'
              ? 'bg-white text-blue-700 font-black shadow-sm'
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <span className="text-[10px] block leading-none">1. Lokasi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PHOTO')}
          className={`py-1.5 px-1 rounded-xl text-center transition-all ${
            activeTab === 'PHOTO'
              ? 'bg-white text-blue-700 font-black shadow-sm'
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <span className="text-[10px] block leading-none">2. Foto</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SPECS')}
          className={`py-1.5 px-1 rounded-xl text-center transition-all ${
            activeTab === 'SPECS'
              ? 'bg-white text-blue-700 font-black shadow-sm'
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <span className="text-[10px] block leading-none">3. Kondisi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REVIEW')}
          className={`py-1.5 px-1 rounded-xl text-center transition-all ${
            activeTab === 'REVIEW'
              ? 'bg-blue-600 text-white font-black shadow-sm'
              : 'text-slate-600 font-bold hover:text-slate-900'
          }`}
        >
          <span className="text-[10px] block leading-none">4. Review</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* ============================================================ */}
        {/* TAB 1: LOKASI & ALAMAT SPASIAL                               */}
        {/* ============================================================ */}
        {activeTab === 'LOCATION' && (
          <div className="space-y-3 animate-in fade-in">
            {/* System Locked GPS Data Card */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-3xl p-3.5 border border-blue-200/80 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Locate className="w-3.5 h-3.5 text-blue-600" /> Hasil Sistem (Otomatis GPS)
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                  Terkunci Presisi
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-white/90 p-2 rounded-xl border border-blue-100">
                  <span className="text-slate-400 block font-semibold">Koordinat Tiang</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] block mt-0.5">
                    {confirmedCoord.lat.toFixed(6)}, {confirmedCoord.lng.toFixed(6)}
                  </span>
                </div>
                <div className="bg-white/90 p-2 rounded-xl border border-blue-100">
                  <span className="text-slate-400 block font-semibold">Akurasi Perangkat</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] block mt-0.5">
                    {gpsAccuracy ? `±${gpsAccuracy.toFixed(1)}m` : 'Presisi'}
                  </span>
                </div>
              </div>
            </div>

            {/* Field Observation: Road, Kelurahan, Kecamatan */}
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Detail Wilayah &amp; Jalan</span>
                </h3>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isAutoDetecting
                      ? 'bg-blue-50 text-blue-600 animate-pulse border border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  {isAutoDetecting ? 'Mendeteksi...' : 'Spasial Akurat'}
                </span>
              </div>

              {/* Road Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Jalan / Gang / Perumahan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={road}
                  onChange={(e) => setRoad(e.target.value)}
                  placeholder="Contoh: Jl. Mayor Toha / Gg. Sekundang II"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Kecamatan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kecamatan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={kecamatan}
                    onChange={handleKecamatanChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-medium focus:border-blue-500 outline-none"
                  >
                    {KECAMATAN_LUBUKLINGGAU.map((k) => (
                      <option key={k.name} value={k.name}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kelurahan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kelurahan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={kelurahan}
                    onChange={(e) => setKelurahan(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-medium focus:border-blue-500 outline-none"
                  >
                    {availableKelurahan.map((kel) => (
                      <option key={kel} value={kel}>
                        {kel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Patokan Lokasi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Patokan Tempat / Landmark (Opsional)
                </label>
                <input
                  type="text"
                  value={patokanLokasi}
                  onChange={(e) => setPatokanLokasi(e.target.value)}
                  placeholder="Contoh: Depan Kantor Lurah / Samping Masjid"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Sisi Jalan Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Posisi Sisi Jalan
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'KIRI', label: 'Kiri Jalan' },
                      { id: 'KANAN', label: 'Kanan Jalan' },
                      { id: 'MEDIAN', label: 'Median' },
                      { id: 'TIDAK_DITENTUKAN', label: 'Bebas' },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSisiJalan(s.id)}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all ${
                        sisiJalan === s.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Next Action Button */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onBackToMap}
                className="py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Peta</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PHOTO')}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-1"
              >
                <span>Lanjut ke Foto Dokumentasi</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: DOKUMENTASI FOTO LAPANGAN                             */}
        {/* ============================================================ */}
        {activeTab === 'PHOTO' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  <span>Foto Utama Tiang &amp; Lingkungan</span>
                </h3>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Wajib 1 Foto
                </span>
              </div>

              <PhotoUploader
                onPhotoSelected={handlePhotoSelected}
                onPhotoRemoved={handlePhotoRemoved}
                previewUrl={photoPreviewUrl}
                isUploading={isSubmitting}
              />
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('LOCATION')}
                className="py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SPECS')}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-1"
              >
                <span>Lanjut ke Kondisi &amp; Bahaya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: INFORMASI TIANG, KONDISI & KESELAMATAN                */}
        {/* ============================================================ */}
        {activeTab === 'SPECS' && (
          <div className="space-y-3 animate-in fade-in">
            {/* Provider & Material Card */}
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Provider &amp; Material Tiang</span>
              </h3>

              {/* Provider Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Operator Provider / Pemilik <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowVisualGuideModal(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[10px] font-black transition-colors shadow-2xs cursor-pointer"
                  >
                    <Palette className="w-3.5 h-3.5 text-blue-600" />
                    <span>Lihat Ciri Warna Tiang 🎨</span>
                  </button>
                </div>
                <select
                  value={providerId}
                  onChange={(e) => setProviderId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-bold focus:border-blue-500 outline-none"
                >
                  {providerList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>

                {/* Selected Provider Visual Marking Preview */}
                {selectedProviderObj && (
                  <div
                    onClick={() => setShowVisualGuideModal(true)}
                    className="mt-2 p-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <div className="p-1 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-center flex-shrink-0">
                      <PoleMiniGraphic provider={selectedProviderObj} height={52} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                          {selectedProviderObj.code}
                        </span>
                        <span className="text-[9px] font-bold text-blue-600">
                          (Ketuk untuk ganti via gambar 🎨)
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-800 leading-tight">
                        {selectedProviderObj.markingDescription || 'Tiang standar'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Pole Material Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Jenis Material Tiang <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'BETON', label: 'Beton' },
                      { id: 'BESI', label: 'Besi' },
                      { id: 'KAYU', label: 'Kayu' },
                      { id: 'LAINNYA', label: 'Lainnya' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPoleType(m.id)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                        poleType === m.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Height & Ownership Chips */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Estimasi Tinggi Tiang
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {['3m', '6m', '7m', '9m', '12m'].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHeight(h)}
                        className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          height === h
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kepemilikan
                  </label>
                  <select
                    value={ownershipStatus}
                    onChange={(e) => setOwnershipStatus(e.target.value as OwnershipStatus)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none"
                  >
                    <option value="SENDIRI">Sendiri</option>
                    <option value="BERSAMA_PLN">Bersama PLN</option>
                    <option value="SEWA">Sewa Provider</option>
                    <option value="TIDAK_DIKETAHUI">Tidak Tahu</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Condition & Safety Hazards */}
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Kondisi Umum &amp; Potensi Bahaya</span>
              </h3>

              {/* Condition 3 Big Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCondition('GOOD')}
                  className={`p-2.5 rounded-2xl border text-center transition-all ${
                    condition === 'GOOD'
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                  }`}
                >
                  <span className="block text-xs font-bold">🟢 Baik</span>
                  <span
                    className={`text-[9px] block ${
                      condition === 'GOOD' ? 'text-emerald-100' : 'text-slate-400'
                    }`}
                  >
                    Kokoh &amp; Normal
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCondition('NEEDS_REPAIR')}
                  className={`p-2.5 rounded-2xl border text-center transition-all ${
                    condition === 'NEEDS_REPAIR'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50'
                  }`}
                >
                  <span className="block text-xs font-bold">🟡 Perlu Cek</span>
                  <span
                    className={`text-[9px] block ${
                      condition === 'NEEDS_REPAIR' ? 'text-amber-100' : 'text-slate-400'
                    }`}
                  >
                    Miring / Semrawut
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setCondition('DAMAGED')}
                  className={`p-2.5 rounded-2xl border text-center transition-all ${
                    condition === 'DAMAGED'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50'
                  }`}
                >
                  <span className="block text-xs font-bold">🔴 Rusak</span>
                  <span
                    className={`text-[9px] block ${
                      condition === 'DAMAGED' ? 'text-rose-100' : 'text-slate-400'
                    }`}
                  >
                    Patah / Bahaya
                  </span>
                </button>
              </div>

              {/* 6 Quick Safety Hazard Toggles (One-Tap Chips) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Cek Cepat Temuan Lapangan (Opsional):
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsTilted(!isTilted)}
                    className={`p-2 rounded-xl border flex items-center justify-between text-left transition-all ${
                      isTilted
                        ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>⚠️ Tiang Miring</span>
                    {isTilted && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMessyCable(!isMessyCable)}
                    className={`p-2 rounded-xl border flex items-center justify-between text-left transition-all ${
                      isMessyCable
                        ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>🔌 Kabel Semrawut</span>
                    {isMessyCable && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsLowCable(!isLowCable)}
                    className={`p-2 rounded-xl border flex items-center justify-between text-left transition-all ${
                      isLowCable
                        ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>⬇️ Kabel Terlalu Rendah</span>
                    {isLowCable && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCorroded(!isCorroded)}
                    className={`p-2 rounded-xl border flex items-center justify-between text-left transition-all ${
                      isCorroded
                        ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>🧱 Tiang Retak / Karat</span>
                    {isCorroded && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsObstructing(!isObstructing)}
                    className={`p-2 rounded-xl border flex items-center justify-between text-left transition-all ${
                      isObstructing
                        ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>🚶 Ganggu Jalan/Trotoar</span>
                    {isObstructing && <Check className="w-3.5 h-3.5 text-amber-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsHazardous(!isHazardous)}
                    className={`p-2 rounded-xl border flex items-center justify-between text-left transition-all ${
                      isHazardous
                        ? 'bg-rose-50 text-rose-900 border-rose-300 font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span>🚨 Potensi Bahaya</span>
                    {isHazardous && <Check className="w-3.5 h-3.5 text-rose-600" />}
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan / Keterangan Tambahan
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan khusus surveyor lapangan..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 outline-none resize-none"
                />
              </div>

              {/* Standard Code Auto-Generated */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-blue-600" /> Kode Standar GIS (Otomatis)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCodeInfoModal(true)}
                    className="w-4 h-4 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold text-[10px] flex items-center justify-center transition-colors cursor-pointer"
                    title="Klik untuk melihat penjelasan arti kode tiang"
                  >
                    i
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={poleCode}
                    onChange={(e) => setPoleCode(e.target.value)}
                    placeholder="LLG-T1-TJ-001"
                    className="w-full px-2.5 py-2 bg-blue-50/60 border border-blue-200 rounded-2xl text-xs text-blue-900 font-mono font-bold focus:border-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    value={segmentCode}
                    onChange={(e) => setSegmentCode(e.target.value)}
                    placeholder="SEG-T1-042"
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-mono font-bold focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('PHOTO')}
                className="py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('REVIEW')}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-1"
              >
                <span>Cek &amp; Review Data Lengkap</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: REVIEW LENGKAP & SIMPAN                               */}
        {/* ============================================================ */}
        {activeTab === 'REVIEW' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">
                    Review Survei Lapangan
                  </span>
                  <h3 className="text-sm font-black text-slate-900 font-mono">
                    {poleCode || 'LLG-T1-TJ-463'}
                  </h3>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    condition === 'GOOD'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : condition === 'NEEDS_REPAIR'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {condition === 'GOOD' ? '🟢 Baik' : condition === 'NEEDS_REPAIR' ? '🟡 Perlu Cek' : '🔴 Rusak'}
                </span>
              </div>

              {/* Photo Thumbnail if uploaded */}
              {photoPreviewUrl && (
                <div className="rounded-2xl overflow-hidden h-36 border border-slate-100 bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreviewUrl} alt="Foto Lapangan" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Data Summary Grid */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Provider</span>
                  <span className="font-bold text-slate-800 truncate block mt-0.5">
                    {selectedProviderObj?.name || 'Unknown'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Material &amp; Tinggi</span>
                  <span className="font-bold text-slate-800 block mt-0.5">
                    {poleType} • {height}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 col-span-2">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Alamat Spasial</span>
                  <span className="font-bold text-slate-900 block mt-0.5">
                    {road}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Kel. {kelurahan}, Kec. {kecamatan}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 col-span-2">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Koordinat &amp; Akurasi</span>
                  <span className="font-mono text-emerald-600 font-bold block mt-0.5 text-[10px]">
                    {confirmedCoord.lat.toFixed(6)}, {confirmedCoord.lng.toFixed(6)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Akurasi: {gpsAccuracy ? `±${gpsAccuracy.toFixed(1)}m` : 'Presisi'} • Deviasi: {formatDistance(distanceFromDevice || 0)}
                  </span>
                </div>
              </div>

              {/* Hazard flags tags */}
              {(isTilted || isMessyCable || isLowCable || isCorroded || isObstructing || isHazardous) && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[9px] font-bold text-amber-700 uppercase block mb-1">
                    Temuan Masalah di Lapangan:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {isTilted && <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-[9px] font-bold">Miring</span>}
                    {isMessyCable && <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-[9px] font-bold">Kabel Semrawut</span>}
                    {isLowCable && <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-[9px] font-bold">Kabel Rendah</span>}
                    {isCorroded && <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-[9px] font-bold">Karat/Retak</span>}
                    {isObstructing && <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md text-[9px] font-bold">Ganggu Jalan</span>}
                    {isHazardous && <span className="px-2 py-0.5 bg-rose-50 text-rose-800 rounded-md text-[9px] font-bold">Bahaya</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2 animate-in shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Final Submit Button */}
            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>
                      {submitStage === 'UPLOADING_PHOTO'
                        ? 'Mengunggah Foto ke Drive...'
                        : submitStage === 'SAVING_SHEET'
                        ? 'Menyimpan Data ke Google Sheets...'
                        : 'Menyimpan Data...'}
                    </span>
                  </>
                ) : submitStage === 'SUCCESS' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>DATA BERHASIL DISIMPAN!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>SIMPAN DATA KE GOOGLE SHEETS</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('SPECS')}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors"
              >
                Ubah / Koreksi Isian
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Smart GIS Code Anatomy Info Modal */}
      {showCodeInfoModal && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-4 max-w-sm w-full shadow-2xl border border-slate-200 text-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Struktur Kode Tiang GIS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCodeInfoModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Generated Code Box */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-3 mb-3 text-center">
              <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider block mb-1">
                Format Standar Instansi
              </span>
              <div className="font-mono text-base font-black text-blue-900 tracking-wider">
                {poleCode || 'LLG-T1-TJ-463'}
              </div>
            </div>

            {/* Breakdown List */}
            <div className="space-y-2 text-xs mb-4">
              <div className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <span className="w-11 px-1.5 py-0.5 bg-blue-600 text-white font-mono font-bold rounded-lg text-center text-[10px]">
                  LLG
                </span>
                <div className="text-[11px] text-slate-700 leading-tight">
                  <strong>Kota Lubuklinggau</strong> (Kode Wilayah Utama)
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <span className="w-11 px-1.5 py-0.5 bg-indigo-600 text-white font-mono font-bold rounded-lg text-center text-[10px]">
                  {poleCode.split('-')[1] || 'T1'}
                </span>
                <div className="text-[11px] text-slate-700 leading-tight">
                  <strong>Kecamatan:</strong> {kecamatan}
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <span className="w-11 px-1.5 py-0.5 bg-emerald-600 text-white font-mono font-bold rounded-lg text-center text-[10px]">
                  {poleCode.split('-')[2] || 'TJ'}
                </span>
                <div className="text-[11px] text-slate-700 leading-tight">
                  <strong>Kelurahan:</strong> {kelurahan}
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <span className="w-11 px-1.5 py-0.5 bg-amber-500 text-white font-mono font-bold rounded-lg text-center text-[10px]">
                  {poleCode.split('-')[3] || '463'}
                </span>
                <div className="text-[11px] text-slate-700 leading-tight">
                  <strong>Nomor Urut / Seri Aset</strong> di Lapangan
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCodeInfoModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-xs rounded-2xl shadow-md transition-all cursor-pointer"
            >
              Mengerti &amp; Tutup
            </button>
          </div>
        </div>
      )}

      {/* Visual Pole Marking Guide Modal */}
      <PoleVisualGuideModal
        isOpen={showVisualGuideModal}
        onClose={() => setShowVisualGuideModal(false)}
        selectedProviderId={providerId}
        onSelectProvider={(selected, customName) => {
          if (customName) {
            setProviderList((prev) => [selected, ...prev.filter((p) => p.id !== selected.id)]);
          }
          setProviderId(selected.id);
        }}
      />
    </div>
  );
}
