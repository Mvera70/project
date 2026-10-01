// RD-0 · D7: ¿el tablón sigue en el encuadre mientras la aldea crece? x,y en px CSS por tick.
// node artifacts/rd0/boardframe.mjs <valley.html> <semilla> <salida.json>
import { chromium } from '@playwright/test';
import { browserExe } from '../../tools/graphics/browser.mjs';
import { writeFileSync } from 'node:fs';
const [page, seed, out] = process.argv.slice(2);
const vw = 390, vh = 844;
const exe = browserExe();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await tab.goto(`file://${page}`);
await tab.locator('.title-scrim').waitFor({ timeout: 20000 });
await tab.locator('#valley-seed').fill(seed);
await tab.evaluate(() => document.querySelector('.title-new').click());
await tab.waitForFunction(() => ['hints', 'done'].includes(document.documentElement.dataset.intro), null, { timeout: 180000 }).catch(() => {});
await tab.evaluate(() => window.__valleySpeed?.(64));
const rows = [];
let last = -1;
const deadline = Date.now() + 600_000;
while (Date.now() < deadline) {
  const r = await tab.evaluate(() => ({ tick: Number(document.documentElement.dataset.tick), at: window.__valleyBoardScreen?.() ?? null }));
  if (r.tick !== last) {
    last = r.tick;
    const inView = r.at !== null && r.at.x > 0 && r.at.y > 0 && r.at.x < vw && r.at.y < vh;
    rows.push({ ...r, inView });
    console.log(JSON.stringify({ ...r, inView }));
  }
  if (r.tick >= 14) break;
  await tab.waitForTimeout(700);
}
writeFileSync(out, JSON.stringify(rows, null, 1));
await browser.close();
