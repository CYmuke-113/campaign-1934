export interface BunkerDefenderPoint {
  x: number;
  y: number;
  z: number;
}

export const BUNKER_ROOF_DEFENDER_COUNT = 6;

export const BUNKER_ROOF_DEFENDER_POINTS: readonly BunkerDefenderPoint[] = [
  { x: -8, y: 12.25, z: -33.2 },
  { x: -5, y: 12.25, z: -35.2 },
  { x: -2, y: 12.25, z: -33.4 },
  { x: 2, y: 12.25, z: -33.4 },
  { x: 5, y: 12.25, z: -35.2 },
  { x: 8, y: 12.25, z: -33.2 },
];
