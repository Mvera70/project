// Capturas del juego montado, para mirar antes de decir que algo se ve bien.
//
//   node tools/graphics/shot.mjs                     → arranque, 390×844
//   node tools/graphics/shot.mjs --run 30 --speed 64  → tras 30 s a 64×
//   node tools/graphics/shot.mjs --wait moment        → espera a que salga una cartela de hito
//   node tools/graphics/shot.mjs --wait crossroad     → espera a una encrucijada
//   node tools/graphics/shot.mjs --out foo.png
//
// Playwright pide un navegador exacto y en esta máquina no hay red para
// bajarlo; hay otros instalados de versiones anteriores y valen igual. Se busca
// el más reciente en ~/AppData/Local/ms-playwright. Sin WebGL de verdad se usa
// swiftshader, que es lento pero pinta.
//
// Antes: `npx tsx tools/graphics/bundle-game.ts` para tener la página al día.

import { chromium } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const runSeconds = Number(opt('run', '0'));
const speed = opt('speed', '1');
const waitFor = opt('wait', '');
// **Girar la vista antes de disparar.** Sin esto la única forma de comprobar
// que la cámara gira era mirar a ojo con el dedo encima, y una cámara que gira
// mal se ve igual que una que no gira en una captura de frente.
//   --turn 90        gira noventa grados alrededor del valle
//   --tilt 25        y la levanta veinticinco más
const turn = Number(opt('turn', '0'));
const tilt = Number(opt('tilt', '0'));
//   --zoom -6       aleja seis muescas de rueda (positivo acerca)
const zoomNotches = Number(opt('zoom', '0'));
// E1/E2 · La orden con la que se juega antes de disparar. Se pulsa el botón del
// mando, que es lo que hace el dedo: así la captura prueba el camino del jugador
// y no una función a la que nadie llega.
//   --orders "Wood"   pulsa esa posición del mando
const orders = opt('orders', '');
const out = resolve(opt('out', 'artifacts/graphics/G-10/shot.png'));
// **Una secuencia, para mirar el juego como un vídeo.** El dueño del diseño lo
// dijo así: «tienes que tomar muchas más capturas, una por cada frame, e ir
// analizando una secuencia; hay muchos problemas que se ven a primera vista».
// Una captura suelta enseña una composición; doce seguidas enseñan si la gente
// se queda clavada, si algo parpadea, si un trasto atraviesa el suelo.
//   --sequence 12 --every 2.5   → doce capturas, una cada 2,5 s, numeradas
const sequence = Number(opt('sequence', '0'));
const every = Number(opt('every', '2'));
// `--page` acepta también una dirección `http://`. La demo partida en dos
// (`bundle-game.ts --split`) pide su JSON de recursos por la red, y una página
// abierta como `file://` no puede pedir nada: sin esto, la única manera de
// comprobar que los modelos llegan era publicarla y mirar con el dedo.
const pageArg = opt('page', 'artifacts/graphics/G-10/game/valley.html');
const page = /^https?:\/\//u.test(pageArg)
  ? pageArg
  : `file:///${resolve(pageArg).replace(/\\/g, '/')}`;

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

const exe = browserExe();
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const tab = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
tab.on('pageerror', (e) => errors.push(String(e)));
tab.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await tab.goto(page);
await tab.waitForTimeout(8000);

// La regleta está recogida detrás del botón de velocidad, como para el dedo.
if (speed !== '1') {
  await tab.locator('.valley-speed-badge').click().catch(() => {});
  await tab.getByRole('button', { name: `${speed}×` }).click().catch(() => {});
}

// Se gira arrastrando con mayúsculas, que es el gesto de escritorio, en vez de
// llamar al renderer por dentro: así lo que la captura prueba es **el camino
// del jugador** y no una función a la que nadie llega con el dedo.
if (turn !== 0 || tilt !== 0) {
  const perPx = 0.4;              // grados por píxel, igual que `ORBIT_PER_PX`
  const perPxTilt = 0.25;
  await tab.keyboard.down('Shift');
  await tab.mouse.move(195, 420);
  await tab.mouse.down();
  await tab.mouse.move(195 - turn / perPx, 420 + tilt / perPxTilt, { steps: 24 });
  await tab.mouse.up();
  await tab.keyboard.up('Shift');
  await tab.waitForTimeout(600);
}

if (orders) {
  // Las órdenes viven en una hoja que se abre desde la línea de resumen.
  await tab.locator('.valley-orders-now').click().catch(() => {});
  for (const label of orders.split(',')) {
    // Por nombre accesible parcial: el del botón es «Spare hands: Wood», porque
    // una posición del mando no significa nada sin su palanca.
    await tab.getByRole('button', { name: new RegExp(`: ${label.trim()}$`) }).click().catch(() => {});
    await tab.waitForTimeout(200);
  }
  await tab.locator('.valley-orders .valley-panel-close').click().catch(() => {});
}

if (zoomNotches !== 0) {
  await tab.mouse.move(195, 420);
  for (let i = 0; i < Math.abs(zoomNotches); i += 1) {
    await tab.mouse.wheel(0, zoomNotches > 0 ? -120 : 120);
    await tab.waitForTimeout(60);
  }
  await tab.waitForTimeout(400);
}

const swipeDown = async () => {
  await tab.mouse.move(195, 300); await tab.mouse.down();
  await tab.mouse.move(195, 700, { steps: 8 }); await tab.mouse.up();
};

if (waitFor) {
  const deadline = Date.now() + 150_000;
  let found = null;
  while (Date.now() < deadline && found === null) {
    await tab.waitForTimeout(700);
    const state = await tab.evaluate((what) => {
      const open = document.documentElement.classList.contains('crossroad-open');
      if (what === 'crossroad') return open ? 'yes' : null;
      if (open) return 'crossroad';
      const el = document.querySelector('.valley-moment');
      return el && !el.hidden ? el.textContent : null;
    }, waitFor);
    if (state === 'crossroad') { await swipeDown(); continue; }
    found = state;
  }
  console.log(found === null ? `no salió «${waitFor}» en 150 s` : `esperado «${waitFor}»: ${found}`);
} else if (runSeconds > 0) {
  // **Y se cierran las encrucijadas que salgan.** Corriendo a velocidad alta
  // aparece una cada pocos segundos, y una captura del valle con el velo de una
  // decisión encima no enseña el valle. Se deslizan igual que lo hace el dedo,
  // que es lo que §11.2 pide para cerrarla sin contestarla.
  const until = Date.now() + runSeconds * 1000;
  while (Date.now() < until) {
    await tab.waitForTimeout(500);
    const open = await tab.evaluate(() => document.documentElement.classList.contains('crossroad-open'));
    if (open) await swipeDown();
  }
}

if (sequence > 0) {
  const stem = out.replace(/\.png$/u, '');
  for (let n = 0; n < sequence; n += 1) {
    await tab.screenshot({ path: `${stem}-${String(n + 1).padStart(2, '0')}.png` });
    const open = await tab.evaluate(() => document.documentElement.classList.contains('crossroad-open'));
    if (open) await swipeDown();
    await tab.waitForTimeout(every * 1000);
  }
  console.log(`${sequence} capturas cada ${every} s → ${stem}-NN.png`);
}

const shot = await tab.screenshot({ path: out });

// Y a qué estación corresponde lo que se acaba de fotografiar, que es la mitad
// de lo que hace falta para juzgar si el reloj cuadra.
const season = await tab.evaluate(() => document.querySelector('.valley-season')?.textContent ?? '');
// Y la frase de estado y la línea de órdenes, que son lo que la cabecera dice.
const doing = await tab.evaluate(() => {
  const line = document.querySelector('.valley-doing');
  return line === null ? null : { text: line.textContent, hidden: line.hidden, display: getComputedStyle(line).display };
});
const ordersNow = await tab.evaluate(() => document.querySelector('.valley-orders-now')?.textContent ?? '');

/**
 * El brillo medio de la captura, de 0 a 1.
 *
 * Sin un número, «no se ve» es una opinión y «se ve oscuro» no se puede
 * comparar entre dos capturas. Se mide sobre **el PNG que se acaba de escribir**
 * y no sobre el lienzo: un lienzo de WebGL sin `preserveDrawingBuffer` está
 * vacío en cuanto acaba la llamada de dibujo, así que copiarlo daba cero
 * siempre — medido, y por eso está escrito aquí. La imagen se devuelve al
 * navegador en base64 y él la promedia, con el mismo peso de luminancia que usa
 * la regla de silueta de §10.4.
 *
 * Sirve para lo que el reloj destapó: a ×64 el valle parpadea entre día y noche
 * cada quince segundos, y hace falta saber cuánto es «noche».
 */
const brightness = await tab.evaluate(async (base64) => {
  const image = new Image();
  await new Promise((done, fail) => {
    image.onload = done;
    image.onerror = fail;
    image.src = `data:image/png;base64,${base64}`;
  });
  const flat = document.createElement('canvas');
  flat.width = 128;
  flat.height = 128;
  const ctx = flat.getContext('2d');
  if (ctx === null) return null;
  ctx.drawImage(image, 0, 0, flat.width, flat.height);
  const { data } = ctx.getImageData(0, 0, flat.width, flat.height);
  let total = 0;
  for (let at = 0; at < data.length; at += 4) {
    total += (0.2126 * data[at] + 0.7152 * data[at + 1] + 0.0722 * data[at + 2]) / 255;
  }
  return Number((total / (data.length / 4)).toFixed(3));
}, shot.toString('base64'));

const hud = await tab.evaluate(() => ({
  year: document.querySelector('.valley-year')?.textContent ?? null,
  vitals: [...document.querySelectorAll('.valley-vital')].map((e) => e.textContent),
}));
console.log(JSON.stringify({ ...hud, season, doing, ordersNow, brightness }), '→', out);
console.log('errores de página:', errors.length === 0 ? 'ninguno' : errors.slice(0, 5));
await browser.close();
