'use client';

import React from 'react';
import Link from 'next/link';
import { Radio, Plus, ShieldCheck, Bell, MapPin, Sparkles } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/90 px-4 py-2.5 flex items-center justify-between shadow-md select-none">
      {/* Brand & City Badge */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 group-hover:scale-105 transition-transform">
          <Radio className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black tracking-tight text-white uppercase font-mono">
              INFRA-MAP
            </span>
            <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded text-[9px] font-bold">
              LUBUKLINGGAU
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-none mt-0.5">
            DISKOMINFOTIKSAN Kota Lubuklinggau
          </p>
        </div>
      </Link>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Live GPS Status Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded-full text-[10px] text-emerald-400 font-bold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>GPS Siap</span>
        </div>
      </div>
    </header>
  );
}
