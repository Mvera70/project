// Prueba manual reproducible de la entrada de caza y su escena 3D.
import { chromium } from '@playwright/test';
import { browserExe } from './browser.mjs';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const mobile = process.argv.includes('--mobile');
const seed = process.argv.find(arg => arg.startsWith('--seed='))?.split('=')[1] ?? '3';
const out = resolve(mobile ? 'artifacts/graphics/hunt-smoke/mobile'
  : 'artifacts/graphics/hunt-smoke/desktop');
mkdirSync(out, { recursive: true });
const installed = browserExe();
const browser = await chromium.launch({
  ...(installed ? { executablePath: installed } : {}),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: mobile
  ? { width: 390, height: 844 } : { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
await page.goto(process.env.VALLEY_HUNT_URL ?? 'http://127.0.0.1:5185/?render=3d');
await page.locator('.title-scrim').waitFor();
await page.locator('#valley-seed').fill(seed);
await page.locator('.title-new').click();
await page.waitForTimeout(6500);
// La caza como señal en el mapa (27 sep 2026, skill `senales-en-el-mapa`): un
// icono encima de la presa (`.hunt-sign`); tocarlo manda al aldeano libre más
// cercano, que sale desde donde está, y la suerte decide el resto.
const sign = page.locator('.hunt-sign');
const offered = await sign.waitFor({ state: 'visible', timeout: 60000 }).then(() => true, () => false);
console.log('hunt sign shown', offered, await sign.getAttribute('aria-label').catch(() => null));
if (offered) {
  await page.screenshot({ path: resolve(out, 'before.png') });
  const people = async () => page.evaluate(() => Object.fromEntries((window.__valleyLife?.()?.renderedPeople ?? []).map((p) => [p.id, [p.x, p.z]])));
  const before = await people();
  await sign.click({ force: true });
  await page.waitForTimeout(800);
  const after = await people();
  // Nadie aparece de la nada: ningún aldeano salta de sitio al empezar.
  console.log('jumps', Object.keys(after).filter((id) => before[id]
    && Math.hypot(after[id][0] - before[id][0], after[id][1] - before[id][1]) > 1.5));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: resolve(out, 'hunting.png') });
  await page.waitForTimeout(25000);
  await page.screenshot({ path: resolve(out, 'resolved.png') });
}
console.log('errors', errors);
await browser.close();
