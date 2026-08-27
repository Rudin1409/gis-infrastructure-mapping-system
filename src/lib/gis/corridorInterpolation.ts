import { Coordinates } from '@/types/gis';
import { calculateHaversineDistance } from './haversine';

export interface InterpolatedPolePoint {
  index: number;
  coord: Coordinates;
  distanceFromStart: number;
  spanFromPrevious: number;
  poleCode: string;
  isEndpoint?: 'START' | 'END' | 'INTERMEDIATE';
}

export interface CorridorInterpolationResult {
  poles: InterpolatedPolePoint[];
  totalDistance: number;
  segmentDistances: number[];
  segmentCount: number;
  averageSpan: number;
  isEqualSpacing: boolean;
}

/**
 * Generates intermediate pole coordinates along a straight line or polyline
 * between endpoints based on desired distance interval (e.g. every 30m, 35m, 40m, 50m).
 * 
 * Supports:
 * - Equal Spacing Mode (default): Automatically balances intermediate points so every single span is 100% equal.
 * - Fixed Step Mode: Steps by exact meters, with the remainder on the last pole.
 * 
 * @param points Array of waypoints (at least 2 points: Start and End)
 * @param intervalMeters Distance between poles in meters (default 35m)
 * @param equalSpacing Whether to distribute intermediate poles equally (default true)
 * @param codePrefix Prefix for pole code generation (e.g. "LLG-B1-PJ")
 */
export function interpolatePolesAlongPath(
  points: Coordinates[],
  intervalMeters: number = 35,
  equalSpacing: boolean = true,
  codePrefix: string = 'LLG-B1-PJ'
): CorridorInterpolationResult {
  if (!points || points.length < 2) {
    return {
      poles: [],
      totalDistance: 0,
      segmentDistances: [],
      segmentCount: 0,
      averageSpan: 0,
      isEqualSpacing: equalSpacing,
    };
  }

  // 1. Calculate total path length and individual leg distances
  let totalDistance = 0;
  const legDistances: number[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const legDist = calculateHaversineDistance(points[i], points[i + 1]);
    legDistances.push(legDist);
    totalDistance += legDist;
  }

  const validInterval = Math.max(5, intervalMeters || 35);

  if (totalDistance <= 1) {
    return {
      poles: [
        {
          index: 1,
          coord: points[0],
          distanceFromStart: 0,
          spanFromPrevious: 0,
          poleCode: `${codePrefix}-001`,
          isEndpoint: 'START',
        },
      ],
      totalDistance: 0,
      segmentDistances: [],
      segmentCount: 0,
      averageSpan: 0,
      isEqualSpacing: equalSpacing,
    };
  }

  // 2. Determine target distances along the path
  const targetDistances: number[] = [];

  if (equalSpacing) {
    // Mode A: Equal Distribution (Bagi Rata Presisi)
    const numSegments = Math.max(1, Math.round(totalDistance / validInterval));
    const stepSize = totalDistance / numSegments;

    for (let i = 0; i <= numSegments; i++) {
      targetDistances.push(Math.min(totalDistance, i * stepSize));
    }
  } else {
    // Mode B: Fixed Step (Langkah Tetap)
    targetDistances.push(0);
    let curr = validInterval;

    while (curr < totalDistance - validInterval * 0.25) {
      targetDistances.push(curr);
      curr += validInterval;
    }

    if (targetDistances[targetDistances.length - 1] < totalDistance) {
      targetDistances.push(totalDistance);
    }
  }

  // 3. Interpolate geographic coordinates for each target distance
  const baseCodeNumber = Math.floor(100 + Math.random() * 800);
  const resultPoles: InterpolatedPolePoint[] = [];

  targetDistances.forEach((targetD, idx) => {
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

    const prevDistance = idx > 0 ? targetDistances[idx - 1] : 0;
    const span = Math.round((targetD - prevDistance) * 10) / 10;
    const isStart = idx === 0;
    const isEnd = idx === targetDistances.length - 1;

    resultPoles.push({
      index: idx + 1,
      coord: foundCoord,
      distanceFromStart: Math.round(targetD * 10) / 10,
      spanFromPrevious: span,
      poleCode: `${codePrefix}-${baseCodeNumber + idx}`,
      isEndpoint: isStart ? 'START' : isEnd ? 'END' : 'INTERMEDIATE',
    });
  });

  const spanCount = Math.max(1, resultPoles.length - 1);
  const avgSpan = Math.round((totalDistance / spanCount) * 10) / 10;

  return {
    poles: resultPoles,
    totalDistance: Math.round(totalDistance * 10) / 10,
    segmentDistances: legDistances,
    segmentCount: spanCount,
    averageSpan: avgSpan,
    isEqualSpacing: equalSpacing,
  };
}
