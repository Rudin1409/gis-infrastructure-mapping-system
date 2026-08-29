'use client';

import React, { useState, useEffect } from 'react';
import { Coordinates } from '@/types/gis';
import { Pole } from '@/types/pole';
import { DEFAULT_PROVIDERS } from '@/config/providers';
import { KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';
import { reverseGeocodeLocation, getNextSequentialPoleCode } from '@/lib/gis/geocoding';
import { getStreetViewImageUrl, getStreetViewEmbedUrl, getStreetViewDirectUrl } from '@/lib/gis/streetview';
import {
  MapPin,
  Camera,
  CheckCircle2,
  X,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  Loader2,
  Radio,
  Sliders,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface StreetViewSurveyModalProps {
  clickedCoord: Coordinates | null;
  roadSide: 'KIRI' | 'KANAN';
  existingPoles: Pole[];
  isOpen: boolean;
  onClose: () => void;
  onPoleSaved: (pole: Pole) => void;
}

export default function StreetViewSurveyModal({
  clickedCoord,
  roadSide,
  existingPoles,
  isOpen,
  onClose,
  onPoleSaved,
}: StreetViewSurveyModalProps) {
  const [providerId, setProviderId] = useState<string>('PRV_TELKOM');
  const [condition, setCondition] = useState<string>('GOOD');
  const [category, setCategory] = useState<string>('FO_WIFI');
  const [poleType, setPoleType] = useState<string>('BESI');
  const [height, setHeight] = useState<string>('7m');
  const [roadName, setRoadName] = useState<string>('Jalan Garuda');
  const [kecamatan, setKecamatan] = useState<string>(KECAMATAN_LUBUKLINGGAU[0].name);
  const [kelurahan, setKelurahan] = useState<string>(KECAMATAN_LUBUKLINGGAU[0].kelurahan[0]);
  const [poleCode, setPoleCode] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showInteractive360, setShowInteractive360] = useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = useState<string>('');

  // Auto-fill address, smart pole code, and Street View snapshot when clickedCoord changes
  useEffect(() => {
    if (!clickedCoord) return;

    let isMounted = true;
    const existingCodes = existingPoles.map((p) => p.poleCode || p.id).filter(Boolean);

    reverseGeocodeLocation(clickedCoord, existingCodes).then((addr) => {
      if (!isMounted) return;
      setRoadName(addr.road);
      setKecamatan(addr.kecamatan);
      setKelurahan(addr.kelurahan);
      setPoleCode(addr.smartPoleCode);
    });

    // Generate Street View Image URL
    const svUrl = getStreetViewImageUrl(clickedCoord, 0, 10, 90);
    setPhotoUrl(svUrl);

    return () => {
      isMounted = false;
    };
  }, [clickedCoord, existingPoles]);

  if (!isOpen || !clickedCoord) return null;

  const handleSave = async () => {
    if (isSaving || !clickedCoord) return;
    setIsSaving(true);

    try {
      const selectedPrv = DEFAULT_PROVIDERS.find((p) => p.id === providerId);

      const payload = {
        poleLatitude: clickedCoord.lat,
        poleLongitude: clickedCoord.lng,
        poleCode: poleCode || undefined,
        road: roadName,
        kelurahan,
        kecamatan,
        providerId,
        providerName: selectedPrv?.name || 'Telkom Indonesia',
        infrastructureCategory: category,
        poleType,
        condition,
        height,
        ownershipStatus: 'SENDIRI',
        cableInstallationType: 'UDARA',
        sisiJalan: roadSide,
        photoUrl: photoUrl || undefined,
        locationMethod: 'SURVEI_VIRTUAL_STREETVIEW',
        surveyDate: new Date().toISOString().split('T')[0],
      };

      const res = await fetch('/api/poles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        onPoleSaved(json.data);
        onClose();
      } else {
        alert(json.error || 'Gagal menyimpan tiang dari Street View');
      }
    } catch (err: any) {
      alert(`Error saat menyimpan: ${err.message || 'Koneksi gagal'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] font-sans">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                <span>Survei Virtual Street View</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  1-CLICK PIN
                </span>
              </h3>
              <p className="text-[10px] text-slate-300">
                {clickedCoord.lat.toFixed(6)}, {clickedCoord.lng.toFixed(6)} ({roadSide})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs text-slate-800">
          {/* Street View Visual Snapshot / Embed */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner group">
            {showInteractive360 ? (
              <iframe
                src={getStreetViewEmbedUrl(clickedCoord, 0)}
                className="w-full h-48 border-0"
                allowFullScreen
                loading="lazy"
                title="Google Street View 360"
              />
            ) : (
              <div className="relative w-full h-44 bg-slate-900 flex items-center justify-center overflow-hidden">
                <img
                  src={photoUrl}
                  alt="Street View Preview"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    // Fallback to stylized placeholder if static API rate-limited
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-3 text-white">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Auto-Captured Street View
                    </span>
                    <p className="text-xs font-black truncate max-w-[240px]">{roadName}</p>
                  </div>

                  <a
                    href={getStreetViewDirectUrl(clickedCoord, 0)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-[10px] font-bold text-white transition-all"
                  >
                    <span>Buka 360°</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowInteractive360(!showInteractive360)}
              className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[9px] font-bold transition-all"
            >
              {showInteractive360 ? 'Tampilan Foto' : 'Mode Interaktif 360°'}
            </button>
          </div>

          {/* Form Quick Inputs */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Kode Tiang
              </label>
              <input
                type="text"
                value={poleCode}
                onChange={(e) => setPoleCode(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Kondisi Fisik
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
              >
                <option value="GOOD">🟢 Baik (Normal)</option>
                <option value="NEEDS_REPAIR">🟡 Perlu Cek (Kendur)</option>
                <option value="DAMAGED">🔴 Rusak (Miring/Bahaya)</option>
              </select>
            </div>
          </div>

          {/* Provider Selection Chips */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Provider Pemilik Tiang
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {DEFAULT_PROVIDERS.slice(0, 6).map((prv) => (
                <button
                  key={prv.id}
                  type="button"
                  onClick={() => {
                    setProviderId(prv.id);
                    if (prv.id === 'PRV_PLN') setCategory('PLN_MURNI');
                    else if (prv.id === 'PRV_PJU') setCategory('PJU_MANDIRI');
                    else setCategory('FO_WIFI');
                  }}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-bold text-center border transition-all truncate cursor-pointer ${
                    providerId === prv.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {prv.name.replace('Indonesia', '').replace('Lubuklinggau', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Technical Specs */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 text-[11px]">
            <div>
              <span className="text-[9px] font-bold text-slate-400 block">Kategori</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-transparent font-bold text-slate-800 outline-none text-[10px]"
              >
                <option value="FO_WIFI">FO / Internet</option>
                <option value="PLN_MURNI">PLN Murni</option>
                <option value="PJU_MANDIRI">PJU Mandiri</option>
                <option value="GABUNG_PLN_PJU">Gabung PLN+PJU</option>
              </select>
            </div>

            <div>
              <span className="text-[9px] font-bold text-slate-400 block">Bahan</span>
              <select
                value={poleType}
                onChange={(e) => setPoleType(e.target.value)}
                className="w-full bg-transparent font-bold text-slate-800 outline-none text-[10px]"
              >
                <option value="BESI">Besi</option>
                <option value="BETON">Beton</option>
                <option value="KAYU">Kayu</option>
              </select>
            </div>

            <div>
              <span className="text-[9px] font-bold text-slate-400 block">Tinggi</span>
              <select
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full bg-transparent font-bold text-slate-800 outline-none text-[10px]"
              >
                <option value="5m">5 Meter</option>
                <option value="7m">7 Meter</option>
                <option value="9m">9 Meter</option>
                <option value="12m">12 Meter</option>
              </select>
            </div>
          </div>

          {/* Address pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/70 border border-blue-100 rounded-xl text-[10px] text-blue-900 font-medium truncate">
            <MapPin className="w-3 h-3 text-blue-600 flex-shrink-0" />
            <span className="truncate">
              {roadName}, Kel. {kelurahan}, Kec. {kecamatan}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan ke Database...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Tiang Street View</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
