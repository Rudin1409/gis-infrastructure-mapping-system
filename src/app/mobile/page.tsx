'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  ExternalLink,
  RotateCcw,
  LayoutDashboard,
  Map,
  PlusCircle,
  Database,
  Cable,
  QrCode,
  CheckCircle2,
  Sparkles,
  Wifi,
  Battery,
  Signal,
  ShieldAlert,
} from 'lucide-react';

export default function MobileSimulatorPage() {
  const [currentTab, setCurrentTab] = useState<string>('/surveyor');
  const [deviceScale, setDeviceScale] = useState<number>(100);

  const tabs = [
    {
      label: 'Portal Surveyor',
      href: '/surveyor',
      icon: LayoutDashboard,
      desc: 'UNPIX Royal Blue Style',
    },
    { label: 'Survey Baru', href: '/poles/new', icon: PlusCircle, desc: 'GPS & Kamera HP' },
    { label: 'Peta GIS', href: '/map', icon: Map, desc: 'Peta Interaktif Lapangan' },
    { label: 'Data Tiang', href: '/poles', icon: Database, desc: 'Daftar Inventaris' },
    {
      label: 'Penataan Kabel',
      href: '/segments',
      icon: ShieldAlert,
      desc: 'Audit & Kabel Semrawut',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col items-center justify-center">
      {/* Top Banner & Control */}
      <div className="w-full max-w-5xl mb-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Smartphone className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                <span>Preview Aplikasi Mobile (PWA Surveyor)</span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 rounded-full text-[10px] font-semibold">
                  Live Simulator
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Tampilan antarmuka khusus HP Android / iOS untuk tim survey lapangan
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Direct Link */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = currentTab === t.href;
              return (
                <button
                  key={t.href}
                  type="button"
                  onClick={() => setCurrentTab(t.href)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          <a
            href={currentTab}
            target="_blank"
            rel="noreferrer"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-all"
            title="Buka Layar Penuh"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Realistic Mobile Device Frame (Android Frame) */}
      <div className="relative flex flex-col items-center">
        {/* Outer Phone Shell */}
        <div className="relative w-[380px] sm:w-[410px] h-[820px] bg-slate-900 rounded-[50px] p-3 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_0_12px_#1e293b,0_0_0_14px_#334155] border-4 border-slate-700/50 flex flex-col overflow-hidden">
          {/* Top Speaker / Punch-hole Camera */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-black border-2 border-slate-800 shadow-inner flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
            </div>
          </div>

          {/* Android Status Bar */}
          <div className="h-7 bg-blue-700 text-white px-7 flex items-center justify-between text-[11px] font-semibold z-40 rounded-t-[38px] select-none">
            <span>08:30</span>
            <div className="flex items-center gap-1.5">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Phone Screen Frame (Iframe) */}
          <div className="flex-1 w-full bg-slate-950 rounded-b-[38px] overflow-hidden relative">
            <iframe
              key={currentTab}
              src={currentTab}
              title="Mobile Surveyor Screen"
              className="w-full h-full border-0"
            />
          </div>

          {/* Android Bottom Home Pill Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-600/80 rounded-full z-50 pointer-events-none" />
        </div>

        {/* Instructions Footer */}
        <div className="mt-6 text-center max-w-md space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Responsif 100% Layar HP Asli</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Anda juga dapat membuka aplikasi ini langsung di HP Anda dengan mengakses alamat server
            lokal di browser smartphone (atau tekan tombol{' '}
            <strong>F12 ➔ Toggle Device Toolbar</strong> di browser PC Anda).
          </p>
        </div>
      </div>
    </div>
  );
}
