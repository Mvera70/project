// **Rodar el valle, en vez de fotografiarlo.** Pedido por el dueño del diseño
// el 16 sep 2026, y con el motivo dicho por él: quien revisa este juego no
// puede ver la pantalla en movimiento, sólo capturas, «que sería la manera de
// interpretar qué está pasando realmente».
//
// El problema no es tomar muchas capturas —`shot.mjs --sequence` ya las
// tomaba—, es que **mirar cien imágenes es imposible**: cuesta más leerlas que
// el defecto que se busca. Así que esta herramienta hace tres cosas, y las
// tres juntas son lo que la hace útil:
//
//   1. **Fotogramas seguidos y densos**, a la velocidad que dé la máquina.
//   2. **La traza de datos del valle en cada fotograma** —dónde está cada
//      cuerpo, a qué velocidad, qué intención lleva, cuánto le queda de
//      camino, qué clip se está pintando— leída del propio juego por el
//      enganche `window.__valleyLife` (`src/render3d/renderer.ts`). Esto es lo
//      que convierte «se ve torpe» en «el 7 lleva 90 pasos yendo al campo 3 y
//      no llega».
//   3. Y luego `film-sheet.py` monta **una sola imagen** con todos los
//      fotogramas y **un informe** con las anomalías que la traza delata.
//
// El reloj de verdad de esta película no es el de pared, es `steps`: la capa
// de vida da treinta pasos por segundo y el enganche los cuenta, así que el
// tiempo entre dos fotogramas se sabe exacto aunque la captura tarde lo que
// tarde.
//
//   node tools/graphics/film.mjs --seed 11 --year 50 --seconds 12 --fps 8 \
//     --zoom 6 --out artifacts/graphics/film/prueba
//   python tools/graphics/film-sheet.py artifacts/graphics/film/prueba

import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const pageArg = opt('page', 'artifacts/graphics/G-10/game/valley.html');
const page = /^https?:\/\//u.test(pageArg) ? pageArg : pathToFileURL(resolve(pageArg)).href;
const out = resolve(opt('out', 'artifacts/graphics/film/toma'));
const seconds = Number(opt('seconds', '10'));
const fps = Number(opt('fps', '8'));
const seedArg = opt('seed', '');
const yearArg = opt('year', '');
const speed = opt('speed', '1');
const settle = Number(opt('settle', '6'));
const zoomNotches = Number(opt('zoom', '0'));
const turn = Number(opt('turn', '0'));
const tilt = Number(opt('tilt', '0'));
// Un píxel por píxel de CSS: la tira de contactos tiene que caber en una
// imagen que se pueda mirar, y a escala doble pesa cuatro veces sin decir más.
const dsf = Number(opt('dsf', '1'));
// --clip x,y,w,h  recorta la captura a una ventana del valle, en píxeles de
// CSS. Para mirar una esquina de cerca sin mover la cámara.
const clipArg = opt('clip', '');
const clip = clipArg === '' ? undefined : (() => {
  const [x, y, width, height] = clipArg.split(',').map(Number);
  return { x, y, width, height };
})();
// --answer N contesta la encrucijada que tapa el valle, como en `shot.mjs`.
const answer = Number(opt('answer', '0'));

// El mismo truco que `shot.mjs`: el navegador de Playwright está instalado
// pero su «headless shell» no, así que hay que señalarle el chrome.exe.
function browserExe() {
  const root = join(homedir(), 'AppData', 'Local', 'ms-playwright');
  if (!existsSync(root)) return undefined;
  const dirs = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort();
  for (const dir of dirs.reverse()) {
    const exe = join(root, dir, 'chrome-win64', 'chrome.exe');
    if (existsSync(exe)) return exe;
  }
  return undefined;
}

if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'frames'), { recursive: true });

const exe = browserExe();
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const tab = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: dsf,
});
const errors = [];
tab.on('pageerror', (error) => errors.push(String(error)));
await tab.goto(page);

// U-10 y U-10b · el menú: el número del valle, y el año detrás del
// interruptor de taller. Rodar el año 1 es rodar a la pareja fundadora.
await tab.locator('.title-scrim').waitFor({ timeout: 5000 }).catch(() => {});
if (seedArg !== '') await tab.locator('#valley-seed').fill(seedArg).catch(() => {});
if (yearArg !== '') {
  const toggle = tab.locator('.title-dev');
  if (await toggle.getAttribute('aria-pressed').catch(() => null) === 'false') {
    await toggle.click().catch(() => {});
  }
  await tab.locator('#valley-year').fill(yearArg).catch(() => {});
}
await tab.locator('.title-new').click().catch(() => {});
await tab.waitForTimeout(settle * 1000);

if (answer > 0) {
  for (let round = 0; round < 6; round += 1) {
    const button = tab.locator('.crossroad-options button').nth(answer - 1);
    if (!(await button.isVisible().catch(() => false))) break;
    await button.click().catch(() => {});
    await tab.waitForTimeout(800);
  }
}

if (speed !== '1') {
  await tab.locator('.valley-speed-badge').click().catch(() => {});
  await tab.getByRole('button', { name: `${speed}×` }).click().catch(() => {});
  await tab.waitForTimeout(500);
}

// La cámara, con los mismos gestos que `shot.mjs`: arrastrar con mayúsculas
// gira, y la rueda acerca.
const canvas = tab.locator('#valley');
if (turn !== 0 || tilt !== 0) {
  const box = await canvas.boundingBox();
  if (box !== null) {
    const midX = box.x + box.width / 2;
    const midY = box.y + box.height / 2;
    await tab.keyboard.down('Shift');
    await tab.mouse.move(midX, midY);
    await tab.mouse.down();
    await tab.mouse.move(midX + turn * 2, midY - tilt * 2, { steps: 12 });
    await tab.mouse.up();
    await tab.keyboard.up('Shift');
  }
}
if (zoomNotches !== 0) {
  const box = await canvas.boundingBox();
  if (box !== null) {
    await tab.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    for (let n = 0; n < Math.abs(zoomNotches); n += 1) {
      await tab.mouse.wheel(0, zoomNotches > 0 ? -120 : 120);
      await tab.waitForTimeout(40);
    }
  }
}
await tab.waitForTimeout(600);

const wanted = Math.max(1, Math.round(seconds * fps));
const gap = 1000 / fps;
const frames = [];
const started = Date.now();
let missing = 0;

for (let n = 0; n < wanted; n += 1) {
  const due = started + n * gap;
  const wait = due - Date.now();
  if (wait > 5) await tab.waitForTimeout(wait);
  const at = Date.now();
  // La traza **antes** de la captura: así el dato y el píxel son del mismo
  // instante todo lo que se puede, y no de dos fotogramas distintos.
  const life = await tab.evaluate(() => (window.__valleyLife ? window.__valleyLife() : null));
  const name = `f${String(n).padStart(3, '0')}.png`;
  await tab.screenshot({ path: join(out, 'frames', name), ...(clip ? { clip } : {}) });
  if (life === null) missing += 1;
  frames.push({ n, name, ms: at - started, life });
}

const hud = await tab.evaluate(() => ({
  date: document.querySelector('.valley-date')?.textContent ?? null,
  time: document.querySelector('.valley-time')?.textContent ?? null,
  doing: document.querySelector('.valley-doing')?.textContent ?? null,
}));

writeFileSync(join(out, 'trace.json'), JSON.stringify({
  meta: {
    page: pageArg, seed: seedArg, year: yearArg, speed, seconds, fps, dsf,
    zoom: zoomNotches, turn, tilt, clip: clipArg, answer,
    wantedFrames: wanted, gotFrames: frames.length,
    realSeconds: (Date.now() - started) / 1000,
    sinTraza: missing,
    hud,
    errores: errors,
  },
  frames,
}, null, has('pretty') ? 2 : 0));

const first = frames[0]?.life ?? null;
const last = frames[frames.length - 1]?.life ?? null;
const steps = first !== null && last !== null ? last.steps - first.steps : 0;
process.stdout.write(
  `${frames.length} fotogramas en ${((Date.now() - started) / 1000).toFixed(1)} s`
  + ` · ${(frames.length / ((Date.now() - started) / 1000)).toFixed(1)}/s reales`
  + ` · ${steps} pasos de vida (${(steps / 30).toFixed(1)} s de aldea)`
  + ` · gente ${first?.people.length ?? 0}`
  + ` · ${hud.date ?? 'sin fecha'} ${hud.time ?? ''}\n`
  + `traza: ${join(out, 'trace.json')}\n`
  + `errores de página: ${errors.length === 0 ? 'ninguno' : errors.join(' · ')}\n`
  + (missing > 0 ? `AVISO: ${missing} fotogramas sin traza (¿enganche ausente?)\n` : ''),
);

await browser.close();
