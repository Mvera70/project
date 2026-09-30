// RD-0 · sol y reloj sin arnés: registrador dentro de la página (200 ms), sin capturas durante la medida.
//   node artifacts/rd0/sundiag.mjs --seed 7 --speed 16 --seconds 60 --out artifacts/rd0/sd-7-16
import { chromium } from '@playwright/test';
import { browserExe } from '../../tools/graphics/browser.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const seed = opt('seed', '7'); const speed = opt('speed', '16'); const seconds = Number(opt('seconds', '60'));
const out = resolve(opt('out', `artifacts/rd0/sd-${seed}-${speed}`)); mkdirSync(out, { recursive: true });
const exe = browserExe();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
await tab.addInitScript(() => {
  const R = window.__sd = { rec: [], frames: 0 };
  const loop = () => { R.frames++; requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  setInterval(() => { const d = document.documentElement.dataset;
    R.rec.push({ at: Math.round(performance.now()), f: R.frames, tick: d.tick, sun: d.sunPhase, time: document.querySelector('.valley-time')?.textContent, sky: d.sky }); }, 200);
});
await tab.goto('http://127.0.0.1:8127/valley.html');
await tab.locator('.title-scrim').waitFor({ timeout: 15000 });
await tab.locator('#valley-seed').fill(seed);
await tab.evaluate(() => document.querySelector('.title-new').click());
await tab.waitForFunction(() => ['hints', 'done'].includes(document.documentElement.dataset.intro), null, { timeout: 120000 });
if (speed !== '1') await tab.evaluate((sp) => { document.querySelector('.valley-speed-badge')?.click(); [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === `${sp}×`)?.click(); }, speed);
await tab.waitForTimeout(seconds * 1000);
const rec = await tab.evaluate(() => window.__sd.rec);
writeFileSync(join(out, 'log.json'), JSON.stringify(rec));
console.log('samples', rec.length, 'frames', rec[rec.length - 1].f);
await browser.close();
