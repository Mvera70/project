// Las expediciones, a la vista (§7.15, 28 sep 2026).
//
// El motor dice quién se fue, adónde y cómo volvió (`@engine/world/expeditions`);
// esto lo enseña, sin decidir nada. Vera: «algunas se podrían ver físicamente
// en el mapa, y en otras veremos a los elegidos irse por el camino».
//
// - **El día que salen**, cada uno sale andando **desde su casa**: al bosque
//   (setas, hierbas), o por el camino del valle hasta la boca del desfiladero
//   (la lobera, la veta, el mercado). Allí se pierde de vista.
// - **Mientras están en el bosque**, cada día salen de lo hondo, recogen por
//   la linde a la vista y a la tarde vuelven a meterse. A la montaña y al
//   mercado no se les ve: están fuera del valle.
// - **El día que vuelven**, los que vuelven entran por donde se fueron y andan
//   hasta su puerta, con el cesto o el fardo si traen algo. Ese día no tienen
//   cuerpo de vecino en casa (`returningToday`); al siguiente, sí.
//
// Son las mismas personas: el actor lleva su `VillagerId` y el render les pone
// su cara (`cast.ts`). Nadie aparece de la nada donde se le ve (E.3).

import { TIME } from '@engine/balance';
import { hash32 } from '@engine/rng';
import type { GameState, MissionId, VillagerId } from '@engine/state';
import { TERRAIN_CODE } from '@engine/state';
import { missionSpec } from '@engine/world/expeditions';
import type { Body, Point, Terrain } from './body';
import { blockedAt, fitsCircle, integrate, turnTo } from './body';
import { LIFE_STEP } from './clock';
import { clearBetween, pathTo, type Waypoint } from './navigate';
import { doorOf } from './offers';
import { nearestReachable, reachableFrom } from './terrain';
import { roadInto } from './visitors';

export type TravellerPhase = 'waiting' | 'walking' | 'gone';

export interface Traveller {
  readonly villager: VillagerId;
  readonly mission: MissionId;
  readonly body: Body;
  phase: TravellerPhase;
  /** Cuándo echa a andar y cuándo se da por perdido de vista, en fase de jornada. */
  readonly start: number;
  /** Los puntos por los que pasa, en orden; el último es donde desaparece. */
  readonly stops: readonly Point[];
  /** Hasta cuándo se entretiene en cada parada antes de seguir (sólo en el bosque). */
  readonly linger: number;
  next: number;
  route: Waypoint[];
  waitUntil: number;
  stalled: number;
  travelled: number;
  /** Lo que lleva a la vuelta. */
  readonly load: 'bundle' | null;
}

/** Id de cuerpo de los viajeros: fuera del rango de vecinos, visitantes y partida. */
const TRAVELLER_ID_BASE = 60_000_000;
/** TUNE: el paso, como el de un vecino con prisa (1,05–1,65), y el radio del cuerpo. */
const PACE = 1.2;
const RADIUS = 0.32;
/** TUNE: salen a media mañana (0,25) y los del bosque se meten a la tarde (0,72). */
const LEAVE_AT = 0.25;
const GATHER_FROM = 0.3;
const GATHER_UNTIL = 0.72;
const RETURN_AT = 0.3;
/** Lo que se para en cada sitio de la linde, en fase de jornada. */
const LINGER = 0.08;
/** Cuántas paradas en la linde, y hasta dónde busca bosque, en celdas. */
const GATHER_STOPS = 4;
const FOREST_REACH = 30;

function unit(seed: number, what: string): number {
  return hash32(seed, `traveller:${what}`) / 0x1_0000_0000;
}

function dayOfWeek(state: GameState, day: number): number {
  return day - state.tick * TIME.DAYS_PER_WEEK;
}

/** Los que vuelven hoy: no tienen cuerpo de vecino hasta mañana. */
export function returningToday(state: GameState, day: number): ReadonlySet<VillagerId> {
  const out = new Set<VillagerId>();
  if (dayOfWeek(state, day) !== 0) return out;
  for (const trip of state.expeditions) {
    if (trip.end === null || trip.dueTick !== state.tick) continue;
    for (const id of trip.who) if (!trip.dead.includes(id)) out.add(id);
  }
  return out;
}

/**
 * La linde del bosque más cercana a la aldea: unas paradas a la vista, en
 * suelo que se pisa, y un punto hondo detrás por donde se entra y se sale.
 */
function forestPlaces(state: GameState, land: Terrain, shore: Uint8Array, heart: Point, seed: number): { stops: Point[]; deep: Point } | null {
  const width = state.map.width;
  const cells: { x: number; z: number; d: number }[] = [];
  const hx = Math.floor(heart.x), hz = Math.floor(heart.z);
  for (let z = Math.max(0, hz - FOREST_REACH); z < Math.min(state.map.height, hz + FOREST_REACH); z += 1) {
    for (let x = Math.max(0, hx - FOREST_REACH); x < Math.min(width, hx + FOREST_REACH); x += 1) {
      if (state.map.terrain[z * width + x] !== TERRAIN_CODE.forest) continue;
      cells.push({ x: x + 0.5, z: z + 0.5, d: Math.hypot(x + 0.5 - heart.x, z + 0.5 - heart.z) });
    }
  }
  if (cells.length === 0) return null;
  cells.sort((a, b) => a.d - b.d);
  // Entre las diez más cercanas, una por la semilla del día: no siempre el
  // mismo rincón.
  const near = cells[Math.floor(unit(seed, 'patch') * Math.min(10, cells.length))]!;
  const away = Math.hypot(near.x - heart.x, near.z - heart.z) || 1;
  const ux = (near.x - heart.x) / away, uz = (near.z - heart.z) / away;
  const stops: Point[] = [];
  for (let k = 0; k < GATHER_STOPS; k += 1) {
    const side = (unit(seed, `stop:${k}`) - 0.5) * 6;
    const deeper = unit(seed, `deep:${k}`) * 2;
    const at = nearestReachable(land, shore, { x: near.x + ux * deeper - uz * side, z: near.z + uz * deeper + ux * side }, RADIUS);
    if (at !== null) stops.push(at);
  }
  const deep = nearestReachable(land, shore, { x: near.x + ux * 5, z: near.z + uz * 5 }, RADIUS);
  if (stops.length === 0 || deep === null) return null;
  return { stops, deep };
}

/** La puerta de su casa, o la plaza si no tiene. */
function homeOf(state: GameState, land: Terrain, id: VillagerId, fallback: Point): Point {
  const v = state.people.villagers.find((x) => x.id === id);
  const b = v?.homeId === null || v === undefined ? undefined
    : state.buildings.find((x) => x.id === v.homeId && x.lostTick === null);
  return (b === undefined ? null : doorOf(land, b.x, b.y, b.w, b.h)) ?? fallback;
}

/**
 * Los viajeros de hoy. Lista vacía casi siempre: sólo el día que salen, los
 * días que están en el bosque y el día que vuelven.
 */
export function createTravellers(state: GameState, land: Terrain, heart: Point, plaza: Point, day: number, seed: number): Traveller[] {
  if (state.expeditions.length === 0) return [];
  const dow = dayOfWeek(state, day);
  if (dow < 0) return [];
  const shore = reachableFrom(land, heart);
  const road = roadInto(state, land, shore, plaza);
  const forest = forestPlaces(state, land, shore, heart, seed);
  const out: Traveller[] = [];
  const add = (id: VillagerId, mission: MissionId, from: Point, stops: Point[], start: number, linger: number, load: 'bundle' | null): void => {
    const n = out.length;
    const jitter = unit(seed, `start:${id}`) * 0.04;
    out.push({
      villager: id, mission,
      body: { id: TRAVELLER_ID_BASE + n, x: from.x, z: from.z, vx: 0, vz: 0, facing: 0, radius: RADIUS, pace: PACE },
      phase: 'waiting', start: start + jitter, stops, linger, next: 0, route: [], waitUntil: 0, stalled: 0, travelled: 0,
      load,
    });
  };
  for (const trip of state.expeditions) {
    const spec = missionSpec(trip.mission);
    const inForest = spec.where === 'forest' && forest !== null;
    // Adónde se va y por dónde se vuelve: el bosque, o el camino.
    const outward: Point[] | null = inForest ? [...forest!.stops, forest!.deep]
      : road === null ? null : [...road.road].reverse().concat([road.entry]);
    if (outward === null) continue;
    const leaving = trip.sentTick === state.tick && dow === 0 && trip.end === null;
    const returning = trip.end !== null && trip.dueTick === state.tick && dow === 0;
    const gathering = inForest && trip.end === null && !leaving;
    if (!leaving && !returning && !gathering) continue;
    for (const id of trip.who) {
      if (returning && trip.dead.includes(id)) continue;
      const home = homeOf(state, land, id, heart);
      if (leaving) {
        add(id, trip.mission, home, outward, LEAVE_AT, inForest ? LINGER : 0, null);
      } else if (gathering) {
        add(id, trip.mission, forest!.deep, [...forest!.stops, forest!.deep], GATHER_FROM, LINGER, null);
      } else {
        const way = inForest ? forest!.deep : road!.entry;
        const along = inForest ? [forest!.stops[0]!, home] : [...road!.road, home];
        const loaded = trip.end === 'back' || trip.end === 'back_mourning';
        add(id, trip.mission, way, along, RETURN_AT, 0, loaded ? 'bundle' : null);
      }
    }
  }
  return out;
}

/** Si alguno está a la vista. */
export function travelling(t: Traveller): boolean {
  return t.phase === 'walking';
}

/** Pasos sin avanzar antes de rehacer la ruta: medio segundo escénico. */
const STALL_STEPS = Math.round(0.5 / LIFE_STEP);

/**
 * Un paso de un viajero. Siempre acaba (E.7): al pasar `GATHER_UNTIL` + un
 * margen se le da por perdido de vista esté donde esté.
 */
export function stepTraveller(t: Traveller, land: Terrain, phase: number, step: number): void {
  const { body } = t;
  if (t.phase === 'gone') return;
  if (t.phase === 'waiting') {
    if (phase < t.start) return;
    t.phase = 'walking';
    t.route = pathTo(land, { x: body.x, z: body.z }, t.stops[0]!) ?? [];
  }
  if (phase > GATHER_UNTIL + 0.2) { t.phase = 'gone'; body.vx = 0; body.vz = 0; return; }
  const goal = t.stops[t.next]!;
  const gap = Math.hypot(goal.x - body.x, goal.z - body.z);
  if (gap < 0.4) {
    body.vx = 0; body.vz = 0;
    if (t.next === t.stops.length - 1) { t.phase = 'gone'; return; }
    // En la linde se entretiene recogiendo; los del bosque no se van antes de
    // la tarde aunque acaben la vuelta.
    if (t.linger > 0) {
      if (t.waitUntil === 0) { t.waitUntil = phase + t.linger; return; }
      if (phase < t.waitUntil) return;
      if (t.next === t.stops.length - 2 && phase < GATHER_UNTIL) return;
    }
    t.waitUntil = 0;
    t.next += 1;
    t.route = pathTo(land, { x: body.x, z: body.z }, t.stops[t.next]!) ?? [];
    return;
  }
  const route = t.route;
  while (route.length > 1 && Math.hypot(route[0]!.x - body.x, route[0]!.z - body.z) < 0.4
    && clearBetween(land, body, route[1]!, body.radius)) route.shift();
  if (route.length === 1 && Math.hypot(route[0]!.x - body.x, route[0]!.z - body.z) < 0.1) route.shift();
  const to = route[0] ?? goal;
  const span = Math.hypot(to.x - body.x, to.z - body.z) || 1;
  const pace = Math.min(PACE, span / LIFE_STEP);
  body.vx = ((to.x - body.x) / span) * pace;
  body.vz = ((to.z - body.z) / span) * pace;
  turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
  const before = { x: body.x, z: body.z };
  integrate(body, land, LIFE_STEP);
  const moved = Math.hypot(body.x - before.x, body.z - before.z);
  t.travelled += moved;
  t.stalled = moved < PACE * LIFE_STEP * 0.2 ? t.stalled + 1 : 0;
  if (t.stalled >= STALL_STEPS || (route.length === 0 && gap > 1 && step % STALL_STEPS === 0)) {
    t.stalled = 0;
    if (!fitsCircle(land, body.x, body.z, body.radius) || blockedAt(land, body.x, body.z)) {
      for (let ring = 1; ring <= 3; ring += 1) {
        const free = Array.from({ length: 8 }, (_, k) => ({
          x: body.x + Math.cos((k / 8) * Math.PI * 2) * ring * 0.25,
          z: body.z + Math.sin((k / 8) * Math.PI * 2) * ring * 0.25,
        })).find((at) => fitsCircle(land, at.x, at.z, body.radius) && !blockedAt(land, at.x, at.z));
        if (free !== undefined) { body.x = free.x; body.z = free.z; break; }
      }
    }
    t.route = pathTo(land, { x: body.x, z: body.z }, goal) ?? [];
  }
}
