import * as THREE from 'three';

export interface BridgeBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  deckY: number;
  worldMinZ: number;
  worldMaxZ: number;
}

export interface BattleScene {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  bounds: BridgeBounds;
  redSpawn: THREE.Vector3;
  kmtSpawn: THREE.Vector3;
  machineGun: THREE.Group;
  update(dt: number): void;
  resize(width: number, height: number): void;
  setPixelRatio(ratio: number): void;
  setMachineGunFiring(firing: boolean): void;
  destroyMachineGun(): void;
  isMachineGunDestroyed(): boolean;
  dispose(): void;
}

const DECK_Y = 8;
const BRIDGE_HALF_LENGTH = 30;
const BUNKER_WALL_Z = -31.5;
const BUNKER_CENTER_Z = -34;

export function createBattleScene(host: HTMLElement): BattleScene {
  const width = Math.max(1, host.clientWidth || window.innerWidth);
  const height = Math.max(1, host.clientHeight || window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x121b1e);
  scene.fog = new THREE.FogExp2(0x182326, 0.017);

  const camera = new THREE.PerspectiveCamera(72, width / height, 0.1, 520);
  camera.rotation.order = 'YXZ';
  camera.position.set(0, DECK_Y + 1.65, 68);
  scene.add(camera);

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  host.appendChild(renderer.domElement);

  const disposables: Array<{ dispose(): void }> = [];
  const track = <T extends { dispose(): void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const assetBase = import.meta.env.BASE_URL;
  const textureLoader = new THREE.TextureLoader();
  const loadTexture = (
    url: string,
    colorSpace: THREE.ColorSpace,
    repeatX: number,
    repeatY: number,
  ): THREE.Texture => {
    const texture = textureLoader.load(url);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.colorSpace = colorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return track(texture);
  };

  const woodDiffuse = loadTexture(
    `${assetBase}assets/textures/wooden_planks_diff_1k.jpg`,
    THREE.SRGBColorSpace,
    2,
    2,
  );
  const woodNormal = loadTexture(
    `${assetBase}assets/textures/wooden_planks_nor_gl_1k.jpg`,
    THREE.NoColorSpace,
    2,
    2,
  );
  const woodRoughness = loadTexture(
    `${assetBase}assets/textures/wooden_planks_rough_1k.jpg`,
    THREE.NoColorSpace,
    2,
    2,
  );
  const rustDiffuse = loadTexture(
    `${assetBase}assets/textures/rusty_metal_diff_1k.jpg`,
    THREE.SRGBColorSpace,
    1,
    4,
  );
  const rustNormal = loadTexture(
    `${assetBase}assets/textures/rusty_metal_nor_gl_1k.jpg`,
    THREE.NoColorSpace,
    1,
    4,
  );
  const rustRoughness = loadTexture(
    `${assetBase}assets/textures/rusty_metal_rough_1k.jpg`,
    THREE.NoColorSpace,
    1,
    4,
  );
  const rockDiffuse = loadTexture(
    `${assetBase}assets/textures/dark_rock_diff_1k.jpg`,
    THREE.SRGBColorSpace,
    2,
    2,
  );
  const rockNormal = loadTexture(
    `${assetBase}assets/textures/dark_rock_nor_gl_1k.jpg`,
    THREE.NoColorSpace,
    2,
    2,
  );
  const rockRoughness = loadTexture(
    `${assetBase}assets/textures/dark_rock_rough_1k.jpg`,
    THREE.NoColorSpace,
    2,
    2,
  );

  const hemisphere = new THREE.HemisphereLight(0xa8c2d2, 0x2a2018, 1.55);
  scene.add(hemisphere);
  const moon = new THREE.DirectionalLight(0xffd4a4, 1.75);
  moon.position.set(-24, 38, 18);
  scene.add(moon);
  const fill = new THREE.AmbientLight(0x40515c, 0.65);
  scene.add(fill);
  const bridgeheadFireLight = new THREE.PointLight(0xff7138, 2.2, 34, 2);
  bridgeheadFireLight.position.set(0, 12, BUNKER_CENTER_Z + 1);
  scene.add(bridgeheadFireLight);

  // River
  const waterTexture = track(createWaterTexture());
  const waterMaterial = track(
    new THREE.MeshBasicMaterial({
      map: waterTexture,
      color: 0x8e8774,
      fog: true,
    }),
  );
  const water = new THREE.Mesh(track(new THREE.PlaneGeometry(250, 230)), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0;
  scene.add(water);

  // Bridge deck base and planks
  const woodMaterial = track(
    new THREE.MeshStandardMaterial({
      map: woodDiffuse,
      normalMap: woodNormal,
      roughnessMap: woodRoughness,
      color: 0x8a7965,
      roughness: 1,
      metalness: 0.04,
    }),
  );
  const plankMaterial = track(
    new THREE.MeshStandardMaterial({
      map: woodDiffuse,
      normalMap: woodNormal,
      roughnessMap: woodRoughness,
      color: 0x9c8468,
      roughness: 1,
      metalness: 0.02,
    }),
  );
  const deck = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.05, 0.14, BRIDGE_HALF_LENGTH * 2)),
    woodMaterial,
  );
  deck.position.y = DECK_Y - 0.02;
  scene.add(deck);

  const instanceDummy = new THREE.Object3D();
  const plankGeometry = track(new THREE.BoxGeometry(2.55, 0.08, 0.4));
  const plankTransforms: Array<{ y: number; z: number; ry: number }> = [];
  for (let i = 0; i < 32; i += 1) {
    if (i % 4 === 2 || i % 11 === 5) continue;
    plankTransforms.push({
      y: DECK_Y + 0.13,
      z: BRIDGE_HALF_LENGTH - i * 1.9,
      ry: (Math.random() - 0.5) * 0.02,
    });
  }
  const planks = new THREE.InstancedMesh(plankGeometry, plankMaterial, plankTransforms.length);
  plankTransforms.forEach((transform, index) => {
    instanceDummy.position.set(0, transform.y, transform.z);
    instanceDummy.rotation.set(0, transform.ry, 0);
    instanceDummy.scale.set(1, 1, 1);
    instanceDummy.updateMatrix();
    planks.setMatrixAt(index, instanceDummy.matrix);
  });
  planks.instanceMatrix.needsUpdate = true;
  scene.add(planks);

  const beamMaterial = track(
    new THREE.MeshStandardMaterial({ color: 0x4d4437, roughness: 0.7, metalness: 0.25 }),
  );
  const beamGeometry = track(new THREE.BoxGeometry(3.05, 0.07, 0.12));
  const beams = new THREE.InstancedMesh(beamGeometry, beamMaterial, 16);
  for (let i = 0; i < 16; i += 1) {
    instanceDummy.position.set(0, DECK_Y - 0.1, BRIDGE_HALF_LENGTH - 1.5 - i * 3.8);
    instanceDummy.rotation.set(0, 0, 0);
    instanceDummy.scale.set(1, 1, 1);
    instanceDummy.updateMatrix();
    beams.setMatrixAt(i, instanceDummy.matrix);
  }
  beams.instanceMatrix.needsUpdate = true;
  scene.add(beams);

  // 13 iron chains: 9 walkway chains and 4 handrail chains
  const chainMaterial = track(
    new THREE.MeshStandardMaterial({
      map: rustDiffuse,
      normalMap: rustNormal,
      roughnessMap: rustRoughness,
      color: 0xb0a89a,
      roughness: 1,
      metalness: 0.62,
    }),
  );
  const makeChainGeometry = (endY: number, middleY: number, radius: number): THREE.TubeGeometry => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, endY, BRIDGE_HALF_LENGTH),
      new THREE.Vector3(0, middleY, 0),
      new THREE.Vector3(0, endY, -BRIDGE_HALF_LENGTH),
    ]);
    return track(new THREE.TubeGeometry(curve, 14, radius, 5, false));
  };

  const bottomChains = new THREE.InstancedMesh(
    makeChainGeometry(DECK_Y + 0.32, DECK_Y - 0.18, 0.028),
    chainMaterial,
    9,
  );
  for (let i = 0; i < 9; i += 1) {
    instanceDummy.position.set(-1.16 + i * 0.29, 0, 0);
    instanceDummy.rotation.set(0, 0, 0);
    instanceDummy.scale.set(1, 1, 1);
    instanceDummy.updateMatrix();
    bottomChains.setMatrixAt(i, instanceDummy.matrix);
  }
  bottomChains.instanceMatrix.needsUpdate = true;
  scene.add(bottomChains);

  const lowerRailGeometry = makeChainGeometry(DECK_Y + 1.32, DECK_Y + 0.94, 0.032);
  const lowerRails = new THREE.InstancedMesh(lowerRailGeometry, chainMaterial, 2);
  [-1.55, 1.55].forEach((x, index) => {
    instanceDummy.position.set(x, 0, 0);
    instanceDummy.rotation.set(0, 0, 0);
    instanceDummy.scale.set(1, 1, 1);
    instanceDummy.updateMatrix();
    lowerRails.setMatrixAt(index, instanceDummy.matrix);
  });
  lowerRails.instanceMatrix.needsUpdate = true;
  scene.add(lowerRails);

  const upperRailGeometry = makeChainGeometry(DECK_Y + 1.68, DECK_Y + 1.3, 0.032);
  const upperRails = new THREE.InstancedMesh(upperRailGeometry, chainMaterial, 2);
  [-1.55, 1.55].forEach((x, index) => {
    instanceDummy.position.set(x, 0, 0);
    instanceDummy.rotation.set(0, 0, 0);
    instanceDummy.scale.set(1, 1, 1);
    instanceDummy.updateMatrix();
    upperRails.setMatrixAt(index, instanceDummy.matrix);
  });
  upperRails.instanceMatrix.needsUpdate = true;
  scene.add(upperRails);

  // Bridge towers
  const stoneMaterial = track(
    new THREE.MeshStandardMaterial({
      map: rockDiffuse,
      normalMap: rockNormal,
      roughnessMap: rockRoughness,
      color: 0x9a9084,
      roughness: 1,
      metalness: 0.03,
    }),
  );
  for (const z of [BRIDGE_HALF_LENGTH + 0.2, -(BRIDGE_HALF_LENGTH + 0.2)]) {
    for (const x of [-2.05, 2.05]) {
      const tower = new THREE.Mesh(track(new THREE.BoxGeometry(1.15, 7.2, 1.15)), stoneMaterial);
      tower.position.set(x, DECK_Y + 3.4, z);
      scene.add(tower);
    }
    const beam = new THREE.Mesh(track(new THREE.BoxGeometry(5.4, 0.48, 0.55)), stoneMaterial);
    beam.position.set(0, DECK_Y + 6.8, z);
    scene.add(beam);
  }

  // Bridgehead platform, sandbags and machine-gun nests
  const platform = new THREE.Mesh(
    track(new THREE.BoxGeometry(16, 0.45, 12)),
    track(new THREE.MeshStandardMaterial({ color: 0x28251f, roughness: 0.95 })),
  );
  platform.position.set(0, DECK_Y, BUNKER_CENTER_Z);
  scene.add(platform);

  // Far-bank bunker: Nationalist soldiers fire from openings, not from the bridge.
  const bunkerMaterial = track(
    new THREE.MeshStandardMaterial({
      map: rockDiffuse,
      normalMap: rockNormal,
      roughnessMap: rockRoughness,
      color: 0x8f8576,
      roughness: 1,
      metalness: 0.02,
    }),
  );
  const bunkerDarkMaterial = track(
    new THREE.MeshStandardMaterial({
      map: woodDiffuse,
      normalMap: woodNormal,
      roughnessMap: woodRoughness,
      color: 0x4b3f32,
      roughness: 1,
      metalness: 0.03,
    }),
  );
  const addBunkerBox = (
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    material: THREE.MeshStandardMaterial,
  ): void => {
    const mesh = new THREE.Mesh(
      track(new THREE.BoxGeometry(width, height, depth)),
      material,
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);
  };

  addBunkerBox(13, 1.0, 0.55, 0, DECK_Y + 0.5, BUNKER_WALL_Z, bunkerMaterial);
  for (const x of [-5.5, -3.3, -1.1, 1.1, 3.3, 5.5]) {
    addBunkerBox(0.55, 2.4, 0.55, x, DECK_Y + 1.7, BUNKER_WALL_Z, bunkerMaterial);
  }
  addBunkerBox(13, 0.45, 0.55, 0, DECK_Y + 3.05, BUNKER_WALL_Z, bunkerMaterial);
  addBunkerBox(13, 0.3, 4.7, 0, DECK_Y + 3.35, BUNKER_CENTER_Z + 0.2, bunkerDarkMaterial);
  addBunkerBox(0.55, 3.1, 5.2, -6.25, DECK_Y + 1.55, BUNKER_CENTER_Z, bunkerMaterial);
  addBunkerBox(0.55, 3.1, 5.2, 6.25, DECK_Y + 1.55, BUNKER_CENTER_Z, bunkerMaterial);
  addBunkerBox(13, 3.1, 0.55, 0, DECK_Y + 1.55, BUNKER_CENTER_Z - 2.4, bunkerMaterial);

  for (const x of [-3.3, 3.3]) {
    addBunkerBox(1.1, 0.4, 0.8, x, DECK_Y + 1.15, BUNKER_WALL_Z - 0.4, bunkerDarkMaterial);
    const barrel = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6)),
      bunkerDarkMaterial,
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(x, DECK_Y + 1.35, BUNKER_WALL_Z + 0.15);
    scene.add(barrel);
  }

  // Heavy machine gun in the central firing port. It suppresses the bridge
  // until the scripted grenade in the second charge destroys it.
  const machineGunGroup = new THREE.Group();
  const machineGunMaterial = track(
    new THREE.MeshStandardMaterial({ color: 0x303638, roughness: 0.48, metalness: 0.68 }),
  );
  const shield = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.15, 0.78, 0.14)),
    machineGunMaterial,
  );
  shield.position.set(0, 0.12, 0.24);
  machineGunGroup.add(shield);
  const machineGunBarrel = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.045, 0.045, 1.45, 6)),
    machineGunMaterial,
  );
  machineGunBarrel.rotation.x = Math.PI / 2;
  machineGunBarrel.position.set(0, 0.18, 0.9);
  machineGunGroup.add(machineGunBarrel);
  const ammoBox = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.42, 0.32, 0.48)),
    bunkerDarkMaterial,
  );
  ammoBox.position.set(0.52, -0.22, 0.02);
  machineGunGroup.add(ammoBox);
  const muzzleTexture = track(
    createGlowTexture('rgba(255, 235, 170, 1)', 'rgba(255, 120, 40, 0)'),
  );
  const machineGunMuzzle = new THREE.Sprite(
    track(
      new THREE.SpriteMaterial({
        map: muzzleTexture,
        color: 0xffb15c,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  machineGunMuzzle.position.set(0, 0.18, 1.68);
  machineGunMuzzle.scale.setScalar(0.55);
  machineGunMuzzle.visible = false;
  machineGunGroup.add(machineGunMuzzle);
  machineGunGroup.position.set(0, DECK_Y + 1.3, BUNKER_WALL_Z - 0.35);
  scene.add(machineGunGroup);

  const destroyedSmokeTexture = track(
    createGlowTexture('rgba(75, 78, 76, 0.65)', 'rgba(20, 22, 22, 0)'),
  );
  const destroyedSmoke = new THREE.Sprite(
    track(
      new THREE.SpriteMaterial({
        map: destroyedSmokeTexture,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    ),
  );
  destroyedSmoke.position.copy(machineGunGroup.position);
  destroyedSmoke.position.y += 0.4;
  destroyedSmoke.scale.set(2.8, 2.8, 1);
  destroyedSmoke.visible = false;
  scene.add(destroyedSmoke);

  let machineGunFiring = false;
  let machineGunDestroyed = false;

  const sandbagMaterial = track(
    new THREE.MeshStandardMaterial({ color: 0x6a5e43, roughness: 0.95 }),
  );
  const sandbagGeometry = track(new THREE.CylinderGeometry(0.24, 0.27, 0.5, 7));
  const sandbagTransforms: Array<{ x: number; y: number; z: number; ry: number }> = [];
  for (let i = 0; i < 20; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    sandbagTransforms.push({
      x: side * (2.4 + Math.random() * 2.8),
      y: DECK_Y + 0.25 + (i % 3) * 0.34,
      z: BUNKER_WALL_Z + 0.2 + Math.random() * 1.6,
      ry: Math.random() * 0.4,
    });
  }
  for (let i = 0; i < 10; i += 1) {
    sandbagTransforms.push({
      x: (i % 2 === 0 ? -1 : 1) * (2.2 + Math.random() * 2.4),
      y: DECK_Y + 0.25 + (i % 3) * 0.36,
      z: 27.2 + Math.random() * 1.8,
      ry: Math.random() * 0.5,
    });
  }
  const sandbags = new THREE.InstancedMesh(
    sandbagGeometry,
    sandbagMaterial,
    sandbagTransforms.length,
  );
  sandbagTransforms.forEach((transform, index) => {
    instanceDummy.position.set(transform.x, transform.y, transform.z);
    instanceDummy.rotation.set(0, transform.ry, Math.PI / 2);
    instanceDummy.scale.set(1, 1, 1);
    instanceDummy.updateMatrix();
    sandbags.setMatrixAt(index, instanceDummy.matrix);
  });
  sandbags.instanceMatrix.needsUpdate = true;
  scene.add(sandbags);

  // Red start flag
  const pole = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.035, 0.045, 5, 6)),
    track(new THREE.MeshStandardMaterial({ color: 0x5c4b34, roughness: 0.8 })),
  );
  pole.position.set(3.5, DECK_Y + 2.5, 29);
  scene.add(pole);
  const flag = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1.55, 0.88, 8, 2)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0xa62f27,
        roughness: 0.7,
        side: THREE.DoubleSide,
      }),
    ),
  );
  flag.position.set(4.3, DECK_Y + 4.45, 29);
  scene.add(flag);

  // Cliffs and mountains
  const rockMaterial = track(
    new THREE.MeshStandardMaterial({
      map: rockDiffuse,
      normalMap: rockNormal,
      roughnessMap: rockRoughness,
      color: 0x8a8a86,
      roughness: 1,
      metalness: 0,
    }),
  );
  const mountainMaterial = track(
    new THREE.MeshStandardMaterial({
      map: rockDiffuse,
      normalMap: rockNormal,
      roughnessMap: rockRoughness,
      color: 0x5f6868,
      roughness: 1,
      metalness: 0,
    }),
  );

  // Gorge walls frame the bridge without blocking the central sightline.
  for (const side of [-1, 1]) {
    const cliff = new THREE.Mesh(track(new THREE.BoxGeometry(8, 20, 132)), rockMaterial);
    cliff.position.set(side * 16, 7, 0);
    cliff.rotation.y = side * 0.03;
    scene.add(cliff);

    for (const z of [30, -12, -36]) {
      const shoulder = new THREE.Mesh(
        track(new THREE.ConeGeometry(6, 18, 5)),
        rockMaterial,
      );
      shoulder.position.set(side * (24 + Math.random() * 3), 6, z + Math.random() * 5);
      shoulder.rotation.y = Math.random() * Math.PI;
      scene.add(shoulder);
    }
  }

  const mountainGeometry = track(new THREE.ConeGeometry(1, 1, 5));
  const rockMountainTransforms: Array<{
    x: number;
    y: number;
    z: number;
    radius: number;
    height: number;
    ry: number;
  }> = [];
  const darkMountainTransforms: typeof rockMountainTransforms = [];
  for (let i = 0; i < 16; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const radius = 8 + Math.random() * 8;
    const height = 22 + Math.random() * 32;
    const transform = {
      x: side * (36 + Math.random() * 40),
      y: height / 2 - 2,
      z: -60 + Math.random() * 120,
      radius,
      height,
      ry: Math.random() * Math.PI,
    };
    if (i % 3 === 0) {
      rockMountainTransforms.push(transform);
    } else {
      darkMountainTransforms.push(transform);
    }
  }

  const addMountainInstances = (
    transforms: typeof rockMountainTransforms,
    material: THREE.MeshStandardMaterial,
  ): void => {
    const mesh = new THREE.InstancedMesh(mountainGeometry, material, transforms.length);
    transforms.forEach((transform, index) => {
      instanceDummy.position.set(transform.x, transform.y, transform.z);
      instanceDummy.rotation.set(0, transform.ry, 0);
      instanceDummy.scale.set(transform.radius, transform.height, transform.radius);
      instanceDummy.updateMatrix();
      mesh.setMatrixAt(index, instanceDummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  };
  addMountainInstances(rockMountainTransforms, rockMaterial);
  addMountainInstances(darkMountainTransforms, mountainMaterial);

  // Wet jungle foliage on the gorge walls, matching the reference material.
  const foliageGeometry = track(new THREE.IcosahedronGeometry(1, 0));
  const foliageMaterials = [
    track(new THREE.MeshStandardMaterial({ color: 0x2d4636, roughness: 1 })),
    track(new THREE.MeshStandardMaterial({ color: 0x3c5942, roughness: 1 })),
  ];
  const foliageTransforms: Array<Array<{
    x: number;
    y: number;
    z: number;
    scale: number;
  }>> = [[], []];
  for (let i = 0; i < 42; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    foliageTransforms[i % 2].push({
      x: side * (18 + Math.random() * 18),
      y: 5 + Math.random() * 14,
      z: -60 + Math.random() * 120,
      scale: 1 + Math.random() * 2.6,
    });
  }
  foliageTransforms.forEach((transforms, materialIndex) => {
    const mesh = new THREE.InstancedMesh(
      foliageGeometry,
      foliageMaterials[materialIndex],
      transforms.length,
    );
    transforms.forEach((transform, index) => {
      instanceDummy.position.set(transform.x, transform.y, transform.z);
      instanceDummy.rotation.set(
        Math.random() * 0.4,
        Math.random() * Math.PI,
        Math.random() * 0.4,
      );
      instanceDummy.scale.setScalar(transform.scale);
      instanceDummy.updateMatrix();
      mesh.setMatrixAt(index, instanceDummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);
  });

  // Jungle approach before the bridge.
  const jungleGround = new THREE.Mesh(
    track(new THREE.PlaneGeometry(44, 54)),
    track(new THREE.MeshStandardMaterial({ color: 0x26362b, roughness: 1 })),
  );
  jungleGround.rotation.x = -Math.PI / 2;
  jungleGround.position.set(0, 7.85, 54);
  scene.add(jungleGround);

  const junglePath = new THREE.Mesh(
    track(new THREE.PlaneGeometry(6, 50)),
    track(new THREE.MeshStandardMaterial({ color: 0x4a4336, roughness: 1 })),
  );
  junglePath.rotation.x = -Math.PI / 2;
  junglePath.position.set(0, 7.9, 53);
  scene.add(junglePath);

  const trunkGeometry = track(new THREE.CylinderGeometry(0.22, 0.35, 4, 5));
  const trunkMaterial = track(
    new THREE.MeshStandardMaterial({ color: 0x3f3328, roughness: 1 }),
  );
  const canopyGeometry = track(new THREE.IcosahedronGeometry(1, 0));
  const canopyMaterial = track(
    new THREE.MeshStandardMaterial({ color: 0x2f4a38, roughness: 1 }),
  );
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, 28);
  const canopies = new THREE.InstancedMesh(canopyGeometry, canopyMaterial, 28);
  for (let i = 0; i < 28; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (5 + Math.random() * 13);
    const z = 34 + Math.random() * 42;
    const height = 3 + Math.random() * 3;
    instanceDummy.position.set(x, 8 + height / 2, z);
    instanceDummy.rotation.set(0, Math.random() * Math.PI, 0);
    instanceDummy.scale.set(1, height / 4, 1);
    instanceDummy.updateMatrix();
    trunks.setMatrixAt(i, instanceDummy.matrix);

    const canopyScale = 1.4 + Math.random() * 1.7;
    instanceDummy.position.set(x, 8 + height + 0.6, z);
    instanceDummy.rotation.set(
      Math.random() * 0.3,
      Math.random() * Math.PI,
      Math.random() * 0.3,
    );
    instanceDummy.scale.setScalar(canopyScale);
    instanceDummy.updateMatrix();
    canopies.setMatrixAt(i, instanceDummy.matrix);
  }
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  scene.add(trunks, canopies);

  const bushGeometry = track(new THREE.IcosahedronGeometry(0.8, 0));
  const bushMaterial = track(
    new THREE.MeshStandardMaterial({ color: 0x3a5741, roughness: 1 }),
  );
  const bushes = new THREE.InstancedMesh(bushGeometry, bushMaterial, 22);
  for (let i = 0; i < 22; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    instanceDummy.position.set(side * (3.5 + Math.random() * 10), 8.4, 34 + Math.random() * 42);
    instanceDummy.rotation.set(0, Math.random() * Math.PI, 0);
    instanceDummy.scale.setScalar(0.6 + Math.random() * 0.9);
    instanceDummy.updateMatrix();
    bushes.setMatrixAt(i, instanceDummy.matrix);
  }
  bushes.instanceMatrix.needsUpdate = true;
  scene.add(bushes);

  // Street and ruined houses after the bridgehead.
  const streetGround = new THREE.Mesh(
    track(new THREE.PlaneGeometry(28, 52)),
    track(new THREE.MeshStandardMaterial({ color: 0x3c3a35, roughness: 1 })),
  );
  streetGround.rotation.x = -Math.PI / 2;
  streetGround.position.set(0, 7.85, -58);
  scene.add(streetGround);

  const streetPath = new THREE.Mesh(
    track(new THREE.PlaneGeometry(7, 50)),
    track(new THREE.MeshStandardMaterial({ color: 0x555149, roughness: 1 })),
  );
  streetPath.rotation.x = -Math.PI / 2;
  streetPath.position.set(0, 7.9, -58);
  scene.add(streetPath);

  for (const side of [-1, 1]) {
    for (const z of [-42, -50, -58, -66, -74]) {
      const x = side * (8 + Math.random() * 2.5);
      const height = 3.5 + Math.random() * 2.5;
      const wall = new THREE.Mesh(
        track(new THREE.BoxGeometry(5, height, 6)),
        bunkerMaterial,
      );
      wall.position.set(x, 8 + height / 2, z);
      scene.add(wall);

      const roof = new THREE.Mesh(
        track(new THREE.BoxGeometry(5.6, 0.4, 6.6)),
        bunkerDarkMaterial,
      );
      roof.position.set(x, 8 + height + 0.2, z);
      scene.add(roof);

      const windowMesh = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.12, 1.2, 1.2)),
        bunkerDarkMaterial,
      );
      windowMesh.position.set(x - side * 2.56, 9.6, z);
      scene.add(windowMesh);
    }
  }

  for (let i = 0; i < 14; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const rubble = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.6 + Math.random(), 0.3, 0.7 + Math.random())),
      bunkerDarkMaterial,
    );
    rubble.position.set(side * (2.5 + Math.random() * 7), 8.15, -40 - Math.random() * 32);
    rubble.rotation.y = Math.random() * Math.PI;
    scene.add(rubble);
  }

  // Rain
  const rainCount = 760;
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i += 1) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 100;
    rainPositions[i * 3 + 1] = 4 + Math.random() * 36;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 110;
  }
  const rainGeometry = track(new THREE.BufferGeometry());
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMaterial = track(
    new THREE.PointsMaterial({
      color: 0xa9c7d0,
      size: 0.055,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    }),
  );
  const rain = new THREE.Points(rainGeometry, rainMaterial);
  scene.add(rain);

  // Fire and smoke at the far bridgehead
  const glowTexture = track(createGlowTexture('rgba(255, 214, 130, 1)', 'rgba(255, 94, 30, 0.7)'));
  const smokeTexture = track(createGlowTexture('rgba(160, 170, 170, 0.55)', 'rgba(30, 36, 38, 0)'));
  const fireSprites: Array<{ sprite: THREE.Sprite; baseScale: number; phase: number }> = [];
  for (let i = 0; i < 4; i += 1) {
    const material = track(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xff8e42,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    const sprite = new THREE.Sprite(material);
    const baseScale = 1.0 + Math.random() * 1.2;
    sprite.scale.set(baseScale, baseScale, 1);
    const side = i % 2 === 0 ? -1 : 1;
    sprite.position.set(
      side * (5.4 + Math.random() * 1.2),
      DECK_Y + 1.4,
      BUNKER_WALL_Z + 0.7 - Math.random() * 1.4,
    );
    scene.add(sprite);
    fireSprites.push({ sprite, baseScale, phase: Math.random() * Math.PI * 2 });
  }
  const smokeSprites: Array<{ sprite: THREE.Sprite; speed: number; baseY: number }> = [];
  for (let i = 0; i < 5; i += 1) {
    const material = track(
      new THREE.SpriteMaterial({
        map: smokeTexture,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    );
    const sprite = new THREE.Sprite(material);
    const scale = 4 + Math.random() * 4;
    sprite.scale.set(scale, scale, 1);
    sprite.position.set(-4 + i * 2, DECK_Y + 3.0, BUNKER_CENTER_Z - Math.random() * 2);
    scene.add(sprite);
    smokeSprites.push({ sprite, speed: 0.45 + Math.random() * 0.5, baseY: sprite.position.y });
  }

  let elapsed = 0;
  const rainAttribute = rainGeometry.getAttribute('position') as THREE.BufferAttribute;

  const update = (dt: number): void => {
    elapsed += dt;
    waterTexture.offset.y -= dt * 0.035;
    waterTexture.offset.x += dt * 0.008;

    const positions = rainAttribute.array as Float32Array;
    for (let i = 0; i < rainCount; i += 1) {
      const yIndex = i * 3 + 1;
      positions[yIndex] -= dt * 28;
      if (positions[yIndex] < 1) {
        positions[yIndex] = 38 + Math.random() * 4;
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 110;
      }
    }
    rainAttribute.needsUpdate = true;

    for (const item of fireSprites) {
      const flicker = 0.86 + Math.sin(elapsed * 7 + item.phase) * 0.14;
      item.sprite.scale.set(item.baseScale * flicker, item.baseScale * flicker, 1);
      (item.sprite.material as THREE.SpriteMaterial).opacity = 0.65 + flicker * 0.2;
    }
    bridgeheadFireLight.intensity = 1.8 + Math.sin(elapsed * 8.3) * 0.45;

    for (const item of smokeSprites) {
      item.sprite.position.y += item.speed * dt;
      const material = item.sprite.material as THREE.SpriteMaterial;
      material.opacity = Math.max(0, 0.24 - (item.sprite.position.y - item.baseY) * 0.012);
      if (item.sprite.position.y > item.baseY + 9) {
        item.sprite.position.y = item.baseY;
        material.opacity = 0.22;
      }
    }

    if (machineGunFiring && !machineGunDestroyed) {
      machineGunMuzzle.visible = Math.sin(elapsed * 28) > 0.15;
    } else {
      machineGunMuzzle.visible = false;
    }
    if (destroyedSmoke.visible) {
      (destroyedSmoke.material as THREE.SpriteMaterial).opacity =
        0.45 + Math.sin(elapsed * 3) * 0.12;
    }
  };

  const setMachineGunFiring = (firing: boolean): void => {
    machineGunFiring = firing && !machineGunDestroyed;
    if (!machineGunFiring) machineGunMuzzle.visible = false;
  };

  const destroyMachineGun = (): void => {
    if (machineGunDestroyed) return;
    machineGunDestroyed = true;
    machineGunFiring = false;
    machineGunMuzzle.visible = false;
    machineGunGroup.rotation.z = 0.45;
    machineGunGroup.position.y -= 0.18;
    destroyedSmoke.visible = true;
  };

  const isMachineGunDestroyed = (): boolean => machineGunDestroyed;

  const resize = (nextWidth: number, nextHeight: number): void => {
    const w = Math.max(1, nextWidth);
    const h = Math.max(1, nextHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  const setPixelRatio = (ratio: number): void => {
    renderer.setPixelRatio(Math.max(0.5, ratio));
    renderer.setSize(
      Math.max(1, host.clientWidth || width),
      Math.max(1, host.clientHeight || height),
    );
  };

  const dispose = (): void => {
    for (const item of disposables) item.dispose();
    scene.clear();
    renderer.dispose();
    renderer.domElement.remove();
  };

  return {
    scene,
    renderer,
    camera,
    bounds: {
      minX: -1.55,
      maxX: 1.55,
      minZ: -BRIDGE_HALF_LENGTH,
      maxZ: BRIDGE_HALF_LENGTH,
      deckY: DECK_Y,
      worldMinZ: -78,
      worldMaxZ: 76,
    },
    redSpawn: new THREE.Vector3(0, DECK_Y, 68),
    kmtSpawn: new THREE.Vector3(0, DECK_Y, BUNKER_CENTER_Z),
    machineGun: machineGunGroup,
    update,
    resize,
    setPixelRatio,
    setMachineGunFiring,
    destroyMachineGun,
    isMachineGunDestroyed,
    dispose,
  };
}

function createWaterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.fillStyle = '#3d3b31';
  context.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i += 1) {
    const y = Math.random() * 256;
    const alpha = 0.035 + Math.random() * 0.09;
    context.strokeStyle = `rgba(170, 174, 146, ${alpha})`;
    context.lineWidth = 1 + Math.random() * 1.5;
    context.beginPath();
    context.moveTo(0, y);
    context.bezierCurveTo(
      64,
      y + (Math.random() - 0.5) * 22,
      192,
      y + (Math.random() - 0.5) * 22,
      256,
      y,
    );
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 10);
  texture.anisotropy = 2;
  return texture;
}

function createGlowTexture(inner: string, outer: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(1, outer);
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}
