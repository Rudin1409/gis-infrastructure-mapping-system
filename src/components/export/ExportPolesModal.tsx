'use client';

import React, { useState } from 'react';
import { Pole } from '@/types/pole';
import {
  generateKml,
  generateCsv,
  generateGeoJson,
  triggerFileDownload,
} from '@/lib/gis/exportSpatialData';
import {
  Download,
  Globe2,
  FileSpreadsheet,
  Layers,
  CheckCircle2,
  X,
  ExternalLink,
  Sparkles,
  MapPin,
  HelpCircle,
  Loader2,
} from 'lucide-react';

interface ExportPolesModalProps {
  currentPoles: Pole[];
  totalPolesCount?: number;
  activeFiltersDesc?: string;
  triggerClassName?: string;
}

export default function ExportPolesModal({
  currentPoles,
  totalPolesCount,
  activeFiltersDesc,
  triggerClassName,
}: ExportPolesModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'KML' | 'CSV' | 'GEOJSON'>('KML');
  const [exportScope, setExportScope] = useState<'CURRENT' | 'ALL'>('CURRENT');
  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setSuccessMessage(null);

    try {
      let polesToExport = currentPoles;

      // If user selected "ALL" and it differs from current filtered poles, fetch from API
      if (exportScope === 'ALL' && totalPolesCount && totalPolesCount !== currentPoles.length) {
        const res = await fetch('/api/poles');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            polesToExport = json.data;
          }
        }
      }

      const dateStr = new Date().toISOString().split('T')[0];
      const count = polesToExport.length;
      const baseFilename = `inframap-lubuklinggau-${count}-tiang-${dateStr}`;

      if (selectedFormat === 'KML') {
        const title = activeFiltersDesc
          ? `Pemetaan Tiang (${activeFiltersDesc})`
          : 'Pemetaan Tiang Infrastruktur Kota Lubuklinggau';
        const kmlContent = generateKml(polesToExport, title);
        triggerFileDownload(
          kmlContent,
          `${baseFilename}.kml`,
          'application/vnd.google-earth.kml+xml;charset=utf-8'
        );
        setSuccessMessage(`Berhasil mengekspor ${count} tiang ke format KML (Google Earth)!`);
      } else if (selectedFormat === 'CSV') {
        const csvContent = generateCsv(polesToExport);
        triggerFileDownload(
          csvContent,
          `${baseFilename}.csv`,
          'text/csv;charset=utf-8'
        );
        setSuccessMessage(`Berhasil mengekspor ${count} tiang ke format CSV (Excel)!`);
      } else if (selectedFormat === 'GEOJSON') {
        const geojsonObj = generateGeoJson(polesToExport);
        triggerFileDownload(
          JSON.stringify(geojsonObj, null, 2),
          `${baseFilename}.geojson`,
          'application/geo+json;charset=utf-8'
        );
        setSuccessMessage(`Berhasil mengekspor ${count} tiang ke format GeoJSON (QGIS)!`);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      alert(`Gagal mengekspor data: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          triggerClassName ||
          'inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 hover:text-blue-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer whitespace-nowrap'
        }
      >
        <Download className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
        <span>Export KML / CSV</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">
                    Ekspor Data Spasial &amp; Peta
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Format resmi untuk Google Earth, Google Maps, dan Excel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Success Notification */}
              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-bold">{successMessage}</span>
                </div>
              )}

              {/* 1. Pilih Format File */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  1. Pilih Format Ekspor
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: KML */}
                  <div
                    onClick={() => setSelectedFormat('KML')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      selectedFormat === 'KML'
                        ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                        <Globe2 className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-mono">
                        .KML
                      </span>
                    </div>
                    <div className="font-black text-xs text-slate-900">Google Earth</div>
                    <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">
                      Pin 3D warna-warni, foto popup, dan folder provider lengkap.
                    </p>
                  </div>

                  {/* Option 2: CSV */}
                  <div
                    onClick={() => setSelectedFormat('CSV')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      selectedFormat === 'CSV'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono">
                        .CSV
                      </span>
                    </div>
                    <div className="font-black text-xs text-slate-900">Excel / G-Maps</div>
                    <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">
                      Tabel 33 kolom ber-koordinat, siap buka di Excel &amp; My Maps.
                    </p>
                  </div>

                  {/* Option 3: GeoJSON */}
                  <div
                    onClick={() => setSelectedFormat('GEOJSON')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      selectedFormat === 'GEOJSON'
                        ? 'border-purple-600 bg-purple-50/70 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-mono">
                        .GeoJSON
                      </span>
                    </div>
                    <div className="font-black text-xs text-slate-900">QGIS / ArcGIS</div>
                    <p className="text-[10.5px] text-slate-500 mt-1 leading-snug">
                      Format standar geospasial profesional untuk software SIG.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Pilih Jangkauan Data */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  2. Cakupan Data Tiang
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportScope('CURRENT')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      exportScope === 'CURRENT'
                        ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900 ring-2 ring-blue-400/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-black">
                      Sesuai Filter Aktif
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {currentPoles.length} tiang terpilih
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('ALL')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      exportScope === 'ALL'
                        ? 'border-blue-600 bg-blue-50/60 font-bold text-blue-900 ring-2 ring-blue-400/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-black">
                      Seluruh Database
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Semua tiang Kota Lubuklinggau
                    </span>
                  </button>
                </div>
              </div>

              {/* 3. Panduan Penggunaan Singkat */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] space-y-1 text-slate-600">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cara Membuka File di Google Earth / Google Maps:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 pl-1 text-[10.5px]">
                  <li>
                    <strong>Google Earth:</strong> Cukup klik 2x file <code>.kml</code> yang terunduh, Google Earth akan langsung terbang ke Lubuklinggau dan menampilkan seluruh pin tiang.
                  </li>
                  <li>
                    <strong>Google Maps (My Maps):</strong> Buka <em>mymaps.google.com</em>, klik <em>Buat Peta Baru</em> &gt; <em>Impor</em> &gt; pilih file <code>.kml</code> atau <code>.csv</code>.
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isExporting || currentPoles.length === 0}
                onClick={handleExport}
                className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mempersiapkan File...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      Unduh Berkas {selectedFormat} (
                      {exportScope === 'CURRENT'
                        ? currentPoles.length
                        : totalPolesCount || currentPoles.length}{' '}
                      Tiang)
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
