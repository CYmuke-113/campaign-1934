import * as THREE from 'three';
import { SHOT_DAMAGE } from '../core/constants';
import type { Faction } from '../core/types';
import {
  createSoldier,
  createSoldierAssets,
  type SoldierAssets,
  type SoldierView,
} from '../three/SoldierView';

export interface BotWorld {
  playerPosition: THREE.Vector3;
  playerAlive: boolean;
  playerDowned: boolean;
  damagePlayer(amount: number): void;
  playBotShot(faction: Faction, position: THREE.Vector3): void;
}

export interface BotManagerOptions {
  scene: THREE.Scene;
  onBotDowned: (bot: Bot, killedByPlayer: boolean) => void;
}

type BotState = 'advance' | 'hold' | 'retreat' | 'downed' | 'falling';

interface BotTarget {
  kind: 'player' | 'bot';
  botId?: string;
}

export class Bot {
  readonly id: string;
  faction: Faction;
  isKey: boolean;
  alive = true;
  hp = 100;
  state: BotState = 'advance';
  targetZ = 40;
  laneX = 0;
  speed = 1.4;
  fireTimer = 0;
  retargetTimer = 0;
  target: BotTarget | null = null;
  deathTimer = 0;
  inactive = false;
  fallVelocity = 0;
  fallSide = 1;

  readonly group: THREE.Group;
  readonly hitMeshes: THREE.Mesh[];

  private readonly view: SoldierView;

  constructor(id: string, assets: SoldierAssets, faction: Faction, isKey: boolean, position: THREE.Vector3) {
    this.id = id;
    this.faction = faction;
    this.isKey = isKey;

    this.view = createSoldier(assets, faction, isKey);
    this.group = this.view.group;
    this.hitMeshes = [this.view.upper, this.view.leftLeg, this.view.rightLeg];

    for (const mesh of this.hitMeshes) {
      mesh.userData.botId = id;
      mesh.userData.faction = faction;
    }

    this.reset(faction, isKey, position);
  }

  reset(faction: Faction, isKey: boolean, position: THREE.Vector3): void {
    this.faction = faction;
    this.isKey = isKey;
    this.alive = true;
    this.inactive = false;
    this.hp = 100;
    this.state = 'advance';
    this.deathTimer = 0;
    this.fallVelocity = 0;
    this.fallSide = 1;
    this.fireTimer = 0.8 + Math.random() * 1.4;
    this.retargetTimer = Math.random() * 0.8;
    this.target = null;
    this.speed = faction === 'red' ? 1.25 + Math.random() * 0.55 : 0.7 + Math.random() * 0.35;
    this.laneX = (Math.random() - 0.5) * 1.9;
    if (isKey) this.laneX = (Math.random() - 0.5) * 1.2;
    if (faction === 'kmt') this.laneX = (Math.random() - 0.5) * 8;
    this.group.visible = true;
    this.group.position.copy(position);
    this.group.rotation.set(0, faction === 'red' ? Math.PI : 0, 0);
    this.view.reset();
    this.setPhase(0);
  }

  setPhase(phaseIndex: number): void {
    if (this.faction === 'red') {
      const targets = [42, 14, -16, -38];
      const spread = [2, 8, 8, 2];
      const base = targets[Math.min(phaseIndex, targets.length - 1)];
      const range = spread[Math.min(phaseIndex, spread.length - 1)];
      this.targetZ = base + Math.random() * range - (this.isKey ? 1.5 : 0);
      this.state = this.group.position.z > this.targetZ ? 'advance' : 'hold';
    } else {
      // Nationalist troops hold inside the far-bank bunker, never on the bridge.
      this.targetZ = -49.5 - Math.random() * 2.5;
      this.state = this.group.position.z > this.targetZ ? 'advance' : 'hold';
    }
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp > 0) return false;

    const onBridge =
      this.group.position.z > -45 &&
      this.group.position.z < 45 &&
      Math.abs(this.group.position.x) < 1.5;
    if (onBridge) {
      const side = this.group.position.x === 0
        ? (Math.random() > 0.5 ? 1 : -1)
        : Math.sign(this.group.position.x);
      this.fallOffBridge(side);
      return true;
    }

    this.view.setMoving(false);
    this.alive = false;
    this.state = 'downed';
    this.deathTimer = 3.2;
    this.group.rotation.z = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 2);
    this.group.position.y = 8.16;
    return true;
  }

  fallOffBridge(side: number): void {
    if (!this.alive && this.state === 'falling') return;
    this.view.setMoving(false);
    this.alive = false;
    this.hp = 0;
    this.state = 'falling';
    this.deathTimer = 5;
    this.fallSide = side === 0 ? 1 : Math.sign(side);
    this.fallVelocity = 1.5;
    this.group.rotation.z = this.fallSide * 0.3;
  }

  tickDeath(dt: number): void {
    if (this.alive) return;

    if (this.state === 'falling') {
      this.fallVelocity += 16 * dt;
      this.group.position.y -= this.fallVelocity * dt;
      this.group.position.x += this.fallSide * 1.4 * dt;
      this.group.rotation.z += this.fallSide * 1.8 * dt;
      if (this.group.position.y < 0.2 && this.group.visible) {
        this.group.visible = false;
        this.inactive = true;
      }
      return;
    }

    this.deathTimer -= dt;
    if (this.deathTimer <= 0 && this.group.visible) {
      this.group.visible = false;
      this.inactive = true;
    }
  }

  updateMovement(dt: number): void {
    if (!this.alive) return;

    if (this.state === 'retreat') {
      this.view.setMoving(true);
      this.view.update(dt);
      this.group.position.z -= 3.2 * dt;
      if (this.group.position.z < -58) {
        this.group.visible = false;
      }
      return;
    }

    const dz = this.targetZ - this.group.position.z;
    const dx = this.laneX - this.group.position.x;
    const distance = Math.hypot(dx, dz);

    if (Math.abs(dz) > 0.35 && this.state === 'advance') {
      const step = Math.min(Math.abs(dz), this.speed * dt);
      this.group.position.z += Math.sign(dz) * step;
    } else {
      this.state = 'hold';
    }

    if (Math.abs(dx) > 0.05) {
      this.group.position.x += Math.sign(dx) * Math.min(Math.abs(dx), this.speed * 0.5 * dt);
    }

    const moving = distance > 0.4 && this.state === 'advance';
    this.view.setMoving(moving);
    this.view.update(dt);
    this.group.position.y = 8;
  }

  dispose(): void {
    for (const mesh of this.hitMeshes) {
      mesh.userData.botId = undefined;
      mesh.userData.faction = undefined;
    }
  }
}

export class BotManager {
  private readonly assets: SoldierAssets;
  private readonly scene: THREE.Scene;
  private readonly onBotDowned: (bot: Bot, killedByPlayer: boolean) => void;
  private readonly bots: Bot[] = [];
  private readonly raycastTargets: THREE.Object3D[] = [];
  private nextId = 1;
  private phaseIndex = 0;
  private kmtAccuracy = 0.2;
  private selfFallTimer = 8 + Math.random() * 8;
  private kmtFireRate = 1;

  constructor(options: BotManagerOptions) {
    this.assets = createSoldierAssets();
    this.scene = options.scene;
    this.onBotDowned = options.onBotDowned;
  }

  get aliveRed(): number {
    return this.bots.filter((bot) => bot.alive && bot.faction === 'red').length;
  }

  get aliveKmt(): number {
    return this.bots.filter((bot) => bot.alive && bot.faction === 'kmt').length;
  }

  spawn(faction: Faction, count: number, isKey = false): boolean {
    let spawned = 0;
    for (let i = 0; i < count; i += 1) {
      let bot = this.bots.find(
        (candidate) => candidate.inactive && candidate.faction === faction,
      );
      if (!bot) {
        if (this.bots.length >= 60) break;
        bot = new Bot(
          `bot_${this.nextId}`,
          this.assets,
          faction,
          isKey,
          new THREE.Vector3(0, 8, 0),
        );
        this.nextId += 1;
        this.scene.add(bot.group);
        this.bots.push(bot);
      }
      if (!bot) break;
      const position = this.makeSpawnPosition(faction);
      bot.reset(faction, isKey, position);
      bot.setPhase(this.phaseIndex);
      spawned += 1;
    }
    this.refreshRaycastTargets();
    return spawned === count;
  }

  setPhase(phaseIndex: number): void {
    this.phaseIndex = phaseIndex;
    this.bots.forEach((bot) => {
      if (bot.alive) bot.setPhase(phaseIndex);
    });
  }

  setKmtModifiers(accuracy: number, fireRate: number): void {
    this.kmtAccuracy = accuracy;
    this.kmtFireRate = fireRate;
  }

  retreatKmt(): void {
    this.bots.forEach((bot) => {
      if (bot.alive && bot.faction === 'kmt') {
        bot.state = 'retreat';
      }
    });
  }

  hitBot(botId: string, damage: number, source: 'player' | 'bot'): boolean {
    const bot = this.bots.find((candidate) => candidate.id === botId);
    if (!bot || !bot.alive) return false;
    const downed = bot.takeDamage(damage);
    if (downed) {
      this.onBotDowned(bot, source === 'player');
    }
    this.refreshRaycastTargets();
    return true;
  }

  getRaycastTargets(): THREE.Object3D[] {
    return this.raycastTargets;
  }

  getBots(): readonly Bot[] {
    return this.bots;
  }

  debugTriggerSelfFall(): Bot | null {
    this.selfFallTimer = 0;
    return this.maybeSelfFall(0.1);
  }

  update(dt: number, world: BotWorld): void {
    this.refreshRaycastTargets();

    for (const bot of this.bots) {
      if (!bot.alive) {
        bot.tickDeath(dt);
        continue;
      }
      if (!bot.group.visible) continue;

      bot.updateMovement(dt);
      this.avoidPlayer(bot, world.playerPosition);
      bot.retargetTimer -= dt;
      if (bot.retargetTimer <= 0 || !this.isTargetValid(bot)) {
        bot.target = this.chooseTarget(bot, world);
        bot.retargetTimer = 0.8 + Math.random() * 1.2;
      }

      bot.fireTimer -= dt;
      if (bot.fireTimer <= 0 && bot.target) {
        this.fireAtTarget(bot, world);
        const base = bot.faction === 'kmt' ? 1.6 / Math.max(0.3, this.kmtFireRate) : 1.7;
        bot.fireTimer = base * (0.75 + Math.random() * 0.5);
      }
    }

    this.maybeSelfFall(dt);
  }

  private maybeSelfFall(dt: number): Bot | null {
    this.selfFallTimer -= dt;
    if (this.selfFallTimer > 0) return null;
    this.selfFallTimer = 9 + Math.random() * 10;
    if (this.phaseIndex < 1) return null;

    const candidates = this.bots.filter(
      (bot) =>
        bot.alive &&
        bot.faction === 'red' &&
        !bot.isKey &&
        bot.group.position.z > -42 &&
        bot.group.position.z < 45 &&
        Math.abs(bot.group.position.x) < 1.4,
    );
    if (candidates.length === 0) return null;

    const bot = candidates[Math.floor(Math.random() * candidates.length)];
    bot.fallOffBridge(Math.random() > 0.5 ? 1 : -1);
    this.onBotDowned(bot, false);
    this.refreshRaycastTargets();
    return bot;
  }

  dispose(): void {
    for (const bot of this.bots) {
      this.scene.remove(bot.group);
      bot.dispose();
    }
    this.bots.length = 0;
    this.raycastTargets.length = 0;
    this.assets.dispose();
  }

  private avoidPlayer(bot: Bot, playerPosition: THREE.Vector3): void {
    if (bot.faction !== 'red') return;
    const dx = bot.group.position.x - playerPosition.x;
    const dz = bot.group.position.z - playerPosition.z;
    if (Math.hypot(dx, dz) >= 1.55) return;

    const parity = Number(bot.id.split('_')[1] ?? 1) % 2 === 0 ? 1 : -1;
    const side = Math.abs(dx) > 0.08 ? Math.sign(dx) : parity;
    bot.group.position.x = THREE.MathUtils.clamp(
      playerPosition.x + side * 1.7,
      -1.95,
      1.95,
    );
  }

  private fireAtTarget(bot: Bot, world: BotWorld): void {
    if (!bot.target) return;
    const accuracy = bot.faction === 'kmt' ? this.kmtAccuracy : 0.2;
    const hit = Math.random() < accuracy;

    if (bot.target.kind === 'player') {
      if (hit && world.playerAlive) {
        world.damagePlayer(SHOT_DAMAGE);
      }
    } else if (bot.target.botId) {
      const target = this.bots.find((candidate) => candidate.id === bot.target?.botId);
      if (target && target.alive && hit) {
        this.hitBot(target.id, SHOT_DAMAGE, 'bot');
      }
    }

    world.playBotShot(bot.faction, bot.group.position);
  }

  private chooseTarget(bot: Bot, world: BotWorld): BotTarget | null {
    if (bot.faction === 'red') {
      const candidate = this.nearestBot(bot, 'kmt');
      return candidate ? { kind: 'bot', botId: candidate.id } : null;
    }

    if (world.playerAlive && !world.playerDowned && Math.random() < 0.22) {
      const distance = bot.group.position.distanceTo(world.playerPosition);
      if (distance < 55) {
        return { kind: 'player' };
      }
    }

    const candidate = this.nearestBot(bot, 'red');
    return candidate ? { kind: 'bot', botId: candidate.id } : null;
  }

  private nearestBot(bot: Bot, faction: Faction): Bot | null {
    let nearest: Bot | null = null;
    let nearestDistance = Infinity;
    for (const candidate of this.bots) {
      if (!candidate.alive || candidate.faction !== faction || candidate === bot) continue;
      const distance = candidate.group.position.distanceTo(bot.group.position);
      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  private isTargetValid(bot: Bot): boolean {
    if (!bot.target) return false;
    if (bot.target.kind === 'player') return true;
    const target = this.bots.find((candidate) => candidate.id === bot.target?.botId);
    return Boolean(target && target.alive);
  }

  private makeSpawnPosition(faction: Faction): THREE.Vector3 {
    if (faction === 'red') {
      const lane = (Math.random() - 0.5) * 1.7;
      return new THREE.Vector3(lane, 8, 43 + Math.random() * 2.2);
    }
    return new THREE.Vector3((Math.random() - 0.5) * 8, 8, -48 - Math.random() * 4);
  }

  private refreshRaycastTargets(): void {
    this.raycastTargets.length = 0;
    for (const bot of this.bots) {
      if (!bot.alive || !bot.group.visible) continue;
      this.raycastTargets.push(...bot.hitMeshes);
    }
  }
}
