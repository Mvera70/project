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
import { setSoundPreference, soundPreference } from '../sound';

const STYLE_ID = 'valley-title-style';
const STYLE = `
/* U-01 · la misma piel que el parte del letargo: noche, pergamino y latón. */
.title-scrim { position: fixed; inset: 0; z-index: 13; display: flex; flex-direction: column;
  justify-content: space-between; box-sizing: border-box;
  padding: max(28px, env(safe-area-inset-top)) 22px max(24px, env(safe-area-inset-bottom));
  background: var(--night, #1a1511); color: var(--parchment, #f2e9d8);
  font: 14px/1.45 var(--plain, ui-sans-serif,-apple-system,'Segoe UI',Roboto,sans-serif); }
.title-head { padding-top: 14px; border-top: 2px solid var(--gild-lit, #c9ab6b); }
.title-head h1 { margin: 0; letter-spacing: .12em; text-transform: uppercase; text-wrap: balance;
  color: var(--gild-lit, #c9ab6b);
  font: 600 30px/1.1 var(--voice, 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif); }
.title-head p { margin: 12px 0 0; max-width: 34ch; color: var(--paper-dim, #d9cfbc); text-wrap: pretty;
  font: 16px/1.5 var(--voice, 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif); }
.title-actions { display: grid; gap: 12px; }
.title-actions button { min-height: 50px; padding: 12px 16px; border: 1px solid rgba(242,233,216,.35);
  border-radius: 10px; background: rgba(242,233,216,.08); color: inherit; text-align: left;
  font: 600 16px/1.2 var(--voice, 'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif); }
.title-actions button small { display: block; margin-top: 4px; color: var(--paper-dim, #d9cfbc);
  font: 13px/1.3 var(--plain, ui-sans-serif,-apple-system,'Segoe UI',Roboto,sans-serif); }
.title-new { background: #d8c574 !important; color: #242016 !important; border-color: #d8c574 !important; }
.title-seed-row { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
.title-seed-row label { grid-column: 1 / -1; color: var(--paper-dim, #d9cfbc); font-size: 12px;
  letter-spacing: .08em; text-transform: uppercase; }
.title-seed, .title-year { box-sizing: border-box; width: 100%; min-height: 44px; padding: 8px 12px;
  border: 1px solid rgba(242,233,216,.35); border-radius: 10px; background: rgba(0,0,0,.25);
  color: var(--parchment, #f2e9d8); font: 600 18px/1.2 var(--plain, ui-sans-serif,-apple-system,'Segoe UI',Roboto,sans-serif);
  font-variant-numeric: tabular-nums; letter-spacing: .04em; }
.title-seed:focus, .title-year:focus { outline: 2px solid var(--gild-lit, #c9ab6b); outline-offset: 1px; }
.title-reroll { min-height: 44px !important; padding: 8px 14px !important; font-size: 14px !important; }
.title-hint { grid-column: 1 / -1; margin: 0; color: var(--paper-dim, #d9cfbc); font-size: 13px; text-wrap: pretty; }
.title-dev-row { display: grid; gap: 8px; }
.title-dev-row label { color: var(--paper-dim, #d9cfbc); font-size: 12px;
  letter-spacing: .08em; text-transform: uppercase; }
.title-dev-row[hidden] { display: none; }
.title-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.title-sound { justify-self: start; min-height: 40px !important; padding: 8px 12px !important;
  border-color: transparent !important; background: transparent !important; font-size: 14px !important;
  color: var(--paper-dim, #d9cfbc) !important; }
.title-sound[aria-pressed="true"] { color: var(--gild-lit, #c9ab6b) !important; }
.title-dev { min-height: 40px !important; padding: 8px 12px !important;
  border-color: transparent !important; background: transparent !important; font-size: 13px !important;
  letter-spacing: .1em; text-transform: uppercase;
  color: rgba(217,207,188,.55) !important; }
.title-dev[aria-pressed="true"] { color: var(--gild-lit, #c9ab6b) !important; }
@media (prefers-reduced-motion: no-preference) {
  .title-scrim { animation: title-in .6s ease-out both; }
  @keyframes title-in { from { opacity: 0; } to { opacity: 1; } }
}
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
export function devPreference(): boolean {
  try { return localStorage.getItem(DEV_KEY) === 'on'; } catch { return false; }
}

export function setDevPreference(on: boolean): void {
  try { localStorage.setItem(DEV_KEY, on ? 'on' : 'off'); } catch { /* modo privado: nada que hacer */ }
}

const DEV_KEY = 'valley.dev';

/** Un número de valle al azar que no repita ninguno de los ya jugados. */
export function rollSeed(excluded: ReadonlySet<number>): number {
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
  head.append(name, tagline);

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
    cont.className = 'title-continue';
    cont.textContent = renderUiText('title.continue');
    const detail = document.createElement('small');
    detail.textContent = renderUiText('title.continue.detail', {
      year: yearOf(save.state.tick) + 1,
      count: population(save.state),
    });
    cont.append(detail);
    cont.addEventListener('click', () => finish({ kind: 'continue' }));
    actions.append(cont);
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
  reroll.className = 'title-reroll';
  reroll.textContent = renderUiText('title.reroll');
  reroll.addEventListener('click', () => { seed.value = String(rollSeed(played)); });
  const hint = document.createElement('p');
  hint.className = 'title-hint';
  hint.textContent = renderUiText('title.seed.hint');
  seedRow.append(seedLabel, seed, reroll, hint);

  // U-10b · la fila de taller: en qué año se abre el valle. Oculta salvo que
  // el interruptor de abajo esté puesto.
  const devRow = document.createElement('div');
  devRow.className = 'title-dev-row';
  const yearLabel = document.createElement('label');
  yearLabel.textContent = renderUiText('title.dev.year');
  yearLabel.htmlFor = 'valley-year';
  const year = document.createElement('input');
  year.id = 'valley-year';
  // Clase propia y no `title-seed`, a propósito: `valley.shots.ts` localiza
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
  devRow.append(yearLabel, year, devHint);
  devRow.hidden = !devPreference();

  const begin = document.createElement('button');
  begin.type = 'button';
  begin.className = 'title-new';
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

  const bottom = document.createElement('div');
  bottom.className = 'title-bottom';
  bottom.append(sound, dev);

  actions.append(seedRow, devRow, begin, bottom);
  scrim.append(head, actions);
  document.body.append(scrim);
}
