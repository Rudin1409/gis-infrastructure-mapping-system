import { Coordinates } from '@/types/gis';
import { calculateHaversineDistance } from './haversine';

export interface InterpolatedPolePoint {
  index: number;
  coord: Coordinates;
  distanceFromStart: number;
  poleCode: string;
}

/**
 * Generates intermediate pole coordinates along a line segment or polyline
 * at regular distance intervals (e.g. every 35 meters).
 * 
 * @param points Array of waypoints (at least 2 points: Start and End)
 * @param intervalMeters Distance between poles in meters (default 35m)
 * @param codePrefix Prefix for pole code generation (e.g. "LLG-B1-PJ")
 * @returns Array of interpolated points including start and end
 */
export function interpolatePolesAlongPath(
  points: Coordinates[],
  intervalMeters: number = 35,
  codePrefix: string = 'LLG-B1-PJ'
): {
  poles: InterpolatedPolePoint[];
  totalDistance: number;
  segmentDistances: number[];
} {
  if (!points || points.length < 2) {
    return {
      poles: [],
      totalDistance: 0,
      segmentDistances: [],
    };
  }

  // 1. Calculate total distance and individual leg lengths
  let totalDistance = 0;
  const legDistances: number[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const legDist = calculateHaversineDistance(points[i], points[i + 1]);
    legDistances.push(legDist);
    totalDistance += legDist;
  }

  if (totalDistance === 0) {
    return {
      poles: [
        {
          index: 1,
          coord: points[0],
          distanceFromStart: 0,
          poleCode: `${codePrefix}-${Math.floor(100 + Math.random() * 900)}`,
        },
      ],
      totalDistance: 0,
      segmentDistances: [],
    };
  }

  // 2. Generate target distances from start: 0, interval, 2*interval, ..., and totalDistance
  const targetDistances: number[] = [0];
  let currentDist = intervalMeters;

  // Add intermediate points
  while (currentDist < totalDistance - intervalMeters * 0.3) {
    targetDistances.push(currentDist);
    currentDist += intervalMeters;
  }

  // Ensure end point is included
  if (targetDistances[targetDistances.length - 1] < totalDistance) {
    targetDistances.push(totalDistance);
  }

  // 3. Interpolate coordinates for each target distance
  const baseRandomCode = Math.floor(100 + Math.random() * 800);
  const resultPoles: InterpolatedPolePoint[] = [];

  targetDistances.forEach((targetD, idx) => {
    // Find which leg targetD falls into
    let accumulated = 0;
    let foundCoord: Coordinates = points[points.length - 1];

    for (let legIdx = 0; legIdx < legDistances.length; legIdx++) {
      const legLen = legDistances[legIdx];
      if (targetD <= accumulated + legLen || legIdx === legDistances.length - 1) {
        const legProgress = legLen > 0 ? (targetD - accumulated) / legLen : 0;
        const clampedProgress = Math.max(0, Math.min(1, legProgress));

        const startPt = points[legIdx];
        const endPt = points[legIdx + 1] || points[legIdx];

        foundCoord = {
          lat: startPt.lat + clampedProgress * (endPt.lat - startPt.lat),
          lng: startPt.lng + clampedProgress * (endPt.lng - startPt.lng),
        };
        break;
      }
      accumulated += legLen;
    }

    const codeNum = baseRandomCode + idx;
    resultPoles.push({
      index: idx + 1,
      coord: foundCoord,
      distanceFromStart: Math.round(targetD * 10) / 10,
      poleCode: `${codePrefix}-${codeNum}`,
    });
  });

  return {
    poles: resultPoles,
    totalDistance: Math.round(totalDistance * 10) / 10,
    segmentDistances: legDistances,
  };
}
