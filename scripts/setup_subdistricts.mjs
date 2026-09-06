import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const KECAMATAN_LUBUKLINGGAU = [
  {
    name: 'Lubuklinggau Timur I',
    kelurahan: [
      'Air Kuti',
      'Batu Urip Taba',
      'Majapahit',
      'Nikan Jaya',
      'Taba Jemekeh',
      'Taba Koji',
      'Taba Lestari',
      'Watervang',
    ],
  },
  {
    name: 'Lubuklinggau Timur II',
    kelurahan: [
      'Cereme Taba',
      'Dempo',
      'Jawa Kanan',
      'Jawa Kiri',
      'Karya Bakti',
      'Mesat Jaya',
      'Mesat Seni',
      'Wira Karya',
      'Zellaz',
    ],
  },
  {
    name: 'Lubuklinggau Barat I',
    kelurahan: [
      'Bandung Kiri',
      'Bandung Ujung',
      'Kayu Ara',
      'Lubuk Aman',
      'Lubuk Tanjung',
      'Pelita Jaya',
      'Pematang Wangi',
      'Sukajadi',
      'Tanjung Aman',
      'Tanjung Indah',
      'Watas Lubuk Durian',
    ],
  },
  {
    name: 'Lubuklinggau Barat II',
    kelurahan: [
      'Keputraan',
      'Lubuklinggau Ilir',
      'Lubuklinggau Ulu',
      'Pasar Permiri',
      'Sidorejo',
      'Tapak Lebar',
      'Ulak Lebar',
      'Wisma Karya',
    ],
  },
  {
    name: 'Lubuklinggau Selatan I',
    kelurahan: [
      'Air Kati',
      'Air Temam',
      'Bakti Karya',
      'Jukung',
      'Kelingi',
      'Lubuk Binjai',
      'Lubuk Kupang',
      'Perumnas Rahmah',
      'Rahmah',
    ],
  },
  {
    name: 'Lubuklinggau Selatan II',
    kelurahan: [
      'Batu Urip',
      'Karang Ketuan',
      'Marga Mulya',
      'Marga Rahayu',
      'Moneng Sepati',
      'Simpang Periuk',
      'Siring Agung',
      'Tabarenah',
      'Tanah Periuk',
    ],
  },
  {
    name: 'Lubuklinggau Utara I',
    kelurahan: [
      'Belalau I',
      'Belalau II',
      'Durian Rampak',
      'Margasari',
      'Petanang Ilir',
      'Petanang Ulu',
      'Sumber Agung',
      'Tanjung Raya',
      'Taba Baru',
    ],
  },
  {
    name: 'Lubuklinggau Utara II',
    kelurahan: [
      'Batu Febri',
      'Kenanga',
      'Megang',
      'Pasar Satelit',
      'Ponorogo',
      'Puncak Kemuning',
      'Senalang',
      'Sumberejo',
      'Ulaksurung',
    ],
  },
];

async function run() {
  console.log('🌱 Menyiapkan tabel dan data kelurahan (subdistricts)...');

  let index = 1;
  const rows = [];
  for (const kec of KECAMATAN_LUBUKLINGGAU) {
    for (let i = 0; i < kec.kelurahan.length; i++) {
      const kel = kec.kelurahan[i];
      const code = kel
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 3);

      rows.push({
        id: `KEL-DEF-${String(index).padStart(3, '0')}`,
        name: kel,
        kecamatan: kec.name,
        code,
        order_index: i + 1,
      });
      index++;
    }
  }

  console.log(`Menyuntikkan ${rows.length} kelurahan ke Supabase...`);
  const { data, error } = await supabase.from('subdistricts').upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('❌ Gagal seed subdistricts:', error.message);
  } else {
    console.log(`✅ BERHASIL SEED ${rows.length} KELURAHAN KE SUPABASE!`);
  }
}

run();
