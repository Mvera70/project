// Prueba manual reproducible de la entrada de caza y su escena 3D.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

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
// La caza como eventos rápidos (27 sep 2026): la ocasión sale sola como tarjeta
// (`.hunt-event`), el arma se elige ahí y la puntería son los aros (`.hunt-qte`),
// que se tocan con Espacio en el momento en que coinciden (`window.__huntQte`
// no existe: se toca cada décima y cuenta sólo el toque bueno).
const card = page.locator('.hunt-event');
const offered = await card.waitFor({ state: 'visible', timeout: 60000 }).then(() => true, () => false);
console.log('hunt event offered', offered);
if (offered) {
  // Sin GPU la página va a un fotograma por segundo y la tarjeta caduca en
  // nueve: se elige antes de fotografiar nada, sin esperar a que se asiente.
  await page.locator('.hunt-event-weapon').first().click({ force: true });
  await page.locator('.hunt-qte').waitFor({ state: 'visible', timeout: 10000 });
  await page.screenshot({ path: resolve(out, 'aim.png') });
  const frames = resolve(out, 'frames');
  mkdirSync(frames, { recursive: true });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (!(await page.locator('.hunt-qte').isVisible())) break;
    await page.keyboard.press('Space');
    await page.waitForTimeout(150);
    if (attempt % 4 === 0) await page.screenshot({ path: resolve(frames, `f${String(attempt).padStart(3, '0')}.png`) });
  }
  console.log('resolved', !(await page.locator('.hunt-qte').isVisible()), await page.locator('.hud-stat').allTextContents());
  await page.screenshot({ path: resolve(out, 'resolved.png') });
  const life = await page.evaluate(() => window.__valleyLife?.() ?? null);
  console.log('scene', { animals: life?.renderedAnimals, actors: life?.actors.filter(a => a.id >= 80000) });
}
console.log('errors', errors);
await browser.close();
