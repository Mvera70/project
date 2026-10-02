// M-19 · Deterministic debug route for automated screenshots.

import { skyAt } from '../derive/weather';
import { bastionWalkwayOf } from '../derive/bastion-walkway';
import { CROWN, FATE, OFFER, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { archiveGame } from '@engine/save';
import { MEANS_SPEC, giveMeans } from '@engine/world/means';
import { HUNT_ORDER } from '@engine/world/hunting';
import { woodCostOf } from '@engine/world/works';
import { crownCandidates } from '@engine/people/crown';
import { crownKing } from '@engine/world/crown';
import { postOffer } from '@engine/world/road';
import type { ArchivedGame, EndState, GameState, HappeningId, MeansId, Role, Season } from '@engine/state';

/** Las cuatro maneras de acabar, que son las cuatro lápidas. */
type EndCause = EndState['cause'];
import { SEASONS, seasonOf, yearOf } from '@engine/time';

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

/**
 * Esquema 12 · la demo de la cadena de la madera (28 sep 2026): dónde empieza.
 *
 * El prototipo de Vera se juzga mirando diez minutos a ×1 sin tocar nada, y en
 * diez minutos tiene que caber la cadena entera: entregas que suben la leñera
 * y, al cerrar la semana, una obra que se abre, paga su madera y la ve salir
 * hacia la parcela. Así que se busca, semana a semana y con la política
 * prudente de siempre, **una semana con al menos `minDeliveries` entregas
 * después de `WOOD_DEMO_START` cuya semana siguiente abra una obra que pague
 * madera**. Determinista: la misma semilla da la misma semana.
 */
export const WOOD_DEMO_START = 0.45;

export function runToWoodChain(state: GameState, limitWeeks = 480, minDeliveries = 3): number {
  for (let week = 0; week < limitWeeks && state.ended === null; week += 1) {
    const late = (state.woodRun?.at ?? []).filter((at) => at >= WOOD_DEMO_START).length;
    if (late >= minDeliveries) {
      const next = structuredClone(state);
      run(next, 1, 'prudent', CATALOG);
      const work = next.works.find((one) => one.startedTick === next.tick);
      const paid = work !== undefined && woodCostOf(next, work.kind) > 0
        && work.stoneDone === 0;
      if (paid) return week;
    }
    run(state, 1, 'prudent', CATALOG);
  }
  return limitWeeks;
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

/**
 * M-3 · Da un medio al abrir, para poder **verlo**.
 *
 * Es lo que le da su estado a `?means=pigs`. Hace falta por lo mismo que
 * `?offer=1`: un medio se paga con lo que el valle tenga, así que en una
 * captura no se puede esperar a que la aldea junte la plata. Se le pone lo que
 * cuesta y se le da, que es lo que un jugador haría.
 */
export function giveNow(state: GameState, id: MeansId): void {
  for (const [stat, amount] of Object.entries(MEANS_SPEC[id].cost)) {
    const key = stat as keyof typeof state.village;
    state.village[key] = Math.max(state.village[key], (amount ?? 0) * 2);
  }
  giveMeans(state, id, seasonOf(state.tick), yearOf(state.tick));
}

/**
 * IA-5 · Provoca un suceso del valle esta misma semana, para poder **verlo**.
 *
 * Es lo que le da su estado a `?happening=wolves_at_the_coop`. Hace falta por
 * lo mismo que `?weather=storm`: el lobo del corral sale en un puñado de
 * semanas de una partida de sesenta años, así que esperarlo mirando no es una
 * forma de grabarlo. **No toca el motor**: escribe en el registro lo que el
 * paso 2b habría escrito, que es lo único que la capa de vida lee para
 * guionizar la visita (`wolfRaidToday`, `life/staging.ts`).
 */
export function happenNow(state: GameState, id: HappeningId): void {
  state.happenings.push({ tick: state.tick, id, visible: [], who: [] });
  // AN-4b · El oso no se lee del registro sino de la bandera que el motor pone
  // al resolverlo (`fate.ts`): sin ella, `?happening=bear_in_the_wood` apuntaba
  // el suceso y la visita no llegaba nunca.
  if (id === 'bear_in_the_wood') state.flags['bear'] = state.tick + FATE.BEAR_WEEKS;
}

/**
 * AN-4b · Da por cazadas estas especies (`hunt:<especie>` = 0, lo mismo que
 * apunta `settleHunt` al cobrar la primera pieza), para poder **ver** las
 * cazas que vienen después en `HUNT_ORDER` —conejo, ciervo, jabalí, oso— y la
 * visita del oso, que sólo nace superado el jabalí (`createBear`). Como
 * `?happening=`, es la única forma de grabar lo que una partida tarda
 * decenas de horas en abrir. Lo que no es una especie se ignora.
 */
export function huntedNow(state: GameState, species: readonly string[]): void {
  for (const one of species) {
    if ((HUNT_ORDER as readonly string[]).includes(one)) state.flags[`hunt:${one}`] = 0;
  }
}

/**
 * K-5 · Deja el valle **listo para coronar**, para poder fotografiar la fila.
 *
 * Es lo que le da su estado a `?crown=ready`. Hace falta por lo mismo que
 * `?means=`: la corona pide treinta personas y treinta de plata, y una captura
 * no puede esperar a que la aldea junte las dos cosas. No corona a nadie: deja
 * la fila encendida y la decisión al jugador, que es de lo que va la pantalla.
 */
export function crownReady(state: GameState): void {
  state.village.silver = Math.max(state.village.silver, CROWN.SILVER * 2);
}

/**
 * Y corona al primer candidato, para fotografiar lo que viene después.
 *
 * `?crown=<oficio>`: el oficio se le pone a mano —lo que se quiere ver es un rey
 * de ese estilo, no si la semilla tenía herrero— igual que `crown-will.test.ts`.
 */
export function crownNow(state: GameState, trade: string): void {
  crownReady(state);
  const who = crownCandidates(state)[0];
  if (who === undefined) return;
  if (trade !== 'any') who.role = trade as Role;
  crownKing(state, who.id, seasonOf(state.tick), yearOf(state.tick));
}

/**
 * D3 · `?raid=<cuántos>` planta una partida del valle vecino llegando **hoy**.
 *
 * Hace falta por lo mismo que `?crown=`: un asalto llega hacia la hora 114 de
 * reloj y una captura no puede esperar. Pone lo que el motor pondría al llegar
 * la partida (`world/threat.ts`), ni más ni menos, así que lo que se ve es lo
 * que se vería jugando.
 */
export function raidNow(state: GameState, band: number, assault = false): void {
  state.threat.arrivedTick = state.tick;
  state.threat.lastBand = Math.max(1, band);
  // D3b · **y si es un asalto, la marca del motor.** Es la que hace que la
  // partida vaya a por el portón en vez de plantarse a mirarlo (B3/B4), y sin
  // poder ponerla a mano la única forma de grabar un asalto era acertar la
  // semana exacta en la que el clan junta hombres para tanto.
  if (assault) state.flags['assault'] = state.tick + 1;
}

/**
 * C2/D2 · **Pone el valle en pie de guerra a `weeks` semanas del asalto**, para
 * poder ver la guarnición subir sin esperar a que baje nadie.
 *
 * Es el compañero de `raidNow`: uno enseña el asalto y esto la víspera. Sin él,
 * la única manera de grabar a los arqueros en sus puestos era acertar la semana
 * exacta en la que el motor avisa, que pasa dos veces en sesenta años.
 */
export function comingNow(state: GameState, weeks = 1): void {
  state.threat.comingTick = state.tick + Math.max(0, weeks);
  state.threat.comingBand = Math.max(state.threat.comingBand, 20);
}

/** E0b · Primer estado visible después de resolver B2, para observar el regreso. */
export function warningNow(state: GameState, weeks = 8): void {
  comingNow(state, weeks);
  state.crossroad = null;
  state.history.push({
    tick: state.tick, templateId: 'raiders_coming', optionId: 'brace', cast: {},
  });
}

/** E0b · Modal B2 auténtica para probar el corte y decidirla en navegador. */
export function warningPendingNow(state: GameState, weeks = 8): void {
  comingNow(state, weeks);
  state.crossroad = {
    templateId: 'raiders_coming', posedTick: state.tick, cast: {}, optionIds: ['brace', 'wait'],
  };
}

/**
 * E0a · `?braced=` ya representa la decisión completa, no sólo una víspera.
 * `?coming=` conserva el control de comparación con la misma amenaza sin la
 * bandera: las dos tomas difieren en lo que el jugador eligió.
 */
export function bracedNow(state: GameState, weeks = 1): void {
  comingNow(state, weeks);
  state.flags['braced'] = state.tick + Math.max(1, weeks);
}

/** E0c · El estado exacto que deja una llegada saqueadora al tick siguiente. */
export function aftermathNow(state: GameState, beast = false): void {
  const arrived = state.tick - 1;
  state.threat.arrivedTick = arrived;
  state.flags['just_sacked'] = state.tick + TIME.WEEKS_PER_YEAR - 1;
  state.chronicle.push({
    tick: arrived, kind: 'raid', templateKey: 'raid.open', params: {}, weight: 3,
  });
  if (beast) state.chronicle.push({
    tick: arrived, kind: 'raid', templateKey: 'raid.beast', params: {}, weight: 2,
  });
}

/** E0d · Obra real sobre una estaca existente, sólo para observar su transición. */
export function wallWorkNow(state: GameState, kind: 'gate' | 'wall', progress = 0.35): void {
  const source = state.buildings.find((building) => building.kind === 'palisade' && building.lostTick === null);
  if (source === undefined) return;
  if (progress >= 1) {
    source.kind = kind;
    source.tier = kind === 'wall' ? 1 : 0;
    return;
  }
  const cost = 100;
  state.works = [{
    id: Math.max(0, ...state.works.map((work) => work.id), ...state.buildings.map((building) => building.id)) + 1,
    kind, x: source.x, y: source.y, w: source.w, h: source.h, bpCost: cost,
    bpDone: Math.max(0, Math.min(cost, Math.round(progress * cost))), stoneDone: 0,
    materialsPaid: true, startedTick: state.tick, upgradeOf: source.id,
  }];
}

/**
 * E3b · Junta controlada para revisar los dos módulos en la app.
 *
 * La selección de mejoras ya levanta el bastión de forma espontánea junto a
 * dos muros rectos. Esta ruta sólo comprueba la precondición; no modifica la
 * partida ni el guardado antes de abrir la cámara.
 */
export function walkwayNow(state: GameState): void {
  if (state.seed !== 7 || yearOf(state.tick) !== 60 || seasonOf(state.tick) !== 'summer') {
    throw new Error('E3b controlled scene requires seed 7, year 60, and summer.');
  }
  const liveAt = (x: number, y: number, kind: 'bastion' | 'wall') => state.buildings.find((building) => (
    building.kind === kind && building.lostTick === null && building.x === x && building.y === y
  ));
  const bastion = liveAt(30, 67, 'bastion');
  const first = liveAt(29, 67, 'wall');
  const next = liveAt(28, 67, 'wall');
  if (bastion === undefined || first === undefined || next === undefined) {
    throw new Error('E3b review needs a bastion (30,67) and stone walls (29,67), (28,67).');
  }
  if (bastion.id !== 281 || first.id !== 255 || next.id !== 256
    || bastion.tier !== 1 || first.tier !== 1 || next.tier !== 1) {
    throw new Error('E3b controlled scene found unexpected defence identities or non-stone walls.');
  }
  const walkway = bastionWalkwayOf(state, bastion);
  if (walkway === null || walkway.firstWallId !== 255 || walkway.nextWallId !== 256
    || walkway.access.x !== 0 || walkway.access.z !== -1 || walkway.side.x !== -1 || walkway.side.z !== 0) {
    throw new Error('E3b controlled scene did not select the expected north bastion walkway (255 → 256).');
  }
}

/**
 * F3d · **Un archivo con partidas dentro, para poder fotografiar el cronicón.**
 *
 * Hace falta por lo mismo que `?crossroad=1` y `?raid=`: el índice de valles
 * acabados sólo tiene algo que enseñar cuando alguien ha acabado varios, y eso
 * son horas de reloj. Se juegan de verdad —`foundGame` + `run` con la política
 * de referencia— y se les pone el final a mano, uno de cada clase, porque las
 * cuatro lápidas son cuatro capitulares distintas y esperar a que un valle se
 * muera de cada manera es esperar días.
 *
 * Devuelve las partidas archivadas tal como las guardaría el juego
 * (`archiveGame`), así que lo que se fotografía es lo que se vería jugando.
 */
export function archivedGames(count: number): ArchivedGame[] {
  const CAUSES: readonly EndCause[] = ['stormed', 'abandoned', 'extinction', 'dispersed'];
  const games: ArchivedGame[] = [];
  for (let n = 0; n < Math.max(0, count); n += 1) {
    const state = foundGame(7 + n * 13);
    // Años distintos a propósito: un índice en el que todos los valles duran lo
    // mismo no enseña lo que el índice existe para enseñar.
    openAtYear(state, 12 + n * 9);
    if (state.ended === null) {
      state.ended = { tick: state.tick, cause: CAUSES[n % CAUSES.length]!, lastId: null };
    }
    games.push(archiveGame(state));
  }
  return games;
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

/**
 * P-1b.1 · El mismo avance para el menú, con pausas sólo entre tramos.
 * El estado y la política son idénticos a `openAtYear`; el navegador puede
 * pintar el aviso y atender eventos antes de ejecutar el tramo siguiente.
 */
export async function openAtYearCooperative(
  state: GameState,
  year: number,
  yieldToBrowser: () => Promise<void> = () => new Promise((done) => setTimeout(done, 0)),
): Promise<void> {
  const weeks = Math.max(0, Math.floor(year) - 1) * TIME.WEEKS_PER_YEAR;
  const batchWeeks = 8;
  for (let advanced = 0; advanced < weeks && state.ended === null; advanced += batchWeeks) {
    run(state, Math.min(batchWeeks, weeks - advanced), 'prudent', CATALOG);
    if (advanced + batchWeeks < weeks && state.ended === null) await yieldToBrowser();
  }
}

export function mountDebug(root: HTMLElement, request: DebugRequest): GameState {
  const state = stateAt(request);
  // El 2D se pide aquí y no arriba: así no viaja en el paquete del juego
  // (`debug-canvas.ts`). `data-debug-ready` llega cuando ya está pintado.
  void import('./debug-canvas').then(({ diagnosticCanvas, auditSprites }) => {
    diagnosticCanvas(root, state, request);
    document.documentElement.dataset.debugReady = 'true';
    document.documentElement.dataset.spriteAudit = JSON.stringify(auditSprites());
  });
  return state;
}
