import { NextResponse } from 'next/server';
import { getPoleRepository } from '@/repositories/PoleRepositoryFactory';
import { getProviderRepository } from '@/repositories/GoogleSheetsProviderRepository';
import { getSegmentRepository } from '@/repositories/GoogleSheetsSegmentRepository';
import { sheetsBackupService } from '@/services/sheetsBackupService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/sync-to-sheets
 *
 * Full sync: Ambil data dari repository aktif (PostgreSQL/Supabase)
 * lalu tulis ulang sheet tiang, provider, dan segmen di Google Sheets.
 * Digunakan admin untuk sinkronisasi manual atau recovery.
 */
export async function POST() {
  try {
    const startTime = Date.now();
    const results: Record<string, { success: boolean; count: number; error?: string }> = {};

    // 1. Sync Poles
    try {
      const poles = await getPoleRepository().findAll();
      const success = await sheetsBackupService.fullSyncPolesToSheets(poles);
      results.poles = { success, count: poles.length };
    } catch (err: any) {
      results.poles = { success: false, count: 0, error: err.message };
    }

    // 2. Sync Providers
    try {
      const providers = await getProviderRepository().findAll();
      const success = await sheetsBackupService.fullSyncProvidersToSheets(providers);
      results.providers = { success, count: providers.length };
    } catch (err: any) {
      results.providers = { success: false, count: 0, error: err.message };
    }

    // 3. Sync Segments
    try {
      const segments = await getSegmentRepository().findAll();
      const success = await sheetsBackupService.fullSyncSegmentsToSheets(segments);
      results.segments = { success, count: segments.length };
    } catch (err: any) {
      results.segments = { success: false, count: 0, error: err.message };
    }

    const elapsed = Date.now() - startTime;
    const allSuccess = Object.values(results).every((r) => r.success);

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess
        ? 'Semua data berhasil di-sync ke Google Sheets'
        : 'Beberapa data gagal di-sync, periksa detail',
      results,
      elapsedMs: elapsed,
    });
  } catch (error: any) {
    console.error('API POST /api/admin/sync-to-sheets error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal sync ke Google Sheets' },
      { status: 500 }
    );
  }
}
