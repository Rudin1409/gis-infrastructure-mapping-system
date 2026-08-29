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
 * @param coord - target coordinates
 * @param heading - compass heading 0-360 degrees
 * @param pitch - camera pitch (positive = up, negative = down). Default 10 (slightly up for poles)
 * @param fov - field of view in degrees. Default 75 for tighter zoom
 */
export function getStreetViewEmbedUrl(coord: Coordinates, heading = 0, pitch = 10, fov = 75): string {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${coord.lat},${coord.lng}&heading=${Math.round(heading)}&pitch=${pitch}&fov=${fov}`;
  }
  // cbp format: 11, heading, tilt, zoom, pitch
  // For the free embed: cbp=11,heading,0,0,pitch
  return `https://maps.google.com/maps?layer=c&cbll=${coord.lat},${coord.lng}&cbp=11,${Math.round(heading)},0,0,${pitch}&output=svembed`;
}

/**
 * Projects a coordinate forward from a camera position along a heading direction.
 * Used to calculate where the red reticle target is pointing in the real world.
 * 
 * @param cameraCoord - the Street View camera position (on the road)
 * @param headingDeg - compass heading 0-360 the user is looking towards
 * @param distanceMeters - estimated distance to the target pole (default ~8m for roadside)
 * @returns the projected coordinate on the roadside
 */
export function projectCoordinateAlongHeading(
  cameraCoord: Coordinates,
  headingDeg: number,
  distanceMeters: number = 8
): Coordinates {
  const R = 6378137; // Earth radius in meters
  const bearingRad = (headingDeg * Math.PI) / 180;
  const latRad = (cameraCoord.lat * Math.PI) / 180;
  const lngRad = (cameraCoord.lng * Math.PI) / 180;
  const dByR = distanceMeters / R;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(dByR) +
    Math.cos(latRad) * Math.sin(dByR) * Math.cos(bearingRad)
  );

  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(dByR) * Math.cos(latRad),
      Math.cos(dByR) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI,
  };
}
