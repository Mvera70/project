// El valle más vivo (25 sep 2026) · Los que vienen por el camino.
//
// El buhonero, el forastero de paso y las tres visitas de M-0 —el factor, el
// tratante de ganado y el de la sal— **existían sólo en la crónica**: el motor
// los sorteaba (`world/fate.ts`), la crónica los contaba y la plaza seguía
// vacía. Esto les da cuerpo: la semana que el motor dice que vinieron, uno o
// dos llegan por la misma entrada exterior que usa la partida del valle vecino
// (`approachOf`, `raiders.ts`), andan hasta la plaza, se quedan allí hasta
// media tarde y se van por donde vinieron.
//
// Como la partida, **navegado y no guionizado** (IA-5): `pathTo` y `integrate`,
// los mismos con los que anda cualquiera en esta capa, así que nunca atraviesan
// una casa. Y como todo en `life/`, sólo enseña: lo que traían ya lo decidió el
// motor, y nada de aquí escribe en `GameState` ni tira dados. La variación sale
// de un hash de la semilla de la jornada.

import { hash32 } from '@engine/rng';
import type { GameState, HappeningId } from '@engine/state';
import { roadMouths, valleyRoadCells } from '@engine/world/valley-road';
import { FOUNDING_CROSSROAD } from '@engine/crossroads/catalog/hamlet';
import { ford } from '@engine/sim';
import type { Animal } from '@derive/animals';
import { NOTICE_BOARD } from '@derive/notice-board';
import type { Body, Point, Solid, Terrain } from './body';
import { blockedAt, fitsCircle, integrate, turnTo } from './body';
import { LIFE_STEP } from './clock';
import { clearBetween, pathTo } from './navigate';
import type { Waypoint } from './navigate';
import { approachOf } from './raiders';
import { nearestReachable, reachableFrom } from './terrain';
import { gorgeRoadPaths } from '../world/mountains';

export type VisitorPhase = 'waiting' | 'coming' | 'staying' | 'leaving' | 'gone';

export interface Visitor {
  readonly body: Body;
  /** Lugar dentro de su grupo; el tercero de la familia que huye es menor. */
  readonly member?: number;
  /** El suceso que lo trajo: el buhonero no es el forastero. */
  readonly kind: HappeningId;
  /** Por dónde entra y por dónde se va. */
  readonly road: Point;
  /** Su sitio en la plaza, y el centro al que mira mientras está. RD-1: el del vado cambia de sitio al contestarle. */
  spot: Point;
  /** RD-1 · el forastero con el que se funda el valle, que espera en el vado. */
  readonly scene?: 'ford';
  readonly centre: Point;
  phase: VisitorPhase;
  route: Waypoint[];
  /** Hora de llegar y de irse, en fase de jornada: cada uno la suya. La de irse se retrasa si le están llevando lo comprado (`stayForGoods`). */
  readonly arrive: number;
  leave: number;
  /** Paso a partir del cual el tramo se da por hecho aunque no se haya llegado (E.7). */
  deadline: number;
  /** Lo andado, para la zancada del clip. */
  travelled: number;
  /** Pasos seguidos sin avanzar: al pasar de `STALL_STEPS`, se rehace la ruta. */
  stalled: number;
  /** Si trae género: el que viene a vender, sí; el de paso, no. */
  readonly pack: boolean;
  /** Si viene para quedarse (la familia que huye): no se va al acabar el día. */
  readonly stays: boolean;
  /**
   * El animal que trae, y que va detrás de él por donde ha pisado: la **mula**
   * del que viene a vender, con la carga a lomos (Vera, «mula de buhonero
   * mejor», frente a la carretilla), o la **vaca** que el tratante viene a
   * vender. `null` para el forastero y para el segundo de una pareja.
   */
  readonly beast: { readonly kind: 'mule' | 'cow'; x: number; z: number; moving: boolean; home?: boolean } | null;
  /** Por dónde ha pisado, para que la mula lo siga sin atajar por una casa. */
  readonly trail: Point[];
  /**
   * Si viene a cerrar el trato que el jugador aceptó (`visitsToday`). RD-4:
   * cambia a media jornada si el jugador toca su señal mientras espera.
   */
  dealt: boolean;
  /** Si ya lleva lo que compró a lomos de la mula: se carga al irse. */
  loaded: boolean;
  /** El pasto adonde se lleva la vaca vendida, y la ruta que sigue hasta él. */
  readonly pasture: Point;
  beastRoute: Waypoint[] | null;
  /**
   * La senda de la garganta que le queda por andar (2 oct 2026): al venir, de
   * donde salió hasta la boca; al irse, de la boca a donde salió. Se anda sin
   * navegar —fuera del mapa no hay rejilla, y en la garganta la marisma corta
   * la orilla—: es la senda misma, y por ella no anda nadie más.
   */
  lane: Point[];
  /** La senda al revés, para irse por donde vino; vacía si no vino por ella o si ya la ha tomado. */
  exit: Point[];
}

/**
 * Los sucesos que traen a alguien por el camino, y cuántos días de la semana se
 * quedan. TUNE: los que vienen a vender, tres días —un mercadillo, que es lo
 * que tarda en correr la voz y en que se acerque toda la aldea—; el forastero,
 * uno, porque está de paso. A ×1 un día escénico son dos minutos, así que tres
 * días son seis minutos de plaza con alguien nuevo en ella.
 */
const VISITS: Readonly<Partial<Record<HappeningId, { days: number; people: number; pack: boolean; stays?: boolean }>>> = {
  pedlar: { days: 3, people: 1, pack: true },
  factor_visit: { days: 3, people: 2, pack: true },
  drover_visit: { days: 3, people: 2, pack: false },
  salt_visit: { days: 3, people: 1, pack: true },
  stranger_passes: { days: 1, people: 1, pack: false },
  // Más gente por el camino (28 sep 2026): de paso, un día; el calderero
  // trae su mula con la piedra de afilar. Y **la familia que huye no se va**:
  // entra por el camino y se queda en la plaza hasta la noche (`stays`); al
  // día siguiente ya son vecinos, con su casa (`arrivingToday`).
  minstrel: { days: 1, people: 1, pack: false },
  pilgrims: { days: 1, people: 2, pack: false },
  tinker: { days: 1, people: 1, pack: true },
  wise_woman: { days: 1, people: 1, pack: false },
  refugees: { days: 1, people: 3, pack: false, stays: true },
};

/**
 * Los vecinos nuevos que hoy todavía son visitantes: la familia que huye, el
 * día que llega. `village.ts` no les da cuerpo de vecino ese día, porque ya
 * lo tienen de visitante entrando por el camino.
 */
export function arrivingToday(state: GameState, day: number, daysPerWeek: number): ReadonlySet<number> {
  const out = new Set<number>();
  if (day - state.tick * daysPerWeek !== 0) return out;
  for (const happening of state.happenings) {
    if (happening.tick !== state.tick || VISITS[happening.id]?.stays !== true) continue;
    for (const id of happening.who) out.add(id);
  }
  return out;
}

/**
 * Cuándo se ponen en camino y cuándo se van, en fase de jornada. TUNE: salen al
 * alba (0,14) porque el camino desde la entrada exterior es largo —medido en
 * las semillas 7, 23 y 41, de 1 200 a 350 pasos de 3 600, o sea hasta un tercio
 * de la jornada—, así que llegan a la plaza entre media mañana y mediodía, que
 * es cuando más gente hay (`OFFERS.meal`, 0,42–0,52). Se van a media tarde
 * (0,6, las tres), antes de la hoguera, para volver con luz.
 */
const ARRIVE = 0.14;
/** Lo más pronto que sale quien viene de lejos, en fracción de jornada: con luz. */
const EARLIEST = 0.07;
/** Lo que dura la jornada escénica, en segundos (`STEPS_PER_DAY · LIFE_STEP`). */
const DAY_SECONDS = 120;
const LEAVE = 0.6;
const JITTER = 0.05;
/**
 * Lo que se queda como mínimo el que compró desde que la aldea sale a llevarle
 * lo suyo, y lo más tarde que sale de la plaza, para volver con luz. Por el
 * camino del valle se llega más tarde (semilla 7: a 0,36) y con la hora fija
 * de irse el bulto llegaba a la plaza a 0,64 con el buhonero ya en el camino:
 * nadie pagó. Ir y venir de la leñera con la carga son 0,27 de jornada,
 * medido en tres semillas.
 */
const STAY_FOR_GOODS = 0.3;
const LEAVE_LATEST = 0.7;

/**
 * **Por la senda de la garganta** (2 oct 2026; Vera: «no sé cómo llegan las
 * visitas al valle»). Quien viene de fuera baja por la senda que sale del valle
 * (`gorgeRoadPaths`), entra por la boca y sigue el camino pintado hasta la
 * plaza. El camino entero no cabe en una jornada —de la boca a la plaza hay de
 * 39 a 71 celdas, medido en ocho semillas, y la garganta añade otras 15 a 25—,
 * así que cada uno sale **lo más lejos que le deje llegar a su hora**: de la
 * senda si le da tiempo, del camino pintado si no. TUNE: en la plaza a 0,32 y
 * hasta 0,37 —lo de antes, medido de 0,29 a 0,36— para que el trato tenga su
 * tarde; y sale de noche si hace falta (0), como quien va a un mercado.
 */
const ARRIVE_BY = 0.32;
const SET_OFF = 0;

/** El vendedor que compró espera a que le lleven lo suyo, hasta donde da la luz. */
export function stayForGoods(visitor: Visitor, phase: number): void {
  visitor.leave = Math.min(LEAVE_LATEST, Math.max(visitor.leave, phase + STAY_FOR_GOODS));
}
/**
 * Lo que anda un visitante, en celdas por segundo. TUNE: a buen paso, el de
 * quien viene de camino y con hora —el de la partida, y dentro de lo que anda
 * un vecino, de 1,05 a 1,65—. Era 1,1, sin prisa; desde que bajan por la senda
 * de la garganta (2 oct 2026), con 1,1 sólo le daba tiempo a uno de cada doce
 * valles, con 1,3 a siete y con 1,4 a nueve.
 */
const VISITOR_PACE = 1.4;
const VISITOR_RADIUS = 0.32;
/** Identificadores negativos y lejos de la partida (−9 000) y de la cabaña (−10 000). */
const VISITOR_ID_BASE = 8_500;
/**
 * Dónde se pone el que monta puesto: a tres celdas del centro, y el puesto a
 * medio camino hacia él (2,45), fuera de la fuente (radio 0,4).
 */
const STALL_RADIUS = 3;
/**
 * Los ángulos ocupados de la plaza, en radianes desde +X hacia +Z: la hoguera
 * (`effects/hearth.ts`, a +1,8/+1,1 del centro) y los cuatro postes de la
 * fiesta (`effects/festoon.ts`, a 45° + k·90°). Se copian aquí porque la capa
 * de vida no importa del render; si se mueven allí, se mueven aquí.
 */
const PLAZA_TAKEN = [Math.atan2(1.1, 1.8), ...[1, 3, 5, 7].map((k) => (k * Math.PI) / 4), NOTICE_BOARD.ANGLE];
const TAKEN_GAP = 0.4;
function stallAngle(wanted: number): number {
  for (let k = 0; k < 16; k += 1) {
    const angle = wanted + k * 0.39;
    const clear = PLAZA_TAKEN.every((taken) => Math.abs(Math.atan2(Math.sin(angle - taken), Math.cos(angle - taken))) > TAKEN_GAP);
    if (clear) return angle;
  }
  return wanted;
}

/** Cuántas entradas se prueban antes de renunciar a que venga. */
const ENTRY_TRIES = 12;
/** Holgura de un tramo, en pasos, sobre el doble de lo que se tarda en línea recta. */
const DEADLINE_SLACK = 240;

/** Una visita de hoy, y si viene a cerrar el trato que el jugador aceptó. */
export interface VisitToday {
  readonly kind: HappeningId;
  readonly dealt: boolean;
  /**
   * RD-1 · el forastero del vado: `arriving` baja por el camino hoy, `waiting`
   * ya está en el vado desde que abre la jornada, `in` ya lo acogieron y
   * espera en la plaza a que cierre la semana.
   */
  readonly ford?: 'arriving' | 'waiting' | 'in';
}

/**
 * RD-1 (Vera, 30 sep 2026) · **El día y la hora en que el forastero del vado
 * llega.** La jornada escénica dura dos minutos y la semana 0 empieza a la
 * fase 0,28 del día 0 (`DAY_START_PHASE`): el día 2 empieza en el minuto 3,4, y
 * saliendo a la fase 0,4 del camino llega al vado hacia el minuto 4,5–5, que
 * es lo que Vera pidió (entre el 4 y el 6). TUNE, medido con
 * `artifacts/rd0/fordscan.mjs`.
 */
const FORD_DAY = 2;
const FORD_ARRIVE = 0.4;

/**
 * Qué hace hoy el forastero del vado, o `null` si hoy no está. Mientras la
 * pregunta con la que se funda el valle siga sin contestar, espera en el vado;
 * `answer` es lo que el jugador ya contestó y el motor aún no ha apuntado
 * (la decisión espera a su semana, §2.60).
 */
export function fordToday(
  state: GameState, day: number, daysPerWeek: number, answer: 'in' | 'out' | null = null,
): 'arriving' | 'waiting' | 'in' | null {
  if (state.crossroad?.templateId !== FOUNDING_CROSSROAD.id) return null;
  if (answer === 'out') return null;
  if (answer === 'in') return 'in';
  const dayOfWeek = day - state.tick * daysPerWeek;
  if (state.tick === state.crossroad.posedTick && dayOfWeek < FORD_DAY) return null;
  return state.tick === state.crossroad.posedTick && dayOfWeek === FORD_DAY ? 'arriving' : 'waiting';
}

/**
 * RD-4 (Vera, 1 oct 2026) · **El trato que se cerró con él delante**: el
 * jugador tocó la señal del que espera en la plaza la semana `tick`. El motor
 * lo apunta al cerrar esa semana (§2.60), pero la aldea ya le ha llevado lo
 * suyo: los días que le quedan en la plaza son de trato hecho, y la semana
 * siguiente no vuelve a cerrarlo.
 */
export interface LiveDeal {
  readonly kind: HappeningId;
  readonly tick: number;
}

/**
 * Quién viene hoy por el camino: el suceso de esta semana, si trae a alguien y
 * hoy es uno de sus días; y **el que vuelve a cerrar el trato**.
 *
 * El motor apunta el trato aceptado la semana siguiente a la visita (el acto
 * del jugador se resuelve al pasar la semana, `sim.ts` paso 1b), así que el
 * visitante de la semana del suceso nunca lo vería cerrado. La semana en que la
 * crónica dice `offer.<visita>.taken`, el primer día, vuelve un día a hacer el
 * cambio: se lleva la madera o el grano, deja la sal o la vaca. Es lo que
 * haría quien esperaba respuesta.
 */
export function visitsToday(
  state: GameState, day: number, daysPerWeek: number, fordAnswer: 'in' | 'out' | null = null,
  liveDeal: LiveDeal | null = null,
): VisitToday[] {
  const out: VisitToday[] = [];
  const dayOfWeek = day - state.tick * daysPerWeek;
  if (dayOfWeek < 0) return out;
  const atFord = fordToday(state, day, daysPerWeek, fordAnswer);
  if (atFord !== null) out.push({ kind: 'stranger_passes', dealt: false, ford: atFord });
  for (const happening of state.happenings) {
    if (happening.tick !== state.tick) continue;
    const visit = VISITS[happening.id];
    if (visit === undefined || dayOfWeek >= visit.days) continue;
    out.push({ kind: happening.id, dealt: liveDeal?.kind === happening.id && liveDeal.tick === state.tick });
  }
  if (dayOfWeek === 0) {
    for (const entry of state.chronicle) {
      if (entry.tick !== state.tick || !entry.templateKey.startsWith('offer.') || !entry.templateKey.endsWith('.taken')) continue;
      const kind = entry.templateKey.slice('offer.'.length, -'.taken'.length) as HappeningId;
      // RD-4 · el trato ya se cerró delante de él: no vuelve a cerrarlo.
      if (liveDeal?.kind === kind && liveDeal.tick === state.tick - 1) continue;
      if (VISITS[kind] !== undefined && !out.some((visit) => visit.kind === kind)) out.push({ kind, dealt: true });
    }
  }
  return out;
}

function unit(seed: number, what: string): number {
  return hash32(seed, `visitor:${what}`) / 0x1_0000_0000;
}

function deadlineFor(from: Point, to: Point, step: number, route: readonly Point[] = []): number {
  // Lo que hay que andar es la ruta, no la recta: por el camino del valle se
  // da un rodeo, y con la recta el plazo vencía antes de llegar y el buhonero
  // se plantaba a medio camino (cazado por `life-trade.test.ts`, 28 sep 2026).
  let along = 0;
  let last = from;
  for (const point of route) { along += Math.hypot(point.x - last.x, point.z - last.z); last = point; }
  along += Math.hypot(to.x - last.x, to.z - last.z);
  const far = Math.max(along, Math.hypot(to.x - from.x, to.z - from.z));
  return step + Math.round(((far / VISITOR_PACE) * 2) / LIFE_STEP) + DEADLINE_SLACK;
}

/**
 * Monta a los de hoy. Lista vacía si nadie viene o si no hay por dónde: un
 * valle sin entrada exterior no ve llegar a nadie, y no es un error.
 */
export function createVisitors(
  state: GameState, land: Terrain, heart: Point, plaza: Point, seed: number, visits: readonly VisitToday[],
  /** Adónde va la vaca vendida: el pasto de la aldea. */
  pasture: Point = heart,
): Visitor[] {
  if (visits.length === 0) return [];
  // **El suelo es el de la aldea, no el de fuera.** La primera versión usaba el
  // de la entrada exterior (`approachOf`), y en la semilla 11 al año 30 esa
  // entrada queda al otro lado del río: el buhonero acabó plantado en la
  // orilla, bajo la lluvia, mirando una plaza a la que no podía llegar. Ahora
  // la entrada es el punto del suelo de la aldea que cae más cerca de la de
  // fuera, pero siempre lejos de la plaza, para que se le vea venir.
  const shore = reachableFrom(land, heart);
  const road = approachOf(state, land, heart);
  // **Por el camino del valle** (Vera, 28 sep 2026): la entrada es la celda
  // del camino más lejana de la plaza que sigue siendo suelo de la aldea, y
  // la ruta va por el camino hasta cerca de la plaza. Si el valle no tiene
  // camino que llegue, la entrada de siempre.
  const along = roadInto(state, land, shore, plaza);
  const entry = along?.entry ?? entryOf(land, shore, plaza, road);
  if (entry === null) return [];
  const way = gorgeWay(state, plaza);
  const onShore = (p: Point): boolean => shore[Math.floor(p.z) * land.width + Math.floor(p.x)] === 1;
  const visitors: Visitor[] = [];
  for (const { kind, dealt, ford: atFord } of visits) {
    if (atFord !== undefined) {
      const stranger = fordStranger(state, land, shore, plaza, along, entry, seed, visitors.length, atFord);
      if (stranger !== null) visitors.push(stranger);
      continue;
    }
    const visit = VISITS[kind]!;
    for (let n = 0; n < visit.people; n += 1) {
      const index = visitors.length;
      // El que monta puesto (`effects/stalls.ts`) se pone más lejos del centro,
      // para que el tenderete no caiga encima de la fuente, y en un ángulo que
      // no pise la hoguera ni los postes de la fiesta.
      const stall = n === 0 && visit.pack;
      const radius = stall ? STALL_RADIUS : 1.4;
      const angle = stall ? stallAngle(unit(seed, `${index}:angle`) * Math.PI * 2)
        : unit(seed, `${index}:angle`) * Math.PI * 2;
      const spot = nearestReachable(land, shore, {
        x: plaza.x + Math.cos(angle) * radius,
        z: plaza.z + Math.sin(angle) * radius,
      }, VISITOR_RADIUS);
      if (spot === null || Math.hypot(spot.x - plaza.x, spot.z - plaza.z) > radius + 1.6) continue;
      // **La entrada se elige probando a llegar, no mirando el mapa**, como el
      // puesto de la partida (`createRaiders`). Lo enseñó la primera toma del
      // navegador, semilla 11 al año 30: la entrada caía en el bosque, A* no
      // encontraba paso entre los troncos del juego de verdad —que la prueba
      // no tiene— y el buhonero se quedó plantado entre los árboles. Se prueban
      // puntos alrededor de la entrada, de dentro afuera, y se coge el primero
      // desde el que la plaza se alcanza andando.
      let from: Point | null = null;
      let route: Waypoint[] | null = null;
      // Por la senda de la garganta y el camino pintado, saliendo lo más lejos
      // que le deje llegar a su hora (`setOff`), y de ahí al puesto.
      let lane: Point[] = [];
      let exit: Point[] = [];
      let gate: Point | null = null;
      let departure: number | null = null;
      if (way !== null) {
        const last = way.road[way.road.length - 1]!;
        const tail = pathTo(land, last, spot);
        if (tail !== null) {
          const target = ARRIVE_BY + unit(seed, `${index}:arrive`) * JITTER;
          const budget = (target - SET_OFF) * DAY_SECONDS * VISITOR_PACE - lengthOf([last, ...tail]);
          const plan = setOff(way, budget, onShore);
          const fromLane = plan.gorge;
          const start = fromLane ? plan.from : nearestReachable(land, shore, plan.from, VISITOR_RADIUS);
          if (start !== null) {
            from = start;
            route = fromLane ? [...plan.road, ...tail] : [...plan.road.slice(1), ...tail];
            lane = plan.lane;
            // Se va por donde vino: hasta la boca andando, y senda arriba.
            if (fromLane) { gate = way.road[0]!; exit = [...lane].reverse().concat({ x: start.x, z: start.z }); }
            departure = Math.max(SET_OFF, target - lengthOf([start, ...lane, ...route]) / VISITOR_PACE / DAY_SECONDS);
          }
        }
      }
      if (route === null && along !== null) {
        // Por el camino hasta el último tramo, y de ahí al puesto.
        const start = nearestReachable(land, shore, along.entry, VISITOR_RADIUS);
        const last = along.road[along.road.length - 1]!;
        const tail = start === null ? null : pathTo(land, last, spot);
        if (start !== null && tail !== null) { from = start; route = [...along.road, ...tail]; }
      }
      for (let tries = 0; tries < ENTRY_TRIES && route === null; tries += 1) {
        const turn = unit(seed, `${index}:turn`) * Math.PI * 2 + tries * 2.4;
        const far = tries === 0 ? 0 : 1 + tries * 0.8;
        from = nearestReachable(land, shore, {
          x: entry.x + Math.cos(turn) * far,
          z: entry.z + Math.sin(turn) * far,
        }, VISITOR_RADIUS);
        if (from !== null) route = pathTo(land, from, spot);
      }
      if (from === null || route === null) continue;
      // Quien viene por el camino da un rodeo: sale antes, lo que tarde de más
      // respecto a la recta, para estar en la plaza a la hora de siempre. Con
      // la hora fija de salida llegaba a 0,41 de la jornada y las cargas del
      // trato, que van por hora, ya no lo encontraban (28 sep 2026).
      let walked = 0;
      let last: Point = from;
      for (const point of route) { walked += Math.hypot(point.x - last.x, point.z - last.z); last = point; }
      const straight = Math.hypot(spot.x - from.x, spot.z - from.z);
      const early = Math.max(0, (walked - straight) / VISITOR_PACE / DAY_SECONDS);
      visitors.push({
        body: {
          id: -(VISITOR_ID_BASE + index), x: from.x, z: from.z,
          vx: 0, vz: 0, facing: 0, radius: VISITOR_RADIUS, pace: VISITOR_PACE,
        },
        kind,
        member: n,
        road: gate ?? from,
        spot,
        centre: plaza,
        phase: 'waiting',
        route,
        arrive: departure ?? Math.max(EARLIEST, ARRIVE + unit(seed, `${index}:arrive`) * JITTER - early),
        leave: LEAVE + unit(seed, `${index}:leave`) * JITTER,
        deadline: 0,
        travelled: 0,
        stalled: 0,
        pack: visit.pack,
        stays: visit.stays === true,
        beast: n !== 0 ? null
          : visit.pack ? { kind: 'mule', x: from.x, z: from.z, moving: false }
            : kind === 'drover_visit' ? { kind: 'cow', x: from.x, z: from.z, moving: false } : null,
        trail: [{ x: from.x, z: from.z }],
        dealt,
        loaded: false,
        pasture,
        beastRoute: null,
        lane,
        exit,
      });
    }
  }
  return visitors;
}

/**
 * Lo lejos de la plaza que aparece, en celdas. TUNE: de 12 a 26, lo mismo que
 * la partida (`MIN_ENTRY`/`MAX_ENTRY`, `raiders.ts`) con dos de margen: fuera
 * del corro de casas, y dentro de lo que se mira.
 */
const ENTRY_NEAR = 12;
const ENTRY_FAR = 26;

/**
 * El camino del valle como lo pisa un visitante: la entrada (la celda del
 * camino más lejana de la plaza, dentro de lo que se mira, que sea suelo de la
 * aldea) y los puntos del camino desde ahí hasta el último que sigue lejos de
 * la plaza. Se toma la boca más cercana a la entrada de fuera de los asaltos,
 * que es por donde el valle da al mundo.
 */
export function roadInto(
  state: GameState, land: Terrain, shore: Uint8Array, plaza: Point,
): { entry: Point; road: Waypoint[] } | null {
  const routes = valleyRoadCells(state.map, state.terrainSeed, state.plaza);
  let best: { entry: Point; road: Waypoint[] } | null = null;
  for (const cells of routes) {
    const points = cells.map((cell) => ({ x: cell % state.map.width + 0.5, z: Math.floor(cell / state.map.width) + 0.5 }));
    const onShore = (p: Point): boolean => shore[Math.floor(p.z) * land.width + Math.floor(p.x)] === 1;
    // El final: el último punto del camino que sigue a más de tres celdas de
    // la plaza (de ahí al puesto va por su cuenta).
    let stop = -1;
    for (let i = 0; i < points.length; i += 1) {
      if (Math.hypot(points[i]!.x - plaza.x, points[i]!.z - plaza.z) <= 3) break;
      stop = i;
    }
    if (stop < 3) continue;
    // La entrada: hacia atrás desde el final, **lo que se anda por el camino**
    // —no la recta— hasta `ENTRY_FAR`, y todo suelo de la aldea. Medido por la
    // recta, en la semilla 23 el camino serpenteaba cincuenta celdas y el
    // buhonero llegaba a 0,47 de la jornada, sin tiempo para el trato.
    let start = stop;
    let walked = 0;
    for (let i = stop; i > 0; i -= 1) {
      const step = Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.z - points[i - 1]!.z);
      if (walked + step > ENTRY_FAR || !onShore(points[i - 1]!)) break;
      walked += step;
      start = i - 1;
    }
    if (stop - start < 3 || Math.hypot(points[start]!.x - plaza.x, points[start]!.z - plaza.z) < ENTRY_NEAR * 0.5) continue;
    const road = points.slice(start, stop + 1);
    if (best === null || road.length > best.road.length) best = { entry: points[start]!, road };
  }
  return best;
}

/**
 * El camino de fuera a la plaza: la senda de la garganta, **de fuera a la
 * boca** (`lane`, sin la boca), y el camino pintado de la boca a la plaza
 * (`road`, hasta tres celdas antes, como `roadInto`). Por la garganta cuyo
 * camino pintado es más corto: cada visita viene por la entrada más cercana.
 */
export function gorgeWay(state: GameState, plaza: Point): { lane: Point[]; road: Waypoint[] } | null {
  const { map, terrainSeed } = state;
  const mouths = roadMouths(map, terrainSeed);
  const paths = gorgeRoadPaths(map, terrainSeed);
  let best: { lane: Point[]; road: Waypoint[]; length: number } | null = null;
  for (const cells of valleyRoadCells(map, terrainSeed, state.plaza)) {
    const mouth = mouths.find((one) => one.cell === cells[0]);
    if (mouth === undefined) continue;
    const at = { x: mouth.cell % map.width + 0.5, z: Math.floor(mouth.cell / map.width) + 0.5 };
    const path = paths.find((one) => one.length > 1 && Math.hypot(one[0]!.x - at.x, one[0]!.z - at.z) < 0.5);
    if (path === undefined) continue;
    const points = cells.map((cell) => ({ x: cell % map.width + 0.5, z: Math.floor(cell / map.width) + 0.5 }));
    let stop = -1;
    for (let i = 0; i < points.length; i += 1) {
      if (Math.hypot(points[i]!.x - plaza.x, points[i]!.z - plaza.z) <= 3) break;
      stop = i;
    }
    if (stop < 1) continue;
    const road = points.slice(0, stop + 1);
    const length = lengthOf(road);
    if (best === null || length < best.length) best = { lane: path.slice(1).reverse(), road, length };
  }
  return best === null ? null : { lane: best.lane, road: best.road };
}

/** Lo que mide una línea de puntos. */
function lengthOf(points: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.z - points[i - 1]!.z);
  return total;
}

/**
 * Dónde se pone en camino quien tiene `budget` celdas de andar hasta el final
 * del camino pintado: en la senda de la garganta si le alcanza, y si no en el
 * camino pintado, hacia atrás desde su final, en el primer punto que sea suelo
 * de la aldea.
 */
function setOff(
  way: { lane: readonly Point[]; road: readonly Waypoint[] }, budget: number, onShore: (p: Point) => boolean,
): { from: Point; lane: Point[]; road: Waypoint[]; gorge: boolean } {
  const roadLength = lengthOf(way.road);
  if (budget >= roadLength) {
    // Desde la boca hacia fuera por la senda, lo que sobre.
    let left = budget - roadLength;
    const lane: Point[] = [];
    let at: Point = way.road[0]!;
    for (let i = way.lane.length - 1; i >= 0 && left > 0; i -= 1) {
      const next = way.lane[i]!;
      const span = Math.hypot(next.x - at.x, next.z - at.z);
      if (span <= left) { lane.unshift(next); left -= span; at = next; continue; }
      const cut = { x: at.x + ((next.x - at.x) / span) * left, z: at.z + ((next.z - at.z) / span) * left };
      lane.unshift(cut);
      left = 0;
    }
    return { from: lane[0] ?? way.road[0]!, lane: lane.slice(1), road: [...way.road], gorge: lane.length > 0 };
  }
  // Hacia atrás por el camino pintado lo que dé el tiempo; y de ahí, al punto
  // de suelo de la aldea más cercano hacia fuera. El camino del motor no mira
  // las casas: cortar en la primera celda tapada dejaba salir al buhonero a
  // cinco celdas de la plaza (semillas 11 y 23, con veinte vecinos).
  let start = way.road.length - 1;
  let walked = 0;
  for (let i = way.road.length - 1; i > 0; i -= 1) {
    const step = Math.hypot(way.road[i]!.x - way.road[i - 1]!.x, way.road[i]!.z - way.road[i - 1]!.z);
    if (walked + step > budget) break;
    walked += step;
    start = i - 1;
  }
  while (start < way.road.length - 1 && !onShore(way.road[start]!)) start += 1;
  return { from: way.road[start]!, lane: [], road: way.road.slice(start), gorge: false };
}

/** Por dónde entra: del suelo de la aldea, lejos de la plaza y lo más cerca posible de la entrada de fuera. */
function entryOf(land: Terrain, shore: Uint8Array, plaza: Point, road: Point | null): Point | null {
  let best: Point | null = null;
  let bestScore = Infinity;
  for (let z = 0; z < land.height; z += 1) {
    for (let x = 0; x < land.width; x += 1) {
      if (shore[z * land.width + x] !== 1) continue;
      const at = { x: x + 0.5, z: z + 0.5 };
      const far = Math.hypot(at.x - plaza.x, at.z - plaza.z);
      if (far < ENTRY_NEAR || far > ENTRY_FAR) continue;
      // Sin entrada de fuera, lo más lejos posible dentro de lo que se mira.
      const score = road === null ? -far : Math.hypot(at.x - road.x, at.z - road.z);
      if (score < bestScore) { bestScore = score; best = at; }
    }
  }
  return best;
}

/**
 * RD-1 · El forastero del vado: baja por el camino del valle, como cualquiera
 * que llega, pero su sitio es **la orilla del vado** (`ford`, la misma que la
 * ficción de §7.3 nombra) y no la plaza, y se queda allí mirando al agua
 * hasta que le contesten. Si ya estaba, abre la jornada en su sitio; si ya lo
 * acogieron, espera en la plaza a que cierre la semana y sea vecino.
 */
function fordStranger(
  state: GameState, land: Terrain, shore: Uint8Array, plaza: Point,
  along: { entry: Point; road: Waypoint[] } | null, entry: Point, seed: number, index: number,
  atFord: NonNullable<VisitToday['ford']>,
): Visitor | null {
  const bank = ford(state);
  const water = { x: bank.x, z: bank.y };
  const spot = atFord === 'in'
    ? nearestReachable(land, shore, { x: plaza.x + 1.6, z: plaza.z + 0.6 }, VISITOR_RADIUS)
    : nearestReachable(land, shore, water, VISITOR_RADIUS);
  if (spot === null) return null;
  let from: Point | null = null;
  let route: Waypoint[] | null = null;
  if (atFord === 'arriving') {
    if (along !== null) {
      const start = nearestReachable(land, shore, along.entry, VISITOR_RADIUS);
      const last = along.road[along.road.length - 1]!;
      const tail = start === null ? null : pathTo(land, last, spot);
      if (start !== null && tail !== null) { from = start; route = [...along.road, ...tail]; }
    }
    if (route === null) {
      from = nearestReachable(land, shore, entry, VISITOR_RADIUS);
      if (from !== null) route = pathTo(land, from, spot);
    }
    if (from === null || route === null) return null;
  }
  const placed = atFord !== 'arriving';
  const at = placed ? spot : from!;
  return {
    body: {
      id: -(VISITOR_ID_BASE + index), x: at.x, z: at.z,
      vx: 0, vz: 0, facing: Math.atan2(water.x - at.x, water.z - at.z), radius: VISITOR_RADIUS, pace: VISITOR_PACE,
    },
    kind: 'stranger_passes',
    scene: 'ford',
    road: from ?? entry,
    spot,
    centre: atFord === 'in' ? plaza : water,
    phase: placed ? 'staying' : 'waiting',
    route: placed ? [] : route!,
    arrive: FORD_ARRIVE + unit(seed, `${index}:arrive`) * JITTER,
    leave: Number.POSITIVE_INFINITY,
    deadline: 0,
    travelled: 0,
    stalled: 0,
    pack: false,
    stays: true,
    beast: null,
    trail: [{ x: at.x, z: at.z }],
    dealt: false,
    loaded: false,
    pasture: plaza,
    beastRoute: null,
    lane: [],
    exit: [],
  };
}

/**
 * RD-1 · Lo que hace el forastero del vado en cuanto el jugador contesta, sin
 * esperar a que el motor lo apunte al cerrar la semana: acogido, sube a la
 * plaza; despedido o echado, vuelve por donde vino.
 */
export function answerFordStranger(visitor: Visitor, land: Terrain, plaza: Point, answer: 'in' | 'out', step: number): void {
  if (visitor.scene !== 'ford' || visitor.phase === 'gone') return;
  if (answer === 'in') {
    const spot = { x: plaza.x + 1.6, z: plaza.z + 0.6 };
    const route = pathTo(land, visitor.body, spot);
    if (route === null) return;
    visitor.spot = spot;
    (visitor as { centre: Point }).centre = plaza;
    visitor.route = route;
    visitor.phase = 'coming';
    visitor.deadline = deadlineFor(visitor.body, spot, step, route);
    return;
  }
  (visitor as { stays: boolean }).stays = false;
  visitor.leave = 0;
  visitor.phase = 'leaving';
  visitor.route = routeOut(land, visitor.body, visitor.road);
  visitor.deadline = deadlineFor(visitor.body, visitor.road, step, visitor.route);
}

/** Si alguno está a la vista: fuera de `waiting` y de `gone`. */
export function visiting(visitor: Visitor): boolean {
  return visitor.phase !== 'waiting' && visitor.phase !== 'gone';
}

/**
 * Un paso de un visitante. Siempre acaba (E.7): cada tramo tiene su plazo, y
 * vencido se da por hecho.
 *
 * `phase` es la hora de la jornada. Quien abre la jornada ya pasada la hora de
 * irse no llega a salir: ese día ya se fue.
 */
export function stepVisitor(visitor: Visitor, land: Terrain, phase: number, step: number): void {
  moveVisitor(visitor, land, phase, step);
  followWithBeast(visitor, land);
}

function moveVisitor(visitor: Visitor, land: Terrain, phase: number, step: number): void {
  const { body } = visitor;
  if (visitor.phase === 'gone') return;
  if (visitor.phase === 'waiting') {
    if (phase >= visitor.leave) { visitor.phase = 'gone'; return; }
    if (phase < visitor.arrive) return;
    visitor.phase = 'coming';
    visitor.deadline = deadlineFor(body, visitor.spot, step, [...visitor.lane, ...visitor.route]);
  }
  // La senda de la garganta, sin navegar: al venir, hasta la boca, y desde ahí
  // el plazo cuenta lo que queda; al irse, hasta donde salió, y se va.
  if (visitor.lane.length > 0 && (visitor.phase === 'coming' || visitor.phase === 'leaving')) {
    walkLane(visitor);
    if (visitor.lane.length > 0) return;
    if (visitor.phase === 'leaving') { visitor.phase = 'gone'; body.vx = 0; body.vz = 0; return; }
    visitor.deadline = deadlineFor(body, visitor.spot, step, visitor.route);
    return;
  }
  if (visitor.phase === 'staying') {
    body.vx = 0;
    body.vz = 0;
    // El que viene a quedarse no vuelve al camino.
    if (visitor.stays || phase < visitor.leave) return;
    visitor.phase = 'leaving';
    visitor.route = routeOut(land, body, visitor.road);
    visitor.deadline = deadlineFor(body, visitor.road, step, visitor.route);
  }

  const goal = visitor.phase === 'coming' ? visitor.spot : visitor.road;
  const gap = Math.hypot(goal.x - body.x, goal.z - body.z);
  // Al puesto se llega **al sitio**, no a dos palmos: el que se quedaba a 0,6
  // se quedaba justo donde luego se monta su puesto, y al irse arrancaba desde
  // una celda sólida, sin ruta, deslizándose por las paredes hasta la noche
  // (salinero de la semilla 7, 28 sep 2026). A la salida del valle basta con
  // estar cerca.
  if (gap < (visitor.phase === 'coming' ? ARRIVE_AT_SPOT : 0.6) || step > visitor.deadline) {
    body.vx = 0;
    body.vz = 0;
    if (visitor.phase === 'coming') {
      visitor.phase = 'staying';
      // Mira hacia el centro de la plaza, que es donde está la aldea.
      body.facing = Math.atan2(visitor.centre.x - body.x, visitor.centre.z - body.z);
    } else if (visitor.exit.length > 0) {
      // En la boca: senda arriba, por donde vino.
      visitor.lane = visitor.exit;
      visitor.exit = [];
    } else {
      visitor.phase = 'gone';
    }
    return;
  }
  // Como anda un vecino (`village.ts`): el punto de la ruta sólo se da por
  // pasado si desde aquí se ve limpio el siguiente, y nunca se pasa de largo.
  // La primera versión lo daba por pasado a media celda y cortaba la esquina:
  // en la semilla 11 al año 30 el buhonero se salía dos décimas de la línea
  // segura y quedaba contra un tronco del bosque, con A* sin salida desde allí.
  const route = visitor.route;
  while (route.length > 1 && Math.hypot(route[0]!.x - body.x, route[0]!.z - body.z) < 0.4
    && clearBetween(land, body, route[1]!, body.radius)) route.shift();
  if (route.length === 1 && Math.hypot(route[0]!.x - body.x, route[0]!.z - body.z) < 0.1) route.shift();
  const to = route[0] ?? goal;
  const span = Math.hypot(to.x - body.x, to.z - body.z) || 1;
  const pace = Math.min(VISITOR_PACE, span / LIFE_STEP);
  body.vx = ((to.x - body.x) / span) * pace;
  body.vz = ((to.z - body.z) / span) * pace;
  turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
  const before = { x: body.x, z: body.z };
  integrate(body, land, LIFE_STEP);
  const moved = Math.hypot(body.x - before.x, body.z - before.z);
  visitor.travelled += moved;
  // **Atascado, se rehace la ruta desde donde está.** Lo enseñó la semilla 23:
  // de vuelta, el último tramo recto hacia la entrada daba contra una esquina y
  // el buhonero se quedó veinte segundos andando contra ella hasta el plazo.
  visitor.stalled = moved < VISITOR_PACE * LIFE_STEP * 0.2 ? visitor.stalled + 1 : 0;
  // Y sin ruta —la que había se acabó o no se encontró— se vuelve a pedir cada
  // medio segundo: deslizarse por una pared a un quinto del paso no cuenta
  // como atasco y no re-rutaba nunca.
  const routeless = route.length === 0 && gap > 1 && step % STALL_STEPS === 0;
  if (visitor.stalled >= STALL_STEPS || routeless) {
    visitor.stalled = 0;
    // Y si rehacer la ruta no basta —en el juego de verdad, semilla 11 al año
    // 30, se quedó encajado entre dos troncos del bosque, solapado con uno, y
    // `integrate` sólo le deja moverse hacia donde se solapa menos—, se le
    // aparta un palmo al primer hueco libre de alrededor. Un palmo no se ve;
    // un buhonero plantado entre los árboles todo el día, sí.
    if (!fitsCircle(land, body.x, body.z, body.radius)) {
      for (let ring = 1; ring <= 3; ring += 1) {
        const free = Array.from({ length: 8 }, (_, k) => ({
          x: body.x + Math.cos((k / 8) * Math.PI * 2) * ring * 0.2,
          z: body.z + Math.sin((k / 8) * Math.PI * 2) * ring * 0.2,
        })).find((at) => fitsCircle(land, at.x, at.z, body.radius));
        if (free !== undefined) { body.x = free.x; body.z = free.z; break; }
      }
    }
    visitor.route = routeOut(land, body, goal);
  }
}

/** Un paso por la senda: derecho al siguiente punto, al paso de visitante. */
function walkLane(visitor: Visitor): void {
  const { body, lane } = visitor;
  const before = { x: body.x, z: body.z };
  let left = VISITOR_PACE * LIFE_STEP;
  while (left > 0 && lane.length > 0) {
    const to = lane[0]!;
    const gap = Math.hypot(to.x - body.x, to.z - body.z);
    if (gap <= left) { body.x = to.x; body.z = to.z; left -= gap; lane.shift(); continue; }
    body.x += ((to.x - body.x) / gap) * left;
    body.z += ((to.z - body.z) / gap) * left;
    left = 0;
  }
  body.vx = (body.x - before.x) / LIFE_STEP;
  body.vz = (body.z - before.z) / LIFE_STEP;
  const moved = Math.hypot(body.x - before.x, body.z - before.z);
  if (moved > 1e-6) turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
  visitor.travelled += moved;
}

/** Pasos sin avanzar antes de rehacer la ruta: medio segundo escénico. */
const STALL_STEPS = Math.round(0.5 / LIFE_STEP);
/** A qué distancia del sitio del puesto se da por llegado. */
const ARRIVE_AT_SPOT = 0.25;

/**
 * La ruta desde donde está el cuerpo; y si desde ahí no hay —la celda la
 * tapa su propio puesto, o un tronco— desde el primer punto libre de
 * alrededor, que se pone delante para salir por él.
 */
function routeOut(land: Terrain, body: Body, goal: Point): Waypoint[] {
  const direct = pathTo(land, { x: body.x, z: body.z }, goal);
  if (direct !== null) return direct;
  for (let ring = 1; ring <= 4; ring += 1) {
    for (let k = 0; k < 8; k += 1) {
      const at = { x: body.x + Math.cos((k / 8) * Math.PI * 2) * ring * 0.3, z: body.z + Math.sin((k / 8) * Math.PI * 2) * ring * 0.3 };
      if (blockedAt(land, at.x, at.z) || !fitsCircle(land, at.x, at.z, body.radius)) continue;
      const rest = pathTo(land, at, goal);
      if (rest !== null) return [at, ...rest];
    }
  }
  return [];
}

/** Lo que va la mula detrás del ramal, en celdas, y lo que anda como mucho. */
const MULE_BEHIND = 1.1;
const MULE_PACE = VISITOR_PACE * 1.3;
const TRAIL_STEP = 0.25;
const TRAIL_KEEP = 16;

function followWithBeast(visitor: Visitor, land: Terrain): void {
  const { beast: mule, trail, body } = visitor;
  if (mule === null) return;
  // **La vaca vendida no se va con él**: cuando el tratante echa a andar de
  // vuelta, ella toma el camino del pasto de la aldea y, al llegar, se une al
  // ganado (que el motor ya cuenta desde que se cerró el trato).
  if (visitor.dealt && mule.kind === 'cow' && (visitor.phase === 'leaving' || visitor.phase === 'gone')) {
    if (mule.home === true) return;
    visitor.beastRoute ??= pathTo(land, mule, visitor.pasture) ?? [{ x: visitor.pasture.x, z: visitor.pasture.z }];
    const next = visitor.beastRoute[0];
    if (next === undefined) { mule.home = true; mule.moving = false; return; }
    const gap = Math.hypot(next.x - mule.x, next.z - mule.z);
    if (gap < 0.3) { visitor.beastRoute.shift(); return; }
    const move = Math.min(gap, MULE_PACE * 0.7 * LIFE_STEP);
    mule.x += ((next.x - mule.x) / gap) * move;
    mule.z += ((next.z - mule.z) / gap) * move;
    mule.moving = true;
    return;
  }
  const last = trail[trail.length - 1]!;
  if (Math.hypot(body.x - last.x, body.z - last.z) > TRAIL_STEP) {
    trail.push({ x: body.x, z: body.z });
    if (trail.length > TRAIL_KEEP) trail.shift();
  }
  // El punto de la huella que queda a un ramal de distancia; si él está quieto
  // y la mula ya llegó, se queda donde está.
  let target: Point | null = null;
  for (let n = trail.length - 1; n >= 0; n -= 1) {
    const point = trail[n]!;
    if (Math.hypot(point.x - body.x, point.z - body.z) >= MULE_BEHIND) { target = point; break; }
  }
  const gap = target === null ? 0 : Math.hypot(target.x - mule.x, target.z - mule.z);
  mule.moving = target !== null && gap > 0.05;
  if (!mule.moving || target === null) return;
  const move = Math.min(gap, MULE_PACE * LIFE_STEP);
  mule.x += ((target.x - mule.x) / gap) * move;
  mule.z += ((target.z - mule.z) / gap) * move;
}

/** La mula o la vaca, como animal para el render, si está a la vista. */
export function beastOf(visitor: Visitor): Animal[] {
  const beast = visitor.beast;
  // La vaca vendida sigue a la vista hasta llegar al pasto, aunque él ya se haya ido.
  const sold = visitor.dealt && beast?.kind === 'cow' && beast.home !== true && visitor.phase !== 'waiting';
  if (beast === null || (!visiting(visitor) && !sold) || beast.home === true) return [];
  return [{ id: MULE_ID_BASE - visitor.body.id - VISITOR_ID_BASE, kind: beast.kind, x: beast.x, y: beast.z,
    action: beast.moving ? 'walk' : undefined }];
}

/** Fuera de los animales del valle (40 000–44 299). */
const MULE_ID_BASE = 44_300;

/** Lo que monta en la plaza: el tenderete, la mesa del factor o los sacos. */
export type StallKind = 'pedlar' | 'factor_visit' | 'salt_visit';

export interface StallSite {
  readonly id: number;
  readonly kind: StallKind;
  readonly x: number;
  readonly z: number;
  /** Hacia dónde da el mostrador: hacia el centro de la plaza. */
  readonly facing: number;
  /** Su huella en el suelo, alineada con los ejes: lo que no se atraviesa. */
  readonly solid: Solid;
  /** Dónde se ponen los que se acercan a mirar: delante del mostrador. */
  readonly front: Point;
}

/**
 * La huella de cada puesto en su marco (x a lo ancho, z hacia la plaza), en
 * celdas: la de las piezas que dibuja `effects/stalls.ts`, con un palmo.
 */
const STALL_FOOTPRINT: Readonly<Record<StallKind, { x: [number, number]; z: [number, number] }>> = {
  pedlar: { x: [-0.4, 0.4], z: [-0.2, 0.18] },
  factor_visit: { x: [-0.28, 0.54], z: [-0.18, 0.17] },
  salt_visit: { x: [-0.27, 0.35], z: [-0.17, 0.12] },
};
/** Lo que se aparta del vendedor hacia la plaza, y lo que se ponen delante los que miran. */
const STALL_AHEAD = 0.55;
const FRONT_AHEAD = 0.65;

function stallKindOf(kind: HappeningId): StallKind | null {
  return kind === 'pedlar' || kind === 'factor_visit' || kind === 'salt_visit' ? kind : null;
}

/**
 * El puesto de un visitante, si lo tiene montado ahora: sólo mientras se queda
 * en la plaza y sólo el que trae la mula. Lo usan el render (lo dibuja) y la
 * jornada (lo hace sólido y abre el sitio para mirar).
 */
export function stallOf(visitor: Visitor): StallSite | null {
  // Montado mientras se queda; y **la sal comprada se queda en la plaza** cuando
  // el salinero se va, que es lo que se ve cambiar de manos.
  const saltLeft = visitor.dealt && visitor.kind === 'salt_visit'
    && (visitor.phase === 'leaving' || visitor.phase === 'gone');
  if (visitor.phase !== 'staying' && !saltLeft) return null;
  return stallSiteOf(visitor);
}

/** Dónde va el puesto de este visitante, esté montado o no; `null` si no monta. */
export function stallSiteOf(visitor: Visitor): StallSite | null {
  const kind = stallKindOf(visitor.kind);
  if (kind === null || visitor.beast?.kind !== 'mule') return null;
  const dx = visitor.centre.x - visitor.spot.x;
  const dz = visitor.centre.z - visitor.spot.z;
  const span = Math.hypot(dx, dz) || 1;
  const ux = dx / span;
  const uz = dz / span;
  const x = visitor.spot.x + ux * STALL_AHEAD;
  const z = visitor.spot.z + uz * STALL_AHEAD;
  const facing = Math.atan2(dx, dz);
  // Las cuatro esquinas de la huella, giradas como gira el dibujo (en Three,
  // girar `facing` en Y lleva el +Z local a (sin, cos)).
  const foot = STALL_FOOTPRINT[kind];
  const cos = Math.cos(facing);
  const sin = Math.sin(facing);
  const corners = foot.x.flatMap((lx) => foot.z.map((lz) => ({ x: x + lx * cos + lz * sin, z: z - lx * sin + lz * cos })));
  const solid: Solid = {
    minX: Math.min(...corners.map((c) => c.x)), maxX: Math.max(...corners.map((c) => c.x)),
    minZ: Math.min(...corners.map((c) => c.z)), maxZ: Math.max(...corners.map((c) => c.z)),
  };
  return { id: visitor.body.id, kind, x, z, facing, solid, front: { x: x + ux * FRONT_AHEAD, z: z + uz * FRONT_AHEAD } };
}
