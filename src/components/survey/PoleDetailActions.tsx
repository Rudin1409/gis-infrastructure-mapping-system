'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Map, AlertTriangle, Loader2 } from 'lucide-react';

interface PoleDetailActionsProps {
  poleId: string;
  poleCode?: string;
}

export default function PoleDetailActions({ poleId, poleCode }: PoleDetailActionsProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/poles/${poleId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/poles');
        router.refresh();
      } else {
        alert('Gagal menghapus data tiang');
        setIsDeleting(false);
      }
    } catch (_) {
      alert('Terjadi kesalahan saat menghapus data tiang');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Link
          href={`/poles/${poleId}/edit`}
          className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-2xs transition-all active:scale-95"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Edit</span>
        </Link>

        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-2xs transition-all active:scale-95"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Hapus</span>
        </button>

        <Link
          href={`/map?search=${poleId}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-white py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-2xs transition-all active:scale-95"
        >
          <Map className="w-3.5 h-3.5" />
          <span>Peta</span>
        </Link>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Konfirmasi Hapus Tiang</h3>
              <p className="text-xs text-slate-500">
                Apakah Anda yakin ingin menghapus tiang <strong className="font-mono text-slate-800">{poleCode || poleId}</strong>? Data yang dihapus dari Supabase tidak dapat dikembalikan.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md shadow-rose-500/25 flex items-center justify-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
