import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { poleService } from '@/services/PoleService';
import { sheetsBackupService } from '@/services/sheetsBackupService';
import { dbQuery, isPostgresConfigured } from '@/lib/postgres';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Array IDs tiang wajib diisi dan tidak boleh kosong' },
        { status: 400 }
      );
    }

    // 1. Delete associated segments and poles in primary database
    if (isPostgresConfigured()) {
      try {
        await dbQuery('DELETE FROM segments WHERE from_node_id = ANY($1::text[]) OR to_node_id = ANY($1::text[])', [ids]);
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

    // 1. Delete associated segments in Supabase
    try {
      const orConditions = ids
        .map((id) => `from_node_id.eq.${id},to_node_id.eq.${id}`)
        .join(',');
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
      { success: false, error: error.message || 'Terjadi kesalahan internal server' },
      { status: 500 }
    );
  }
}
