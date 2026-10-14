'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ArrowLeft,
  Users,
  UserPlus,
  Search,
  Edit3,
  Trash2,
  Key,
  Phone,
  Mail,
  Building,
  ShieldCheck,
  X,
  RefreshCw,
  UserCheck,
  UserX,
} from 'lucide-react';
import GISApiQuotaExceededLock from '@/components/common/GISApiQuotaExceededLock';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  agency?: string;
  phone?: string;
  status: string;
  team?: string;
  role_label?: string;
  created_at?: string;
  updated_at?: string;
}

export default function SystemGatewayPage() {
  const [pin, setPin] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Active Tab: 'quota' or 'users'
  const [activeTab, setActiveTab] = useState<'quota' | 'users'>('quota');

  // Quota states
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [reason, setReason] = useState<string>(
    'Akses modul pemetaan spasial dan visualisasi layer peta ditangguhkan otomatis oleh API Gateway karena volume data dan pemanggilan layer telah melampaui batas alokasi kuota paket yang tersedia.'
  );
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Users CRUD states
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [teamFilter, setTeamFilter] = useState('ALL');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'SURVEYOR',
    team: 'KOMINFO',
    agency: 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
    status: 'AKTIF',
    role_label: 'Petugas Survei Spasial & Pemetaan',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch current quota status on mount
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

  // Fetch users list
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar pengguna:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchCurrentStatus();
  }, []);

  useEffect(() => {
    if (isAuthorized && activeTab === 'users') {
      fetchUsers();
    }
  }, [isAuthorized, activeTab]);

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
        fetchUsers();
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
        showToast(data.message);
      } else {
        alert(data.error || 'Gagal mengubah status lisensi peta.');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan koneksi server.');
    } finally {
      setIsSaving(false);
    }
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'SURVEYOR',
      team: 'KOMINFO',
      agency: 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
      status: 'AKTIF',
      role_label: 'Petugas Survei Spasial & Pemetaan',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  // Open Edit Modal
  const openEditModal = (user: UserItem) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      role: user.role || 'SURVEYOR',
      team: user.team || 'KOMINFO',
      agency:
        user.agency || 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
      status: user.status || 'AKTIF',
      role_label: user.role_label || 'Petugas Survei Spasial & Pemetaan',
    });
    setFormError(null);
    setShowEditModal(true);
  };

  // Open Delete Modal
  const openDeleteModal = (user: UserItem) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // Submit Add User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name || !formData.email || !formData.password) {
      setFormError('Nama, Email, dan Password wajib diisi.');
      return;
    }

    try {
      setIsSubmittingUser(true);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(`Pengguna "${formData.name}" berhasil ditambahkan.`);
        setShowAddModal(false);
        fetchUsers();
      } else {
        setFormError(data.error || 'Gagal menambahkan pengguna.');
      }
    } catch (err: any) {
      setFormError('Terjadi kesalahan saat menyimpan data pengguna.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Submit Edit User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);

    try {
      setIsSubmittingUser(true);
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          ...formData,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(`Data "${formData.name}" berhasil diperbarui.`);
        setShowEditModal(false);
        fetchUsers();
      } else {
        setFormError(data.error || 'Gagal memperbarui pengguna.');
      }
    } catch (err: any) {
      setFormError('Terjadi kesalahan saat memperbarui pengguna.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Submit Delete User
  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmittingUser(true);
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(selectedUser.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(`Pengguna "${selectedUser.name}" berhasil dihapus.`);
        setShowDeleteModal(false);
        fetchUsers();
      } else {
        alert(data.error || 'Gagal menghapus pengguna.');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan saat menghapus pengguna.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery)) ||
      (u.id && u.id.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'ADMIN' && (u.role === 'ADMIN_KOMINFO' || u.role === 'SUPER_ADMIN')) ||
      (roleFilter === 'SURVEYOR' && u.role === 'SURVEYOR');

    const matchTeam =
      teamFilter === 'ALL' || (u.team && u.team.toUpperCase() === teamFilter.toUpperCase());

    return matchSearch && matchRole && matchTeam;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 font-sans selection:bg-emerald-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-950 border border-emerald-500/80 text-emerald-200 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen 1: Admin Authorization */}
      {!isAuthorized ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-emerald-950/70 text-emerald-400 border border-emerald-700/50 flex items-center justify-center mx-auto shadow-xl">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-wider uppercase text-white font-mono">
                  Akses Khusus Admin
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Kontrol Kuota GIS &amp; Manajemen Pengguna Sistem
                </p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  PIN Otorisasi Master:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={15}
                    placeholder="••••••"
                    autoFocus
                    className="w-full px-4 py-3.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-center text-xl font-mono tracking-widest text-white placeholder-slate-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 cursor-pointer transition-all disabled:opacity-50"
              >
                {isLoading ? 'Memverifikasi...' : 'Buka Akses Khusus Admin'}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <Link
                href="/admin"
                className="text-slate-400 hover:text-white flex items-center gap-1 font-medium transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard Admin</span>
              </Link>
              <span className="font-mono text-slate-500 text-[10px] uppercase">
                Khusus Administrator
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Screen 2: Admin Authorized Control Center */
        <div className="w-full max-w-5xl mx-auto space-y-6">
          {/* Top Bar Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-3.5">
              <Link
                href="/admin"
                className="w-10 h-10 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition shrink-0"
                title="Kembali ke Dashboard Admin"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-white uppercase tracking-wider font-mono">
                    Akses Khusus Admin
                  </h1>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    Terverifikasi
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pengaturan Alokasi Kuota GIS &amp; Pengelolaan Akun Pengguna (CRUD)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setIsAuthorized(false);
                  setPin('');
                }}
                className="py-2 px-4 bg-slate-800 hover:bg-red-950/80 hover:text-red-300 hover:border-red-800/80 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Kunci &amp; Keluar
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('quota')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'quota'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Pengaturan Kuota GIS</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Manajemen Pengguna ({users.length})</span>
            </button>
          </div>

          {/* TAB 1: PENGATURAN KUOTA GIS */}
          {activeTab === 'quota' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Big Master Toggle Hero Card */}
              <div
                className={`p-6 sm:p-8 rounded-3xl border transition-all ${
                  isLocked
                    ? 'bg-red-950/40 border-red-500/60 shadow-xl shadow-red-950/50'
                    : 'bg-emerald-950/40 border-emerald-500/60 shadow-xl shadow-emerald-950/50'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
                  <div className="space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-black/40 border border-white/10">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isLocked ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-pulse'
                        }`}
                      />
                      <span>
                        {isLocked
                          ? 'Status Kuota: DITANGGUHKAN / TERKUNCI'
                          : 'Status Kuota: NORMAL (AKTIF)'}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                      {isLocked
                        ? 'Peta GIS sedang TERKUNCI untuk seluruh pengguna umum.'
                        : 'Peta GIS sedang DIBUKA dan dapat diakses normal.'}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isLocked
                        ? 'Pengguna yang membuka peta GIS maupun survei tiang baru akan melihat respon API Gateway 429 Quota Exceeded (Layar Peringatan Kuota Terlampaui).'
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
              <div className="bg-slate-900/90 p-6 rounded-3xl border border-slate-800 space-y-3 shadow-lg">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Pesan / Alasan Penangguhan Kuota API Gateway:
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tuliskan pesan alasan penangguhan kuota..."
                  className="w-full p-4 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs text-slate-200 outline-none focus:border-emerald-500 font-sans leading-relaxed"
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-400">
                  <span>
                    * Pesan resmi API Gateway ini otomatis tampil di seluruh halaman peta saat kuota
                    dikunci.
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleLock(isLocked)}
                    disabled={isSaving}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 self-end sm:self-auto"
                  >
                    Simpan Perubahan Teks
                  </button>
                </div>
              </div>

              {/* Live Preview of What Users See */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>Pratinjau Layar Kunci Pengguna:</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Terakhir diubah: {updatedAt ? new Date(updatedAt).toLocaleString('id-ID') : '-'}
                  </span>
                </div>

                <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
                  <GISApiQuotaExceededLock customMessage={reason} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANAJEMEN PENGGUNA (CRUD USER) */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Actions & Stats */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-black text-white uppercase tracking-wider font-mono">
                      Daftar Pengguna Sistem
                    </h2>
                    <p className="text-xs text-slate-400">
                      Kelola hak akses administrator dan surveyor lapangan
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchUsers}
                      disabled={isLoadingUsers}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl transition cursor-pointer"
                      title="Refresh Data"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={openAddModal}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-lg shadow-blue-600/30 transition cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Tambah Pengguna Baru</span>
                    </button>
                  </div>
                </div>

                {/* Search & Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama, email, nomor HP..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="ALL">Semua Peran (Role)</option>
                      <option value="ADMIN">Administrator (KOMINFO)</option>
                      <option value="SURVEYOR">Surveyor Lapangan</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={teamFilter}
                      onChange={(e) => setTeamFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="ALL">Semua Instansi / Tim</option>
                      <option value="KOMINFO">DISKOMINFOTIKSAN</option>
                      <option value="BAPENDA">BAPENDA</option>
                      <option value="DISHUB">DISHUB</option>
                      <option value="LAINNYA">Lainnya</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* User Cards / Table */}
              <div className="space-y-3">
                {isLoadingUsers ? (
                  <div className="p-12 text-center text-slate-500 bg-slate-900/50 rounded-3xl border border-slate-800">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-xs">Memuat data pengguna...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 bg-slate-900/50 rounded-3xl border border-slate-800">
                    <p className="text-xs font-bold">
                      Tidak ada pengguna yang cocok dengan pencarian.
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isAdmin = user.role === 'ADMIN_KOMINFO' || user.role === 'SUPER_ADMIN';
                    const isProtected = user.id === 'USR-KOMINFO-ADMIN';
                    const isActive = user.status === 'AKTIF';

                    return (
                      <div
                        key={user.id}
                        className="bg-slate-900/80 border border-slate-800/90 hover:border-slate-700/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow-md"
                      >
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shrink-0 ${
                              isAdmin
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-700/50'
                                : 'bg-blue-950/60 text-blue-400 border border-blue-700/50'
                            }`}
                          >
                            {isAdmin ? '🏢' : '👷‍♂️'}
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-black text-white truncate">
                                {user.name}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  isAdmin
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                }`}
                              >
                                {user.role}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                  isActive
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}
                              >
                                {isActive ? 'AKTIF' : 'NONAKTIF'}
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                              <span className="flex items-center gap-1.5 truncate">
                                <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                {user.email}
                              </span>
                              {user.phone && (
                                <span className="flex items-center gap-1.5 shrink-0">
                                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  {user.phone}
                                </span>
                              )}
                              <span className="flex items-center gap-1.5 text-slate-500 shrink-0">
                                <Building className="w-3.5 h-3.5 shrink-0" />
                                {user.team || 'KOMINFO'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                            <span>Edit</span>
                          </button>

                          {!isProtected && (
                            <button
                              type="button"
                              onClick={() => openDeleteModal(user)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 rounded-xl text-xs font-bold transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* MODAL: TAMBAH USER */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/50 flex items-center justify-center font-bold">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                        Tambah Pengguna Baru
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Buat akun login untuk surveyor atau admin
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  {formError && (
                    <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs font-bold text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Nama Lengkap *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Email Dinas / Login *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="nama@lubuklinggaukota.go.id"
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Nomor HP / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="0812xxxxxxxx"
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Kata Sandi *
                      </label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Peran (Role)
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      >
                        <option value="SURVEYOR">SURVEYOR</option>
                        <option value="ADMIN_KOMINFO">ADMIN_KOMINFO</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Instansi / Tim
                      </label>
                      <select
                        value={formData.team}
                        onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      >
                        <option value="KOMINFO">KOMINFO</option>
                        <option value="BAPENDA">BAPENDA</option>
                        <option value="DISHUB">DISHUB</option>
                        <option value="LAINNYA">LAINNYA</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Status Akun
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      >
                        <option value="AKTIF">AKTIF</option>
                        <option value="NONAKTIF">NONAKTIF</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Nama Instansi Lengkap
                    </label>
                    <input
                      type="text"
                      value={formData.agency}
                      onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingUser}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingUser ? 'Menyimpan...' : 'Simpan Pengguna'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: EDIT USER */}
          {showEditModal && selectedUser && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-950 text-blue-400 border border-blue-800/50 flex items-center justify-center font-bold">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                        Edit Data Pengguna
                      </h3>
                      <p className="text-[11px] text-slate-400">ID: {selectedUser.id}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateUser} className="space-y-4">
                  {formError && (
                    <div className="p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-xs font-bold text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Nama Lengkap *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Email Dinas / Login *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Nomor HP / WhatsApp
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Ganti Kata Sandi (Opsional)
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Kosongkan jika tidak diubah"
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Peran (Role)
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      >
                        <option value="SURVEYOR">SURVEYOR</option>
                        <option value="ADMIN_KOMINFO">ADMIN_KOMINFO</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Instansi / Tim
                      </label>
                      <select
                        value={formData.team}
                        onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      >
                        <option value="KOMINFO">KOMINFO</option>
                        <option value="BAPENDA">BAPENDA</option>
                        <option value="DISHUB">DISHUB</option>
                        <option value="LAINNYA">LAINNYA</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Status Akun
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      >
                        <option value="AKTIF">AKTIF</option>
                        <option value="NONAKTIF">NONAKTIF</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Nama Instansi Lengkap
                    </label>
                    <input
                      type="text"
                      value={formData.agency}
                      onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingUser}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingUser ? 'Menyimpan...' : 'Perbarui Pengguna'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL: KONFIRMASI HAPUS */}
          {showDeleteModal && selectedUser && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-red-950/70 border border-red-700/60 text-red-400 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-black text-white font-mono">Hapus Pengguna?</h3>
                  <p className="text-xs text-slate-400">
                    Apakah Anda yakin ingin menghapus akun{' '}
                    <strong className="text-white font-bold">{selectedUser.name}</strong> (
                    {selectedUser.email})?
                  </p>
                  <p className="text-[11px] text-red-400 pt-1">
                    Tindakan ini permanen dan akan mencabut seluruh sesi login pengguna tersebut.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteUser}
                    disabled={isSubmittingUser}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-red-600/30 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingUser ? 'Menghapus...' : 'Ya, Hapus Pengguna'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
