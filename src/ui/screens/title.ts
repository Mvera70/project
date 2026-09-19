// U-10 · El menú de inicio. design.md §11.10, v3.70.
//
// Lo pidió el dueño del diseño el 15 sep 2026, con la premisa del juego: un
// idle bonito de mirar cuya esencia es que cada valle salga distinto, y que la
// gente pueda **comparar** valles. De ahí lo único que se configura: el número
// del valle. Dos personas con el mismo número fundan el mismo valle —misma
// pareja, mismo río, mismo bosque— y a partir de ahí cada una lo lleva a su
// manera. Todo lo demás (sonido) es una preferencia, no una opción de partida.
//
// **U-10b, 16 sep 2026: y un año, detrás de un interruptor de taller.** Lo
// pidió el dueño del diseño para poder probar («tardo mucho en poder ver las
// demos y avanzar muchos años porque no tengo manera de elegir el año o
// solamente la semilla»). Va detrás de «Dev» y no a la vista porque lo único
// que este menú configura para quien juega sigue siendo el número del valle
// (§11.10): el año no es una opción de partida, es una herramienta. El
// interruptor se recuerda, como el sonido, así que se toca una vez y se queda.
//
// Es una pantalla antes de `boot`, no dentro: el juego no existe todavía y no
// hay estado que pintar. Por eso va sobre la noche (`--night`) y no sobre el
// valle; lo que viene después, el inicio guiado (U-11), es quien baja al valle.

import { renderUiText } from '@engine/chronicle/render';
import { population } from '@engine/people/demography';
import type { SaveFile } from '@engine/state';
import { yearOf } from '@engine/time';
import { nextUnusedSeed } from '../app';
import { ORNAMENT_VIEWBOX, YEAR_FLOURISH } from '../redesign/chronicle-ornaments';
import { setSoundPreference, soundPreference } from '../sound';
import { currentLocale, loadLocale, setSavedLocale } from '../locale';
import { openAnnals } from './annals';
import type { Locale } from '@engine/chronicle/render';

const STYLE_ID = 'valley-title-style';
const SVG_NS = 'http://www.w3.org/2000/svg';
const STYLE = `
/* UI-V5 · **La cubierta de la crónica.**
   \`docs/ui-redesign/piel/plan-piel.md\` no tiene sección para esta pantalla y
   los tres prototipos tampoco la dibujan: el menú de inicio quedó fuera de la
   tanda de piel porque no hay nada que copiar. El dueño del diseño lo pidió
   igualmente («aunque no tenemos diseño, pero habrá que hacerlo»), así que esto
   **no se calca: se diseña**, y lo único que no es mío es el vocabulario, que
   sale entero del kit de UI-V0 y de los tres prototipos.

   **La idea, y por qué ésta.** Este juego es la crónica de un valle —la pantalla
   que más peso tiene es una página de pergamino con su capitular— y esta
   pantalla viene *antes* de que el valle exista. Así que es lo que hay antes de
   la primera página: **la cubierta cerrada, sobre la mesa**. De ahí las tres
   decisiones:

   1. El fondo es la **madera** de la barra de navegación (\`--skin-wood\`), no la
      noche de U-01. La madera ya significa «el mueble donde esto vive» en los
      prototipos 02 y 03; la noche no significaba nada.
   2. Encima, **una hoja de pergamino con su canto deshilachado**
      (\`--skin-deckle-sheet\`), la misma textura que la página de la crónica y
      la misma inclinación mínima que las tarjetas. Una hoja, no un cuadro de
      diálogo.
   3. En el centro, **el sello de lacre con el roble** (\`.skin-seal\`, del kit).
      Es la primitiva que el plan reservó para «documento por abrir» y aquí es
      literal: lo que se abre es la crónica. Es el único adorno, y hace de ancla
      del hueco que esta pantalla tiene en medio.

   Lo que **no** cambia: ni un texto, ni el orden de los controles, ni qué
   configura esta pantalla (el número del valle, §11.10). Sólo la piel. */
.title-scrim { position: fixed; inset: 0; z-index: 13; box-sizing: border-box;
  display: flex; padding: 14px;
  background-color: var(--skin-wood); color: var(--skin-ink);
  font-family: var(--skin-font-read); font-size: 15px; line-height: 1.45; }

/* La hoja. Lleva el desplazamiento por dentro: en una pantalla corta con el
   interruptor de taller abierto hay más de 844 px de controles, y una cubierta
   que recorta el botón de empezar no es una cubierta. */
.title-sheet { flex: 1 1 auto; box-sizing: border-box; overflow: auto;
  display: flex; flex-direction: column; gap: 18px;
  padding: max(26px, env(safe-area-inset-top)) 22px max(22px, env(safe-area-inset-bottom));
  background-color: var(--skin-page);
  background-image: var(--skin-parchment-texture);
  background-repeat: repeat; background-size: 256px 256px;
  background-blend-mode: multiply;
  clip-path: var(--skin-deckle-sheet);
  transform: rotate(var(--skin-tilt-c)); }

/* -------------------------------------------------------------- la portada */
.title-head { display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding-top: 6px; text-align: center; }
.title-head h1 { margin: 0; color: var(--skin-ink);
  font: 600 31px/1.1 var(--skin-font-voice);
  letter-spacing: .14em; text-transform: uppercase; text-wrap: balance; }
/* El filete y la palmeta con la que muere, los mismos que cierran la cabecera
   de un año en la crónica: es el remate de la casa, no uno nuevo. */
.title-flourish { display: flex; align-items: center; gap: 6px; width: 100%; max-width: 280px; }
.title-flourish hr { flex: 1 1 auto; margin: 0; height: 1px; border: 0;
  background: var(--skin-rule-gold); }
.title-flourish svg { flex: 0 0 auto; display: block; height: 14px; width: auto;
  color: var(--skin-gold); }
.title-flourish svg:first-child { transform: scaleX(-1); }
.title-head p { margin: 0; max-width: 30ch; color: var(--skin-ink-soft);
  font: italic 16px/1.45 var(--skin-font-read); text-wrap: pretty; }

/* El sello, en el hueco del medio. \`margin: auto\` es lo que hace que la
   portada quede arriba, los controles abajo y el sello centrado en lo que
   sobre, sin números fijos que se rompan en una pantalla más corta. */
/* 88 y no los 48 del kit: aquí el sello no acompaña a un título, **es** el
   centro de la portada, y en el hueco que esta pantalla tiene en medio uno de
   48 se leía como una mancha. */
.title-seal { width: 88px; height: 88px; flex: 0 0 88px; margin: auto; }
.title-seal .skin-icon { width: 46px; height: 46px; }

/* ------------------------------------------------------------ los controles */
.title-actions { display: flex; flex-direction: column; gap: 12px; }
.title-seed-row { display: flex; align-items: flex-end; gap: 10px; }
.title-seed-field { flex: 1 1 auto; display: flex; flex-direction: column; gap: 5px; }
.title-seed-row label, .title-dev-row label { color: var(--skin-ink-faded);
  font: 400 11px/1.1 var(--skin-font-voice); letter-spacing: var(--skin-track-label);
  text-transform: uppercase; }
/* El campo: papel con un filete de tinta debajo, no una caja de sistema. Un
   número escrito a mano en un registro. */
.title-seed, .title-year { box-sizing: border-box; width: 100%; min-height: 46px;
  padding: 0 12px; border: 0; border-bottom: 2px solid var(--skin-ink-soft);
  border-radius: 0; background: rgba(255, 253, 245, .38); color: var(--skin-ink);
  font: 600 20px/1 var(--skin-font-voice); font-variant-numeric: tabular-nums;
  letter-spacing: .04em; }
.title-seed:focus-visible, .title-year:focus-visible {
  outline: 2px solid var(--skin-gold); outline-offset: 2px; }
.title-hint { margin: 0; color: var(--skin-ink-faded);
  font: italic 13px/1.4 var(--skin-font-read); }
.title-dev-row { display: flex; flex-direction: column; gap: 8px; }
.title-dev-row[hidden] { display: none; }
.title-dev-field { flex: 1 1 auto; display: flex; flex-direction: column; gap: 5px; }

/* Los botones son los dos del prototipo 03, y el reparto dice cuál manda:
   **madera el de fundar**, que es lo que esta pantalla existe para hacer, y
   pergamino el de continuar y el de otro número. */
.title-new, .title-continue { width: 100%; }
.title-reroll { flex: 0 0 auto; min-height: 46px; padding: 0 14px; font-size: 12px; }
.title-continue-row { display: flex; flex-direction: column; gap: 4px; }
.title-continue-row small { color: var(--skin-ink-faded);
  font: italic 12.5px/1.35 var(--skin-font-read); }
.title-new[disabled] { opacity: .65; cursor: default; }
/* F3d · **el cronicón no es un tercer botón de partida**, así que no lleva
   papel ni madera: es un enlace en tinta, como el que se pone al pie de una
   página. Fundar manda en esta pantalla y esto no puede competir con ello. */
.title-annals { min-height: var(--ui-tap-min); padding: 0; border: 0;
  background: transparent; color: var(--skin-ink-faded); cursor: pointer;
  font: 400 12px/1 var(--skin-font-voice); letter-spacing: var(--skin-track-label);
  text-transform: uppercase; text-decoration: underline;
  text-underline-offset: 4px; text-decoration-thickness: 1px;
  -webkit-tap-highlight-color: transparent; }
.title-annals:active { color: var(--skin-ink); }
.title-annals:focus-visible { outline: 2px solid var(--skin-gold); outline-offset: 2px; }

/* El pie: dos interruptores pequeños, y el de taller a la derecha porque no es
   para quien juega. */
.title-bottom { display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin-top: 4px; }
.title-sound, .title-dev { min-height: 38px; padding: 0 10px; border: 0;
  background: transparent; color: var(--skin-ink-faded); cursor: pointer;
  font: 400 11px/1 var(--skin-font-voice); letter-spacing: var(--skin-track-label);
  text-transform: uppercase; -webkit-tap-highlight-color: transparent; }
.title-sound[aria-pressed="true"], .title-dev[aria-pressed="true"] { color: var(--skin-ochre); }
.title-sound:focus-visible, .title-dev:focus-visible {
  outline: 2px solid var(--skin-gold); outline-offset: 2px; }

@media (prefers-reduced-motion: no-preference) {
  .title-scrim { animation: title-in .6s ease-out both; }
  @keyframes title-in { from { opacity: 0; } to { opacity: 1; } }
}
.title-language { min-height: 38px; padding: 0 7px; border: 1px solid var(--skin-rule);
  background: transparent; color: var(--skin-ink-faded); cursor: pointer;
  font: 400 11px/1 var(--skin-font-voice); letter-spacing: var(--skin-track-label);
  text-transform: uppercase; }
.title-language:focus-visible { outline: 2px solid var(--skin-gold); outline-offset: 2px; }
`;

/** Lo que el jugador eligió en el menú. */
export type TitleChoice =
  | { readonly kind: 'continue' }
  /**
   * Un valle nuevo, y **en qué año se abre**, contado como lo lee la cabecera:
   * el año 1 es fundarlo y verlo nacer, que es lo que hace el juego siempre, y
   * más es jugarlo hacia delante antes de mirarlo (U-10b, el interruptor de
   * taller). No es una opción de partida —quien juega no la ve— y por eso vive
   * aquí y no en el estado.
   */
  | { readonly kind: 'new'; readonly seed: number; readonly year: number };

/** La semilla es un entero de 32 bits sin signo, que es lo que `makeBundle` toma. */
const SEED_MAX = 0xffffffff;

/**
 * El número del valle que el jugador escribió, o `fallback` si no es un
 * número que valga. Puro, para que se pueda probar sin pantalla: acepta sólo
 * dígitos, sin signo ni espacios en medio, y dentro de los 32 bits.
 */
export function parseSeed(text: string, fallback: number): number {
  const trimmed = text.trim();
  if (!/^\d{1,10}$/u.test(trimmed)) return fallback;
  const value = Number(trimmed);
  return value <= SEED_MAX ? value : fallback;
}

/**
 * Hasta qué año se puede pedir abrir. Sesenta es la partida entera de §9.5 y
 * ciento veinte, dos; más allá no queda nada que mirar que no se vea a los
 * sesenta, y cada año cuesta unos 22 ms.
 */
const YEAR_MAX = 120;

/**
 * El año que se escribió en el campo de taller, o `fallback` si no vale.
 *
 * Mismas reglas que `parseSeed` —sólo dígitos, sin signo— y además un techo:
 * pedir mil años sería un minuto de espera con la pantalla congelada, y eso se
 * lee como un juego roto y no como una herramienta. El año va como lo lee la
 * cabecera: 1 es el valle recién fundado, y por eso el vacío vale 1.
 *
 * **Y un número por encima del techo se recorta al techo, no se ignora.** La
 * primera versión se caía al año 1 en silencio, y eso fue exactamente el fallo
 * que el dueño encontró a los diez minutos: el campo venía con un «1» puesto,
 * escribió 50 detrás, quedó «150», pasó el techo y se abrió el año 1 con la
 * pareja fundadora. Una herramienta que hace lo contrario de lo que le pides
 * sin decir nada es peor que no tenerla. Basura sí vuelve al año 1: de «siete»
 * no se puede adivinar un año.
 */
export function parseYear(text: string, fallback = 1): number {
  const trimmed = text.trim();
  if (trimmed === '') return fallback;
  // Hasta diez dígitos y luego se recorta, en vez de tres y descartar: «9999»
  // es un número, no basura, y quien lo escribe está pidiendo «lo más lejos
  // que se pueda». Lo que vuelve al año 1 es lo que no es un número.
  if (!/^\d{1,10}$/u.test(trimmed)) return fallback;
  const value = Number(trimmed);
  if (value < 1) return fallback;
  return Math.min(value, YEAR_MAX);
}

/** Si el interruptor de taller está puesto. Se recuerda, como el sonido. */
function devPreference(): boolean {
  try { return localStorage.getItem(DEV_KEY) === 'on'; } catch { return false; }
}

function setDevPreference(on: boolean): void {
  try { localStorage.setItem(DEV_KEY, on ? 'on' : 'off'); } catch { /* modo privado: nada que hacer */ }
}

const DEV_KEY = 'valley.dev';

/** Un número de valle al azar que no repita ninguno de los ya jugados. */
function rollSeed(excluded: ReadonlySet<number>): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return nextUnusedSeed(value[0] as number, excluded);
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID) !== null) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.append(style);
}

/**
 * Abre el menú sobre la página y llama a `choose` una sola vez, con lo que el
 * jugador decidió. `save` es la partida guardada, si la hay: con ella se
 * ofrece continuar —salvo que ya haya terminado, que entonces lo que toca es
 * fundar de nuevo sobre sus ruinas (§13.3)— y se excluyen sus semillas al
 * echar un número nuevo.
 */
export function openTitle(save: SaveFile | null, choose: (choice: TitleChoice) => void): void {
  loadLocale();
  ensureStyle();
  document.documentElement.classList.add('title-open');

  const played = new Set<number>((save?.archive ?? []).map((game) => game.seed));
  if (save !== null) played.add(save.state.seed);

  const scrim = document.createElement('div');
  scrim.className = 'title-scrim';

  const head = document.createElement('header');
  head.className = 'title-head';
  const name = document.createElement('h1');
  name.textContent = renderUiText('title.name');
  const tagline = document.createElement('p');
  tagline.textContent = renderUiText('title.tagline');
  // UI-V5 · el filete con su palmeta, el mismo que remata la cabecera de un
  // año en la crónica (`chronicle-ornaments.ts`, calcada del prototipo 02).
  // Uno de la casa y no uno nuevo: esta pantalla no tiene prototipo, así que
  // todo lo que se dibuja en ella sale de lo que las otras ya dibujan.
  const flourish = document.createElement('div');
  flourish.className = 'title-flourish';
  flourish.setAttribute('aria-hidden', 'true');
  for (let side = 0; side < 2; side += 1) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', ORNAMENT_VIEWBOX.YEAR_FLOURISH);
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = YEAR_FLOURISH;
    flourish.append(svg);
    if (side === 0) {
      const rule = document.createElement('hr');
      flourish.append(rule);
    }
  }
  head.append(name, flourish, tagline);

  // El sello de lacre con el roble, del kit. `.skin-seal` es la primitiva que
  // el plan reservó para «documento por abrir» (§3.2) y aquí es literal: lo
  // que se abre es la crónica de un valle que todavía no existe. Va en el
  // hueco del medio, que esta pantalla tiene de sobra.
  const seal = document.createElement('div');
  seal.className = 'skin-seal title-seal';
  seal.setAttribute('aria-hidden', 'true');
  seal.innerHTML = '<svg class="skin-icon" aria-hidden="true" focusable="false"><use href="#seal-tree"/></svg>';

  const actions = document.createElement('div');
  actions.className = 'title-actions';

  let done = false;
  const finish = (choice: TitleChoice): void => {
    if (done) return;
    done = true;
    scrim.remove();
    document.documentElement.classList.remove('title-open');
    choose(choice);
  };

  if (save !== null && save.state.ended === null) {
    const cont = document.createElement('button');
    cont.type = 'button';
    cont.className = 'title-continue skin-button--parchment';
    cont.textContent = renderUiText('title.continue');
    const detail = document.createElement('small');
    detail.textContent = renderUiText('title.continue.detail', {
      year: yearOf(save.state.tick) + 1,
      count: population(save.state),
    });
    cont.addEventListener('click', () => finish({ kind: 'continue' }));
    // El detalle sale del botón y va debajo: dentro heredaba las versalitas y
    // el oro del botón de madera y se leía como parte de la etiqueta.
    const contRow = document.createElement('div');
    contRow.className = 'title-continue-row';
    contRow.append(cont, detail);
    actions.append(contRow);
  }

  const seedRow = document.createElement('div');
  seedRow.className = 'title-seed-row';
  const seedLabel = document.createElement('label');
  seedLabel.textContent = renderUiText('title.seed');
  seedLabel.htmlFor = 'valley-seed';
  const seed = document.createElement('input');
  seed.id = 'valley-seed';
  seed.className = 'title-seed';
  seed.inputMode = 'numeric';
  seed.autocomplete = 'off';
  seed.spellcheck = false;
  seed.value = String(rollSeed(played));
  const reroll = document.createElement('button');
  reroll.type = 'button';
  reroll.className = 'title-reroll skin-button--parchment';
  reroll.textContent = renderUiText('title.reroll');
  reroll.addEventListener('click', () => { seed.value = String(rollSeed(played)); });
  const hint = document.createElement('p');
  hint.className = 'title-hint';
  hint.textContent = renderUiText('title.seed.hint');
  const seedField = document.createElement('div');
  seedField.className = 'title-seed-field';
  seedField.append(seedLabel, seed);
  seedRow.append(seedField, reroll);

  // U-10b · la fila de taller: en qué año se abre el valle. Oculta salvo que
  // el interruptor de abajo esté puesto.
  const devRow = document.createElement('div');
  devRow.className = 'title-dev-row';
  const yearLabel = document.createElement('label');
  yearLabel.textContent = renderUiText('title.dev.year');
  yearLabel.htmlFor = 'valley-year';
  const year = document.createElement('input');
  year.id = 'valley-year';
  // Clase propia y no `title-seed`, a propósito: `tools/shots/valley.shots.ts` localiza
  // el número del valle por esa clase exacta —`page.locator('.title-seed')
  // .fill(...)`— y con dos campos compartiéndola, ese localizador dejó de
  // ser único ("strict mode violation") el mismo día que se escribió U-10b.
  // La piel se comparte por selector CSS; el nombre de clase, no.
  year.className = 'title-year';
  year.inputMode = 'numeric';
  year.autocomplete = 'off';
  year.spellcheck = false;
  // **Vacío, con el año 1 como pista, y se selecciona al tocarlo.** Las dos
  // cosas son el arreglo del mismo fallo: con un «1» dentro, un dedo escribe
  // detrás y no encima. Con el campo vacío no hay nada a lo que pegarse, y si
  // uno vuelve a tocarlo para cambiar 50 por 40, la selección hace que el
  // primer dígito reemplace en vez de sumar.
  year.value = '';
  year.placeholder = '1';
  year.maxLength = 3;
  year.addEventListener('focus', () => { year.select(); });
  const devHint = document.createElement('p');
  devHint.className = 'title-hint';
  devHint.textContent = renderUiText('title.dev.hint');
  const yearField = document.createElement('div');
  yearField.className = 'title-dev-field';
  yearField.append(yearLabel, year);
  // **La pista va dentro de la fila, no al lado.** Colgada de `actions` se
  // quedaba visible con la fila de taller oculta: la primera captura salía
  // explicando el interruptor de taller a quien no lo ha abierto.
  devRow.append(yearField, devHint);
  devRow.hidden = !devPreference();

  const begin = document.createElement('button');
  begin.type = 'button';
  begin.className = 'title-new skin-button--wood';
  begin.textContent = renderUiText('title.new');
  begin.addEventListener('click', () => {
    const choice: TitleChoice = {
      kind: 'new',
      seed: parseSeed(seed.value, rollSeed(played)),
      year: devRow.hidden ? 1 : parseYear(year.value),
    };
    // **Un fotograma de aviso antes de congelarse.** Jugar sesenta años es más
    // de un segundo de reloj de verdad, y quien lo pide en el menú se queda
    // mirando un botón que no responde: eso se lee como un juego roto. Con el
    // texto puesto y un `requestAnimationFrame` de por medio, el aviso se
    // pinta **antes** de que empiece la cuenta, porque el cuadro siguiente es
    // justo después del pintado.
    if (choice.year > 1) {
      begin.textContent = renderUiText('title.new.working');
      begin.disabled = true;
      requestAnimationFrame(() => { finish(choice); });
      return;
    }
    finish(choice);
  });

  const sound = document.createElement('button');
  sound.type = 'button';
  sound.className = 'title-sound';
  const paintSound = (): void => {
    const on = soundPreference();
    sound.setAttribute('aria-pressed', String(on));
    sound.textContent = renderUiText(on ? 'app.sound.on' : 'app.sound.off');
  };
  sound.addEventListener('click', () => { setSoundPreference(!soundPreference()); paintSound(); });
  paintSound();

  const dev = document.createElement('button');
  dev.type = 'button';
  dev.className = 'title-dev';
  dev.textContent = renderUiText('title.dev');
  const paintDev = (): void => {
    dev.setAttribute('aria-pressed', String(!devRow.hidden));
  };
  dev.addEventListener('click', () => {
    devRow.hidden = !devRow.hidden;
    setDevPreference(!devRow.hidden);
    paintDev();
  });
  paintDev();

  const language = document.createElement('select');
  language.className = 'title-language';
  language.setAttribute('aria-label', renderUiText('language.label'));
  for (const option of [
    ['en', renderUiText('language.english')],
    ['es', renderUiText('language.spanish')],
  ] as const) {
    const item = document.createElement('option');
    item.value = option[0];
    item.textContent = option[1];
    language.append(item);
  }
  language.value = currentLocale();
  language.addEventListener('change', () => {
    setSavedLocale(language.value as Locale);
    scrim.remove();
    document.documentElement.classList.remove('title-open');
    openTitle(save, choose);
  });

  // F3d · **el cronicón**, desde aquí y no desde el juego: éste es el momento
  // en que se comparan valles —uno acaba de cerrarse y otro va a empezar— y es
  // además la única pantalla que existe antes de que haya partida. Se enseña
  // siempre, también con el archivo vacío: el dueño del diseño eligió que
  // empezara vacío y se llenara, así que esa página es una pantalla del juego.
  //
  // **No cierra el menú.** El cronicón se abre encima y al cerrarse devuelve el
  // foco a lo que había, que es lo que hace de él un índice y no una ruta: no
  // hay nada que elegir ahí dentro.
  const annals = document.createElement('button');
  annals.type = 'button';
  annals.className = 'title-annals';
  annals.textContent = renderUiText('title.annals');
  annals.addEventListener('click', () => {
    openAnnals(save, () => { annals.focus(); });
  });

  const bottom = document.createElement('div');
  bottom.className = 'title-bottom';
  bottom.append(language, sound, dev);

  actions.append(seedRow, hint, devRow, begin, annals, bottom);
  const sheet = document.createElement('div');
  sheet.className = 'title-sheet';
  sheet.append(head, seal, actions);
  scrim.append(sheet);
  document.body.append(scrim);
}
