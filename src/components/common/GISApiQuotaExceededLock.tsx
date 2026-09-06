'use client';

import React from 'react';
import { AlertOctagon, Layers, Terminal, AlertTriangle } from 'lucide-react';

interface GISApiQuotaExceededLockProps {
  compact?: boolean;
  customMessage?: string;
}

export default function GISApiQuotaExceededLock({
  compact = false,
  customMessage,
}: GISApiQuotaExceededLockProps) {
  if (compact) {
    return (
      <div className="w-full h-full min-h-[160px] bg-slate-950 text-slate-200 p-4 rounded-2xl border border-red-500/40 flex flex-col items-center justify-center text-center space-y-2 select-none">
        <div className="w-8 h-8 rounded-xl bg-red-950/80 border border-red-500/50 text-red-400 flex items-center justify-center shadow-lg">
          <AlertOctagon className="w-4 h-4" />
        </div>
        <div className="space-y-0.5">
          <div className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider">
            API 429 • Quota Limit Exceeded
          </div>
          <p className="text-[11px] text-slate-400 font-sans max-w-xs leading-tight">
            Layanan pemetaan GIS ditangguhkan otomatis karena kuota panggilan data API telah
            melampaui batas paket.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-[#0a0f1d] to-[#050811] text-slate-100 p-4 sm:p-6 select-none overflow-hidden font-sans">
      {/* Background Technical Grid and Ambient Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Official-Style API Lock Container */}
      <div className="relative z-10 w-full max-w-lg bg-slate-900/95 border border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-center space-y-5 animate-in zoom-in-95 duration-300">
        {/* API Engine Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-widest bg-red-950/90 text-red-400 border border-red-500/40 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>GEOSPATIAL API GATEWAY • STATUS 429</span>
        </div>

        {/* Animated Map Engine Warning Emblem */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-red-600/20 border border-red-500/30 animate-pulse opacity-40" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-amber-700 text-white flex items-center justify-center shadow-xl shadow-red-900/50 border border-red-400/40">
            <Layers className="w-8 h-8 stroke-[2.2]" />
          </div>
        </div>

        {/* Official API Suspension Header & Description */}
        <div className="space-y-2">
          <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase font-mono leading-snug">
            GIS API Service: Quota Limit Exceeded
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            {customMessage ||
              'Akses modul pemetaan spasial dan visualisasi layer peta ditangguhkan otomatis oleh API Gateway karena volume data dan pemanggilan layer telah melampaui batas alokasi kuota paket yang tersedia.'}
          </p>
        </div>

        {/* Technical API Protocol Terminal Box */}
        <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 text-left font-mono text-[11px] space-y-2 text-slate-300 shadow-inner">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-red-400" />
              <span>GATEWAY RESPONSE LOG</span>
            </span>
            <span className="text-red-400 font-bold">HTTP 429 / 402</span>
          </div>

          <div className="space-y-1 text-[10.5px]">
            <div className="flex justify-between">
              <span className="text-slate-500">API SERVICE:</span>
              <span className="text-slate-300 font-bold">Geospatial Vector Tile Engine</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">QUOTA USAGE:</span>
              <span className="text-red-400 font-bold">Threshold Exceeded (Limit Reached)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ENGINE STATE:</span>
              <span className="text-amber-400 font-bold">Suspended (Offline Mode)</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800/80 text-[10px]">
              <span className="text-slate-500">RESOLUTION:</span>
              <span className="text-slate-400">Upgrade Enterprise License Tier</span>
            </div>
          </div>
        </div>

        {/* Formal API Footnote - Pure Automated GIS API notice */}
        <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans pt-1">
          Layanan pemetaan interaktif ditangguhkan otomatis oleh API Geospatial Gateway karena batas
          alokasi kuota pemanggilan telah terpenuhi. Diperlukan pembaruan paket lisensi untuk
          mengaktifkan kembali akses API.
        </p>
      </div>
    </div>
  );
}
