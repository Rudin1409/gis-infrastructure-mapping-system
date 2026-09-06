'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Map, Plus, Database, Settings, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN_KOMINFO' || user?.role === 'SUPER_ADMIN';

  // Hide BottomNav on Survey Wizard (/poles/new) and Pole Detail / Edit (/poles/[id])
  // so the action buttons and map have 100% unobstructed screen space with TopHeader back button
  const isFormOrDetailPage =
    pathname.startsWith('/poles/new') || (pathname.startsWith('/poles/') && pathname !== '/poles');

  if (isFormOrDetailPage) {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Beranda', icon: LayoutDashboard },
    { href: '/map', label: 'Peta GIS', icon: Map },
    { href: '/poles/new', label: 'Survey', icon: Plus, isPrimary: true },
    { href: '/poles', label: 'Katalog', icon: Database },
    {
      href: isAdmin ? '/admin' : '/profile',
      label: isAdmin ? 'Admin' : 'Profil',
      icon: isAdmin ? Settings : User,
    },
  ];

  return (
    <nav className="fixed bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[406px] z-40 bg-white/95 backdrop-blur-2xl border border-slate-200/80 shadow-[0_12px_40px_rgba(15,23,42,0.14)] rounded-3xl py-1 px-2 select-none transition-all duration-200 lg:hidden">
      <div className="flex items-center justify-around relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          if (item.isPrimary) {
            return (
              <div key={item.href} className="relative -top-5 flex flex-col items-center">
                <Link
                  href={item.href}
                  prefetch={true}
                  className="relative group p-0.5 active:scale-90 transition-transform duration-200"
                  aria-label="Survey Tiang Baru"
                >
                  {/* Outer Pulsing Glow */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 blur-md opacity-70 group-hover:opacity-100 transition-opacity" />

                  {/* Raised Central Button Circle */}
                  <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-xl border-4 border-white group-hover:scale-105 transition-transform">
                    <Plus className="w-6 h-6 stroke-[3] transition-transform group-hover:rotate-90 duration-300" />
                  </div>
                </Link>
                <span className="text-[10px] font-bold text-blue-600 -mt-1 tracking-tight">
                  Survey
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex flex-col items-center py-1.5 px-2 rounded-2xl transition-all duration-150 active:scale-90 ${
                isActive
                  ? 'text-blue-600 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-700 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 ${isActive ? 'stroke-[2.5] text-blue-600' : 'stroke-2 text-slate-400'}`}
                />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_#3b82f6] animate-in zoom-in-75" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
