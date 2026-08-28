'use client';

import React, { useState } from 'react';
import { DEFAULT_PROVIDERS } from '@/config/providers';
import { X, MapPin, Layers, Info, CheckCircle2, AlertTriangle, ShieldAlert, Zap, Lightbulb, Compass, Search } from 'lucide-react';

interface MapPinLegendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type LegendTab = 'CATEGORY' | 'CONDITION' | 'PROVIDERS' | 'TOOLS';

export default function MapPinLegendModal({ isOpen, onClose }: MapPinLegendModalProps) {
  const [activeTab, setActiveTab] = useState<LegendTab>('CATEGORY');
  const [searchProvider, setSearchProvider] = useState('');

  if (!isOpen) return null;

  const filteredProviders = DEFAULT_PROVIDERS.filter((p) =>
    p.name.toLowerCase().includes(searchProvider.toLowerCase()) ||
    p.code.toLowerCase().includes(searchProvider.toLowerCase()) ||
    (p.markingDescription || '').toLowerCase().includes(searchProvider.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between shadow-md flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-lg shadow-inner">
              🗺️
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide leading-tight">
                Panduan &amp; Arti Simbol Pin Peta
              </h2>
              <p className="text-[11px] text-blue-100 font-medium">
                Legenda Lengkap Warna, Bentuk &amp; Status Marker GIS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tab Navigation */}
        <div className="p-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1 overflow-x-auto no-scrollbar flex-shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('CATEGORY')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all text-center whitespace-nowrap cursor-pointer ${
              activeTab === 'CATEGORY'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            🏛️ Kategori Tiang
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CONDITION')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all text-center whitespace-nowrap cursor-pointer ${
              activeTab === 'CONDITION'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            🚦 Kondisi Fisik
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PROVIDERS')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all text-center whitespace-nowrap cursor-pointer ${
              activeTab === 'PROVIDERS'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            🎨 Warna Operator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('TOOLS')}
            className={`flex-1 py-2 px-3 rounded-xl transition-all text-center whitespace-nowrap cursor-pointer ${
              activeTab === 'TOOLS'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-black'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            📍 Simbol Navigasi
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-slate-800 text-xs">
          {/* TAB 1: KATEGORI INFRASTRUKTUR TIANG */}
          {activeTab === 'CATEGORY' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200 text-blue-900 text-[11px] leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  Bentuk simbol dan warna dasar pin pada peta menggambarkan <strong>fungsi utama infrastruktur tiang</strong> di lapangan.
                </span>
              </div>

              {/* 1. Tiang FO / Provider Internet */}
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="relative flex flex-col items-center flex-shrink-0 w-9">
                  <div className="w-8 h-8 rounded-full border-2 border-white shadow-md bg-blue-600 text-white flex items-center justify-center">
                    <MapPin className="w-4 h-4 fill-current" />
                  </div>
                  <div className="w-2 h-2 bg-blue-600 rotate-45 -mt-1 shadow-xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs">
                    <span>🌐 Tiang FO / WiFi (Provider Internet)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Tiang jaringan fiber optik / telekomunikasi milik operator seluler dan ISP. <em>Warna pin berubah sesuai warna resmi tiap provider</em> (Telkom merah, Biznet oranye, dll).
                  </p>
                </div>
              </div>

              {/* 2. Tiang PJU Mandiri Pemkot */}
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 shadow-xs flex items-center gap-3">
                <div className="relative flex flex-col items-center flex-shrink-0 w-9">
                  <div className="w-8 h-8 rounded-full border-2 border-white ring-2 ring-amber-300 shadow-md bg-amber-500 text-white flex items-center justify-center text-sm font-bold">
                    💡
                  </div>
                  <div className="w-2 h-2 bg-amber-500 rotate-45 -mt-1 shadow-xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-black text-amber-950 text-xs">
                    <span>💡 Tiang PJU Mandiri (Lampu Jalan Pemkot)</span>
                    <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 text-[9px] rounded-md font-bold">Pemkot</span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 mt-0.5 leading-snug">
                    Tiang khusus lampu Penerangan Jalan Umum (PJU) milik Pemerintah Kota Lubuklinggau. Ditandai dengan pin kuning emas dengan simbol lampu dan ring bercahaya.
                  </p>
                </div>
              </div>

              {/* 3. Tiang Gabung PLN + PJU */}
              <div className="p-3 bg-cyan-50/60 rounded-2xl border border-cyan-200/80 shadow-xs flex items-center gap-3">
                <div className="relative flex flex-col items-center flex-shrink-0 w-9">
                  <div className="w-8 h-8 rounded-full border-2 border-white shadow-md bg-sky-600 text-white flex items-center justify-center text-xs font-black">
                    ⚡💡
                  </div>
                  <div className="w-2 h-2 bg-sky-600 rotate-45 -mt-1 shadow-xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-black text-sky-950 text-xs">
                    <span>⚡💡 Tiang Gabungan (PLN Distribusi + PJU)</span>
                    <span className="px-1.5 py-0.2 bg-sky-200 text-sky-900 text-[9px] rounded-md font-bold">Joint</span>
                  </div>
                  <p className="text-[11px] text-sky-900/80 mt-0.5 leading-snug">
                    Tiang distribusi jaringan listrik PLN yang ditumpangi instalasi lampu jalan PJU oleh Pemkot Lubuklinggau.
                  </p>
                </div>
              </div>

              {/* 4. Tiang Distribusi Listrik PLN Murni */}
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200/80 shadow-xs flex items-center gap-3">
                <div className="relative flex flex-col items-center flex-shrink-0 w-9">
                  <div className="w-8 h-8 rounded-full border-2 border-white shadow-md bg-blue-800 text-white flex items-center justify-center text-sm font-bold">
                    ⚡
                  </div>
                  <div className="w-2 h-2 bg-blue-800 rotate-45 -mt-1 shadow-xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-black text-blue-950 text-xs">
                    <span>⚡ Tiang Distribusi Jaringan Listrik PLN</span>
                    <span className="px-1.5 py-0.2 bg-blue-200 text-blue-900 text-[9px] rounded-md font-bold">PLN</span>
                  </div>
                  <p className="text-[11px] text-blue-900/80 mt-0.5 leading-snug">
                    Tiang beton distribusi listrik murni milik PT PLN (Persero) untuk transmisi dan distribusi daya pelanggan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KONDISI & STATUS FISIK */}
          {activeTab === 'CONDITION' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 text-slate-700 text-[11px] leading-relaxed">
                <span>
                  Setiap pin tiang dilengkapi <strong>titik indikator (dot) kecil di pojok kanan atas</strong> yang menunjukkan hasil audit kondisi fisik tiang di lapangan:
                </span>
              </div>

              {/* Kondisi Baik */}
              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex items-center gap-3">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border-2 border-white shadow-md text-white flex-shrink-0">
                  <span className="text-[10px]">📍</span>
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-black text-emerald-950 text-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>🟢 Kondisi Baik (Good / Prima)</span>
                  </div>
                  <p className="text-[11px] text-emerald-900/80 mt-0.5">
                    Tiang berdiri kokoh tegak lurus, tidak ada retak/karat, dan kabel tertata rapi tanpa risiko bahaya.
                  </p>
                </div>
              </div>

              {/* Butuh Perbaikan */}
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 flex items-center gap-3">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border-2 border-white shadow-md text-white flex-shrink-0">
                  <span className="text-[10px]">📍</span>
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow-xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-black text-amber-950 text-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>🟡 Perlu Perbaikan (Needs Repair)</span>
                  </div>
                  <p className="text-[11px] text-amber-900/80 mt-0.5">
                    Terdapat kabel kendur/semrawut atau lampu PJU redup yang memerlukan penataan dan perawatan berkala.
                  </p>
                </div>
              </div>

              {/* Rusak / Berbahaya */}
              <div className="p-3 bg-red-50/70 rounded-2xl border border-red-200 flex items-center gap-3">
                <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border-2 border-white shadow-md text-white flex-shrink-0">
                  <span className="text-[10px]">📍</span>
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-white shadow-xs" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-black text-red-950 text-xs">
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                    <span>🔴 Rusak / Bahaya (Damaged / Hazardous)</span>
                  </div>
                  <p className="text-[11px] text-red-900/80 mt-0.5">
                    Tiang miring tajam, retak struktural, berkarat parah, atau kabel melorot membahayakan lalu lintas jalan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WARNA MARKER TIANG BERDASARKAN PROVIDER */}
          {activeTab === 'PROVIDERS' && (
            <div className="space-y-3 animate-in fade-in">
              {/* Search Provider */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchProvider}
                  onChange={(e) => setSearchProvider(e.target.value)}
                  placeholder="Cari nama provider / kode tiang..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-xl text-xs text-slate-800 font-medium outline-none border border-slate-200 focus:border-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-[320px] overflow-y-auto pr-1">
                {filteredProviders.map((prov) => (
                  <div
                    key={prov.id}
                    className="p-2.5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200/80 flex items-center gap-3 transition-all"
                  >
                    <div
                      className="w-7 h-7 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
                      style={{ backgroundColor: prov.colorHex }}
                    >
                      {prov.code.substring(0, 3)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 text-xs truncate">
                          {prov.name}
                        </span>
                        <span
                          className="px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white font-mono flex-shrink-0"
                          style={{ backgroundColor: prov.colorHex }}
                        >
                          {prov.code}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                        {prov.markingDescription || 'Warna identitas tiang resmi'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SIMBOL ALAT & NAVIGASI PETA */}
          {activeTab === 'TOOLS' && (
            <div className="space-y-3 animate-in fade-in">
              {/* Blue Dot GPS */}
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="relative flex items-center justify-center w-8 h-8 flex-shrink-0">
                  <div className="absolute w-7 h-7 rounded-full bg-blue-500/30 animate-ping" />
                  <div className="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-black text-slate-900 block text-xs">
                    🔵 Titik Biru Berkedip (Surveyor Live GPS)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Menunjukkan posisi GPS fisik smartphone / perangkat Anda saat ini di lapangan secara akurat dan realtime.
                  </p>
                </div>
              </div>

              {/* Pin Target Geser */}
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="relative flex flex-col items-center flex-shrink-0 w-8">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 border-2 border-white shadow-md text-white flex items-center justify-center text-xs">
                    🎯
                  </div>
                  <div className="w-2 h-2 bg-indigo-800 rotate-45 -mt-1" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-black text-slate-900 block text-xs">
                    📍 Pin Target Koordinat (Dapat Digeser / Drag)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Digunakan pada form survei untuk menentukan titik koordinat tiang secara presisi dengan menggeser peta.
                  </p>
                </div>
              </div>

              {/* Garis Segmen Kabel */}
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-8 flex flex-col items-center justify-center flex-shrink-0">
                  <div className="w-8 h-1 bg-red-500 rounded-full shadow-xs" />
                  <div className="w-8 h-1 bg-blue-500 rounded-full shadow-xs mt-1" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-black text-slate-900 block text-xs">
                    ➖ Garis Bentangan Kabel (Cable Segment)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Garis yang menghubungkan tiang ke tiang, menandakan rute jalur kabel fiber optik / distribusi aktif.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <span className="text-[10px] text-slate-500 font-medium">
            Sistem Informasi Spasial Kota Lubuklinggau
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
}
