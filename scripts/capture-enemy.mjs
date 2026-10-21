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
await page.getByTestId('debug-panel').locator('[data-debug-action="skip"]').click();
await page.waitForTimeout(300);
await page.getByTestId('debug-panel').locator('[data-debug-action="skip"]').click();
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const debug = window.__battleDebug;
  debug.player.setEnabled(false);
  debug.camera.position.set(0, 9.65, -42.5);
  debug.camera.rotation.set(-0.06, 0, 0, 'YXZ');
});
await page.waitForTimeout(800);
await page.screenshot({ path: 'shots/battle_enemy.png' });
await browser.close();
