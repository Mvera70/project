// RD-0 · D1: ¿se puede tocar la señal de la caza de la fundación con la cámara de apertura?
// node artifacts/rd0/signscan.mjs <valley.html> <semillas,coma> <salida.json>
import { chromium } from '@playwright/test';
import { browserExe } from '../../tools/graphics/browser.mjs';
import { writeFileSync } from 'node:fs';
const [page, seedsArg, out] = process.argv.slice(2);
const exe = browserExe();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const rows = [];
for (const seed of seedsArg.split(',')) {
  const tab = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await tab.goto(`file://${page}`);
  await tab.locator('.title-scrim').waitFor({ timeout: 20000 });
  await tab.locator('#valley-seed').fill(seed);
  await tab.evaluate(() => document.querySelector('.title-new').click());
  await tab.waitForFunction(() => ['hints', 'done'].includes(document.documentElement.dataset.intro), null, { timeout: 180000 }).catch(() => {});
  const samples = [];
  for (let i = 0; i < 12; i += 1) {
    samples.push(await tab.evaluate(() => {
      const g = document.querySelector('.hunt-sign');
      if (!g) return 'none';
      if (g.hidden) return 'hidden';
      return g.classList.contains('hunt-sign--covered') ? 'covered' : 'tappable';
    }));
    await tab.waitForTimeout(500);
  }
  const tick = await tab.evaluate(() => document.documentElement.dataset.tick);
  if (seed === '7' || seed === '1') await tab.screenshot({ path: out.replace('.json', `-seed${seed}.png`) });
  rows.push({ seed, tick, samples });
  console.log(seed, tick, samples.join(' '));
  await tab.close();
}
await browser.close();
writeFileSync(out, JSON.stringify(rows, null, 1));
