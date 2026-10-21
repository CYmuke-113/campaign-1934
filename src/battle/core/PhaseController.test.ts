import { describe, expect, it } from 'vitest';
import { PhaseController } from './PhaseController';
import type { PhaseConfig } from './types';

function makePhases(): PhaseConfig[] {
  return [
    {
      id: 'phase_1',
      name: 'P1',
      zone: 'bridge',
      durationSec: 1,
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
      durationSec: 2,
      narrationId: 'n2',
      red: { initial: 22, reinforcements: 0, reinforcementIntervalSec: 0, maxAlive: 26 },
      kmt: { initial: 12, reinforcements: 0, accuracy: 0.2, fireRate: 1, retreatAtEnd: false },
      objectives: ['o2'],
      endCondition: 'timer',
    },
  ];
}

describe('PhaseController', () => {
  it('starts at the first phase', () => {
    const controller = new PhaseController(makePhases());
    expect(controller.current.id).toBe('phase_1');
    expect(controller.currentIndex).toBe(0);
    expect(controller.timeInPhase).toBe(0);
    expect(controller.isFinished).toBe(false);
  });

  it('advances when the phase duration is reached', () => {
    const controller = new PhaseController(makePhases());
    expect(controller.update(0.5)).toEqual({ changed: false, finished: false });
    expect(controller.current.id).toBe('phase_1');
    expect(controller.update(0.5)).toEqual({ changed: true, finished: false });
    expect(controller.current.id).toBe('phase_2');
    expect(controller.timeInPhase).toBe(0);
  });

  it('finishes after the final phase duration', () => {
    const controller = new PhaseController(makePhases());
    controller.update(1);
    const result = controller.update(2);
    expect(result.finished).toBe(true);
    expect(controller.isFinished).toBe(true);
    expect(controller.current.id).toBe('phase_2');
  });

  it('does not advance after finishing', () => {
    const controller = new PhaseController(makePhases());
    controller.update(3);
    const result = controller.update(10);
    expect(result).toEqual({ changed: false, finished: true });
  });

  it('rejects an empty phase list', () => {
    expect(() => new PhaseController([])).toThrow();
  });
});
