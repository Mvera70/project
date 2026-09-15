// S-02 · Comprueba que el trueno de U-13 llega a sonar, sin poder oírlo.
//
// `sound-check.mjs` ya prueba el ambiente (viento, río) y el interruptor con
// la página en su arranque normal, sin cielo. Esto entra por la ruta de
// depuración de U-13 (`?debug=1&live=1&weather=storm&...`), que adelanta el
// valle hasta una jornada de tormenta —esperarla mirando no es una forma de
// probarla, salen en el 4 % de las jornadas—, arma el sonido con un toque en
// la raíz —igual que hace el jugador; sin gesto no hay `AudioContext`, y eso
// es lo correcto— y espera a que `data-bolts` suba.
//
// **Qué se mira.** Web Audio no se puede "escuchar" desde un runner: no hay
// micrófono. Lo que sí se puede mirar es lo que crea `playAccent('thunder',
// ...)` en `src/ui/sound.ts` — un filtro paso-bajo nuevo, con su propio nodo
// de ganancia. Después de armar, `sound.ts` sólo crea paso-bajos en dos
// sitios: el arranque (viento a 650 Hz, río a 900 Hz, uno de cada, una vez) y
// el propio trueno (arranca en 420 Hz y cae hasta 90 Hz). El yunque de la
// fragua usa paso-alto, no paso-bajo, así que no se confunde con esto aunque
// la aldea ya tenga fragua encendida. Se instala un gancho en
// `AudioContext.prototype.createBiquadFilter` **antes** de cargar la página
// (`addInitScript`, corre antes que cualquier script del propio juego) que
// cuenta cuántos paso-bajos hay tras el arranque; si sube después del rayo,
// sonó. No se toca `sound.ts` ni `SOUND.THUNDER_*` — sólo se observa desde
// fuera, con el mismo tipo de gancho que ya usa `window.__valleySound`.
//
// Antes: `npx tsx tools/graphics/bundle-game.ts --split` y un servidor
// estático en `artifacts/graphics/G-10/game` (puerto 8127), porque la ruta de
// depuración pide parámetros por la URL y `file://` no los sirve para el
// bundle partido.
//
//   node tools/graphics/thunder-check.mjs
//   node tools/graphics/thunder-check.mjs --page "http://127.0.0.1:8127/valley.html?debug=1&live=1&weather=storm&seed=7&year=20&season=summer" --speed 16 --timeout 90

import { chromium } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const page = opt(
  'page',
  'http://127.0.0.1:8127/valley.html?debug=1&live=1&weather=storm&seed=7&year=20&season=summer',
);
const speed = opt('speed', '16');
const timeoutS = Number(opt('timeout', '90'));

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
// Nada de `--autoplay-policy=no-user-gesture-required`, por lo mismo que en
// `sound-check.mjs`: falsearía justo lo que hay que comprobar.
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const tab = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
tab.on('pageerror', (e) => errors.push(String(e)));
tab.on('console', (m) => {
  // `favicon.ico` no existe en `artifacts/graphics/G-10/game` y el servidor de
  // capturas no lo sirve; es el navegador pidiéndolo solo —el texto del aviso
  // no lleva la URL, sólo `location().url`— y no es un fallo del juego ni del
  // sonido, así que no se cuenta.
  if (m.type() !== 'error') return;
  if ((m.location()?.url ?? '').includes('favicon.ico')) return;
  errors.push(m.text());
});

// El gancho de observación, instalado antes de que exista la página. Sólo
// cuenta y etiqueta nodos que el juego crea por su cuenta; no cambia ni una
// ganancia ni una frecuencia de las que ya decide `sound.ts`.
await tab.addInitScript(() => {
  window.__thunderProbe = { biquads: [] };
  const ctor = window.AudioContext;
  if (ctor === undefined) return;
  const orig = ctor.prototype.createBiquadFilter;
  ctor.prototype.createBiquadFilter = function patchedCreateBiquadFilter(...rest) {
    const node = orig.apply(this, rest);
    const at = this.currentTime;
    // `.type` y `.frequency` se fijan justo después de crear el nodo, en la
    // misma función síncrona que lo crea (`createWind`, `createRiver`,
    // `noiseHit`, el trueno de `playAccent`). Un `setTimeout(0)` los lee ya
    // puestos, porque ese código síncrono termina antes de que corra ningún
    // temporizador.
    setTimeout(() => {
      window.__thunderProbe.biquads.push({ type: node.type, freq: node.frequency.value, at });
    }, 0);
    return node;
  };
});

await tab.goto(page);
await tab.waitForTimeout(1500);

const dismissPanel = async () => {
  await tab.mouse.move(195, 300);
  await tab.mouse.down();
  await tab.mouse.move(195, 700, { steps: 8 });
  await tab.mouse.up();
  await tab.waitForTimeout(200);
};
const swipeDown = dismissPanel;

// El toque que arma el sonido: el mismo gesto del jugador, en la raíz, no una
// llamada directa a `sound.arm()` — así se prueba el camino real (§4, camino
// vivo, la misma regla que separa las pruebas del camino muerto en V-11).
await tab.mouse.click(195, 300);
await tab.waitForTimeout(400);

const armed = await tab.evaluate(() => {
  const s = window.__valleySound;
  return s === undefined ? null : { state: s.context.state, masterGain: s.masterGain.value };
});
if (armed === null) fail('el toque no creó ningún AudioContext');
else if (armed.state !== 'running') fail(`AudioContext existe pero está «${armed.state}», no «running»`);
else console.log(`sonido armado: AudioContext en marcha, ganancia maestra ${armed.masterGain}`);

await dismissPanel();

// Cuántos paso-bajos hay ya —viento y río, del arranque— antes de contar
// nada más: se espera un respiro para que el `setTimeout(0)` del gancho haya
// corrido para los dos.
await tab.waitForTimeout(600);
const bootCount = await tab.evaluate(
  () => window.__thunderProbe.biquads.filter((b) => b.type === 'lowpass').length,
);
console.log(`paso-bajos tras armar (viento + río, se esperan 2): ${bootCount}`);
if (bootCount !== 2) {
  console.log(`aviso: se esperaban 2 (viento + río) y hay ${bootCount} — puede que la fragua ya sonara al armar`);
}

// Velocidad alta para no esperar un día entero de reloj real: a ×1 un día son
// unos 120 s (`TIME.REAL_MS_PER_TICK` / `TIME.DAYS_PER_WEEK`, 840000/7).
if (speed !== '1') {
  await tab.locator('.valley-speed-badge').click().catch(() => {});
  await tab.getByRole('button', { name: `${speed}×` }).click().catch(() => {});
  await tab.waitForTimeout(200);
}

// Se espera a que caiga un rayo, cerrando cualquier encrucijada que se
// interponga —igual que hace `shot.mjs` corriendo—, porque a esta velocidad
// puede salir una antes de que llegue la tormenta.
const start = Date.now();
const deadline = start + timeoutS * 1000;
let bolts = 0;
while (Date.now() < deadline && bolts === 0) {
  await tab.waitForTimeout(500);
  const open = await tab.evaluate(() => document.documentElement.classList.contains('crossroad-open'));
  if (open) { await swipeDown(); continue; }
  bolts = await tab.evaluate(() => Number(document.documentElement.dataset.bolts ?? '0'));
}
const waitedS = ((Date.now() - start) / 1000).toFixed(1);
if (bolts === 0) {
  fail(`data-bolts siguió en 0 tras ${waitedS} s (mira data-sky: si no es «storm», la jornada adelantada no era una tormenta)`);
} else {
  console.log(`data-bolts subió a ${bolts} tras ${waitedS} s`);
}

// El trueno llega con retraso (`SKY.THUNDER_DELAY`, entre 0,4 y 2,2 s de
// reloj real) después del rayo, y dura `SOUND.THUNDER_DURATION_S` — ninguno
// de los dos se toca aquí—, así que se da un margen amplio antes de volver a
// mirar el mismo hueco.
if (bolts > 0) {
  await tab.waitForTimeout(4000);
  const after = await tab.evaluate(
    () => window.__thunderProbe.biquads.filter((b) => b.type === 'lowpass').length,
  );
  const newLowpass = after - bootCount;
  if (newLowpass <= 0) {
    fail(`ningún paso-bajo nuevo tras el rayo (seguía en ${after}, arranque tenía ${bootCount}): el trueno no sonó`);
  } else {
    console.log(`trueno detectado: ${newLowpass} paso-bajo(s) nuevo(s) tras el rayo (arranque tenía ${bootCount}, ahora ${after})`);
    const detail = await tab.evaluate(
      (from) => window.__thunderProbe.biquads.filter((b) => b.type === 'lowpass').slice(from),
      bootCount,
    );
    for (const event of detail) {
      console.log(`  paso-bajo nuevo: frecuencia inicial ${event.freq.toFixed(1)} Hz en t=${event.at.toFixed(2)}s de audio`);
    }
  }
}

const sky = await tab.evaluate(() => document.documentElement.dataset.sky);
const finalGain = await tab.evaluate(() => window.__valleySound?.masterGain.value ?? null);
console.log(`cielo al terminar: ${sky}, rayos totales: ${bolts}, ganancia maestra: ${finalGain}`);
console.log('errores de página:', errors.length === 0 ? 'ninguno' : errors.slice(0, 5));
if (errors.length > 0) process.exitCode = 1;
await browser.close();
