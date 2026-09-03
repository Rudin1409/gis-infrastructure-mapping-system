import { NextRequest, NextResponse } from 'next/server';
import { calculateHaversineDistance } from '@/lib/gis/haversine';
import { dbQuery, isPostgresConfigured } from '@/lib/postgres';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Active window: 2 minutes of inactivity automatically clears user from map
const ACTIVE_WINDOW_MINUTES = 2;

async function ensureSurveyorLocationsTable() {
  if (!isPostgresConfigured()) return;
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS public.surveyor_locations (
      user_id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      role_label TEXT,
      team TEXT DEFAULT 'LAINNYA',
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      accuracy DOUBLE PRECISION,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await dbQuery(
    'CREATE INDEX IF NOT EXISTS idx_surveyor_locations_updated_at ON public.surveyor_locations (updated_at DESC)'
  );
  await dbQuery(
    'CREATE INDEX IF NOT EXISTS idx_surveyor_locations_lat_lng ON public.surveyor_locations (latitude, longitude)'
  );
}

function resolveTeam(userId?: string, userName?: string): 'KOMINFO' | 'BAPENDA' | 'LAINNYA' {
  if (userId === 'USR-KOMINFO-ADMIN' || userId === 'USR-SURVEYOR-01') return 'KOMINFO';
  if (userId === 'USR-SURVEYOR-02' || userId === 'USR-SURVEYOR-03' || userId === 'USR-SURVEYOR-04') return 'BAPENDA';

  const key = `${userId || ''} ${userName || ''}`.toLowerCase();
  if (key.includes('kominfo') || key.includes('tri') || key.includes('admin')) return 'KOMINFO';
  if (key.includes('yodi') || key.includes('andika') || key.includes('pradigga') || key.includes('bapenda')) return 'BAPENDA';
  return 'LAINNYA';
}

function mapLocation(row: any) {
  return {
    userId: row.user_id,
    userName: row.user_name,
    roleLabel: row.role_label,
    team: row.team,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracy: row.accuracy == null ? undefined : Number(row.accuracy),
    updatedAt: row.updated_at,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get('lat'));
    const lng = Number(searchParams.get('lng'));
    const excludeUserId = searchParams.get('excludeUserId') || '';
    const requesterTeam = (searchParams.get('requesterTeam') || '').toUpperCase();
    const requesterAgency = (searchParams.get('requesterAgency') || '').toUpperCase();

    // 🔒 HAK AKSES KHUSUS: Tim BAPENDA tidak diperkenankan melihat lokasi user/petugas di peta
    if (requesterTeam === 'BAPENDA' || requesterAgency.includes('BAPENDA')) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        notice: 'Akses pemantauan lokasi petugas hanya diperuntukkan bagi Tim KOMINFO.',
      });
    }

    let rows: any[] = [];

    if (isPostgresConfigured()) {
      await ensureSurveyorLocationsTable();
      const result = await dbQuery(
        `
          SELECT user_id, user_name, role_label, team, latitude, longitude, accuracy, updated_at
          FROM surveyor_locations
          WHERE updated_at >= NOW() - ($1::int * INTERVAL '1 minute')
            AND ($2 = '' OR user_id <> $2)
          ORDER BY updated_at DESC
          LIMIT 30
        `,
        [ACTIVE_WINDOW_MINUTES, excludeUserId]
      );
      rows = result.rows;
    } else {
      const { supabase } = await import('@/lib/supabase');
      const threshold = new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60 * 1000).toISOString();
      let query = supabase
        .from('surveyor_locations')
        .select('user_id,user_name,role_label,team,latitude,longitude,accuracy,updated_at')
        .gte('updated_at', threshold)
        .order('updated_at', { ascending: false })
        .limit(30);

      if (excludeUserId) {
        query = query.neq('user_id', excludeUserId);
      }

      const { data, error } = await query;
      if (error) throw error;
      rows = data || [];
    }

    const hasDistance = Number.isFinite(lat) && Number.isFinite(lng);
    const data = rows.map(mapLocation).map((item) => ({
      ...item,
      distanceMeters: hasDistance
        ? Math.round(
            calculateHaversineDistance(
              { lat, lng },
              { lat: item.latitude, lng: item.longitude }
            )
          )
        : undefined,
    }));

    return NextResponse.json({
      success: true,
      data: hasDistance ? data.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0)) : data,
      count: data.length,
    });
  } catch (error: any) {
    console.error('API GET /api/surveyors/active error:', error);
    return NextResponse.json({
      success: false,
      data: [],
      count: 0,
      error: error.message || 'Gagal memuat lokasi user aktif',
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryAction = searchParams.get('action');
    const queryUserId = searchParams.get('userId');

    let body: any = {};
    try {
      body = await request.json();
    } catch (_) {
      // Beacon or empty body
    }

    const action = queryAction || body?.action;
    const userId = String(queryUserId || body?.userId || '').trim();

    // 🛑 HANDLER OFFLINE: Hapus seketika saat user keluar aplikasi / logout / close tab
    if (action === 'offline' && userId) {
      if (isPostgresConfigured()) {
        await ensureSurveyorLocationsTable();
        await dbQuery('DELETE FROM surveyor_locations WHERE user_id = $1', [userId]);
      } else {
        const { supabase } = await import('@/lib/supabase');
        await supabase.from('surveyor_locations').delete().eq('user_id', userId);
      }
      return NextResponse.json({ success: true, action: 'offline', userId });
    }

    const userName = String(body.userName || '').trim();
    const roleLabel = String(body.roleLabel || '').trim();
    const latitude = Number(body.latitude ?? body.lat);
    const longitude = Number(body.longitude ?? body.lng);
    const accuracy = body.accuracy == null ? null : Number(body.accuracy);

    if (!userId || !userName || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { success: false, error: 'Data lokasi user belum lengkap' },
        { status: 400 }
      );
    }

    const team = resolveTeam(userId, userName);

    if (isPostgresConfigured()) {
      await ensureSurveyorLocationsTable();
      await dbQuery(
        `
          INSERT INTO surveyor_locations
            (user_id, user_name, role_label, team, latitude, longitude, accuracy, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (user_id)
          DO UPDATE SET
            user_name = EXCLUDED.user_name,
            role_label = EXCLUDED.role_label,
            team = EXCLUDED.team,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            accuracy = EXCLUDED.accuracy,
            updated_at = NOW()
        `,
        [userId, userName, roleLabel, team, latitude, longitude, accuracy]
      );
    } else {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.from('surveyor_locations').upsert(
        {
          user_id: userId,
          user_name: userName,
          role_label: roleLabel,
          team,
          latitude,
          longitude,
          accuracy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
    }

    return NextResponse.json({ success: true, team });
  } catch (error: any) {
    console.error('API POST /api/surveyors/active error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan lokasi user aktif' },
      { status: 500 }
    );
  }
}
