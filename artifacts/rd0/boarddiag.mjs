// RD-0 · el tablón: dónde cae en pantalla, si el toque lo abre y qué dice, con la pareja fundadora (tick 0) y más tarde.
import { chromium } from '@playwright/test';
import { browserExe } from '../../tools/graphics/browser.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const seed = opt('seed', '7'); const vw = Number(opt('vw', '390')); const vh = Number(opt('vh', '844'));
const out = resolve(opt('out', `artifacts/rd0/board-${seed}-${vw}`)); mkdirSync(out, { recursive: true });
const exe = browserExe();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await tab.goto('http://127.0.0.1:8127/valley.html');
await tab.locator('.title-scrim').waitFor({ timeout: 15000 });
await tab.locator('#valley-seed').fill(seed);
await tab.evaluate(() => document.querySelector('.title-new').click());
await tab.waitForFunction(() => document.documentElement.dataset.intro === 'done' || document.documentElement.dataset.intro === 'hints', null, { timeout: 120000 });
await tab.waitForTimeout(4000);
const res = {};
const probe = async (label) => {
  const at = await tab.evaluate(() => window.__valleyBoardScreen?.() ?? null);
  const r = { label, at, tick: await tab.evaluate(() => document.documentElement.dataset.tick), crossroad: await tab.evaluate(() => document.documentElement.classList.contains('crossroad-open')) };
  if (at) {
    r.inView = at.x > 0 && at.y > 0 && at.x < vw && at.y < vh;
    r.topEl = await tab.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName}.${(e.className || '').toString().slice(0, 40)}` : null; }, at);
    if (r.inView) {
      await tab.touchscreen.tap(at.x, at.y);
      await tab.waitForTimeout(2500);
      r.opened = await tab.locator('.valley-board').count();
      r.text = await tab.evaluate(() => document.querySelector('.valley-board')?.innerText?.slice(0, 900) ?? null);
      await tab.screenshot({ path: join(out, `${label}.png`) });
      await tab.evaluate(() => { const c = document.querySelector('.valley-board-veil button, .valley-board .valley-panel-close, .valley-board [aria-label*="lose"]'); c?.click(); });
      await tab.waitForTimeout(1200);
    }
  }
  res[label] = r; console.log(JSON.stringify(r));
};
await probe('t0');
// Velocidad alta hasta el tick ~6 sin que salga la encrucijada (tick 15)
await tab.evaluate(() => { document.querySelector('.valley-speed-badge')?.click(); [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '64×')?.click(); });
await tab.waitForFunction(() => Number(document.documentElement.dataset.tick) >= 6, null, { timeout: 200000 }).catch(() => {});
await probe('t6');
await tab.waitForFunction(() => Number(document.documentElement.dataset.tick) >= 13, null, { timeout: 200000 }).catch(() => {});
await probe('t13');
writeFileSync(join(out, 'board.json'), JSON.stringify(res, null, 1));
await browser.close();
