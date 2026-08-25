import { Coordinates } from '@/types/gis';

export interface AdministrativeBoundary {
  id: string;
  name: string;
  type: 'KELURAHAN' | 'KECAMATAN';
  kecamatanName: string;
  color: string;
  center: Coordinates;
  polygon: [number, number][];
}

// Batas Wilayah Tingkat Kelurahan & Desa Kota Lubuklinggau (Calibrated to Real Coordinates)
export const LUBUKLINGGAU_KELURAHAN_BOUNDARIES: AdministrativeBoundary[] = [
  // --- Lubuklinggau Timur I ---
  {
    id: 'KEL_MAJAPAHIT',
    name: 'Kel. Majapahit',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Timur I',
    color: '#1d4ed8', // Royal Blue
    center: { lat: -3.2765, lng: 102.9090 },
    polygon: [
      [-3.2700, 102.9000],
      [-3.2670, 102.9180],
      [-3.2840, 102.9200],
      [-3.2860, 102.9010],
      [-3.2700, 102.9000],
    ],
  },
  {
    id: 'KEL_TABA_JEMEKEH',
    name: 'Kel. Taba Jemekeh',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Timur I',
    color: '#3b82f6', // Biru
    center: { lat: -3.2750, lng: 102.8890 },
    polygon: [
      [-3.2680, 102.8800],
      [-3.2660, 102.9000],
      [-3.2840, 102.9000],
      [-3.2860, 102.8820],
      [-3.2680, 102.8800],
    ],
  },
  {
    id: 'KEL_WATERVANG',
    name: 'Kel. Watervang',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Timur I',
    color: '#0284c7', // Sky Blue
    center: { lat: -3.2880, lng: 102.8850 },
    polygon: [
      [-3.2840, 102.8750],
      [-3.2820, 102.8980],
      [-3.2980, 102.8990],
      [-3.2990, 102.8760],
      [-3.2840, 102.8750],
    ],
  },
  {
    id: 'KEL_AIR_KUTI',
    name: 'Kel. Air Kuti',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Timur I',
    color: '#2563eb',
    center: { lat: -3.2980, lng: 102.9050 },
    polygon: [
      [-3.2850, 102.8980],
      [-3.2820, 102.9220],
      [-3.3080, 102.9240],
      [-3.3100, 102.9000],
      [-3.2850, 102.8980],
    ],
  },

  // --- Lubuklinggau Timur II ---
  {
    id: 'KEL_CEREME_TABA',
    name: 'Kel. Cereme Taba',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Timur II',
    color: '#06b6d4', // Cyan
    center: { lat: -3.3020, lng: 102.8820 },
    polygon: [
      [-3.2940, 102.8700],
      [-3.2920, 102.8940],
      [-3.3120, 102.8960],
      [-3.3150, 102.8730],
      [-3.2940, 102.8700],
    ],
  },
  {
    id: 'KEL_JAWA_KANAN',
    name: 'Kel. Jawa Kanan',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Timur II',
    color: '#0891b2',
    center: { lat: -3.3080, lng: 102.8720 },
    polygon: [
      [-3.3000, 102.8620],
      [-3.2980, 102.8800],
      [-3.3180, 102.8820],
      [-3.3200, 102.8640],
      [-3.3000, 102.8620],
    ],
  },
  {
    id: 'KEL_DEMPO',
    name: 'Kel. Dempo',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Timur II',
    color: '#0e7490',
    center: { lat: -3.3180, lng: 102.8880 },
    polygon: [
      [-3.3100, 102.8750],
      [-3.3080, 102.9050],
      [-3.3320, 102.9080],
      [-3.3350, 102.8780],
      [-3.3100, 102.8750],
    ],
  },

  // --- Lubuklinggau Barat I & II ---
  {
    id: 'KEL_SUKAJADI',
    name: 'Kel. Sukajadi',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Barat I',
    color: '#8b5cf6', // Violet
    center: { lat: -3.2880, lng: 102.8420 },
    polygon: [
      [-3.2780, 102.8300],
      [-3.2760, 102.8550],
      [-3.2980, 102.8530],
      [-3.3000, 102.8280],
      [-3.2780, 102.8300],
    ],
  },
  {
    id: 'KEL_PELITA_JAYA',
    name: 'Kel. Pelita Jaya',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Barat I',
    color: '#7c3aed',
    center: { lat: -3.2980, lng: 102.8480 },
    polygon: [
      [-3.2900, 102.8350],
      [-3.2880, 102.8600],
      [-3.3100, 102.8580],
      [-3.3120, 102.8330],
      [-3.2900, 102.8350],
    ],
  },
  {
    id: 'KEL_PASAR_PEMIRI',
    name: 'Kel. Pasar Pemiri',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Barat II',
    color: '#ec4899', // Pink
    center: { lat: -3.3050, lng: 102.8550 },
    polygon: [
      [-3.2980, 102.8450],
      [-3.2960, 102.8680],
      [-3.3180, 102.8660],
      [-3.3200, 102.8430],
      [-3.2980, 102.8450],
    ],
  },

  // --- Lubuklinggau Utara I & II ---
  {
    id: 'KEL_KENANGA',
    name: 'Kel. Kenanga',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Utara II',
    color: '#10b981', // Emerald
    center: { lat: -3.2680, lng: 102.8820 },
    polygon: [
      [-3.2550, 102.8700],
      [-3.2520, 102.8980],
      [-3.2750, 102.9000],
      [-3.2780, 102.8720],
      [-3.2550, 102.8700],
    ],
  },
  {
    id: 'KEL_BATU_URIP',
    name: 'Kel. Batu Urip',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Utara II',
    color: '#059669',
    center: { lat: -3.2580, lng: 102.8620 },
    polygon: [
      [-3.2450, 102.8480],
      [-3.2420, 102.8750],
      [-3.2680, 102.8760],
      [-3.2700, 102.8500],
      [-3.2450, 102.8480],
    ],
  },
  {
    id: 'KEL_PETANANG',
    name: 'Kel. Petanang Ilir',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Utara I',
    color: '#14b8a6', // Teal
    center: { lat: -3.2380, lng: 102.8750 },
    polygon: [
      [-3.2200, 102.8550],
      [-3.2180, 102.8950],
      [-3.2520, 102.8920],
      [-3.2540, 102.8530],
      [-3.2200, 102.8550],
    ],
  },

  // --- Lubuklinggau Selatan I & II ---
  {
    id: 'KEL_SIMPANG_PERIUK',
    name: 'Kel. Simpang Periuk',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Selatan I',
    color: '#f59e0b', // Amber
    center: { lat: -3.3320, lng: 102.8750 },
    polygon: [
      [-3.3200, 102.8600],
      [-3.3180, 102.8900],
      [-3.3450, 102.8920],
      [-3.3480, 102.8630],
      [-3.3200, 102.8600],
    ],
  },
  {
    id: 'KEL_MARGA_MULYA',
    name: 'Kel. Marga Mulya',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Selatan II',
    color: '#f97316', // Orange
    center: { lat: -3.3420, lng: 102.8880 },
    polygon: [
      [-3.3280, 102.8750],
      [-3.3250, 102.9100],
      [-3.3600, 102.9120],
      [-3.3620, 102.8780],
      [-3.3280, 102.8750],
    ],
  },
  {
    id: 'KEL_TANAH_PERIUK',
    name: 'Kel. Tanah Periuk',
    type: 'KELURAHAN',
    kecamatanName: 'Lubuklinggau Selatan II',
    color: '#ea580c',
    center: { lat: -3.3550, lng: 102.9020 },
    polygon: [
      [-3.3400, 102.8880],
      [-3.3380, 102.9250],
      [-3.3750, 102.9280],
      [-3.3780, 102.8900],
      [-3.3400, 102.8880],
    ],
  },
];

// Alias for backward compatibility
export const LUBUKLINGGAU_DISTRICT_BOUNDARIES = LUBUKLINGGAU_KELURAHAN_BOUNDARIES;
