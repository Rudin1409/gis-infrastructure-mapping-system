'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  Eye,
  Layers,
  Lock,
  Map,
  MapPin,
  Palette,
  RefreshCw,
  Save,
  Server,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';

type AdminTab = 'overview' | 'data' | 'geocode' | 'region' | 'display';

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

const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Ringkasan', icon: BarChart3 },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'geocode', label: 'Alamat', icon: MapPin },
  { id: 'region', label: 'Wilayah', icon: Map },
  { id: 'display', label: 'Tampilan', icon: Palette },
];

const settingGroups = [
  {
    title: 'Geocoding',
    desc: 'Nama jalan otomatis hanya dipakai saat confidence tinggi.',
    status: 'Aktif selektif',
    tone: 'emerald',
  },
  {
    title: 'Batas Wilayah',
    desc: 'Kecamatan memakai polygon lokal, kelurahan masih perlu upgrade polygon resmi.',
    status: 'Perlu data BIG',
    tone: 'amber',
  },
  {
    title: 'Offline Queue',
    desc: 'Data survei tetap tersimpan di perangkat saat koneksi putus.',
    status: 'Siaga',
    tone: 'blue',
  },
];

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
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
          <p className={`mt-1 text-xs font-bold ${accent}`}>{caption}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-950">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{desc}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
    </label>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dataSource, setDataSource] = useState<DataSourceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [autoHighConfidenceRoad, setAutoHighConfidenceRoad] = useState(true);
  const [hideUncertainRoad, setHideUncertainRoad] = useState(true);
  const [preferLocationIq, setPreferLocationIq] = useState(true);
  const [showDistrictLayer, setShowDistrictLayer] = useState(true);
  const [compactAdminMode, setCompactAdminMode] = useState(false);

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

  const saveSettings = () => {
    setIsSaving(true);
    window.setTimeout(() => {
      setIsSaving(false);
      setToast('Pengaturan tampilan admin tersimpan di sesi ini.');
      window.setTimeout(() => setToast(null), 3000);
    }, 650);
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center px-4 py-10">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-center shadow-sm">
          <Lock className="mx-auto h-8 w-8 text-amber-600" />
          <h1 className="mt-3 text-base font-black text-slate-950">Akses Admin Dibatasi</h1>
          <p className="mt-1 text-sm text-slate-600">
            Halaman ini hanya untuk administrator sistem GIS.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-xs font-black text-white"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-100 pb-28">
      {toast && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-xs font-black text-emerald-700 shadow-xl">
          {toast}
        </div>
      )}

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-black text-white">
              GIS
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-black tracking-tight text-slate-950">
                  Panel Admin GIS
                </h1>
                <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">
                  Admin
                </span>
              </div>
              <p className="truncate text-xs font-semibold text-slate-500">
                Pengaturan data, alamat, batas wilayah, dan tampilan operasional
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAdminData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              Refresh
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white shadow-sm"
            >
              <Eye className="h-4 w-4" />
              Web Klien
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl overflow-x-auto px-4 pb-3">
          <div className="flex w-max min-w-full items-center gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-black transition ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-4 py-5">
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="rounded-lg bg-slate-950 p-5 text-white shadow-xl">
              <p className="text-xs font-black uppercase tracking-wide text-blue-200">
                Dashboard Pengelola
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Ringkasan Operasional Infrastruktur GIS
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
                Pantau data tiang, segmen kabel, status sumber data, dan kesiapan layer wilayah
                dalam satu panel admin yang lebih ringkas.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total Tiang"
                value={String(stats?.totalPoles ?? 0)}
                caption={`${stats?.todayCount ?? 0} data hari ini`}
                icon={MapPin}
                accent="text-blue-700"
              />
              <StatCard
                label="Kondisi Baik"
                value={String(stats?.goodCount ?? 0)}
                caption="Siap dipertahankan"
                icon={CheckCircle2}
                accent="text-emerald-700"
              />
              <StatCard
                label="Perlu Perhatian"
                value={String((stats?.needsRepairCount ?? 0) + (stats?.damagedCount ?? 0))}
                caption="Butuh audit lapangan"
                icon={AlertTriangle}
                accent="text-amber-700"
              />
              <StatCard
                label="Segmen Kabel"
                value={String(stats?.totalSegments ?? 0)}
                caption={formatDistance(stats?.totalEstimatedNetworkDistance)}
                icon={Layers}
                accent="text-slate-700"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-950">Sebaran Kecamatan</h3>
                    <p className="text-xs font-semibold text-slate-500">
                      Urutan wilayah dengan data tiang terbanyak.
                    </p>
                  </div>
                  <Map className="h-5 w-5 text-blue-600" />
                </div>
                <div className="mt-4 space-y-2">
                  {(stats?.polesByKecamatan || []).map((item) => {
                    const total = Math.max(stats?.totalPoles || 1, 1);
                    const width = Math.min(100, Math.round((item.count / total) * 100));
                    return (
                      <div key={item.kecamatan}>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>{item.kecamatan}</span>
                          <span>{item.count}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {settingGroups.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-black text-slate-950">{item.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                      </div>
                      <span
                        className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${
                          item.tone === 'emerald'
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.tone === 'amber'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-600" />
                <h2 className="text-base font-black text-slate-950">Sumber Data Utama</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-500">Mode</span>
                  <span className="font-black text-slate-950">{dataSource?.primary || '-'}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-500">Database</span>
                  <span className="max-w-[220px] truncate text-right font-black text-slate-950">
                    {dataSource?.database ||
                      (dataSource?.postgresConfigured ? 'configured' : 'Supabase fallback')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <StatCard
                    label="Provider"
                    value={String(dataSource?.counts?.providers ?? 0)}
                    caption="master"
                    icon={Database}
                    accent="text-slate-700"
                  />
                  <StatCard
                    label="User"
                    value={String(dataSource?.counts?.users ?? 0)}
                    caption="akun"
                    icon={ShieldCheck}
                    accent="text-slate-700"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-blue-600" />
                <h2 className="text-base font-black text-slate-950">Aksi Cepat Admin</h2>
              </div>
              <div className="mt-4 grid gap-2">
                <Link
                  href="/providers"
                  className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
                >
                  Kelola Provider
                </Link>
                <Link
                  href="/districts"
                  className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
                >
                  Kelola Kecamatan & Kelurahan
                </Link>
                <Link
                  href="/system-gateway"
                  className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
                >
                  Gateway Kuota Peta
                </Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'geocode' && (
          <div className="space-y-3">
            <ToggleRow
              title="Nama jalan otomatis confidence tinggi"
              desc="Field jalan hanya muncul jika LocationIQ/OSM memberi field road yang jelas."
              checked={autoHighConfidenceRoad}
              onChange={setAutoHighConfidenceRoad}
            />
            <ToggleRow
              title="Sembunyikan jalan yang ragu"
              desc="Jika hasil hanya area, neighbourhood, atau koridor kasar, form jalan dikosongkan."
              checked={hideUncertainRoad}
              onChange={setHideUncertainRoad}
            />
            <ToggleRow
              title="Prioritaskan LocationIQ"
              desc="Reverse geocode memakai LocationIQ dulu, lalu OSM publik sebagai fallback."
              checked={preferLocationIq}
              onChange={setPreferLocationIq}
            />
            <button
              type="button"
              onClick={saveSettings}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-black text-white shadow-sm disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Menyimpan...' : 'Simpan Preferensi'}
            </button>
          </div>
        )}

        {activeTab === 'region' && (
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-black text-slate-950">Cakupan Administrasi</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <StatCard
                  label="Kecamatan"
                  value={String(KECAMATAN_LUBUKLINGGAU.length)}
                  caption="aktif"
                  icon={Map}
                  accent="text-blue-700"
                />
                <StatCard
                  label="Kelurahan"
                  value={String(totalKelurahan)}
                  caption="daftar lokal"
                  icon={MapPin}
                  accent="text-emerald-700"
                />
              </div>
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-relaxed text-amber-800">
                Polygon kelurahan resmi BIG/Pemda belum menjadi sumber utama. Admin tetap bisa
                mengelola daftar kelurahan, lalu upgrade polygon dilakukan saat dataset resmi siap.
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-black text-slate-950">Daftar Kecamatan</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {KECAMATAN_LUBUKLINGGAU.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <p className="text-sm font-black text-slate-950">{item.name}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {item.kelurahan.length} kelurahan
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'display' && (
          <div className="space-y-3">
            <ToggleRow
              title="Layer batas wilayah default aktif"
              desc="Peta survey dan overview menampilkan batas wilayah sejak pertama dibuka."
              checked={showDistrictLayer}
              onChange={setShowDistrictLayer}
            />
            <ToggleRow
              title="Mode admin ringkas"
              desc="Panel pengaturan tampil lebih padat untuk layar laptop kecil."
              checked={compactAdminMode}
              onChange={setCompactAdminMode}
            />
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <h2 className="text-base font-black text-slate-950">Kustomisasi Lanjutan</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Slot ini disiapkan untuk warna marker, urutan menu, mode peta bawaan, dan preferensi
                kerja admin berikutnya.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">
                  Marker Provider
                </span>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700">
                  Layer GIS
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
                  Menu Admin
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
