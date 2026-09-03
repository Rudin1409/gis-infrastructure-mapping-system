import pg from 'pg';
const { Client } = pg;

const DB_PASSWORD = process.env.DB_PASSWORD || 'CiflkG1Ndc7PrXUF';
const PROJECT_REF = process.env.PROJECT_REF || 'qdiswcejzxwrrbirzstv';

const config = {
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  user: `postgres.${PROJECT_REF}`,
  password: DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
};

const KECAMATAN_LUBUKLINGGAU = [
  {
    name: 'Lubuklinggau Timur I',
    kelurahan: [
      'Air Kuti', 'Batu Urip Taba', 'Majapahit', 'Nikan Jaya', 'Taba Jemekeh', 'Taba Koji', 'Taba Lestari', 'Watervang',
    ],
  },
  {
    name: 'Lubuklinggau Timur II',
    kelurahan: [
      'Cereme Taba', 'Dempo', 'Jawa Kanan', 'Jawa Kiri', 'Karya Bakti', 'Mesat Jaya', 'Mesat Seni', 'Wira Karya', 'Zellaz',
    ],
  },
  {
    name: 'Lubuklinggau Barat I',
    kelurahan: [
      'Bandung Kiri', 'Bandung Ujung', 'Kayu Ara', 'Lubuk Aman', 'Lubuk Tanjung', 'Pelita Jaya', 'Pematang Wangi', 'Sukajadi', 'Tanjung Aman', 'Tanjung Indah', 'Watas Lubuk Durian',
    ],
  },
  {
    name: 'Lubuklinggau Barat II',
    kelurahan: [
      'Keputraan', 'Lubuklinggau Ilir', 'Lubuklinggau Ulu', 'Pasar Permiri', 'Sidorejo', 'Tapak Lebar', 'Ulak Lebar', 'Wisma Karya',
    ],
  },
  {
    name: 'Lubuklinggau Selatan I',
    kelurahan: [
      'Air Kati', 'Air Temam', 'Bakti Karya', 'Jukung', 'Kelingi', 'Lubuk Binjai', 'Lubuk Kupang', 'Perumnas Rahmah', 'Rahmah',
    ],
  },
  {
    name: 'Lubuklinggau Selatan II',
    kelurahan: [
      'Batu Urip', 'Karang Ketuan', 'Marga Mulya', 'Marga Rahayu', 'Moneng Sepati', 'Simpang Periuk', 'Siring Agung', 'Tabarenah', 'Tanah Periuk',
    ],
  },
  {
    name: 'Lubuklinggau Utara I',
    kelurahan: [
      'Belalau I', 'Belalau II', 'Durian Rampak', 'Margasari', 'Petanang Ilir', 'Petanang Ulu', 'Sumber Agung', 'Tanjung Raya', 'Taba Baru',
    ],
  },
  {
    name: 'Lubuklinggau Utara II',
    kelurahan: [
      'Batu Febri', 'Kenanga', 'Megang', 'Pasar Satelit', 'Ponorogo', 'Puncak Kemuning', 'Senalang', 'Sumberejo', 'Ulaksurung',
    ],
  },
];

async function run() {
  const client = new Client(config);
  await client.connect();

  console.log('🧹 Membersihkan tabel subdistricts...');
  await client.query('TRUNCATE TABLE subdistricts');

  console.log('🌱 Menyuntikkan tepat 72 kelurahan standar resmi...');
  let total = 0;
  for (let kIdx = 0; kIdx < KECAMATAN_LUBUKLINGGAU.length; kIdx++) {
    const kec = KECAMATAN_LUBUKLINGGAU[kIdx];
    const kecCode = ['T1', 'T2', 'B1', 'B2', 'S1', 'S2', 'U1', 'U2'][kIdx];

    for (let i = 0; i < kec.kelurahan.length; i++) {
      const kel = kec.kelurahan[i];
      const kelCode = kel
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3);
      const id = `KEL-${kecCode}-${String(i + 1).padStart(2, '0')}`;

      await client.query(
        'INSERT INTO subdistricts (id, name, kecamatan, code, order_index) VALUES ($1, $2, $3, $4, $5)',
        [id, kel, kec.name, kelCode, i + 1]
      );
      total++;
    }
  }

  const { rows } = await client.query('SELECT count(*) as total, count(DISTINCT kecamatan) as total_kec FROM subdistricts');
  console.log(`✅ Sukses! Tepat ${rows[0].total} kelurahan di ${rows[0].total_kec} kecamatan terdaftar.`);

  await client.end();
}

run();
