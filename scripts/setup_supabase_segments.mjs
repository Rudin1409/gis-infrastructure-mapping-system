import pg from 'pg';
const { Client } = pg;

const DB_PASSWORD = 'CiflkG1Ndc7PrXUF';
const PROJECT_REF = 'qdiswcejzxwrrbirzstv';

const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  user: `postgres.${PROJECT_REF}`,
  password: DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

const INITIAL_SEGMENTS = [
  {
    id: 'SEG-0001',
    segment_code: 'FO-MJP-01',
    from_node_id: 'LL-0001',
    to_node_id: 'LL-0002',
    provider_id: 'PRV_TELKOM',
    provider_name: '1. TELKOM INDONESIA',
    network_type: 'FIBER_OPTIC',
    installation_type: 'AERIAL',
    estimated_distance: 45.2,
    status: 'ACTIVE',
    description: 'Jalur kabel FO 24 core Jl. Majapahit'
  },
  {
    id: 'SEG-0002',
    segment_code: 'FO-MJP-02',
    from_node_id: 'LL-0002',
    to_node_id: 'LL-0003',
    provider_id: 'PRV_TELKOM',
    provider_name: '1. TELKOM INDONESIA',
    network_type: 'FIBER_OPTIC',
    installation_type: 'AERIAL',
    estimated_distance: 49.0,
    status: 'ACTIVE',
    description: 'Jalur kabel FO Jl. Majapahit No. 2 ke No. 3'
  },
  {
    id: 'SEG-0003',
    segment_code: 'FO-GAR-01',
    from_node_id: 'LL-0004',
    to_node_id: 'LL-0006',
    provider_id: 'PRV_TELKOM',
    provider_name: '1. TELKOM INDONESIA',
    network_type: 'FIBER_OPTIC',
    installation_type: 'AERIAL',
    estimated_distance: 35.8,
    status: 'ACTIVE',
    description: 'Jalur kabel FO Jalan Garuda (Pelita Jaya - Belakang Bapenda)'
  }
];

async function setupSegments() {
  console.log('⚡ Menyiapkan tabel public.segments di Supabase PostgreSQL...');
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.segments (
        id TEXT PRIMARY KEY,
        segment_code TEXT,
        from_node_id TEXT NOT NULL,
        to_node_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        provider_name TEXT,
        network_type TEXT DEFAULT 'FIBER_OPTIC',
        installation_type TEXT DEFAULT 'AERIAL',
        estimated_distance DOUBLE PRECISION DEFAULT 0,
        status TEXT DEFAULT 'ACTIVE',
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;

    DO $$ BEGIN
      DROP POLICY IF EXISTS "Allow public read on segments" ON public.segments;
      DROP POLICY IF EXISTS "Allow public insert on segments" ON public.segments;
      DROP POLICY IF EXISTS "Allow public update on segments" ON public.segments;
      DROP POLICY IF EXISTS "Allow public delete on segments" ON public.segments;

      CREATE POLICY "Allow public read on segments" ON public.segments FOR SELECT USING (true);
      CREATE POLICY "Allow public insert on segments" ON public.segments FOR INSERT WITH CHECK (true);
      CREATE POLICY "Allow public update on segments" ON public.segments FOR UPDATE USING (true);
      CREATE POLICY "Allow public delete on segments" ON public.segments FOR DELETE USING (true);
    END $$;

    -- Add segments to realtime publication
    DO $$ BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.segments;
    EXCEPTION WHEN OTHERS THEN NULL;
    END $$;
  `);

  for (const s of INITIAL_SEGMENTS) {
    await client.query(`
      INSERT INTO public.segments (id, segment_code, from_node_id, to_node_id, provider_id, provider_name, network_type, installation_type, estimated_distance, status, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING;
    `, [s.id, s.segment_code, s.from_node_id, s.to_node_id, s.provider_id, s.provider_name, s.network_type, s.installation_type, s.estimated_distance, s.status, s.description]);
  }

  console.log('✅ TABEL SEGMENTS DI SUPABASE BERHASIL DIBUAT & DIISI 100%!');
  await client.end();
}

setupSegments().catch(console.error);
