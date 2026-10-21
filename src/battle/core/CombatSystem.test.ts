import { describe, expect, it } from 'vitest';
import { applyDamage, canDamage, damageForHit, isDown, isFriendlyFire } from './CombatSystem';

describe('CombatSystem', () => {
  it('uses a fixed 10 damage for every hit', () => {
    expect(damageForHit()).toBe(10);
    expect(applyDamage(100)).toBe(90);
    expect(applyDamage(20)).toBe(10);
    expect(applyDamage(10)).toBe(0);
  });

  it('never lets health fall below zero', () => {
    expect(applyDamage(5, 10)).toBe(0);
    expect(applyDamage(0, 10)).toBe(0);
  });

  it('reports down at zero or below', () => {
    expect(isDown(1)).toBe(false);
    expect(isDown(0)).toBe(true);
    expect(isDown(-5)).toBe(true);
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

  it('drops a soldier after ten hits', () => {
    let hp = 100;
    for (let i = 0; i < 10; i += 1) {
      hp = applyDamage(hp);
    }
    expect(hp).toBe(0);
    expect(isDown(hp)).toBe(true);
  });
});
