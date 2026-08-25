'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setErrorMsg(res.error || 'Email atau kata sandi tidak cocok.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Login berhasil! Mengalihkan ke sistem GIS...');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memverifikasi kredensial.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col justify-between p-5 sm:p-8 bg-gradient-to-b from-white via-slate-50 to-blue-50/40 text-slate-800 font-sans relative overflow-hidden">
      {/* Decorative ambient background elements */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-teal-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Header */}
      <div className="pt-2 sm:pt-4 space-y-3 text-center relative z-10">
        {/* Animated App Logo Emblem */}
        <div className="relative inline-block mx-auto">
          <div className="absolute inset-0 bg-blue-500/15 rounded-3xl blur-xl animate-pulse" />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white border border-slate-100 shadow-[0_8px_30px_rgba(37,99,235,0.12)] p-2.5 flex items-center justify-center mx-auto transition-transform hover:scale-105">
            <img
              src="/images/app-logo.png"
              alt="Logo InfraMap GIS Kota Lubuklinggau"
              className="w-full h-full object-contain drop-shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase font-mono">
            INFRA-MAP GIS
          </h1>
          <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto">
            Sistem Pemetaan Utilitas &amp; Retribusi Infrastruktur
          </p>
          <div className="pt-0.5">
            <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-200 shadow-2xs">
              Pemerintah Kota Lubuklinggau
            </span>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-sm mx-auto my-auto relative z-10">
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-[0_12px_40px_rgba(15,23,42,0.06)] space-y-4">
          {/* Card Title */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                Masuk Petugas
              </span>
            </div>
            <span className="text-[10px] text-blue-600 font-mono font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
              v2.5 GIS
            </span>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleManualSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Email Pengguna Terdaftar
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin.kominfo@lubuklinggaukota.go.id"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:opacity-95 active:scale-[0.98] text-white font-black text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Akses...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem GIS</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Official Credentials Info Notice */}
          <div className="pt-3 border-t border-slate-100 text-center text-[10px] text-slate-500 space-y-1">
            <p className="leading-relaxed">
              🔐 Masuk menggunakan akun terdaftar di sheet <strong>DATA_SURVEYOR</strong> Google Spreadsheet.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Footer Agency Info */}
      <div className="pt-3 text-center text-[10px] text-slate-400 space-y-1 relative z-10">
        <div className="flex items-center justify-center gap-2 text-slate-600 font-bold text-[11px]">
          <span>Dinas Kominfosan</span>
          <span>•</span>
          <span>Bapenda Kota Lubuklinggau</span>
        </div>
        <p className="text-slate-400">
          Hak Cipta &copy; 2026 Pemerintah Kota Lubuklinggau.
        </p>
      </div>
    </div>
  );
}
