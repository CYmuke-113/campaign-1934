import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const failures = [];
page.on('response', (response) => {
  if (response.status() >= 400) {
    failures.push(`${response.status()} ${response.url()}`);
  }
});
page.on('pageerror', (error) => failures.push(`pageerror ${error.message}`));

await page.goto('http://127.0.0.1:8090/repo/?debug=1');
await page.getByTestId('intro-next').click();
await page.getByTestId('battle-card-luding').click();
await page.getByTestId('battle-screen').waitFor({ timeout: 15000 });
await page.waitForTimeout(2500);

const state = await page.evaluate(() => {
  const debug = window.__battleDebug;
  return {
    debug: Boolean(debug),
    canvas: Boolean(document.querySelector('canvas')),
    red: debug?.director.snapshot.redAlive ?? null,
    kmt: debug?.director.snapshot.kmtAlive ?? null,
    calls: debug?.renderer.info.render.calls ?? null,
  };
});
await page.screenshot({ path: 'shots/pages_subpath.png' });
console.log(JSON.stringify({ state, failures }, null, 2));
await browser.close();
if (failures.length > 0) process.exitCode = 1;
