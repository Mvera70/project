// UI-V0 · Monta el muestrario de las primitivas de la piel y lo fotografía.
//
// **Es la prueba de hecho de esta ronda.** UI-V0 no pinta ninguna pantalla
// del juego: entrega un vocabulario, y la única forma de saber que ese
// vocabulario vale es ver cada pieza dibujada con los tokens y las fuentes de
// verdad, antes de que seis rondas construyan encima. Si el pergamino sale
// sucio, la capitular descuadrada o la fuente no carga, aquí se ve en un
// minuto y no tres rondas después.
//
// Levanta el muestrario con Vite (para que la textura y las fuentes pasen por
// el empaquetador, como en el juego), lo fotografía y comprueba que las dos
// familias han cargado de verdad (`document.fonts.check`).
//
//   node tools/ui/sampler.mjs
//     -> artifacts/graphics/piel/muestrario.png  y  muestrario-fuentes.json

import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const OUT = resolve('artifacts/graphics/piel');

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

// El servidor de desarrollo de Vite sirve el muestrario resolviendo los mismos
// `url()` y `@font-face` que el juego: si una ruta está mal, aquí falla.
const server = await createServer({ server: { port: 5199 }, logLevel: 'warn' });
await server.listen();

const exe = browserExe();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}) });
const page = await browser.newPage({ viewport: { width: 900, height: 1400 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('requestfailed', (request) => errors.push(`no cargó ${request.url()}`));

await page.goto('http://127.0.0.1:5199/tools/ui/sampler.html', { waitUntil: 'networkidle' });
// Las fuentes son `font-display: swap`: hay que esperarlas explícitamente o
// la captura sale con la pila de respaldo y el muestrario mentiría.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);

const fonts = await page.evaluate(() => ({
  cinzel400: document.fonts.check('400 16px Cinzel'),
  cinzel600: document.fonts.check('600 16px Cinzel'),
  garamond400: document.fonts.check('400 16px "EB Garamond"'),
  garamond500: document.fonts.check('500 16px "EB Garamond"'),
  garamondItalic: document.fonts.check('italic 400 16px "EB Garamond"'),
  cargadas: [...document.fonts].map((f) => `${f.family} ${f.weight} ${f.style}`),
}));

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
await page.locator('body').screenshot({ path: join(OUT, 'muestrario.png') });
writeFileSync(join(OUT, 'muestrario-fuentes.json'), JSON.stringify({ fonts, errors }, null, 2));

const bad = Object.entries(fonts).filter(([k, v]) => k !== 'cargadas' && v !== true).map(([k]) => k);
process.stdout.write(
  `muestrario: ${join(OUT, 'muestrario.png')}\n`
  + `fuentes que faltan: ${bad.length === 0 ? 'ninguna' : bad.join(', ')}\n`
  + `errores de página: ${errors.length === 0 ? 'ninguno' : errors.join(' · ')}\n`,
);

await browser.close();
await server.close();
process.exit(bad.length === 0 && errors.length === 0 ? 0 : 1);
