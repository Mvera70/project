// La sonda de WebGL. 27 sep 2026.
//
// Cuenta desde fuera del juego —interceptando WebGL, así que vale para
// cualquier versión, también una vieja para comparar— lo que cuesta cada
// fotograma: llamadas de dibujo, triángulos, programas enlazados, el tiempo
// que se pierde enlazando y los milisegundos de JavaScript de cada callback de
// requestAnimationFrame (mediana y p90). Ver la skill `performance`.
//
//   node tools/graphics/performance/gl-probe.mjs <valley.html> "<query>" [segundos]
//   p. ej. "debug=1&seed=7&year=60&season=summer&live=1" (la villa grande)
//
// **En una máquina sin GPU (SwiftShader) los tiempos no representan una
// tablet**: compara llamadas, triángulos y JS entre versiones, no FPS.
import { chromium } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const [file, query, seconds = '40'] = process.argv.slice(2);
const root = join(homedir(), 'AppData', 'Local', 'ms-playwright');
// AN-0 · `VALLEY_CHROMIUM` manda; sin la carpeta de Windows, el Chromium de Playwright.
const dir = existsSync(root) ? readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()[0] : undefined;
const executablePath = process.env.VALLEY_CHROMIUM ?? (dir === undefined ? undefined : join(root, dir, 'chrome-win64', 'chrome.exe'));
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: 1180, height: 820 } });
tab.on('pageerror', (e) => console.log('ERROR', e.message));
await tab.addInitScript(() => {
  const probe = { frame: { calls: 0, tris: 0 }, frames: [], links: 0, linkMs: 0, compiles: 0, programs: new Set() };
  window.__probe = probe;
  const wrap = (proto) => {
    const count = (mode, n, inst = 1) => { probe.frame.calls += 1; if (mode === 4) probe.frame.tris += (n / 3) * inst; };
    const de = proto.drawElements; proto.drawElements = function (m, c, t, o) { count(m, c); return de.call(this, m, c, t, o); };
    const da = proto.drawArrays; proto.drawArrays = function (m, f, c) { count(m, c); return da.call(this, m, f, c); };
    if (proto.drawElementsInstanced) { const di = proto.drawElementsInstanced; proto.drawElementsInstanced = function (m, c, t, o, i) { count(m, c, i); return di.call(this, m, c, t, o, i); }; }
    if (proto.drawArraysInstanced) { const ai = proto.drawArraysInstanced; proto.drawArraysInstanced = function (m, f, c, i) { count(m, c, i); return ai.call(this, m, f, c, i); }; }
    const cs = proto.compileShader; proto.compileShader = function (s) { probe.compiles += 1; return cs.call(this, s); };
    const lp = proto.linkProgram; proto.linkProgram = function (p) { probe.links += 1; probe.programs.add(p); return lp.call(this, p); };
    // Enlazar es asíncrono hasta que alguien pregunta el estado: ahí se paga.
    const gp = proto.getProgramParameter; proto.getProgramParameter = function (p, n) {
      const t = performance.now(); const r = gp.call(this, p, n); probe.linkMs += performance.now() - t; return r; };
  };
  wrap(WebGL2RenderingContext.prototype);
  // El coste de JavaScript de cada fotograma: cuánto tardan los callbacks de rAF.
  probe.js = [];
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => { const s = performance.now(); cb(t); const d = performance.now() - s; if (d > 0.05) probe.js.push(d); });
  const tick = () => { if (probe.frame.calls > 0) probe.frames.push(probe.frame); probe.frame = { calls: 0, tris: 0 }; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
});
// AN-0 · La página empaquetada lleva los GLB dentro y con la sonda puesta
// tarda más de los 30 s por omisión en cargar bajo SwiftShader.
await tab.goto('file:///' + resolve(file).split(String.fromCharCode(92)).join('/') + '?' + query, { timeout: 240_000 });
const t0 = Date.now();
await tab.waitForTimeout(Number(seconds) * 1000);
const r = await tab.evaluate(() => {
  const p = window.__probe; const f = p.frames.slice(-20);
  const avg = (k) => Math.round(f.reduce((s, x) => s + x[k], 0) / Math.max(1, f.length));
  const js = p.js.slice(-200).sort((a, b) => a - b);
  const med = js.length ? js[Math.floor(js.length / 2)] : 0;
  const p90 = js.length ? js[Math.floor(js.length * 0.9)] : 0;
  return { frames: p.frames.length, calls: avg('calls'), tris: avg('tris'), programs: p.programs.size, linkMs: Math.round(p.linkMs), jsMedianMs: Math.round(med * 10) / 10, jsP90Ms: Math.round(p90 * 10) / 10 };
});
console.log(JSON.stringify({ ...r, seconds: Math.round((Date.now() - t0) / 1000) }));
await browser.close();
