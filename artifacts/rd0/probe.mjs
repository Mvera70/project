// RD-0 · traza de apertura como la ve un jugador (Playwright, móvil emulado).
//   node artifacts/rd0/probe.mjs --seed 7 --speed 16 --minutes 10 --vw 390 --vh 844 --dpr 2 --out artifacts/rd0/run-7-16-390
// Muestrea el DOM y los ganchos __valley* cada ~400 ms, y **toca de verdad**
// la señal de caza la primera vez que está tocable (touchscreen.tap en su centro).
import { chromium } from '@playwright/test';
import { browserExe } from '../../tools/graphics/browser.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const seed = opt('seed', '7');
const speed = opt('speed', '16');
const minutes = Number(opt('minutes', '10'));
const vw = Number(opt('vw', '390'));
const vh = Number(opt('vh', '844'));
const dpr = Number(opt('dpr', '2'));
const noTap = args.includes('--no-tap');
const out = resolve(opt('out', `artifacts/rd0/run-${seed}-${speed}-${vw}`));
mkdirSync(out, { recursive: true });

const exe = browserExe();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const tab = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, hasTouch: true, isMobile: true });
const errors = [];
tab.on('pageerror', (e) => errors.push(String(e)));
tab.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await tab.addInitScript(() => {
  window.__rd0 = { frames: 0, last: 0, maxGap: 0, slow: 0, gaps: [] };
  const loop = (t) => {
    const r = window.__rd0;
    if (r.last > 0) { const g = t - r.last; r.maxGap = Math.max(r.maxGap, g); if (g > 50) r.slow++; r.gaps.push(g); if (r.gaps.length > 4000) r.gaps.shift(); }
    r.last = t; r.frames++; requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});
const t0wall = Date.now();
const since = () => (Date.now() - t0wall) / 1000;
const log = []; const events = [];
const ev = (name, extra = {}) => { const e = { t: +since().toFixed(1), name, ...extra }; events.push(e); console.log(JSON.stringify(e)); };

if (opt('quality','') !== '') await tab.addInitScript((q) => { try { localStorage.setItem('valley.graphics', JSON.stringify({ quality: q, frameRate: 60 })); } catch {} }, opt('quality',''));
await tab.goto('http://127.0.0.1:8127/valley.html');
function pathToUrl() { return 'file://' + resolve('artifacts/graphics/G-10/game/valley.html'); }
await tab.locator('.title-scrim').waitFor({ timeout: 10000 });
await tab.locator('#valley-seed').fill(seed);
await tab.evaluate(() => document.querySelector('.title-new').click());
const tStart = Date.now();
ev('founded-click');

const sample = () => tab.evaluate(() => {
  const d = document.documentElement.dataset;
  const sign = document.querySelector('.hunt-sign');
  let signInfo = null;
  if (sign) {
    const r = sign.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    signInfo = { hidden: sign.hidden, covered: sign.classList.contains('hunt-sign--covered'), cx: Math.round(cx), cy: Math.round(cy), w: Math.round(r.width), h: Math.round(r.height),
      inView: cx > 0 && cy > 0 && cx < innerWidth && cy < innerHeight, topIsSign: top === sign || sign.contains(top), topTag: top ? (top.className || top.tagName).toString().slice(0, 40) : null,
      opacity: getComputedStyle(sign).opacity, label: sign.getAttribute('aria-label') };
  }
  const badge = document.querySelector('.valley-speed-badge');
  const board = window.__valleyBoardScreen?.() ?? null;
  const snd = window.__valleySound;
  const r = window.__rd0;
  return {
    tick: d.tick, sun: d.sunPhase, sky: d.sky, intro: d.intro, screen: d.screen, render: d.render,
    speedBadge: badge ? (badge.textContent || '').trim().slice(0, 30) : null,
    date: document.querySelector('.valley-date')?.textContent ?? null,
    time: document.querySelector('.valley-time')?.textContent ?? null,
    voice: document.querySelector('.valley-voice-line')?.textContent ?? null,
    crossroad: document.documentElement.classList.contains('crossroad-open'),
    sign: signInfo, board,
    vitals: [...document.querySelectorAll('.valley-vital')].map((e) => e.textContent.trim().replace(/\s+/g, ' ')).join('|'),
    sound: snd ? { n: snd.played.length, last: snd.played.slice(-3).map((p) => p.cue), mix: snd.mix ?? null } : null,
    frames: r.frames, slow: r.slow, maxGap: Math.round(r.maxGap), hasCanvas: !!document.querySelector('canvas'),
  };
});
const huntLife = () => tab.evaluate(() => { const l = window.__valleyLife?.(); if (!l) return null;
  return { hunt: l.hunt ?? null, wild: (l.wild ?? []).filter((a) => ['partridge', 'rabbit', 'deer', 'boar', 'bear'].includes(a.kind)).slice(0, 6), people: (l.renderedPeople ?? []).length, animals: (l.renderedAnimals ?? []).length, vp: l.viewport }; });

const shot = async (name) => { await tab.screenshot({ path: join(out, `${name}.png`) }).catch(() => {}); };

// Velocidad por la interfaz, como el dedo.
if (speed !== '1') {
  // Clic de DOM (mismo manejador que el dedo) para no pagar la espera de estabilidad de Playwright a 1-2 fps.
  const ok = await tab.evaluate((sp) => {
    document.querySelector('.valley-speed-badge')?.click();
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === `${sp}×`);
    if (!b) return false; b.click(); return true; }, speed);
  ev('speed-set', { speed, ok, atGame: await tab.evaluate(() => document.documentElement.dataset.tick) });
}
await shot('00-start');

let prev = null; let tapped = false; let taps = 0; let lastShotTick = -1; let huntPhase = 'none';
let huntT = {}; const signSeen = {}; // por tick de oferta
let firstCross = null; let boardTried = false;
const end = tStart + minutes * 60_000;
let lastLifeAt = 0; let lastTickSeen = null;
while (Date.now() < end) {
  const s = await sample().catch(() => null);
  if (s === null) { await tab.waitForTimeout(500); continue; }
  s.t = +since().toFixed(1);
  log.push(s);
  if (s.tick !== lastTickSeen) { ev('tick', { tick: s.tick, date: s.date, time: s.time, voice: s.voice, vitals: s.vitals }); lastTickSeen = s.tick; }
  if (prev && s.speedBadge !== prev.speedBadge) ev('speed-changed', { from: prev.speedBadge, to: s.speedBadge, tick: s.tick });
  if (prev && s.intro !== prev.intro) ev('intro', { intro: s.intro });
  if (s.voice && (!prev || s.voice !== prev.voice)) ev('voice', { text: s.voice });
  if (s.sound && (!prev || !prev.sound || s.sound.n !== prev.sound.n)) ev('sound', { n: s.sound.n, last: s.sound.last });
  if (s.crossroad && firstCross === null) { firstCross = s.t; ev('crossroad-open', { tick: s.tick }); await shot('crossroad'); const txt = await tab.evaluate(() => { const e = document.querySelector('.crossroad, [class*="crossroad"]'); return e ? e.innerText.slice(0, 500) : null; }); ev('crossroad-text', { txt }); }
  if (s.board && !signSeen.boardFirst) { signSeen.boardFirst = s.t; ev('board-on-screen-hook', { at: s.board, tick: s.tick }); }
  // Toque inmediato (antes de capturar nada): la oferta dura una semana del motor.
  if (!noTap && !tapped && s.sign && !s.sign.hidden && !s.sign.covered && s.sign.inView && s.sign.topIsSign) {
    tapped = true; taps++;
    const tapTick = s.tick;
    await tab.touchscreen.tap(s.sign.cx, s.sign.cy);
    huntT.tap = since(); huntPhase = 'tapped';
    const after = await sample();
    ev('tap', { tick: tapTick, tickAfter: after.tick, at: [s.sign.cx, s.sign.cy], speedBefore: s.speedBadge, speedAfter: after.speedBadge, signAfter: after.sign, sampleAgeMs: 0 });
    await shot('tap-after');
  }
  // Señal de caza
  const sg = s.sign;
  const visible = sg && !sg.hidden;
  if (visible && !prev?.sign?.hidden === false) { /* noop */ }
  if (visible) {
    const key = s.tick;
    const rec = signSeen[key] ?? (signSeen[key] = { firstT: s.t, lastT: s.t, n: 0, covered: 0, tocable: 0, offView: 0 });
    rec.lastT = s.t; rec.n++; if (sg.covered) rec.covered++; if (sg.topIsSign && !sg.covered && sg.inView) rec.tocable++; if (!sg.inView) rec.offView++;
    if (rec.n === 1) { ev('sign-visible', { tick: s.tick, sg }); await shot(`sign-tick${s.tick}`); const l = await huntLife(); ev('sign-life', { l }); }
  }
  if (!noTap && !tapped && visible && !sg.covered && sg.inView && sg.topIsSign) {
    tapped = true; taps++;
    const l0 = await huntLife();
    ev('tap', { tick: s.tick, at: [sg.cx, sg.cy], speedBefore: s.speedBadge, life: l0 });
    await shot('tap-before');
    huntT.tap = since();
    await tab.touchscreen.tap(sg.cx, sg.cy);
    huntPhase = 'tapped';
  }
  if (huntPhase === 'tapped' || huntPhase === 'running') {
    if (Date.now() - lastLifeAt > 1500) {
      lastLifeAt = Date.now();
      const l = await huntLife();
      const stage = l?.hunt?.stage ?? null;
      if (huntPhase === 'tapped' && stage === 'running') { huntPhase = 'running'; huntT.run = since(); ev('hunt-running', { after: +(huntT.run - huntT.tap).toFixed(1), speed: s.speedBadge, l }); await shot('hunt-running'); }
      if (stage === 'running') { ev('hunt-progress', { hunter: l.hunt.hunter, prey: l.hunt.prey }); }
      if (huntPhase === 'tapped' && since() - huntT.tap > 4 && stage === null) { huntPhase = 'failed'; ev('hunt-did-not-start', { afterSec: +(since() - huntT.tap).toFixed(1), speed: s.speedBadge, sign: s.sign }); await shot('hunt-not-started'); }
      if (huntPhase === 'running' && (stage === 'done' || stage === null)) { huntPhase = 'done'; huntT.done = since(); ev('hunt-ended', { stage, afterTap: +(huntT.done - huntT.tap).toFixed(1), speed: s.speedBadge, tick: s.tick }); await shot('hunt-ended'); }
    }
  }
  if (huntPhase === 'done' && !huntT.after) { huntT.after = true; await tab.waitForTimeout(1500); const s2 = await sample(); ev('after-hunt', { tick: s2.tick, speed: s2.speedBadge, vitals: s2.vitals, voice: s2.voice }); await shot('hunt-after'); }
  prev = s;
  await tab.waitForTimeout(350);
}
ev('run-end', { speed: prev?.speedBadge, tick: prev?.tick });
await shot('99-end');

// Tablón: tocarlo de verdad si el gancho lo sitúa en pantalla.
const boardAt = await tab.evaluate(() => window.__valleyBoardScreen?.() ?? null);
ev('board-hook-end', { boardAt });
let boardInfo = { tried: false };
if (boardAt) {
  const box = await tab.locator('canvas:visible').first().boundingBox();
  const inView = boardAt.x > 0 && boardAt.y > 0 && boardAt.x < vw && boardAt.y < vh;
  boardInfo = { tried: true, at: boardAt, inView };
  if (inView && box) {
    await tab.touchscreen.tap(box.x + boardAt.x, box.y + boardAt.y);
    await tab.waitForTimeout(1500);
    boardInfo.opened = await tab.locator('.valley-board').count();
    boardInfo.text = await tab.evaluate(() => document.querySelector('.valley-board')?.innerText?.slice(0, 700) ?? null);
    await shot('board-open');
  }
}
ev('board', boardInfo);
// Crónica: primeras líneas.
await tab.keyboard.press('Escape').catch(() => {});
await tab.locator('.valley-board .valley-panel-close, .valley-board-veil [aria-label*="lose"]').first().click({ timeout: 1500 }).catch(() => {});
await tab.locator('.skin-nav-tab').nth(1).click({ timeout: 3000 }).catch(() => {});
await tab.waitForTimeout(1500);
const chron = await tab.evaluate(() => { const c = document.querySelector('.ui-shell-content'); return c && !c.hidden ? c.innerText.slice(0, 3000) : null; });
ev('chronicle', { chron });
await shot('chronicle');

const fpsGaps = await tab.evaluate(() => window.__rd0.gaps);
const fr = await tab.evaluate(() => window.__rd0.frames);
writeFileSync(join(out, 'samples.json'), JSON.stringify({ seed, speed, vw, vh, dpr, minutes, events, signSeen, errors, frames: fr, fpsGaps: fpsGaps.length }, null, 1));
writeFileSync(join(out, 'log.json'), JSON.stringify(log));
console.log('errors', errors.slice(0, 5));
await browser.close();
