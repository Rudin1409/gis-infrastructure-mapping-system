/**
 * Helper deteksi lingkungan & isolasi data Vercel vs VPS.
 * 
 * - VERCEL (*.vercel.app):
 *   1. Data terkunci pada baseline snapshot (648 tiang terdata).
 *   2. Penambahan data baru & fitur AI dinonaktifkan.
 * 
 * - VPS PRODUKSI (https://inframap.my.id/) & LOCAL DEV:
 *   1. Data live real-time tanpa batas (semua penambahan tiang baru masuk & tampil).
 *   2. Fitur AI & survei berjalan 100% penuh.
 */

export const VERCEL_DATA_LOCK_CUTOFF = '2026-08-29T14:15:00.000Z';

export function isVercelEnvironment(): boolean {
  // 1. Cek Server-Side (Vercel otomatis menginjeksi VERCEL=1)
  if (process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL_ENV) {
    return true;
  }

  // 2. Cek Client-Side Hostname Browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('vercel.app')) {
      return true;
    }
  }

  return false;
}

export function isAiFeatureActive(): boolean {
  return !isVercelEnvironment();
}

export function isDataMutationAllowed(): boolean {
  return !isVercelEnvironment();
}
