import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Faction } from '../core/types';

export interface SoldierAssets {
  geometries: {
    red: THREE.BufferGeometry;
    kmt: THREE.BufferGeometry;
  };
  material: THREE.MeshStandardMaterial;
  dispose(): void;
}

export interface SoldierView {
  group: THREE.Group;
  mesh: THREE.Mesh;
}

interface SoldierPalette {
  uniform: number;
  trousers: number;
  cap: number;
  belt: number;
  skin: number;
  boot: number;
  marker: number;
  rifleWood: number;
  rifleMetal: number;
}

const RED_PALETTE: SoldierPalette = {
  uniform: 0x4d6170,
  trousers: 0x3d4d58,
  cap: 0x384854,
  belt: 0x2a2420,
  skin: 0xa47d62,
  boot: 0x211d1a,
  marker: 0xb23a2f,
  rifleWood: 0x5a3c24,
  rifleMetal: 0x202628,
};

const KMT_PALETTE: SoldierPalette = {
  uniform: 0x8b7a4f,
  trousers: 0x6d5f3f,
  cap: 0x6c6246,
  belt: 0x342c22,
  skin: 0xa47d62,
  boot: 0x241f1a,
  marker: 0xd0b26a,
  rifleWood: 0x5a3c24,
  rifleMetal: 0x202628,
};

export function createSoldierAssets(): SoldierAssets {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.04,
  });
  const red = buildSoldierGeometry(RED_PALETTE, false);
  const kmt = buildSoldierGeometry(KMT_PALETTE, true);
  return {
    geometries: { red, kmt },
    material,
    dispose() {
      red.dispose();
      kmt.dispose();
      material.dispose();
    },
  };
}

export function createSoldier(
  assets: SoldierAssets,
  faction: Faction,
  isKey: boolean,
): SoldierView {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(assets.geometries[faction], assets.material);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData = { isBody: true };
  group.add(mesh);
  group.userData = { faction, isKey };
  return { group, mesh };
}

function buildSoldierGeometry(palette: SoldierPalette, helmet: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (
    geometry: THREE.BufferGeometry,
    color: number,
    position: [number, number, number],
    rotation: [number, number, number] = [0, 0, 0],
  ): void => {
    geometry.rotateX(rotation[0]);
    geometry.rotateY(rotation[1]);
    geometry.rotateZ(rotation[2]);
    geometry.translate(position[0], position[1], position[2]);
    applyVertexColor(geometry, color);
    parts.push(geometry);
  };

  // Boots and legs
  for (const side of [-1, 1]) {
    add(
      new THREE.BoxGeometry(0.2, 0.13, 0.32),
      palette.boot,
      [side * 0.13, 0.065, 0.04],
    );
    add(
      new THREE.BoxGeometry(0.16, 0.72, 0.19),
      palette.trousers,
      [side * 0.13, 0.47, 0],
    );
  }

  // Torso, belt, and chest strap
  add(new THREE.BoxGeometry(0.46, 0.62, 0.28), palette.uniform, [0, 1.2, 0]);
  add(new THREE.BoxGeometry(0.49, 0.08, 0.3), palette.belt, [0, 0.9, 0]);
  add(new THREE.BoxGeometry(0.055, 0.58, 0.295), palette.belt, [0.13, 1.2, 0.005]);
  add(new THREE.BoxGeometry(0.055, 0.58, 0.295), palette.belt, [-0.13, 1.2, 0.005]);

  // Arms and hands
  for (const side of [-1, 1]) {
    add(
      new THREE.BoxGeometry(0.14, 0.56, 0.17),
      palette.uniform,
      [side * 0.31, 1.2, 0],
      [0, 0, side * -0.06],
    );
    add(
      new THREE.SphereGeometry(0.075, 6, 5),
      palette.skin,
      [side * 0.33, 0.9, 0.02],
    );
  }

  // Neck and head
  add(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 6), palette.skin, [0, 1.55, 0]);
  add(new THREE.SphereGeometry(0.16, 8, 6), palette.skin, [0, 1.67, 0]);

  // Headgear
  if (helmet) {
    add(
      new THREE.SphereGeometry(0.19, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      palette.cap,
      [0, 1.7, 0],
    );
    add(
      new THREE.CylinderGeometry(0.23, 0.23, 0.028, 10),
      palette.cap,
      [0, 1.69, 0],
    );
    add(
      new THREE.BoxGeometry(0.11, 0.035, 0.035),
      palette.marker,
      [0, 1.73, 0.18],
    );
  } else {
    add(
      new THREE.CylinderGeometry(0.17, 0.19, 0.13, 8),
      palette.cap,
      [0, 1.8, 0],
    );
    add(
      new THREE.BoxGeometry(0.2, 0.035, 0.14),
      palette.cap,
      [0, 1.75, 0.14],
      [0.12, 0, 0],
    );
    add(
      new THREE.CylinderGeometry(0.045, 0.045, 0.02, 5),
      palette.marker,
      [0, 1.82, 0.175],
      [Math.PI / 2, 0, 0],
    );
    // Red armband on the left arm
    add(
      new THREE.BoxGeometry(0.155, 0.075, 0.185),
      palette.marker,
      [-0.31, 1.32, 0],
    );
  }

  // Rifle held on the right side
  add(
    new THREE.BoxGeometry(0.05, 0.05, 0.82),
    palette.rifleMetal,
    [0.3, 1.16, 0.28],
    [0.02, 0, 0],
  );
  add(
    new THREE.BoxGeometry(0.075, 0.1, 0.3),
    palette.rifleWood,
    [0.3, 1.13, 0.62],
  );
  add(
    new THREE.CylinderGeometry(0.018, 0.018, 0.42, 5),
    palette.rifleMetal,
    [0.3, 1.18, 0.78],
    [Math.PI / 2, 0, 0],
  );
  add(
    new THREE.BoxGeometry(0.035, 0.055, 0.035),
    palette.rifleMetal,
    [0.3, 1.22, 0.06],
  );

  const merged = mergeGeometries(parts, false);
  for (const part of parts) {
    if (part !== merged) part.dispose();
  }
  if (!merged) {
    throw new Error('Unable to merge soldier geometry');
  }
  return merged;
}

function applyVertexColor(geometry: THREE.BufferGeometry, color: number): void {
  const position = geometry.getAttribute('position');
  if (!position) return;
  const colors = new Float32Array(position.count * 3);
  const value = new THREE.Color(color);
  for (let i = 0; i < position.count; i += 1) {
    colors[i * 3] = value.r;
    colors[i * 3 + 1] = value.g;
    colors[i * 3 + 2] = value.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}
