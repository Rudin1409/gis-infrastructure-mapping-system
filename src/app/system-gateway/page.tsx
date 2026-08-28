'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Server,
  RefreshCw,
  Eye,
  Layers,
  Database,
  ArrowRight,
} from 'lucide-react';
import GISApiQuotaExceededLock from '@/components/common/GISApiQuotaExceededLock';

export default function SystemGatewayPage() {
  const [pin, setPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [reason, setReason] = useState<string>(
    'Akses modul pemetaan spasial dan visualisasi layer peta dinonaktifkan sementara oleh API Gateway karena volume data dan pemanggilan layer telah melampaui batas kuota paket dasar yang dialokasikan.'
  );
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch current status on mount
  const fetchCurrentStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/system/license', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setIsLocked(data.isLocked);
        if (data.reason) setReason(data.reason);
        if (data.updatedAt) setUpdatedAt(data.updatedAt);
      }
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentStatus();
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    if (!pin || pin.length < 4) {
      setAuthError('Masukkan PIN Keamanan Master dengan benar.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch('/api/system/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, isLocked }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIsAuthorized(true);
        setIsLocked(data.isLocked);
        if (data.reason) setReason(data.reason);
      } else {
        setAuthError(data.error || 'PIN Otorisasi Master Salah.');
      }
    } catch (err: any) {
      setAuthError('Gagal menghubungkan ke server sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLock = async (newLockState: boolean) => {
    setIsSaving(true);
    setToastMessage(null);
    try {
      const res = await fetch('/api/system/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          isLocked: newLockState,
          reason,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setIsLocked(data.isLocked);
        setUpdatedAt(data.updatedAt || new Date().toISOString());
        setToastMessage(data.message);
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        alert(data.error || 'Gagal mengubah status lisensi peta.');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan koneksi server.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-red-600 selection:text-white font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-950 border border-emerald-500/80 text-emerald-200 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen 1: Admin Authorization */}
      {!isAuthorized ? (
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in zoom-in-95 duration-300">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center mx-auto shadow-xl">
              <ShieldAlert className="w-8 h-8 text-slate-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wider uppercase text-white font-mono">
                Akses Khusus Admin
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Autentikasi Keamanan Administrator Sistem
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Kata Sandi Otorisasi Admin:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={15}
                  placeholder="••••••"
                  autoFocus
                  className="w-full px-4 py-3.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-center text-xl font-mono tracking-widest text-white placeholder-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              {authError && (
                <div className="mt-2 text-xs font-bold text-red-400 flex items-center gap-1.5 justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{authError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !pin}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/30 cursor-pointer transition-all disabled:opacity-50"
            >
              {isLoading ? 'Memverifikasi...' : 'Masuk Gateway Admin'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Akses Terbatas • Khusus Administrator
            </span>
          </div>
        </div>
      ) : (
        /* Screen 2: Master Switch Control Panel */
        <div className="w-full max-w-2xl bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.9)] backdrop-blur-2xl animate-in fade-in duration-300 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-xl ${
                  isLocked
                    ? 'bg-red-600 shadow-red-600/30'
                    : 'bg-emerald-600 shadow-emerald-600/30'
                }`}
              >
                {isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </div>
              <div>
                <h1 className="text-base font-black text-white uppercase tracking-wider font-mono">
                  Master Switch Penguncian Peta GIS
                </h1>
                <p className="text-xs text-slate-400">
                  Status Saat Ini:{' '}
                  <strong className={isLocked ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {isLocked ? '🔒 TERKUNCI (Mode Berbayar / Kuota API Habis)' : '🟢 AKTIF NORMAL (Peta Terbuka)'}
                  </strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsAuthorized(false);
                setPin('');
              }}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Kunci Kembali Gateway"
            >
              Keluar
            </button>
          </div>

          {/* Big Master Toggle Hero Card */}
          <div
            className={`p-6 rounded-3xl border transition-all ${
              isLocked
                ? 'bg-red-950/40 border-red-500/60 shadow-xl shadow-red-950/50'
                : 'bg-emerald-950/40 border-emerald-500/60 shadow-xl shadow-emerald-950/50'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
              <div className="space-y-1.5 max-w-md">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-black/40 border border-white/10">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isLocked ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-pulse'
                    }`}
                  />
                  <span>
                    {isLocked ? 'Status: Layanan Terkunci' : 'Status: Layanan Aktif'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white leading-tight">
                  {isLocked
                    ? 'Peta GIS sedang TERKUNCI untuk seluruh pengguna umum.'
                    : 'Peta GIS sedang DIBUKA dan dapat diakses normal.'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isLocked
                    ? 'Pengguna yang membuka peta GIS maupun survei tiang baru akan melihat respon API Gateway 429 Quota Exceeded.'
                    : 'Semua surveyor dan dinas dapat melihat seluruh titik tiang, koordinat, dan layer peta secara bebas.'}
                </p>
              </div>

              {/* Action Button */}
              <div className="flex-shrink-0">
                {isLocked ? (
                  <button
                    type="button"
                    onClick={() => handleToggleLock(false)}
                    disabled={isSaving}
                    className="py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-600/30 cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>{isSaving ? 'Memproses...' : 'Buka Kunci Peta (Normal)'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleLock(true)}
                    disabled={isSaving}
                    className="py-4 px-6 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-red-600/30 cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{isSaving ? 'Memproses...' : 'Kunci Peta Sekarang'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Reason Configuration */}
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/90 space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Pesan / Alasan Penguncian API Gateway:
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tuliskan pesan alasan penguncian..."
              className="w-full p-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500 font-sans leading-relaxed"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>* Pesan resmi API Gateway ini otomatis tampil di seluruh peta saat terkunci.</span>
              <button
                type="button"
                onClick={() => handleToggleLock(isLocked)}
                disabled={isSaving}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                Simpan Perubahan Teks
              </button>
            </div>
          </div>

          {/* Live Preview of What Users See */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-blue-400" />
                <span>Pratinjau Layar Kunci Pengguna:</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Terakhir diubah: {updatedAt ? new Date(updatedAt).toLocaleString('id-ID') : '-'}
              </span>
            </div>

            {/* Render Actual GISApiQuotaExceededLock component in preview */}
            <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
              <GISApiQuotaExceededLock customMessage={reason} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
