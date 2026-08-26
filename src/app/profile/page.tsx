'use client';

import React, { useState } from 'react';
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
  Edit3,
  Phone,
  Briefcase,
  Save,
  X,
} from 'lucide-react';

const AVATAR_OPTIONS = ['🏢', '👨‍💼', '👩‍💼', '🧑‍💻', '👷‍♂️', '🛡️', '📡', '🌐', '⚡'];

export default function ProfilePage() {
  const { user, loginAs, logout } = useAuth();
  const currentUser = user || DEFAULT_ACCOUNTS[0];

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone || '0812-7890-1234');
  const [roleLabel, setRoleLabel] = useState(currentUser.roleLabel);
  const [avatar, setAvatar] = useState(currentUser.avatar || '🏢');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser = {
      ...currentUser,
      name: name.trim() || currentUser.name,
      phone: phone.trim() || currentUser.phone,
      roleLabel: roleLabel.trim() || currentUser.roleLabel,
      avatar: avatar || currentUser.avatar,
    };

    loginAs(updatedUser);
    setIsEditing(false);
    setSuccessMsg('Data profil petugas berhasil diperbarui & disimpan!');
    setTimeout(() => {
      setSuccessMsg(null);
    }, 3000);
  };

  const handleCancelEdit = () => {
    setName(currentUser.name);
    setPhone(currentUser.phone || '0812-7890-1234');
    setRoleLabel(currentUser.roleLabel);
    setAvatar(currentUser.avatar || '🏢');
    setIsEditing(false);
  };

  return (
    <div className="p-4 space-y-4 text-slate-800 font-sans pb-24 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <User className="w-4 h-4" />
            </div>
            <span>Profil &amp; Akun Petugas</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Identitas resmi petugas DISKOMINFOTIKSAN Kota Lubuklinggau
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Ubah Profil</span>
          </button>
        )}
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. EDIT PROFILE FORM / IDENTITY CARD                         */}
      {/* ============================================================ */}
      {isEditing ? (
        <form
          onSubmit={handleSaveProfile}
          className="bg-white rounded-3xl p-5 border border-blue-200 shadow-[0_8px_30px_rgba(37,99,235,0.08)] space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-blue-600" />
              <span>Edit Data Profil Petugas</span>
            </h3>
            <span className="text-[10px] text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
              {currentUser.id}
            </span>
          </div>

          {/* Pilih Avatar Emoji */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1.5">
              Pilih Ikon / Avatar Petugas
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {AVATAR_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAvatar(item)}
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-all cursor-pointer ${
                    avatar === item
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-110 ring-2 ring-blue-400'
                      : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Nama Lengkap */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Nama Lengkap Petugas
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Lengkap"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 font-semibold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          {/* Jabatan / Sub-Bagian */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Jabatan / Unit Kerja Lapangan
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
                placeholder="Jabatan / Sub-Bidang"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 font-semibold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          {/* Nomor Handphone */}
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
              Nomor Handphone / WhatsApp
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 font-mono font-semibold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Batal</span>
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Profil</span>
            </button>
          </div>
        </form>
      ) : (
        /* Active User Identity Card (View Mode) */
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-700 rounded-3xl p-4 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden space-y-3">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-start gap-3 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
              {currentUser.avatar || '🏢'}
            </div>
            <div className="min-w-0 flex-1">
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
                Dinas Komunikasi, Informatika, Statistik dan Persandian (DISKOMINFOTIKSAN) Kota Lubuklinggau
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
      )}

      {/* ============================================================ */}
      {/* 2. INFORMASI KEAMANAN SESI & DATA SPREADSHEET                */}
      {/* ============================================================ */}
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
            <span className="text-slate-500 font-medium">Nomor Handphone / WA:</span>
            <span className="font-bold text-slate-800 font-mono">{currentUser.phone || '0812-7890-1234'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">ID Petugas Surveyor:</span>
            <span className="font-bold text-slate-800 font-mono text-blue-600">{currentUser.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Instansi Resmi:</span>
            <span className="font-bold text-slate-800">DISKOMINFOTIKSAN</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Status Database:</span>
            <span className="font-bold text-emerald-600 font-mono">AKTIF &amp; TERSINKRON</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. STATUS SINKRONISASI CLOUD                                 */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Cloud className="w-3.5 h-3.5 text-blue-600" />
          <span>Status Sinkronisasi Cloud Spasial</span>
        </h3>

        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Database Master:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Server Cloud Terenkripsi
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Penyimpanan Media &amp; Foto:</span>
            <span className="font-bold text-slate-900">Cloud Storage DISKOMINFOTIKSAN</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-medium">Status Sinkronisasi:</span>
            <span className="font-mono text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
              Otomatis Real-Time
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. PUSAT PANDUAN & MODUL LAPANGAN                            */}
      {/* ============================================================ */}
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

      {/* ============================================================ */}
      {/* 5. TOMBOL LOGOUT RESMI DI PALING BAWAH                      */}
      {/* ============================================================ */}
      <div className="pt-2">
        <button
          type="button"
          onClick={logout}
          className="w-full py-3.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 active:scale-[0.98] text-rose-700 border border-rose-200 font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-rose-600 stroke-[2.5]" />
          <span>Keluar dari Akun (Logout)</span>
        </button>
        <p className="text-[10px] text-slate-400 text-center mt-2 font-medium">
          Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau
        </p>
      </div>
    </div>
  );
}
