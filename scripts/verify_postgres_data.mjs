import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL belum diisi.');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  const tables = ['providers', 'poles', 'segments', 'users'];
  for (const table of tables) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    console.log(`${table}: ${rows[0].count}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
