import pg from 'pg';

// Read-only deployment gate. Never changes passwords or schema during deployment.
const origin = new URL(process.env.APP_ORIGIN || 'http://invalid');
if (origin.protocol !== 'https:' || origin.hostname === 'invalid' || origin.pathname !== '/') {
  throw new Error('APP_ORIGIN harus berisi origin HTTPS produksi.');
}
if (process.env.APPS_SCRIPT_URL && !process.env.APPS_SCRIPT_SHARED_SECRET) {
  throw new Error('Konfigurasikan APPS_SCRIPT_SHARED_SECRET sebelum mengaktifkan integrasi.');
}
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) throw new Error('Preflight membutuhkan koneksi PostgreSQL server.');
const pool = new pg.Pool({
  connectionString,
  connectionTimeoutMillis: 10000,
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized: true,
          ...(process.env.DATABASE_CA_CERT
            ? { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n') }
            : {}),
        }
      : undefined,
});
try {
  await pool.query('SELECT token_hash, credential_hash FROM auth_sessions LIMIT 0');
  await pool.query('SELECT key_hash FROM auth_rate_limits LIMIT 0');
  const { rows } = await pool.query(
    "SELECT count(*)::int AS count FROM users WHERE id NOT LIKE '\\_%' AND status IN ('AKTIF','ACTIVE') AND password !~ '^scrypt[$][a-f0-9]{32}[$][a-f0-9]{128}$'"
  );
  if (rows[0].count) throw new Error('Masih ada akun aktif yang belum dimigrasikan.');
  const policies = await pool.query(
    "SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename IN ('users','poles','auth_sessions','auth_rate_limits') AND roles && ARRAY['public','anon','authenticated']::name[] LIMIT 1"
  );
  if (policies.rowCount) throw new Error('Policy publik masih aktif. Jalankan migrasi keamanan.');
  console.log('Preflight keamanan database dan konfigurasi lulus.');
} finally {
  await pool.end();
}
