import { CRITICAL_HP, SHOT_DAMAGE } from './constants';
import type { Faction } from './types';

export function damageForHit(): number {
  return SHOT_DAMAGE;
}

export function applyDamage(currentHp: number, damage: number = SHOT_DAMAGE): number {
  return Math.max(0, currentHp - Math.max(0, damage));
}

export function isDown(hp: number): boolean {
  return hp <= 0;
}

export function isCritical(hp: number): boolean {
  return hp > 0 && hp <= CRITICAL_HP;
}

export function canDamage(attacker: Faction, target: Faction): boolean {
  return attacker !== target;
}

export function isFriendlyFire(attacker: Faction, target: Faction): boolean {
  return attacker === target;
}
