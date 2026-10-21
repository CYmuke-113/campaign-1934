import * as THREE from 'three';

interface ActiveTracer {
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  life: number;
  maxLife: number;
}

interface ActiveFlash {
  sprite: THREE.Sprite;
  material: THREE.SpriteMaterial;
  life: number;
  maxLife: number;
}

export class TracerSystem {
  private readonly scene: THREE.Scene;
  private readonly tracers: ActiveTracer[] = [];
  private readonly flashes: ActiveFlash[] = [];
  private readonly disposables: Array<{ dispose(): void }> = [];

  constructor(scene: THREE.Scene, tracerCount = 48, flashCount = 24) {
    this.scene = scene;

    for (let i = 0; i < tracerCount; i += 1) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(6), 3),
      );
      const material = new THREE.LineBasicMaterial({
        color: 0xff3b2f,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const line = new THREE.Line(geometry, material);
      line.visible = false;
      line.frustumCulled = false;
      this.scene.add(line);
      this.tracers.push({ line, material, life: 0, maxLife: 0.14 });
      this.disposables.push(geometry, material);
    }

    const flashTexture = this.createFlashTexture();
    this.disposables.push(flashTexture);
    for (let i = 0; i < flashCount; i += 1) {
      const material = new THREE.SpriteMaterial({
        map: flashTexture,
        color: 0xffc06a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.scale.setScalar(0.5);
      this.scene.add(sprite);
      this.flashes.push({ sprite, material, life: 0, maxLife: 0.065 });
      this.disposables.push(material);
    }
  }

  get activeTracerCount(): number {
    return this.tracers.filter((tracer) => tracer.line.visible).length;
  }

  get activeFlashCount(): number {
    return this.flashes.filter((flash) => flash.sprite.visible).length;
  }

  spawn(from: THREE.Vector3, to: THREE.Vector3, life = 0.14): void {
    const tracer = this.tracers.find((item) => !item.line.visible) ?? this.tracers[0];
    const position = tracer.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    position.setXYZ(0, from.x, from.y, from.z);
    position.setXYZ(1, to.x, to.y, to.z);
    position.needsUpdate = true;
    tracer.line.visible = true;
    tracer.life = life;
    tracer.maxLife = life;
    tracer.material.opacity = 0.95;
  }

  spawnMuzzleFlash(position: THREE.Vector3): void {
    const flash = this.flashes.find((item) => !item.sprite.visible) ?? this.flashes[0];
    flash.sprite.position.copy(position);
    flash.sprite.visible = true;
    flash.sprite.scale.setScalar(0.35 + Math.random() * 0.3);
    flash.life = flash.maxLife;
    flash.material.opacity = 0.95;
  }

  update(dt: number): void {
    for (const tracer of this.tracers) {
      if (!tracer.line.visible) continue;
      tracer.life -= dt;
      if (tracer.life <= 0) {
        tracer.line.visible = false;
        tracer.material.opacity = 0;
      } else {
        tracer.material.opacity = 0.95 * (tracer.life / tracer.maxLife);
      }
    }

    for (const flash of this.flashes) {
      if (!flash.sprite.visible) continue;
      flash.life -= dt;
      if (flash.life <= 0) {
        flash.sprite.visible = false;
        flash.material.opacity = 0;
      } else {
        flash.material.opacity = 0.95 * (flash.life / flash.maxLife);
      }
    }
  }

  dispose(): void {
    for (const tracer of this.tracers) {
      this.scene.remove(tracer.line);
    }
    for (const flash of this.flashes) {
      this.scene.remove(flash.sprite);
    }
    for (const item of this.disposables) item.dispose();
    this.tracers.length = 0;
    this.flashes.length = 0;
  }

  private createFlashTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    if (context) {
      const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255, 248, 190, 1)');
      gradient.addColorStop(0.4, 'rgba(255, 165, 65, 0.85)');
      gradient.addColorStop(1, 'rgba(255, 80, 20, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 32, 32);
    }
    return new THREE.CanvasTexture(canvas);
  }
}
