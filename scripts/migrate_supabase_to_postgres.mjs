import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qdiswcejzxwrrbirzstv.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_JXBAQ-tsjCWcD7iOjWvuBA_JJ_EFf7y';
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL belum diisi. Set dulu koneksi PostgreSQL VPS sebelum menjalankan migrasi.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.DATABASE_POOL_MAX || 10),
});

async function ensureSchema() {
  const schemaPath = path.resolve(process.cwd(), 'supabase', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  const statements = schemaSql
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  console.log(`🧱 Menjalankan ${statements.length} statement schema ke PostgreSQL VPS...`);
  for (const statement of statements) {
    await pool.query(statement);
  }
}

async function fetchAllFromSupabase(table, orderColumn = 'id') {
  const pageSize = 1000;
  const rows = [];
  let offset = 0;

  while (true) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    url.searchParams.set('select', '*');
    url.searchParams.set('order', `${orderColumn}.asc`);
    url.searchParams.set('limit', String(pageSize));
    url.searchParams.set('offset', String(offset));

    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Supabase REST error for ${table}: ${res.status} ${await res.text()}`);
    }

    const batch = await res.json();
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

function buildUpsertSql(table, rows) {
  if (!rows.length) return null;

  const columns = Object.keys(rows[0]);
  const values = [];
  const placeholders = rows
    .map((row, rowIndex) => {
      const rowPlaceholders = columns.map((column, colIndex) => {
        values.push(row[column] ?? null);
        return `$${rowIndex * columns.length + colIndex + 1}`;
      });
      return `(${rowPlaceholders.join(', ')})`;
    })
    .join(', ');

  const updateColumns = columns.filter((column) => column !== 'id');
  const updateSql = updateColumns.map((column) => `${column} = EXCLUDED.${column}`).join(', ');

  return {
    text: `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders} ON CONFLICT (id) DO UPDATE SET ${updateSql}`,
    values,
    count: rows.length,
  };
}

async function upsertTable(table, rows) {
  if (!rows.length) {
    console.log(`ℹ️  ${table}: tidak ada data untuk dipindahkan`);
    return 0;
  }

  const chunkSize = 200;
  let total = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const sql = buildUpsertSql(table, chunk);
    if (!sql) continue;
    await pool.query(sql.text, sql.values);
    total += chunk.length;
  }

  console.log(`✅ ${table}: ${total} baris disalin`);
  return total;
}

async function main() {
  console.log('🚀 Mulai migrasi data Supabase ke PostgreSQL VPS...');
  await ensureSchema();

  const [providers, poles, segments, users] = await Promise.all([
    fetchAllFromSupabase('providers', 'id'),
    fetchAllFromSupabase('poles', 'id'),
    fetchAllFromSupabase('segments', 'id'),
    fetchAllFromSupabase('users', 'id'),
  ]);

  console.log('📦 Data sumber berhasil dibaca dari Supabase:');
  console.log(`- providers: ${providers.length}`);
  console.log(`- poles: ${poles.length}`);
  console.log(`- segments: ${segments.length}`);
  console.log(`- users: ${users.length}`);

  await upsertTable('providers', providers);
  await upsertTable('poles', poles);
  await upsertTable('segments', segments);
  await upsertTable('users', users);

  const verify = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS count FROM providers'),
    pool.query('SELECT COUNT(*)::int AS count FROM poles'),
    pool.query('SELECT COUNT(*)::int AS count FROM segments'),
    pool.query('SELECT COUNT(*)::int AS count FROM users'),
  ]);

  console.log('🔍 Verifikasi jumlah data di PostgreSQL VPS:');
  console.log(`- providers: ${verify[0].rows[0].count}`);
  console.log(`- poles: ${verify[1].rows[0].count}`);
  console.log(`- segments: ${verify[2].rows[0].count}`);
  console.log(`- users: ${verify[3].rows[0].count}`);
  console.log('🎉 Migrasi selesai.');
}

main()
  .catch((error) => {
    console.error('❌ Migrasi gagal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
