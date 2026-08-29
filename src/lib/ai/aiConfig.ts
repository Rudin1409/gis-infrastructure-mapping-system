/**
 * Helper deteksi ketersediaan fitur AI.
 * Fitur AI dinonaktifkan sepenuhnya jika berjalan di lingkungan Vercel (vercel.app),
 * dan HANYA aktif di Server VPS Produksi (inframap.my.id) serta environment server lokal.
 */

export function isAiFeatureActive(): boolean {
  // 1. Cek Server-Side (Vercel selalu otomatis menginjeksi variabel VERCEL=1)
  if (process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_VERCEL_ENV) {
    return false;
  }

  // 2. Cek Client-Side Hostname Browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('vercel.app')) {
      return false;
    }
  }

  return true;
}
