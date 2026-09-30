// RD-1 · la caza a ×1: tocar la señal, ver caer la pieza con su «+N» y que el calendario no salte.
import { chromium } from '@playwright/test';
import { browserExe } from '../../tools/graphics/browser.mjs';
const [page, seed, out] = process.argv.slice(2);
const exe = browserExe();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await tab.goto(`file://${page}`);
await tab.locator('.title-scrim').waitFor({ timeout: 20000 });
await tab.locator('#valley-seed').fill(seed);
await tab.evaluate(() => document.querySelector('.title-new').click());
await tab.waitForFunction(() => ['hints', 'done'].includes(document.documentElement.dataset.intro), null, { timeout: 180000 }).catch(() => {});
const date = () => tab.evaluate(() => document.querySelector('.valley-date')?.textContent ?? '');
await tab.waitForFunction(() => { const g = document.querySelector('.hunt-sign'); return g && !g.hidden && !g.classList.contains('hunt-sign--covered'); }, null, { timeout: 120000 });
const before = { date: await date(), tick: await tab.evaluate(() => document.documentElement.dataset.tick) };
await tab.evaluate(() => document.querySelector('.hunt-sign').click());
let chip = null; const t0 = Date.now();
while (Date.now() - t0 < 240000 && chip === null) {
  chip = await tab.evaluate(() => { const c = document.querySelector('.wood-gain[data-icon="wheat"]'); return c ? c.textContent : null; });
  if (chip === null) await tab.waitForTimeout(250);
}
const after = { date: await date(), tick: await tab.evaluate(() => document.documentElement.dataset.tick), sign: await tab.evaluate(() => document.querySelector('.hunt-sign')?.hidden) };
if (chip !== null) await tab.screenshot({ path: out });
console.log(JSON.stringify({ before, chip, after, seconds: (Date.now() - t0) / 1000 }));
await browser.close();
