'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useViewMode } from '@/context/ViewModeContext';
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
  Navigation,
  Smartphone,
  Monitor,
  Activity,
  Radio,
  Map as MapIcon,
  Check,
} from 'lucide-react';

const AVATAR_OPTIONS = ['🏢', '👨‍💼', '👩‍💼', '🧑‍💻', '👷‍♂️', '🛡️', '📡', '🌐', '⚡'];

export default function ProfilePage() {
  const { user, loginAs, logout } = useAuth();
  const { viewMode, toggleViewMode } = useViewMode();
  const currentUser = user || DEFAULT_ACCOUNTS[0] || { name: 'Admin', role: 'ADMIN', roleLabel: 'Administrator', id: 'SRV-001', email: 'admin@lubuklinggaukota.go.id', phone: '0812-7890-1234', avatar: '🏢' };

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || 'Admin');
  const [phone, setPhone] = useState(currentUser?.phone || '0812-7890-1234');
  const [roleLabel, setRoleLabel] = useState(currentUser?.roleLabel || 'Petugas Lapangan');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '🏢');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // GPS Calibration State
  const [isTestingGps, setIsTestingGps] = useState(false);
  const [gpsResult, setGpsResult] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: string;
  } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const testGpsAccuracy = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Browser tidak mendukung geolokasi GPS.');
      return;
    }

    setIsTestingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsTestingGps(false);
        setGpsResult({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy * 10) / 10,
          timestamp: new Date().toLocaleTimeString('id-ID'),
        });
      },
      (err) => {
        setIsTestingGps(false);
        setGpsError(`Gagal membaca GPS: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

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
    setName(currentUser?.name || 'Admin');
    setPhone(currentUser?.phone || '0812-7890-1234');
    setRoleLabel(currentUser?.roleLabel || 'Petugas Lapangan');
    setAvatar(currentUser?.avatar || '🏢');
    setIsEditing(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-slate-800 font-sans pb-28 animate-in fade-in duration-200 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pt-1 pb-1 border-b border-slate-200/80">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <User className="w-4 h-4" />
            </div>
            <span>Profil &amp; Akun Petugas</span>
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Identitas resmi aparatur DISKOMINFOTIKSAN Kota Lubuklinggau
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
        /* Active User Identity Card (Executive GovTech Card) */
        <div className="bg-gradient-to-br from-slate-950 via-[#0d162a] to-[#122247] rounded-3xl p-5 text-white shadow-xl shadow-slate-950/20 border border-slate-800 relative overflow-hidden space-y-4">
          {/* Ambient Glow */}
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-blue-600/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute top-0 right-10 w-32 h-32 bg-indigo-500/15 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-start gap-3.5 relative z-10">
            {/* Avatar with Online Beacon */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 border-2 border-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-lg flex-shrink-0">
                {currentUser.avatar || '🏢'}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight truncate">
                  {currentUser.name}
                </h2>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[10px] text-blue-300 font-bold">
                  <ShieldCheck className="w-3 h-3 text-cyan-300" />
                  <span>Resmi Terverifikasi</span>
                </div>
              </div>

              <p className="text-xs text-blue-200 font-bold mt-1">
                {currentUser.roleLabel}
              </p>
              <p className="text-[11px] text-slate-300 font-normal leading-snug mt-0.5">
                Dinas Komunikasi, Informatika, Statistik dan Persandian (DISKOMINFOTIKSAN) Kota Lubuklinggau
              </p>

              <div className="flex items-center gap-2 mt-2.5 flex-wrap text-[10px] font-mono">
                <span className="text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                  {currentUser.id}
                </span>
                <span className="text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                  {currentUser.email}
                </span>
                <span className="text-emerald-300 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-700/40">
                  {currentUser.phone || '0812-7890-1234'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Telemetry Strip */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 relative z-10 text-xs">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center backdrop-blur-xs">
              <span className="text-[9px] text-slate-400 uppercase font-bold block tracking-wider">
                HAK AKSES
              </span>
              <span className="text-[11px] font-black font-mono mt-0.5 block text-cyan-300 truncate">
                {currentUser.role}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center backdrop-blur-xs">
              <span className="text-[9px] text-slate-400 uppercase font-bold block tracking-wider">
                WILAYAH
              </span>
              <span className="text-[11px] font-black font-mono mt-0.5 block text-cyan-300 truncate">
                Lubuklinggau
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-2.5 text-center backdrop-blur-xs">
              <span className="text-[9px] text-slate-400 uppercase font-bold block tracking-wider">
                SESI
              </span>
              <span className="text-[11px] font-black font-mono mt-0.5 block text-emerald-400 truncate">
                Online Aktif
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. DEVICE & FIELD TELEMETRY DIAGNOSTICS                      */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-600" />
            <span>Diagnostik Perangkat &amp; Kalibrasi GPS Lapangan</span>
          </h3>
          <span className="text-[10px] font-mono text-slate-400">WGS84</span>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="font-bold text-slate-800 block">
                Kalibrasi Akurasi Geospasial Perangkat
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pastikan sinyal GPS handphone/tablet memiliki radius akurasi tinggi sebelum mengambil data tiang.
              </p>
            </div>

            <button
              type="button"
              onClick={testGpsAccuracy}
              disabled={isTestingGps}
              className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer disabled:opacity-60 flex-shrink-0"
            >
              {isTestingGps ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengunci Sinyal...</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5 text-blue-200" />
                  <span>Uji Akurasi GPS</span>
                </>
              )}
            </button>
          </div>

          {gpsResult && (
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-900 space-y-1 animate-in fade-in">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Sinyal GPS Terkunci ({gpsResult.timestamp})</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono text-[10.5px]">
                  ± {gpsResult.accuracy} meter {gpsResult.accuracy <= 10 ? '• Akurasi Tinggi' : '• Akurasi Cukup'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-emerald-800/80 flex items-center gap-3 pt-1">
                <span>Lat: {gpsResult.lat.toFixed(6)}</span>
                <span>Lng: {gpsResult.lng.toFixed(6)}</span>
              </div>
            </div>
          )}

          {gpsError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-[11px] font-medium">
              {gpsError}
            </div>
          )}
        </div>

        {/* Database & Mode Tampilan Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-800 block truncate leading-tight">
                  Status Database VPS
                </span>
                <span className="text-[10px] text-slate-500 truncate block">
                  PostgreSQL &amp; Supabase Real-time
                </span>
              </div>
            </div>
            <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex-shrink-0">
              Terhubung
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                {viewMode === 'DESKTOP' ? (
                  <Monitor className="w-4 h-4" />
                ) : (
                  <Smartphone className="w-4 h-4" />
                )}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-800 block truncate leading-tight">
                  Mode Tampilan
                </span>
                <span className="text-[10px] text-slate-500 truncate block">
                  {viewMode === 'DESKTOP' ? 'Layar Penuh (Desktop)' : 'Mobile Phone Preview'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleViewMode}
              className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-[10.5px] font-bold transition-all active:scale-95 shadow-2xs flex-shrink-0 cursor-pointer"
            >
              Ubah Mode
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. PUSAT PANDUAN & MODUL LAPANGAN                            */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-2.5">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Pusat Panduan &amp; Modul Lapangan</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {/* Katalog Ciri Warna Tiang */}
          <Link
            href="/providers"
            className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-200 flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold flex-shrink-0">
                <Palette className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 block leading-tight truncate">
                  Katalog Marka 20 Tiang
                </span>
                <span className="text-[10px] text-slate-500 truncate block">
                  Infografis resmi warna cat tiang provider
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
          </Link>

          {/* 8 Kecamatan Lubuklinggau */}
          <Link
            href="/districts"
            className="p-3 rounded-2xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-200 flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 block leading-tight truncate">
                  8 Kecamatan Kota Lubuklinggau
                </span>
                <span className="text-[10px] text-slate-500 truncate block">
                  Daftar 72 kelurahan &amp; batas administrasi
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
          </Link>

          {/* Audit Kabel Semrawut */}
          <Link
            href="/segments"
            className="p-3 rounded-2xl bg-slate-50 hover:bg-amber-50/80 border border-slate-200/80 hover:border-amber-200 flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
                <Cable className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 block leading-tight truncate">
                  Audit Penataan Kabel
                </span>
                <span className="text-[10px] text-slate-500 truncate block">
                  Monitoring kabel semrawut &amp; bahaya fisik
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors flex-shrink-0" />
          </Link>

          {/* Peta Sebaran GIS */}
          <Link
            href="/map"
            className="p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/80 border border-slate-200/80 hover:border-emerald-200 flex items-center justify-between transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
                <MapIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 block leading-tight truncate">
                  Peta Sebaran Spasial GIS
                </span>
                <span className="text-[10px] text-slate-500 truncate block">
                  Visualisasi GIS layer satelit &amp; street
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
          </Link>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. TOMBOL LOGOUT RESMI                                       */}
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
