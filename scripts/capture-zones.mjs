import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('shots', { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:4173/?debug=1');
await page.getByTestId('intro-next').click();
await page.getByTestId('battle-card-luding').click();
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/zone-jungle.png' });

const skip = page.getByTestId('debug-panel').locator('[data-debug-action="skip"]');
await skip.click();
await page.waitForTimeout(1200);
await page.screenshot({ path: 'shots/zone-bridge.png' });

await skip.click();
await page.waitForTimeout(1200);
await page.screenshot({ path: 'shots/zone-bridge2.png' });

await skip.click();
await page.waitForTimeout(1200);
await page.screenshot({ path: 'shots/zone-street.png' });

await browser.close();
