import { Coordinates } from '@/types/gis';

/**
 * Fetches the exact road geometry (polyline coordinates) between two or more points
 * using OpenStreetMap / OSRM routing service.
 * 
 * If the road is curved, OSRM returns all intermediate road bend points,
 * ensuring poles are placed strictly along the asphalt line and never cross diagonally.
 * 
 * Falls back to straight line if offline or OSRM unreachable.
 */
export async function fetchRoadGeometry(
  points: Coordinates[]
): Promise<{ coordinates: Coordinates[]; isRoadSnapped: boolean }> {
  if (!points || points.length < 2) {
    return { coordinates: points || [], isRoadSnapped: false };
  }

  try {
    const coordsStr = points.map((p) => `${p.lng},${p.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const routeCoords: [number, number][] = data.routes[0].geometry.coordinates;
      const roadCoordinates = routeCoords.map(([lng, lat]) => ({ lat, lng }));

      return {
        coordinates: roadCoordinates.length > 1 ? roadCoordinates : points,
        isRoadSnapped: true,
      };
    }
  } catch (error) {
    console.warn('[Road Routing] Fallback to direct path:', error);
  }

  return { coordinates: points, isRoadSnapped: false };
}

/**
 * Offsets a coordinate by perpendicular distance (in meters) relative to the direction vector.
 * Useful for moving poles to the left shoulder or right shoulder of the road.
 */
export function offsetCoordinatePerpendicular(
  coord: Coordinates,
  bearingDeg: number,
  offsetMeters: number // positive = right side, negative = left side
): Coordinates {
  if (offsetMeters === 0) return coord;

  const R = 6378137; // Earth radius in meters
  const perpBearingRad = ((bearingDeg + 90) * Math.PI) / 180;

  const latRad = (coord.lat * Math.PI) / 180;
  const lngRad = (coord.lng * Math.PI) / 180;

  const dByR = offsetMeters / R;

  const newLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(dByR) +
      Math.cos(latRad) * Math.sin(dByR) * Math.cos(perpBearingRad)
  );

  const newLngRad =
    lngRad +
    Math.atan2(
      Math.sin(perpBearingRad) * Math.sin(dByR) * Math.cos(latRad),
      Math.cos(dByR) - Math.sin(latRad) * Math.sin(newLatRad)
    );

  return {
    lat: (newLatRad * 180) / Math.PI,
    lng: (newLngRad * 180) / Math.PI,
  };
}
