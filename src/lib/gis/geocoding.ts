import { Coordinates } from '@/types/gis';
import { KECAMATAN_LUBUKLINGGAU } from '@/config/lubuklinggau';
import { LUBUKLINGGAU_KELURAHAN_BOUNDARIES } from './boundaries';
import { calculateHaversineDistance } from './haversine';

export interface GeocodedAddress {
  road: string;
  kelurahan: string;
  kecamatan: string;
  smartPoleCode: string;
  smartSegmentCode: string;
  rawDisplayName?: string;
  confidence: 'HIGH_SPATIAL' | 'GEOMETRIC_NEAREST' | 'FALLBACK';
}

// Ray-Casting algorithm for Spatial Point-in-Polygon (PIP)
function isPointInPolygon(point: Coordinates, polygon: [number, number][]): boolean {
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
 * Universal & Dynamic Reverse Geocoding Engine for Kota Lubuklinggau.
 * Combines high-resolution OSM Reverse Geocoding (Zoom 19) with Spatial Point-in-Polygon (PIP)
 * and the complete master database of all 72 Kelurahan across 8 Kecamatan.
 */
export async function reverseGeocodeLocation(
  coord: Coordinates,
  existingCodes: string[] = []
): Promise<GeocodedAddress> {
  // 1. Precise Spatial Detection: Check if point falls inside an official Kelurahan Boundary Polygon
  let spatialKelurahan = '';
  let spatialKecamatan = '';
  let confidence: 'HIGH_SPATIAL' | 'GEOMETRIC_NEAREST' | 'FALLBACK' = 'FALLBACK';

  for (const boundary of LUBUKLINGGAU_KELURAHAN_BOUNDARIES) {
    if (isPointInPolygon(coord, boundary.polygon)) {
      spatialKelurahan = boundary.name.replace(/^Kel\.\s*/i, '').trim();
      spatialKecamatan = boundary.kecamatanName;
      confidence = 'HIGH_SPATIAL';
      break;
    }
  }

  // If outside exact boundary polygons, calculate nearest geometric centroid
  if (!spatialKelurahan) {
    let closestDist = Infinity;
    let closestBoundary = LUBUKLINGGAU_KELURAHAN_BOUNDARIES[0];

    for (const boundary of LUBUKLINGGAU_KELURAHAN_BOUNDARIES) {
      const dist = calculateHaversineDistance(coord, boundary.center);
      if (dist < closestDist) {
        closestDist = dist;
        closestBoundary = boundary;
      }
    }

    spatialKelurahan = closestBoundary.name.replace(/^Kel\.\s*/i, '').trim();
    spatialKecamatan = closestBoundary.kecamatanName;
    confidence = 'GEOMETRIC_NEAREST';
  }

  // 2. Fetch Street / Alley / Building / Housing Complex name via Live OSM Reverse Geocoding
  let detectedRoad = '';
  let rawDisplayName = '';

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coord.lat}&lon=${coord.lng}&zoom=19&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'id,en',
      },
    });

    if (response.ok) {
      const data = await response.json();
      rawDisplayName = data.display_name || '';
      const addr = data.address || {};

      // Match exact road / street / alley / residential / hamlet name
      const roadName =
        addr.road ||
        addr.pedestrian ||
        addr.residential ||
        addr.neighbourhood ||
        addr.suburb ||
        addr.hamlet ||
        addr.quarter;

      if (roadName) {
        detectedRoad = roadName;
      }

      // Check all 72 Kelurahan in the complete Lubuklinggau Master Database
      const fullText = (rawDisplayName + ' ' + (addr.village || '') + ' ' + (addr.suburb || '') + ' ' + (addr.city_district || '') + ' ' + (addr.quarter || '')).toLowerCase();

      let matchedFromMaster = false;
      for (const kec of KECAMATAN_LUBUKLINGGAU) {
        for (const kel of kec.kelurahan) {
          const kelLower = kel.toLowerCase();
          if (
            fullText.includes(kelLower) ||
            (addr.village && addr.village.toLowerCase() === kelLower) ||
            (addr.suburb && addr.suburb.toLowerCase() === kelLower)
          ) {
            spatialKelurahan = kel;
            spatialKecamatan = kec.name;
            confidence = 'HIGH_SPATIAL';
            matchedFromMaster = true;
            break;
          }
        }
        if (matchedFromMaster) break;
      }

      // If Kelurahan was not matched but Kecamatan was matched from city_district
      if (!matchedFromMaster && addr.city_district) {
        const foundKec = KECAMATAN_LUBUKLINGGAU.find((k) =>
          k.name.toLowerCase().includes(addr.city_district.toLowerCase())
        );
        if (foundKec && !foundKec.kelurahan.includes(spatialKelurahan)) {
          spatialKecamatan = foundKec.name;
          spatialKelurahan = foundKec.kelurahan[0];
        }
      }
    }
  } catch (err) {
    console.warn('Live reverse-geocoding network notice:', err);
  }

  // Fallback road name if no specific street name found
  if (!detectedRoad) {
    detectedRoad = `Jl. Area Kel. ${spatialKelurahan}`;
  }

  // Generate standardized sequential municipal GIS codes (e.g. LLG-T1-TJ-001)
  const { smartPoleCode, smartSegmentCode } = getNextSequentialPoleCode(
    spatialKecamatan,
    spatialKelurahan,
    existingCodes
  );

  return {
    road: detectedRoad,
    kelurahan: spatialKelurahan,
    kecamatan: spatialKecamatan,
    smartPoleCode,
    smartSegmentCode,
    rawDisplayName,
    confidence,
  };
}
