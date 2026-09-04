'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getOfflineQueue,
  getOfflineQueueCount,
  removeOfflineQueueItem,
  syncOfflineQueue,
  OfflineQueueItem,
  SyncProgress,
} from '@/lib/offline/offlineQueue';
import {
  Wifi,
  WifiOff,
  CloudUpload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  X,
  MapPin,
  Clock,
  ChevronRight,
  Database,
} from 'lucide-react';

export default function OfflineQueueWidget() {
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastNotice, setLastNotice] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const items = await getOfflineQueue();
      setQueue(items);
    } catch (err) {
      console.warn('Failed to load offline queue:', err);
    }
  }, []);

  // Monitor network and queue changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setLastNotice('Koneksi internet terhubung kembali.');
      // Auto-trigger sync when coming back online
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastNotice('Sinyal terputus. Mode offline aktif (data aman di HP).');
    };

    const handleQueueChanged = () => {
      loadQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('inframap-offline-queue-changed', handleQueueChanged);

    loadQueue();

    // Periodic check every 30s for pending items when online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        getOfflineQueueCount().then((count) => {
          if (count > 0 && !isSyncing) {
            handleSync();
          }
        });
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('inframap-offline-queue-changed', handleQueueChanged);
      clearInterval(interval);
    };
  }, [loadQueue]);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setLastNotice(null);

    try {
      const result = await syncOfflineQueue((progress) => {
        setSyncProgress(progress);
      });

      await loadQueue();

      if (result.success && result.syncedCount > 0) {
        setLastNotice(`✅ Berhasil menyinkronkan ${result.syncedCount} tiang ke server!`);
      } else if (!result.success && result.error) {
        setLastNotice(`⚠️ ${result.error}`);
      }
    } catch (err: any) {
      setLastNotice(`Gagal sinkronisasi: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Apakah Anda yakin ingin menghapus antrean data tiang ini dari memori HP?')) {
      await removeOfflineQueueItem(id);
      await loadQueue();
    }
  };

  // If online and zero items in queue, keep unobtrusive (no annoying popup)
  const count = queue.length;
  const showBanner = !isOnline || count > 0;

  if (!showBanner) return null;

  return (
    <>
      {/* Floating Status Pill */}
      <div className="fixed bottom-20 right-4 z-40 max-w-xs animate-in slide-in-from-bottom-3 duration-300">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl shadow-xl border text-xs font-bold transition-all cursor-pointer select-none backdrop-blur-md ${
            !isOnline
              ? 'bg-amber-600/95 text-white border-amber-400/50 shadow-amber-900/30 ring-2 ring-amber-400/40'
              : count > 0
              ? 'bg-blue-600/95 text-white border-blue-400/50 shadow-blue-900/30 ring-2 ring-blue-400/40'
              : 'bg-slate-900/90 text-white border-slate-700/60'
          }`}
        >
          {!isOnline ? (
            <WifiOff className="w-4 h-4 text-amber-200 animate-pulse flex-shrink-0" />
          ) : isSyncing ? (
            <RefreshCw className="w-4 h-4 text-white animate-spin flex-shrink-0" />
          ) : (
            <Database className="w-4 h-4 text-blue-200 flex-shrink-0" />
          )}

          <div className="text-left leading-tight">
            {!isOnline ? (
              <div>
                <span className="block font-black text-[11px]">Mode Offline</span>
                <span className="block text-[10px] text-amber-100">
                  {count > 0 ? `${count} tiang aman di HP` : 'Siap rekam offline'}
                </span>
              </div>
            ) : count > 0 ? (
              <div>
                <span className="block font-black text-[11px]">
                  {isSyncing ? 'Menyinkronkan...' : `${count} Tiang Menunggu`}
                </span>
                <span className="block text-[10px] text-blue-100">
                  {isSyncing
                    ? `${syncProgress?.current || 1}/${syncProgress?.total || count}`
                    : 'Klik untuk kirim ke server'}
                </span>
              </div>
            ) : (
              <span className="text-[11px] font-bold">Online</span>
            )}
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-white/70 ml-1 flex-shrink-0" />
        </button>
      </div>

      {/* Detail Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    !isOnline ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
                  }`}
                >
                  {!isOnline ? <WifiOff className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-tight">
                    Brankas Antrean Offline
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Status Sinyal:{' '}
                    <span
                      className={`font-bold ${
                        isOnline ? 'text-emerald-300' : 'text-amber-300'
                      }`}
                    >
                      {isOnline ? 'Online (Terhubung)' : 'Offline (Tanpa Sinyal)'}
                    </span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notice / Progress bar */}
            {isSyncing && syncProgress && (
              <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    Mengunggah tiang ({syncProgress.current} dari {syncProgress.total})...
                  </span>
                  <span>{Math.round((syncProgress.current / syncProgress.total) * 100)}%</span>
                </div>
                <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{
                      width: `${(syncProgress.current / syncProgress.total) * 100}%`,
                    }}
                  />
                </div>
                {syncProgress.currentRoad && (
                  <span className="text-[10px] text-blue-700 mt-1 block truncate">
                    Lokasi: {syncProgress.currentRoad}
                  </span>
                )}
              </div>
            )}

            {lastNotice && (
              <div className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-800 border-b border-slate-200 flex items-center justify-between">
                <span>{lastNotice}</span>
                <button
                  type="button"
                  onClick={() => setLastNotice(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Content List */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200/70 text-[11px] text-blue-950 space-y-1">
                <div className="font-bold flex items-center gap-1 text-blue-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  Jaminan Keamanan Data di Daerah Lemah Sinyal:
                </div>
                <p className="text-slate-600 leading-relaxed text-[10.5px]">
                  Data tiang & foto yang Anda input saat sinyal putus tersimpan utuh di memori HP (IndexedDB). Data <strong>tidak akan pernah hilang</strong> dan tidak akan ganda saat dikirim ke server.
                </p>
              </div>

              {count === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-xs font-bold text-slate-700">Semua Data Sudah Terkirim</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tidak ada antrean tertunda di memori HP.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                    Daftar Tiang Dalam Antrean ({count})
                  </div>

                  {queue.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {item.photoDataUrl ? (
                          <img
                            src={item.photoDataUrl}
                            alt="Preview"
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-400 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {item.road || 'Tanpa Nama Jalan'}
                            </span>
                            {item.status === 'SYNCING' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                                Mengirim...
                              </span>
                            )}
                            {item.status === 'FAILED' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                                Gagal
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{item.kecamatan}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(item.createdAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {item.lastError && (
                            <span className="text-[10px] text-amber-700 block truncate mt-0.5">
                              {item.lastError}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        title="Hapus dari antrean"
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer"
              >
                Tutup
              </button>

              {count > 0 && (
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={isSyncing || !isOnline}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md ${
                    isSyncing || !isOnline
                      ? 'bg-slate-400 cursor-not-allowed opacity-75'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-98 shadow-blue-500/20'
                  }`}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-3.5 h-3.5" />
                      <span>Sinkronkan ({count})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
