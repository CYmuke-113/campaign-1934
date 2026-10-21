import {
  DIRECTOR_EMERGENCY_COOLDOWN_SECONDS,
  FINAL_RETREAT_SECONDS,
  KEY_ASSAULT_COUNT,
  KMT_REINFORCEMENT_INTERVAL_SECONDS,
  MAX_KMT_BOTS,
  MAX_RED_BOTS,
  MAX_TOTAL_BOTS,
} from './constants';
import { PhaseController } from './PhaseController';
import type {
  BattleResult,
  DirectorCallbacks,
  DirectorSnapshot,
  Faction,
  PhaseConfig,
} from './types';

interface PhaseRuntime {
  redReinforcementsLeft: number;
  kmtReinforcementsLeft: number;
  kmtEmergencyLeft: number;
  reinforcementTimer: number;
  kmtReinforcementTimer: number;
  emergencyCooldown: number;
  keyBackfillCooldown: number;
  keyBackfillNeeded: boolean;
  retreatTriggered: boolean;
  sustainRedTimer: number;
  sustainKmtTimer: number;
}

export class BattleDirector {
  private readonly phaseController: PhaseController;
  private readonly runtime: PhaseRuntime;
  private redAlive = 0;
  private kmtAlive = 0;
  private redPending = 0;
  private kmtPending = 0;
  private keyAlive = 0;
  private result: BattleResult | null = null;
  private totalElapsed = 0;
  private accuracy = 0;
  private fireRate = 0;

  constructor(
    private readonly phases: PhaseConfig[],
    private readonly callbacks: DirectorCallbacks,
  ) {
    if (phases.length === 0) {
      throw new Error('BattleDirector requires at least one phase');
    }
    this.phaseController = new PhaseController(phases);
    this.runtime = {
      redReinforcementsLeft: 0,
      kmtReinforcementsLeft: 0,
      kmtEmergencyLeft: 0,
      reinforcementTimer: 0,
      kmtReinforcementTimer: 0,
      emergencyCooldown: 0,
      keyBackfillCooldown: 0,
      keyBackfillNeeded: false,
      retreatTriggered: false,
      sustainRedTimer: 0,
      sustainKmtTimer: 0,
    };
    this.enterPhase(0);
  }

  get snapshot(): DirectorSnapshot {
    const phase = this.phaseController.current;
    return {
      phaseIndex: this.phaseController.currentIndex,
      phaseName: phase.name,
      phaseElapsed: this.phaseController.timeInPhase,
      phaseDuration: phase.durationSec,
      totalElapsed: this.totalElapsed,
      redAlive: this.redAlive,
      kmtAlive: this.kmtAlive,
      redPending: this.redPending,
      kmtPending: this.kmtPending,
      result: this.result,
      accuracy: this.accuracy,
      fireRate: this.fireRate,
      objective: phase.objectives.join(' · '),
    };
  }

  get currentResult(): BattleResult | null {
    return this.result;
  }

  get phaseIndex(): number {
    return this.phaseController.currentIndex;
  }

  get isFinished(): boolean {
    return this.result !== null;
  }

  update(dt: number): void {
    if (this.result) return;

    const safeDt = Math.max(0, dt);
    this.totalElapsed += safeDt;
    this.runtime.emergencyCooldown = Math.max(0, this.runtime.emergencyCooldown - safeDt);
    this.runtime.keyBackfillCooldown = Math.max(0, this.runtime.keyBackfillCooldown - safeDt);
    this.runtime.sustainRedTimer = Math.max(0, this.runtime.sustainRedTimer - safeDt);
    this.runtime.sustainKmtTimer = Math.max(0, this.runtime.sustainKmtTimer - safeDt);

    const phaseUpdate = this.phaseController.update(safeDt);
    if (phaseUpdate.finished) {
      this.triggerVictory();
      return;
    }
    if (phaseUpdate.changed) {
      this.enterPhase(this.phaseController.currentIndex);
    }

    this.updateReinforcements(safeDt);
    this.enforceInvariants();
    this.maintainBattlefield();
    this.maybeTriggerRetreat();
    this.flushPending();
  }

  notifyDowned(faction: Faction, isKey = false): void {
    if (this.result) return;

    if (faction === 'red') {
      this.redAlive = Math.max(0, this.redAlive - 1);
      if (isKey) {
        this.keyAlive = Math.max(0, this.keyAlive - 1);
        this.runtime.keyBackfillNeeded = true;
        this.runtime.keyBackfillCooldown = 0.5;
      }
      if (this.keyAlive < 2) {
        this.runtime.keyBackfillNeeded = true;
      }
    } else {
      this.kmtAlive = Math.max(0, this.kmtAlive - 1);
    }

    this.flushPending();
  }

  notifyPlayerDowned(): void {
    // The player is part of the red faction, but their down state must never
    // affect the fixed historical outcome. Stats are tracked by BattleStats.
  }

  debugSkipPhase(): void {
    if (this.result) return;
    const remaining = Math.max(0, this.phaseController.current.durationSec - this.phaseController.timeInPhase);
    this.update(remaining + 0.001);
  }

  private enterPhase(index: number): void {
    const phase = this.phases[index];
    this.runtime.redReinforcementsLeft = phase.red.reinforcements;
    this.runtime.kmtReinforcementsLeft = phase.kmt.reinforcements;
    this.runtime.kmtEmergencyLeft = index === this.phases.length - 1 ? 0 : 2;
    this.runtime.reinforcementTimer = 0;
    this.runtime.kmtReinforcementTimer = 0;
    this.runtime.emergencyCooldown = 0;
    this.runtime.keyBackfillCooldown = 0;
    this.runtime.keyBackfillNeeded = false;
    this.runtime.retreatTriggered = false;
    this.runtime.sustainRedTimer = 0;
    this.runtime.sustainKmtTimer = 0;

    this.accuracy = phase.kmt.accuracy;
    this.fireRate = phase.kmt.fireRate;
    this.callbacks.onModifiers(this.accuracy, this.fireRate);
    this.callbacks.onPhase(phase, index);

    const redNeeded = Math.max(0, phase.red.initial - this.redAlive);
    const kmtNeeded = Math.max(0, phase.kmt.initial - this.kmtAlive);
    this.spawnTo('red', redNeeded);
    this.spawnTo('kmt', kmtNeeded);
  }

  private updateReinforcements(dt: number): void {
    const phase = this.phaseController.current;

    if (this.runtime.redReinforcementsLeft > 0 && phase.red.reinforcementIntervalSec > 0) {
      this.runtime.reinforcementTimer += dt;
      while (
        this.runtime.redReinforcementsLeft > 0 &&
        this.runtime.reinforcementTimer >= phase.red.reinforcementIntervalSec
      ) {
        this.runtime.reinforcementTimer -= phase.red.reinforcementIntervalSec;
        const spawned = this.spawnTo('red', 1);
        if (spawned === 0) break;
        this.runtime.redReinforcementsLeft -= spawned;
      }
    }

    if (this.runtime.kmtReinforcementsLeft > 0) {
      this.runtime.kmtReinforcementTimer += dt;
      if (this.runtime.kmtReinforcementTimer >= KMT_REINFORCEMENT_INTERVAL_SECONDS) {
        this.runtime.kmtReinforcementTimer = 0;
        const spawned = this.spawnTo('kmt', 1);
        if (spawned > 0) {
          this.runtime.kmtReinforcementsLeft -= spawned;
        }
      }
    }

    if (
      this.runtime.kmtEmergencyLeft > 0 &&
      this.kmtAlive < 4 &&
      this.phaseController.currentIndex < this.phases.length - 1
    ) {
      const spawned = this.spawnTo('kmt', 1);
      if (spawned > 0) {
        this.runtime.kmtEmergencyLeft -= spawned;
      }
    }

    if (this.runtime.keyBackfillNeeded && this.runtime.keyBackfillCooldown <= 0) {
      const spawned = this.spawnTo('red', 1);
      if (spawned > 0) {
        this.runtime.keyBackfillNeeded = false;
        this.runtime.keyBackfillCooldown = 2;
      }
    }
  }

  private enforceInvariants(): void {
    if (this.phaseController.currentIndex >= 1) {
      if (this.redAlive < this.kmtAlive + 2 && this.runtime.emergencyCooldown <= 0) {
        const spawned = this.spawnTo('red', 2);
        this.runtime.emergencyCooldown = DIRECTOR_EMERGENCY_COOLDOWN_SECONDS;
        if (spawned === 0) {
          this.accuracy = Math.max(0.05, this.accuracy * 0.85);
          this.callbacks.onModifiers(this.accuracy, this.fireRate);
        }
      }
    }

    if (this.redAlive === 0) {
      this.spawnTo('red', 3);
      this.accuracy = Math.max(0.02, this.accuracy * 0.5);
      this.callbacks.onModifiers(this.accuracy, this.fireRate);
    }
  }

  private maintainBattlefield(): void {
    const phase = this.phaseController.current;

    const redFloor = Math.max(12, phase.red.initial - 4);
    if (this.runtime.sustainRedTimer <= 0 && this.redAlive < redFloor) {
      const spawned = this.spawnTo('red', 1);
      this.runtime.sustainRedTimer = spawned > 0 ? 2.5 : 4;
    }

    if (!this.runtime.retreatTriggered) {
      const kmtFloor = Math.max(8, phase.kmt.initial - 1);
      if (this.runtime.sustainKmtTimer <= 0 && this.kmtAlive < kmtFloor) {
        const spawned = this.spawnTo('kmt', 1);
        this.runtime.sustainKmtTimer = spawned > 0 ? 3.5 : 5;
      }
    }
  }

  private maybeTriggerRetreat(): void {
    const phase = this.phaseController.current;
    if (!phase.kmt.retreatAtEnd || this.runtime.retreatTriggered) return;
    if (this.phaseController.timeInPhase < phase.durationSec - FINAL_RETREAT_SECONDS) return;

    this.runtime.retreatTriggered = true;
    this.accuracy = Math.min(this.accuracy, 0.05);
    this.callbacks.onModifiers(this.accuracy, this.fireRate);
    this.callbacks.onRetreatKmt();
  }

  private triggerVictory(): void {
    if (this.result) return;
    this.result = 'red_victory';
    this.accuracy = 0;
    this.fireRate = 0;
    this.callbacks.onModifiers(0, 0);
    this.callbacks.onRetreatKmt();
    this.callbacks.onVictory();
  }

  private canSpawn(faction: Faction): boolean {
    if (this.redAlive + this.kmtAlive >= MAX_TOTAL_BOTS) return false;
    if (faction === 'red') {
      return (
        this.redAlive < MAX_RED_BOTS &&
        this.redAlive < this.phaseController.current.red.maxAlive
      );
    }
    return this.kmtAlive < MAX_KMT_BOTS;
  }

  private spawnTo(faction: Faction, count: number): number {
    let spawned = 0;
    for (let i = 0; i < count; i += 1) {
      if (!this.canSpawn(faction)) {
        this.addPending(faction, count - i);
        break;
      }

      const isKey = faction === 'red' && this.keyAlive < KEY_ASSAULT_COUNT;
      if (!this.callbacks.spawn(faction, 1, isKey)) {
        this.addPending(faction, count - i);
        break;
      }

      if (faction === 'red') {
        this.redAlive += 1;
        if (isKey) this.keyAlive += 1;
      } else {
        this.kmtAlive += 1;
      }
      spawned += 1;
    }
    return spawned;
  }

  private flushPending(): void {
    let guard = 0;
    while (this.redPending > 0 && this.canSpawn('red') && guard < 4) {
      const isKey = this.keyAlive < KEY_ASSAULT_COUNT;
      if (!this.callbacks.spawn('red', 1, isKey)) break;
      this.redPending -= 1;
      this.redAlive += 1;
      if (isKey) this.keyAlive += 1;
      guard += 1;
    }

    guard = 0;
    while (this.kmtPending > 0 && this.canSpawn('kmt') && guard < 4) {
      if (!this.callbacks.spawn('kmt', 1, false)) break;
      this.kmtPending -= 1;
      this.kmtAlive += 1;
      guard += 1;
    }
  }

  private addPending(faction: Faction, count: number): void {
    if (count <= 0) return;
    if (faction === 'red') {
      this.redPending += count;
    } else {
      this.kmtPending += count;
    }
  }
}
