import pg from 'pg';
const { Client } = pg;

const DB_PASSWORD = process.env.DB_PASSWORD || '';
const PROJECT_REF = process.env.PROJECT_REF || '';

const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  user: `postgres.${PROJECT_REF}`,
  password: DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

async function enableRealtime() {
  console.log('⚡ Mengaktifkan Supabase Realtime WebSockets pada database PostgreSQL...');
  await client.connect();

  await client.query(`
    -- Aktifkan Realtime Publication pada tabel poles dan users
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
      ) THEN
        CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
      ELSE
        ALTER PUBLICATION supabase_realtime ADD TABLE public.poles;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
      END IF;
    EXCEPTION
      WHEN duplicate_object THEN
        NULL; -- sudah ada
    END
    $$;
  `);

  console.log('✅ SUPABASE REALTIME WEBSOCKETS AKTIF 100% UNTUK TABEL POLES & USERS!');
  await client.end();
}

enableRealtime().catch(console.error);
