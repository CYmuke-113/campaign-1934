import { describe, expect, it } from 'vitest';
import {
  MACHINE_GUN_COUNT,
  MACHINE_GUN_DAMAGE,
  MACHINE_GUN_FIRE_INTERVAL_SECONDS,
  advanceAutomaticFire,
} from './machineGun';

describe('bunker machine guns', () => {
  it('mounts three high-rate guns that deal 20 damage per hit', () => {
    expect(MACHINE_GUN_COUNT).toBe(3);
    expect(MACHINE_GUN_DAMAGE).toBe(20);
    expect(MACHINE_GUN_FIRE_INTERVAL_SECONDS).toBeLessThanOrEqual(0.07);
    expect(100 / MACHINE_GUN_DAMAGE).toBe(5);
  });

  it('emits every shot due during a slow render frame', () => {
    const step = advanceAutomaticFire(0, 0.35);
    expect(step.shots).toBe(6);
    expect(step.timer).toBeGreaterThan(0);
  });
});
