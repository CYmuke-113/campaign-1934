import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { FIRE_COOLDOWN_SECONDS, MAG_SIZE, TOTAL_AMMO } from '../core/constants';
import { TracerSystem } from './TracerSystem';
import { WeaponSystem } from './WeaponSystem';

function createWeapon() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  scene.add(camera);
  const tracers = new TracerSystem(scene, 40, 1);
  const onShot = vi.fn();
  const weapon = new WeaponSystem(camera, () => [], () => [], tracers, {
    onShot,
    onHit: vi.fn(),
    onAmmoChange: vi.fn(),
  });
  return { weapon, tracers, onShot };
}

describe('WeaponSystem', () => {
  it('starts with a 30-round magazine and 120 rounds total', () => {
    const { weapon, tracers } = createWeapon();
    expect(weapon.state.mag).toBe(MAG_SIZE);
    expect(weapon.state.mag + weapon.state.reserve).toBe(TOTAL_AMMO);
    weapon.dispose();
    tracers.dispose();
  });

  it('keeps a visible interval between automatic shots', () => {
    const { weapon, tracers, onShot } = createWeapon();
    weapon.setTrigger(true);
    for (let elapsed = 0; elapsed < 1.21; elapsed += 0.02) {
      weapon.update(0.02);
    }

    expect(FIRE_COOLDOWN_SECONDS).toBeGreaterThanOrEqual(0.24);
    expect(onShot).toHaveBeenCalledTimes(5);
    weapon.dispose();
    tracers.dispose();
  });
});
