import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { TracerSystem } from './TracerSystem';

describe('TracerSystem', () => {
  it('spawns red tracers and muzzle flashes, then fades them out', () => {
    const scene = new THREE.Scene();
    const tracers = new TracerSystem(scene, 4, 4);

    tracers.spawn(new THREE.Vector3(0, 9, 20), new THREE.Vector3(0, 9, -20));
    tracers.spawnMuzzleFlash(new THREE.Vector3(0, 9, 20));

    expect(tracers.activeTracerCount).toBe(1);
    expect(tracers.activeFlashCount).toBe(1);

    tracers.update(0.05);
    expect(tracers.activeTracerCount).toBe(1);
    expect(tracers.activeFlashCount).toBe(1);

    tracers.update(0.25);
    expect(tracers.activeTracerCount).toBe(0);
    expect(tracers.activeFlashCount).toBe(0);

    tracers.dispose();
  });

  it('reuses tracer slots instead of growing the scene indefinitely', () => {
    const scene = new THREE.Scene();
    const tracers = new TracerSystem(scene, 2, 2);
    for (let i = 0; i < 10; i += 1) {
      tracers.spawn(new THREE.Vector3(0, 9, i), new THREE.Vector3(0, 9, -i));
    }
    expect(scene.children.filter((child) => child instanceof THREE.Line)).toHaveLength(2);
    tracers.dispose();
  });
});
