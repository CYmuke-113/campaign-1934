import { describe, expect, it } from 'vitest';
import {
  FRONTLINE_REINFORCE_SECONDS,
  FRONTLINE_STRIKE_SECONDS,
  frontlineEscalation,
  isOutOfFrontline,
} from './frontline';

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

  it('escalates invisibly from interception to a lethal strike', () => {
    expect(frontlineEscalation(FRONTLINE_REINFORCE_SECONDS - 0.01)).toBe('none');
    expect(frontlineEscalation(FRONTLINE_REINFORCE_SECONDS)).toBe('reinforce');
    expect(frontlineEscalation(FRONTLINE_STRIKE_SECONDS)).toBe('strike');
  });
});
