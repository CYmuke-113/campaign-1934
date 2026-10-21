import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('shots', { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto('http://127.0.0.1:4173/');
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/intro.png', fullPage: true });

await page.getByTestId('intro-next').click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/overview.png', fullPage: true });

await page.getByTestId('battle-card-luding').click();
await page.waitForTimeout(1800);
await page.screenshot({ path: 'shots/battle.png' });

await page.goto('http://127.0.0.1:4173/?debug=1');
await page.getByTestId('intro-next').click();
await page.getByTestId('battle-card-luding').click();
await page.waitForTimeout(1200);
await page.getByTestId('debug-panel').locator('[data-debug-action="victory"]').click();
await page.waitForTimeout(2600);
await page.screenshot({ path: 'shots/result.png', fullPage: true });

await browser.close();
