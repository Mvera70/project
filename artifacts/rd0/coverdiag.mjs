// RD-0 · ¿se destapa la señal cubierta girando/acercando la cámara? (semilla 7, tick 0, ×1). Gestos de escritorio como shot.mjs.
import { chromium } from '@playwright/test';
import { browserExe } from '../../tools/graphics/browser.mjs';
import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
const seed = process.argv[2] ?? '7';
const out = resolve(`artifacts/rd0/cover-${seed}`); mkdirSync(out, { recursive: true });
const exe = browserExe();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await tab.goto('http://127.0.0.1:8127/valley.html');
await tab.locator('.title-scrim').waitFor({ timeout: 15000 });
await tab.locator('#valley-seed').fill(seed);
await tab.evaluate(() => document.querySelector('.title-new').click());
await tab.waitForFunction(() => ['hints', 'done'].includes(document.documentElement.dataset.intro), null, { timeout: 120000 });
await tab.waitForTimeout(3000);
const state = () => tab.evaluate(() => { const g = document.querySelector('.hunt-sign'); if (!g) return null;
  return { hidden: g.hidden, covered: g.classList.contains('hunt-sign--covered'), tick: document.documentElement.dataset.tick,
    at: g.hidden ? null : [Math.round(g.getBoundingClientRect().left + 18), Math.round(g.getBoundingClientRect().top + 18)] }; });
console.log('inicial', JSON.stringify(await state()));
await tab.screenshot({ path: join(out, 'initial.png') });
const angles = [45, 45, 45, 45, 45, 45, 45, 45];
let total = 0;
for (const a of angles) {
  total += a;
  await tab.keyboard.down('Shift'); await tab.mouse.move(195, 420); await tab.mouse.down();
  await tab.mouse.move(195 - a / 0.4, 420, { steps: 10 }); await tab.mouse.up(); await tab.keyboard.up('Shift');
  await tab.waitForTimeout(2500);
  console.log('giro acumulado', total, JSON.stringify(await state()));
}
await tab.screenshot({ path: join(out, 'after.png') });
await browser.close();
