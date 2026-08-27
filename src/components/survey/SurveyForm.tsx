'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Coordinates } from '@/types/gis';
import {
  PoleCondition,
  PoleType,
  SisiJalan,
  OwnershipStatus,
  InfrastructureCategory,
  LampuPjuType,
  LampuPjuCondition,
  CableInstallationType,
} from '@/types/pole';
import { Provider } from '@/types/provider';
import { KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';
import PhotoUploader from './PhotoUploader';
import { formatDistance } from '@/lib/gis/haversine';
import {
  reverseGeocodeLocation,
  getNextSequentialPoleCode,
  getKecamatanCode,
  getKelurahanCode,
} from '@/lib/gis/geocoding';
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
  Zap,
  Lightbulb,
  Plus,
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

  const [infrastructureCategory, setInfrastructureCategory] = useState<InfrastructureCategory>('FO_WIFI');
  const [cableInstallationType, setCableInstallationType] = useState<CableInstallationType>('UDARA');
  const [pjuLampType, setPjuLampType] = useState<LampuPjuType>('LED');
  const [pjuLampPower, setPjuLampPower] = useState('90W');
  const [pjuLampCondition, setPjuLampCondition] = useState<LampuPjuCondition>('MENYALA_NORMAL');
  const [hasKwhMeter, setHasKwhMeter] = useState(false);
  const [hasNetworkCable, setHasNetworkCable] = useState(false);

  const [providerList, setProviderList] = useState<Provider[]>(DEFAULT_PROVIDERS);
  const [providerId, setProviderId] = useState(DEFAULT_PROVIDERS[0]?.id || 'PRV_TELKOM');
  const [showVisualGuideModal, setShowVisualGuideModal] = useState(false);
  const [poleType, setPoleType] = useState<PoleType>('BETON');
  const [condition, setCondition] = useState<PoleCondition>('GOOD');
  const [poleCode, setPoleCode] = useState('');
  const [segmentCode, setSegmentCode] = useState('');
  const [height, setHeight] = useState('5m');
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
  const surveyorName = user ? `${user.name} (${user.roleLabel})` : 'Surveyor GIS Lubuklinggau';
  const [surveyDate] = useState(new Date().toISOString().split('T')[0]);
  const [surveyTime] = useState(
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  );

  const [isAutoDetecting, setIsAutoDetecting] = useState(true);
  const [showCodeInfoModal, setShowCodeInfoModal] = useState(false);
  const [isSmartMemoryApplied, setIsSmartMemoryApplied] = useState(false);
  const [smartMemoryNotice, setSmartMemoryNotice] = useState<string | null>(null);

  // --- SUBMISSION STATE ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState<
    'IDLE' | 'UPLOADING_PHOTO' | 'SAVING_SHEET' | 'SUCCESS'
  >('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Smart Memory: Load previous pole attributes on initial mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gis_smart_memory_pole');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.providerId) setProviderId(data.providerId);
        if (data.poleType) setPoleType(data.poleType);
        if (data.condition) setCondition(data.condition);
        if (data.height) setHeight(data.height);
        if (data.ownershipStatus) setOwnershipStatus(data.ownershipStatus);
        if (data.road) setRoad(data.road);
        if (data.kecamatan) setKecamatan(data.kecamatan);
        if (data.kelurahan) setKelurahan(data.kelurahan);
        if (data.sisiJalan) setSisiJalan(data.sisiJalan);
        if (data.infrastructureCategory) setInfrastructureCategory(data.infrastructureCategory);
        if (data.cableInstallationType) setCableInstallationType(data.cableInstallationType);
        if (data.pjuLampType) setPjuLampType(data.pjuLampType);
        if (data.pjuLampPower) setPjuLampPower(data.pjuLampPower);

        setIsSmartMemoryApplied(true);
        setSmartMemoryNotice(
          `${data.road || 'Jalan'} • ${data.providerName || data.providerId || 'Provider'}`
        );
      }
    } catch (e) {
      console.warn('Smart memory load notice:', e);
    }
  }, []);

  // 2. Auto-reverse geocode location from GPS coordinate
  useEffect(() => {
    let isMounted = true;
    async function fetchSmartDetails() {
      setIsAutoDetecting(true);
      try {
        const geo = await reverseGeocodeLocation(confirmedCoord);
        if (isMounted) {
          // If smart memory has road, only override if geocode found a specific road
          if (geo.road && (!road || !isSmartMemoryApplied)) setRoad(geo.road);
          if (geo.kecamatan && !isSmartMemoryApplied) setKecamatan(geo.kecamatan);
          if (geo.kelurahan && !isSmartMemoryApplied) setKelurahan(geo.kelurahan);
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
  }, [confirmedCoord, isSmartMemoryApplied]);

  // Available kelurahan for current selected kecamatan
  const currentKecamatanObj = KECAMATAN_LUBUKLINGGAU.find((k) => k.name === kecamatan);
  const availableKelurahan = currentKecamatanObj ? currentKecamatanObj.kelurahan : [];

  const handleKecamatanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKec = e.target.value;
    setKecamatan(newKec);
    const found = KECAMATAN_LUBUKLINGGAU.find((k) => k.name === newKec);
    const newKel = found && found.kelurahan.length > 0 ? found.kelurahan[0] : kelurahan;
    if (found && found.kelurahan.length > 0) {
      setKelurahan(newKel);
    }
    const { smartPoleCode, smartSegmentCode } = getNextSequentialPoleCode(newKec, newKel);
    setPoleCode(smartPoleCode);
    setSegmentCode(smartSegmentCode);
  };

  const handleKelurahanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKel = e.target.value;
    setKelurahan(newKel);
    const { smartPoleCode, smartSegmentCode } = getNextSequentialPoleCode(kecamatan, newKel);
    setPoleCode(smartPoleCode);
    setSegmentCode(smartSegmentCode);
  };

  const handlePhotoSelected = (file: File, previewUrl: string) => {
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(previewUrl);
  };

  const handlePhotoRemoved = () => {
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(undefined);
  };

  const handleSubmit = async (e?: React.FormEvent, continueNext: boolean = false) => {
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

      // Step 2: Save record to Supabase API
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
        cableInstallationType,
        infrastructureCategory,
        pjuLampType: (infrastructureCategory === 'PJU_MANDIRI' || infrastructureCategory === 'GABUNG_PLN_PJU') ? pjuLampType : undefined,
        pjuLampPower: (infrastructureCategory === 'PJU_MANDIRI' || infrastructureCategory === 'GABUNG_PLN_PJU') ? pjuLampPower : undefined,
        pjuLampCondition: (infrastructureCategory === 'PJU_MANDIRI' || infrastructureCategory === 'GABUNG_PLN_PJU') ? pjuLampCondition : undefined,
        hasKwhMeter: (infrastructureCategory === 'PJU_MANDIRI' || infrastructureCategory === 'GABUNG_PLN_PJU') ? hasKwhMeter : undefined,
        hasNetworkCable: (infrastructureCategory === 'PJU_MANDIRI' || infrastructureCategory === 'GABUNG_PLN_PJU') ? hasNetworkCable : undefined,
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
        surveyorId: user?.id || 'USR-KOMINFO-ADMIN',
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

      // Save to Smart Memory for next poles
      try {
        const smartMemoryData = {
          providerId,
          providerName: selectedProviderObj?.name,
          poleType,
          condition,
          height,
          ownershipStatus,
          road: road.trim(),
          kelurahan,
          kecamatan,
          sisiJalan,
          infrastructureCategory,
          cableInstallationType,
          pjuLampType,
          pjuLampPower,
        };
        localStorage.setItem('gis_smart_memory_pole', JSON.stringify(smartMemoryData));

        // Save last sequence number for this kecamatan & kelurahan
        const kecCode = getKecamatanCode(kecamatan);
        const kelCode = getKelurahanCode(kelurahan);
        const matchNum = (poleCode || '').match(/-(\d+)$/);
        if (matchNum && matchNum[1]) {
          const parsedNum = parseInt(matchNum[1], 10);
          if (!isNaN(parsedNum)) {
            localStorage.setItem(`gis_last_seq_${kecCode}_${kelCode}`, String(parsedNum));
          }
        }
      } catch (smErr) {
        console.warn('Smart memory save notice:', smErr);
      }

      setSubmitStage('SUCCESS');

      // Auto redirect or Continue next pole
      if (continueNext) {
        setTimeout(() => {
          onBackToMap();
        }, 700);
      } else {
        setTimeout(() => {
          router.push(`/poles/${json.data.id}`);
          router.refresh();
        }, 1200);
      }
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
      {/* Smart Memory Banner Notice */}
      {isSmartMemoryApplied && smartMemoryNotice && (
        <div className="p-2.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-xs flex items-center justify-between gap-2 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-blue-950 block leading-tight truncate">
                Smart Memory Aktif
              </span>
              <span className="text-[10px] text-blue-700 block truncate">
                Otomatis menyalin atribut: {smartMemoryNotice}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('gis_smart_memory_pole');
              setIsSmartMemoryApplied(false);
              setSmartMemoryNotice(null);
            }}
            className="px-2 py-1 rounded-lg bg-white/80 hover:bg-white text-blue-800 text-[10px] font-bold border border-blue-200 transition-colors flex-shrink-0 cursor-pointer shadow-2xs"
          >
            Reset
          </button>
        </div>
      )}

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
          <span className="text-[10px] block leading-none">3. Spesifikasi</span>
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
                    onChange={handleKelurahanChange}
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
            {/* Category & Infrastructure Type Card */}
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Kategori &amp; Fungsi Infrastruktur Tiang</span>
              </h3>

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
                <div className="mt-3 p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3 animate-in fade-in">
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

                  {/* Tumpangan Kabel Jaringan / FO pada Tiang PJU */}
                  <div className="pt-2 border-t border-amber-200/80">
                    <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>Kabel Jaringan / Internet Menumpang</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        hasNetworkCable ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {hasNetworkCable ? 'Ada Kabel FO' : 'PJU Murni'}
                      </span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setHasNetworkCable(false)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          !hasNetworkCable
                            ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        🚫 PJU Murni (Tanpa Kabel FO)
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasNetworkCable(true)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          hasNetworkCable
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        🌐 Ada Kabel FO / Internet Menumpang
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Provider & Material Card */}
            <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Instansi Pemilik &amp; Material Tiang</span>
              </h3>

              {/* Provider Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Operator Provider / Pemilik Aset <span className="text-rose-500">*</span>
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
                    {['5m', '6m', '7m', '9m', '12m'].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHeight(h)}
                        className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
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

              {/* Tipe Jalur Kabel (Kabel Udara vs Bawah Tanah vs Riser Transisi) */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Cable className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tipe Pemasangan Jalur Kabel Jaringan</span>
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
                      onClick={() => setCableInstallationType(item.id as CableInstallationType)}
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
              {/* Review Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <div>
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">
                    Review Lengkap Survei Lapangan
                  </span>
                  <h3 className="text-sm font-black text-slate-900 font-mono">
                    {poleCode || '(Auto Generated)'}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      condition === 'GOOD'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : condition === 'NEEDS_REPAIR'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {condition === 'GOOD' ? '🟢 Kondisi Baik' : condition === 'NEEDS_REPAIR' ? '🟡 Perlu Servis' : '🔴 Rusak'}
                  </span>
                </div>
              </div>

              {/* Category Badge Banner */}
              <div className="p-2 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Kategori Infrastruktur:</span>
                <span className="font-black text-blue-800">
                  {infrastructureCategory === 'PJU_MANDIRI'
                    ? '💡 Penerangan Jalan Umum (PJU Mandiri)'
                    : infrastructureCategory === 'GABUNG_PLN_PJU'
                    ? '⚡💡 Tiang Gabungan (PLN Distribusi + PJU)'
                    : infrastructureCategory === 'PLN_MURNI'
                    ? '⚡ Tiang Distribusi Jaringan Listrik PLN'
                    : '🌐 Fiber Optik / Provider WiFi Internet'}
                </span>
              </div>

              {/* Photo Thumbnail if uploaded */}
              {photoPreviewUrl && (
                <div className="rounded-2xl overflow-hidden h-40 border border-slate-100 bg-slate-900 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreviewUrl} alt="Foto Lapangan" className="w-full h-full object-cover" />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white rounded-md text-[9px] font-mono">
                    📷 Foto Lapangan Terlampir
                  </div>
                </div>
              )}

              {/* 1. Spesifikasi Teknis Tiang & Aset */}
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">
                  1. Spesifikasi Teknis Tiang &amp; Kepemilikan:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Instansi / Provider</span>
                    <span className="font-bold text-slate-800 truncate block mt-0.5">
                      {selectedProviderObj?.name || providerId}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Material &amp; Tinggi</span>
                    <span className="font-bold text-slate-800 block mt-0.5">
                      {poleType} • {height}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Kondisi Fisik Tiang</span>
                    <span
                      className={`font-bold block mt-0.5 ${
                        condition === 'GOOD'
                          ? 'text-emerald-700 font-black'
                          : condition === 'NEEDS_REPAIR'
                          ? 'text-amber-700 font-black'
                          : 'text-rose-700 font-black'
                      }`}
                    >
                      {condition === 'GOOD' ? '🟢 Kondisi Baik' : condition === 'NEEDS_REPAIR' ? '🟡 Perlu Servis' : '🔴 Rusak Berat'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Status Kepemilikan</span>
                    <span className="font-bold text-slate-800 block mt-0.5">
                      {ownershipStatus === 'SENDIRI'
                        ? 'Aset Sendiri'
                        : ownershipStatus === 'SEWA'
                        ? 'Sewa Tiang'
                        : ownershipStatus === 'BERSAMA_PLN'
                        ? 'Joint PLN'
                        : 'Tidak Tahu'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Instalasi Kabel</span>
                    <span className="font-bold text-slate-800 block mt-0.5">
                      {cableInstallationType === 'BAWAH_TANAH'
                        ? '🕳️ Kabel Bawah Tanah'
                        : cableInstallationType === 'TRANSISI_RISER'
                        ? '↕️ Riser Transisi'
                        : '🌐 Kabel Udara (Aerial)'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Kode Segmen Kabel</span>
                    <span className="font-bold text-slate-800 block mt-0.5 font-mono text-xs truncate">
                      {segmentCode || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Spesifikasi Khusus PJU (Jika PJU) */}
              {(infrastructureCategory === 'PJU_MANDIRI' || infrastructureCategory === 'GABUNG_PLN_PJU') && (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
                      <span>💡</span>
                      <span>Spesifikasi Teknis Penerangan Jalan (PJU)</span>
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-200 text-amber-950 rounded-full">
                      {pjuLampCondition === 'MENYALA_NORMAL'
                        ? '🟢 Menyala Normal'
                        : pjuLampCondition === 'REDUP'
                        ? '🟡 Redup'
                        : pjuLampCondition === 'MATI_TOTAL'
                        ? '🔴 Mati Total'
                        : '💥 Pecah/Rusak'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                    <div className="bg-white p-2 rounded-xl border border-amber-200">
                      <span className="text-slate-400 block text-[8px] font-bold uppercase">Tipe Lampu</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{pjuLampType || 'LED'}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-amber-200">
                      <span className="text-slate-400 block text-[8px] font-bold uppercase">Daya Lampu</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{pjuLampPower || '90 Watt'}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-amber-200">
                      <span className="text-slate-400 block text-[8px] font-bold uppercase">KWh Meter</span>
                      <span className="font-bold text-slate-800 block mt-0.5">{hasKwhMeter ? 'Ada Meter' : 'Non-Meter'}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-amber-200">
                      <span className="text-slate-400 block text-[8px] font-bold uppercase">Kabel Jaringan</span>
                      <span className={`font-bold block mt-0.5 ${hasNetworkCable ? 'text-blue-700 font-black' : 'text-slate-700'}`}>
                        {hasNetworkCable ? '🌐 Ada Kabel FO' : '🚫 PJU Murni'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Alamat & Posisi Spasial */}
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">
                  2. Lokasi Spasial &amp; Posisi Jalan:
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 col-span-2">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Ruas Jalan</span>
                    <span className="font-bold text-slate-900 block mt-0.5 text-xs">{road}</span>
                    {patokanLokasi && (
                      <span className="text-[10px] text-slate-600 block mt-0.5">
                        Patokan: <strong>{patokanLokasi}</strong>
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Kel. {kelurahan}, Kec. {kecamatan}, Kota Lubuklinggau
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Sisi Jalan</span>
                    <span className="font-bold text-slate-800 block mt-0.5">
                      {sisiJalan === 'MEDIAN'
                        ? '● Median Tengah'
                        : sisiJalan === 'KANAN'
                        ? 'Sisi Kanan ▶'
                        : sisiJalan === 'KIRI'
                        ? '◀ Sisi Kiri'
                        : 'Tidak Ditentukan'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Metode Penentuan</span>
                    <span className="font-bold text-slate-800 block mt-0.5">
                      {distanceFromDevice && distanceFromDevice > 0.5 ? '📌 Geser Pin Peta' : '🛰️ GPS Device'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Koordinat WGS84 &amp; Akurasi</span>
                      <span className="text-[9px] font-bold text-emerald-600">Presisi GPS</span>
                    </div>
                    <span className="font-mono text-emerald-600 font-bold block mt-0.5 text-xs">
                      {confirmedCoord.lat.toFixed(6)}, {confirmedCoord.lng.toFixed(6)}
                    </span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Akurasi: {gpsAccuracy ? `±${gpsAccuracy.toFixed(1)}m` : 'Presisi'} • Deviasi ke Tiang: {formatDistance(distanceFromDevice || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Temuan Masalah di Lapangan */}
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">
                  3. Temuan Masalah &amp; Bahaya Lapangan:
                </span>
                {(isTilted || isMessyCable || isLowCable || isCorroded || isObstructing || isHazardous) ? (
                  <div className="flex flex-wrap gap-1">
                    {isTilted && <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-bold">⚠️ Tiang Miring</span>}
                    {isMessyCable && <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-bold">🔌 Kabel Semrawut</span>}
                    {isLowCable && <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-[10px] font-bold">🚨 Kabel Rendah</span>}
                    {isCorroded && <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-bold">⚙️ Karat/Retak</span>}
                    {isObstructing && <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-[10px] font-bold">🚷 Ganggu Jalan</span>}
                    {isHazardous && <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-[10px] font-bold">💥 Bahaya Listrik</span>}
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[10px] font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tidak ditemukan potensi bahaya / Tiang dalam kondisi aman</span>
                  </div>
                )}
              </div>

              {/* 5. Catatan Lapangan & Petugas Surveyor */}
              <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1 border-t border-slate-100">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 col-span-2">
                  <span className="text-slate-400 block text-[8px] font-bold uppercase">Catatan Keterangan Lapangan</span>
                  <span className="font-medium text-slate-700 block mt-0.5 text-[11px] italic">
                    {description || 'Tidak ada catatan tambahan'}
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[8px] font-bold uppercase">Petugas Surveyor</span>
                  <span className="font-bold text-slate-800 block mt-0.5 truncate">{surveyorName}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[8px] font-bold uppercase">Waktu Survei</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{surveyDate} • {surveyTime}</span>
                </div>
              </div>
            </div>

            {/* Error message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2 animate-in shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Final Submit Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => handleSubmit(e, false)}
                className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>
                      {submitStage === 'UPLOADING_PHOTO'
                        ? 'Mengunggah Foto Media...'
                        : submitStage === 'SAVING_SHEET'
                        ? 'Menyimpan Data Survei ke Cloud...'
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
                    <span>SIMPAN HASIL SURVEI LAPANGAN</span>
                  </>
                )}
              </button>

              {!isSubmitting && submitStage !== 'SUCCESS' && (
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>SIMPAN &amp; LANJUT TIANG BERIKUTNYA (+)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('SPECS')}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
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
                Format Standar Nomor Seri Aset GIS
              </span>
              <div className="font-mono text-base font-black text-blue-900 tracking-wider">
                {poleCode || 'LLG-T1-TJ-001'}
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
                  {poleCode.split('-')[3] || '001'}
                </span>
                <div className="text-[11px] text-slate-700 leading-tight">
                  <strong>Nomor Urut Tiang (001, 002, 003...):</strong> Berurutan otomatis per kelurahan
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
