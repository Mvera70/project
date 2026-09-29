// GV-2 · La secuencia del seguido (29 sep 2026): seguir a un aldeano como lo
// hace la ficha y fotografiar fotograma a fotograma si el bosque lo tapa.
//
// Determinista: con el juego en pausa, la vida se reinicia al principio de la
// jornada (`__valleyAdvance(0, true)`) y avanza a pasos fijos de 1/30 s, así
// que dos versiones del juego dan **la misma secuencia**, con la misma gente
// en el mismo sitio; lo único que cambia es lo que se dibuja. Por eso sirve
// para el antes/después de GV-2.
//
//   node tools/graphics/follow-sequence.mjs --page <valley.html> --seed 11 --year 21 \
//     [--lead 20] [--frames 16] [--every 30] [--zoom 0.5] [--follow <id>|axe] \
//     [--touch] [--dpr 3] [--viewport 390x844] [--sky clear] [--scale 1] --out <carpeta>
//
// `--lead` son segundos escénicos desde el alba antes del primer fotograma (el
// día dura 120), `--every` los pasos entre fotogramas, y `--follow axe` elige
// al primero que lleve el hacha en ese momento: el leñador es quien más pasa
// bajo las copas. Escribe los PNG de la escena y `sequence.json` con, por
// fotograma, si el seguido queda detrás de alguna copa (`trackedHidden`) y
// cuántas copas hay atenuadas (`revealed`).
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
// `--query "aa=fxaa"` añade eso a la dirección (las opciones de taller de GV-3);
// `--follow none` no sigue a nadie y deja la cámara del encuadre de partida.
const page = 'file:///' + resolve(opt('page', 'artifacts/graphics/G-10/game/valley.html')).split(String.fromCharCode(92)).join('/')
  + (opt('query', '') === '' ? '' : '?' + opt('query', ''));
const out = resolve(opt('out', 'artifacts/graphics/visual-depth/follow'));
const lead = Number(opt('lead', '20'));
const frames = Number(opt('frames', '16'));
const every = Number(opt('every', '30'));
const zoom = Number(opt('zoom', '0.5'));
const follow = opt('follow', 'axe');
const touch = args.includes('--touch');
const [width, height] = opt('viewport', '390x844').split('x').map(Number);
mkdirSync(out, { recursive: true });

const exe = process.env.VALLEY_CHROMIUM;
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width, height },
  deviceScaleFactor: Number(opt('dpr', touch ? '3' : '2')), hasTouch: touch, isMobile: touch });
const errors = [];
tab.on('pageerror', (e) => errors.push(String(e)));
await tab.goto(page);
await tab.locator('.title-scrim').waitFor({ timeout: 5000 }).catch(() => {});
await tab.locator('#valley-seed').fill(opt('seed', '11')).catch(() => {});
const toggle = tab.locator('.title-dev');
if (await toggle.getAttribute('aria-pressed').catch(() => null) === 'false') await toggle.click().catch(() => {});
await tab.locator('#valley-year').fill(opt('year', '21')).catch(() => {});
await tab.locator('.title-new').click().catch(() => {});
await tab.waitForFunction(() => typeof window.__valleyAdvance === 'function', null, { timeout: 180_000 });
await tab.evaluate(({ sky, scale }) => {
  window.__valleySpeed?.(0);
  if (sky !== '') window.__valleyHoldSky?.(sky);
  if (scale !== '') window.__valleyHoldScale?.(Number(scale));
}, { sky: opt('sky', 'clear'), scale: opt('scale', '1') });
await tab.waitForTimeout(4000);
// La jornada desde el alba, a pasos fijos, hasta el primer fotograma.
await tab.evaluate(() => window.__valleyAdvance(0, true));
for (let left = Math.round(lead * 30); left > 0; left -= 3600) {
  await tab.evaluate((steps) => window.__valleyAdvance(steps), Math.min(3600, left));
}
// `--follow hidden` busca, en la ventana `--scan` (segundos escénicos desde
// `--lead`), a quien más rato pasa detrás de una copa (`__valleyCanopyHidden`)
// y empieza la secuencia un poco antes de que entre. Imprime el id y el
// arranque, para repetir la misma toma en otra versión con `--follow <id>
// --lead <s>`.
let startLead = lead;
if (follow === 'hidden') {
  const scan = Number(opt('scan', '90'));
  // Cada paso dibuja un fotograma: buscar a un cuarto de densidad, grabar a la pedida.
  await tab.evaluate(() => window.__valleyHoldScale?.(0.25));
  const counts = new Map();
  const firstSeen = new Map();
  for (let t = 0; t < scan * 30; t += 15) {
    const ids = await tab.evaluate(() => window.__valleyCanopyHidden?.() ?? []);
    for (const id of ids) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      if (!firstSeen.has(id)) firstSeen.set(id, lead + t / 30);
    }
    await tab.evaluate(() => window.__valleyAdvance(15));
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (best === undefined) throw new Error('Nadie pasa detrás de una copa en esa ventana.');
  startLead = Math.max(0, firstSeen.get(best[0]) - (frames * every / 30) / 3);
  console.log(JSON.stringify({ scanned: scan, hidden: best[0], samples: best[1], lead: startLead }));
  await tab.evaluate((scale) => window.__valleyHoldScale?.(Number(scale)), opt('scale', '1'));
  await tab.evaluate(() => window.__valleyAdvance(0, true));
  for (let left = Math.round(startLead * 30); left > 0; left -= 3600) {
    await tab.evaluate((steps) => window.__valleyAdvance(steps), Math.min(3600, left));
  }
  args.push('--chosen', String(best[0]));
}
const chosen = await tab.evaluate((wanted) => {
  const people = window.__valleyLife?.()?.renderedPeople ?? [];
  if (wanted === 'none') return -1;
  if (wanted.startsWith('id:')) return Number(wanted.slice(3));
  if (wanted !== 'axe') return Number(wanted);
  return people.find((person) => person.id >= 0 && person.held.includes('axe'))?.id ?? people.find((person) => person.id >= 0)?.id ?? null;
}, follow === 'hidden' ? `id:${opt('chosen', '-1')}` : follow);
if (chosen === null) throw new Error('No hay nadie a quien seguir en esta jornada.');
if (chosen >= 0) await tab.evaluate((id) => window.__valleyTrack?.(id), chosen);
await tab.evaluate(() => window.__valleyAdvance(1));
const rows = [];
for (let n = 0; n < frames; n += 1) {
  const shot = await tab.evaluate((first) => window.__valleyCapture(-1, first), n === 0 ? zoom : 1);
  const stats = await tab.evaluate(() => window.__valleyRenderStats?.() ?? null);
  const name = `frame-${String(n + 1).padStart(2, '0')}.png`;
  writeFileSync(join(out, name), Buffer.from(shot.image.split(',')[1], 'base64'));
  rows.push({ frame: n + 1, file: name, trackedHidden: stats?.trackedHidden ?? null, revealed: stats?.revealed ?? 0 });
  if (n < frames - 1) await tab.evaluate((steps) => window.__valleyAdvance(steps), every);
}
const hidden = rows.filter((row) => row.trackedHidden === true);
const report = {
  seed: Number(opt('seed', '11')), year: Number(opt('year', '21')), lead: startLead, every, frames, zoom, follow: chosen,
  hiddenFrames: hidden.length,
  revealedWhileHidden: hidden.filter((row) => row.revealed > 0).length,
  rows, errors,
};
writeFileSync(join(out, 'sequence.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ follow: chosen, hiddenFrames: report.hiddenFrames, revealedWhileHidden: report.revealedWhileHidden, errors: errors.length }));
await browser.close();
