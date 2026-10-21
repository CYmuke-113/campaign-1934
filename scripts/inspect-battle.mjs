import { chromium } from '@playwright/test';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:4173/?debug=1');
await page.getByTestId('intro-next').click();
await page.getByTestId('battle-card-luding').click();
await page.waitForTimeout(1500);

const info = await page.evaluate(() => {
  const debug = window.__battleDebug;
  if (!debug) return { error: 'no debug object' };
  const { camera, scene, player } = debug;
  player.setEnabled(false);
  const children = scene.children.slice(0, 45).map((child) => {
    const object = child;
    const material = object.material;
    return {
      type: object.type,
      position: object.position.toArray().map((value) => Number(value.toFixed(2))),
      scale: object.scale.toArray().map((value) => Number(value.toFixed(2))),
      geometry: object.geometry?.type ?? null,
      color:
        material && 'color' in material && material.color
          ? `#${material.color.getHexString()}`
          : null,
    };
  });
  return {
    cameraPosition: camera.position.toArray(),
    cameraRotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
    children,
  };
});
console.log(JSON.stringify(info, null, 2));

await page.evaluate(() => {
  const debug = window.__battleDebug;
  if (!debug) return;
  debug.player.setEnabled(false);
  debug.camera.position.set(0, 26, 72);
  debug.camera.rotation.set(-0.32, 0, 0, 'YXZ');
});
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/battle_overhead.png' });

await page.evaluate(() => {
  const debug = window.__battleDebug;
  if (!debug) return;
  debug.camera.position.set(0, 9.65, 43);
  debug.camera.rotation.set(-0.28, 0, 0, 'YXZ');
});
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/battle_lookdown.png' });

await browser.close();
