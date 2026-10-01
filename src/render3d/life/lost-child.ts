// RD-4 (Vera, 1 oct 2026) · **El niño perdido, a la vista.**
//
// El motor dice que un niño se perdió esta semana (`child_lost`, §7.10, con su
// id en `who`) y lo cierra la siguiente (`@engine/world/lost-child`). Esto lo
// enseña sin decidir nada: los dos primeros días de la semana el niño está en
// la linde del bosque más cercana a su casa, quieto, con una señal encima
// (skill `senales-en-el-mapa`). Si el jugador la toca, el adulto libre más
// cercano va a por él desde donde esté (`village.ts`, `searchChild`); cuando
// llega, el niño vuelve andando a su casa. Si nadie la toca, al anochecer del
// segundo día vuelve solo: lo encontró el valle, que es lo que la crónica dirá.
//
// Ese día el niño no tiene cuerpo de vecino (como los que vuelven de una
// expedición, `expeditions.ts`): lleva su `VillagerId` y el render le pone su
// cara (`cast.ts`). Al día siguiente vuelve a ser un vecino más.

import { LIFE, TIME } from '@engine/balance';
import { ageOf } from '@engine/people/villagers';
import { hash32 } from '@engine/rng';
import type { GameState, VillagerId } from '@engine/state';
import { TERRAIN_CODE } from '@engine/state';
import type { Body, Point, Terrain } from './body';
import { integrate, turnTo } from './body';
import { LIFE_STEP } from './clock';
import { clearBetween, pathTo, type Waypoint } from './navigate';
import { doorOf } from './offers';
import { nearestReachable, reachableFrom } from './terrain';

export type LostPhase = 'lost' | 'home' | 'gone';

export interface LostChild {
  readonly villager: VillagerId;
  readonly body: Body;
  phase: LostPhase;
  /** La puerta de su casa, o la plaza. */
  readonly home: Point;
  route: Waypoint[];
  travelled: number;
  /** Quien fue a buscarlo, si el jugador tocó la señal. */
  searcher: VillagerId | null;
  /** Si hoy es el último día perdido: al anochecer vuelve solo. */
  readonly lastDay: boolean;
}

/**
 * TUNE: cuántos días escénicos se queda en la linde si nadie va a por él. Dos
 * días son cuatro minutos a ×1 (`DAY_SECONDS`, 120 s): lo que tarda en verse
 * una señal sin quedarse a mirarla, y menos que la semana de catorce minutos.
 */
export const LOST_DAYS = 2;
/** Al anochecer del último día vuelve solo (fase de jornada). */
const DUSK = 0.8;
/** Hasta dónde busca bosque desde su casa, en celdas, y cuánto se queda fuera de él. */
const FOREST_REACH = 30;
const OUTSIDE = 1.5;
const PACE = 1;
const RADIUS = 0.24;
/** Id de cuerpo del niño perdido: fuera de los rangos de vecinos, visitantes, viajeros y partida. */
const LOST_ID = 61_000_000;

/**
 * El niño que hoy está perdido, o `null`. `found` es el niño que el jugador ya
 * mandó buscar esta semana: a partir de ahí, los días que se rehacen ya no lo
 * dejan en la linde.
 */
export function lostChildToday(
  state: GameState, day: number, found: { readonly villager: VillagerId; readonly tick: number } | null,
): { villager: VillagerId; lastDay: boolean } | null {
  const dow = day - state.tick * TIME.DAYS_PER_WEEK;
  if (dow < 0 || dow >= LOST_DAYS) return null;
  const record = state.happenings.find((h) => h.id === 'child_lost' && h.tick === state.tick);
  const villager = record?.who[0];
  if (villager === undefined) return null;
  if (found !== null && found.villager === villager && found.tick === state.tick) return null;
  const child = state.people.villagers.find((v) => v.id === villager);
  if (child === undefined || child.diedTick !== null || child.leftTick !== null) return null;
  if (ageOf(child, state.tick) >= LIFE.ADULT[0]) return null;
  return { villager, lastDay: dow === LOST_DAYS - 1 };
}

function homeOf(state: GameState, land: Terrain, id: VillagerId, fallback: Point): Point {
  const v = state.people.villagers.find((x) => x.id === id);
  const b = v?.homeId === null || v === undefined ? undefined
    : state.buildings.find((x) => x.id === v.homeId && x.lostTick === null);
  return (b === undefined ? null : doorOf(land, b.x, b.y, b.w, b.h)) ?? fallback;
}

/** Dónde se perdió: a la vista, justo fuera de la linde más cercana a su casa. */
export function createLostChild(
  state: GameState, land: Terrain, heart: Point, today: { villager: VillagerId; lastDay: boolean }, seed: number,
): LostChild | null {
  const home = homeOf(state, land, today.villager, heart);
  const width = state.map.width;
  const hx = Math.floor(home.x), hz = Math.floor(home.z);
  const cells: { x: number; z: number; d: number }[] = [];
  for (let z = Math.max(0, hz - FOREST_REACH); z < Math.min(state.map.height, hz + FOREST_REACH); z += 1) {
    for (let x = Math.max(0, hx - FOREST_REACH); x < Math.min(width, hx + FOREST_REACH); x += 1) {
      if (state.map.terrain[z * width + x] !== TERRAIN_CODE.forest) continue;
      cells.push({ x: x + 0.5, z: z + 0.5, d: Math.hypot(x + 0.5 - home.x, z + 0.5 - home.z) });
    }
  }
  if (cells.length === 0) return null;
  cells.sort((a, b) => a.d - b.d);
  // Entre las seis más cercanas, una por la semilla del día: no siempre el mismo árbol.
  const near = cells[hash32(seed, `lost:${today.villager}`) % Math.min(6, cells.length)]!;
  const away = Math.hypot(near.x - home.x, near.z - home.z) || 1;
  const want = { x: near.x - ((near.x - home.x) / away) * OUTSIDE, z: near.z - ((near.z - home.z) / away) * OUTSIDE };
  const shore = reachableFrom(land, heart);
  const at = nearestReachable(land, shore, want, RADIUS);
  if (at === null) return null;
  return {
    villager: today.villager,
    body: { id: LOST_ID, x: at.x, z: at.z, vx: 0, vz: 0, facing: Math.atan2(near.x - at.x, near.z - at.z), radius: RADIUS, pace: PACE },
    phase: 'lost', home, route: [], travelled: 0, searcher: null, lastDay: today.lastDay,
  };
}

/** Si está a la vista: perdido, o volviendo. */
export function lostInSight(child: LostChild): boolean {
  return child.phase !== 'gone';
}

/** Lo encontraron: vuelve a casa. */
export function bringHome(child: LostChild, land: Terrain): void {
  if (child.phase !== 'lost') return;
  child.phase = 'home';
  child.route = pathTo(land, { x: child.body.x, z: child.body.z }, child.home) ?? [];
}

/** Un paso del niño perdido. Siempre acaba (E.7): al anochecer del último día vuelve solo. */
export function stepLostChild(child: LostChild, land: Terrain, phase: number): void {
  const { body } = child;
  if (child.phase === 'gone') return;
  if (child.phase === 'lost') {
    body.vx = 0; body.vz = 0;
    if (child.lastDay && phase >= DUSK) bringHome(child, land);
    return;
  }
  const gap = Math.hypot(child.home.x - body.x, child.home.z - body.z);
  // Llegó a su puerta, o se hizo de noche del todo: entra en casa.
  if (gap < 0.5 || phase > 0.97) { child.phase = 'gone'; body.vx = 0; body.vz = 0; return; }
  const route = child.route;
  while (route.length > 1 && Math.hypot(route[0]!.x - body.x, route[0]!.z - body.z) < 0.4
    && clearBetween(land, body, route[1]!, body.radius)) route.shift();
  if (route.length === 1 && Math.hypot(route[0]!.x - body.x, route[0]!.z - body.z) < 0.1) route.shift();
  const to = route[0] ?? child.home;
  const span = Math.hypot(to.x - body.x, to.z - body.z) || 1;
  const pace = Math.min(PACE, span / LIFE_STEP);
  body.vx = ((to.x - body.x) / span) * pace;
  body.vz = ((to.z - body.z) / span) * pace;
  turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
  const before = { x: body.x, z: body.z };
  integrate(body, land, LIFE_STEP);
  child.travelled += Math.hypot(body.x - before.x, body.z - before.z);
}
