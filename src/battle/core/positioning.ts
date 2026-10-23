import type { Collider } from './collision';

export interface GroundPoint {
  x: number;
  z: number;
}

export function coverPointsAround(
  collider: Collider,
  clearance = 1.25,
): GroundPoint[] {
  const centerX = (collider.minX + collider.maxX) / 2;
  const centerZ = (collider.minZ + collider.maxZ) / 2;
  return [
    { x: collider.minX - clearance, z: centerZ },
    { x: collider.maxX + clearance, z: centerZ },
    { x: centerX, z: collider.minZ - clearance },
    { x: centerX, z: collider.maxZ + clearance },
  ];
}

export function chooseSeparatedPoint(
  candidates: readonly GroundPoint[],
  occupied: readonly GroundPoint[],
  minimumDistance: number,
  startIndex = 0,
): GroundPoint | null {
  if (candidates.length === 0) return null;
  const minimumDistanceSquared = minimumDistance * minimumDistance;
  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(startIndex + offset) % candidates.length];
    const separated = occupied.every((point) => {
      const dx = point.x - candidate.x;
      const dz = point.z - candidate.z;
      return dx * dx + dz * dz >= minimumDistanceSquared;
    });
    if (separated) return candidate;
  }
  return null;
}
