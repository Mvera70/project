// La línea de tiempo del valle a una velocidad (30 sep 2026). Abre el valle por
// la portada con el perfil de un teléfono, pone el reloj a la velocidad pedida
// y apunta, fotograma a fotograma, lo que tardó el `paint`, lo que dio la vida
// y cuántos pasos. Es lo que hace falta para ver **el relevo de jornada**
// —`createVillage` al amanecer de cada día escénico, que a ×16 llega cada
// 7,5 s y a ×64 cada 1,9— y **el bucle de la villa** (GV-4): un fotograma que
// tarda más de un segundo se toma por una ausencia y la vida no avanza.
//
//   node tools/graphics/performance/relay-probe.mjs <valley.html> --seed 7 --year 60 \
//     [--speed 16] [--seconds 60] [--scale 0.25] [--viewport 390x844]
//
// `--scale` sujeta la resolución adaptativa. **Por omisión 0,25**: con el dibujo
// por software de la máquina de los agentes, a escala 1 los fotogramas quedan a
// más de un segundo unos de otros sólo por dibujar, y el reloj los toma por
// ausencias aunque el juego no tenga ningún defecto (medido el 30 sep: la villa
// con GV-4a a escala 1 no dio ni un paso de vida; a 0,25, 1.579 en un minuto).
// Nada de esto son fotogramas de un teléfono: se comparan versiones entre sí.
//
// Imprime una línea JSON: fotogramas pintados, mediana, p90 y máximo del
// `paint`, los fotogramas de más de 500 ms con su segundo, los ocho peores
// (sin el primero, que es el montaje) y los pasos de vida sumados. Lo medido con
// ella está en `docs/medidas/revision-rendimiento-2026-09-30.md` §3.
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { withBrowser } from '../browser.mjs';

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const [width, height] = flag('viewport', '390x844').split('x').map(Number);
const browser = await chromium.launch(withBrowser({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }));
const tab = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
tab.on('pageerror', (e) => console.log('ERROR', e.message));
await tab.addInitScript(() => {
  // Una fila por callback de rAF con el reparto del último `paint`; las que
  // repiten el mismo reparto son el mismo fotograma y se cuentan una vez.
  const rec = { rows: [], t0: 0 };
  window.__relayProbe = rec;
  const raf = window.requestAnimationFrame.bind(window);
  const loop = () => {
    const s = window.__valleyRenderStats?.();
    if (s !== undefined && rec.t0 > 0) {
      rec.rows.push([Math.round(performance.now() - rec.t0), Math.round(s.paintMs), Math.round(s.renderMs), Math.round(s.lifeMs), s.lifeSteps ?? 0]);
    }
    raf(loop);
  };
  raf(loop);
});
await tab.goto('file:///' + resolve(argv[0]).split(String.fromCharCode(92)).join('/'), { timeout: 240_000 });
await tab.locator('.title-scrim').waitFor({ timeout: 5000 }).catch(() => {});
await tab.locator('#valley-seed').fill(flag('seed', '7')).catch(() => {});
const toggle = tab.locator('.title-dev');
if (await toggle.getAttribute('aria-pressed').catch(() => null) === 'false') await toggle.click().catch(() => {});
await tab.locator('#valley-year').fill(flag('year', '60')).catch(() => {});
await tab.locator('.title-new').click().catch(() => {});
await tab.waitForFunction(() => typeof window.__valleyCapture === 'function', null, { timeout: 180_000 });
await tab.evaluate(({ scale, speed }) => {
  window.__valleyHoldSky?.('clear');
  window.__valleyHoldScale?.(Number(scale));
  window.__valleySpeed?.(Number(speed));
  window.__relayProbe.t0 = performance.now();
  window.__relayProbe.rows.length = 0;
}, { scale: flag('scale', '0.25'), speed: flag('speed', '16') });
const seconds = Number(flag('seconds', '60'));
await tab.waitForTimeout(seconds * 1000);
const rows = await tab.evaluate(() => window.__relayProbe.rows);
const painted = [];
let last = null;
for (const row of rows) {
  const key = row.slice(1).join(',');
  if (key !== last) painted.push(row);
  last = key;
}
const sorted = painted.map((row) => row[1]).sort((a, b) => a - b);
const at = (p) => sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
const stamp = (row) => `${(row[0] / 1000).toFixed(1)}s:${row[1]}ms`;
console.log(JSON.stringify({
  seed: Number(flag('seed', '7')), year: Number(flag('year', '60')), speed: Number(flag('speed', '16')), seconds,
  frames: painted.length, paintMedian: at(0.5), paintP90: at(0.9), paintMax: sorted.at(-1) ?? 0,
  over500: painted.filter((row) => row[1] >= 500).map(stamp),
  worst: [...painted].slice(1).sort((a, b) => b[1] - a[1]).slice(0, 8).map(stamp),
  lifeSteps: painted.reduce((sum, row) => sum + row[4], 0),
  framesWithLife: painted.filter((row) => row[4] > 0).length,
}));
await browser.close();
