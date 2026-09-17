// M-19 · Deterministic debug route for automated screenshots.

import { skyAt } from '../derive/weather';
import { OFFER, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { postOffer } from '@engine/world/road';
import type { GameState, Season } from '@engine/state';
import { SEASONS } from '@engine/time';
import { paintVillageBackground, sizeCanvas } from '@render/canvas';
import { paletteFor } from '@derive/palette';
import { auditSprites } from '@render/sprites/audit';
import { crowdPositions } from '@render/crowd';
import { paintFigures, paintFigureShadows } from '@render/layers/figures';

export interface DebugRequest {
  seed: number;
  year: number;
  season: Season;
}

export function parseDebugRequest(search: string): DebugRequest | null {
  const query = new URLSearchParams(search);
  if (query.get('debug') !== '1') return null;
  const seed = Number(query.get('seed') ?? 7);
  const year = Number(query.get('year') ?? 1);
  const requested = query.get('season') ?? 'spring';
  const season = SEASONS.find((value) => value === requested);
  if (!Number.isInteger(seed) || !Number.isInteger(year) || year < 0 || season === undefined) {
    throw new Error('Invalid debug route: seed and year must be integers and season must be valid.');
  }
  return { seed, year, season };
}

export function stateAt(request: DebugRequest): GameState {
  const state = foundGame(request.seed);
  const seasonIndex = SEASONS.indexOf(request.season);
  const targetTick = request.year * TIME.WEEKS_PER_YEAR + seasonIndex * TIME.WEEKS_PER_SEASON + 6;
  run(state, targetTick, 'prudent', CATALOG);
  return state;
}

/**
 * U-13 · Adelanta el valle hasta una semana cuya **primera jornada** tenga el
 * cielo que se pide, y devuelve cuántas semanas hizo falta.
 *
 * Una tormenta sale en el 4 % de las jornadas y la nieve en el 3,5 %, así que
 * esperarlas mirando no es una forma de fotografiarlas: esto es lo que le da a
 * `?weather=storm` y a `?weather=snow` su cielo en el primer fotograma. La
 * jornada que el juego pinta al abrir es `tick · DAYS_PER_WEEK` —el tiempo
 * escénico se lee del tick desde v3.72—, así que basta con probar semanas hasta
 * que esa jornada la tenga.
 *
 * **Y pedir tormenta en invierno no tiene sentido**, que es el fallo con el que
 * nació esto: §10.8 no deja tronar en invierno, así que buscar `storm` con
 * `season=winter` se saltaba la estación entera —tres años de más en la medida
 * que lo destapó— y acababa enseñando un verano. Pedir `snow` es lo que hay que
 * hacer en invierno, y pedir `wet` sirve para las dos.
 */
export function runToSky(
  state: GameState, want: 'storm' | 'snow' | 'wet' = 'storm', limitWeeks = 400,
): number {
  const matches = (kind: string): boolean => (
    want === 'wet' ? kind !== 'clear' : kind === want
  );
  for (let weeks = 0; weeks < limitWeeks; weeks += 1) {
    if (matches(skyAt(state, state.tick * TIME.DAYS_PER_WEEK).kind)) return weeks;
    run(state, 1, 'prudent', CATALOG);
  }
  return limitWeeks;
}

/**
 * Juega el valle hasta el **año que se pide**, contestando las encrucijadas.
 *
 * `year` es el año tal como lo lee la cabecera del juego y lo escribe la
 * cronica -«Year 1», «ANNO I»-, no un numero de anos transcurridos: el valle
 * recien fundado **ya esta en el ano 1**, asi que 0 y 1 son los dos fundar y
 * mirar, y el ano 21 es el tick 960. Era la primera version de esto y estaba
 * mal por un ano: se escribia 20 y la cabecera contestaba «Year 21». El numero
 * que se escribe tiene que ser el que se lee.
 *
 * Es lo que hay detrás del campo de año del menú de inicio (U-10b, pedido por
 * el dueño el 16 sep 2026: «tardo mucho en poder ver las demos y avanzar
 * muchos años porque no tengo manera de elegir el año»). Antes de esto la
 * única forma de ver una aldea hecha era mirar, o falsear el reloj del
 * navegador desde el capturador.
 *
 * **Y no es un bucle de `tick`, a propósito.** Es la trampa que `CLAUDE.md`
 * documenta y que costó media página de conclusiones falsas: sin contestar,
 * la primera encrucijada planteada se queda pendiente para siempre, §8.6 no
 * plantea dos, y con ella se van sus consecuencias, sus semillas y las obras
 * que conceden. Con `prudent` —la política de referencia de §12.9, la misma
 * que usa `stateAt`— lo que se abre es una partida de verdad.
 *
 * Determinista: misma semilla y mismos años, mismo valle. Y puede acabarse por
 * el camino (§13.3), que es el juego: entonces se abre lo que quedó.
 *
 * Medido en el portátil: 5 años 59 ms, 20 años 296 ms, 60 años 1,3 s.
 */
/**
 * VZ-6 · Sigue jugando hasta que haya **una decisión planteada y sin contestar**,
 * y devuelve cuántas semanas hizo falta.
 *
 * Es lo que le da su estado a `?crossroad=1`, y hace falta porque `stateAt` y
 * `openAtYear` juegan con la política prudente —que es lo correcto: sin
 * contestar, la primera planteada se queda pendiente para siempre y con ella se
 * van sus consecuencias (`CLAUDE.md`)—, así que al abrir **nunca** hay ninguna
 * en pantalla. Y sin una en pantalla hay dos cosas que no se pueden mirar: el
 * documento sellado de UI-V3, que sólo existe habiendo decisión pendiente, y
 * que aplazar deje ir a ver otra cosa (§8.6).
 *
 * No es un bucle de `tick`: es `run` semana a semana con la política de
 * referencia. `run` contesta la pendiente **al empezar** el tick siguiente, así
 * que una recién planteada sigue ahí cuando la semana termina — que es
 * exactamente el instante que se busca, y una partida de verdad hasta él.
 *
 * Puede acabarse el valle por el camino (§13.3): entonces se abre lo que quedó,
 * igual que `openAtYear`.
 */
/**
 * M-0 · Pone una oferta del camino en el estado, para poder mirarla.
 *
 * Es lo que le da su estado a `?offer=1`, y hace falta por lo mismo que
 * `?crossroad=1`: quién sube a vender lo sortea la tabla de sucesos, así que
 * esperar a que suba no es una forma de fotografiar la oferta ni de probarla.
 * El trato es el del buhonero, que es el que cualquier valle con leña puede
 * pagar.
 */
export function offerNow(state: GameState): void {
  state.village.wood = Math.max(state.village.wood, OFFER.PEDLAR_WOOD * 2);
  postOffer(state, 'pedlar',
    [{ k: 'stat', stat: 'silver', amount: OFFER.PEDLAR_SILVER }],
    [{ k: 'stat', stat: 'wood', amount: OFFER.PEDLAR_WOOD }]);
}

export function runToCrossroad(state: GameState, limitWeeks = 400): number {
  for (let weeks = 0; weeks < limitWeeks; weeks += 1) {
    if (state.crossroad !== null || state.ended !== null) return weeks;
    run(state, 1, 'prudent', CATALOG);
  }
  return limitWeeks;
}

export function openAtYear(state: GameState, year: number): void {
  const weeks = Math.max(0, Math.floor(year) - 1) * TIME.WEEKS_PER_YEAR;
  if (weeks > 0) run(state, weeks, 'prudent', CATALOG);
}

function diagnosticCanvas(root: HTMLElement, state: GameState, request: DebugRequest): void {
  root.replaceChildren();
  const shell = document.createElement('main');
  shell.id = 'valley-shell';
  shell.style.cssText = 'width:390px;height:844px;display:grid;place-items:start center;background:#b9c9cf;color:#3c3a34';
  const canvas = document.createElement('canvas');
  canvas.id = 'valley';
  sizeCanvas(canvas, 10, 2);
  canvas.style.marginTop = '22px';
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D is unavailable.');
  const palette = paletteFor(request.season, 6);
  shell.style.background = palette.void;
  ctx.scale(2, 2);
  ctx.drawImage(paintVillageBackground(state, palette, 10), 0, 0);
  const figures = crowdPositions(state, 0.45);
  paintFigureShadows(ctx, figures, 10);
  paintFigures(ctx, figures, palette, 10);
  shell.append(canvas);
  root.append(shell);
}

export function mountDebug(root: HTMLElement, request: DebugRequest): GameState {
  const state = stateAt(request);
  diagnosticCanvas(root, state, request);
  document.documentElement.dataset.debugReady = 'true';
  document.documentElement.dataset.spriteAudit = JSON.stringify(auditSprites());
  return state;
}
