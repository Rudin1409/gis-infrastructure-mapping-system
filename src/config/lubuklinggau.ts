export interface KecamatanInfo {
  name: string;
  kelurahan: string[];
}

export const LUBUKLINGGAU_CENTER = {
  lat: -3.296075,
  lng: 102.861542,
  zoom: 14,
};

export const LUBUKLINGGAU_BOUNDS = {
  minLat: -3.4000,
  maxLat: -3.2000,
  minLng: 102.7500,
  maxLng: 102.9800,
};

export const KECAMATAN_LUBUKLINGGAU: KecamatanInfo[] = [
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
