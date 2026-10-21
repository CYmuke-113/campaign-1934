import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:4173/?debug=1');
await page.getByTestId('intro-next').click();
await page.getByTestId('battle-card-luding').click();
await page.waitForTimeout(1600);

const state = async () =>
  page.evaluate(() => {
    const debug = window.__battleDebug;
    return {
      locked: debug?.player.isLocked,
      position: debug?.camera.position.toArray(),
      hp: debug?.player.hp,
      downed: debug?.player.isDowned,
      director: debug?.director.snapshot,
    };
  });

console.log('before', await state());
await page.mouse.click(720, 450);
await page.waitForTimeout(300);
console.log('after click', await state());

await page.keyboard.down('KeyW');
await page.waitForTimeout(900);
await page.keyboard.up('KeyW');
console.log('after W', await state());

const beforeAmmo = await page.locator('[data-hud="ammo-mag"]').textContent();
await page.mouse.click(720, 450);
await page.waitForTimeout(250);
const afterAmmo = await page.locator('[data-hud="ammo-mag"]').textContent();
console.log('ammo', beforeAmmo, '->', afterAmmo);

await page.screenshot({ path: 'shots/battle_controls.png' });
await browser.close();
