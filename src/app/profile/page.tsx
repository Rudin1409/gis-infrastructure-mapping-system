import React from 'react';
import Link from 'next/link';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import {
  User,
  ShieldCheck,
  Building,
  Database,
  Cloud,
  RefreshCw,
  MapPin,
  Palette,
  Cable,
  Layers,
  Sparkles,
  ChevronRight,
  Info,
  CheckCircle2,
  Sliders,
  ExternalLink,
  Lock,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const poleRepo = getPoleRepository();
  const allPoles = await poleRepo.findAll();

  return (
    <div className="p-4 space-y-4 text-slate-800 font-sans pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <User className="w-4 h-4" />
            </div>
            <span>Profil &amp; Pengaturan</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Akun surveyor &amp; konfigurasi sistem GIS lapangan
          </p>
        </div>

        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Online
        </span>
      </div>

      {/* 1. Surveyor Identity Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-4 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden space-y-3">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-13 h-13 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center text-white text-xl font-black shadow-inner">
            👨‍💼
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-black tracking-tight leading-tight">
                Surveyor 1
              </h2>
              <ShieldCheck className="w-4 h-4 text-cyan-300" />
            </div>
            <p className="text-xs text-blue-100 font-medium">
              Petugas Lapangan Kominfo / Bapenda
            </p>
            <span className="inline-block text-[10px] text-cyan-200 bg-white/15 px-2 py-0.5 rounded-full font-mono mt-1">
              Wilayah Kota Lubuklinggau
            </span>
          </div>
        </div>

        {/* Mini Stats inside Card */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/15 relative z-10 text-xs">
          <div className="bg-white/10 rounded-2xl p-2 text-center backdrop-blur-xs">
            <span className="text-[9px] text-blue-200 uppercase font-bold block">
              Total Kontribusi
            </span>
            <span className="text-lg font-black font-mono mt-0.5 block">
              {allPoles.length} Tiang
            </span>
          </div>

          <div className="bg-white/10 rounded-2xl p-2 text-center backdrop-blur-xs">
            <span className="text-[9px] text-blue-200 uppercase font-bold block">
              Cakupan Wilayah
            </span>
            <span className="text-lg font-black font-mono mt-0.5 block">
              8 Kecamatan
            </span>
          </div>
        </div>
      </div>

      {/* 2. Cloud Database & Synchronization Status */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Cloud className="w-3.5 h-3.5 text-blue-600" />
          <span>Status Sinkronisasi Cloud</span>
        </h3>

        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Database Master:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Google Sheets API
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Penyimpanan Foto:</span>
            <span className="font-bold text-slate-900">Google Drive Cloud</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Status Sinkronisasi:</span>
            <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
              Otomatis Real-Time
            </span>
          </div>
        </div>
      </div>

      {/* 3. Field Guides & Reference Modules */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-2.5">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Pusat Panduan &amp; Modul Lapangan</span>
        </h3>

        <div className="grid grid-cols-1 gap-1.5 text-xs">
          {/* Katalog Ciri Warna Tiang */}
          <Link
            href="/providers"
            className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-100 hover:border-blue-200 flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block leading-tight">
                  Katalog Ciri 20 Warna Tiang
                </span>
                <span className="text-[10px] text-slate-500">
                  Infografis resmi marka gelang cat tiang provider
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>

          {/* 8 Kecamatan Lubuklinggau */}
          <Link
            href="/districts"
            className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-100 hover:border-blue-200 flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block leading-tight">
                  Master 8 Kecamatan &amp; 72 Kelurahan
                </span>
                <span className="text-[10px] text-slate-500">
                  Daftar batas administrasi wilayah Kota Lubuklinggau
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>

          {/* Topologi Jalur Kabel */}
          <Link
            href="/segments"
            className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-100 hover:border-blue-200 flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Cable className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block leading-tight">
                  Jalur Kabel &amp; Topologi FO
                </span>
                <span className="text-[10px] text-slate-500">
                  Inventarisasi bentangan kabel udara &amp; duct bawah tanah
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>
        </div>
      </div>

      {/* 4. GPS & System Preferences */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-blue-600" />
          <span>Pengaturan GPS &amp; Sensor</span>
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <span className="font-bold text-slate-900 block text-xs">
                Mode GPS Presisi Tinggi
              </span>
              <span className="text-[10px] text-slate-500">
                Menggunakan sensor satelit multi-GNSS perangkat
              </span>
            </div>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold">
              Aktif
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
            <div>
              <span className="font-bold text-slate-900 block text-xs">
                Kompresi Otomatis Foto
              </span>
              <span className="text-[10px] text-slate-500">
                Optimasi gambar untuk upload cepat di sinyal lemah
              </span>
            </div>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-bold">
              1200px / 80%
            </span>
          </div>
        </div>
      </div>

      {/* 5. Application Information & Version */}
      <div className="p-4 text-center space-y-1 text-xs text-slate-400">
        <p className="font-black text-slate-700 tracking-wider uppercase text-[10px]">
          INFRA-MAP GIS KOTA LUBUKLINGGAU
        </p>
        <p className="text-[10px]">
          Versi 2.0.0 (Production Build) • Pemerintah Kota Lubuklinggau
        </p>
        <p className="text-[9px] text-slate-400">
          Dinas Komunikasi dan Informatika &amp; Badan Pendapatan Daerah
        </p>
      </div>
    </div>
  );
}
