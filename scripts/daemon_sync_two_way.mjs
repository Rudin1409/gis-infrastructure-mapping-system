import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL belum diatur.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

function buildUpsertQuery(table, row) {
  const cols = Object.keys(row);
  const params = cols.map((_, i) => `$${i + 1}`);
  const updateSet = cols
    .filter((c) => c !== 'id')
    .map((c) => `"${c}" = EXCLUDED."${c}"`)
    .join(', ');
  const sql = `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${params.join(', ')}) ON CONFLICT (id) DO UPDATE SET ${updateSet}`;
  return { sql, values: Object.values(row) };
}

let lastSyncTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

async function syncCycle() {
  try {
    // 1. Ambil data baru / terupdate dari Supabase (yang disubmit oleh surveyor di server manapun)
    const { data: remotePoles, error: sbErr } = await sb
      .from('poles')
      .select('*')
      .gt('updated_at', lastSyncTimestamp)
      .order('updated_at', { ascending: true })
      .limit(200);

    if (sbErr) {
      console.warn(`[Sync Daemon] Supabase poll warning: ${sbErr.message}`);
    } else if (remotePoles && remotePoles.length > 0) {
      console.log(
        `[Sync Daemon] 📥 Mendeteksi ${remotePoles.length} tiang baru/terupdate dari Cloud/Server lain...`
      );
      for (const pole of remotePoles) {
        const q = buildUpsertQuery('poles', pole);
        await pool.query(q.sql, q.values);
        if (pole.updated_at && pole.updated_at > lastSyncTimestamp) {
          lastSyncTimestamp = pole.updated_at;
        }
      }
      console.log(`[Sync Daemon] ✅ Berhasil disinkronkan ke database lokal!`);
    }

    // 2. Ambil data lokal yang baru dibuat di server baru dan mirror ke Supabase
    const { rows: localRecent } = await pool.query(
      `SELECT * FROM poles WHERE updated_at > $1 ORDER BY updated_at ASC LIMIT 100`,
      [lastSyncTimestamp]
    );

    if (localRecent && localRecent.length > 0) {
      const { error: upsertErr } = await sb.from('poles').upsert(localRecent, { onConflict: 'id' });
      if (!upsertErr) {
        lastSyncTimestamp = new Date(localRecent[localRecent.length - 1].updated_at).toISOString();
      }
    }
  } catch (err) {
    console.error('[Sync Daemon Error]:', err?.message || err);
  }
}

async function main() {
  console.log('🔄 [Sync Daemon] Service sinkronisasi otomatis 2 arah aktif.');
  console.log(`⏱️ Interval: Setiap 30 detik`);

  // Jalankan sync pertama kali
  await syncCycle();

  // Loop setiap 30 detik
  setInterval(syncCycle, 30000);
}

main().catch((e) => console.error(e));
