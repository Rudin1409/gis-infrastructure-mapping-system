export interface TileLayerConfig {
  id: 'clean_satellite' | 'hybrid_survey' | 'street';
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
}

export const MAP_TILE_LAYERS: Record<
  'clean_satellite' | 'hybrid_survey' | 'street',
  TileLayerConfig
> = {
  // 1. Pristine Clean High-Resolution Satellite (Zero POI / Restaurant clutter - Best for GIS Overview & Pole Pins)
  clean_satellite: {
    id: 'clean_satellite',
    name: 'Satelit Bersih (Fokus Titik Tiang)',
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Satellite Imagery (Clean GIS)',
    maxZoom: 21,
    subdomains: ['0', '1', '2', '3'],
  },
  // 2. Google Hybrid Satellite with Street & Alley Names (Best for Surveyor Pin Placement)
  hybrid_survey: {
    id: 'hybrid_survey',
    name: 'Satelit + Nama Jalan (Navigasi Survei)',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Hybrid',
    maxZoom: 21,
    subdomains: ['0', '1', '2', '3'],
  },
  // 3. Clean Google Road Map
  street: {
    id: 'street',
    name: 'Peta Jalan (Google Roads)',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 21,
    subdomains: ['0', '1', '2', '3'],
  },
};
