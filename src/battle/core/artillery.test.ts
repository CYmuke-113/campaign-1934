import { describe, expect, it } from 'vitest';
import { artilleryDamageAt, isInArtilleryBlast } from './artillery';

describe('artillery', () => {
  it('deals heavy damage at the impact point and lighter damage nearby', () => {
    expect(artilleryDamageAt(0)).toBe(50);
    expect(artilleryDamageAt(2.5)).toBe(50);
    expect(artilleryDamageAt(4)).toBe(25);
    expect(artilleryDamageAt(6)).toBe(25);
    expect(artilleryDamageAt(6.1)).toBe(0);
  });

  it('reports blast membership', () => {
    expect(isInArtilleryBlast(5.9)).toBe(true);
    expect(isInArtilleryBlast(6)).toBe(true);
    expect(isInArtilleryBlast(7)).toBe(false);
  });
});
