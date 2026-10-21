export const ARTILLERY_INNER_RADIUS = 2.5;
export const ARTILLERY_OUTER_RADIUS = 6;
export const ARTILLERY_INNER_DAMAGE = 50;
export const ARTILLERY_OUTER_DAMAGE = 25;

export function artilleryDamageAt(distance: number): number {
  if (distance <= ARTILLERY_INNER_RADIUS) return ARTILLERY_INNER_DAMAGE;
  if (distance <= ARTILLERY_OUTER_RADIUS) return ARTILLERY_OUTER_DAMAGE;
  return 0;
}

export function isInArtilleryBlast(distance: number): boolean {
  return distance <= ARTILLERY_OUTER_RADIUS;
}
