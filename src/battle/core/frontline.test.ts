import { describe, expect, it } from 'vitest';
import { isOutOfFrontline } from './frontline';

describe('frontline discipline', () => {
  it('treats a player on the bridge during the jungle phase as out of line', () => {
    expect(isOutOfFrontline('jungle', 20, 10)).toBe(true);
  });

  it('treats a player far from the Red main line as out of line', () => {
    expect(isOutOfFrontline('jungle', 60, 30)).toBe(true);
    expect(isOutOfFrontline('bridge', 0, 25)).toBe(true);
    expect(isOutOfFrontline('street', -60, 35)).toBe(true);
  });

  it('allows a player inside the current line', () => {
    expect(isOutOfFrontline('jungle', 60, 8)).toBe(false);
    expect(isOutOfFrontline('bridge', 0, 12)).toBe(false);
    expect(isOutOfFrontline('street', -50, 10)).toBe(false);
  });
});
