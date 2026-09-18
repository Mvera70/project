// El paquete de prensa: **todas las pantallas del juego y todos sus estados**,
// en una pasada y con una hoja de contactos para mirarlas seguidas.
//
// Lo pidió el dueño del diseño el 18 sep 2026: «necesito un paquete completo de
// capturas de todas las pantallas que tenemos ahora mismo en el juego, todas y
// cada una de ellas, las diferentes formas; si aparece un botón, sin botón,
// desplegado, sin desplegar. Lo necesito para hacer una especie de vídeo
// trailer».
//
// **Por qué una herramienta y no treinta llamadas a `shot.mjs`.** Esa herramienta
// abre un navegador por captura y el valle tarda nueve segundos en montarse:
// treinta capturas serían veinte minutos y un valle distinto en cada una. Aquí
// el navegador se abre una vez y cada **sesión** —un valle recién fundado— da
// varias capturas seguidas, así que las de un mismo grupo son el mismo pueblo a
// la misma hora, que es lo que un montaje necesita.
//
// **Cada captura dice qué se estaba viendo.** Junto al PNG se escribe una línea
// con la hora del valle, la pantalla activa y las clases de la raíz: una captura
// que no se sabe qué enseña es peor que no tenerla, y con treinta a la vez no
// hay forma de acordarse.
//
// **Y los planos del tráiler van sin interfaz**, que es la otra mitad de este
// encargo. El guion que el dueño del diseño escribió —un valle vacío al
// amanecer, los dos que llegan, la primera casa, la aldea creciendo por
// estaciones, escenas pequeñas, la muralla cerrándose, una amenaza al fondo— es
// **metraje**, no pantallas: cada uno de esos planos se captura con la pantalla
// despejada (el botón de UI-V10), así que sale el valle solo, sin cabecera, sin
// bandeja y sin barra. Los estados de interfaz van aparte, en sus grupos.
//
// Los grupos, y se eligen con `--only`:
//
//   menu entrada valle horas cronica gente carro encrucijada asedio final
//     · las pantallas y sus estados, con la interfaz puesta
//   crecimiento estaciones escenas cerco
//     · el metraje del tráiler, sin interfaz
//
//   npx tsx tools/graphics/bundle-game.ts --out artifacts/graphics/press/game
//   node tools/graphics/press-kit.mjs
//   node tools/graphics/press-kit.mjs --only crecimiento,escenas
//   node tools/graphics/press-kit.mjs --width 750            (la tablet)
//
// Sale en `artifacts/graphics/press/`: los PNG numerados, `index.html` con la
// hoja de contactos y `manifest.json` con lo que cada una enseña.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 || at + 1 >= args.length ? fallback : args[at + 1];
};
const only = opt('only', '').split(',').filter((s) => s !== '');
const width = Number(opt('width', '390'));
const height = Number(opt('height', '844'));
const scale = Number(opt('scale', '3'));
const seed = opt('seed', '7');
const year = opt('year', '50');
const outDir = resolve(opt('out', 'artifacts/graphics/press'));
const pageArg = opt('page', join(outDir, 'game', 'valley.html'));

function browserExe() {
  const root = join(homedir(), 'AppData', 'Local', 'ms-playwright');
  if (existsSync(root)) {
    try {
      for (const dir of readdirSync(root).filter((d) => /^chromium-[0-9]+$/.test(d)).sort().reverse()) {
        const exe = join(root, dir, 'chrome-win64', 'chrome.exe');
        if (existsSync(exe)) return exe;
      }
    } catch { /* sigue con el navegador instalado fuera de la carpeta */ }
  }
  for (const exe of [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ]) if (existsSync(exe)) return exe;
  return undefined;
}

mkdirSync(outDir, { recursive: true });
const exe = browserExe();
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});

const NL = String.fromCharCode(10);
const shots = [];
// `--offset N` arranca la numeración en N: una tanda que se cayó a medias se
// continúa sin renumerar lo que ya salió bien.
let count = Number(opt('offset', '0'));

/** Abre una página nueva. `query` usa la ruta de depuración del observatorio. */
async function open(query = '') {
  const tab = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: scale,
  });
  const errors = [];
  tab.on('pageerror', (e) => errors.push(String(e)));
  const url = pathToFileURL(resolve(pageArg));
  if (query !== '') url.search = query;
  await tab.goto(url.href);
  tab.__errors = errors;
  return tab;
}

/** El camino del dedo: el menú de inicio con su número de valle y su año. */
async function found(tab, settleMs = 9000, whichYear = year) {
  await tab.locator('.title-scrim').waitFor({ timeout: 8000 }).catch(() => {});
  await tab.locator('#valley-seed').fill(seed).catch(() => {});
  if (await tab.locator('.title-dev').getAttribute('aria-pressed').catch(() => null) === 'false') {
    await tab.locator('.title-dev').click().catch(() => {});
  }
  await tab.locator('#valley-year').fill(String(whichYear)).catch(() => {});
  await tab.locator('.title-new').click().catch(() => {});
  await tab.waitForTimeout(settleMs);
}

/**
 * Aparta una encrucijada si hay una abierta, deslizándola como el dedo.
 *
 * Hace falta y lo enseñó la primera tanda: el campo de año juega la trayectoria
 * de verdad, así que un valle puede abrir con una decisión planteada — y una
 * decisión encima no es un plano del valle. Además **tumbó la tanda**: con el
 * velo puesto, `page.screenshot` se quedó esperando treinta segundos y se cayó
 * en el año 22. Aplazarla es lo que §11.2 deja hacer sin contestarla.
 */
async function dismiss(tab) {
  if (!await tab.evaluate(() => document.documentElement.classList.contains('crossroad-open'))) return;
  await tab.mouse.move(width / 2, height * 0.35);
  await tab.mouse.down();
  await tab.mouse.move(width / 2, height * 0.92, { steps: 12 });
  await tab.mouse.up();
  await tab.waitForTimeout(1200);
}

/** Quita la interfaz de en medio: es el botón del valle, el de UI-V10. */
async function bare(tab) {
  // Con reintento, y hace falta: en la primera tanda el año 32 salió **con la
  // interfaz puesta** en medio de una tira que no la tiene. Un click que se
  // pierde no se nota hasta que se miran las nueve capturas en fila.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await tab.evaluate(() => document.documentElement.classList.contains('bare'))) return;
    await tab.locator('.valley-bare').click().catch(() => {});
    await tab.waitForTimeout(700);
  }
  console.log('  ojo: no se pudo despejar la pantalla');
}

/**
 * Espera a que el valle marque esa hora, corriendo a x64 mientras tanto.
 *
 * **Para que una tira de crecimiento sea una tira.** El campo de anyo juega la
 * trayectoria antes de abrir, y jugar sesenta anyos tarda mas que jugar uno, asi
 * que cada captura de la serie caia a una hora distinta: en la primera tanda el
 * anyo 32 salio **de noche** entre dos dias claros, y una tira asi no se puede
 * montar. A x64 el dia escenico dura menos de dos segundos, o sea que cualquier
 * hora llega en un par de segundos; luego se vuelve a x1 para que la jornada se
 * mueva a su paso y la gente no vaya a tirones en el plano.
 */
async function atHour(tab, hour = '09') {
  const target = `${hour}:00`;
  await tab.locator('.valley-speed-badge').click().catch(() => {});
  await tab.waitForTimeout(350);
  await tab.getByRole('button', { name: '64x' }).click().catch(() => {});
  await tab.getByRole('button', { name: '64×' }).click().catch(() => {});
  await tab.waitForFunction(
    (want) => document.querySelector('.valley-time')?.textContent?.trim() === want,
    target,
    { timeout: 20000, polling: 100 },
  ).catch(() => {});
  await tab.locator('.valley-speed-badge').click().catch(() => {});
  await tab.waitForTimeout(300);
  await tab.getByRole('button', { name: '1x' }).click().catch(() => {});
  await tab.getByRole('button', { name: '1×' }).click().catch(() => {});
  await tab.waitForTimeout(1500);
}

/** Aleja la vista con la rueda, que es lo que hace el dedo al pellizcar. */
async function wide(tab, notches = 4) {
  for (let n = 0; n < notches; n += 1) {
    await tab.mouse.move(width / 2, height * 0.45);
    await tab.mouse.wheel(0, 120);
    await tab.waitForTimeout(120);
  }
  await tab.waitForTimeout(900);
}

/** Dispara, y apunta qué se estaba viendo. */
async function shot(tab, name, note) {
  count += 1;
  const id = `${String(count).padStart(2, '0')}-${name}`;
  const seen = await tab.evaluate(() => {
    const text = (sel) => document.querySelector(sel)?.textContent?.trim() ?? null;
    return {
      hora: text('.valley-time'),
      fecha: text('.valley-date'),
      pantalla: document.documentElement.dataset.screen ?? null,
      clases: document.documentElement.className,
      voz: text('.valley-voice-line'),
    };
  }).catch(() => ({}));
  // Sesenta segundos y sin esperar a que las animaciones paren: con el velo de
  // una decisión encima, los treinta de serie se agotaban y la tanda entera se
  // caía por una captura.
  let ok = true;
  try {
    await tab.screenshot({ path: join(outDir, `${id}.png`), timeout: 60000, animations: 'allow' });
  } catch (error) {
    ok = false;
    console.log(`${id}  NO SALIO: ${String(error).slice(0, 90)}`);
  }
  if (ok) shots.push({ id, name, note, ...seen, errores: (tab.__errors ?? []).length });
  if (ok) writeSheet();
  if (ok) console.log(`${id}  ${note}  ·  ${seen.hora ?? '--'} ${seen.pantalla ?? ''} ${seen.clases ?? ''}`);
}

/**
 * La hoja de contactos y el manifiesto, **escritos en cada disparo**.
 *
 * Es lo que costo la primera tanda: se cayo en la captura cuarenta y tres y se
 * quedo sin hoja ni manifiesto, con cuarenta y dos PNG sueltos y nada que
 * dijera que era cada uno. Escribirla cada vez cuesta milisegundos y deja el
 * paquete usable aunque la tanda no termine.
 */
function writeSheet() {
  // **Y se suma a lo que ya hubiera**, porque un paquete se hace en varias
  // pasadas: los grupos van por `--only` y la numeración se continúa con
  // `--offset`, así que la hoja tiene que listar lo de antes y lo de ahora. Sin
  // esto, la última pasada borraba del índice las ochenta capturas anteriores
  // —seguían en disco, pero sin nada que dijera qué eran—.
  let before = [];
  try {
    const old = JSON.parse(readFileSync(join(outDir, 'manifest.json'), 'utf8'));
    if (Array.isArray(old.shots)) before = old.shots;
  } catch { /* la primera pasada no tiene manifiesto */ }
  const mine = new Set(shots.map((one) => one.id));
  const all = [...before.filter((one) => !mine.has(one.id)), ...shots];
  // **Y lo que hay en disco sin ficha, también se lista.** La primera tanda se
  // cayó antes de escribir manifiesto, así que treinta y siete PNG existían sin
  // que nada dijera qué eran: el nombre del fichero ya lo dice, y una ficha
  // pobre es mejor que una captura huérfana.
  const known = new Set(all.map((one) => one.id));
  for (const file of readdirSync(outDir).filter((f) => /^[0-9]{2,}-.*\.png$/.test(f))) {
    const id = file.replace(/\.png$/, '');
    if (known.has(id)) continue;
    all.push({ id, name: id.replace(/^[0-9]+-/, ''), note: id.replace(/^[0-9]+-/, '').replace(/-/g, ' ') });
  }
  all.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
  writeFileSync(
    join(outDir, 'manifest.json'),
    JSON.stringify({ width, height, scale, seed, year, shots: all }, null, 2) + NL,
    'utf8',
  );
  const cards = all.map((one) => [
    '  <figure>',
    `    <img src="${one.id}.png" alt="${one.note}" loading="lazy">`,
    `    <figcaption><b>${one.id}</b><br>${one.note}<br><small>${one.hora ?? ''} ${one.fecha ?? ''} &middot; ${one.pantalla ?? ''} ${one.clases ?? ''}</small></figcaption>`,
    '  </figure>',
  ].join(NL)).join(NL);
  writeFileSync(join(outDir, 'index.html'), [
    '<!doctype html>',
    '<meta charset="utf-8">',
    '<title>The Valley - paquete de prensa</title>',
    '<style>',
    '  body { margin: 0; padding: 24px; background: #1b1613; color: #EADBC2;',
    '         font: 14px/1.5 system-ui, sans-serif; }',
    '  h1 { font-weight: 500; letter-spacing: .04em; }',
    '  .grid { display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }',
    '  figure { margin: 0; }',
    '  img { width: 100%; display: block; background: #000; }',
    '  figcaption { padding-top: 8px; }',
    '  small { color: #A89478; }',
    '</style>',
    `<h1>The Valley &middot; ${all.length} capturas &middot; ${width}x${height} @${scale}x &middot; valle ${seed}</h1>`,
    '<div class="grid">',
    cards,
    '</div>',
  ].join(NL) + NL, 'utf8');
}

const want = (group) => only.length === 0 || only.includes(group);

// ---------------------------------------------------------------- el menú
if (want('menu')) {
  const tab = await open();
  await tab.locator('.title-scrim').waitFor({ timeout: 8000 }).catch(() => {});
  await tab.waitForTimeout(1800);
  await shot(tab, 'menu', 'El menú de inicio, como lo ve quien abre el juego');
  await tab.locator('.title-dev').click().catch(() => {});
  await tab.waitForTimeout(500);
  await shot(tab, 'menu-taller', 'El menú con el interruptor de taller abierto: el año');
  await tab.close();
}

// ------------------------------------------------- la entrada desde lo alto
if (want('entrada')) {
  const tab = await open();
  await found(tab, 600);
  await shot(tab, 'entrada-alto', 'U-11 · el vuelo de entrada, desde lo alto');
  await tab.waitForTimeout(1200);
  await shot(tab, 'entrada-bajando', 'U-11 · bajando al valle');
  await tab.waitForTimeout(2500);
  await shot(tab, 'entrada-posado', 'U-11 · la cámara ya posada');
  await tab.close();
}

// ------------------------------------------------------------------ el valle
if (want('valle')) {
  const tab = await open();
  await found(tab);
  await shot(tab, 'valle', 'El valle de tarde, con la interfaz entera');
  // La regleta de velocidad, desplegada y sin desplegar.
  await tab.locator('.valley-speed-badge').click().catch(() => {});
  await tab.waitForTimeout(600);
  await shot(tab, 'valle-regleta', 'La regleta de velocidad desplegada');
  await tab.locator('.valley-speed-badge').click().catch(() => {});
  await tab.waitForTimeout(400);
  // En pausa.
  await tab.locator('.valley-play-pause, .hud-speed-cluster button').first().click().catch(() => {});
  await tab.waitForTimeout(700);
  await shot(tab, 'valle-pausa', 'En pausa: el círculo cambia a ▶');
  await tab.locator('.valley-play-pause, .hud-speed-cluster button').first().click().catch(() => {});
  await tab.waitForTimeout(400);
  // El sonido apagado.
  await tab.locator('.valley-sound').click().catch(() => {});
  await tab.waitForTimeout(400);
  await shot(tab, 'valle-sin-sonido', 'El sonido apagado, con su aspa');
  await tab.locator('.valley-sound').click().catch(() => {});
  // La pantalla despejada.
  await tab.locator('.valley-bare').click().catch(() => {});
  await tab.waitForTimeout(900);
  await shot(tab, 'valle-despejado', 'La pantalla despejada: sólo el valle y dos botones');
  await tab.locator('.valley-bare').click().catch(() => {});
  await tab.waitForTimeout(700);
  // De cerca y girado, que es lo que el dedo hace.
  for (let n = 0; n < 6; n += 1) {
    await tab.mouse.move(width / 2, height * 0.4);
    await tab.mouse.wheel(0, -120);
    await tab.waitForTimeout(120);
  }
  await tab.waitForTimeout(900);
  await shot(tab, 'valle-cerca', 'De cerca, a rueda: la aldea a tamaño de cuerpo');
  await tab.close();
}

// ------------------------------------------------------- las horas del valle
if (want('horas')) {
  const tab = await open();
  await found(tab, 9000);
  await shot(tab, 'hora-tarde', 'La tarde');
  await tab.waitForTimeout(39000);
  await shot(tab, 'hora-anochecer', 'El anochecer');
  await tab.waitForTimeout(14000);
  await shot(tab, 'hora-noche', 'La noche cerrada, con las ventanas encendidas');
  await tab.waitForTimeout(30000);
  await shot(tab, 'hora-madrugada', 'La madrugada');
  await tab.close();
}

// --------------------------------------------------------------- la crónica
if (want('cronica')) {
  const tab = await open();
  await found(tab);
  await tab.locator('.ui-shell-nav button').nth(1).click().catch(() => {});
  await tab.waitForTimeout(1600);
  await shot(tab, 'cronica', 'La crónica, cubriendo la pantalla');
  await tab.locator('.chronicle-scrim').evaluate((el) => { el.scrollTop = 900; }).catch(() => {});
  await tab.waitForTimeout(700);
  await shot(tab, 'cronica-leyendo', 'La crónica, leída hacia abajo');
  await tab.close();
}

// ------------------------------------------------------------------ la gente
if (want('gente')) {
  const tab = await open();
  await found(tab);
  await tab.locator('.ui-shell-nav button').nth(2).click().catch(() => {});
  await tab.waitForTimeout(1600);
  await shot(tab, 'gente', 'La gente del valle, los nombrados');
  await tab.locator('.people-row, .person-row, .valley-person-row').first().click().catch(() => {});
  await tab.waitForTimeout(1400);
  await shot(tab, 'ficha-desde-lista', 'La ficha abierta desde la lista: con «back to the list»');
  await tab.locator('.valley-panel-follow button').first().click().catch(() => {});
  await tab.waitForTimeout(2600);
  await shot(tab, 'ficha-siguiendo', 'Siguiendo a alguien: la ficha baja y la cámara va detrás');
  await tab.locator('.person-action').nth(1).click().catch(() => {});
  await tab.waitForTimeout(1200);
  await shot(tab, 'ficha-vida', 'La vida de esa persona, desplegada');
  await tab.close();
}

// -------------------------------------------------------------------- el carro
if (want('carro')) {
  const tab = await open();
  await found(tab);
  await tab.locator('.valley-orders-now').click().catch(() => {});
  await tab.waitForTimeout(1400);
  await shot(tab, 'carro', 'El carro: lo que se le puede dar al valle y lo que cuesta');
  await tab.locator('.cart-row button').first().click().catch(() => {});
  await tab.waitForTimeout(1200);
  await shot(tab, 'carro-dado', 'Después de dar algo');
  await tab.close();
}

// ------------------------------------------------------------- la encrucijada
if (want('encrucijada')) {
  const tab = await open();
  await found(tab);
  await tab.locator('.valley-speed-badge').click().catch(() => {});
  await tab.waitForTimeout(400);
  await tab.getByRole('button', { name: '64×' }).click().catch(() => {});
  await tab.locator('.crossroad-options button').first().waitFor({ timeout: 120000 }).catch(() => {});
  await tab.waitForTimeout(900);
  await shot(tab, 'encrucijada', 'Una decisión, planteada');
  // Y aplazada: se desliza hacia abajo y el sello ocupa el ornamento.
  await tab.mouse.move(width / 2, height * 0.35);
  await tab.mouse.down();
  await tab.mouse.move(width / 2, height * 0.9, { steps: 12 });
  await tab.mouse.up();
  await tab.waitForTimeout(1200);
  await shot(tab, 'decision-aplazada', 'La decisión aplazada: el sello de lacre en la bandeja');
  await tab.close();
}

// ---------------------------------------------------------------- el asedio
//
// **Y alejando la vista**, que es la lección de la primera tanda: con el
// encuadre de serie la cámara enmarca la aldea y la partida llega **por el
// camino, fuera de cuadro** — tres capturas del asalto enseñaban un pueblo en
// paz. Cuatro muescas de rueda meten el camino y el portón en el plano.
//
// Y el asalto **pide `raid` además de `assault`**: `main.ts` sólo lee la
// segunda dentro de la primera, así que `&assault=1` a secas no plantaba nada.
if (want('asedio')) {
  for (const [name, query, note] of [
    ['visperas', `?debug=1&live=1&seed=${seed}&year=${year}&season=summer&braced=2&means=bows,arms`,
      'La víspera: la guarnición sube a la muralla y no hay nadie en el camino'],
    ['saqueo', `?debug=1&live=1&seed=${seed}&year=${year}&season=summer&raid=12`,
      'El saqueo: la partida del valle vecino, sin defensa dada'],
    ['defensa', `?debug=1&live=1&seed=${seed}&year=${year}&season=summer&raid=12&means=bows,arms`,
      'El saqueo con arcos dados: la muralla contesta'],
    ['asalto', `?debug=1&live=1&seed=${seed}&year=${year}&season=summer&raid=24&assault=1&means=bows,arms`,
      'El asalto: veinticuatro hombres a por el portón'],
  ]) {
    const tab = await open(query);
    await tab.waitForFunction(() => (window.__valleyLife?.()?.people.length ?? 0) > 0, { timeout: 30000 }).catch(() => {});
    await tab.waitForTimeout(3000);
    await wide(tab, 4);
    await shot(tab, name, `${note} · al llegar`);
    await tab.waitForTimeout(9000);
    await shot(tab, `${name}-b`, `${note} · nueve segundos después`);
    await tab.waitForTimeout(9000);
    await shot(tab, `${name}-c`, `${note} · dieciocho segundos después`);
    await tab.close();
  }
}

// ------------------------------------------------ los estados del valle
//
// Los que `main.ts` sabe abrir por la ruta de depuración y que de otro modo no
// se pueden fotografiar: una tormenta sale en el 4 % de las jornadas y la nieve
// en el 3,5 %, una decisión sin contestar no existe en un valle jugado con la
// política prudente, y las cuatro lápidas piden cuatro maneras de morir.
if (want('estados')) {
  for (const [name, query, note, wideNotches] of [
    ['tormenta', `?debug=1&live=1&seed=${seed}&year=${year}&season=summer&weather=storm`,
      'La tormenta: el cielo de plomo y los rayos (§10.7)', 3],
    ['nieve', `?debug=1&live=1&seed=${seed}&year=${year}&season=winter&weather=snow`,
      'La nieve en el valle', 3],
    ['lluvia', `?debug=1&live=1&seed=${seed}&year=${year}&season=autumn&weather=wet`,
      'El valle mojado de otoño', 3],
    ['hambre', `?debug=1&live=1&seed=${seed}&year=${year}&season=winter&hunger=1`,
      'El granero a cero: el hambre', 0],
    ['oferta', `?debug=1&live=1&seed=${seed}&year=${year}&season=summer&offer=1`,
      'Alguien espera respuesta en el camino: los dos toques de la oferta', 0],
    ['sello', `?debug=1&live=1&seed=${seed}&year=${year}&season=summer&crossroad=1`,
      'Una decisión sin contestar: el sello de lacre en la bandeja', 0],
    ['corona-lista', `?debug=1&live=1&seed=${seed}&year=${year}&season=summer&crown=ready`,
      'La corona, cuando el valle ya puede coronar a alguien', 0],
    ['corona-puesta', `?debug=1&live=1&seed=${seed}&year=${year}&season=summer&crown=smith`,
      'Con un herrero coronado: la sala y el estilo del valle', 2],
  ]) {
    const tab = await open(query);
    await tab.waitForFunction(() => (window.__valleyLife?.()?.people.length ?? 0) > 0, { timeout: 30000 }).catch(() => {});
    await tab.waitForTimeout(8000);
    if (wideNotches > 0) await wide(tab, wideNotches);
    await shot(tab, name, note);
    await tab.close();
  }
  // El sello, además, abierto: el documento sellado al final de la crónica.
  const tab = await open(`?debug=1&live=1&seed=${seed}&year=${year}&season=summer&crossroad=1`);
  await tab.waitForFunction(() => (window.__valleyLife?.()?.people.length ?? 0) > 0, { timeout: 30000 }).catch(() => {});
  await tab.waitForTimeout(7000);
  await tab.locator('.ui-shell-nav button').nth(1).click().catch(() => {});
  await tab.waitForTimeout(1600);
  await shot(tab, 'sello-cronica', 'El documento sellado, al final de la crónica');
  await tab.close();
}

// ------------------------------------------------------- las cuatro lápidas
if (want('lapidas')) {
  for (const [cause, note] of [
    ['stormed', 'El valle tomado'],
    ['extinction', 'El valle vacío: no queda nadie'],
    ['abandoned', 'El valle abandonado'],
    ['dispersed', 'El valle disperso'],
  ]) {
    const tab = await open(`?debug=1&live=1&seed=${seed}&year=${year}&season=summer&ended=${cause}`);
    await tab.waitForTimeout(3000);
    await shot(tab, `lapida-${cause}`, `${note}: la lápida y su inscripción`);
    await tab.waitForTimeout(3200);
    await shot(tab, `lapida-${cause}-cuentas`, `${note}: la hoja de cuentas`);
    await tab.close();
  }
}

// ------------------------------------------------------------------- el final
if (want('final')) {
  for (const cause of ['stormed', 'extinction']) {
    const tab = await open();
    await found(tab);
    await tab.evaluate((c) => window.__valleyEnd?.(c), cause).catch(() => {});
    await tab.waitForTimeout(1200);
    await shot(tab, `final-${cause}-lapida`, `El final (${cause}): la lápida grabándose`);
    await tab.waitForTimeout(3200);
    await shot(tab, `final-${cause}-cuentas`, `El final (${cause}): la hoja de cuentas`);
    await tab.locator('.epitaph-scrim, .epitaph-sheet').evaluate((el) => { el.scrollTop = 800; }).catch(() => {});
    await tab.waitForTimeout(700);
    await shot(tab, `final-${cause}-cuentas-abajo`, `El final (${cause}): el resto de las cuentas`);
    await tab.close();
  }
}

// =========================================================================
// El metraje del tráiler: el valle solo, sin interfaz.
// =========================================================================

// ----------------------------------------------- el valle que se hace aldea
// El guion pide «un valle vacío al amanecer», «llegan los dos fundadores», «se
// levanta la primera casa» y «la aldea creciendo durante varias estaciones»:
// eso es **el mismo valle a nueve edades**, y sale del campo de año del menú,
// que juega la trayectoria de verdad con la política de referencia.
if (want('crecimiento')) {
  for (const edad of [1, 2, 4, 8, 14, 22, 32, 44, 60]) {
    const tab = await open();
    await found(tab, 9000, edad);
    await dismiss(tab);
    await atHour(tab, '09');
    await bare(tab);
    await shot(tab, `crece-ano-${String(edad).padStart(2, '0')}`,
      `El valle en el año ${edad}, sin interfaz`);
    await tab.close();
  }
}

// ------------------------------------------------------------ las estaciones
// «Varias estaciones» en el mismo pueblo y a la misma edad: lo que cambia es el
// color del valle y lo que la gente está haciendo, no el tamaño de la aldea.
if (want('estaciones')) {
  for (const season of ['spring', 'summer', 'autumn', 'winter']) {
    const tab = await open(`?debug=1&live=1&seed=${seed}&year=30&season=${season}`);
    await tab.waitForFunction(() => (window.__valleyLife?.()?.people.length ?? 0) > 0, { timeout: 30000 }).catch(() => {});
    await tab.waitForTimeout(8000);
    await dismiss(tab);
    await atHour(tab, '10');
    await bare(tab);
    await shot(tab, `estacion-${season}`, `El valle en ${season}, año 30, sin interfaz`);
    await tab.close();
  }
}

// --------------------------------------------------------- escenas pequeñas
// «Vemos escenas pequeñas: trabajar, pescar, reunirse, casarse, enterrar a
// alguien.» Los doce sucesos de R-1 son exactamente eso, y la ruta de
// depuración los planta en la semana que se abre (`&happening=`), que es la
// única forma de fotografiarlos: sueltos salen en el 4 % de las jornadas.
if (want('escenas')) {
  for (const [id, note] of [
    ['wedding', 'Una boda en la plaza'],
    ['harvest_feast', 'La fiesta de la cosecha'],
    ['good_catch', 'Una buena pesca en el río'],
    ['quarrel_in_the_square', 'Una riña en la plaza'],
    ['stranger_passes', 'Un forastero de paso'],
    ['pedlar', 'El buhonero'],
    ['child_lost', 'Un niño perdido, y el valle buscándolo'],
    ['wolves_at_the_coop', 'Lobos en el corral'],
    ['river_flood', 'La riada'],
    ['lightning_fire', 'El rayo y lo que arde'],
  ]) {
    const tab = await open(`?debug=1&live=1&seed=${seed}&year=30&season=summer&happening=${id}`);
    await tab.waitForFunction(() => (window.__valleyLife?.()?.people.length ?? 0) > 0, { timeout: 30000 }).catch(() => {});
    await tab.waitForTimeout(9000);
    await dismiss(tab);
    await bare(tab);
    await shot(tab, `escena-${id}`, note);
    await tab.waitForTimeout(6000);
    await shot(tab, `escena-${id}-b`, `${note} (seis segundos después)`);
    await tab.close();
  }
}

// ------------------------------------------------- el cerco y lo que asoma
// «La muralla se cierra alrededor de la villa» y «al fondo, una amenaza apenas
// visible»: el cerco se cierra hacia el año 38 en este valle, así que van tres
// edades y un plano ancho del valle entero, que es el final del guion.
if (want('cerco')) {
  for (const [edad, note] of [
    [34, 'La muralla a medias'],
    [40, 'El cerco cerrado, con su portón'],
    [55, 'La villa hecha, de piedra'],
  ]) {
    const tab = await open();
    await found(tab, 9000, edad);
    await dismiss(tab);
    await atHour(tab, '09');
    await bare(tab);
    await shot(tab, `cerco-ano-${edad}`, `${note}, sin interfaz`);
    // Y el plano ancho: la rueda hacia atrás enseña el valle con su sierra.
    for (let n = 0; n < 8; n += 1) {
      await tab.mouse.move(width / 2, height * 0.45);
      await tab.mouse.wheel(0, 120);
      await tab.waitForTimeout(120);
    }
    await tab.waitForTimeout(1200);
    await shot(tab, `cerco-ano-${edad}-ancho`, `${note}, plano ancho del valle entero`);
    await tab.close();
  }
}

await browser.close();
writeSheet();
console.log(NL + shots.length + ' capturas en ' + outDir);
