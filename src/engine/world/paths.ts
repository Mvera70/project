// M-15 · Where the village wears the ground. design.md §7.6.
//
// Nobody designs the shape of this village. Every week each worker walks from
// their house to wherever they are working, the cells they cross get a little
// more worn, and a cell worn enough becomes a track. A track is cheaper to
// walk, so the next person takes it too. That feedback is the whole mechanism;
// the thresholds are just where it becomes visible.
//
// Traffic decays half a percent a week, so a route nobody walks any more fades
// out on its own — which is exactly what happens to the track to an abandoned
// field.

import { WORLD } from '../balance';
import { isHere, workforce } from '../people/demography';
import { seasonOf } from '../time';
import { allocateLabour } from '../subsistence/labour';
import { smithyWorking } from '../subsistence/building-counts';
import { TERRAIN_CODE } from '../state';
import type { GameState, PathEvent, Villager, VillagerId } from '../state';
import { route } from './astar';

/**
 * Routes are a cache, never state: they are derivable from the map and the
 * buildings, so saving them would be a second source of truth that could get
 * out of step with the first. Keyed by the state object, so a cloned game —
 * the balance bench clones one at the shock — gets its own entry and neither
 * can see the other's.
 *
 * Cached **per villager**, on where they live, where they are going and what
 * the ground costs. §7.6 says the route holds "hasta que cambie el mapa", and
 * throwing the whole cache away when it does is what that sounds like — but a
 * forest cell falls every few weeks, and rebuilding forty routes each time cost
 * more than everything else in the tick put together. A cell falling changes
 * one cutter's destination; it does not move anybody's house.
 */
interface CachedRoute {
  from: number;
  to: number;
  ground: number;
  cells: number[];
}
const CACHE = new WeakMap<GameState, Map<VillagerId, CachedRoute>>();
const GROUND = new WeakMap<GameState, number>();
const TREES = new WeakMap<GameState, { version: number; cells: number[] }>();
const BANKS = new WeakMap<GameState, { version: number; cells: number[] }>();
const WHERE = new WeakMap<GameState, {
  key: string;
  targets: Map<VillagerId, { from: number; to: number }>;
}>();
const FOREST_VERSION = new WeakMap<GameState, number>();
// Derived like the route cache: cells whose traffic or visible path is nonzero.
// A 36×56 map normally has only a few dozen of them; scanning all 2,016 cells
// twice on every tick dominated long simulations after v2.18 made them survive.
const ACTIVE_TRAFFIC = new WeakMap<GameState, Set<number>>();

function activeTraffic(state: GameState): Set<number> {
  let active = ACTIVE_TRAFFIC.get(state);
  if (active !== undefined && active.size > 0) return active;
  active = new Set<number>();
  for (let i = 0; i < state.map.traffic.length; i += 1) {
    if ((state.map.traffic[i] as number) > 0 || (state.map.path[i] as number) > 0) active.add(i);
  }
  ACTIVE_TRAFFIC.set(state, active);
  return active;
}

/**
 * Say that what the ground costs has changed: a path upgraded, a building went
 * up or came down. Every route is recomputed after this; a changed destination
 * does not need it, because the destination is part of the key.
 */
export function invalidateRoutes(state: GameState): void {
  GROUND.set(state, (GROUND.get(state) ?? 0) + 1);
}

/**
 * Say that the forest moved: a cell was felled, or one grew back.
 *
 * Deliberately **not** a ground change. A felled cell only ever makes walking
 * cheaper, so a route that crossed it is still a route; it is no longer the
 * cheapest one, and it gets re-optimised the next time anything else moves. The
 * cutter whose target actually fell does get a new route immediately, because
 * the destination is part of the cache key. Treating every felled cell as a
 * ground change meant rebuilding forty routes every few weeks for the sake of
 * one of them.
 */
export function invalidateForest(state: GameState): void {
  FOREST_VERSION.set(state, (FOREST_VERSION.get(state) ?? 0) + 1);
}

/** Every standing forest cell, in order. Rebuilt only when the forest moves. */
function treesOf(state: GameState): number[] {
  const version = FOREST_VERSION.get(state) ?? 0;
  const known = TREES.get(state);
  if (known !== undefined && known.version === version) return known.cells;

  const cells: number[] = [];
  for (let i = 0; i < state.map.terrain.length; i += 1) {
    if (state.map.terrain[i] === TERRAIN_CODE.forest) cells.push(i);
  }
  TREES.set(state, { version, cells });
  return cells;
}

/**
 * Las orillas: tierra transitable con agua al lado. §11.9, v3.03.
 *
 * Los pescadores no pueden pisar el río —los caminos no cruzan agua (§11.5)—
 * así que pescan desde la orilla, que es la misma solución que ya usa el vado.
 */
function banksOf(state: GameState): number[] {
  const version = GROUND.get(state) ?? 0;
  const known = BANKS.get(state);
  if (known !== undefined && known.version === version) return known.cells;

  const cells: number[] = [];
  const { width, height, terrain } = state.map;
  for (let i = 0; i < terrain.length; i += 1) {
    if (terrain[i] === TERRAIN_CODE.water) continue;
    if (terrain[i] === TERRAIN_CODE.marsh) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    const near = (dx: number, dy: number): boolean => {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
      return terrain[ny * width + nx] === TERRAIN_CODE.water;
    };
    if (near(1, 0) || near(-1, 0) || near(0, 1) || near(0, -1)) cells.push(i);
  }
  BANKS.set(state, { version, cells });
  return cells;
}

/** Every worker, in a fixed order, so the same village always splits the same. */
function workers(state: GameState): Villager[] {
  return state.people.villagers
    .filter((v) => isHere(v) && v.homeId !== null)
    .sort((a, b) => a.id - b.id);
}

function centreOf(x: number, y: number, w: number, h: number, width: number): number {
  return (y + Math.floor(h / 2)) * width + x + Math.floor(w / 2);
}

/**
 * Where each worker is going this week.
 *
 * §7.6 wants "cada aldeano vivo con casa y destino de trabajo" and §5.2 hands
 * out the labour as three numbers, not as assignments. So the split is by rank:
 * the first `farmers` of them work the fields, the next `cutters` go to the
 * wood, the rest are on the works. Deterministic, no new state, and it moves
 * with the allocation — when the fields need everybody, everybody walks to a
 * field and the track to the wood fades.
 */
function destinations(
  state: GameState,
  homes: Map<number, number>,
): Map<VillagerId, { from: number; to: number }> {
  const out = new Map<VillagerId, { from: number; to: number }>();
  const crew = workers(state);
  if (crew.length === 0 || workforce(state) === 0) return out;

  const a = allocateLabour(state);
  const share = crew.length / Math.max(1, workforce(state));
  // §11.9, v3.03: seis oficios, no tres. §5.2 lleva repartiendo cazadores,
  // pescadores y guardas del grano desde v2.92 y aquí sólo se miraban los
  // labradores y los leñadores: la aldea salía a cazar al bosque en el motor y
  // en pantalla seguían todos yendo al mismo campo.
  const wardens = Math.round(a.wardens * share);
  const hunters = Math.round(a.hunters * share);
  const fishers = Math.round(a.fishers * share);
  const farmers = Math.round(a.farmers * share);
  const cutters = Math.round(a.cutters * share);

  const live = state.buildings.filter((b) => b.lostTick === null);
  const fields = live.filter((b) => b.kind === 'field')
    .map((b) => centreOf(b.x, b.y, b.w, b.h, state.map.width));
  const sites = state.works.map((w) => centreOf(w.x, w.y, w.w, w.h, state.map.width));
  const wood = treesOf(state);
  const banks = banksOf(state);
  // Adónde va el que labra, según el año. En invierno, al bosque a por leña, y
  // si no queda bosque, a la obra: lo que no hace es fingir que ara la nieve.
  const winter = seasonOf(state.tick) === 'winter';
  const fieldwork = winter ? (wood.length > 0 ? wood : sites) : fields;
  // El guarda del grano se planta en su campo, igual que el labrador: lo que
  // cambia no es dónde está sino que está allí en vez de en el bosque.
  const watch = fields;

  // Who is going where only changes when the crew changes, the split changes,
  // or something moved. Everything else in the tick leaves it exactly as it
  // was, and finding the nearest tree for every cutter over four hundred cells
  // was the most expensive thing in step 14.
  const key = [
    crew.map((v) => `${v.id}@${v.homeId ?? -1}`).join(','),
    farmers, cutters, wardens, hunters, fishers, winter ? 'w' : '-',
    FOREST_VERSION.get(state) ?? 0, GROUND.get(state) ?? 0,
    fields.join(','), sites.join(','),
  ].join(':');
  const known = WHERE.get(state);
  if (known !== undefined && known.key === key) return known.targets;

  crew.forEach((v, rank) => {
    const from = v.homeId === null ? undefined : homes.get(v.homeId);
    if (from === undefined) return;

    // El orden de los oficios es el mismo que el del reparto de §5.2: primero
    // el grano que ya está en el campo, luego el que hay que buscar fuera, y
    // al final la leña y la obra.
    //
    // §11.9, v3.03 · **Y el año manda sobre todo lo demás.** En invierno no se
    // ara: la tierra está helada, y lo que hay que hacer es traer leña para las
    // semanas que §5.4 quema y adelantar obra. Un valle donde en enero la gente
    // sale al campo igual que en julio es un valle sin años, y era exactamente
    // lo que se veía.
    const bands: { upTo: number; pool: number[] }[] = [
      { upTo: wardens, pool: watch },
      { upTo: wardens + hunters, pool: wood },
      { upTo: wardens + hunters + fishers, pool: banks },
      { upTo: wardens + hunters + fishers + farmers, pool: fieldwork },
      { upTo: wardens + hunters + fishers + farmers + cutters, pool: wood },
    ];
    let pool = sites;
    let bandStart = wardens + hunters + fishers + farmers + cutters;
    let isFarmer = false;
    for (let b = 0; b < bands.length; b += 1) {
      const band = bands[b] as { upTo: number; pool: number[] };
      if (rank < band.upTo) {
        pool = band.pool;
        bandStart = b === 0 ? 0 : (bands[b - 1] as { upTo: number }).upTo;
        isFarmer = band.pool === fieldwork && !winter;
        break;
      }
    }
    if (pool.length === 0) return;

    // §11.9, v3.03: repartidos entre los sitios de su clase, no todos al más
    // cercano. Antes cada uno elegía el destino más próximo a su casa, y como
    // las casas están juntas eso mandaba a la aldea entera al mismo campo: en
    // pantalla, treinta figuras dibujadas unas encima de otras. Una aldea
    // reparte la tierra, no deja que cada cual siegue donde le pilla mejor.
    //
    // El reparto es por rango dentro de su oficio, que es estable, así que
    // cada uno vuelve a su mismo campo mientras no cambie la cuadrilla. Entre
    // los que le tocan, sigue yendo al más cercano — la distancia deja de
    // decidir a qué campo va y pasa a decidir a cuál de los suyos.
    const rankInJob = rank - bandStart;
    const slice = [pool[rankInJob % pool.length] as number];
    const choices = pool.length > 1 && isFarmer ? slice : pool;

    // The nearest of the kind, by straight-line distance: A* decides how to get
    // there, not where to go. Ties go to the lower cell index.
    let best = choices[0] as number;
    let bestD = Number.POSITIVE_INFINITY;
    for (const cell of choices) {
      const dx = (cell % state.map.width) - (from % state.map.width);
      const dy = Math.floor(cell / state.map.width) - Math.floor(from / state.map.width);
      const d = dx * dx + dy * dy;
      if (d < bestD || (d === bestD && cell < best)) {
        bestD = d;
        best = cell;
      }
    }
    if (best !== from) out.set(v.id, { from, to: best });
  });
  WHERE.set(state, { key, targets: out });
  return out;
}

/** This week's routes, recomputing only the ones that actually moved. */
export function routesFor(state: GameState): Map<VillagerId, number[]> {
  const ground = GROUND.get(state) ?? 0;
  let cache = CACHE.get(state);
  if (cache === undefined) {
    cache = new Map<VillagerId, CachedRoute>();
    CACHE.set(state, cache);
  }

  const out = new Map<VillagerId, number[]>();
  const homes = new Map<number, number>();
  for (const b of state.buildings) {
    if (b.lostTick === null) homes.set(b.id, centreOf(b.x, b.y, b.w, b.h, state.map.width));
  }

  const targets = destinations(state, homes);
  for (const [id, { from, to }] of targets) {
    const known = cache.get(id);
    if (known !== undefined && known.from === from && known.to === to && known.ground === ground) {
      if (known.cells.length > 0) out.set(id, known.cells);
      continue;
    }
    const cells = route(state.map, from, to);
    cache.set(id, { from, to, ground, cells });
    if (cells.length > 0) out.set(id, cells);
  }

  // Whoever died or left stops walking, and stops holding an entry.
  for (const id of [...cache.keys()]) if (!targets.has(id)) cache.delete(id);
  return out;
}

/** §17's contract: the route this villager walks, cached. */
export function routeFor(state: GameState, id: VillagerId): number[] {
  return routesFor(state).get(id) ?? [];
}

/**
 * Step 14. One week of walking, and the week's decay.
 *
 * The decay comes first so that a cell walked this week is not worn and then
 * immediately worn down again in the same tick, and so that the thresholds mean
 * what they say: `traffic` is what the ground looked like after this week.
 */
export function accrueTraffic(state: GameState): void {
  const traffic = state.map.traffic;
  const active = activeTraffic(state);
  for (const i of active) {
    const t = traffic[i] as number;
    if (t === 0) continue;
    traffic[i] = Math.max(0, t - Math.ceil(t * WORLD.TRAFFIC_DECAY));
  }

  // The villagers who left this week are gone from the routes, and the ones who
  // arrived are not in them yet, which is what the invalidation is for.
  for (const walked of routesFor(state).values()) {
    for (const cell of walked) {
      const t = traffic[cell] as number;
      if (t < 65535) traffic[cell] = t + 1;
      active.add(cell);
    }
  }
}

/**
 * Step 14. Wear becomes a path. §7.6, and the road needs a smithy.
 *
 * A path never appears where the ground cannot be walked: the river does not
 * get a towpath because somebody's route was computed before it flooded.
 */
export function upgradePaths(state: GameState): PathEvent[] {
  const road = smithyWorking(state);
  const events: PathEvent[] = [];
  const active = activeTraffic(state);
  // The old full-map pass emitted cells in numeric order. Preserve that public
  // ordering even though the working set follows route insertion order.
  for (const i of [...active].sort((a, b) => a - b)) {
    const terrain = state.map.terrain[i];
    if (terrain === TERRAIN_CODE.water || terrain === TERRAIN_CODE.marsh) {
      active.delete(i);
      continue;
    }

    const wear = state.map.traffic[i] as number;
    const want = wear >= WORLD.PATH_T3 && road ? 3 : wear >= WORLD.PATH_T2 ? 2 : wear >= WORLD.PATH_T1 ? 1 : 0;
    const has = state.map.path[i] as number;
    if (want !== has) {
      state.map.path[i] = want;
      events.push({ cell: i, from: has as 0 | 1 | 2 | 3, to: want as 0 | 1 | 2 | 3 });
    }
    if (wear === 0 && want === 0) active.delete(i);
  }
  // A changed path changes what A* costs, so every route is stale.
  if (events.length > 0) invalidateRoutes(state);
  return events;
}
