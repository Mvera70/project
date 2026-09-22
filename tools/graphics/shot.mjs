// Capturas del juego montado, para mirar antes de decir que algo se ve bien.
//
//   node tools/graphics/shot.mjs                     → arranque, 390×844
//   node tools/graphics/shot.mjs --run 30 --speed 64  → tras 30 s a 64×
//   node tools/graphics/shot.mjs --wait moment        → espera a que salga una cartela de hito
//   node tools/graphics/shot.mjs --wait crossroad     → espera a una encrucijada
//   node tools/graphics/shot.mjs --out foo.png
//   node tools/graphics/shot.mjs --scene-only --out valley.png
//
// Playwright pide un navegador exacto y en esta máquina no hay red para
// bajarlo; hay otros instalados de versiones anteriores y valen igual. Se busca
// el más reciente en ~/AppData/Local/ms-playwright. Sin WebGL de verdad se usa
// swiftshader, que es lento pero pinta.
//
// Antes: `npx tsx tools/graphics/bundle-game.ts` para tener la página al día.

import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const runSeconds = Number(opt('run', '0'));
// --advance N   adelanta N semanas del motor antes de fotografiar, falseando el
//               reloj del navegador como hacen las jornadas de Playwright
//               (`tools/shots/valley.shots.ts`, `advanceWeeks`). Sin esto la única
//               aldea que se podía fotografiar era la del año 1 —la pareja
//               fundadora, dos cuerpos— y **ninguna fase de la capa de vida
//               podía entregar su evidencia**, porque lo que hay que ver es un
//               valle con gente y animales. La ruta `?debug=1` no sirve para
//               esto: monta el valle en Canvas, y la capa de vida es de 3D.
const advanceWeeks = Number(opt('advance', '0'));
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
// E0e · Sólo el lienzo WebGL, sin cabecera, hojas ni otro DOM. El renderer
// devuelve esta imagen en la misma llamada que fija la cámara, para que una
// revisión ciega de la escena no dependa de recortar píxeles de pantalla.
const sceneOnly = args.includes('--scene-only');
// Zoom del enganche de captura, no un gesto de rueda: permite ampliar una
// coordenada sin depender de la interfaz antes de pedir el mismo fotograma.
const hasCaptureZoom = args.includes('--capture-zoom');
const captureZoomArg = opt('capture-zoom', '');
let captureZoom = 1;
if (hasCaptureZoom) {
  captureZoom = Number(captureZoomArg);
  if (!Number.isFinite(captureZoom) || captureZoom < 0.1 || captureZoom > 1) {
    throw new Error(`--capture-zoom must be a finite factor from 0.1 to 1; got '${captureZoomArg}'.`);
  }
}
// G-27/E0e · encuadrar una coordenada del mundo para una captura focal.
// El renderer resuelve el encuadre mediante su hook de diagnóstico; no se
// permite degradar silenciosamente a la cámara panorámica si el hook falta.
const lookArg = opt('look', '');
let lookPoint = null;
if (lookArg !== '') {
  const parts = lookArg.split(',').map((part) => part.trim());
  if (parts.length !== 2 || parts.some((part) => part === '')) {
    throw new Error(`--look must be X,Z; got '${lookArg}'.`);
  }
  const x = Number(parts[0]);
  const z = Number(parts[1]);
  if (!Number.isFinite(x) || !Number.isFinite(z)) {
    throw new Error(`--look must contain finite numbers; got '${lookArg}'.`);
  }
  lookPoint = { x, z };
}
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
//   --open orders|speed   deja abierta la hoja de órdenes o la regleta antes de disparar
const open = opt('open', '');
const every = Number(opt('every', '2'));
//   --seed 7   el número del valle que se escribe en el menú de inicio
const seedArg = opt('seed', '');
// **U-10b · `--year N`: el valle se abre en ese año, jugado por el propio
// juego.** Es la vía buena desde el 16 sep 2026 y deja `--advance` para lo que
// de verdad necesite reloj de pared. Dos motivos medidos:
//   · `--advance` falsea el reloj año a año con medio segundo de espera por
//     salto: diecinueve años eran veinte segundos de captura. Esto tarda
//     trescientos milisegundos porque los ticks los cuenta el motor.
//   · y `--advance` no contesta las encrucijadas —de ahí `--answer`—, mientras
//     que el campo de año juega con la política de referencia, que es la
//     trayectoria contra la que están medidas las cifras del proyecto.
const yearArg = opt('year', '');
// E0e · fuerza sólo el acabado de era de un estado ya jugado. Es una toma de
// control, no cambia `GameState` ni la cabecera y nunca es una partida histórica.
const previewEra = opt('preview-era', '');
if (previewEra !== '' && !['hamlet', 'village', 'town'].includes(previewEra)) {
  throw new Error(`--preview-era must be hamlet, village or town; got '${previewEra}'.`);
}
if (sceneOnly && sequence > 0) {
  throw new Error('--scene-only captures one renderer frame; use one invocation per scene instead of --sequence.');
}
if (hasCaptureZoom && !sceneOnly && lookPoint === null) {
  throw new Error('--capture-zoom requires --scene-only or --look.');
}
// `--viewport 1024x768` conserva móvil por defecto y permite revisar tablet.
const viewportArg = opt('viewport', '390x844');
const viewportMatch = /^(\d{2,4})x(\d{2,4})$/u.exec(viewportArg);
if (viewportMatch === null) throw new Error(`--viewport must be WIDTHxHEIGHT; got '${viewportArg}'.`);
const viewport = { width: Number(viewportMatch[1]), height: Number(viewportMatch[2]) };
// `--page` acepta también una dirección `http://`. La demo partida en dos
// (`bundle-game.ts --split`) pide su JSON de recursos por la red, y una página
// abierta como `file://` no puede pedir nada: sin esto, la única manera de
// comprobar que los modelos llegan era publicarla y mirar con el dedo.
const pageArg = opt('page', 'artifacts/graphics/G-10/game/valley.html');
const pageBase = /^https?:\/\//u.test(pageArg)
  ? pageArg
  : `file:///${resolve(pageArg).replace(/\\/g, '/')}`;
const pageUrl = new URL(pageBase);
if (previewEra !== '') pageUrl.searchParams.set('preview-era', previewEra);
const page = pageUrl.toString();

function browserExe() {
  const root = join(homedir(), 'AppData', 'Local', 'ms-playwright');
  if (existsSync(root)) {
    try {
      const dirs = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort();
      for (const dir of dirs.reverse()) {
        const exe = join(root, dir, 'chrome-win64', 'chrome.exe');
        if (existsSync(exe)) return exe;
      }
    } catch {
      // Continúa con el navegador instalado fuera de la carpeta protegida.
    }
  }
  // En este equipo la carpeta de Playwright existe pero no es legible para el
  // runner. Chrome instalado sirve igual para la captura WebGL.
  for (const exe of [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ]) if (existsSync(exe)) return exe;
  return undefined;
}

const exe = browserExe();
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const tab = await browser.newPage({ viewport, deviceScaleFactor: 2 });
const errors = [];
tab.on('pageerror', (e) => errors.push(String(e)));
tab.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
// El reloj falso se instala **antes** de navegar, porque la página lo lee al
// arrancar; después ya no se le puede cambiar por debajo.
if (advanceWeeks > 0) await tab.clock.install();
await tab.goto(page);
// U-10 · el menú de inicio: se funda un valle nuevo, que es lo que hace el
// dedo la primera vez. `--seed N` escribe ese número antes de fundar.
await tab.locator('.title-scrim').waitFor({ timeout: 5000 }).catch(() => {});
if (seedArg !== '') await tab.locator('#valley-seed').fill(seedArg).catch(() => {});
// El campo del año vive detrás del interruptor de taller, que es donde tiene
// que estar: lo que este menú configura para quien juega sigue siendo sólo el
// número del valle. Se pulsa si está apagado — la preferencia se recuerda en
// `localStorage`, y en un navegador recién abierto empieza apagada.
if (yearArg !== '') {
  const toggle = tab.locator('.title-dev');
  if (await toggle.getAttribute('aria-pressed').catch(() => null) === 'false') {
    await toggle.click().catch(() => {});
  }
  await tab.locator('#valley-year').fill(yearArg).catch(() => {});
}
//   --open title   se queda en el menú, para fotografiarlo
if (open !== 'title') await tab.locator('.title-new').click().catch(() => {});
//   --settle S   segundos que se espera tras fundar antes de hacer nada (8 por defecto;
//                0.5 para ver el vuelo de entrada de U-11 fotograma a fotograma)
await tab.waitForTimeout(open === 'title' ? 1500 : Number(opt('settle', '8')) * 1000);

// --advance: el salto. `TIME.REAL_MS_PER_TICK` son 840 000 ms por semana a ×1
// (§12.1, v3.72), y el motor cobra lo que le deben con `ticksOwed`. Se salta en
// tramos de una generación —`LETHARGY_CAP_MS`, 960 ticks— porque el letargo de
// §13.2 recorta cualquier ausencia más larga que eso, así que un solo salto de
// veinte años se quedaría corto y en silencio.
if (advanceWeeks > 0) {
  const MS_PER_WEEK = 840_000;
  // **Año a año, y con espera de reloj de verdad entre saltos.** El primer
  // intento saltaba los veinte años de golpe y la aldea llegaba al año 2: el
  // motor no cobra los ticks que le deben de una vez, los cobra **por lotes de
  // 64 en fotogramas sucesivos** (`runBatch`, §13.2), así que un salto grande
  // seguido de 400 ms deja casi todo sin cobrar y en silencio. Cuarenta y ocho
  // semanas por salto es un año, y basta medio segundo para que se cobre.
  const CHUNK = 48;
  for (let left = advanceWeeks; left > 0; left -= CHUNK) {
    await tab.clock.fastForward(Math.min(left, CHUNK) * MS_PER_WEEK);
    await tab.waitForTimeout(500);
  }
  await tab.waitForTimeout(1500);
}

// **Contestar la encrucijada que tapa el valle.** Es la trampa que `CLAUDE.md`
// documenta para los informes, vista desde la cámara: la primera encrucijada
// planteada se queda abierta para siempre si nadie contesta, y con `--advance`
// de veinte años **siempre hay una**. Con la hoja abierta la regleta está
// oculta, así que `--speed` tampoco entraba. Se pulsa la opción pedida
// (1 = la primera) las veces que haga falta, como haría el dedo.
//   --answer 1   contesta con la primera opción cada encrucijada abierta
const answer = Number(opt('answer', '0'));
if (answer > 0) {
  for (let round = 0; round < 6; round += 1) {
    const button = tab.locator('.crossroad-options button').nth(answer - 1);
    if (!(await button.isVisible().catch(() => false))) break;
    await button.click().catch(() => {});
    await tab.waitForTimeout(800);
  }
}

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

// F3 · `--ended <causa>` acaba la partida ahí mismo y espera a que suba la
// lapida y su hoja de cuentas, que es la unica manera de fotografiar las cuatro
// maneras de acabar sin esperar a que un valle se muera de cada una. La causa
// se aplica sobre el estado del juego ya abierto (`__valleyEnd`), asi que la
// foto sale con **el valle de verdad detras**, que es la mitad de lo que esta
// pantalla tiene que enseñar.
const endedCause = opt('ended', '');
if (endedCause !== '') {
  await tab.evaluate((cause) => window.__valleyEnd?.(cause), endedCause);
  // La lapida dura 2,2 s y despues sube la hoja: se espera lo uno o lo otro
  // segun lo que se quiera fotografiar (`--open stone` para la lapida).
  await tab.waitForTimeout(open === 'stone' ? 1200 : 3600);
}

// C4 · `--open cart` abre el carro y **espera a que esté puesto**. Con `--open
// orders` la captura salia con el valle: se pulsaba y se fotografiaba 300 ms
// despues, sin comprobar que la seccion hubiera montado. Esperar al elemento es
// lo que hace que la foto sea una prueba y no una casualidad.
if (open === 'orders' || open === 'cart') {
  await tab.locator('.valley-orders-now').click().catch(() => {});
  await tab.locator('.valley-cart').waitFor({ timeout: 4000 }).catch(() => {});
}
if (open === 'speed') await tab.locator('.valley-speed-badge').click().catch(() => {});
if (open) await tab.waitForTimeout(300);

let sceneImage = null;
if (lookPoint !== null || sceneOnly) {
  sceneImage = await tab.evaluate(({ point, zoom }) => {
    if (typeof window.__valleyCapture !== 'function') {
      throw new Error('--scene-only/--look requires the renderer __valleyCapture hook, but it is unavailable.');
    }
    const captured = point === null
      ? window.__valleyCapture(-1, zoom, false)
      : window.__valleyCapture(-1, zoom, false, point);
    if (captured === null || typeof captured !== 'object' || typeof captured.image !== 'string') {
      throw new Error('The renderer __valleyCapture hook returned no PNG image.');
    }
    return captured.image;
  }, { point: lookPoint, zoom: captureZoom });
}

if (sequence > 0) {
  const stem = out.replace(/\.png$/u, '');
  // Y cada fotograma dice **qué hora era**, que es la mitad de lo que hace
  // falta para juzgar el reloj de U-12: una secuencia en la que el sol baja
  // mientras el reloj sube no se puede leer sin las horas al lado.
  const when = [];
  for (let n = 0; n < sequence; n += 1) {
    // La hora **antes** del disparo, no después: una captura tarda casi un
    // segundo en esta máquina y a ×1 eso es una hora de valle, así que leerla
    // después etiquetaba cada fotograma con la hora del siguiente.
    when.push(await tab.evaluate(() => {
      const time = document.querySelector('.valley-time')?.textContent ?? '';
      const date = document.querySelector('.valley-date')?.textContent ?? '';
      const phase = document.documentElement.dataset.sunPhase ?? '-';
      return `${time} ${date} · fase ${phase}`;
    }));
    await tab.screenshot({ path: `${stem}-${String(n + 1).padStart(2, '0')}.png` });
    const open = await tab.evaluate(() => document.documentElement.classList.contains('crossroad-open'));
    if (open) await swipeDown();
    await tab.waitForTimeout(every * 1000);
  }
  console.log(`${sequence} capturas cada ${every} s → ${stem}-NN.png`);
  when.forEach((label, n) => console.log(`  ${String(n + 1).padStart(2, '0')} · ${label}`));
}

let shot;
if (sceneOnly) {
  if (typeof sceneImage !== 'string') throw new Error('--scene-only did not receive a PNG from __valleyCapture.');
  const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/u.exec(sceneImage);
  if (match === null) throw new Error('--scene-only received an invalid PNG data URL from __valleyCapture.');
  shot = Buffer.from(match[1], 'base64');
  if (shot.length < 8 || !shot.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error('--scene-only decoded data is not a PNG image.');
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, shot);
} else {
  shot = await tab.screenshot({ path: out });
}

// Y a qué estación corresponde lo que se acaba de fotografiar, que es la mitad
// de lo que hace falta para juzgar si el reloj cuadra.
const season = await tab.evaluate(() => document.querySelector('.valley-date')?.textContent ?? '');
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
  year: document.querySelector('.valley-time')?.textContent ?? null,
  vitals: [...document.querySelectorAll('.valley-vital')].map((e) => e.textContent),
}));
console.log(JSON.stringify({ ...hud, season, doing, ordersNow, brightness }), '→', out);
console.log('errores de página:', errors.length === 0 ? 'ninguno' : errors.slice(0, 5));
await browser.close();
