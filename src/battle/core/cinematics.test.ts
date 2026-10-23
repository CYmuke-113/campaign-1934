import { describe, expect, it } from 'vitest';
import {
  CONVOY_SPEED,
  STAGING_DURATION_SECONDS,
  convoyPositionZ,
  hasConvoyExited,
} from './cinematics';

describe('opening and closing battlefield cinematics', () => {
  it('holds the formation for three seconds before the horn', () => {
    expect(STAGING_DURATION_SECONDS).toBe(3);
  });

  it('moves the retreat convoy down the final road until it exits', () => {
    expect(convoyPositionZ(-82, 2)).toBe(-82 - CONVOY_SPEED * 2);
    expect(hasConvoyExited(convoyPositionZ(-82, 6))).toBe(true);
  });
});
