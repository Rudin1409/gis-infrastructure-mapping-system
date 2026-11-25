import { withAuth, requestUser } from '@/lib/security/api';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { poleService } from '@/services/PoleService';
import { sheetsBackupService } from '@/services/sheetsBackupService';
import { dbQuery, isPostgresConfigured } from '@/lib/postgres';
import fs from 'node:fs';
import path from 'node:path';

// Helper pencadangan otomatis (Safety Archive) sebelum data tiang dihapus
async function backupPolesBeforeDelete(
  poles: any[],
  user: { id?: string; name?: string; role?: string } | null
) {
  try {
    if (!poles || poles.length === 0) return;
    const backupDir = path.resolve(process.cwd(), 'public', 'uploads', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `deleted_poles_${timestamp}.json`;
    const filePath = path.join(backupDir, filename);

    const payload = {
      backupTimestamp: new Date().toISOString(),
      deletedBy: user ? { id: user.id, name: user.name, role: user.role } : 'Unknown',
      count: poles.length,
      poles,
    };

    await fs.promises.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');

    // Simpan juga ke direktori persisten VPS jika ada
    const vpsShared = '/home/admin/gis-deploy/shared/backups';
    if (fs.existsSync('/home/admin/gis-deploy/shared')) {
      if (!fs.existsSync(vpsShared)) {
        fs.mkdirSync(vpsShared, { recursive: true });
      }
      await fs.promises.writeFile(
        path.join(vpsShared, filename),
        JSON.stringify(payload, null, 2),
        'utf8'
      );
    }
  } catch (err) {
    console.warn('[Safety Archive] Gagal menyimpan file cadangan tiang:', err);
  }
}

async function POSTHandler(req: NextRequest) {
  try {
    const user = await requestUser(req);
    const body = await req.json();
    const { ids } = body;

    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > 200 ||
      ids.some((id) => typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(id))
    ) {
      return NextResponse.json(
        { success: false, error: 'Array IDs tiang wajib diisi dan tidak boleh kosong' },
        { status: 400 }
      );
    }

    // 1. Delete associated segments and poles in primary database
    if (isPostgresConfigured()) {
      // Ambil data tiang sebelum dihapus untuk arsip cadangan
      try {
        const { rows: polesToBackup } = await dbQuery(
          'SELECT * FROM poles WHERE id = ANY($1::text[])',
          [ids]
        );
        if (polesToBackup && polesToBackup.length > 0) {
          await backupPolesBeforeDelete(polesToBackup, user);

          // Simpan juga ke tabel arsip database jika memungkinkan
          try {
            await dbQuery(`
              CREATE TABLE IF NOT EXISTS deleted_poles_archive (
                id SERIAL PRIMARY KEY,
                pole_id TEXT,
                deleted_at TIMESTAMPTZ DEFAULT NOW(),
                deleted_by TEXT,
                pole_data JSONB
              )
            `);
            for (const pole of polesToBackup) {
              await dbQuery(
                'INSERT INTO deleted_poles_archive (pole_id, deleted_by, pole_data) VALUES ($1, $2, $3)',
                [pole.id, user ? `${user.name} (${user.role})` : 'System', JSON.stringify(pole)]
              );
            }
          } catch (dbErr) {
            console.warn('[DB Archive] Gagal mencatat ke tabel arsip:', dbErr);
          }
        }
      } catch (backupErr) {
        console.warn('[Safety Archive] Peringatan pengambilan data cadangan:', backupErr);
      }

      try {
        await dbQuery(
          'DELETE FROM segments WHERE from_node_id = ANY($1::text[]) OR to_node_id = ANY($1::text[])',
          [ids]
        );
      } catch (segErr) {
        console.warn('Warning deleting connected segments:', segErr);
      }

      const { rowCount } = await dbQuery('DELETE FROM poles WHERE id = ANY($1::text[])', [ids]);

      // 3. Fire-and-forget: Full sync remaining poles to Google Sheets
      poleService
        .getPoles()
        .then((remainingPoles) => {
          sheetsBackupService.fullSyncPolesToSheets(remainingPoles).catch((err) => {
            console.warn('[Sheets Backup] Batch delete mirror error:', err);
          });
        })
        .catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Berhasil menghapus ${ids.length} tiang terpilih beserta kabelnya`,
        data: {
          deletedCount: rowCount || ids.length,
          deletedIds: ids,
        },
      });
    }

    // Backup dari Supabase jika Postgres tidak aktif
    try {
      const { data: supaPoles } = await supabase.from('poles').select('*').in('id', ids);
      if (supaPoles && supaPoles.length > 0) {
        await backupPolesBeforeDelete(supaPoles, user);
      }
    } catch {}

    // 1. Delete associated segments in Supabase
    try {
      const orConditions = ids.map((id) => `from_node_id.eq.${id},to_node_id.eq.${id}`).join(',');
      await supabase.from('segments').delete().or(orConditions);
    } catch (segErr) {
      console.warn('Warning deleting connected segments:', segErr);
    }

    // 2. Delete poles from Supabase in batch
    const { error: poleErr, count } = await supabase
      .from('poles')
      .delete({ count: 'exact' })
      .in('id', ids);

    if (poleErr) {
      console.error('Server batch delete error:', poleErr);
      return NextResponse.json(
        { success: false, error: `Gagal menghapus data tiang dari server: ${poleErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil menghapus ${ids.length} tiang terpilih beserta kabelnya`,
      data: {
        deletedCount: count || ids.length,
        deletedIds: ids,
      },
    });
  } catch (error: any) {
    console.error('Batch delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan internal server' },
      { status: 500 }
    );
  }
}

// Izin diberikan untuk Surveyor dan Admin (Provider Viewer tetap ditolak)
export const POST = withAuth(POSTHandler, {});
