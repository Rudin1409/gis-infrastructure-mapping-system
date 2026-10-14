'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Database,
  Eye,
  Layers,
  Lock,
  Map,
  MapPin,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';

type AdminTab = 'overview' | 'management';

interface DashboardStats {
  totalPoles: number;
  goodCount: number;
  needsRepairCount: number;
  damagedCount: number;
  todayCount: number;
  totalSegments: number;
  totalEstimatedNetworkDistance: number;
  polesByKecamatan: { kecamatan: string; count: number }[];
}

interface DataSourceStatus {
  primary?: string;
  postgresConfigured?: boolean;
  database?: string;
  warning?: string;
  counts?: {
    poles?: number;
    providers?: number;
    segments?: number;
    users?: number;
  };
}

function formatDistance(meters?: number) {
  const value = Number(meters || 0);
  if (value < 1000) return `${value.toFixed(0)} m`;
  return `${(value / 1000).toFixed(2)} km`;
}

function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  accent,
  iconBg = 'bg-slate-100 text-slate-700',
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ElementType;
  accent: string;
  iconBg?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-950 font-mono">
            {value}
          </p>
          <p className={`mt-1 text-xs font-bold ${accent}`}>{caption}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dataSource, setDataSource] = useState<DataSourceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN_KOMINFO' || user?.role === 'SUPER_ADMIN';
  const totalKelurahan = useMemo(
    () => KECAMATAN_LUBUKLINGGAU.reduce((sum, item) => sum + item.kelurahan.length, 0),
    []
  );

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [dashboardRes, dataSourceRes] = await Promise.all([
        fetch('/api/dashboard', { cache: 'no-store' }),
        fetch('/api/system/data-source', { cache: 'no-store' }),
      ]);
      const [dashboardJson, dataSourceJson] = await Promise.all([
        dashboardRes.json(),
        dataSourceRes.json(),
      ]);
      if (dashboardJson.success) setStats(dashboardJson.data);
      if (dataSourceJson.success) setDataSource(dataSourceJson);
    } catch (_) {
      setToast('Sebagian status admin belum bisa dimuat.');
      window.setTimeout(() => setToast(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center px-4 py-12">
        <div className="w-full rounded-3xl border border-amber-200/90 bg-amber-50/80 p-6 text-center shadow-lg backdrop-blur-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-lg font-black text-slate-950 tracking-tight">
            Akses Admin Terbatas
          </h1>
          <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
            Halaman pengaturan ini khusus untuk Administrator DISKOMINFOTIKSAN Kota Lubuklinggau.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 py-3 text-xs font-black text-white shadow-md hover:bg-slate-900 transition"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/70 pb-28">
      {toast && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-2xl border border-emerald-200 bg-white/95 px-5 py-2.5 text-xs font-black text-emerald-800 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Header & Sub-Navigation */}
      <section className="border-b border-slate-200/80 bg-white/95 backdrop-blur-xl sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-950 to-slate-800 text-sm font-black text-white shadow-md border border-slate-700/40">
              GIS
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base sm:text-lg font-black tracking-tight text-slate-950">
                  Panel Pengaturan GIS
                </h1>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-black uppercase text-blue-700">
                  Admin
                </span>
              </div>
              <p className="truncate text-xs font-medium text-slate-500">
                Pusat kontrol operasional &amp; master data infrastruktur
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchAdminData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-2xs transition hover:bg-slate-50 active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`}
              />
              <span>Refresh</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-900 transition active:scale-95"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Web Klien</span>
            </Link>
          </div>
        </div>

        {/* Clean 2-Tab Segmented Switcher */}
        <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 pb-3">
          <div className="flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-black transition-all ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Ringkasan Operasional</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('management')}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-black transition-all ${
                activeTab === 'management'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Kelola &amp; Sistem</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-5xl px-4 py-5 space-y-5">
        {/* TAB 1: RINGKASAN OPERASIONAL */}
        {activeTab === 'overview' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Dark Slate Hero Banner */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 -mt-6 -mr-6 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-400/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Sistem Spasial Aktif</span>
                  </div>
                  <h2 className="mt-2.5 text-xl sm:text-2xl font-black tracking-tight">
                    Monitoring Infrastruktur Kota
                  </h2>
                  <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-xl">
                    Rekapitulasi inventaris tiang utilitas, kondisi fisik lapangan, dan sebaran
                    jaringan kabel di 8 kecamatan Kota Lubuklinggau.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <Link
                    href="/map"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition active:scale-95"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>Buka Peta GIS</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* 4 Primary KPI Cards */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Tiang"
                value={String(stats?.totalPoles ?? 0)}
                caption={`${stats?.todayCount ?? 0} disurvei hari ini`}
                icon={MapPin}
                accent="text-blue-700"
                iconBg="bg-blue-50 text-blue-600"
              />
              <StatCard
                label="Kondisi Baik"
                value={String(stats?.goodCount ?? 0)}
                caption="Fisik layak & aman"
                icon={CheckCircle2}
                accent="text-emerald-700"
                iconBg="bg-emerald-50 text-emerald-600"
              />
              <StatCard
                label="Perlu Perhatian"
                value={String((stats?.needsRepairCount ?? 0) + (stats?.damagedCount ?? 0))}
                caption="Butuh audit penataan"
                icon={AlertTriangle}
                accent="text-amber-700"
                iconBg="bg-amber-50 text-amber-600"
              />
              <StatCard
                label="Bentangan Kabel"
                value={String(stats?.totalSegments ?? 0)}
                caption={formatDistance(stats?.totalEstimatedNetworkDistance)}
                icon={Layers}
                accent="text-indigo-700"
                iconBg="bg-indigo-50 text-indigo-600"
              />
            </div>

            {/* Sebaran Kecamatan */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Sebaran Tiang per Kecamatan</h3>
                  <p className="text-xs font-medium text-slate-500">
                    Distribusi aset infrastruktur di seluruh wilayah Lubuklinggau
                  </p>
                </div>
                <Link
                  href="/districts"
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <span>Detail</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {(stats?.polesByKecamatan || []).length > 0 ? (
                  (stats?.polesByKecamatan || []).map((item) => {
                    const total = Math.max(stats?.totalPoles || 1, 1);
                    const width = Math.min(100, Math.round((item.count / total) * 100));
                    return (
                      <div key={item.kecamatan} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="truncate">{item.kecamatan}</span>
                          <span className="font-mono text-slate-900 ml-2">
                            {item.count} tiang ({width}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="py-4 text-center text-xs font-medium text-slate-400">
                    Memuat rincian sebaran wilayah...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: KELOLA & SISTEM */}
        {activeTab === 'management' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Section 1: Menu Pengelolaan Utama */}
            <div className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
                Aksi Pengelolaan Admin
              </h2>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* 1. Kelola Provider */}
                <Link
                  href="/providers"
                  className="group rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md hover:border-blue-300 flex items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-pink-600 border border-pink-100 group-hover:scale-105 transition">
                      <Radio className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <h3 className="text-xs sm:text-sm font-black text-slate-950 truncate">
                          Kelola Provider
                        </h3>
                        <span className="rounded-md bg-pink-50 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-pink-700 shrink-0">
                          {dataSource?.counts?.providers ?? 20} Master
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 leading-relaxed truncate">
                        Katalog marka, warna tiang, &amp; utilitas operator
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-hover:text-blue-600 transition shrink-0" />
                </Link>

                {/* 2. Wilayah Administrasi */}
                <Link
                  href="/districts"
                  className="group rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md hover:border-blue-300 flex items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-105 transition">
                      <Map className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <h3 className="text-xs sm:text-sm font-black text-slate-950 truncate">
                          Wilayah Administrasi
                        </h3>
                        <span className="rounded-md bg-blue-50 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-blue-700 shrink-0">
                          8 Kec • {totalKelurahan} Kel
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 leading-relaxed truncate">
                        Daftar kecamatan, kelurahan, &amp; batas wilayah
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-hover:text-blue-600 transition shrink-0" />
                </Link>

                {/* 3. Audit Penataan Kabel */}
                <Link
                  href="/segments"
                  className="group rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md hover:border-blue-300 flex items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:scale-105 transition">
                      <ShieldAlert className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <h3 className="text-xs sm:text-sm font-black text-slate-950 truncate">
                          Audit Penataan Kabel
                        </h3>
                        <span className="rounded-md bg-amber-50 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-amber-700 shrink-0">
                          {stats?.totalSegments ?? 0} Segmen
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 leading-relaxed truncate">
                        Monitoring kabel semrawut, udara, &amp; ducting
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-hover:text-blue-600 transition shrink-0" />
                </Link>

                {/* 4. Menu Khusus Admin */}
                <Link
                  href="/system_gateway"
                  className="group rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md hover:border-emerald-300 flex items-center justify-between gap-3 sm:gap-4"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-105 transition">
                      <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <h3 className="text-xs sm:text-sm font-black text-slate-950 truncate">
                          Menu Khusus Admin
                        </h3>
                        <span className="rounded-md bg-emerald-50 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-emerald-700 shrink-0">
                          Khusus Admin
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] sm:text-xs text-slate-500 leading-relaxed truncate">
                        Kelola akun pengguna &amp; konfigurasi sistem
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 group-hover:text-emerald-600 transition shrink-0" />
                </Link>
              </div>
            </div>

            {/* Section 2: Status Server & Database (Rapi & Bebas String Sambungan Mentah) */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-slate-950">
                      Status Infrastruktur Sistem
                    </h2>
                    <p className="text-xs text-slate-500">
                      Konfigurasi penyimpanan basis data aktif
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block">
                    Penyimpanan Utama
                  </span>
                  <span className="font-black text-slate-900 text-sm block">
                    {dataSource?.primary === 'POSTGRES_VPS'
                      ? 'Server PostgreSQL (VPS Kota)'
                      : 'Database Cloud Terintegrasi'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Menyimpan data tiang, segmen kabel, dan riwayat audit
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1">
                  <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block">
                    Keamanan Jaringan
                  </span>
                  <span className="font-black text-emerald-700 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Terisolasi &amp; Terproteksi</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Akses database internal aman tanpa port publik terbuka
                  </span>
                </div>
              </div>

              {/* Data Entity Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Provider
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900 font-mono">
                    {dataSource?.counts?.providers ?? 20}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">master data</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Pengguna
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900 font-mono">
                    {dataSource?.counts?.users ?? 6}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">akun aktif</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Kecamatan
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900 font-mono">
                    {KECAMATAN_LUBUKLINGGAU.length}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">wilayah</p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Kelurahan
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900 font-mono">
                    {totalKelurahan}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">kelurahan</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
