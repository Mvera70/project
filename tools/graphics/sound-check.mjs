// U-09 · Comprueba que el juego montado suena, sin poder oírlo.
//
// No hay oído en un runner de CI, así que lo que se comprueba es lo que
// `src/ui/sound.ts` deja mirar desde fuera: `window.__valleySound`, el mismo
// tipo de gancho de observación que ya usan `data-app-ready` y `data-tick`
// (ver el propio fichero). Cuatro cosas:
//
//   1. Sin tocar la página, no existe ningún `AudioContext` — el silencio por
//      defecto de §11 es real, no sólo el volumen a cero.
//   2. Un toque en el valle lo crea y lo pone en marcha (`state === 'running'`).
//   3. Su `currentTime` avanza de verdad entre dos lecturas — no es un objeto
//      inerte, el reloj de audio corre.
//   4. El botón de apagar (junto a la regleta de velocidad) baja la ganancia
//      maestra a cero sin destruir nada; volver a tocarlo la sube.
//
// Antes: `npx tsx tools/graphics/bundle-game.ts` para tener la página al día.
//
//   node tools/graphics/sound-check.mjs
//   node tools/graphics/sound-check.mjs --page otra.html

import { chromium } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const page = resolve(opt('page', 'artifacts/graphics/G-10/game/valley.html'));

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

function fail(message) {
  console.error(`FALLO: ${message}`);
  process.exitCode = 1;
}

const exe = browserExe();
// Nada de `--autoplay-policy=no-user-gesture-required`: falsearía justo lo
// que hay que comprobar — que el navegador exige un gesto de verdad.
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const tab = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
tab.on('pageerror', (e) => errors.push(String(e)));
tab.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await tab.goto(`file:///${page.replace(/\\/g, '/')}`);
await tab.waitForTimeout(3000);

// 1 · Sin toque, sin contexto.
const beforeTouch = await tab.evaluate(() => window.__valleySound !== undefined);
if (beforeTouch) fail('había un AudioContext antes de cualquier toque');
else console.log('sin toque previo: sin AudioContext — correcto');

// 2 · Un toque en el valle lo arma. El centro del viewport, no `#valley` por
// id: en el piloto 3D un segundo lienzo releva al primero (`attachBackend`,
// `src/ui/app.ts`) y cuál de los dos está vivo no es lo que se comprueba aquí
// — el gesto llega por la raíz y `sound.arm()` no distingue uno de otro.
await tab.mouse.click(195, 300);
await tab.waitForTimeout(300);

const armed = await tab.evaluate(() => {
  const s = window.__valleySound;
  if (s === undefined) return null;
  return {
    state: s.context.state,
    masterGain: s.masterGain.value,
    windGain: s.windGain.value,
    riverGain: s.riverGain.value,
    t0: s.context.currentTime,
  };
});
if (armed === null) fail('el toque no creó ningún AudioContext');
else if (armed.state !== 'running') fail(`el AudioContext existe pero su estado es «${armed.state}», no «running»`);
else console.log(`tras el toque: AudioContext en marcha, ganancia maestra ${armed.masterGain}`);

// El ambiente (viento y río) tiene que haberse aplicado ya: hay nodos
// sonando de verdad, no sólo un contexto abierto en silencio.
if (armed !== null && armed.state === 'running') {
  if (armed.windGain <= 0) fail(`el lecho de viento sigue en ${armed.windGain}, debería sonar`);
  else console.log(`viento sonando: ganancia ${armed.windGain}`);
  if (armed.riverGain <= 0) fail(`el lecho de río sigue en ${armed.riverGain}, debería sonar (el valle siempre tiene agua)`);
  else console.log(`río sonando: ganancia ${armed.riverGain}`);
}

// 3 · Su reloj avanza de verdad.
if (armed !== null && armed.state === 'running') {
  await tab.waitForTimeout(400);
  const t1 = await tab.evaluate(() => window.__valleySound.context.currentTime);
  if (t1 <= armed.t0) fail(`currentTime no avanzó: ${armed.t0} → ${t1}`);
  else console.log(`currentTime avanza: ${armed.t0.toFixed(3)}s → ${t1.toFixed(3)}s`);
}

// Cualquier toque sobre el lienzo puede abrir la ficha de lo que hubiera
// debajo (§11.2), botón de sonido incluido — el mismo lienzo recibe el
// gesto. Se cierra igual que en `shot.mjs`: un deslizamiento hacia abajo.
const dismissPanel = async () => {
  await tab.mouse.move(195, 300);
  await tab.mouse.down();
  await tab.mouse.move(195, 700, { steps: 8 });
  await tab.mouse.up();
  await tab.waitForTimeout(200);
};
await dismissPanel();

// 4 · El botón de apagar baja la ganancia maestra sin destruir nada.
const toggle = tab.locator('.valley-sound');
await toggle.click();
await dismissPanel();
await tab.waitForTimeout(400);
const muted = await tab.evaluate(() => window.__valleySound?.masterGain.value ?? null);
if (muted === null) fail('el botón de apagar hizo desaparecer el AudioContext');
else if (muted > 0.05) fail(`la ganancia maestra sigue en ${muted} tras apagar`);
else console.log(`apagado: ganancia maestra ${muted.toFixed(3)}`);

await toggle.click();
await dismissPanel();
await tab.waitForTimeout(400);
const unmuted = await tab.evaluate(() => window.__valleySound?.masterGain.value ?? null);
if (unmuted === null || unmuted < 0.9) fail(`al reencender la ganancia maestra quedó en ${unmuted}`);
else console.log(`reencendido: ganancia maestra ${unmuted.toFixed(3)}`);

console.log('errores de página:', errors.length === 0 ? 'ninguno' : errors.slice(0, 5));
if (errors.length > 0) process.exitCode = 1;
await browser.close();
