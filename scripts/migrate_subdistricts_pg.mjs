import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const DB_PASSWORD = process.env.DB_PASSWORD || '';
const PROJECT_REF = process.env.PROJECT_REF || '';

const connectionConfigs = [
  // 1. Transaction/Session Pooler (IPv4 compatible)
  {
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: `postgres.${PROJECT_REF}`,
    password: DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  },
  // 2. Direct Connection
  {
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password: DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  },
  // 3. Session Pooler Port 5432
  {
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: `postgres.${PROJECT_REF}`,
    password: DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  },
];

const SCHEMA_SQL = fs.readFileSync('supabase/subdistricts_migration.sql', 'utf8');

async function getClient() {
  for (let i = 0; i < connectionConfigs.length; i++) {
    const config = connectionConfigs[i];
    console.log(`🔌 Mencoba koneksi direct ke ${config.host}:${config.port}...`);
    const client = new Client(config);
    try {
      await client.connect();
      console.log(`✅ KONEKSI DATABASE BERHASIL ke ${config.host}!`);
      return client;
    } catch (err) {
      console.log(`⚠️ Gagal ke ${config.host}:${config.port} (${err.message})`);
      try {
        await client.end();
      } catch (_) {}
    }
  }
  throw new Error('Semua opsi koneksi database gagal terhubung.');
}

async function run() {
  console.log('===========================================================');
  console.log(' 🚀 MEMBUAT TABEL SUBDISTRICTS & SEED 72 KELURAHAN KE SUPABASE');
  console.log('===========================================================\n');

  const client = await getClient();

  console.log('🏗️ Menjalankan DDL & Seed SQL untuk tabel subdistricts...');
  await client.query(SCHEMA_SQL);
  console.log('✅ Skema tabel subdistricts berhasil dibuat dan 72 kelurahan di-seed!\n');

  const { rows } = await client.query(
    'SELECT count(*) as total, count(DISTINCT kecamatan) as total_kec FROM subdistricts'
  );
  console.log(
    `📊 Status Database: Total ${rows[0].total} Kelurahan di ${rows[0].total_kec} Kecamatan terdaftar!`
  );

  await client.end();
  console.log('🎉 SELESAI!');
}

run().catch((err) => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
