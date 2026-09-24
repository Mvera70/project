// Prueba manual reproducible de la entrada de caza y su escena 3D.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const mobile = process.argv.includes('--mobile');
const seed = process.argv.find(arg => arg.startsWith('--seed='))?.split('=')[1] ?? '3';
const out = resolve(mobile ? 'artifacts/graphics/hunt-smoke/mobile'
  : 'artifacts/graphics/hunt-smoke/desktop');
mkdirSync(out, { recursive: true });
const installed = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);
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
const button = page.locator('.valley-hunt-action');
console.log('hunt button visible', await button.isVisible());
await page.screenshot({ path: resolve(out, 'before.png') });
if (await button.isVisible()) {
  await button.click();
  await page.screenshot({ path: resolve(out, 'choose.png') });
  await page.locator('.hunt-prompt-weapon').first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: resolve(out, 'aim.png') });
  const attack = page.locator('.valley-hunt-action');
  console.log('attack visible', await attack.isVisible(), await attack.getAttribute('aria-label'),
    await attack.boundingBox());
  const frames = resolve(out, 'frames');
  mkdirSync(frames, { recursive: true });
  await page.screenshot({ path: resolve(frames, 'f000.png') });
  await attack.click();
  await page.screenshot({ path: resolve(out, 'encounter.png') });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const active = await attack.isVisible()
      && /^(Throw|Strike)$/.test(await attack.getAttribute('aria-label') ?? '');
    if (active && attempt % 3 === 0) await attack.click();
    await page.waitForTimeout(180);
    await page.screenshot({ path: resolve(frames, `f${String(attempt + 1).padStart(3, '0')}.png`) });
    if (!active && attempt > 8) break;
  }
  console.log('resolved', await attack.textContent(),
    await page.locator('.hud-stat').allTextContents());
  await page.screenshot({ path: resolve(out, 'resolved.png') });
  const life = await page.evaluate(() => window.__valleyLife?.() ?? null);
  console.log('scene', { animals: life?.renderedAnimals, actors: life?.actors.filter(a => a.id >= 80000) });
}
console.log('errors', errors);
await browser.close();
