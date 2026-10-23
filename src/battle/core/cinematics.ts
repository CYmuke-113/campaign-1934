export const STAGING_DURATION_SECONDS = 3;
export const CONVOY_SPEED = 7;
export const CONVOY_EXIT_Z = -116;

export function convoyPositionZ(startZ: number, elapsedSeconds: number): number {
  return startZ - Math.max(0, elapsedSeconds) * CONVOY_SPEED;
}

export function hasConvoyExited(positionZ: number): boolean {
  return positionZ < CONVOY_EXIT_Z;
}
