'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Pole } from '@/types/pole';
import { DistrictGroup, Subdistrict } from '@/types/district';
import {
  MapPin,
  Map,
  Layers,
  ChevronRight,
  Database,
  Navigation,
  Edit2,
  Plus,
  Trash2,
  Settings2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Check,
  RefreshCw,
} from 'lucide-react';

interface DistrictsManagerClientProps {
  initialDistricts: DistrictGroup[];
  allPoles: Pole[];
}

export default function DistrictsManagerClient({
  initialDistricts,
  allPoles,
}: DistrictsManagerClientProps) {
  const [districts, setDistricts] = useState<DistrictGroup[]>(initialDistricts);
  const [isManageMode, setIsManageMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Toast / notification state
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [editingSubdistrict, setEditingSubdistrict] = useState<{
    subdistrict: Subdistrict;
    currentKecamatan: string;
  } | null>(null);

  const [addingToKecamatan, setAddingToKecamatan] = useState<string | null>(null);
  const [deletingSubdistrict, setDeletingSubdistrict] = useState<Subdistrict | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  // Form states for Edit Modal
  const [editName, setEditName] = useState<string>('');
  const [editKecamatan, setEditKecamatan] = useState<string>('');
  const [editCode, setEditCode] = useState<string>('');
  const [cascadeUpdatePoles, setCascadeUpdatePoles] = useState<boolean>(true);

  // Form states for Add Modal
  const [addName, setAddName] = useState<string>('');
  const [addKecamatan, setAddKecamatan] = useState<string>('');
  const [addCode, setAddCode] = useState<string>('');

  // Compute pole counts per kecamatan & kelurahan
  const { polesPerKecamatan, polesPerKelurahan } = useMemo(() => {
    const kecCounts: Record<string, number> = {};
    const kelCounts: Record<string, number> = {};

    allPoles.forEach((p) => {
      if (p.kecamatan) {
        kecCounts[p.kecamatan] = (kecCounts[p.kecamatan] || 0) + 1;
      }
      if (p.kelurahan) {
        const key = `${p.kecamatan || ''}_${p.kelurahan}`.toLowerCase();
        kelCounts[key] = (kelCounts[key] || 0) + 1;
      }
    });

    return { polesPerKecamatan: kecCounts, polesPerKelurahan: kelCounts };
  }, [allPoles]);

  const totalKelurahan = useMemo(() => {
    return districts.reduce((sum, k) => sum + k.kelurahan.length, 0);
  }, [districts]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Helper to refresh data from server
  const fetchDistricts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/districts', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setDistricts(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch districts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (sub: Subdistrict, kecName: string) => {
    setEditingSubdistrict({ subdistrict: sub, currentKecamatan: kecName });
    setEditName(sub.name);
    setEditKecamatan(kecName);
    setEditCode(sub.code || '');
    setCascadeUpdatePoles(true);
  };

  // Submit Edit
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubdistrict || !editName.trim()) return;

    try {
      setIsLoading(true);
      const res = await fetch('/api/districts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSubdistrict.subdistrict.id,
          name: editName.trim(),
          kecamatan: editKecamatan,
          code: editCode.trim().toUpperCase() || undefined,
          oldName: editingSubdistrict.subdistrict.name,
          cascadeUpdatePoles,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan perubahan');
      }

      showToast('success', json.message || 'Kelurahan berhasil diperbarui');
      setEditingSubdistrict(null);
      await fetchDistricts();
    } catch (err: any) {
      showToast('error', err.message || 'Terjadi kesalahan saat mengupdate kelurahan');
    } finally {
      setIsLoading(false);
    }
  };

  // Open Add Modal
  const handleOpenAdd = (kecName?: string) => {
    const targetKec = kecName || districts[0]?.name || 'Lubuklinggau Timur I';
    setAddingToKecamatan(targetKec);
    setAddKecamatan(targetKec);
    setAddName('');
    setAddCode('');
  };

  // Submit Add
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addKecamatan) return;

    try {
      setIsLoading(true);
      const res = await fetch('/api/districts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName.trim(),
          kecamatan: addKecamatan,
          code: addCode.trim().toUpperCase() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menambahkan kelurahan');
      }

      showToast('success', json.message || 'Kelurahan baru berhasil ditambahkan');
      setAddingToKecamatan(null);
      await fetchDistricts();
    } catch (err: any) {
      showToast('error', err.message || 'Terjadi kesalahan saat menambahkan kelurahan');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Delete
  const handleSubmitDelete = async () => {
    if (!deletingSubdistrict) return;

    try {
      setIsLoading(true);
      const res = await fetch(`/api/districts?id=${encodeURIComponent(deletingSubdistrict.id)}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menghapus kelurahan');
      }

      showToast('success', `Kelurahan "${deletingSubdistrict.name}" berhasil dihapus`);
      setDeletingSubdistrict(null);
      await fetchDistricts();
    } catch (err: any) {
      showToast('error', err.message || 'Terjadi kesalahan saat menghapus kelurahan');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Reset to Defaults
  const handleSubmitReset = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/districts/reset', {
        method: 'POST',
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal mereset data kelurahan');
      }

      showToast('success', 'Data berhasil dikembalikan ke standar 72 kelurahan resmi');
      setIsResetConfirmOpen(false);
      await fetchDistricts();
    } catch (err: any) {
      showToast('error', err.message || 'Terjadi kesalahan saat mereset kelurahan');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered districts according to search query
  const filteredDistricts = useMemo(() => {
    if (!searchQuery.trim()) return districts;

    const q = searchQuery.toLowerCase().trim();
    return districts
      .map((group) => {
        const matchesKec = group.name.toLowerCase().includes(q);
        const matchedKel = group.kelurahan.filter(
          (k) => k.name.toLowerCase().includes(q) || (k.code && k.code.toLowerCase().includes(q))
        );

        if (matchesKec) {
          return group;
        }
        if (matchedKel.length > 0) {
          return {
            ...group,
            kelurahan: matchedKel,
          };
        }
        return null;
      })
      .filter((g): g is DistrictGroup => g !== null);
  }, [districts, searchQuery]);

  return (
    <div className="p-4 space-y-4 text-slate-800 font-sans pb-20 animate-in fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in slide-in-from-bottom-5">
          <div
            className={`p-3.5 rounded-2xl shadow-xl border flex items-center gap-3 ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-white border-slate-700 shadow-slate-900/30'
                : 'bg-rose-950 text-white border-rose-800 shadow-rose-900/30'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <p className="text-xs font-bold flex-1">{toastMessage.text}</p>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <MapPin className="w-5 h-5 text-purple-600" />
            <span>8 Kecamatan Kota Lubuklinggau</span>
          </h1>
          <p className="text-xs text-slate-500">
            Cakupan administrasi wilayah inventarisasi GIS DISKOMINFOTIKSAN
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Mode Kelola */}
          <button
            type="button"
            onClick={() => setIsManageMode(!isManageMode)}
            className={`py-2 px-3 text-xs font-bold rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer ${
              isManageMode
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 shadow-xs'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>{isManageMode ? 'Selesai Kelola' : 'Kelola / Edit'}</span>
          </button>

          <Link
            href="/map"
            className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 flex items-center gap-1 transition-all"
          >
            <Map className="w-4 h-4" />
            <span>Peta GIS</span>
          </Link>
        </div>
      </div>

      {/* Manage Mode Warning & Quick Action Bar */}
      {isManageMode && (
        <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0">
              <Edit2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-black text-purple-950 block leading-tight">
                Mode Edit Wilayah Aktif
              </span>
              <span className="text-[10px] text-purple-800 leading-tight block">
                Ketuk tombol pensil di kelurahan untuk mengubah nama atau tombol + untuk menambah baru.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => handleOpenAdd()}
              className="py-1.5 px-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Kelurahan</span>
            </button>

            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="py-1.5 px-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-bold text-[11px] rounded-xl flex items-center gap-1 transition-all cursor-pointer"
              title="Reset ke 72 Kelurahan Resmi"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Standar</span>
            </button>
          </div>
        </div>
      )}

      {/* Summary Stat Banner */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_10px_rgba(15,23,42,0.04)] text-center">
          <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wider block">
            KECAMATAN
          </span>
          <span className="text-xl font-black text-slate-900 font-mono block mt-0.5">
            {districts.length}
          </span>
          <span className="text-[9px] text-slate-400">Wilayah Induk</span>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_10px_rgba(15,23,42,0.04)] text-center">
          <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider block">
            KELURAHAN
          </span>
          <span className="text-xl font-black text-blue-600 font-mono block mt-0.5">
            {totalKelurahan}
          </span>
          <span className="text-[9px] text-slate-400">Total Kel/Desa</span>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-[0_2px_10px_rgba(15,23,42,0.04)] text-center">
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block">
            TIANG GIS
          </span>
          <span className="text-xl font-black text-emerald-600 font-mono block mt-0.5">
            {allPoles.length}
          </span>
          <span className="text-[9px] text-slate-400">Titik Terpetakan</span>
        </div>
      </div>

      {/* Search Filter Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari kecamatan, nama kelurahan, atau kode akronim..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 shadow-xs outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Districts List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Daftar Kecamatan &amp; Kelurahan Master</span>
          </h2>
          {isLoading && (
            <span className="text-[10px] text-purple-600 flex items-center gap-1 font-bold animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Menyinkronkan...</span>
            </span>
          )}
        </div>

        {filteredDistricts.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-2">
            <span className="text-3xl block">🔍</span>
            <h3 className="text-sm font-black text-slate-800">
              Tidak Ada Wilayah yang Sesuai
            </h3>
            <p className="text-xs text-slate-500">
              Coba gunakan kata kunci pencarian kelurahan atau kecamatan yang lain.
            </p>
          </div>
        ) : (
          filteredDistricts.map((kec, index) => {
            const count = polesPerKecamatan[kec.name] || 0;

            return (
              <div
                key={kec.name}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-[0_2px_12px_rgba(15,23,42,0.04)] space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-mono font-black text-xs border border-purple-100 shadow-2xs">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 leading-tight">
                        {kec.name}
                      </h3>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {kec.kelurahan.length} Kelurahan
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isManageMode && (
                      <button
                        type="button"
                        onClick={() => handleOpenAdd(kec.name)}
                        className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-[10px] font-bold flex items-center gap-0.5 transition-all cursor-pointer"
                        title={`Tambah Kelurahan ke ${kec.name}`}
                      >
                        <Plus className="w-3 h-3" />
                        <span className="hidden sm:inline">Tambah</span>
                      </button>
                    )}

                    <Link
                      href={`/poles?kecamatan=${encodeURIComponent(kec.name)}`}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all ${
                        count > 0
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 shadow-2xs'
                          : 'bg-slate-50 text-slate-400 border border-slate-100'
                      }`}
                    >
                      <Database className="w-3 h-3" />
                      <span>{count} Tiang</span>
                    </Link>
                  </div>
                </div>

                {/* Kelurahan Chips */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                      Kelurahan / Desa {isManageMode ? '(Ketuk pensil untuk edit):' : '(Ketuk untuk filter):'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {kec.kelurahan.map((kel) => {
                      const poleKey = `${kec.name}_${kel.name}`.toLowerCase();
                      const kelPoleCount = polesPerKelurahan[poleKey] || 0;

                      if (isManageMode) {
                        return (
                          <div
                            key={kel.id}
                            className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 bg-purple-50/70 border border-purple-200/90 rounded-xl text-[10px] font-bold text-purple-950 shadow-2xs group"
                          >
                            <span>{kel.name}</span>
                            {kelPoleCount > 0 && (
                              <span className="px-1.5 py-0.2 bg-purple-200/80 text-purple-900 rounded text-[8px] font-mono">
                                {kelPoleCount}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(kel, kec.name)}
                              className="p-1 hover:bg-purple-200 text-purple-700 rounded-md transition-colors cursor-pointer"
                              title="Edit Kelurahan"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingSubdistrict(kel)}
                              className="p-1 hover:bg-rose-100 text-rose-600 rounded-md transition-colors cursor-pointer"
                              title="Hapus Kelurahan"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={kel.id}
                          href={`/poles?kecamatan=${encodeURIComponent(kec.name)}&kelurahan=${encodeURIComponent(kel.name)}`}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-purple-50 hover:text-purple-700 border border-slate-200/80 hover:border-purple-300 rounded-xl text-[10px] font-bold text-slate-700 transition-colors flex items-center gap-1"
                        >
                          <span>{kel.name}</span>
                          {kelPoleCount > 0 && (
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded text-[8px] font-mono">
                              {kelPoleCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/map`}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Lihat di Peta Wilayah</span>
                  </Link>

                  <Link
                    href={`/poles?kecamatan=${encodeURIComponent(kec.name)}`}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                  >
                    <span>Daftar Tiang</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: EDIT KELURAHAN                                      */}
      {/* ============================================================ */}
      {editingSubdistrict && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  Edit Data Kelurahan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSubdistrict(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Kelurahan / Desa
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Jawa Kanan SS"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Wilayah Kecamatan
                </label>
                <select
                  value={editKecamatan}
                  onChange={(e) => setEditKecamatan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
                >
                  {districts.map((k) => (
                    <option key={k.name} value={k.name}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kode Akronim (Opsional)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  placeholder="e.g. JK"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-mono font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none uppercase"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Digunakan untuk format penomoran aset tiang (e.g. LLG-T2-JK-001)
                </span>
              </div>

              {/* Cascade update option */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cascadeUpdatePoles}
                    onChange={(e) => setCascadeUpdatePoles(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <div className="text-[11px] text-slate-700">
                    <span className="font-bold block">Perbarui Otomatis Data Tiang Terdaftar</span>
                    <span className="text-[10px] text-slate-500">
                      Jika nama diubah dari &quot;{editingSubdistrict.subdistrict.name}&quot; ke &quot;{editName}&quot;, semua tiang lama otomatis diganti namanya agar tidak hilang dari filter.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSubdistrict(null)}
                  disabled={isLoading}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: TAMBAH KELURAHAN                                    */}
      {/* ============================================================ */}
      {addingToKecamatan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  Tambah Kelurahan / Desa Baru
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddingToKecamatan(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Kelurahan / Desa Baru
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Margorejo / Kelurahan Baru"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kecamatan Tujuan
                </label>
                <select
                  value={addKecamatan}
                  onChange={(e) => setAddKecamatan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-semibold bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none"
                >
                  {districts.map((k) => (
                    <option key={k.name} value={k.name}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kode Akronim (Opsional)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MR"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-slate-900 font-mono font-semibold focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none uppercase"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingToKecamatan(null)}
                  disabled={isLoading}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>+ Tambahkan Kelurahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: KONFIRMASI HAPUS                                    */}
      {/* ============================================================ */}
      {deletingSubdistrict && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 space-y-3 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-black text-slate-900">
                Hapus Kelurahan {deletingSubdistrict.name}?
              </h3>
              <p className="text-xs text-slate-500">
                Kelurahan ini akan dihapus dari daftar pilihan wilayah.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingSubdistrict(null)}
                disabled={isLoading}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitDelete}
                disabled={isLoading}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: KONFIRMASI RESET STANDAR                            */}
      {/* ============================================================ */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 space-y-3 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <RotateCcw className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-sm font-black text-slate-900">
                Reset ke 72 Kelurahan Resmi?
              </h3>
              <p className="text-xs text-slate-500">
                Data kelurahan akan dikembalikan sesuai standar default 8 Kecamatan dan 72 Kelurahan resmi Kota Lubuklinggau.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                disabled={isLoading}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitReset}
                disabled={isLoading}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>Reset Standar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
