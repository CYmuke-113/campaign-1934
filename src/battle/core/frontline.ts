import type { BattleZone } from './types';

export const JUNGLE_FRONT_Z = 34;
export const BRIDGE_FRONT_Z = -28;
export const JUNGLE_MAX_DISTANCE = 24;
export const BRIDGE_MAX_DISTANCE = 18;
export const STREET_MAX_DISTANCE = 28;
export const FRONTLINE_REINFORCE_SECONDS = 0.45;
export const FRONTLINE_STRIKE_SECONDS = 1.4;

export type FrontlineEscalation = 'none' | 'reinforce' | 'strike';

export function isOutOfFrontline(
  zone: BattleZone,
  playerZ: number,
  nearestRedDistance: number,
): boolean {
  if (zone === 'jungle') {
    return playerZ < JUNGLE_FRONT_Z || nearestRedDistance > JUNGLE_MAX_DISTANCE;
  }
  if (zone === 'bridge') {
    return playerZ < BRIDGE_FRONT_Z || nearestRedDistance > BRIDGE_MAX_DISTANCE;
  }
  return nearestRedDistance > STREET_MAX_DISTANCE;
}

export function frontlineEscalation(elapsedSeconds: number): FrontlineEscalation {
  if (elapsedSeconds >= FRONTLINE_STRIKE_SECONDS) return 'strike';
  if (elapsedSeconds >= FRONTLINE_REINFORCE_SECONDS) return 'reinforce';
  return 'none';
}
