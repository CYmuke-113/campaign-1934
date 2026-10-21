import { expect, test, type Page } from '@playwright/test';

async function completeQuiz(page: Page): Promise<void> {
  await expect(page.getByTestId('quiz-screen')).toBeVisible();
  for (let question = 0; question < 5; question += 1) {
    await page.locator('[data-correct="true"]').click();
    await page.getByTestId('quiz-next').click();
  }
  await expect(page.getByTestId('quiz-complete')).toBeVisible();
  await expect(page.getByTestId('quiz-score')).toContainText('5');
  await page.getByTestId('quiz-finish').click();
}

test('walks from the introduction to the battle shell and back', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('h1.intro-title')).toContainText('长征');
  await expect(page.getByTestId('intro-next')).toBeVisible();
  await page.getByTestId('intro-next').click();

  await expect(page.locator('[data-battle-id]')).toHaveCount(6);
  await expect(page.getByTestId('battle-card-luding')).toBeVisible();

  await page.getByTestId('battle-card-xiangjiang').click({ force: true });
  await expect(page.getByTestId('coming-soon')).toBeVisible();
  await expect(page.getByTestId('coming-soon')).toContainText('即将开放');

  await page.getByTestId('battle-card-luding').click();
  await expect(page.getByTestId('battle-loading')).toBeVisible();
  await expect(page.getByTestId('battle-screen')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('canvas')).toBeVisible();

  await expect(page.getByTestId('pause-overlay')).not.toHaveClass(/is-open/);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('pause-overlay')).toHaveClass(/is-open/);

  await page.getByTestId('pause-resume').click();
  await expect(page.getByTestId('pause-overlay')).not.toHaveClass(/is-open/);

  page.on('dialog', (dialog) => dialog.accept());
  await page.keyboard.press('Escape');
  await page.getByTestId('pause-exit').click();

  await expect(page.locator('[data-battle-id]')).toHaveCount(6);
});

test('battle deploys bots without showing faction counts', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByTestId('intro-next').click();
  await page.getByTestId('battle-card-luding').click();

  await expect(page.getByTestId('battle-screen')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('[data-hud="phase"]')).toContainText('丛林接敌');

  const counts = await page.evaluate(() => {
    const snapshot = (window as unknown as { __battleDebug: any }).__battleDebug.director.snapshot;
    return { red: snapshot.redAlive, kmt: snapshot.kmtAlive };
  });
  expect(counts.red + counts.kmt).toBeGreaterThanOrEqual(30);
  expect(counts.red + counts.kmt).toBeLessThanOrEqual(40);
  expect(counts.red).toBeGreaterThan(counts.kmt);
  await expect(page.locator('.hud-counts')).toHaveCount(0);
});

test('player can lock the pointer, move, and fire', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByTestId('intro-next').click();
  await page.getByTestId('battle-card-luding').click();
  await expect(page.getByTestId('battle-screen')).toBeVisible({ timeout: 15_000 });

  const startZ = await page.evaluate(
    () => (window as unknown as { __battleDebug: any }).__battleDebug.camera.position.z,
  );

  await page.mouse.click(640, 360);
  await page.waitForTimeout(250);
  const locked = await page.evaluate(
    () => (window as unknown as { __battleDebug: any }).__battleDebug.player.isLocked,
  );
  expect(locked).toBe(true);

  await page.keyboard.down('KeyW');
  await page.waitForTimeout(800);
  await page.keyboard.up('KeyW');
  const endZ = await page.evaluate(
    () => (window as unknown as { __battleDebug: any }).__battleDebug.camera.position.z,
  );
  expect(endZ).toBeLessThan(startZ);

  const ammoBefore = Number(await page.locator('[data-hud="ammo-mag"]').textContent());
  await page.mouse.click(640, 360);
  await page.waitForTimeout(250);
  const ammoAfter = Number(await page.locator('[data-hud="ammo-mag"]').textContent());
  expect(ammoAfter).toBeLessThan(ammoBefore);
});

test('rifle uses automatic fire and reloads automatically when empty', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByTestId('intro-next').click();
  await page.getByTestId('battle-card-luding').click();
  await expect(page.getByTestId('battle-screen')).toBeVisible({ timeout: 15_000 });

  const result = await page.evaluate(() => {
    const weapon = (window as unknown as { __battleDebug: any }).__battleDebug.weapon;
    weapon.setTrigger(true);
    for (let i = 0; i < 10; i += 1) {
      weapon.update(0.1);
    }
    const afterBurst = { ...weapon.state };
    weapon.setTrigger(false);
    weapon.update(0.1);
    const duringReload = { ...weapon.state };
    weapon.update(1.9);
    const afterReload = { ...weapon.state };
    return { afterBurst, duringReload, afterReload };
  });

  expect(result.afterBurst.mag).toBe(0);
  expect(result.duringReload.reloading).toBe(true);
  expect(result.afterReload.mag).toBe(10);
  expect(result.afterReload.reserve).toBe(110);
});

test('player can fall off the bridge and see the fall-down state', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByTestId('intro-next').click();
  await page.getByTestId('battle-card-luding').click();
  await expect(page.getByTestId('battle-screen')).toBeVisible({ timeout: 15_000 });

  await page.evaluate(() => {
    const debug = (window as unknown as { __battleDebug: any }).__battleDebug;
    debug.bots.setKmtModifiers(0, 0.1);
    debug.camera.position.set(1.4, 9.65, 24);
  });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1800);
  await page.keyboard.up('KeyD');

  await expect(page.locator('[data-hud="down"]')).toHaveClass(/is-visible/, {
    timeout: 8_000,
  });
  await expect(page.locator('[data-hud="down-title"]')).toHaveText('坠桥');
});

test('damage flashes the edge and low health keeps it red', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByTestId('intro-next').click();
  await page.getByTestId('battle-card-luding').click();
  await expect(page.getByTestId('battle-screen')).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => {
    const debug = (window as unknown as { __battleDebug: any }).__battleDebug;
    debug.bots.setKmtModifiers(0, 0.1);
    debug.player.takeDamage(75);
  });

  await expect(page.locator('[data-hud="damage"]')).toHaveClass(/is-critical/);
  await expect(page.locator('[data-hud="health-value"]')).toHaveText('25');

  await page.evaluate(() => {
    (window as unknown as { __battleDebug: any }).__battleDebug.player.takeDamage(25);
  });
  await expect(page.locator('[data-hud="down"]')).toHaveClass(/is-visible/);
});

test('the campaign moves from jungle to bridge to street', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByTestId('intro-next').click();
  await page.getByTestId('battle-card-luding').click();
  await expect(page.getByTestId('battle-screen')).toBeVisible({ timeout: 15_000 });

  const phase = page.locator('[data-hud="phase"]');
  await expect(phase).toContainText('丛林接敌');
  const skip = page.getByTestId('debug-panel').locator('[data-debug-action="skip"]');

  await skip.click();
  await expect(phase).toContainText('第一波突击受挫');
  await skip.click();
  await expect(phase).toContainText('第二波突击');
  await skip.click();
  await expect(phase).toContainText('街巷肃清');

  const z = await page.evaluate(
    () => (window as unknown as { __battleDebug: any }).__battleDebug.camera.position.z,
  );
  expect(z).toBeLessThan(-30);
});

test('phase progression through the director reaches the result screen', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByTestId('intro-next').click();
  await page.getByTestId('battle-card-luding').click();

  await expect(page.getByTestId('battle-screen')).toBeVisible({ timeout: 15_000 });
  const panel = page.getByTestId('debug-panel');
  await expect(panel).toBeVisible();

  for (let i = 0; i < 4; i += 1) {
    await panel.locator('[data-debug-action="skip"]').click();
    await page.waitForTimeout(250);
  }

  await completeQuiz(page);
  await expect(page.locator('.result-shell h1')).toHaveText('夺桥成功', { timeout: 8_000 });
  await expect(page.getByTestId('result-quiz')).toContainText('5');
  await expect(page.getByTestId('result-back')).toBeVisible();
});

test('second charge destroys the bunker machine gun', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByTestId('intro-next').click();
  await page.getByTestId('battle-card-luding').click();
  await expect(page.getByTestId('battle-screen')).toBeVisible({ timeout: 15_000 });

  const skip = page.getByTestId('debug-panel').locator('[data-debug-action="skip"]');
  await skip.click();
  await page.waitForTimeout(250);
  await skip.click();

  await expect
    .poll(
      () =>
        page.evaluate(() =>
          (window as unknown as { __battleDebug: any }).__battleDebug.machineGunDestroyed(),
        ),
      { timeout: 8_000 },
    )
    .toBe(true);
});

test('player is downed, sees the countdown, and respawns', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByTestId('intro-next').click();
  await page.getByTestId('battle-card-luding').click();

  await expect(page.getByTestId('battle-screen')).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => {
    const debug = (window as unknown as { __battleDebug: any }).__battleDebug;
    debug.bots.setKmtModifiers(0, 0.1);
    debug.player.takeDamage(100);
  });

  const down = page.locator('[data-hud="down"]');
  await expect(down).toHaveClass(/is-visible/);
  await page.waitForTimeout(5_600);
  await expect(down).not.toHaveClass(/is-visible/);

  const state = await page.evaluate(() => {
    const player = (window as unknown as { __battleDebug: any }).__battleDebug.player;
    return { hp: player.hp, downed: player.isDowned };
  });
  expect(state.downed).toBe(false);
  expect(state.hp).toBe(100);
});

test('story text is shown without calling speech synthesis', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __speechCalls: number }).__speechCalls = 0;
    if (window.speechSynthesis) {
      const original = window.speechSynthesis.speak.bind(window.speechSynthesis);
      window.speechSynthesis.speak = (utterance: SpeechSynthesisUtterance) => {
        (window as unknown as { __speechCalls: number }).__speechCalls += 1;
        return original(utterance);
      };
    }
  });

  await page.goto('/?debug=1');
  await page.getByTestId('intro-next').click();
  await page.getByTestId('battle-card-luding').click();
  await expect(page.getByTestId('battle-screen')).toBeVisible({ timeout: 15_000 });

  const subtitle = page.locator('[data-hud="subtitle"]');
  await expect(subtitle).toHaveClass(/is-visible/);
  await expect(subtitle).not.toHaveText('');

  const speechCalls = await page.evaluate(
    () => (window as unknown as { __speechCalls: number }).__speechCalls,
  );
  expect(speechCalls).toBe(0);
});

test('subtitles can be disabled from the pause menu', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByTestId('intro-next').click();
  await page.getByTestId('battle-card-luding').click();

  await expect(page.getByTestId('battle-screen')).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press('Escape');
  const pause = page.getByTestId('pause-overlay');
  await expect(pause).toHaveClass(/is-open/);

  await pause.locator('[data-setting="subtitles"]').uncheck();
  await page.evaluate(() => {
    (window as unknown as { __battleDebug: any }).__battleDebug.director.debugSkipPhase();
  });

  await expect(page.locator('[data-hud="subtitle"]')).not.toHaveClass(/is-visible/);
});

test('debug victory reaches the result screen', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.getByTestId('intro-next').click();
  await page.getByTestId('battle-card-luding').click();

  await expect(page.getByTestId('battle-screen')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('debug-panel')).toBeVisible();

  await page.getByTestId('debug-panel').locator('[data-debug-action="victory"]').click();

  await completeQuiz(page);
  await expect(page.locator('.result-shell h1')).toHaveText('夺桥成功', { timeout: 8_000 });
  await expect(page.getByTestId('result-replay')).toBeVisible();

  await page.getByTestId('result-back').click();
  await expect(page.locator('[data-battle-id]')).toHaveCount(6);
});

test('refreshing returns to the introduction', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('intro-next').click();
  await expect(page.locator('[data-battle-id]')).toHaveCount(6);

  await page.reload();

  await expect(page.locator('h1.intro-title')).toContainText('长征');
  await expect(page.getByTestId('intro-next')).toBeVisible();
});
