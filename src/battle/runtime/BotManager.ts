import * as THREE from 'three';
import { SHOT_DAMAGE } from '../core/constants';
import { isBlockedAt, type Collider } from '../core/collision';
import type { BattleZone, Faction } from '../core/types';
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
  spawnTracer(from: THREE.Vector3, to: THREE.Vector3): void;
  spawnMuzzleFlash(position: THREE.Vector3): void;
  hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean;
}

export interface BotManagerOptions {
  scene: THREE.Scene;
  colliders?: Collider[];
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
  zone: BattleZone = 'jungle';
  state: BotState = 'advance';
  targetZ = 40;
  laneX = 0;
  speed = 1.4;
  fireTimer = 0;
  retargetTimer = 0;
  dodgeTimer = 0;
  dodgeDir = 1;
  strafeTime = Math.random() * 10;
  burstRemaining = 0;
  burstTimer = 0;
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
    this.dodgeTimer = 0;
    this.dodgeDir = 1;
    this.burstRemaining = 0;
    this.burstTimer = 0;
    this.strafeTime = Math.random() * 10;
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

  resetView(): void {
    this.view.reset();
  }

  setPhase(phaseIndex: number): void {
    if (this.zone === 'jungle') {
      this.targetZ =
        this.faction === 'red'
          ? 38 + Math.random() * 12 - (this.isKey ? 1.5 : 0)
          : 44 + Math.random() * 12;
    } else if (this.zone === 'street') {
      this.targetZ =
        this.faction === 'red'
          ? -46 - Math.random() * 10 - (this.isKey ? 1.5 : 0)
          : -58 - Math.random() * 14;
    } else if (this.faction === 'red') {
      const targets = [27, 10, -8, -24];
      const spread = [2, 8, 8, 2];
      const base = targets[Math.min(phaseIndex, targets.length - 1)];
      const range = spread[Math.min(phaseIndex, spread.length - 1)];
      this.targetZ = base + Math.random() * range - (this.isKey ? 1.5 : 0);
    } else {
      // Nationalist troops hold inside the far-bank bunker, never on the bridge.
      this.targetZ = -34.5 - Math.random() * 2.5;
    }

    this.state = this.group.position.z > this.targetZ ? 'advance' : 'hold';
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp > 0) {
      this.dodgeTimer = 0.35;
      this.dodgeDir = Math.random() > 0.5 ? 1 : -1;
      this.strafeTime += 0.7;
      return false;
    }

    const onBridge =
      this.zone === 'bridge' &&
      this.group.position.z > -30 &&
      this.group.position.z < 30 &&
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

    this.strafeTime += dt;
    const maxX = this.zone === 'bridge' ? 1.35 : 6.5;
    if (this.dodgeTimer > 0) {
      this.dodgeTimer -= dt;
      this.group.position.x = THREE.MathUtils.clamp(
        this.group.position.x + this.dodgeDir * 3.2 * dt,
        -maxX,
        maxX,
      );
    } else if (this.state === 'hold') {
      this.group.position.x = THREE.MathUtils.clamp(
        this.group.position.x + Math.sin(this.strafeTime * 1.6) * 0.55 * dt,
        -maxX,
        maxX,
      );
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
  private readonly colliders: Collider[];
  private readonly onBotDowned: (bot: Bot, killedByPlayer: boolean) => void;
  private readonly bots: Bot[] = [];
  private readonly raycastTargets: THREE.Object3D[] = [];
  private nextId = 1;
  private phaseIndex = 0;
  private zone: BattleZone = 'jungle';
  private kmtAccuracy = 0.2;
  private selfFallTimer = 8 + Math.random() * 8;
  private kmtFireRate = 1;

  constructor(options: BotManagerOptions) {
    this.assets = createSoldierAssets();
    this.scene = options.scene;
    this.colliders = options.colliders ?? [];
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
      bot.zone = this.zone;
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

  setBattleZone(zone: BattleZone): void {
    if (this.zone === zone) return;
    this.zone = zone;

    for (const bot of this.bots) {
      if (!bot.alive) continue;
      bot.zone = zone;
      bot.group.position.copy(this.makeSpawnPosition(bot.faction));
      bot.group.rotation.set(0, bot.faction === 'red' ? Math.PI : 0, 0);
      bot.fireTimer = 0.8 + Math.random() * 1.4;
      bot.burstRemaining = 0;
      bot.burstTimer = 0;
      bot.dodgeTimer = 0;
      bot.resetView();
      bot.setPhase(this.phaseIndex);
    }
    this.refreshRaycastTargets();
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

      const previousX = bot.group.position.x;
      const previousZ = bot.group.position.z;
      bot.updateMovement(dt);
      this.avoidPlayer(bot, world.playerPosition);
      if (isBlockedAt(this.colliders, bot.group.position.x, bot.group.position.z, 1.0, 0.4)) {
        bot.group.position.x = previousX;
        bot.group.position.z = previousZ;
      }
      bot.retargetTimer -= dt;
      if (bot.retargetTimer <= 0 || !this.isTargetValid(bot)) {
        bot.target = this.chooseTarget(bot, world);
        bot.retargetTimer = 0.8 + Math.random() * 1.2;
      }

      if (bot.target) {
        if (bot.burstRemaining > 0) {
          bot.burstTimer -= dt;
          if (bot.burstTimer <= 0) {
            this.fireAtTarget(bot, world);
            bot.burstRemaining -= 1;
            bot.burstTimer = 0.14 + Math.random() * 0.05;
            if (bot.burstRemaining <= 0) {
              const base =
                bot.faction === 'kmt' ? 1.6 / Math.max(0.3, this.kmtFireRate) : 1.7;
              bot.fireTimer = base * (0.75 + Math.random() * 0.5);
            }
          }
        } else {
          bot.fireTimer -= dt;
          if (bot.fireTimer <= 0) {
            bot.burstRemaining = 3 + Math.floor(Math.random() * 3);
            bot.burstTimer = 0;
          }
        }
      }
    }

    this.maybeSelfFall(dt);
  }

  private maybeSelfFall(dt: number): Bot | null {
    this.selfFallTimer -= dt;
    if (this.selfFallTimer > 0) return null;
    this.selfFallTimer = 9 + Math.random() * 10;
    if (this.phaseIndex < 1 || this.zone !== 'bridge') return null;

    const candidates = this.bots.filter(
      (bot) =>
        bot.alive &&
        bot.faction === 'red' &&
        !bot.isKey &&
        bot.group.position.z > -30 &&
        bot.group.position.z < 30 &&
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
    const maxX = this.zone === 'bridge' ? 1.95 : 6.8;
    bot.group.position.x = THREE.MathUtils.clamp(
      playerPosition.x + side * 1.7,
      -maxX,
      maxX,
    );
  }

  private fireAtTarget(bot: Bot, world: BotWorld): void {
    if (!bot.target) return;
    const accuracy = bot.faction === 'kmt' ? this.kmtAccuracy : 0.2;
    const hit = Math.random() < accuracy;
    const origin = bot.group.position.clone();
    origin.y += 1.2;
    let targetPoint = origin.clone().add(new THREE.Vector3(0, 0, -24));
    let targetBot: Bot | null = null;

    if (bot.target.kind === 'player') {
      targetPoint = world.playerPosition.clone();
      targetPoint.y += 1.4;
    } else if (bot.target.botId) {
      targetBot = this.bots.find((candidate) => candidate.id === bot.target?.botId) ?? null;
      if (targetBot) {
        targetPoint = targetBot.group.position.clone();
        targetPoint.y += 1.2;
      }
    }

    if (!world.hasLineOfSight(origin, targetPoint)) {
      return;
    }

    if (bot.target.kind === 'player') {
      if (hit && world.playerAlive) {
        world.damagePlayer(SHOT_DAMAGE);
      }
    } else if (targetBot && targetBot.alive && hit) {
      this.hitBot(targetBot.id, SHOT_DAMAGE, 'bot');
    }

    world.spawnTracer(origin, targetPoint);
    world.spawnMuzzleFlash(origin);
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
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = this.randomSpawnPosition(faction);
      const clear =
        !isBlockedAt(this.colliders, candidate.x, candidate.z, 1.0, 0.4) &&
        this.bots.every(
          (bot) =>
            !bot.alive ||
            !bot.group.visible ||
            bot.group.position.distanceTo(candidate) > 2.2,
        );
      if (clear) return candidate;
    }
    return this.randomSpawnPosition(faction);
  }

  private randomSpawnPosition(faction: Faction): THREE.Vector3 {
    if (this.zone === 'jungle') {
      if (faction === 'red') {
        return new THREE.Vector3((Math.random() - 0.5) * 22, 8, 62 + Math.random() * 16);
      }
      return new THREE.Vector3((Math.random() - 0.5) * 24, 8, 40 + Math.random() * 22);
    }

    if (this.zone === 'street') {
      if (faction === 'red') {
        return new THREE.Vector3((Math.random() - 0.5) * 18, 8, -38 - Math.random() * 16);
      }
      return new THREE.Vector3((Math.random() - 0.5) * 22, 8, -56 - Math.random() * 24);
    }

    if (faction === 'red') {
      const lane = (Math.random() - 0.5) * 1.7;
      return new THREE.Vector3(lane, 8, 27.5 + Math.random() * 2.0);
    }
    return new THREE.Vector3((Math.random() - 0.5) * 8, 8, -33 - Math.random() * 4);
  }

  private refreshRaycastTargets(): void {
    this.raycastTargets.length = 0;
    for (const bot of this.bots) {
      if (!bot.alive || !bot.group.visible) continue;
      this.raycastTargets.push(...bot.hitMeshes);
    }
  }
}
