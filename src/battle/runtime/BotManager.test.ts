import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Bot, BotManager, type BotWorld } from './BotManager';
import { createSoldierAssets } from '../three/SoldierView';

function createWorld(): BotWorld {
  return {
    playerPosition: new THREE.Vector3(0, 9.65, 40),
    playerAlive: false,
    playerDowned: true,
    damagePlayer: vi.fn(),
    playBotShot: vi.fn(),
  };
}

describe('Bot falling', () => {
  it('drops a bot off the bridge when it is downed on the deck', () => {
    const assets = createSoldierAssets();
    const bot = new Bot('bot_test', assets, 'red', false, new THREE.Vector3(0, 8, 0));

    expect(bot.takeDamage(100)).toBe(true);
    expect(bot.alive).toBe(false);
    expect(bot.state).toBe('falling');

    const startY = bot.group.position.y;
    for (let i = 0; i < 20; i += 1) {
      bot.tickDeath(0.1);
    }
    expect(bot.group.position.y).toBeLessThan(startY);
    expect(bot.group.visible).toBe(false);

    bot.dispose();
    assets.dispose();
  });

  it('can trigger a red bot to fall on its own and notifies the director', () => {
    const scene = new THREE.Scene();
    const onBotDowned = vi.fn();
    const manager = new BotManager({ scene, onBotDowned });
    manager.spawn('red', 1, false);
    manager.setPhase(1);
    manager.getBots()[0].group.position.set(0, 8, 30);

    const falling = manager.debugTriggerSelfFall();
    expect(falling).not.toBeNull();
    expect(falling?.state).toBe('falling');
    expect(onBotDowned).toHaveBeenCalledWith(falling, false);

    const startY = falling!.group.position.y;
    const world = createWorld();
    manager.update(0.1, world);
    expect(falling!.group.position.y).toBeLessThan(startY);

    manager.dispose();
  });
});
