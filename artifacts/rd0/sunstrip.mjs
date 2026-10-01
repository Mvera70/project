// RD-0 · tira de contactos sol/reloj: fotogramas seguidos a ×16 o ×64 con la hora de cabecera
// (texto sr-only `.valley-time` + fase del sol `data-sun-phase`) y una captura de cada uno.
import { chromium } from '@playwright/test';
import { browserExe } from '../../tools/graphics/browser.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const seed = opt('seed', '7'); const speed = opt('speed', '16'); const seconds = Number(opt('seconds', '40'));
const out = resolve(opt('out', `artifacts/rd0/sun-${speed}`));
mkdirSync(out, { recursive: true });
const exe = browserExe();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
await tab.goto('http://127.0.0.1:8127/valley.html');
await tab.locator('.title-scrim').waitFor({ timeout: 15000 });
await tab.locator('#valley-seed').fill(seed);
await tab.evaluate(() => document.querySelector('.title-new').click());
await tab.waitForFunction(() => document.documentElement.dataset.intro === 'hints' || document.documentElement.dataset.intro === 'done', null, { timeout: 120000 });
await tab.evaluate((sp) => {
  document.querySelector('.valley-speed-badge')?.click();
  [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === `${sp}×`)?.click();
}, speed);
const rows = [];
const t0 = Date.now();
let i = 0;
while ((Date.now() - t0) / 1000 < seconds) {
  const meta = await tab.evaluate(() => ({ sun: document.documentElement.dataset.sunPhase, sky: document.documentElement.dataset.sky,
    time: document.querySelector('.valley-time')?.textContent, date: document.querySelector('.valley-date')?.textContent, tick: document.documentElement.dataset.tick,
    badge: document.querySelector('.valley-speed-badge')?.textContent?.trim() }));
  const name = `f${String(i).padStart(3, '0')}.jpg`;
  await tab.screenshot({ path: join(out, name), type: 'jpeg', quality: 55 });
  rows.push({ i, name, t: +((Date.now() - t0) / 1000).toFixed(1), ...meta });
  i++;
}
writeFileSync(join(out, 'rows.json'), JSON.stringify({ seed, speed, rows }, null, 1));
console.log('frames', rows.length);
await browser.close();
