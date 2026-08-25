export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GpsReading {
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export type GpsQualityLevel = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'UNAVAILABLE';

export interface GpsQualityInfo {
  level: GpsQualityLevel;
  label: string;
  badgeClass: string;
  description: string;
}

export interface LocationQC {
  distanceFromDevice: number; // in meters
  isWarningDistance: boolean; // > 50 meters
  isExcessiveDistance: boolean; // > 100 meters
  status: 'NORMAL' | 'WARNING' | 'EXCESSIVE';
  message?: string;
}
