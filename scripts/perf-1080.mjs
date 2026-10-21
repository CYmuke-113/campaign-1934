import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('http://127.0.0.1:4173/?debug=1');
await page.getByTestId('intro-next').click();
await page.getByTestId('battle-card-luding').click();
await page.waitForTimeout(1500);

for (const ratio of [0.6, 0.5, 0.45]) {
  await page.evaluate((pixelRatio) => {
    const debug = window.__battleDebug;
    debug.renderer.setPixelRatio(pixelRatio);
    debug.renderer.setSize(window.innerWidth, window.innerHeight);
  }, ratio);
  await page.waitForTimeout(3500);
  const fps = await page.locator('[data-debug="fps"]').textContent();
  console.log(`pixelRatio ${ratio}:`, fps);
}

await browser.close();
