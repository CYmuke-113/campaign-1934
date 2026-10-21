export type Faction = 'red' | 'kmt';

export type BattleResult = 'red_victory';

export type PhaseId = 'phase_1' | 'phase_2' | 'phase_3' | 'phase_4';

export interface PhaseConfig {
  id: PhaseId;
  name: string;
  durationSec: number;
  narrationId: string;
  red: {
    initial: number;
    reinforcements: number;
    reinforcementIntervalSec: number;
    maxAlive: number;
  };
  kmt: {
    initial: number;
    reinforcements: number;
    accuracy: number;
    fireRate: number;
    retreatAtEnd: boolean;
  };
  objectives: string[];
  endCondition: 'timer' | 'redAtBridgehead' | 'kmtRetreat';
}

export interface BattleStatsData {
  shots: number;
  hits: number;
  kills: number;
  deaths: number;
  durationSec: number;
}

export interface DirectorSnapshot {
  phaseIndex: number;
  phaseName: string;
  phaseElapsed: number;
  phaseDuration: number;
  totalElapsed: number;
  redAlive: number;
  kmtAlive: number;
  redPending: number;
  kmtPending: number;
  result: BattleResult | null;
  accuracy: number;
  fireRate: number;
  objective: string;
}

export interface DirectorCallbacks {
  spawn(faction: Faction, count: number, key?: boolean): boolean;
  onPhase(phase: PhaseConfig, index: number): void;
  onModifiers(accuracy: number, fireRate: number): void;
  onRetreatKmt(): void;
  onVictory(): void;
}

export interface BattleSnapshot {
  phaseName: string;
  objective: string;
  playerHp: number;
  playerMaxHp: number;
  ammoMag: number;
  ammoReserve: number;
  reloading: boolean;
  paused: boolean;
  downed: boolean;
  downSecondsLeft: number;
}
