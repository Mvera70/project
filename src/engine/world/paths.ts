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
const WHERE = new WeakMap<GameState, {
  key: string;
  targets: Map<VillagerId, { from: number; to: number }>;
}>();
const FOREST_VERSION = new WeakMap<GameState, number>();

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
  const farmers = Math.round(a.farmers * share);
  const cutters = Math.round(a.cutters * share);

  // Who is going where only changes when the crew changes, the split changes,
  // or something moved. Everything else in the tick leaves it exactly as it
  // was, and finding the nearest tree for every cutter over four hundred cells
  // was the most expensive thing in step 14.
  const key = [
    crew.length, crew[0]?.id ?? -1, crew[crew.length - 1]?.id ?? -1,
    farmers, cutters,
    FOREST_VERSION.get(state) ?? 0, GROUND.get(state) ?? 0,
    state.works.length, homes.size,
  ].join(':');
  const known = WHERE.get(state);
  if (known !== undefined && known.key === key) return known.targets;

  const live = state.buildings.filter((b) => b.lostTick === null);
  const fields = live.filter((b) => b.kind === 'field')
    .map((b) => centreOf(b.x, b.y, b.w, b.h, state.map.width));
  const sites = state.works.map((w) => centreOf(w.x, w.y, w.w, w.h, state.map.width));
  const wood = treesOf(state);

  crew.forEach((v, rank) => {
    const from = v.homeId === null ? undefined : homes.get(v.homeId);
    if (from === undefined) return;

    const pool = rank < farmers ? fields : rank < farmers + cutters ? wood : sites;
    if (pool.length === 0) return;
    // The nearest of the kind, by straight-line distance: A* decides how to get
    // there, not where to go. Ties go to the lower cell index.
    let best = pool[0] as number;
    let bestD = Number.POSITIVE_INFINITY;
    for (const cell of pool) {
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
function routesOf(state: GameState): Map<VillagerId, number[]> {
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
  return routesOf(state).get(id) ?? [];
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
  for (let i = 0; i < traffic.length; i += 1) {
    const t = traffic[i] as number;
    if (t === 0) continue;
    traffic[i] = Math.max(0, t - Math.ceil(t * WORLD.TRAFFIC_DECAY));
  }

  // The villagers who left this week are gone from the routes, and the ones who
  // arrived are not in them yet, which is what the invalidation is for.
  for (const walked of routesOf(state).values()) {
    for (const cell of walked) {
      const t = traffic[cell] as number;
      if (t < 65535) traffic[cell] = t + 1;
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
  for (let i = 0; i < state.map.path.length; i += 1) {
    const terrain = state.map.terrain[i];
    if (terrain === TERRAIN_CODE.water || terrain === TERRAIN_CODE.marsh) continue;

    const wear = state.map.traffic[i] as number;
    const want = wear >= WORLD.PATH_T3 && road ? 3 : wear >= WORLD.PATH_T2 ? 2 : wear >= WORLD.PATH_T1 ? 1 : 0;
    const has = state.map.path[i] as number;
    if (want === has) continue;
    state.map.path[i] = want;
    events.push({ cell: i, from: has as 0 | 1 | 2 | 3, to: want as 0 | 1 | 2 | 3 });
  }
  // A changed path changes what A* costs, so every route is stale.
  if (events.length > 0) invalidateRoutes(state);
  return events;
}
