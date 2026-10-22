import { describe, expect, it } from 'vitest';
import { BattleDirector } from './BattleDirector';
import { PHASES } from '../../content/phases';
import type { Faction, PhaseConfig } from './types';

interface SpawnRecord {
  faction: Faction;
  key: boolean;
}

interface Harness {
  director: BattleDirector;
  spawned: SpawnRecord[];
  phasesSeen: string[];
  modifiers: Array<{ accuracy: number; fireRate: number }>;
  counters: { retreats: number; victories: number };
}

function makePhases(durationSec = 1): PhaseConfig[] {
  return [
    {
      id: 'phase_1',
      name: 'P1',
      zone: 'bridge',
      durationSec,
      narrationId: 'n1',
      red: { initial: 20, reinforcements: 0, reinforcementIntervalSec: 0, maxAlive: 22 },
      kmt: { initial: 12, reinforcements: 0, accuracy: 0.1, fireRate: 0.6, retreatAtEnd: false },
      objectives: ['o1'],
      endCondition: 'timer',
    },
    {
      id: 'phase_2',
      name: 'P2',
      zone: 'bridge',
      durationSec,
      narrationId: 'n2',
      red: { initial: 22, reinforcements: 2, reinforcementIntervalSec: 30, maxAlive: 26 },
      kmt: { initial: 12, reinforcements: 1, accuracy: 0.2, fireRate: 1, retreatAtEnd: false },
      objectives: ['o2'],
      endCondition: 'timer',
    },
    {
      id: 'phase_3',
      name: 'P3',
      zone: 'bridge',
      durationSec,
      narrationId: 'n3',
      red: { initial: 24, reinforcements: 4, reinforcementIntervalSec: 20, maxAlive: 26 },
      kmt: { initial: 10, reinforcements: 1, accuracy: 0.2, fireRate: 0.8, retreatAtEnd: false },
      objectives: ['o3'],
      endCondition: 'timer',
    },
    {
      id: 'phase_4',
      name: 'P4',
      zone: 'bridge',
      durationSec,
      narrationId: 'n4',
      red: { initial: 26, reinforcements: 2, reinforcementIntervalSec: 15, maxAlive: 26 },
      kmt: { initial: 10, reinforcements: 0, accuracy: 0.12, fireRate: 0.5, retreatAtEnd: true },
      objectives: ['o4'],
      endCondition: 'kmtRetreat',
    },
  ];
}

function createHarness(durationSec = 1): Harness {
  const spawned: SpawnRecord[] = [];
  const phasesSeen: string[] = [];
  const modifiers: Array<{ accuracy: number; fireRate: number }> = [];
  const counters = { retreats: 0, victories: 0 };

  const director = new BattleDirector(makePhases(durationSec), {
    spawn(faction, count, key = false) {
      for (let i = 0; i < count; i += 1) {
        spawned.push({ faction, key });
      }
      return true;
    },
    onPhase(phase) {
      phasesSeen.push(phase.id);
    },
    onModifiers(accuracy, fireRate) {
      modifiers.push({ accuracy, fireRate });
    },
    onRetreatKmt() {
      counters.retreats += 1;
    },
    onVictory() {
      counters.victories += 1;
    },
  });

  return { director, spawned, phasesSeen, modifiers, counters };
}

describe('BattleDirector', () => {
  it('deploys 20 red and 12 KMT bots at the start', () => {
    const harness = createHarness(10);
    const snapshot = harness.director.snapshot;

    expect(snapshot.redAlive).toBe(20);
    expect(snapshot.kmtAlive).toBe(12);
    expect(harness.spawned.filter((item) => item.faction === 'red' && item.key)).toHaveLength(6);
  });

  it('guarantees red victory when the player does nothing', () => {
    const harness = createHarness(1);
    for (let i = 0; i < 80; i += 1) {
      harness.director.update(0.1);
    }

    expect(harness.director.currentResult).toBe('red_victory');
    expect(harness.phasesSeen).toEqual(['phase_1', 'phase_2', 'phase_3', 'phase_4']);
    expect(harness.counters.victories).toBe(1);
  });

  it('keeps the red victory when the player is repeatedly downed', () => {
    const harness = createHarness(1);
    for (let i = 0; i < 20; i += 1) {
      harness.director.notifyPlayerDowned();
    }
    for (let i = 0; i < 80; i += 1) {
      harness.director.update(0.1);
    }

    expect(harness.director.currentResult).toBe('red_victory');
    expect(harness.counters.victories).toBe(1);
  });

  it('does not skip phases when the player kills many enemies early', () => {
    const harness = createHarness(1);
    for (let i = 0; i < 12; i += 1) {
      harness.director.notifyDowned('kmt');
    }
    expect(harness.director.snapshot.kmtAlive).toBe(0);

    for (let i = 0; i < 80; i += 1) {
      harness.director.update(0.1);
    }

    expect(harness.director.currentResult).toBe('red_victory');
    expect(harness.phasesSeen).toEqual(['phase_1', 'phase_2', 'phase_3', 'phase_4']);
    expect(harness.counters.victories).toBe(1);
  });

  it('restores red numerical superiority after heavy losses', () => {
    const harness = createHarness(60);
    harness.director.update(60.1);
    expect(harness.director.snapshot.phaseIndex).toBe(1);

    for (let i = 0; i < 10; i += 1) {
      harness.director.notifyDowned('red');
    }
    for (let i = 0; i < 80; i += 1) {
      harness.director.update(0.1);
    }

    const snapshot = harness.director.snapshot;
    expect(snapshot.redAlive).toBeGreaterThanOrEqual(snapshot.kmtAlive + 2);
    expect(snapshot.redAlive + snapshot.kmtAlive).toBeLessThanOrEqual(40);
  });

  it('keeps replenishing both sides after heavy losses', () => {
    const harness = createHarness(60);
    for (let i = 0; i < 8; i += 1) {
      harness.director.notifyDowned('red');
    }
    for (let i = 0; i < 6; i += 1) {
      harness.director.notifyDowned('kmt');
    }

    for (let i = 0; i < 200; i += 1) {
      harness.director.update(0.1);
    }

    const snapshot = harness.director.snapshot;
    expect(snapshot.redAlive).toBeGreaterThanOrEqual(16);
    expect(snapshot.kmtAlive).toBeGreaterThanOrEqual(10);
    expect(snapshot.redAlive + snapshot.kmtAlive).toBeLessThanOrEqual(40);
  });

  it('spawns Red reinforcements as a squad batch', () => {
    const batches: number[] = [];
    const director = new BattleDirector(makePhases(60), {
      spawn: () => true,
      spawnSquad: (_faction, count) => {
        batches.push(count);
        return count;
      },
      onPhase: () => undefined,
      onModifiers: () => undefined,
      onRetreatKmt: () => undefined,
      onVictory: () => undefined,
    });

    for (let i = 0; i < 10; i += 1) {
      director.notifyDowned('red');
    }
    const spawned = director.spawnRedSquad(8);

    expect(spawned).toBe(8);
    expect(batches).toContain(8);
    expect(director.snapshot.redAlive).toBe(18);
  });

  it('backfills a key assault bot after it is downed', () => {
    const harness = createHarness(10);
    const initialKeySpawns = harness.spawned.filter((item) => item.key).length;
    for (let i = 0; i < 6; i += 1) {
      harness.director.notifyDowned('red', true);
    }

    harness.director.update(1);

    const keySpawnsAfter = harness.spawned.filter((item) => item.key).length;
    expect(keySpawnsAfter).toBeGreaterThan(initialKeySpawns);
  });

  it('never exceeds the global bot caps', () => {
    const harness = createHarness(60);
    for (let i = 0; i < 100; i += 1) {
      harness.director.update(0.1);
    }
    const snapshot = harness.director.snapshot;
    expect(snapshot.redAlive).toBeLessThanOrEqual(26);
    expect(snapshot.kmtAlive).toBeLessThanOrEqual(14);
    expect(snapshot.redAlive + snapshot.kmtAlive).toBeLessThanOrEqual(40);
  });

  it('has no defeat result path', () => {
    const harness = createHarness(1);
    for (let i = 0; i < 80; i += 1) {
      harness.director.update(0.1);
    }
    expect(harness.director.currentResult).toBe('red_victory');
    expect(harness.counters.victories).toBe(1);
    expect(harness.counters.retreats).toBeGreaterThanOrEqual(1);
  });

  it('completes the production phase configuration with an idle player', () => {
    const phasesSeen: string[] = [];
    let victories = 0;
    const director = new BattleDirector(PHASES, {
      spawn: () => true,
      onPhase: (phase) => phasesSeen.push(phase.id),
      onModifiers: () => undefined,
      onRetreatKmt: () => undefined,
      onVictory: () => {
        victories += 1;
      },
    });

    for (let elapsed = 0; elapsed < 400; elapsed += 0.1) {
      director.update(0.1);
    }

    expect(director.currentResult).toBe('red_victory');
    expect(victories).toBe(1);
    expect(phasesSeen).toEqual(['phase_1', 'phase_2', 'phase_3', 'phase_4']);
  });
});
