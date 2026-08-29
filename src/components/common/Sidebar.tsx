'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  PlusCircle,
  Database,
  ShieldAlert,
  Smartphone,
  Radio,
  FileSpreadsheet,
  HardDrive,
  ShieldCheck,
  Building2,
  Sparkles,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Overview Data', icon: LayoutDashboard },
    { href: '/poles', label: 'Inventaris Tiang', icon: Database },
    { href: '/map', label: 'Peta GIS Spasial', icon: Map },
    { href: '/ai', label: 'Asisten INFRA-AI', icon: Sparkles, isAi: true },
    { href: '/segments', label: 'Penataan Kabel', icon: ShieldAlert },
    { href: '/surveyor', label: 'Portal Surveyor HP', icon: Smartphone, isMobilePortal: true },
    { href: '/poles/new', label: 'Input Tiang Baru', icon: PlusCircle, isHighlight: true },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-[#0f766e] via-[#0d9488] to-[#115e59] text-white h-[calc(100vh-65px)] sticky top-[65px] p-4 select-none shadow-xl border-r border-teal-600/30">
      {/* Brand Header Inside Sidebar */}
      <div className="flex items-center gap-2.5 px-3 py-2 mb-4 bg-teal-800/40 rounded-2xl border border-teal-500/30 backdrop-blur-sm">
        <div className="w-8 h-8 rounded-xl bg-white text-teal-700 flex items-center justify-center font-bold shadow-md">
          <Radio className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-black tracking-tight uppercase block leading-tight">
            INFRA-MAP GIS
          </span>
          <span className="text-[10px] text-teal-200 font-medium">
            Kota Lubuklinggau
          </span>
        </div>
      </div>

      {/* Primary Navigation with PinHome Organic Curve Active Styling */}
      <nav className="space-y-1.5 flex-1">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-200/80">
          Menu Pengelolaan
        </div>

        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          if (link.isMobilePortal) {
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-teal-800 shadow-lg'
                    : 'bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30 border border-emerald-300/30'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-200 animate-pulse" />
                <div className="flex-1 flex items-center justify-between">
                  <span>{link.label}</span>
                  <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[9px] font-bold rounded-md uppercase">
                    HP
                  </span>
                </div>
              </Link>
            );
          }

          if (link.isAi) {
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-900/40 ring-2 ring-white/20'
                    : 'bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-100 border border-indigo-400/30'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <div className="flex-1 flex items-center justify-between">
                  <span>{link.label}</span>
                  <span className="px-1.5 py-0.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-[8px] font-black rounded-md uppercase tracking-wider shadow-xs">
                    AI
                  </span>
                </div>
              </Link>
            );
          }

          if (link.isHighlight) {
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 border border-amber-300/40 transition-all mt-2"
              >
                <PlusCircle className="w-4 h-4 text-amber-300" />
                <span>{link.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all relative ${
                isActive
                  ? 'bg-white text-teal-800 shadow-md font-bold'
                  : 'text-teal-100/90 hover:bg-teal-700/60 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-teal-700' : 'text-teal-200'}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Card (Illustration / Info Widget in PinHome Style) */}
      <div className="mt-auto pt-3 border-t border-teal-600/40 space-y-2.5">
        <div className="bg-teal-950/40 rounded-2xl p-3 border border-teal-500/30 text-[11px] space-y-1.5">
          <div className="flex items-center justify-between text-teal-200 font-bold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Sync Cloud</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/30 text-emerald-200 rounded-full font-mono">
              Ready
            </span>
          </div>
          <p className="text-[10px] text-teal-200/80 leading-relaxed">
            Database Cloud &amp; Media Storage aktif untuk sinkronisasi lapangan.
          </p>
        </div>

        <Link
          href="/surveyor"
          className="w-full py-2 px-3 bg-white hover:bg-teal-50 active:scale-95 text-teal-800 font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Buka Mode HP Surveyor</span>
        </Link>
      </div>
    </aside>
  );
}
