import { Coordinates } from '@/types/gis';
import { KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';
import { LUBUKLINGGAU_KECAMATAN_BOUNDARIES } from './boundaries';
import { calculateHaversineDistance } from './haversine';

export interface GeocodedAddress {
  road: string;
  kelurahan: string;
  kecamatan: string;
  patokanLokasi?: string;
  smartPoleCode: string;
  smartSegmentCode: string;
  rawDisplayName?: string;
  confidence: 'HIGH_SPATIAL' | 'GEOMETRIC_NEAREST' | 'FALLBACK';
}

export interface KelurahanCentroid {
  name: string;
  kecamatan: string;
  center: Coordinates;
}

/**
 * 72 Titik Pusat Spasial (Centroids) Kelurahan Resmi Kota Lubuklinggau
 * Digunakan untuk klasifikasi titik spasial presisi tinggi saat penempatan tiang GIS.
 */
export const LUBUKLINGGAU_KELURAHAN_CENTROIDS: KelurahanCentroid[] = [
  // 1. Lubuklinggau Timur I (8 Kelurahan)
  { name: 'Air Kuti', kecamatan: 'Lubuklinggau Timur I', center: { lat: -3.2755, lng: 102.8790 } },
  { name: 'Batu Urip Taba', kecamatan: 'Lubuklinggau Timur I', center: { lat: -3.2820, lng: 102.8710 } },
  { name: 'Majapahit', kecamatan: 'Lubuklinggau Timur I', center: { lat: -3.2920, lng: 102.8680 } },
  { name: 'Nikan Jaya', kecamatan: 'Lubuklinggau Timur I', center: { lat: -3.2790, lng: 102.8850 } },
  { name: 'Taba Jemekeh', kecamatan: 'Lubuklinggau Timur I', center: { lat: -3.2964, lng: 102.8617 } },
  { name: 'Taba Koji', kecamatan: 'Lubuklinggau Timur I', center: { lat: -3.2990, lng: 102.8590 } },
  { name: 'Taba Lestari', kecamatan: 'Lubuklinggau Timur I', center: { lat: -3.2860, lng: 102.8640 } },
  { name: 'Watervang', kecamatan: 'Lubuklinggau Timur I', center: { lat: -3.2847, lng: 102.8805 } },

  // 2. Lubuklinggau Timur II (9 Kelurahan)
  { name: 'Cereme Taba', kecamatan: 'Lubuklinggau Timur II', center: { lat: -3.2980, lng: 102.8640 } },
  { name: 'Dempo', kecamatan: 'Lubuklinggau Timur II', center: { lat: -3.3020, lng: 102.8630 } },
  { name: 'Jawa Kanan', kecamatan: 'Lubuklinggau Timur II', center: { lat: -3.2985, lng: 102.8570 } },
  { name: 'Jawa Kiri', kecamatan: 'Lubuklinggau Timur II', center: { lat: -3.2995, lng: 102.8560 } },
  { name: 'Karya Bakti', kecamatan: 'Lubuklinggau Timur II', center: { lat: -3.3040, lng: 102.8600 } },
  { name: 'Mesat Jaya', kecamatan: 'Lubuklinggau Timur II', center: { lat: -3.3080, lng: 102.8640 } },
  { name: 'Mesat Seni', kecamatan: 'Lubuklinggau Timur II', center: { lat: -3.3110, lng: 102.8660 } },
  { name: 'Wira Karya', kecamatan: 'Lubuklinggau Timur II', center: { lat: -3.3010, lng: 102.8590 } },
  { name: 'Zellaz', kecamatan: 'Lubuklinggau Timur II', center: { lat: -3.3060, lng: 102.8580 } },

  // 3. Lubuklinggau Barat I (11 Kelurahan)
  { name: 'Bandung Kiri', kecamatan: 'Lubuklinggau Barat I', center: { lat: -3.2960, lng: 102.8460 } },
  { name: 'Bandung Ujung', kecamatan: 'Lubuklinggau Barat I', center: { lat: -3.2930, lng: 102.8420 } },
  { name: 'Kayu Ara', kecamatan: 'Lubuklinggau Barat I', center: { lat: -3.3020, lng: 102.8360 } },
  { name: 'Lubuk Aman', kecamatan: 'Lubuklinggau Barat I', center: { lat: -3.2990, lng: 102.8410 } },
  { name: 'Lubuk Tanjung', kecamatan: 'Lubuklinggau Barat I', center: { lat: -3.3110, lng: 102.8300 } },
  { name: 'Muara Enim', kecamatan: 'Lubuklinggau Barat I', center: { lat: -3.2920, lng: 102.8380 } },
  { name: 'Pelita Jaya', kecamatan: 'Lubuklinggau Barat I', center: { lat: -3.2890, lng: 102.8490 } },
  { name: 'Sukajadi', kecamatan: 'Lubuklinggau Barat I', center: { lat: -3.3080, lng: 102.8420 } },
  { name: 'Tanjung Aman', kecamatan: 'Lubuklinggau Barat I', center: { lat: -3.3020, lng: 102.8480 } },
  { name: 'Tanjung Indah', kecamatan: 'Lubuklinggau Barat I', center: { lat: -3.2970, lng: 102.8500 } },
  { name: 'Watas Lubuk Durian', kecamatan: 'Lubuklinggau Barat I', center: { lat: -3.3150, lng: 102.7850 } },

  // 4. Lubuklinggau Barat II (8 Kelurahan)
  { name: 'Keputraan', kecamatan: 'Lubuklinggau Barat II', center: { lat: -3.2930, lng: 102.8560 } },
  { name: 'Lubuklinggau Ilir', kecamatan: 'Lubuklinggau Barat II', center: { lat: -3.2910, lng: 102.8540 } },
  { name: 'Lubuklinggau Ulu', kecamatan: 'Lubuklinggau Barat II', center: { lat: -3.2880, lng: 102.8520 } },
  { name: 'Pasar Permiri', kecamatan: 'Lubuklinggau Barat II', center: { lat: -3.2955, lng: 102.8545 } },
  { name: 'Sidorejo', kecamatan: 'Lubuklinggau Barat II', center: { lat: -3.2970, lng: 102.8510 } },
  { name: 'Tapak Lebar', kecamatan: 'Lubuklinggau Barat II', center: { lat: -3.2940, lng: 102.8490 } },
  { name: 'Ulak Lebar', kecamatan: 'Lubuklinggau Barat II', center: { lat: -3.2860, lng: 102.8460 } },
  { name: 'Wisma Karya', kecamatan: 'Lubuklinggau Barat II', center: { lat: -3.2985, lng: 102.8525 } },

  // 5. Lubuklinggau Selatan I (9 Kelurahan)
  { name: 'Air Kati', kecamatan: 'Lubuklinggau Selatan I', center: { lat: -3.3680, lng: 102.8300 } },
  { name: 'Air Temam', kecamatan: 'Lubuklinggau Selatan I', center: { lat: -3.3480, lng: 102.8380 } },
  { name: 'Bakti Karya', kecamatan: 'Lubuklinggau Selatan I', center: { lat: -3.3520, lng: 102.8450 } },
  { name: 'Jukung', kecamatan: 'Lubuklinggau Selatan I', center: { lat: -3.3600, lng: 102.8520 } },
  { name: 'Kelingi', kecamatan: 'Lubuklinggau Selatan I', center: { lat: -3.3420, lng: 102.8310 } },
  { name: 'Lubuk Binjai', kecamatan: 'Lubuklinggau Selatan I', center: { lat: -3.3750, lng: 102.8220 } },
  { name: 'Lubuk Kupang', kecamatan: 'Lubuklinggau Selatan I', center: { lat: -3.3380, lng: 102.8480 } },
  { name: 'Perumnas Rahmah', kecamatan: 'Lubuklinggau Selatan I', center: { lat: -3.3590, lng: 102.8390 } },
  { name: 'Rahmah', kecamatan: 'Lubuklinggau Selatan I', center: { lat: -3.3650, lng: 102.8350 } },

  // 6. Lubuklinggau Selatan II (9 Kelurahan)
  { name: 'Batu Urip', kecamatan: 'Lubuklinggau Selatan II', center: { lat: -3.3180, lng: 102.8720 } },
  { name: 'Karang Ketuan', kecamatan: 'Lubuklinggau Selatan II', center: { lat: -3.3350, lng: 102.8650 } },
  { name: 'Marga Mulya', kecamatan: 'Lubuklinggau Selatan II', center: { lat: -3.3190, lng: 102.8620 } },
  { name: 'Marga Rahayu', kecamatan: 'Lubuklinggau Selatan II', center: { lat: -3.3240, lng: 102.8640 } },
  { name: 'Moneng Sepati', kecamatan: 'Lubuklinggau Selatan II', center: { lat: -3.3150, lng: 102.8600 } },
  { name: 'Simpang Periuk', kecamatan: 'Lubuklinggau Selatan II', center: { lat: -3.3282, lng: 102.8710 } },
  { name: 'Siring Agung', kecamatan: 'Lubuklinggau Selatan II', center: { lat: -3.3380, lng: 102.8780 } },
  { name: 'Tabarenah', kecamatan: 'Lubuklinggau Selatan II', center: { lat: -3.3220, lng: 102.8850 } },
  { name: 'Tanah Periuk', kecamatan: 'Lubuklinggau Selatan II', center: { lat: -3.3320, lng: 102.8820 } },

  // 7. Lubuklinggau Utara I (9 Kelurahan)
  { name: 'Belalau I', kecamatan: 'Lubuklinggau Utara I', center: { lat: -3.2350, lng: 102.8720 } },
  { name: 'Belalau II', kecamatan: 'Lubuklinggau Utara I', center: { lat: -3.2280, lng: 102.8680 } },
  { name: 'Durian Rampak', kecamatan: 'Lubuklinggau Utara I', center: { lat: -3.2510, lng: 102.8790 } },
  { name: 'Margasari', kecamatan: 'Lubuklinggau Utara I', center: { lat: -3.2100, lng: 102.8850 } },
  { name: 'Petanang Ilir', kecamatan: 'Lubuklinggau Utara I', center: { lat: -3.2400, lng: 102.8950 } },
  { name: 'Petanang Ulu', kecamatan: 'Lubuklinggau Utara I', center: { lat: -3.2450, lng: 102.8900 } },
  { name: 'Sumber Agung', kecamatan: 'Lubuklinggau Utara I', center: { lat: -3.2180, lng: 102.8920 } },
  { name: 'Tanjung Raya', kecamatan: 'Lubuklinggau Utara I', center: { lat: -3.2550, lng: 102.8820 } },
  { name: 'Taba Baru', kecamatan: 'Lubuklinggau Utara I', center: { lat: -3.2480, lng: 102.8740 } },

  // 8. Lubuklinggau Utara II (9 Kelurahan)
  { name: 'Batu Febri', kecamatan: 'Lubuklinggau Utara II', center: { lat: -3.2800, lng: 102.8520 } },
  { name: 'Kenanga', kecamatan: 'Lubuklinggau Utara II', center: { lat: -3.2750, lng: 102.8550 } },
  { name: 'Megang', kecamatan: 'Lubuklinggau Utara II', center: { lat: -3.2820, lng: 102.8610 } },
  { name: 'Pasar Satelit', kecamatan: 'Lubuklinggau Utara II', center: { lat: -3.2780, lng: 102.8650 } },
  { name: 'Ponorogo', kecamatan: 'Lubuklinggau Utara II', center: { lat: -3.2710, lng: 102.8580 } },
  { name: 'Puncak Kemuning', kecamatan: 'Lubuklinggau Utara II', center: { lat: -3.2680, lng: 102.8630 } },
  { name: 'Senalang', kecamatan: 'Lubuklinggau Utara II', center: { lat: -3.2730, lng: 102.8680 } },
  { name: 'Sumberejo', kecamatan: 'Lubuklinggau Utara II', center: { lat: -3.2640, lng: 102.8550 } },
  { name: 'Ulaksurung', kecamatan: 'Lubuklinggau Utara II', center: { lat: -3.2840, lng: 102.8530 } },
];

// Ray-Casting algorithm for Spatial Point-in-Polygon (PIP)
export function isPointInPolygon(point: Coordinates, polygon: [number, number][]): boolean {
  const x = point.lat;
  const y = point.lng;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Generate standard acronym code for Kecamatan (e.g. Lubuklinggau Timur I -> T1)
export function getKecamatanCode(kecName: string): string {
  if (kecName.includes('Timur I') || kecName.includes('Timur 1')) return 'T1';
  if (kecName.includes('Timur II') || kecName.includes('Timur 2')) return 'T2';
  if (kecName.includes('Barat I') || kecName.includes('Barat 1')) return 'B1';
  if (kecName.includes('Barat II') || kecName.includes('Barat 2')) return 'B2';
  if (kecName.includes('Selatan I') || kecName.includes('Selatan 1')) return 'S1';
  if (kecName.includes('Selatan II') || kecName.includes('Selatan 2')) return 'S2';
  if (kecName.includes('Utara I') || kecName.includes('Utara 1')) return 'U1';
  if (kecName.includes('Utara II') || kecName.includes('Utara 2')) return 'U2';
  return 'LLG';
}

// Generate standard acronym code for Kelurahan (e.g. Taba Jemekeh -> TJ, Majapahit -> MP, Bandung Kiri -> BK)
export function getKelurahanCode(kelName: string): string {
  const clean = kelName.replace(/^Kel\.\s*/i, '').trim();
  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
}

/**
 * Generate sequential, structured asset code (e.g. LLG-T1-TJ-001, LLG-T1-TJ-002)
 * based on highest existing number in the database / session counter.
 */
export function getNextSequentialPoleCode(
  kecName: string,
  kelName: string,
  existingCodes: string[] = []
): { smartPoleCode: string; smartSegmentCode: string; nextNumber: number } {
  const kecCode = getKecamatanCode(kecName);
  const kelCode = getKelurahanCode(kelName);
  const prefix = `LLG-${kecCode}-${kelCode}-`;

  let maxSeq = 0;
  for (const code of existingCodes) {
    if (code && code.startsWith(prefix)) {
      const numPart = code.slice(prefix.length);
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  // Also check local session memory for sequential field surveying
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`gis_last_seq_${kecCode}_${kelCode}`);
      if (stored) {
        const storedNum = parseInt(stored, 10);
        if (!isNaN(storedNum) && storedNum > maxSeq) {
          maxSeq = storedNum;
        }
      }
    } catch {}
  }

  const nextNumber = maxSeq + 1;
  const formattedNumber = String(nextNumber).padStart(3, '0');

  const smartPoleCode = `${prefix}${formattedNumber}`;
  const smartSegmentCode = `SEG-${kecCode}-${kelCode}-${formattedNumber}`;

  return {
    smartPoleCode,
    smartSegmentCode,
    nextNumber,
  };
}

/**
 * Clean & format Indonesian road names (e.g. 'Jalan Yos Sudarso' -> 'Jl. Yos Sudarso')
 */
export function formatRoadName(rawName: string): string {
  if (!rawName) return '';
  let cleaned = rawName.trim();
  cleaned = cleaned.replace(/^jalan\s+/i, 'Jl. ');
  cleaned = cleaned.replace(/^gang\s+/i, 'Gg. ');
  cleaned = cleaned.replace(/^lorong\s+/i, 'Lr. ');
  if (!cleaned.startsWith('Jl.') && !cleaned.startsWith('Gg.') && !cleaned.startsWith('Lr.') && !cleaned.startsWith('Komp.')) {
    cleaned = `Jl. ${cleaned}`;
  }
  return cleaned;
}

export interface RoadCorridor {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  kecamatan?: string;
}

export const LUBUKLINGGAU_MAJOR_ROAD_CORRIDORS: RoadCorridor[] = [
  {
    name: 'Jl. Garuda',
    minLat: -3.336,
    maxLat: -3.314,
    minLng: 102.821,
    maxLng: 102.849,
    kecamatan: 'Lubuklinggau Barat I',
  },
  {
    name: 'Jl. Jend. Pol. Moch Hasan',
    minLat: -3.336,
    maxLat: -3.308,
    minLng: 102.822,
    maxLng: 102.868,
    kecamatan: 'Lubuklinggau Barat I',
  },
  {
    name: 'Jl. Dayang Torek',
    minLat: -3.316,
    maxLat: -3.303,
    minLng: 102.833,
    maxLng: 102.842,
    kecamatan: 'Lubuklinggau Barat I',
  },
  {
    name: 'Jl. Letkol Sukirno',
    minLat: -3.285,
    maxLat: -3.269,
    minLng: 102.910,
    maxLng: 102.916,
    kecamatan: 'Lubuklinggau Timur I',
  },
  {
    name: 'Jl. Fatmawati Soekarno',
    minLat: -3.310,
    maxLat: -3.285,
    minLng: 102.866,
    maxLng: 102.908,
  },
  {
    name: 'Jl. Yos Sudarso',
    minLat: -3.302,
    maxLat: -3.268,
    minLng: 102.854,
    maxLng: 102.919,
    kecamatan: 'Lubuklinggau Timur I',
  },
  {
    name: 'Jl. Ahmad Yani',
    minLat: -3.286,
    maxLat: -3.260,
    minLng: 102.850,
    maxLng: 102.868,
    kecamatan: 'Lubuklinggau Utara II',
  },
];

/**
 * Universal High-Precision Reverse Geocoding Engine for Kota Lubuklinggau.
 * 1. Ray-Casting Point-in-Polygon (PIP) on Official 8 Kecamatan Polygons (2,127+ points).
 * 2. High-Precision Spatial Centroid Resolution across all 72 Official Kelurahan.
 * 3. Street name, POI, landmark, and building extraction via OpenStreetMap.
 */
export async function reverseGeocodeLocation(
  coord: Coordinates,
  existingCodes: string[] = []
): Promise<GeocodedAddress> {
  // 1. Tentukan Kecamatan Resmi via Point-in-Polygon
  let detectedKecamatan = '';
  let confidence: 'HIGH_SPATIAL' | 'GEOMETRIC_NEAREST' | 'FALLBACK' = 'FALLBACK';

  for (const boundary of LUBUKLINGGAU_KECAMATAN_BOUNDARIES) {
    if (isPointInPolygon(coord, boundary.polygon)) {
      detectedKecamatan = boundary.kecamatanName;
      confidence = 'HIGH_SPATIAL';
      break;
    }
  }

  // Jika di luar polygon kecamatan persis, cari kecamatan terdekat
  if (!detectedKecamatan) {
    let closestDist = Infinity;
    let closestKec = LUBUKLINGGAU_KECAMATAN_BOUNDARIES[0].kecamatanName;

    for (const boundary of LUBUKLINGGAU_KECAMATAN_BOUNDARIES) {
      const dist = calculateHaversineDistance(coord, boundary.center);
      if (dist < closestDist) {
        closestDist = dist;
        closestKec = boundary.kecamatanName;
      }
    }
    detectedKecamatan = closestKec;
    confidence = 'GEOMETRIC_NEAREST';
  }

  // 2. Tentukan Kelurahan Terdekat Spasial (dibatasi strictly dalam kecamatan yang terdeteksi)
  const candidateKelurahans = LUBUKLINGGAU_KELURAHAN_CENTROIDS.filter(
    (k) => k.kecamatan.toLowerCase() === detectedKecamatan.toLowerCase()
  );

  let detectedKelurahan = candidateKelurahans[0]?.name || 'Air Kuti';
  let minKelDist = Infinity;

  for (const kel of candidateKelurahans) {
    const dist = calculateHaversineDistance(coord, kel.center);
    if (dist < minKelDist) {
      minKelDist = dist;
      detectedKelurahan = kel.name;
    }
  }

  // 3. Ambil data jalan & POI/patokan dari OpenStreetMap
  let detectedRoad = '';
  let patokanLokasi = '';
  let rawDisplayName = '';

  try {
    let osmData: any = null;

    // A. Coba panggil server proxy API internal terlebih dahulu (cepat & ada cache)
    if (typeof window !== 'undefined') {
      try {
        const proxyRes = await fetch(`/api/gis/reverse-geocode?lat=${coord.lat}&lng=${coord.lng}`);
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          if (json.success && json.data) {
            osmData = json.data;
          }
        }
      } catch {}
    }

    // B. Fallback langsung ke Nominatim jika server proxy tidak tersedia
    if (!osmData) {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coord.lat}&lon=${coord.lng}&zoom=19&addressdetails=1&extratags=1&namedetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'InfraMap-Lubuklinggau-GIS/2.0 (admin@lubuklinggaukota.go.id)',
          'Accept-Language': 'id,en',
        },
      });
      if (response.ok) {
        osmData = await response.json();
      }
    }

    if (osmData) {
      rawDisplayName = osmData.display_name || '';
      const addr = osmData.address || {};
      const extra = osmData.extratags || {};

      // Ekstrak nama jalan mikro
      const roadCandidate =
        addr.road ||
        addr.pedestrian ||
        addr.residential ||
        addr.footway ||
        addr.path ||
        addr.highway ||
        addr.service ||
        addr.living_street ||
        addr.neighbourhood;

      if (roadCandidate) {
        detectedRoad = formatRoadName(roadCandidate);
      }

      // Ekstrak patokan lokasi / landmark POI
      const poiCandidate =
        addr.amenity ||
        addr.building ||
        addr.shop ||
        addr.tourism ||
        addr.office ||
        addr.place ||
        extra.brand ||
        extra.operator;

      if (poiCandidate) {
        patokanLokasi = `Dekat ${poiCandidate}`;
      } else if (addr.house_number) {
        patokanLokasi = `No. ${addr.house_number}`;
      }

      // Cek apakah OSM mengandung nama kelurahan resmi Lubuklinggau
      const fullText = (rawDisplayName + ' ' + (addr.village || '') + ' ' + (addr.suburb || '') + ' ' + (addr.quarter || '')).toLowerCase();

      for (const kel of candidateKelurahans) {
        const kelLower = kel.name.toLowerCase();
        if (
          fullText.includes(kelLower) ||
          (addr.village && addr.village.toLowerCase() === kelLower) ||
          (addr.suburb && addr.suburb.toLowerCase() === kelLower)
        ) {
          detectedKelurahan = kel.name;
          confidence = 'HIGH_SPATIAL';
          break;
        }
      }
    }
  } catch (err) {
    console.warn('OSM Geocode network notice:', err);
  }

  // Fallback 1: Jika OSM tidak mengembalikan nama jalan spesifik, cek koridor jalan utama Lubuklinggau
  if (!detectedRoad) {
    for (const corridor of LUBUKLINGGAU_MAJOR_ROAD_CORRIDORS) {
      if (
        coord.lat >= corridor.minLat &&
        coord.lat <= corridor.maxLat &&
        coord.lng >= corridor.minLng &&
        coord.lng <= corridor.maxLng
      ) {
        if (!corridor.kecamatan || corridor.kecamatan.toLowerCase() === detectedKecamatan.toLowerCase()) {
          detectedRoad = corridor.name;
          confidence = 'HIGH_SPATIAL';
          break;
        }
      }
    }
  }

  // Fallback 2: Jika bukan di koridor utama terdaftar, gunakan identitas area kelurahan terdekat
  if (!detectedRoad) {
    detectedRoad = `Jl. Area Kel. ${detectedKelurahan}`;
  }

  // Generate kode aset penomoran otomatis (e.g. LLG-T1-TJ-001)
  const { smartPoleCode, smartSegmentCode } = getNextSequentialPoleCode(
    detectedKecamatan,
    detectedKelurahan,
    existingCodes
  );

  return {
    road: detectedRoad,
    kelurahan: detectedKelurahan,
    kecamatan: detectedKecamatan,
    patokanLokasi: patokanLokasi || undefined,
    smartPoleCode,
    smartSegmentCode,
    rawDisplayName,
    confidence,
  };
}
