import { describe, expect, it } from 'vitest';
import { colliderFromCenter } from './collision';
import { chooseSeparatedPoint, coverPointsAround } from './positioning';

describe('battlefield positioning', () => {
  it('creates distinct firing positions around cover without placing one inside it', () => {
    const collider = colliderFromCenter(10, 20, 4, 6, 2);
    const points = coverPointsAround(collider, 1);

    expect(points).toHaveLength(4);
    for (const point of points) {
      const inside =
        point.x >= collider.minX && point.x <= collider.maxX &&
        point.z >= collider.minZ && point.z <= collider.maxZ;
      expect(inside).toBe(false);
    }
  });

  it('chooses an unused point far enough from other soldiers', () => {
    const candidates = [
      { x: 0, z: 0 },
      { x: 2, z: 0 },
      { x: 7, z: 0 },
    ];
    expect(chooseSeparatedPoint(candidates, [{ x: 0, z: 0 }], 4)).toEqual({ x: 7, z: 0 });
    expect(chooseSeparatedPoint(candidates, candidates, 4)).toBeNull();
  });
});
