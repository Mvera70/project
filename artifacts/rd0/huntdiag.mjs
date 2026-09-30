// RD-0 · diagnóstico de la caza: un toque y NADA de Playwright durante la escena.
// Un registrador dentro de la página anota (cada 250 ms) tick, velocidad, señal y etapa de la caza,
// y cada hueco de fotogramas > 400 ms. Node sólo espera. Así se separa «defecto del juego» de «artefacto del arnés».
//   node artifacts/rd0/huntdiag.mjs --seed 11 --speed 1 --vw 390 --vh 844 --dpr 2 --wait 150 --out artifacts/rd0/hd-11-1
import { chromium } from '@playwright/test';
import { browserExe } from '../../tools/graphics/browser.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const seed = opt('seed', '11'); const speed = opt('speed', '1');
const vw = Number(opt('vw', '390')); const vh = Number(opt('vh', '844')); const dpr = Number(opt('dpr', '2'));
const waitSec = Number(opt('wait', '150')); const quality = opt('quality', '');
const out = resolve(opt('out', `artifacts/rd0/hd-${seed}-${speed}`));
mkdirSync(out, { recursive: true });
const exe = browserExe();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
if (quality) await tab.addInitScript((q) => { try { localStorage.setItem('valley.graphics', JSON.stringify({ quality: q, frameRate: 60 })); } catch {} }, quality);
await tab.addInitScript(() => {
  const R = window.__hd = { rec: [], gaps: [], clicks: [], t0: performance.now() };
  let last = 0;
  const loop = (t) => { if (last && t - last > 400) R.gaps.push({ at: Math.round(t - R.t0), gap: Math.round(t - last) }); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  let n = 0;
  setInterval(() => {
    const d = document.documentElement.dataset; const sg = document.querySelector('.hunt-sign');
    const row = { at: Math.round(performance.now() - R.t0), tick: d.tick, speed: document.querySelector('.valley-speed-badge')?.textContent?.trim(),
      sign: sg ? (sg.hidden ? 'hidden' : sg.classList.contains('hunt-sign--covered') ? 'covered' : 'shown') : null, voice: document.querySelector('.valley-voice-line')?.textContent?.slice(0, 80), vit: [...document.querySelectorAll('.valley-vital')].map((e) => e.textContent.trim().replace(/\s+/g, ' ')).join('|') };
    if (n++ % 4 === 0) { const l = window.__valleyLife?.(); row.hunt = l?.hunt ? { stage: l.hunt.stage, sp: l.hunt.species, w: l.hunt.weapon, h: l.hunt.hunter ? [l.hunt.hunter.x, l.hunt.hunter.z, l.hunt.hunter.clip] : null, p: l.hunt.prey } : (l ? 'none' : 'nolife'); }
    R.rec.push(row);
  }, 250);
  document.addEventListener('click', (e) => { if (e.target.closest?.('.hunt-sign')) R.clicks.push({ at: Math.round(performance.now() - R.t0), tick: document.documentElement.dataset.tick }); }, true);
});
await tab.goto('http://127.0.0.1:8127/valley.html');
await tab.locator('.title-scrim').waitFor({ timeout: 15000 });
await tab.locator('#valley-seed').fill(seed);
await tab.evaluate(() => document.querySelector('.title-new').click());
if (speed !== '1') {
  await tab.evaluate((sp) => { document.querySelector('.valley-speed-badge')?.click(); [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === `${sp}×`)?.click(); }, speed);
}
// Espera a una señal tocable (consulta ligera), la toca UNA vez y se aparta.
let tapped = null;
const deadline = Date.now() + 240_000;
while (Date.now() < deadline && tapped === null) {
  const s = await tab.evaluate(() => { const g = document.querySelector('.hunt-sign'); if (!g || g.hidden || g.classList.contains('hunt-sign--covered')) return null;
    const r = g.getBoundingClientRect(); const cx = r.left + 18, cy = r.top + 18; const top = document.elementFromPoint(cx, cy);
    if (!(top === g || g.contains(top)) || cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return null;
    return { cx, cy, tick: document.documentElement.dataset.tick, at: Math.round(performance.now() - window.__hd.t0) }; });
  if (s && args.includes('--hook')) { const r = await tab.evaluate(() => { const a = performance.now(); const res = window.__valleyHunt?.(); return { res, ms: Math.round(performance.now() - a) }; }); tapped = { ...s, hook: r }; break; }
  if (s) { await tab.touchscreen.tap(s.cx, s.cy); tapped = s; break; }
  await tab.waitForTimeout(150);
}
console.log('tapped', JSON.stringify(tapped));
await tab.waitForTimeout(waitSec * 1000);
const data = await tab.evaluate(() => ({ rec: window.__hd.rec, gaps: window.__hd.gaps, clicks: window.__hd.clicks }));
await tab.screenshot({ path: join(out, 'end.png') });
await tab.evaluate(() => document.querySelectorAll('.skin-nav-tab')[1]?.click());
await tab.waitForTimeout(3000);
const chron = await tab.evaluate(() => { const c = document.querySelector('.ui-shell-content'); return (c ? c.innerText : document.body.innerText).slice(0, 2500); });
console.log('CHRONICLE>>', chron.replace(/\n+/g, ' / ').slice(0, 1200));
await tab.screenshot({ path: join(out, 'chronicle.png') });
writeFileSync(join(out, 'hd.json'), JSON.stringify({ seed, speed, vw, vh, dpr, tapped, ...data }, null, 1));
// Resumen de transiciones
let prev = '';
for (const r of data.rec) { const k = `${r.tick}|${r.speed}|${r.sign}|${typeof r.hunt === 'object' ? r.hunt?.stage : (r.hunt ?? '')}`; if (k !== prev) { console.log(r.at, k, r.vit ?? '', r.hunt && typeof r.hunt === 'object' ? JSON.stringify(r.hunt) : ''); prev = k; } }
console.log('clicks', JSON.stringify(data.clicks), 'gaps', JSON.stringify(data.gaps.slice(0, 30)));
await browser.close();
