import * as THREE from 'three';
import {
  FIRE_COOLDOWN_SECONDS,
  MAG_SIZE,
  RELOAD_SECONDS,
  RESERVE_AMMO,
} from '../core/constants';

export interface WeaponState {
  mag: number;
  reserve: number;
  reloading: boolean;
}

export interface WeaponCallbacks {
  onShot(): void;
  onHit(botId: string): void;
  onAmmoChange(): void;
}

export class WeaponSystem {
  private mag = MAG_SIZE;
  private reserve = RESERVE_AMMO;
  private reloading = false;
  private reloadTimer = 0;
  private cooldown = 0;
  private dryTimer = 0;
  private recoil = 0;
  private muzzleTimer = 0;
  private enabled = true;

  private readonly raycaster = new THREE.Raycaster();
  private readonly viewmodel: THREE.Group;
  private readonly muzzleFlash: THREE.Sprite;
  private readonly basePosition = new THREE.Vector3(0.3, -0.24, -0.62);
  private readonly disposables: Array<{ dispose(): void }> = [];

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly getTargets: () => THREE.Object3D[],
    private readonly callbacks: WeaponCallbacks,
  ) {
    this.viewmodel = this.createViewmodel();
    this.muzzleFlash = this.createMuzzleFlash();
    this.viewmodel.add(this.muzzleFlash);
    this.camera.add(this.viewmodel);
  }

  get state(): WeaponState {
    return { mag: this.mag, reserve: this.reserve, reloading: this.reloading };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  tryShoot(): void {
    if (!this.enabled || this.reloading || this.cooldown > 0) return;
    if (this.mag <= 0) {
      return;
    }

    this.mag -= 1;
    this.cooldown = FIRE_COOLDOWN_SECONDS;
    this.recoil = Math.min(1, this.recoil + 0.75);
    this.muzzleTimer = 0.045;
    this.muzzleFlash.visible = true;
    this.muzzleFlash.scale.setScalar(0.4 + Math.random() * 0.22);
    this.callbacks.onShot();
    this.castShot();
    this.callbacks.onAmmoChange();

    if (this.mag === 0 && this.reserve === 0) {
      this.dryTimer = 1.2;
    }
  }

  reload(): void {
    if (!this.enabled || this.reloading || this.mag >= MAG_SIZE || this.reserve <= 0) return;
    this.reloading = true;
    this.reloadTimer = RELOAD_SECONDS;
    this.callbacks.onAmmoChange();
  }

  refill(): void {
    this.mag = MAG_SIZE;
    this.reserve = RESERVE_AMMO;
    this.reloading = false;
    this.reloadTimer = 0;
    this.dryTimer = 0;
    this.callbacks.onAmmoChange();
  }

  update(dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.muzzleTimer = Math.max(0, this.muzzleTimer - dt);
    if (this.muzzleTimer <= 0) {
      this.muzzleFlash.visible = false;
    }

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const needed = MAG_SIZE - this.mag;
        const transferred = Math.min(needed, this.reserve);
        this.mag += transferred;
        this.reserve -= transferred;
        this.reloading = false;
        this.reloadTimer = 0;
        this.callbacks.onAmmoChange();
      }
    }

    if (this.mag === 0 && this.reserve === 0 && !this.reloading) {
      this.dryTimer -= dt;
      if (this.dryTimer <= 0) {
        this.refill();
      }
    }

    this.recoil = Math.max(0, this.recoil - dt * 5.5);
    const reloadTilt = this.reloading ? -0.34 : 0;
    this.viewmodel.position.set(
      this.basePosition.x,
      this.basePosition.y - this.recoil * 0.035 + (this.reloading ? -0.16 : 0),
      this.basePosition.z + this.recoil * 0.09,
    );
    this.viewmodel.rotation.x +=
      (this.recoil * 0.16 - this.viewmodel.rotation.x) * Math.min(1, dt * 12);
    this.viewmodel.rotation.z +=
      (reloadTilt - this.viewmodel.rotation.z) * Math.min(1, dt * 8);
  }

  dispose(): void {
    this.camera.remove(this.viewmodel);
    for (const item of this.disposables) item.dispose();
    this.viewmodel.clear();
  }

  private castShot(): void {
    const spread = 0.007;
    this.raycaster.setFromCamera(
      new THREE.Vector2(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
      ),
      this.camera,
    );
    this.raycaster.far = 140;

    const intersections = this.raycaster.intersectObjects(this.getTargets(), false);
    for (const intersection of intersections) {
      const botId = intersection.object.userData.botId as string | undefined;
      const faction = intersection.object.userData.faction as string | undefined;
      if (!botId) continue;
      if (faction === 'red') {
        return;
      }
      if (faction === 'kmt') {
        this.callbacks.onHit(botId);
        return;
      }
    }
  }

  private createViewmodel(): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(this.basePosition);
    group.renderOrder = 10;

    const metal = new THREE.MeshBasicMaterial({
      color: 0x3a4247,
      depthTest: false,
      depthWrite: false,
    });
    const darkMetal = new THREE.MeshBasicMaterial({
      color: 0x1b2023,
      depthTest: false,
      depthWrite: false,
    });
    const wood = new THREE.MeshBasicMaterial({
      color: 0x6b4b2e,
      depthTest: false,
      depthWrite: false,
    });
    const sight = new THREE.MeshBasicMaterial({
      color: 0xbfa36a,
      depthTest: false,
      depthWrite: false,
    });
    this.disposables.push(metal, darkMetal, wood, sight);

    const bodyGeometry = new THREE.BoxGeometry(0.065, 0.075, 0.52);
    const stockGeometry = new THREE.BoxGeometry(0.07, 0.11, 0.26);
    const handguardGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.28);
    const barrelGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.48, 6);
    const sightGeometry = new THREE.BoxGeometry(0.02, 0.04, 0.035);
    this.disposables.push(
      bodyGeometry,
      stockGeometry,
      handguardGeometry,
      barrelGeometry,
      sightGeometry,
    );

    const body = new THREE.Mesh(bodyGeometry, metal);
    body.position.set(0, 0, -0.06);
    body.renderOrder = 10;
    group.add(body);

    const stock = new THREE.Mesh(stockGeometry, wood);
    stock.position.set(0, -0.055, 0.29);
    stock.rotation.x = -0.12;
    stock.renderOrder = 10;
    group.add(stock);

    const handguard = new THREE.Mesh(handguardGeometry, wood);
    handguard.position.set(0, 0.005, -0.34);
    handguard.renderOrder = 10;
    group.add(handguard);

    const barrel = new THREE.Mesh(barrelGeometry, darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.015, -0.6);
    barrel.renderOrder = 10;
    group.add(barrel);

    const sightMesh = new THREE.Mesh(sightGeometry, sight);
    sightMesh.position.set(0, 0.06, -0.22);
    sightMesh.renderOrder = 10;
    group.add(sightMesh);

    return group;
  }

  private createMuzzleFlash(): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 246, 190, 1)');
      gradient.addColorStop(0.4, 'rgba(255, 175, 70, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 100, 20, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: 0xffc37a,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    this.disposables.push(texture, material);
    const sprite = new THREE.Sprite(material);
    sprite.position.set(0, 0.02, -0.86);
    sprite.scale.setScalar(0.5);
    sprite.visible = false;
    sprite.renderOrder = 11;
    return sprite;
  }
}
