import { Coordinates } from '@/types/gis';

/**
 * Generates a Google Street View Static Image URL for a given coordinate and heading.
 * Uses Google Street View Static API or public panorama preview.
 */
export function getStreetViewImageUrl(
  coord: Coordinates,
  heading = 0,
  pitch = 10,
  fov = 90
): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  if (apiKey) {
    return `https://maps.googleapis.com/maps/api/streetview?size=640x420&location=${coord.lat},${coord.lng}&heading=${Math.round(heading)}&pitch=${pitch}&fov=${fov}&key=${apiKey}`;
  }

  // Fallback high-res static representation / panorama metadata proxy
  return `https://maps.googleapis.com/maps/api/streetview?size=640x420&location=${coord.lat},${coord.lng}&heading=${Math.round(heading)}&pitch=${pitch}&fov=${fov}`;
}

/**
 * Generates an interactive Google Maps Street View 360° direct view URL.
 */
export function getStreetViewDirectUrl(coord: Coordinates, heading = 0): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coord.lat},${coord.lng}&heading=${Math.round(heading)}`;
}

/**
 * Generates an embeddable Google Street View Iframe URL.
 */
export function getStreetViewEmbedUrl(coord: Coordinates, heading = 0): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${coord.lat},${coord.lng}&heading=${Math.round(heading)}&pitch=10&fov=90`;
  }
  return `https://maps.google.com/maps?layer=c&cbll=${coord.lat},${coord.lng}&cbp=11,${Math.round(heading)},0,0,0&output=svembed`;
}
