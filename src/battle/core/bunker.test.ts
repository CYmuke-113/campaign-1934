import { describe, expect, it } from 'vitest';
import {
  BUNKER_ROOF_DEFENDER_COUNT,
  BUNKER_ROOF_DEFENDER_POINTS,
} from './bunker';

describe('bunker roof defenders', () => {
  it('provides six separated elevated firing positions', () => {
    expect(BUNKER_ROOF_DEFENDER_COUNT).toBe(6);
    expect(BUNKER_ROOF_DEFENDER_POINTS).toHaveLength(BUNKER_ROOF_DEFENDER_COUNT);
    expect(new Set(BUNKER_ROOF_DEFENDER_POINTS.map((point) => point.x)).size).toBe(6);
    expect(BUNKER_ROOF_DEFENDER_POINTS.every((point) => point.y > 10)).toBe(true);
  });
});
