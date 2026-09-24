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
import { retireOverlay } from '../motion';
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

   **La idea, y por qué ésta.** Este juego es la crónica de un valle. Antes de
   la primera página se ve la cubierta cerrada, sobre la mesa:

   1. El fondo es la **madera** de la barra de navegación (\`--skin-wood\`), no la
      noche de U-01. La madera ya significa «el mueble donde esto vive» en los
      prototipos 02 y 03; la noche no significaba nada.
   2. Cuero, lomo y canto de hojas rodean la página de pergamino; el contenido
      se desplaza dentro de esa página para no recortar controles en móvil.
   3. La viñeta central de la portada aprobada muestra el valle sin introducir
      texto ni botones impresos que dupliquen los controles localizables.

   Lo que **no** cambia: ni un texto, ni el orden de los controles, ni qué
   configura esta pantalla (el número del valle, §11.10). Sólo la piel. */
.title-scrim { position: fixed; inset: 0; z-index: 13; box-sizing: border-box;
  display: flex; justify-content: center; padding: clamp(8px, 2.5vw, 28px);
  background: radial-gradient(ellipse at 50% 35%, #345044, #142822 78%);
  color: var(--skin-ink);
  font-family: var(--skin-font-voice); font-size: 15px; line-height: 1.45;
  animation: title-arrive 220ms ease-out both; }

/* Cubierta plana, con lomo a la izquierda y canto de páginas a la derecha.
   Todo es CSS: el texto de la portada sigue siendo localizable y pulsable. */
.title-book { position: relative; display: flex; box-sizing: border-box;
  width: min(100%, 560px); min-height: 0; padding: 7px 14px 12px 18px;
  border: 1px solid #63806c; border-radius: 22px;
  background: linear-gradient(125deg, #264b3d, #18372f);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .18),
    0 18px 42px rgba(7, 19, 15, .4);
  animation: title-book-arrive 320ms cubic-bezier(.2, .75, .25, 1) both; }
.title-scrim[hidden] { display: none; }
@keyframes title-arrive {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes title-book-arrive {
  from { opacity: 0; transform: translateY(18px) scale(.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .title-scrim, .title-book { animation-duration: .001ms !important; }
}
.title-book::before { content: ''; position: absolute; pointer-events: none;
  left: 7px; top: 12px; bottom: 15px; width: 5px; border-radius: 5px;
  background: linear-gradient(#ebc678, #9a7135); }
.title-book::after { content: ''; position: absolute; pointer-events: none;
  right: 7px; top: 16px; bottom: 19px; width: 5px; border-radius: 4px;
  background: #c9ad79; opacity: .8; }

/* La hoja. Lleva el desplazamiento por dentro: en una pantalla corta con el
   interruptor de taller abierto hay más de 844 px de controles, y una cubierta
   que recorta el botón de empezar no es una cubierta. */
.title-sheet { position: relative; z-index: 1; flex: 0 1 980px; width: 100%; max-width: 980px;
  min-width: 0; box-sizing: border-box; overflow: auto;
  display: flex; flex-direction: column; gap: 12px;
  padding: max(18px, env(safe-area-inset-top)) 22px max(18px, env(safe-area-inset-bottom));
  background-color: var(--skin-page);
  background-image: var(--skin-map-pattern);
  background-repeat: no-repeat;
  border: 1px solid #9eae9f; border-radius: 16px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .8);
  scrollbar-width: thin; scrollbar-color: #947452 transparent; }
.title-sheet::-webkit-scrollbar { width: 6px; }
.title-sheet::-webkit-scrollbar-track { background: transparent; }
.title-sheet::-webkit-scrollbar-thumb { border-radius: 4px;
  background: #718879; }

/* -------------------------------------------------------------- la portada */
.title-head { display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding-top: 2px; text-align: center; }
.title-head h1 { margin: 0; color: var(--skin-ink);
  font: 600 32px/1.1 var(--skin-font-heading);
  letter-spacing: .025em; text-transform: uppercase; text-wrap: balance; }
/* El filete y la palmeta con la que muere, los mismos que cierran la cabecera
   de un año en la crónica: es el remate de la casa, no uno nuevo. */
.title-flourish { display: flex; align-items: center; gap: 6px; width: 100%; max-width: 280px; }
.title-flourish hr { flex: 1 1 auto; margin: 0; height: 1px; border: 0;
  background: var(--skin-rule-gold); }
.title-flourish svg { flex: 0 0 auto; display: block; height: 14px; width: auto;
  color: var(--skin-gold); }
.title-flourish svg:first-child { transform: scaleX(-1); }
.title-head p { margin: 0; max-width: 45ch; color: var(--skin-ink-soft);
  font: 400 13px/1.4 var(--skin-font-voice); text-wrap: pretty; }

/* Centro de la portada aprobada: se recorta sólo el paisaje. La imagen completa
   trae botones y texto impresos, que duplicarían los controles reales y no se
   podrían traducir. El recorte conserva su marco y deja fuera esos rótulos. */
.title-vignette { width: min(42vw, 146px); aspect-ratio: 300 / 365;
  flex: 0 0 auto; margin: 2px auto;
  background-image: url('./ui/art/title-valley-higgsfield.png');
  background-size: 250.67% auto; background-position: 50% 42%;
  background-repeat: no-repeat;
  /* El pergamino impreso es más amarillo que la hoja real: se conserva sólo
     la ventana arqueada y el papel de la pantalla vuelve a rodearla. */
  clip-path: polygon(50% 0, 61% 2%, 73% 6%, 84% 13%, 92% 21%,
    98% 29%, 100% 34%, 100% 100%, 0 100%, 0 34%, 2% 29%,
    8% 21%, 16% 13%, 27% 6%, 39% 2%); }

/* ------------------------------------------------------------ los controles */
.title-actions { display: flex; flex-direction: column; gap: 12px; }
.title-seed-row { display: flex; align-items: flex-end; gap: 10px; }
.title-seed-field { flex: 1 1 auto; display: flex; flex-direction: column; gap: 5px; }
.title-seed-row label, .title-dev-row label { color: var(--skin-ink-faded);
  font: 700 11px/1.1 var(--skin-font-voice); letter-spacing: .035em;
  text-transform: uppercase; }
/* El campo: papel con un filete de tinta debajo, no una caja de sistema. Un
   número escrito a mano en un registro. */
.title-seed, .title-year { box-sizing: border-box; width: 100%; min-height: 46px;
  padding: 0 12px; border: 1px solid #c8b998;
  border-radius: 9px; background: rgba(255, 253, 246, .9); color: var(--skin-ink);
  font: 600 20px/1 var(--skin-font-voice); font-variant-numeric: tabular-nums;
  letter-spacing: .02em; }
.title-seed:focus-visible, .title-year:focus-visible {
  outline: 2px solid var(--skin-gold); outline-offset: 2px; }
.title-hint { margin: 0; color: var(--skin-ink-faded);
  font: 400 12px/1.4 var(--skin-font-voice); }
.title-dev-row { display: flex; flex-direction: column; gap: 8px; }
.title-dev-row[hidden] { display: none; }
.title-dev-field { flex: 1 1 auto; display: flex; flex-direction: column; gap: 5px; }
.title-presets { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.title-preset { min-height: var(--ui-tap-min); padding: 6px 4px; font-size: 11px;
  line-height: 1.2; text-wrap: balance; border-radius: 9px; }
.title-preset[disabled] { opacity: .65; cursor: default; }

/* Los botones son los dos del prototipo 03, y el reparto dice cuál manda:
   **madera el de fundar**, que es lo que esta pantalla existe para hacer, y
   pergamino el de continuar y el de otro número. */
.title-new, .title-continue { width: 100%; }
.title-new { background: linear-gradient(#f0cc78, #d7a74c); color: #2f2819;
  border: 1px solid #a8782c; box-shadow: 0 3px 0 #8d652d, 0 8px 14px rgba(47, 39, 23, .18); }
.title-continue { background: #f8f3e8; border-color: #b9a982;
  box-shadow: 0 2px 0 #b9a982; }
.title-reroll { flex: 0 0 auto; min-height: 46px; padding: 0 14px; font-size: 12px; }
.title-continue-row { display: flex; flex-direction: column; gap: 4px; }
.title-continue-row small { color: var(--skin-ink-faded);
  font: 400 12px/1.35 var(--skin-font-voice); }
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
.title-sound, .title-dev { min-width: var(--ui-tap-min); min-height: var(--ui-tap-min); padding: 0 10px; border: 0;
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
.title-language { min-height: var(--ui-tap-min); padding: 0 7px; border: 1px solid var(--skin-rule);
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

/** Partidas reales y reproducibles, comprobadas en sus tres eras. Sólo taller. */
export const DEV_PRESETS = [
  { id: 'hamlet', seed: 7, year: 1 },
  { id: 'village', seed: 11, year: 21 },
  { id: 'town', seed: 7, year: 60 },
] as const;

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
export function openTitle(save: SaveFile | null, choose: (choice: TitleChoice) => void | Promise<void>): void {
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
  // UI-W · el título es un logotipo de hierro pintado (`tools/ui/textures.py`,
  // uno por lengua): cara, lateral y contorno, como pidió Vera con la portada de
  // otro juego de ejemplo. El nombre del banco es su texto alternativo, así que
  // el lector de pantalla sigue diciendo el título.
  const logo = document.createElement('img');
  logo.className = 'title-logo';
  logo.src = `./ui/art/title-logo-${currentLocale()}.png`;
  logo.alt = renderUiText('title.name');
  logo.decoding = 'async';
  name.append(logo);
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

  // La viñeta de la portada aprobada ocupa el hueco central. Se oculta de la
  // accesibilidad: título y acciones siguen siendo texto y controles reales.
  const vignette = document.createElement('div');
  vignette.className = 'title-vignette';
  vignette.setAttribute('aria-hidden', 'true');
  // UI-W · el grabado en dos tintas, pardo sobre crema, de `tools/ui/textures.py`.
  // Virado en CSS teñía el papel de naranja (Vera: «el color de fondo de la
  // imagen no me gusta nada»). La ruta va aquí porque es de `public/` y un
  // `url()` en el CSS lo resolvería Vite.
  vignette.style.backgroundImage = "url('./ui/art/title-valley-engraving.png')";

  const actions = document.createElement('div');
  actions.className = 'title-actions';

  let done = false;
  const finish = (choice: TitleChoice, button: HTMLButtonElement): void => {
    if (done) return;
    done = true;
    const originalLabel = button.textContent;
    const preparingYear = choice.kind === 'new' && choice.year > 1;
    const close = (): void => {
      retireOverlay(scrim, book);
      document.documentElement.classList.remove('title-open');
    };
    const restore = (error: unknown): void => {
      done = false;
      scrim.inert = false;
      button.disabled = false;
      button.textContent = originalLabel;
      console.error(error);
    };
    const prepare = (): void => {
      try { void Promise.resolve(choose(choice)).then(close, restore); }
      catch (error) { restore(error); }
    };
    scrim.inert = true;
    if (preparingYear) {
      // Entre los dos RAF el aviso llega a pintarse antes del primer tramo.
      button.textContent = renderUiText('title.new.working');
      button.disabled = true;
      requestAnimationFrame(() => { requestAnimationFrame(prepare); });
    } else {
      prepare();
    }
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
    cont.addEventListener('click', () => finish({ kind: 'continue' }, cont));
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
  // UI-W · un dado y no la palabra, como en la portada de Vera del 24 sep: el
  // nombre sigue en el banco y es el nombre accesible del botón.
  reroll.setAttribute('aria-label', renderUiText('title.reroll'));
  reroll.title = renderUiText('title.reroll');
  // Un dado de marfil en perspectiva, tres caras con su luz, como el de la
  // referencia: el dibujado de frente se leía plano (Vera: «tiene que verse
  // como en el diseño»).
  reroll.innerHTML = '<svg viewBox="0 0 32 32" width="40" height="40" aria-hidden="true" focusable="false"'
    + ' stroke="#3A2412" stroke-width="1" stroke-linejoin="round">'
    + '<defs>'
    + '<linearGradient id="die-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFBF0"/><stop offset="1" stop-color="#F3E6CA"/></linearGradient>'
    + '<linearGradient id="die-left" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0E2C4"/><stop offset="1" stop-color="#D9C39B"/></linearGradient>'
    + '<linearGradient id="die-right" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2BB91"/><stop offset="1" stop-color="#B89D70"/></linearGradient>'
    + '</defs>'
    + '<path d="M16 3.5 27.5 9.8 16 16.1 4.5 9.8Z" fill="url(#die-top)"/>'
    + '<path d="M4.5 9.8 16 16.1V28.8L4.5 22.5Z" fill="url(#die-left)"/>'
    + '<path d="M27.5 9.8 16 16.1V28.8l11.5-6.3Z" fill="url(#die-right)"/>'
    + '<path d="M5.4 10.2 16 4.4 26.6 10.2" fill="none" stroke="#FFFFFF" stroke-opacity=".8" stroke-width=".7"/>'
    + '<g fill="#3A2412" stroke="none">'
    + '<ellipse cx="16" cy="9.8" rx="2.1" ry="1.2"/>'
    + '<ellipse cx="7.6" cy="14.2" rx="1.25" ry="1.6" transform="rotate(-28 7.6 14.2)"/>'
    + '<ellipse cx="12.9" cy="24.2" rx="1.25" ry="1.6" transform="rotate(-28 12.9 24.2)"/>'
    + '<ellipse cx="19.1" cy="17.9" rx="1.2" ry="1.55" transform="rotate(28 19.1 17.9)"/>'
    + '<ellipse cx="21.75" cy="20.3" rx="1.2" ry="1.55" transform="rotate(28 21.75 20.3)"/>'
    + '<ellipse cx="24.4" cy="22.7" rx="1.2" ry="1.55" transform="rotate(28 24.4 22.7)"/>'
    + '</g></svg>';
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
    finish({ kind: 'new', seed: parseSeed(seed.value, rollSeed(played)),
      year: devRow.hidden ? 1 : parseYear(year.value) }, begin);
  });

  const presets = document.createElement('div');
  presets.className = 'title-presets';
  for (const preset of DEV_PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'title-preset skin-button--parchment';
    // `year` es una fecha de crónica para renderUiText y suma uno. Estos
    // botones ya llevan el año de cabecera, así que usan un parámetro neutro.
    button.textContent = renderUiText(`title.dev.preset.${preset.id}`, { target: preset.year });
    button.addEventListener('click', () => finish({ kind: 'new', seed: preset.seed, year: preset.year }, button));
    presets.append(button);
  }
  devRow.append(presets);

  const sound = document.createElement('button');
  sound.type = 'button';
  sound.className = 'title-sound';
  // UI-W · el altavoz dibujado, el mismo del rincón de mandos del valle; lo
  // que dice (encendido, apagado) va en el nombre accesible, del banco.
  const paintSound = (): void => {
    const on = soundPreference();
    sound.setAttribute('aria-pressed', String(on));
    sound.setAttribute('aria-label', renderUiText(on ? 'app.sound.on' : 'app.sound.off'));
    sound.innerHTML = '<svg viewBox="0 0 16 16" width="22" height="22" aria-hidden="true" focusable="false"'
      + ' fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M3 6.3v3.4h2.3L8.6 12.2V3.8L5.3 6.3z"/>'
      + (on
        ? '<path d="M10.7 5.3c1 .9 1 4.5 0 5.4"/><path d="M12.5 3.6c2 1.8 2 6.9 0 8.7"/>'
        : '<path d="M10.8 5.6 14.2 10.4M14.2 5.6 10.8 10.4"/>')
      + '</svg>';
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
  sheet.append(head, vignette, actions);
  const book = document.createElement('div');
  book.className = 'title-book';
  book.append(sheet);
  scrim.append(book);
  document.body.append(scrim);
}
