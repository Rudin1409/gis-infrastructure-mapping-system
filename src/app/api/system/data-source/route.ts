import { withAuth, requestUser } from '@/lib/security/api';
import { NextResponse } from 'next/server';
import { dbQuery, getDatabaseUrl, isPostgresConfigured } from '@/lib/postgres';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function maskDatabaseUrl(url: string) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.username ? `${parsed.username}:***@` : ''}${parsed.host}${parsed.pathname}`;
  } catch (_) {
    return 'configured';
  }
}

async function GETHandler() {
  try {
    if (isPostgresConfigured()) {
      const [poles, providers, segments, users] = await Promise.all([
        dbQuery('SELECT COUNT(*)::int AS count FROM poles'),
        dbQuery('SELECT COUNT(*)::int AS count FROM providers'),
        dbQuery('SELECT COUNT(*)::int AS count FROM segments'),
        dbQuery('SELECT COUNT(*)::int AS count FROM users'),
      ]);

      return NextResponse.json({
        success: true,
        primary: 'POSTGRES_VPS',
        postgresConfigured: true,
        database: maskDatabaseUrl(getDatabaseUrl()),
        counts: {
          poles: poles.rows[0]?.count || 0,
          providers: providers.rows[0]?.count || 0,
          segments: segments.rows[0]?.count || 0,
          users: users.rows[0]?.count || 0,
        },
      });
    }

    const [poles, providers, segments, users] = await Promise.all([
      supabase.from('poles').select('id', { count: 'exact', head: true }),
      supabase.from('providers').select('id', { count: 'exact', head: true }),
      supabase.from('segments').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }),
    ]);

    const firstError = poles.error || providers.error || segments.error || users.error;
    if (firstError) throw firstError;

    return NextResponse.json({
      success: true,
      primary: 'SUPABASE_FALLBACK',
      postgresConfigured: false,
      warning: 'DATABASE_URL belum terbaca, jadi sistem belum memakai database VPS.',
      counts: {
        poles: poles.count || 0,
        providers: providers.count || 0,
        segments: segments.count || 0,
        users: users.count || 0,
      },
    });
  } catch (error: any) {
    console.error('API GET /api/system/data-source error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal mengecek sumber data',
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(GETHandler, { admin: true });
