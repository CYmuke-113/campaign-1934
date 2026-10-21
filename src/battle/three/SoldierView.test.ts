import { describe, expect, it } from 'vitest';
import { createSoldier, createSoldierAssets } from './SoldierView';

describe('SoldierView', () => {
  it('swings both legs in opposite phases while moving', () => {
    const assets = createSoldierAssets();
    const soldier = createSoldier(assets, 'red', false);

    expect(soldier.leftLeg).not.toBe(soldier.rightLeg);
    soldier.setMoving(true);
    soldier.update(0.2);

    expect(Math.abs(soldier.leftLeg.rotation.x)).toBeGreaterThan(0.05);
    expect(Math.sign(soldier.leftLeg.rotation.x)).not.toBe(
      Math.sign(soldier.rightLeg.rotation.x),
    );

    soldier.setMoving(false);
    for (let i = 0; i < 20; i += 1) {
      soldier.update(0.1);
    }
    expect(Math.abs(soldier.leftLeg.rotation.x)).toBeLessThan(0.05);

    assets.dispose();
  });

  it('uses separate upper-body and leg geometry', () => {
    const assets = createSoldierAssets();
    for (const faction of ['red', 'kmt'] as const) {
      expect(assets.upper[faction]).not.toBe(assets.leg[faction]);
      expect(assets.upper[faction].getAttribute('position')).toBeTruthy();
      expect(assets.leg[faction].getAttribute('position')).toBeTruthy();
    }
    assets.dispose();
  });
});
