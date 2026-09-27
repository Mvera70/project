// G-20 · comprobación de la propia hoja de evidencia (juego-real.html): cero
// imágenes rotas, cero errores de página. Mismo Chromium que usa shot.mjs.
import { chromium } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

function browserExe() {
  const root = join(homedir(), 'AppData', 'Local', 'ms-playwright');
  const dirs = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort();
  for (const dir of dirs.reverse()) {
    const exe = join(root, dir, 'chrome-win64', 'chrome.exe');
    if (existsSync(exe)) return exe;
  }
  return undefined;
}
const exe = browserExe();
console.log('chrome', exe);
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const target = resolve('artifacts/graphics/G-20/juego-real.html');
const fileUrl = 'file:///' + target.replaceAll('\\', '/');
await page.goto(fileUrl);
await page.waitForTimeout(500);
const imgCheck = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')];
  return { total: imgs.length, broken: imgs.filter((i) => i.naturalWidth === 0).length };
});
console.log('imagenes', imgCheck, 'errores', errors);
await page.screenshot({ path: 'artifacts/graphics/G-20/self-check-top.png' });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.35));
await page.screenshot({ path: 'artifacts/graphics/G-20/self-check-mid.png' });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.7));
await page.screenshot({ path: 'artifacts/graphics/G-20/self-check-bottom.png' });
await browser.close();
