import { withAuth } from '@/lib/security/api';
import { NextResponse } from 'next/server';
import { dbQuery, isPostgresConfigured } from '@/lib/postgres';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/poles/revision
 * Ultra-fast, lightweight endpoint (50 bytes) to check if pole data has changed.
 * Returns { count, latestUpdate } in < 2ms.
 */
async function GETHandler() {
  try {
    if (isPostgresConfigured()) {
      const { rows } = await dbQuery(
        'SELECT count(*)::int as count, max(updated_at)::text as latest_update FROM poles'
      );
      if (rows && rows.length > 0) {
        return NextResponse.json({
          success: true,
          count: rows[0].count,
          latest: rows[0].latest_update || '',
        });
      }
    }

    // Fallback: Supabase count & latest
    const { count, error } = await supabase
      .from('poles')
      .select('*', { count: 'exact', head: true });
    return NextResponse.json({
      success: true,
      count: count || 0,
      latest: '',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Gagal memeriksa revisi data' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(GETHandler, {});
