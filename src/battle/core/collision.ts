export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Height above the local ground. Low obstacles can be jumped over. */
  height: number;
}

export function pointInCollider(
  collider: Collider,
  x: number,
  z: number,
  padding = 0,
): boolean {
  return (
    x >= collider.minX - padding &&
    x <= collider.maxX + padding &&
    z >= collider.minZ - padding &&
    z <= collider.maxZ + padding
  );
}

export function isBlockedAt(
  colliders: Collider[],
  x: number,
  z: number,
  jumpOffset: number,
  padding = 0.3,
): boolean {
  return colliders.some(
    (collider) =>
      pointInCollider(collider, x, z, padding) && jumpOffset <= collider.height,
  );
}

export function colliderFromCenter(
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
): Collider {
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
    height,
  };
}
