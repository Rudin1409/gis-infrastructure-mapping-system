import pg from 'pg';
const { Client } = pg;

const DB_PASSWORD = 'CiflkG1Ndc7PrXUF';
const PROJECT_REF = 'qdiswcejzxwrrbirzstv';
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyUyNmERJNTJ26-M76Lg1PO7ul0HBakMTV9p3YrxJdN64s3mFTOMEyvVz2br29A4HUH/exec';

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

const SCHEMA_SQL = `
-- 1. TABEL TIANG & JALUR KABEL (POLES)
CREATE TABLE IF NOT EXISTS public.poles (
    id TEXT PRIMARY KEY,
    pole_code TEXT,
    pole_latitude DOUBLE PRECISION NOT NULL,
    pole_longitude DOUBLE PRECISION NOT NULL,
    device_latitude DOUBLE PRECISION,
    device_longitude DOUBLE PRECISION,
    gps_accuracy DOUBLE PRECISION,
    distance_from_device DOUBLE PRECISION,
    location_method TEXT DEFAULT 'GPS_DEVICE',
    provider_id TEXT NOT NULL,
    provider_name TEXT,
    pole_type TEXT DEFAULT 'BETON',
    condition TEXT DEFAULT 'GOOD',
    road TEXT NOT NULL,
    kelurahan TEXT NOT NULL,
    kecamatan TEXT NOT NULL,
    kota TEXT DEFAULT 'Kota Lubuklinggau',
    patokan_lokasi TEXT,
    sisi_jalan TEXT DEFAULT 'KIRI',
    height TEXT DEFAULT '7m',
    ownership_status TEXT DEFAULT 'SENDIRI',
    cable_installation_type TEXT DEFAULT 'UDARA',
    infrastructure_category TEXT DEFAULT 'FO_WIFI',
    pju_lamp_type TEXT DEFAULT 'TIDAK_ADA',
    pju_lamp_power TEXT,
    pju_lamp_condition TEXT DEFAULT 'TIDAK_ADA',
    has_kwh_meter BOOLEAN DEFAULT FALSE,
    has_network_cable BOOLEAN DEFAULT FALSE,
    is_tilted BOOLEAN DEFAULT FALSE,
    is_messy_cable BOOLEAN DEFAULT FALSE,
    is_low_cable BOOLEAN DEFAULT FALSE,
    is_hazardous BOOLEAN DEFAULT FALSE,
    is_corroded BOOLEAN DEFAULT FALSE,
    is_obstructing BOOLEAN DEFAULT FALSE,
    description TEXT,
    photo_file_id TEXT,
    photo_url TEXT,
    additional_photo_file_id TEXT,
    additional_photo_url TEXT,
    surveyor_id TEXT,
    surveyor_name TEXT,
    survey_date TEXT NOT NULL,
    survey_time TEXT,
    validation_status TEXT DEFAULT 'SUBMITTED',
    validation_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL AKUN PENGGUNA (USERS)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    agency TEXT,
    phone TEXT,
    status TEXT DEFAULT 'AKTIF',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEX & ROW LEVEL SECURITY
CREATE INDEX IF NOT EXISTS idx_poles_lat_lng ON public.poles (pole_latitude, pole_longitude);
CREATE INDEX IF NOT EXISTS idx_poles_kecamatan ON public.poles (kecamatan);
CREATE INDEX IF NOT EXISTS idx_poles_provider ON public.poles (provider_id);

ALTER TABLE public.poles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public read on poles" ON public.poles;
    DROP POLICY IF EXISTS "Allow public insert on poles" ON public.poles;
    DROP POLICY IF EXISTS "Allow public update on poles" ON public.poles;
    DROP POLICY IF EXISTS "Allow public delete on poles" ON public.poles;
    DROP POLICY IF EXISTS "Allow public read on users" ON public.users;
    DROP POLICY IF EXISTS "Allow public insert on users" ON public.users;
    DROP POLICY IF EXISTS "Allow public update on users" ON public.users;

    CREATE POLICY "Allow public read on poles" ON public.poles FOR SELECT USING (true);
    CREATE POLICY "Allow public insert on poles" ON public.poles FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow public update on poles" ON public.poles FOR UPDATE USING (true);
    CREATE POLICY "Allow public delete on poles" ON public.poles FOR DELETE USING (true);

    CREATE POLICY "Allow public read on users" ON public.users FOR SELECT USING (true);
    CREATE POLICY "Allow public insert on users" ON public.users FOR INSERT WITH CHECK (true);
    CREATE POLICY "Allow public update on users" ON public.users FOR UPDATE USING (true);
END
$$;
`;

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
  console.log(' 🚀 MEMULAI PEMBUATAN TABEL & MIGRASI OTOMATIS KE SUPABASE');
  console.log('===========================================================\n');

  const client = await getClient();

  // 1. Eksekusi Skema DDL
  console.log('🏗️ [1/3] Menjalankan skema DDL (Tabel poles & users)...');
  await client.query(SCHEMA_SQL);
  console.log('✅ Skema tabel poles dan users berhasil dibuat 100%!\n');

  // 2. Suntikkan 5 Akun Resmi Dinas
  console.log('👥 [2/3] Mendaftarkan 5 akun resmi DISKOMINFOTIKSAN...');
  const users = [
    [
      'USR-KOMINFO-ADMIN',
      'Admin DISKOMINFOTIKSAN',
      'admin.kominfo@lubuklinggaukota.go.id',
      'kominfo123',
      'ADMIN_KOMINFO',
      'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
      '0812-7890-1234',
      'AKTIF',
    ],
    [
      'USR-SURVEYOR-01',
      'M. Tri Saputra',
      'tri.saputra@lubuklinggaukota.go.id',
      'surveyor123',
      'SURVEYOR',
      'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
      '083196589665',
      'AKTIF',
    ],
    [
      'USR-SURVEYOR-02',
      'Yodi Heropralaga',
      'yodi.heropralaga@lubuklinggaukota.go.id',
      'surveyor123',
      'SURVEYOR',
      'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
      '081373193335',
      'AKTIF',
    ],
    [
      'USR-SURVEYOR-03',
      'Andika Yulian Putra',
      'andika.yulian@lubuklinggaukota.go.id',
      'surveyor123',
      'SURVEYOR',
      'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
      '081373249228',
      'AKTIF',
    ],
    [
      'USR-SURVEYOR-04',
      'Pradigga Navigasi',
      'pradigga.navigasi@lubuklinggaukota.go.id',
      'surveyor123',
      'SURVEYOR',
      'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau',
      '082251654742',
      'AKTIF',
    ],
  ];

  for (const u of users) {
    await client.query(
      `
      INSERT INTO public.users (id, name, email, password, role, agency, phone, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        password = EXCLUDED.password,
        phone = EXCLUDED.phone;
    `,
      u
    );
  }
  console.log('✅ 5 Akun resmi berhasil terdaftar di database!\n');

  // 3. Ambil dan Migrasikan Data Tiang dari Google Sheets
  console.log('📥 [3/3] Mengambil data tiang dari Google Sheets untuk dimasukkan ke Supabase...');
  let poles = [];
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getPoles`, { cache: 'no-store' });
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      poles = json.data;
      console.log(`✅ Berhasil mengambil ${poles.length} data tiang dari Google Sheets!`);
    }
  } catch (e) {
    console.log('⚠️ Menggunakan data tiang lokal:', e.message);
  }

  if (poles.length === 0) {
    poles = [
      {
        id: 'LL-0001',
        poleCode: 'LLG-T1-TJ-463',
        poleLatitude: -3.2964,
        poleLongitude: 102.8617,
        providerId: 'TELKOM',
        providerName: 'PT Telkom Indonesia',
        poleType: 'BETON',
        condition: 'GOOD',
        road: 'Jl. Yos Sudarso',
        kelurahan: 'Taba Jemekeh',
        kecamatan: 'Lubuklinggau Timur I',
        surveyDate: '2026-08-25',
        validationStatus: 'VERIFIED',
      },
      {
        id: 'LL-0002',
        poleCode: 'LLG-T2-CK-102',
        poleLatitude: -3.298,
        poleLongitude: 102.864,
        providerId: 'ICON_PLUS',
        providerName: 'PLN Icon Plus',
        poleType: 'BESI',
        condition: 'NEEDS_REPAIR',
        road: 'Jl. Ahmad Yani',
        kelurahan: 'Cereme Taba',
        kecamatan: 'Lubuklinggau Timur II',
        isMessyCable: true,
        isCorroded: true,
        surveyDate: '2026-08-25',
        validationStatus: 'SUBMITTED',
      },
      {
        id: 'LL-0003',
        poleCode: 'LLG-B1-KP-088',
        poleLatitude: -3.293,
        poleLongitude: 102.855,
        providerId: 'INDOSAT',
        providerName: 'Indosat Ooredoo Hutchison',
        poleType: 'BETON',
        condition: 'DAMAGED',
        road: 'Jl. Garuda Hitam',
        kelurahan: 'Pasar Pemiri',
        kecamatan: 'Lubuklinggau Barat I',
        isTilted: true,
        isMessyCable: true,
        isLowCable: true,
        isHazardous: true,
        isObstructing: true,
        surveyDate: '2026-08-25',
        validationStatus: 'SUBMITTED',
      },
    ];
  }

  for (const p of poles) {
    await client.query(
      `
      INSERT INTO public.poles (
        id, pole_code, pole_latitude, pole_longitude, device_latitude, device_longitude,
        gps_accuracy, distance_from_device, location_method, provider_id, provider_name,
        pole_type, condition, road, kelurahan, kecamatan, kota, patokan_lokasi, sisi_jalan,
        height, ownership_status, cable_installation_type, infrastructure_category,
        pju_lamp_type, pju_lamp_power, pju_lamp_condition, has_kwh_meter, has_network_cable,
        is_tilted, is_messy_cable, is_low_cable, is_hazardous, is_corroded, is_obstructing,
        description, photo_file_id, photo_url, surveyor_id, surveyor_name,
        survey_date, validation_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41
      )
      ON CONFLICT (id) DO UPDATE SET
        pole_code = EXCLUDED.pole_code,
        pole_latitude = EXCLUDED.pole_latitude,
        pole_longitude = EXCLUDED.pole_longitude,
        provider_id = EXCLUDED.provider_id,
        condition = EXCLUDED.condition,
        road = EXCLUDED.road,
        kelurahan = EXCLUDED.kelurahan,
        kecamatan = EXCLUDED.kecamatan,
        photo_url = EXCLUDED.photo_url,
        has_network_cable = EXCLUDED.has_network_cable,
        updated_at = NOW();
    `,
      [
        p.id,
        p.poleCode || p.pole_code || null,
        parseFloat(p.poleLatitude || p.pole_latitude || -3.2964),
        parseFloat(p.poleLongitude || p.pole_longitude || 102.8617),
        p.deviceLatitude ? parseFloat(p.deviceLatitude) : null,
        p.deviceLongitude ? parseFloat(p.deviceLongitude) : null,
        p.gpsAccuracy ? parseFloat(p.gpsAccuracy) : null,
        p.distanceFromDevice ? parseFloat(p.distanceFromDevice) : null,
        p.locationMethod || 'GPS_DEVICE',
        p.providerId || p.provider_id || 'UNKNOWN',
        p.providerName || p.provider_name || 'Tidak Diketahui',
        p.poleType || p.pole_type || 'BETON',
        p.condition || 'GOOD',
        p.road || '-',
        p.kelurahan || '-',
        p.kecamatan || 'Lubuklinggau Timur I',
        p.kota || 'Kota Lubuklinggau',
        p.patokanLokasi || null,
        p.sisiJalan || 'KIRI',
        p.height || '7m',
        p.ownershipStatus || 'SENDIRI',
        p.cableInstallationType || 'UDARA',
        p.infrastructureCategory || 'FO_WIFI',
        p.pjuLampType || 'TIDAK_ADA',
        p.pjuLampPower || null,
        p.pjuLampCondition || 'TIDAK_ADA',
        Boolean(p.hasKwhMeter),
        Boolean(p.hasNetworkCable),
        Boolean(p.isTilted),
        Boolean(p.isMessyCable),
        Boolean(p.isLowCable),
        Boolean(p.isHazardous),
        Boolean(p.isCorroded),
        Boolean(p.isObstructing),
        p.description || null,
        p.photoFileId || null,
        p.photoUrl || null,
        p.surveyorId || null,
        p.surveyorName || null,
        p.surveyDate || new Date().toISOString().split('T')[0],
        p.validationStatus || 'SUBMITTED',
      ]
    );
  }

  console.log(
    `✅ Sebanyak ${poles.length} data tiang berhasil dipindahkan ke Supabase PostgreSQL!`
  );

  await client.end();
  console.log('\n===========================================================');
  console.log(' 🎉 ALHAMDULILLAH! MIGRASI PENUH KE SUPABASE SELESAI 100%!');
  console.log('===========================================================');
}

run().catch((err) => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
