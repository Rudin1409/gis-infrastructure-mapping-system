import { appsScriptFetch as fetch } from '@/lib/google/appsScriptClient';
/**
 * Sheets Backup Service
 *
 * Service untuk mirror data dari database utama ke Google Sheets
 * via Apps Script Web App sebagai cadangan/backup.
 *
 * PRINSIP:
 * - CRUD tiang memanggil backup tanpa menunggu hasilnya (fire-and-forget).
 * - Sinkronisasi penuh menunggu hasil agar admin dapat melihat status per sheet.
 * - Kegagalan backup dilaporkan sebagai false dan tidak membatalkan data utama.
 */

import { Pole } from '@/types/pole';
import { APPS_SCRIPT_URL, isAppsScriptConfigured } from '@/lib/google/appsScriptClient';

class SheetsBackupService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = isAppsScriptConfigured();
  }

  /**
   * Backup pole baru ke Google Sheets (savePole action)
   * Fire-and-forget — tidak throw error
   */
  async backupPoleToSheets(pole: Pole): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('[Sheets Backup] Apps Script tidak dikonfigurasi, skip backup');
      return false;
    }

    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'savePole',
          data: pole,
        }),
      });

      const json = await res.json();
      if (json.success) {
        console.log(`[Sheets Backup] ✅ Pole ${pole.id} berhasil di-backup ke Sheets`);
        return true;
      } else {
        console.warn(`[Sheets Backup] ⚠️ Gagal backup pole ${pole.id}:`, json.error);
        return false;
      }
    } catch (error) {
      console.warn(`[Sheets Backup] ⚠️ Error backup pole ${pole.id}:`, error);
      return false;
    }
  }

  /**
   * Backup update pole ke Google Sheets (updatePole action)
   * Fire-and-forget — tidak throw error
   */
  async backupUpdatePoleToSheets(pole: Pole): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('[Sheets Backup] Apps Script tidak dikonfigurasi, skip backup');
      return false;
    }

    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePole',
          data: pole,
        }),
      });

      const json = await res.json();
      if (json.success) {
        console.log(`[Sheets Backup] ✅ Pole ${pole.id} berhasil di-update di Sheets`);
        return true;
      } else {
        console.warn(`[Sheets Backup] ⚠️ Gagal update pole ${pole.id} di Sheets:`, json.error);
        return false;
      }
    } catch (error) {
      console.warn(`[Sheets Backup] ⚠️ Error update pole ${pole.id} di Sheets:`, error);
      return false;
    }
  }

  /**
   * Backup delete pole dari Google Sheets (deletePole action)
   * Fire-and-forget — tidak throw error
   */
  async backupDeletePoleFromSheets(id: string): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('[Sheets Backup] Apps Script tidak dikonfigurasi, skip backup');
      return false;
    }

    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deletePole',
          id: id,
        }),
      });

      const json = await res.json();
      if (json.success) {
        console.log(`[Sheets Backup] ✅ Pole ${id} berhasil dihapus dari Sheets`);
        return true;
      } else {
        console.warn(`[Sheets Backup] ⚠️ Gagal hapus pole ${id} dari Sheets:`, json.error);
        return false;
      }
    } catch (error) {
      console.warn(`[Sheets Backup] ⚠️ Error hapus pole ${id} dari Sheets:`, error);
      return false;
    }
  }

  /**
   * Full sync: Tulis ulang data tiang yang diberikan pemanggil ke Google Sheets
   * Digunakan untuk sinkronisasi awal atau recovery
   *
   * FLOW:
   * 1. Pemanggil mengambil poles dari repository aktif
   * 2. Kirim ke Apps Script action clearAndWritePoles untuk replace semua data di sheet
   */
  async fullSyncPolesToSheets(poles: Pole[]): Promise<boolean> {
    if (!this.isConfigured) {
      console.log('[Sheets Backup] Apps Script tidak dikonfigurasi, skip full sync');
      return false;
    }

    try {
      console.log(`[Sheets Backup] 🔄 Memulai full sync ${poles.length} poles ke Sheets...`);

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clearAndWritePoles',
          data: poles,
        }),
      });

      const json = await res.json();
      if (json.success) {
        console.log(
          `[Sheets Backup] ✅ Full sync berhasil! ${poles.length} poles ditulis ke Sheets`
        );
        return true;
      } else {
        console.warn('[Sheets Backup] ⚠️ Full sync gagal:', json.error);
        return false;
      }
    } catch (error) {
      console.warn('[Sheets Backup] ⚠️ Error full sync:', error);
      return false;
    }
  }

  /**
   * Full sync providers ke Google Sheets
   */
  async fullSyncProvidersToSheets(providers: any[]): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      console.log(`[Sheets Backup] 🔄 Sync ${providers.length} providers ke Sheets...`);

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clearAndWriteProviders',
          data: providers,
        }),
      });

      const json = await res.json();
      if (json.success) {
        console.log(`[Sheets Backup] ✅ ${providers.length} providers di-sync ke Sheets`);
        return true;
      } else {
        console.warn('[Sheets Backup] ⚠️ Gagal sync providers:', json.error);
        return false;
      }
    } catch (error) {
      console.warn('[Sheets Backup] ⚠️ Error sync providers:', error);
      return false;
    }
  }

  /**
   * Full sync segments ke Google Sheets
   */
  async fullSyncSegmentsToSheets(segments: any[]): Promise<boolean> {
    if (!this.isConfigured) return false;

    try {
      console.log(`[Sheets Backup] 🔄 Sync ${segments.length} segments ke Sheets...`);

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clearAndWriteSegments',
          data: segments,
        }),
      });

      const json = await res.json();
      if (json.success) {
        console.log(`[Sheets Backup] ✅ ${segments.length} segments di-sync ke Sheets`);
        return true;
      } else {
        console.warn('[Sheets Backup] ⚠️ Gagal sync segments:', json.error);
        return false;
      }
    } catch (error) {
      console.warn('[Sheets Backup] ⚠️ Error sync segments:', error);
      return false;
    }
  }
}

export const sheetsBackupService = new SheetsBackupService();
