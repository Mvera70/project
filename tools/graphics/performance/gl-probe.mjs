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
// **Y por la portada, como juega el jugador** (GV-0, 29 sep 2026):
//
//   node tools/graphics/performance/gl-probe.mjs <valley.html> --seed 7 --year 60 \
//     [--seconds 40] [--viewport 390x844] [--touch] [--dpr 3] [--quality medium] \
//     [--sky clear] [--phase 0.45] [--scale 1] [--query "aa=fxaa"] [--report]
//
// La ruta `?debug=1` monta además el valle en Canvas 2D y lo pinta debajo del
// 3D en cada fotograma (`docs/medidas/rendimiento-piel-v9-2026-09-29.md`):
// vale para contar llamadas, triángulos y programas —el Canvas no usa WebGL—
// pero **no para el JS por fotograma**. Para eso, por la portada. Las opciones
// de perfil y luz son las de `shot.mjs`: `--touch` hace que `auto` resuelva
// como en un teléfono, y `--scale` fija la adaptativa, que en un dibujo por
// software baja sola y cambia lo que se mide.
//
// **En una máquina sin GPU (SwiftShader) los tiempos no representan una
// tablet**: compara llamadas, triángulos y JS entre versiones, no FPS.
import { chromium } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const titled = argv.includes('--seed');
const file = argv[0];
const query = titled ? '' : argv[1];
const seconds = titled ? flag('seconds', '40') : (argv[2] ?? '40');

/** La ruta explícita, la de Windows si existe, o la que Playwright traiga. */
function browserExe() {
  if (process.env.VALLEY_CHROMIUM) return process.env.VALLEY_CHROMIUM;
  const root = join(homedir(), 'AppData', 'Local', 'ms-playwright');
  if (!existsSync(root)) return undefined;
  const dir = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()[0];
  const exe = dir === undefined ? undefined : join(root, dir, 'chrome-win64', 'chrome.exe');
  return exe !== undefined && existsSync(exe) ? exe : undefined;
}
const exe = browserExe();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const [width, height] = flag('viewport', titled ? '390x844' : '1180x820').split('x').map(Number);
const touch = argv.includes('--touch');
const tab = await browser.newPage({ viewport: { width, height },
  ...(titled ? { deviceScaleFactor: Number(flag('dpr', touch ? '3' : '2')), hasTouch: touch, isMobile: touch } : {}) });
tab.on('pageerror', (e) => console.log('ERROR', e.message));
const quality = flag('quality', '');
if (quality !== '') {
  await tab.addInitScript((level) => {
    try { localStorage.setItem('valley.graphics', JSON.stringify({ quality: level, frameRate: 60 })); } catch { /* sin almacenamiento */ }
  }, quality);
}
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
const page = 'file:///' + resolve(file).split(String.fromCharCode(92)).join('/');
if (titled) {
  // El camino de `shot.mjs`: el menú de inicio, el número del valle y el año
  // detrás del interruptor de taller (U-10b). `--query "aa=fxaa"` añade eso a
  // la dirección, para las opciones de taller que se leen de ella (GV-3).
  await tab.goto(page + (flag('query', '') === '' ? '' : '?' + flag('query', '')));
  await tab.locator('.title-scrim').waitFor({ timeout: 5000 }).catch(() => {});
  await tab.locator('#valley-seed').fill(flag('seed', '7')).catch(() => {});
  const toggle = tab.locator('.title-dev');
  if (await toggle.getAttribute('aria-pressed').catch(() => null) === 'false') await toggle.click().catch(() => {});
  await tab.locator('#valley-year').fill(flag('year', '1')).catch(() => {});
  await tab.locator('.title-new').click().catch(() => {});
  await tab.waitForFunction(() => typeof window.__valleyCapture === 'function', null, { timeout: 180_000 });
  await tab.evaluate(({ sky, phase, scale }) => {
    if (sky !== '') window.__valleyHoldSky?.(sky);
    if (phase !== '') window.__valleyHoldPhase?.(Number(phase));
    if (scale !== '') window.__valleyHoldScale?.(Number(scale));
    // Lo que se midió antes de este instante es la carga, no el valle.
    window.__probe.frames.length = 0;
    window.__probe.js.length = 0;
  }, { sky: flag('sky', ''), phase: flag('phase', ''), scale: flag('scale', '') });
} else {
  await tab.goto(page + '?' + query);
}
const t0 = Date.now();
await tab.waitForTimeout(Number(seconds) * 1000);
const r = await tab.evaluate(() => {
  const p = window.__probe; const f = p.frames.slice(-20);
  const avg = (k) => Math.round(f.reduce((s, x) => s + x[k], 0) / Math.max(1, f.length));
  const js = p.js.slice(-200).sort((a, b) => a - b);
  const med = js.length ? js[Math.floor(js.length / 2)] : 0;
  const p90 = js.length ? js[Math.floor(js.length * 0.9)] : 0;
  const drawn = window.__valleyRenderStats?.();
  return { frames: p.frames.length, calls: avg('calls'), tris: avg('tris'), programs: p.programs.size, linkMs: Math.round(p.linkMs), jsMedianMs: Math.round(med * 10) / 10, jsP90Ms: Math.round(p90 * 10) / 10,
    ...(drawn === undefined ? {} : { level: drawn.level, scale: drawn.scale }) };
});
console.log(JSON.stringify({ ...r, seconds: Math.round((Date.now() - t0) / 1000) }));
// `--report`: y de dónde salen, con el reparto de `scene-report.mjs` sobre el
// mismo valle abierto por el mismo camino.
if (argv.includes('--report')) {
  const rows = await tab.evaluate(() => window.__valleySceneReport?.() ?? []);
  let meshes = 0, shadow = 0;
  for (const row of rows) { meshes += row.meshes; shadow += row.shadow; }
  for (const row of rows.slice(0, 14)) console.log(row.group.padEnd(28), String(row.meshes).padStart(5), 'sombra', String(row.shadow).padStart(5), 'inst', String(row.instanced).padStart(3), 'tris', row.triangles);
  console.log('TOTAL mallas', meshes, 'sombra', shadow);
}
await browser.close();
