'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_ACCOUNTS, AuthUser } from '@/types/auth';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Radio,
  UserCheck,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginAs } = useAuth();

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
        setErrorMsg(res.error || 'Login gagal.');
        setIsLoading(false);
        return;
      }

      setSuccessMsg('Login berhasil! Mengalihkan...');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (account: typeof DEFAULT_ACCOUNTS[0]) => {
    setErrorMsg(null);
    setIsLoading(true);
    loginAs(account);
    setSuccessMsg(`Masuk sebagai ${account.name}...`);
    setTimeout(() => {
      router.push('/');
      router.refresh();
    }, 500);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-5 bg-gradient-to-b from-slate-900 via-[#0f172a] to-[#020617] text-white font-sans overflow-y-auto">
      {/* Top Brand Header */}
      <div className="pt-4 space-y-3 text-center">
        {/* Emblem & Glow */}
        <div className="relative inline-block mx-auto">
          <div className="absolute inset-0 bg-blue-500 rounded-3xl blur-xl opacity-40 animate-pulse" />
          <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 border-2 border-white/30 flex items-center justify-center text-white shadow-2xl mx-auto">
            <Radio className="w-8 h-8 stroke-[2.5]" />
          </div>
        </div>

        <div>
          <h1 className="text-lg font-black tracking-tight text-white uppercase font-mono">
            INFRA-MAP GIS
          </h1>
          <p className="text-xs text-blue-300 font-medium">
            Sistem Pemetaan Utilitas &amp; Retribusi Tiang
          </p>
          <span className="inline-block text-[10px] text-cyan-300 font-bold bg-blue-950/80 px-2.5 py-0.5 rounded-full border border-blue-500/30 mt-1">
            Pemerintah Kota Lubuklinggau
          </span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-5 border border-white/15 shadow-2xl space-y-4 my-auto">
        {/* Title */}
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Masuk ke Akun Anda
            </span>
          </div>
          <span className="text-[10px] text-blue-200 font-mono">v2.4 GIS</span>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-blue-200 uppercase mb-1">
              Email Pengguna
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@lubuklinggaukota.go.id"
                className="w-full pl-9 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-2xl text-xs text-white placeholder:text-slate-400 outline-none focus:border-cyan-400 focus:bg-white/15 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-blue-200 uppercase mb-1">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-white/10 border border-white/20 rounded-2xl text-xs text-white placeholder:text-slate-400 outline-none focus:border-cyan-400 focus:bg-white/15 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:opacity-95 active:scale-[0.98] text-white font-black text-xs shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                <span>Masuk Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Official Credentials Info Notice */}
        <div className="pt-3 border-t border-white/10 text-center text-[10px] text-blue-200/80 space-y-1">
          <p className="leading-relaxed">
            🔐 Masuk menggunakan akun terdaftar di lembar kerja <strong>DATA_SURVEYOR</strong> Google Spreadsheet.
          </p>
        </div>
      </div>

      {/* Bottom Footer Agency Info */}
      <div className="pt-2 text-center text-[10px] text-slate-400 space-y-1">
        <div className="flex items-center justify-center gap-2 text-blue-300 font-bold">
          <span>Dinas Kominfo</span>
          <span>•</span>
          <span>Bapenda Kota Lubuklinggau</span>
        </div>
        <p className="text-slate-500">
          Hak Cipta &copy; 2026 Pemerintah Kota Lubuklinggau.
        </p>
      </div>
    </div>
  );
}
