import { describe, expect, it } from 'vitest';
import {
  applyDamage,
  canDamage,
  damageForHit,
  isCritical,
  isDown,
  isFriendlyFire,
} from './CombatSystem';

describe('CombatSystem', () => {
  it('uses a fixed 25 damage for every hit', () => {
    expect(damageForHit()).toBe(25);
    expect(applyDamage(100)).toBe(75);
    expect(applyDamage(30)).toBe(5);
    expect(applyDamage(20)).toBe(0);
  });

  it('never lets health fall below zero', () => {
    expect(applyDamage(5, 25)).toBe(0);
    expect(applyDamage(0, 25)).toBe(0);
  });

  it('reports down at zero or below', () => {
    expect(isDown(1)).toBe(false);
    expect(isDown(0)).toBe(true);
    expect(isDown(-5)).toBe(true);
  });

  it('reports critical health at 25 or below, but not at zero', () => {
    expect(isCritical(26)).toBe(false);
    expect(isCritical(25)).toBe(true);
    expect(isCritical(1)).toBe(true);
    expect(isCritical(0)).toBe(false);
  });

  it('allows damage only between opposing factions', () => {
    expect(canDamage('red', 'kmt')).toBe(true);
    expect(canDamage('kmt', 'red')).toBe(true);
    expect(canDamage('red', 'red')).toBe(false);
    expect(canDamage('kmt', 'kmt')).toBe(false);
  });

  it('identifies friendly fire explicitly', () => {
    expect(isFriendlyFire('red', 'red')).toBe(true);
    expect(isFriendlyFire('red', 'kmt')).toBe(false);
  });

  it('drops a soldier after four hits', () => {
    let hp = 100;
    for (let i = 0; i < 3; i += 1) {
      hp = applyDamage(hp);
    }
    expect(hp).toBe(25);
    expect(isCritical(hp)).toBe(true);
    expect(isDown(hp)).toBe(false);

    hp = applyDamage(hp);
    expect(hp).toBe(0);
    expect(isDown(hp)).toBe(true);
  });
});
