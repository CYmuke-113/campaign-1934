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

const skip = page.getByTestId('debug-panel').locator('[data-debug-action="skip"]');
await skip.click();
await page.waitForTimeout(3500);
await page.screenshot({ path: 'shots/battle_phase2.png' });

await skip.click();
await page.waitForTimeout(3500);
await page.screenshot({ path: 'shots/battle_phase3.png' });

await browser.close();
