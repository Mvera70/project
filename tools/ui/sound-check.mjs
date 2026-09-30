// ¿Suena lo que tiene que sonar, cuando tiene que sonar? Recorre la interfaz
// **con clics de verdad** en Chromium y lee lo que el reproductor apuntó
// (`window.__valleySound`, `src/ui/sound.ts`): qué sonido empezó y a qué altura.
//
// Existe porque una prueba que llama a `routeCue` no sabe si el juego la llama
// (CLAUDE.md), y porque el sonido es lo único de la interfaz que no sale en
// una captura. Lo que mide es el **cuándo**; el **cómo suena** se escucha.
//
//   node tools/ui/sound-check.mjs            → recorrido, informe y capturas en
//                                              artifacts/audio/check/
//   node tools/ui/sound-check.mjs --headed   → con ventana, para oírlo
//   node tools/ui/sound-check.mjs --chrome /opt/pw-browsers/chromium
//
// Levanta su propio servidor de Vite: los ficheros de `public/audio/` se piden
// con `fetch`, y una página abierta como `file://` no puede pedir nada.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';

const OUT = resolve('artifacts/audio/check');
mkdirSync(OUT, { recursive: true });
const headed = process.argv.includes('--headed');
// `--chrome <ruta>`: el Chromium que haya en la máquina, si el que pide esta
// versión de Playwright no está (en la nube: /opt/pw-browsers/chromium).
const chromeAt = process.argv.indexOf('--chrome');
const executablePath = chromeAt >= 0 ? process.argv[chromeAt + 1] : undefined;

const server = await createServer({ server: { port: 0, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const address = server.httpServer.address();
const base = `http://127.0.0.1:${address.port}/`;

const browser = await chromium.launch({
  headless: !headed,
  ...(executablePath ? { executablePath } : {}),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const tab = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
// Con swiftshader y la escena de hoy, montar el valle puede pasar de treinta
// segundos: el tope por omisión de Playwright se queda corto y el recorrido
// falla por lento, no por roto.
tab.setDefaultTimeout(90_000);
const errors = [];
tab.on('pageerror', (e) => errors.push(String(e)));
tab.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

/** Lo oído hasta ahora. */
const played = async () => tab.evaluate(() => (window.__valleySound?.played ?? []).map((p) => ({ ...p })));
const steps = [];
/**
 * Un paso: hace algo y apunta qué empezó a sonar después. `forbidden` es lo que
 * **no** puede sonar además, que es como se comprueba que el sello genérico no
 * se pone encima de un botón con voz propia. `expect` es lo que
 * debería haber sonado —`null`, que nada—; el informe dice si coincidió.
 * `ONCE` en lugar de `forbidden` exige que suene **eso y sólo eso**, una vez:
 * un botón con voz propia que suena dos o tres veces es el fallo que la
 * revisión del 30 sep 2026 encontró en nueve botones.
 */
const ONCE = Symbol('once');
async function step(name, expect, act, forbidden, waitMs = 500) {
  const before = (await played()).length;
  await act();
  // El sonido se decodifica después del toque (`SOUND.LATE_PLAY_MS`): se da
  // medio segundo antes de leer. Lo que contesta el motor llega en un tick, y
  // con swiftshader eso ronda ya el medio segundo: esos pasos esperan más.
  await tab.waitForTimeout(waitMs);
  const after = await played();
  const heard = after.slice(before).map((p) => (p.rate === 1 ? p.cue : `${p.cue}@${p.rate}`));
  const matches = (want) => heard.some((cue) => cue === want || cue.startsWith(`${want}@`));
  const once = forbidden === ONCE;
  const ok = (expect === null ? heard.length === 0 : matches(expect))
    && (once ? heard.length === 1 : forbidden === undefined || !matches(forbidden));
  steps.push({ name, expect, forbidden: once ? 'once' : forbidden, heard, ok });
  console.log(`${ok ? '✓' : '✗'} ${name.padEnd(42)} ${heard.join(', ') || '—'}`);
}
const tabButton = (label) => tab.locator(`.skin-nav-tab[aria-label="${label}"]`);

await tab.goto(base);
await tab.locator('.title-scrim').waitFor({ timeout: 15_000 });
await tab.waitForTimeout(800);
await tab.screenshot({ path: `${OUT}/title.png` });
await step('portada · el dado de la semilla suena a sello', 'ui_button_press', () => tab.locator('.title-reroll').click());
await step('portada · abrir opciones gráficas', 'ui_panel_open', () => tab.locator('.title-graphics').click());
await step('portada · cerrarlas', 'ui_panel_close', () => tab.keyboard.press('Escape'));
// Los cierres de la portada suenan en su `onClose` (`title.ts`): con el sello
// encima sonaban tres veces.
await step('portada · abrir opciones gráficas otra vez', 'ui_panel_open', () => tab.locator('.title-graphics').click());
await step('portada · cerrarlas con «Done» (una vez)', 'ui_panel_close', () => tab.locator('.graphics-done').click(), ONCE);
await step('portada · abrir el cronicón', 'ui_panel_open', () => tab.locator('.title-annals:not(.title-graphics)').click());
await step('portada · cerrarlo (una vez)', 'ui_panel_close', () => tab.locator('.annals-close').click(), ONCE);
await step('portada · silenciar (el propio botón calla)', null, () => tab.locator('.title-sound').click());
await step('portada · volver a encender (se oye)', 'ui_resume', async () => {
  await tab.waitForTimeout(100);
  await tab.locator('.title-sound').click();
});
await step('portada · Begin', 'ui_title_begin', () => tab.locator('.title-new').click());
await tab.waitForFunction(() => document.documentElement.dataset.appReady === 'true', null, { timeout: 60_000 });
await tab.waitForTimeout(1500);

// Y lo que el sello **no** debe tapar: una pestaña tiene voz propia, así que
// suena a cofre y **no además** a botón corriente (`OWN_VOICE` en `sound.ts`).
await step('valle · abrir la crónica (y sin sello encima)', 'ui_panel_open',
  () => tabButton('Chronicle').click(), 'ui_button_press');
await step('crónica → gente', 'ui_tab_change', () => tabButton('People').click());
await step('gente · tocar una persona', 'ui_person_select', () => tab.locator('.people-row').first().click());
await step('ficha · volver a la gente (una vez)', 'ui_tab_change', () => tab.locator('.valley-panel-back').click(), ONCE);
await step('gente · cerrar la bandeja (una vez)', 'ui_panel_close', () => tab.locator('.ui-shell-content-close').click(), ONCE);
await step('abrir la crónica', 'ui_panel_open', () => tabButton('Chronicle').click());
// En el juego el cierre propio de la crónica y el del carro están ocultos
// (`wood.css`): el que se toca es el de la bandeja, en las cuatro hojas.
await step('crónica · cerrarla (una vez)', 'ui_panel_close',
  () => tab.locator('.ui-shell-content-close').click(), ONCE);
await step('cabecera · abrir el carro (una vez)', 'ui_panel_open', () => tab.locator('.valley-orders-now').click(), ONCE);
await step('carro · cerrarlo (una vez)', 'ui_panel_close', () => tab.locator('.ui-shell-content-close').click(), ONCE);
await step('abrir la gente', 'ui_panel_open', () => tabButton('People').click());
await step('volver al valle', 'ui_panel_close', () => tabButton('Valley').click());
await tab.waitForTimeout(400);
await step('pausar', 'ui_pause', () => tab.locator('.hud-speed-cluster .hud-round-btn').first().click());
await step('seguir', 'ui_resume', () => tab.locator('.hud-speed-cluster .hud-round-btn').first().click());
// El badge sólo despliega la regleta: es un botón corriente y suena a sello.
await step('abrir la regleta (sello, no velocidad)', 'ui_button_press',
  () => tab.locator('.valley-speed-badge').click(), 'ui_speed_change');
await step('velocidad ×4 (más aguda)', 'ui_speed_change', () => tab.locator('.valley-speeds button', { hasText: '4' }).first().click());
await tab.screenshot({ path: `${OUT}/valley-corner.png` });
await step('silenciar el valle', null, () => tab.locator('.valley-sound').click());
await step('en silencio, abrir la crónica no suena', null, () => tabButton('Chronicle').click());
await step('en silencio, cerrarla no suena', null, () => tabButton('Valley').click());
await step('encender el valle (se oye)', 'ui_resume', () => tab.locator('.valley-sound').click());
await step('despejar la pantalla (sello)', 'ui_button_press', () => tab.locator('.valley-bare').click());
await tab.screenshot({ path: `${OUT}/valley-bare.png` });

// Lo que no es un clic en un botón de la carcasa: la respuesta del motor a lo
// que hizo el jugador. Rutas de depuración (`main.ts`), porque esperar a que
// suba un buhonero o a que se plantee una encrucijada son horas de reloj.
/** Abre una ruta y toca el cielo una vez: el primer toque es el que arma el audio. */
async function openArmed(query) {
  await tab.goto(`${base}?debug=1&live=1&seed=7&year=3&season=summer&${query}`);
  await tab.waitForFunction(() => document.documentElement.dataset.appReady === 'true', null, { timeout: 90_000 });
  await tab.waitForTimeout(1200);
  await tab.mouse.click(4, 300);
  await tab.waitForTimeout(300);
}
await openArmed('offer=1');
await step('oferta · aceptarla (responde el motor)', 'ui_offer_accept', async () => {
  await tab.locator('.valley-voice-answer').first().click();
}, undefined, 1500);
await openArmed('crossroad=1');
await step('encrucijada · elegir una opción (el sello)', 'ui_crossroad_decide', async () => {
  await tab.locator('.crossroad-options button').first().click();
});
// Un nombre en la crónica abre su ficha: hace falta un valle con historia,
// porque la de uno recién fundado todavía no nombra a nadie.
await openArmed('');
await step('valle hecho · abrir la crónica', 'ui_panel_open', () => tabButton('Chronicle').click());
await step('crónica · un nombre abre su ficha (una vez)', 'ui_person_select',
  () => tab.locator('.chronicle-name-link').first().click(), ONCE);

// ---------------------------------------------------------------------------
// **El fondo del mundo** (fase 1). Aquí no se mira qué empezó a sonar sino qué
// capas están pedidas: el ambiente no se dispara, se mantiene. La mezcla viva
// la publica el reproductor en `window.__valleySound.mix`.
// ---------------------------------------------------------------------------
const mix = async () => tab.evaluate(() => ({ ...(window.__valleySound?.mix ?? {}) }));
const ambience = [];
async function bed(name, check, act) {
  await act();
  // Un cruce entero tarda 1/`AMBIENCE_EASE` = 2,5 s: con menos espera se mide
  // una capa a medio entrar y parece que falta.
  await tab.waitForTimeout(3200);
  const now = await mix();
  const layers = Object.entries(now).filter(([, gain]) => gain > 0.01)
    .map(([layer, gain]) => `${layer.replace('amb_', '')} ${gain.toFixed(2)}`);
  let ok = true;
  let why = '';
  try { check(now); } catch (error) { ok = false; why = String(error.message ?? error); }
  ambience.push({ name, layers, ok, why });
  console.log(`${ok ? '✓' : '✗'} ${name.padEnd(42)} ${layers.join(' · ') || '—'}${why ? `  ← ${why}` : ''}`);
}
const has = (now, layer) => {
  if (!(now[layer] > 0.01)) throw new Error(`falta ${layer}`);
};
const lacks = (now, layer) => {
  if (now[layer] > 0.01) throw new Error(`sobra ${layer}`);
};

await tab.goto(`${base}?debug=1&live=1&seed=7&year=6&season=summer`);
await tab.waitForFunction(() => document.documentElement.dataset.appReady === 'true', null, { timeout: 90_000 });
await tab.mouse.click(4, 300);
await bed('cielo claro · sólo viento y río', (now) => {
  has(now, 'amb_wind_calm');
  lacks(now, 'amb_rain_light');
  lacks(now, 'amb_storm_bed');
}, async () => { await tab.evaluate(() => window.__valleyHoldSky?.('clear')); });

await bed('lluvia · entra el lecho de lluvia', (now) => has(now, 'amb_rain_light'),
  async () => { await tab.evaluate(() => window.__valleyHoldSky?.('rain')); });

await bed('tormenta · lecho de tormenta y racha', (now) => {
  has(now, 'amb_storm_bed');
  has(now, 'amb_wind_gust');
}, async () => { await tab.evaluate(() => window.__valleyHoldSky?.('storm')); });

await bed('nieve · el aire amortiguado', (now) => has(now, 'amb_snow_hush'),
  async () => { await tab.evaluate(() => window.__valleyHoldSky?.('snow')); });

// Fase 2: el día, la noche y la aldea. `__valleyHoldPhase` congela la hora.
await bed('de día cantan los pájaros', (now) => {
  has(now, 'amb_birds_day');
  lacks(now, 'amb_night_summer');
}, async () => { await tab.evaluate(() => { window.__valleyHoldSky?.('clear'); window.__valleyHoldPhase?.(0.45); }); });

await bed('de noche se relevan: grillos y la aldea callada', (now) => {
  has(now, 'amb_night_summer');
  lacks(now, 'amb_birds_day');
}, async () => { await tab.evaluate(() => window.__valleyHoldPhase?.(0.96)); });

await bed('en pausa el mundo calla del todo', (now) => {
  if (Object.values(now).some((gain) => gain > 0.01)) throw new Error('algo sigue sonando');
}, async () => { await tab.evaluate(() => window.__valleySpeed?.(0)); });

await bed('y al seguir, vuelve', (now) => has(now, 'amb_wind_calm'), async () => {
  await tab.evaluate(() => { window.__valleyHoldSky?.('clear'); window.__valleySpeed?.(1); });
});

// **Lo que este recorrido NO puede comprobar: la escalera de población.**
// Se intentó comparar dos valles (año 3 y año 30) y la medida salía al revés,
// pero no por el sonido: desde fuera no hay forma de apuntar la cámara a la
// plaza, así que lo que se comparaba era hacia dónde miraba cada una. Con el
// valle encuadrado entero, la plaza queda a más de treinta celdas y el
// bullicio se apaga **por sitio**, que es justo lo que debe hacer.
//
// La escalera —más gente, más bullicio— es una propiedad pura y vive donde le
// toca: `tests/fast/sound.test.ts`, «cuanta más gente, más bullicio». Aquí lo
// que se comprueba es que la aldea **suena de verdad en el juego**, y eso lo
// dice el paso «y de día la aldea se oye» de arriba.

const preference = await tab.evaluate(() => localStorage.getItem('valley.sound'));
const failed = steps.filter((s) => !s.ok);
const ambienceFailed = ambience.filter((row) => !row.ok);
const report = { base, preference, steps, ambience, errors,
  failed: failed.length + ambienceFailed.length };
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(`\n${steps.length - failed.length}/${steps.length} toques · `
  + `${ambience.length - ambienceFailed.length}/${ambience.length} ambiente · `
  + `preferencia guardada: ${preference}`);
if (errors.length > 0) console.log(`errores de página:\n  ${errors.join('\n  ')}`);
await browser.close();
await server.close();
process.exit(report.failed > 0 ? 1 : 0);
