import { Coordinates, GpsQualityInfo, GpsQualityLevel, LocationQC } from '@/types/gis';

/**
 * Calculate spatial distance between two geographic coordinates using the Haversine formula.
 * @returns Distance in meters.
 */
export function calculateHaversineDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371e3; // Earth radius in meters
  const lat1Rad = (coord1.lat * Math.PI) / 180;
  const lat2Rad = (coord2.lat * Math.PI) / 180;
  const deltaLatRad = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const deltaLngRad = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLngRad / 2) *
      Math.sin(deltaLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate geographical midpoint coordinate between two points
 */
export function calculateMidpoint(
  coord1: Coordinates,
  coord2: Coordinates
): Coordinates {
  return {
    lat: (coord1.lat + coord2.lat) / 2,
    lng: (coord1.lng + coord2.lng) / 2,
  };
}

/**
 * Estimate actual Fiber Optic cable route length with pole sag & slack allowance (default +10%)
 */
export function estimateFiberCableLength(
  straightDistanceMeters: number,
  slackPercent: number = 10
): number {
  return straightDistanceMeters * (1 + slackPercent / 100);
}

/**
 * Format meters distance into readable string (e.g. "6.4 m" or "1.25 km").
 */
export function formatDistance(meters: number): string {
  if (isNaN(meters) || meters < 0) return '0 m';
  if (meters < 1000) {
    return `${meters.toFixed(1)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Determine GPS quality rating based on accuracy reading.
 * ≤ 5m: Sangat Baik
 * > 5m to 10m: Baik
 * > 10m to 20m: Kurang Baik
 * > 20m: Buruk
 */
export function getGpsQuality(accuracy?: number | null): GpsQualityInfo {
  if (accuracy === undefined || accuracy === null || isNaN(accuracy)) {
    return {
      level: 'UNAVAILABLE',
      label: 'Tidak Tersedia',
      badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
      description: 'Menunggu sinyal GPS perangkat...',
    };
  }

  if (accuracy <= 5) {
    return {
      level: 'EXCELLENT',
      label: 'Sangat Baik (≤5m)',
      badgeClass: 'bg-emerald-500 text-white border-emerald-600',
      description: 'Sinyal satelit sangat presisi. Cocok untuk input data tiang.',
    };
  }

  if (accuracy <= 10) {
    return {
      level: 'GOOD',
      label: 'Baik (≤10m)',
      badgeClass: 'bg-green-500 text-white border-green-600',
      description: 'Sinyal memadai untuk pemetaan umum.',
    };
  }

  if (accuracy <= 20) {
    return {
      level: 'FAIR',
      label: 'Kurang Baik (10-20m)',
      badgeClass: 'bg-yellow-500 text-white border-yellow-600',
      description: 'Sinyal terhalang pohon atau gedung. Geser pin manual untuk koreksi.',
    };
  }

  return {
    level: 'POOR',
    label: 'Buruk (>20m)',
    badgeClass: 'bg-red-500 text-white border-red-600',
    description: 'Akurasi rendah. Gunakan geser pin manual pada citra satelit.',
  };
}

/**
 * Evaluate Quality Control for distance between surveyor device and manual map pin.
 * Warning if > 50m, Excessive if > 100m.
 */
export function evaluateLocationQC(
  pinCoord: Coordinates,
  deviceCoord?: Coordinates | null
): LocationQC {
  if (!deviceCoord || isNaN(deviceCoord.lat) || isNaN(deviceCoord.lng)) {
    return {
      distanceFromDevice: 0,
      isWarningDistance: false,
      isExcessiveDistance: false,
      status: 'NORMAL',
    };
  }

  const distance = calculateHaversineDistance(pinCoord, deviceCoord);
  const roundedDist = Math.round(distance * 10) / 10;

  if (distance > 100) {
    return {
      distanceFromDevice: roundedDist,
      isWarningDistance: true,
      isExcessiveDistance: true,
      status: 'EXCESSIVE',
      message: `Posisi pin berjarak ${formatDistance(roundedDist)} dari lokasi Anda. Jarak cukup jauh, pastikan titik ini benar.`,
    };
  }

  if (distance > 50) {
    return {
      distanceFromDevice: roundedDist,
      isWarningDistance: true,
      isExcessiveDistance: false,
      status: 'WARNING',
      message: `Posisi pin berjarak ${formatDistance(roundedDist)} dari lokasi Anda. Pastikan titik ini sesuai objek lapangan.`,
    };
  }

  return {
    distanceFromDevice: roundedDist,
    isWarningDistance: false,
    isExcessiveDistance: false,
    status: 'NORMAL',
  };
}
