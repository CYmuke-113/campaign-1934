import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
]) {
  const page = await browser.newPage({ viewport });
  await page.goto('http://127.0.0.1:4173/?debug=1');
  await page.getByTestId('intro-next').click();
  await page.getByTestId('battle-card-luding').click();
  await page.waitForTimeout(1200);

  const skip = page.getByTestId('debug-panel').locator('[data-debug-action="skip"]');
  await skip.click();
  await page.waitForTimeout(250);
  await skip.click();
  await page.waitForTimeout(12000);

  const stats = await page.evaluate(() => {
    const debug = window.__battleDebug;
    return {
      fpsText: document.querySelector('[data-debug="fps"]')?.textContent ?? null,
      calls: debug?.renderer.info.render.calls ?? null,
      triangles: debug?.renderer.info.render.triangles ?? null,
      red: debug?.director.snapshot.redAlive ?? null,
      kmt: debug?.director.snapshot.kmtAlive ?? null,
      phase: debug?.director.snapshot.phaseName ?? null,
    };
  });
  console.log(`${viewport.width}x${viewport.height}`, stats);
  await page.close();
}

await browser.close();
