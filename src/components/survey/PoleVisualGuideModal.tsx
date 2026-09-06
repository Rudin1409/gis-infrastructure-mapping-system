'use client';

import React, { useState } from 'react';
import { Provider } from '@/types/provider';
import { DEFAULT_PROVIDERS } from '@/config/providers';
import {
  X,
  Search,
  Check,
  Palette,
  Image as ImageIcon,
  ListFilter,
  PlusCircle,
  ZoomIn,
} from 'lucide-react';

interface PoleVisualGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProviderId: string;
  onSelectProvider: (provider: Provider, customName?: string) => void;
}

// Mini SVG Pole Illustration Renderer
export function PoleMiniGraphic({
  provider,
  height = 90,
}: {
  provider: Provider;
  height?: number;
}) {
  const poleBodyColor = provider.bodyColor || '#1e293b';

  return (
    <div
      style={{ height: `${height}px` }}
      className="relative w-10 flex flex-col items-center justify-end select-none py-0.5"
    >
      {/* Top Cap */}
      <div
        className="w-2 h-5 rounded-t-xs relative transition-all"
        style={{ backgroundColor: provider.topColor || poleBodyColor }}
      >
        {provider.code === 'IFORTE' && (
          <div className="absolute top-1.5 left-0 right-0 h-1 bg-white border-y border-black/20" />
        )}
        {provider.code === 'BIZ' && (
          <div className="absolute top-1 left-0 right-0 h-0.5 bg-black" />
        )}
      </div>

      {/* Middle Section */}
      <div
        className="w-3 h-10 relative flex flex-col items-center justify-center transition-all"
        style={{ backgroundColor: poleBodyColor }}
      >
        {provider.midColor && (
          <div
            className="w-full h-3.5 absolute flex flex-col items-center justify-center shadow-xs"
            style={{ backgroundColor: provider.midColor }}
          >
            {provider.code === 'TLKM' && (
              <div className="w-full h-1 bg-slate-300 border-t border-black/20" />
            )}
            {provider.textBadge && (
              <span className="text-[5px] font-black text-slate-900 leading-none">
                {provider.textBadge}
              </span>
            )}
          </div>
        )}

        {provider.stripCount === 3 && (
          <div className="w-full flex flex-col gap-0.5 items-center">
            <div className="w-full h-0.5 bg-white" />
            <div className="w-full h-0.5 bg-white" />
            <div className="w-full h-0.5 bg-white" />
          </div>
        )}

        {provider.textBadge && !provider.midColor && (
          <span className="text-[5px] font-black text-amber-300 font-mono bg-black/70 px-0.5 rounded-xs">
            {provider.textBadge}
          </span>
        )}
      </div>

      {/* Bottom Section */}
      <div
        className="w-3.5 h-6 relative flex flex-col items-center justify-center transition-all"
        style={{ backgroundColor: poleBodyColor }}
      >
        {provider.botColor && provider.stripCount !== 2 && (
          <div
            className="w-full h-3 absolute bottom-0 shadow-xs"
            style={{ backgroundColor: provider.botColor }}
          />
        )}

        {provider.stripCount === 2 && (
          <div className="w-full flex flex-col gap-0.5 items-center absolute bottom-0.5">
            <div className="w-full h-0.5 bg-white" />
            <div className="w-full h-0.5 bg-white" />
          </div>
        )}
      </div>

      {/* Concrete Foundation Base */}
      <div className="w-6 h-2 bg-slate-400 border border-slate-500 rounded-xs shadow-xs" />
    </div>
  );
}

export default function PoleVisualGuideModal({
  isOpen,
  onClose,
  selectedProviderId,
  onSelectProvider,
}: PoleVisualGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'IMAGE' | 'CARDS' | 'CUSTOM'>('IMAGE');
  const [searchQuery, setSearchQuery] = useState('');
  const [customLocalName, setCustomLocalName] = useState('');

  if (!isOpen) return null;

  const filteredProviders = DEFAULT_PROVIDERS.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.markingDescription && p.markingDescription.toLowerCase().includes(q))
    );
  });

  const handleSelect = (provider: Provider) => {
    if (provider.id === 'PRV_LOCAL') {
      setActiveTab('CUSTOM');
    } else {
      onSelectProvider(provider);
      onClose();
    }
  };

  const handleConfirmCustom = () => {
    const localProvider = DEFAULT_PROVIDERS.find((p) => p.id === 'PRV_LOCAL')!;
    const name = customLocalName.trim() || 'Provider Lokal Lubuklinggau';
    onSelectProvider(
      {
        ...localProvider,
        name: `LOKAL: ${name}`,
      },
      name
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in select-none">
      {/* Modal Container constrained to max 85vh on mobile */}
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 text-slate-800 animate-in zoom-in-95 overflow-hidden">
        {/* Modal Header */}
        <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Palette className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Panduan Ciri Warna Tiang Provider
              </h3>
              <p className="text-[9px] text-slate-500 font-medium">
                Referensi resmi 20 warna tiang fiber optic Indonesia
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 border-b border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('IMAGE')}
            className={`py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all ${
              activeTab === 'IMAGE'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="text-[10px]">Gambar Asli</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CARDS')}
            className={`py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all ${
              activeTab === 'CARDS'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span className="text-[10px]">Daftar 1 - 20</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CUSTOM')}
            className={`py-1.5 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all ${
              activeTab === 'CUSTOM'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="text-[10px]">ISP Lokal</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* TAB 1: GAMBAR ASLI INFOGRAFIS DENGAN QUICK SELECTOR         */}
        {/* ============================================================ */}
        {activeTab === 'IMAGE' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {/* Image Viewer Container */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-950 relative group shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/provider-pole-guide.jpg"
                alt="Panduan Ciri Warna Tiang Provider Indonesia"
                className="w-full h-auto object-contain max-h-[36vh] sm:max-h-[44vh] mx-auto"
              />
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur rounded-md text-[9px] text-white flex items-center gap-1 font-mono">
                <ZoomIn className="w-3 h-3" /> Infografis Lapangan
              </div>
            </div>

            {/* Quick 1 to 20 Click Buttons */}
            <div>
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider block mb-1.5">
                ⚡ Ketuk Nomor Sesuai Gambar di Atas:
              </span>
              <div className="grid grid-cols-5 gap-1 text-[10px]">
                {DEFAULT_PROVIDERS.slice(0, 20).map((prov, index) => {
                  const isSelected = selectedProviderId === prov.id;
                  const num = index + 1;

                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => handleSelect(prov)}
                      className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 font-black shadow-sm ring-2 ring-blue-300'
                          : 'bg-slate-50 hover:bg-blue-50 border-slate-200 text-slate-800 hover:border-blue-300 font-bold'
                      }`}
                    >
                      <span className="block text-[11px] font-mono leading-none mb-0.5">
                        #{num}
                      </span>
                      <span className="text-[8px] block truncate leading-tight opacity-90">
                        {prov.code}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: DAFTAR KARTU TERSTRUKTUR (1 - 20)                     */}
        {/* ============================================================ */}
        {activeTab === 'CARDS' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search Input */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-200">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nomor, provider, atau warna gelang..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              {filteredProviders.map((provider) => {
                const isSelected = selectedProviderId === provider.id;

                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleSelect(provider)}
                    className={`w-full p-2 rounded-2xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer group ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-300 shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-12 p-0.5 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <PoleMiniGraphic provider={provider} height={42} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {provider.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight truncate">
                          {provider.markingDescription}
                        </p>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="px-2 py-0.5 bg-blue-600 text-white rounded-lg text-[9px] font-bold flex-shrink-0 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Dipilih
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 group-hover:bg-blue-100 group-hover:text-blue-700 text-slate-600 rounded-lg text-[9px] font-bold flex-shrink-0">
                        Pilih
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: INPUT ISP LOKAL KHUSUS                               */}
        {/* ============================================================ */}
        {activeTab === 'CUSTOM' && (
          <div className="p-5 flex-1 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1 shadow-sm">
              <PlusCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-black text-slate-900">Input Nama Provider / ISP Lokal</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Jika tiang milik operator lokal Lubuklinggau yang belum ada di daftar resmi, ketikkan
              nama ISP di bawah:
            </p>
            <input
              type="text"
              value={customLocalName}
              onChange={(e) => setCustomLocalName(e.target.value)}
              placeholder="Contoh: LinggauNet / Griya Fiber / TV Kabel"
              className="w-full max-w-xs px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:border-blue-600 shadow-inner"
              autoFocus
            />
            <div className="flex gap-2 w-full max-w-xs pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('IMAGE')}
                className="flex-1 py-2 px-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmCustom}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/25"
              >
                Gunakan Nama Ini
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-500 font-medium truncate">
            💡 Ketuk nomor / provider untuk memilih langsung
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
