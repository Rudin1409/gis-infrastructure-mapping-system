'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_ACCOUNTS } from '@/types/auth';
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
  LogOut,
  UserCheck,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, loginAs, logout } = useAuth();
  const currentUser = user || DEFAULT_ACCOUNTS[0];

  return (
    <div className="p-4 space-y-4 text-slate-800 font-sans pb-20 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <User className="w-4 h-4" />
            </div>
            <span>Profil &amp; Akun Dinas</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Akun aktif &amp; identitas petugas survei GIS
          </p>
        </div>

        <button
          type="button"
          onClick={logout}
          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>

      {/* 1. Active User Identity Card */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-700 rounded-3xl p-4 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden space-y-3">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-start gap-3 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
            {currentUser.avatar || '👨‍💼'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-black tracking-tight leading-tight truncate">
                {currentUser.name}
              </h2>
              <ShieldCheck className="w-4 h-4 text-cyan-300 flex-shrink-0" />
            </div>
            <p className="text-xs text-blue-100 font-bold mt-0.5">
              {currentUser.roleLabel}
            </p>
            <p className="text-[11px] text-blue-200/90 font-medium leading-snug mt-1">
              {currentUser.agency}
            </p>
            <span className="inline-block text-[10px] text-cyan-200 bg-white/15 px-2.5 py-0.5 rounded-full font-mono mt-2">
              {currentUser.email}
            </span>
          </div>
        </div>

        {/* Mini Stats inside Card */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/15 relative z-10 text-xs">
          <div className="bg-white/10 rounded-2xl p-2 text-center backdrop-blur-xs">
            <span className="text-[9px] text-blue-200 uppercase font-bold block">
              Hak Akses Role
            </span>
            <span className="text-xs font-black font-mono mt-0.5 block text-cyan-200">
              {currentUser.role}
            </span>
          </div>

          <div className="bg-white/10 rounded-2xl p-2 text-center backdrop-blur-xs">
            <span className="text-[9px] text-blue-200 uppercase font-bold block">
              Wilayah Kerja
            </span>
            <span className="text-xs font-black font-mono mt-0.5 block text-cyan-200">
              Kota Lubuklinggau
            </span>
          </div>
        </div>
      </div>

      {/* 2. Informasi Keamanan Sesi & Ganti Akun */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            <span>Keamanan Sesi &amp; Hak Akses Petugas</span>
          </span>
          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
            Terverifikasi Aktif
          </span>
        </h3>

        <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Nomor Handphone:</span>
            <span className="font-bold text-slate-800 font-mono">{currentUser.phone || '0812-xxxx-xxxx'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">ID Database Surveyor:</span>
            <span className="font-bold text-slate-800 font-mono text-blue-600">{currentUser.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Status Akun Spreadsheet:</span>
            <span className="font-bold text-emerald-600 font-mono">AKTIF (DATA_SURVEYOR)</span>
          </div>
        </div>

        <div className="pt-1">
          <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
            Untuk menjaga integritas dan riwayat audit survei lapangan Kota Lubuklinggau, pergantian akun wajib melalui proses <strong>Keluar (Logout)</strong> dan login ulang menggunakan email serta kata sandi resmi yang terdaftar di Google Spreadsheet.
          </p>
          <button
            type="button"
            onClick={logout}
            className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 active:scale-[0.99] text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun &amp; Masuk Sebagai Petugas Lain</span>
          </button>
        </div>
      </div>

      {/* 3. Cloud Database & Synchronization Status */}
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

      {/* 4. Field Guides & Reference Modules */}
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
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block leading-tight">
                  8 Kecamatan Kota Lubuklinggau
                </span>
                <span className="text-[10px] text-slate-500">
                  Daftar lengkap 72 kelurahan &amp; kode wilayah
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}
