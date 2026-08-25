import { Pole } from '@/types/pole';
import { NetworkSegment } from '@/types/segment';
import { calculateHaversineDistance } from './haversine';

/**
 * Find sequential path of poles between startPole and endPole.
 * 1. Checks graph topological connection via NetworkSegment (BFS / Shortest Path).
 * 2. If no direct segment graph, performs spatial corridor projection (finds intermediate poles along the road).
 */
export function findPolesPath(
  startPole: Pole,
  endPole: Pole,
  allPoles: Pole[],
  segments: NetworkSegment[] = []
): Pole[] {
  if (startPole.id === endPole.id) {
    return [startPole];
  }

  const poleMapById = new Map<string, Pole>();
  allPoles.forEach((p) => poleMapById.set(p.id, p));

  // 1. Try Segment Graph Pathfinding (BFS)
  if (segments.length > 0) {
    const adj = new Map<string, string[]>();
    segments.forEach((seg) => {
      if (!adj.has(seg.fromNodeId)) adj.set(seg.fromNodeId, []);
      if (!adj.has(seg.toNodeId)) adj.set(seg.toNodeId, []);
      adj.get(seg.fromNodeId)!.push(seg.toNodeId);
      adj.get(seg.toNodeId)!.push(seg.fromNodeId);
    });

    const queue: { id: string; path: string[] }[] = [{ id: startPole.id, path: [startPole.id] }];
    const visited = new Set<string>([startPole.id]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.id === endPole.id) {
        const foundPoles = current.path
          .map((id) => poleMapById.get(id))
          .filter((p): p is Pole => p !== undefined);
        if (foundPoles.length >= 2) {
          return foundPoles;
        }
      }

      const neighbors = adj.get(current.id) || [];
      for (const nextId of neighbors) {
        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push({ id: nextId, path: [...current.path, nextId] });
        }
      }
    }
  }

  // 2. Spatial Corridor Search (Find intermediate poles situated geometrically between start and end)
  const totalStraightDist = calculateHaversineDistance(
    { lat: startPole.poleLatitude, lng: startPole.poleLongitude },
    { lat: endPole.poleLatitude, lng: endPole.poleLongitude }
  );

  const intermediatePoles: { pole: Pole; distFromStart: number }[] = [];

  allPoles.forEach((p) => {
    if (p.id === startPole.id || p.id === endPole.id) return;

    const distFromStart = calculateHaversineDistance(
      { lat: startPole.poleLatitude, lng: startPole.poleLongitude },
      { lat: p.poleLatitude, lng: p.poleLongitude }
    );
    const distToEnd = calculateHaversineDistance(
      { lat: p.poleLatitude, lng: p.poleLongitude },
      { lat: endPole.poleLatitude, lng: endPole.poleLongitude }
    );

    // If point lies approximately along the corridor (triangle inequality threshold within +20%)
    const detourRatio = (distFromStart + distToEnd) / totalStraightDist;
    if (detourRatio < 1.25 && distFromStart < totalStraightDist && distToEnd < totalStraightDist) {
      intermediatePoles.push({ pole: p, distFromStart });
    }
  });

  // Sort intermediate poles sequentially from start to end
  intermediatePoles.sort((a, b) => a.distFromStart - b.distFromStart);

  return [startPole, ...intermediatePoles.map((item) => item.pole), endPole];
}
