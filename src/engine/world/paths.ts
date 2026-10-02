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

import { WORLD, LABOUR, PATHING } from '../balance';
import { isHere, workforce } from '../people/demography';
import { seasonOf } from '../time';
import { allocateLabour } from '../subsistence/labour';
import { smithyWorking } from '../subsistence/building-counts';
import { TERRAIN_CODE } from '../state';
import type { GameState, PathEvent, Villager, VillagerId } from '../state';
import { lastSearchBounds, route, stepCost } from './astar';
import type { SearchBounds } from './astar';
import { valleyRoadCells, wearValleyRoad } from './valley-road';
import { plotAccess, solidKind, walkingBlocked, walkingMap } from './spatial';
import type { ValleyMap } from '../state';

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
  blocks: number;
  cells: number[];
}
const CACHE = new WeakMap<GameState, Map<VillagerId, CachedRoute>>();
/**
 * §7.6, v3.07 · Rutas por PAR de celdas, no por persona.
 *
 * La caché de arriba guarda la ruta de cada aldeano y se invalida en cuanto
 * cambia su destino. Desde v3.03 los destinos cambian mucho más: los labradores
 * se reparten entre campos distintos, y cuatro veces al año el invierno manda a
 * la aldea entera del campo al bosque y luego de vuelta. Cada uno de esos
 * vaivenes recalculaba el A* de todo el mundo.
 *
 * Medido antes de esto: el banco de §12.9 pasó de once minutos a **cuarenta y
 * tres**, contra un techo de quince. Guardando por par se reutiliza entre
 * personas que van del mismo sitio al mismo sitio, y sobre todo se reutiliza al
 * volver el verano, porque la ruta al campo sigue guardada.
 */
/**
 * v5.71 · Una ruta guardada lleva con qué suelo se calculó (`ground`), con qué
 * casas y obras (`blocks`), cuánto costaba (`cost`), qué parcela había en cada
 * extremo (`ends`) y cuántas veces se había abaratado el mapa (`cheaper`).
 * Con eso `routeBetween` sabe, sin lanzar A*, si la ruta sigue siendo la que A*
 * daría hoy. Ver `stillCheapest`.
 */
interface PairRoute {
  ground: number;
  blocks: number;
  cheaper: number;
  cost: number;
  ends: string;
  /** Lo que miró la búsqueda que la encontró (`lastSearchBounds`). */
  bounds: SearchBounds;
  cells: number[];
}
/** Una tanda de celdas que pasaron a costar menos, con su número de orden. */
interface Cheapening {
  version: number;
  /** Alguna se podía no pisar y ahora sí: puede unir lo que estaba separado. */
  opened: boolean;
  cells: number[];
}
/** Lo que se guarda de las últimas tandas; una ruta más vieja que eso se recalcula. */
const CHEAPENINGS_KEPT = 256;
const PAIRS = new WeakMap<GameState, Map<string, PairRoute>>();
const WALKING = new WeakMap<GameState, { key: string; forest: number; map: ValleyMap; blocked: Uint8Array }>();

/** Una obra nueva también corta una ruta: invalidar sólo por desgaste dejaba caminos bajo las casas. */
function walkingGround(state: GameState): { map: ValleyMap; blocked: Uint8Array } {
  const key = state.buildings.filter(b => b.lostTick === null)
    .map(b => `${b.kind}:${b.x},${b.y},${b.w},${b.h}`).join('|')
    + '/' + state.works.map(w => `${w.kind}:${w.x},${w.y},${w.w},${w.h}`).join('|')
    + `/${state.plaza.x},${state.plaza.y}`;
  const known = WALKING.get(state);
  const forest = FOREST_VERSION.get(state) ?? 0;
  if (known?.key === key) {
    if (known.forest !== forest) {
      const map = walkingMap(state, known.blocked);
      noteCheaper(state, known.map, map);
      known.map = map;
      known.forest = forest;
    }
    return known;
  }
  const blocked = walkingBlocked(state);
  const next = { key, forest, blocked, map: walkingMap(state, blocked) };
  if (known !== undefined) noteCheaper(state, known.map, next.map);
  WALKING.set(state, next);
  // v5.71 · Antes esto era `invalidateRoutes`: cada obra abierta o acabada
  // tiraba **todas** las rutas y A* volvía a correr para la aldea entera —0,24
  // veces por semana, el ×2,3 del tick de 6fa7fda1
  // (`docs/medidas/ci-lentitud-2026-10-02.md`). Ahora sólo sube la versión de
  // las casas, y cada ruta decide si le afecta (`routeBetween`).
  bump(BLOCKS, state);
  return next;
}

function bump(counter: WeakMap<GameState, number>, state: GameState): void {
  counter.set(state, (counter.get(state) ?? 0) + 1);
}

/** Apunta las celdas que cuestan ahora menos que antes, o que antes no se pisaban. */
function noteCheaper(state: GameState, before: ValleyMap, after: ValleyMap): void {
  const cells: number[] = [];
  let opened = false;
  for (let i = 0; i < after.terrain.length; i += 1) {
    if (before.terrain[i] === after.terrain[i]) continue;
    const was = stepCost(before, i);
    const now = stepCost(after, i);
    if (now === null || (was !== null && now >= was)) continue;
    cells.push(i);
    if (was === null) opened = true;
  }
  logCheaper(state, cells, opened);
}

function logCheaper(state: GameState, cells: number[], opened: boolean): void {
  if (cells.length === 0) return;
  let log = CHEAPER.get(state);
  if (log === undefined) { log = { version: 0, entries: [] }; CHEAPER.set(state, log); }
  log.version += 1;
  log.entries.push({ version: log.version, opened, cells });
  if (log.entries.length > CHEAPENINGS_KEPT) log.entries.shift();
}

function cheaperVersion(state: GameState): number {
  return CHEAPER.get(state)?.version ?? 0;
}

/**
 * ¿Puede alguna celda abaratada desde `since` cambiar la ruta de `a` a `b`, que
 * cuesta `cost`? No puede si queda **fuera de lo que su búsqueda miró**
 * (`bounds`): A* no leyó su coste, así que la misma búsqueda daría la misma
 * ruta. Y tampoco si **ni pagando `MIN_STEP` por paso** —la cota que hace
 * admisible la heurística— una ruta por ella llega a costar `cost`.
 *
 * Una celda que antes no se pisaba recalcula siempre: puede unir lo que estaba
 * separado o abrir una fachada nueva en un extremo.
 */
function cheaperNearby(state: GameState, since: number, a: number, b: number, cost: number,
  bounds: SearchBounds): boolean {
  const log = CHEAPER.get(state);
  if (log === undefined || log.version === since) return false;
  const oldest = log.entries[0];
  if (oldest === undefined || oldest.version > since + 1) return true;
  const width = state.map.width;
  const ax = a % width, ay = Math.floor(a / width), bx = b % width, by = Math.floor(b / width);
  for (let e = log.entries.length - 1; e >= 0; e -= 1) {
    const entry = log.entries[e] as Cheapening;
    if (entry.version <= since) break;
    if (entry.opened) return true;
    for (const c of entry.cells) {
      const cx = c % width, cy = Math.floor(c / width);
      if (cx < bounds.x0 || cx > bounds.x1 || cy < bounds.y0 || cy > bounds.y1) continue;
      const steps = Math.abs(cx - ax) + Math.abs(cy - ay) + Math.abs(cx - bx) + Math.abs(cy - by);
      if (steps * PATHING.MIN_STEP <= cost) return true;
    }
  }
  return false;
}

/** Lo que cuesta andar una ruta sobre el mapa de hoy, o -1 si ya no se puede. */
function costOf(map: ValleyMap, cells: readonly number[]): number {
  let total = 0;
  for (let i = 1; i < cells.length; i += 1) {
    const step = stepCost(map, cells[i] as number);
    if (step === null) return -1;
    total += step;
  }
  return cells.length > 0 && stepCost(map, cells[0] as number) === null ? -1 : total;
}

/** La parcela que tapa una celda, o nada: decide desde qué fachadas se sale. */
function plotUnder(state: GameState, cell: number): { kind: string; x: number; y: number; w: number; h: number } | undefined {
  const x = cell % state.map.width, y = Math.floor(cell / state.map.width);
  return [...state.buildings.filter(b => b.lostTick === null), ...state.works]
    .find(b => solidKind(b.kind) && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);
}

function endsOf(state: GameState, blocked: Uint8Array, from: number, to: number): string {
  const one = (cell: number): string => {
    if (blocked[cell] === 0) return 'open';
    const plot = plotUnder(state, cell);
    return plot === undefined ? 'none' : `${plot.x},${plot.y},${plot.w},${plot.h}`;
  };
  return `${one(from)}>${one(to)}`;
}

/**
 * v5.71 · Si una ruta guardada es todavía la que A* daría hoy, sin lanzarlo.
 *
 * Lo es cuando **lo que cuesta no ha cambiado** (ninguna celda suya ha quedado
 * debajo de una casa, ha vuelto a ser bosque o ha cambiado de senda), **sus
 * extremos salen de las mismas parcelas**, y **ninguna celda abaratada desde
 * que se calculó** (árbol talado, senda mejorada; una casa derribada, nunca)
 * **le queda tan cerca que una ruta por ella pudiera salir igual de barata**.
 * Entonces las demás rutas sólo pueden haberse encarecido o seguir más caras,
 * y A* devolvería la misma.
 *
 * No basta con «ninguna celda suya bloqueada», que es lo que proponía el
 * diagnóstico: una tala de hace tres semanas que el viejo recálculo
 * aprovechaba al abrirse una obra se perdía, y `map.traffic` salía distinto
 * en dos de tres semillas. Con esta condición la partida sale idéntica.
 */
function stillCheapest(state: GameState, known: PairRoute, walking: { map: ValleyMap; blocked: Uint8Array },
  from: number, to: number): boolean {
  if (known.cells.length === 0) return false;
  if (costOf(walking.map, known.cells) !== known.cost) return false;
  if (endsOf(state, walking.blocked, from, to) !== known.ends) return false;
  return !cheaperNearby(state, known.cheaper, known.cells[0] as number,
    known.cells[known.cells.length - 1] as number, known.cost, known.bounds);
}

/** La ruta entre dos celdas, calculada una vez por partida y suelo. */
function routeBetween(state: GameState, from: number, to: number, ground: number): number[] {
  let pairs = PAIRS.get(state);
  if (pairs === undefined) {
    pairs = new Map<string, PairRoute>();
    PAIRS.set(state, pairs);
  }
  const key = `${from}>${to}`;
  const known = pairs.get(key);
  const walking = WALKING.get(state) ?? walkingGround(state);
  const blocks = BLOCKS.get(state) ?? 0;
  if (known !== undefined) {
    if (known.ground === ground && known.blocks === blocks) return known.cells;
    if (stillCheapest(state, known, walking, from, to)) {
      known.ground = ground;
      known.blocks = blocks;
      known.cheaper = cheaperVersion(state);
      return known.cells;
    }
  }

  bump(SEARCHES, state);
  const endpoints = (cell: number): number[] => {
    if (walking.blocked[cell] === 0) return [cell];
    const plot = plotUnder(state, cell);
    return plot === undefined ? [] : plotAccess(state.map, walking.blocked, plot);
  };
  const pairsToTry = endpoints(from).flatMap(a => endpoints(to).map(b => ({ a, b,
    distance: Math.abs(a % state.map.width - b % state.map.width)
      + Math.abs(Math.floor(a / state.map.width) - Math.floor(b / state.map.width)),
  }))).sort((a, b) => a.distance - b.distance || a.a - b.a || a.b - b.b);
  let cells: number[] = [];
  let bounds = lastSearchBounds();
  for (const pair of pairsToTry) {
    cells = route(walking.map, pair.a, pair.b);
    bounds = lastSearchBounds();
    if (cells.length > 0) break;
  }
  // Un tope generoso: una aldea grande no llega a mil pares distintos, y sin
  // él una partida de dos siglos acumularía memoria sin necesidad.
  if (pairs.size > 4000) pairs.clear();
  pairs.set(key, {
    ground, blocks, cheaper: cheaperVersion(state), cost: costOf(walking.map, cells),
    ends: endsOf(state, walking.blocked, from, to), bounds, cells,
  });
  return cells;
}
/** Sube cuando cambia lo que cuesta un camino: una senda mejorada o borrada. */
const GROUND = new WeakMap<GameState, number>();
/** v5.71 · Sube cuando se mueve una casa, una obra o la plaza. */
const BLOCKS = new WeakMap<GameState, number>();
/** v5.71 · Las celdas que han pasado a costar menos: lo único que puede mover una ruta. */
const CHEAPER = new WeakMap<GameState, { version: number; entries: Cheapening[] }>();
/** v5.71 · Búsquedas A* de rutas de trabajo: la medida del coste, y su prueba. */
const SEARCHES = new WeakMap<GameState, number>();
const ROAD = new WeakMap<GameState, { key: string; cells: readonly number[][] }>();

/**
 * La versión del suelo tal como la veían las cachés de destinos antes de
 * v5.71, cuando una obra subía `GROUND`. Las claves de `nearestCached` y de
 * `destinations` siguen sumándola igual, para que den las mismas listas y
 * choquen igual que antes: cambiarlas movería la partida.
 */
function legacyGround(state: GameState): number {
  return (GROUND.get(state) ?? 0) + (BLOCKS.get(state) ?? 0);
}

/** Cuántas rutas de trabajo se han buscado con A* en esta partida. Medida, no estado. */
export function routeSearches(state: GameState): number {
  return SEARCHES.get(state) ?? 0;
}

/**
 * v5.71 · El camino del valle, calculado una vez por suelo. `valleyRoadCells`
 * lanza un A* por boca de punta a punta del mapa **cada semana**, y sólo
 * depende del terreno (bosque), de las sendas (`GROUND`) y de la plaza.
 */
function valleyRoad(state: GameState): readonly number[][] {
  const key = `${GROUND.get(state) ?? 0}/${FOREST_VERSION.get(state) ?? 0}/${state.plaza.x},${state.plaza.y}`;
  const known = ROAD.get(state);
  if (known?.key === key) return known.cells;
  const cells = valleyRoadCells(state.map, state.terrainSeed, state.plaza);
  ROAD.set(state, { key, cells });
  return cells;
}
const TREES = new WeakMap<GameState, { version: number; cells: number[] }>();
const BANKS = new WeakMap<GameState, { version: number; cells: number[] }>();
const WHERE = new WeakMap<GameState, {
  key: number;
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
 * Say that what the ground costs has changed: a path upgraded or wiped. Before
 * v5.71 every route was recomputed after this; now each one is checked against
 * what got cheaper (`stillCheapest`). A changed destination does not need it,
 * because the destination is part of the key. A building going up or coming
 * down is `BLOCKS`, not this.
 */
function invalidateRoutes(state: GameState): void {
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
  const version = legacyGround(state);
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

/** El centro del pueblo, medido sobre las casas que hay en pie. */
function centreOfVillage(state: GameState, homes: Map<number, number>): number {
  const cells = [...homes.values()];
  if (cells.length === 0) {
    return Math.floor(state.map.height / 2) * state.map.width + Math.floor(state.map.width / 2);
  }
  const width = state.map.width;
  const x = Math.round(cells.reduce((n, c) => n + (c % width), 0) / cells.length);
  const y = Math.round(cells.reduce((n, c) => n + Math.floor(c / width), 0) / cells.length);
  return y * width + x;
}

const NEAR = new WeakMap<GameState, Map<string, number[]>>();
const OPEN_TARGETS = new WeakMap<Uint8Array, Map<readonly number[], number[]>>();

/** El terreno conserva bosque bajo los tejados, pero ese árbol ya no es un destino de trabajo. */
function openTargets(state: GameState, cells: number[]): number[] {
  const { blocked } = WALKING.get(state) ?? walkingGround(state);
  let pools = OPEN_TARGETS.get(blocked);
  if (pools === undefined) { pools = new Map(); OPEN_TARGETS.set(blocked, pools); }
  const known = pools.get(cells);
  if (known !== undefined) return known;
  const free = cells.filter(cell => blocked[cell] === 0);
  // Tala y rebrote cambian la lista fuente; no conservar cada semana del siglo.
  if (pools.size > 2) pools.clear();
  pools.set(cells, free);
  return free;
}

/**
 * Las `many` celdas más cercanas a un punto, cacheadas por (versión, punto).
 *
 * Sin la caché esto ordenaba quinientas celdas en cada tick y salía más caro
 * que el problema que venía a resolver: medido, 6,2 s pasaron a 7,0.
 */
function nearestCached(
  state: GameState,
  cells: readonly number[],
  to: number,
  many: number,
  version: number,
  tag: string,
): number[] {
  let cache = NEAR.get(state);
  if (cache === undefined) {
    cache = new Map<string, number[]>();
    NEAR.set(state, cache);
  }
  const key = `${tag}:${version}:${to}:${cells.length}`;
  const known = cache.get(key);
  if (known !== undefined) return known;
  const picked = nearest(cells, to, state.map.width, many);
  if (cache.size > 64) cache.clear();
  cache.set(key, picked);
  return picked;
}

/** Las `many` celdas más cercanas a un punto, en orden estable. */
function nearest(cells: readonly number[], to: number, width: number, many: number): number[] {
  if (cells.length <= many) return [...cells];
  const tx = to % width;
  const ty = Math.floor(to / width);
  return [...cells]
    .sort((a, b) => {
      const da = ((a % width) - tx) ** 2 + (Math.floor(a / width) - ty) ** 2;
      const db = ((b % width) - tx) ** 2 + (Math.floor(b / width) - ty) ** 2;
      return da === db ? a - b : da - db;
    })
    .slice(0, many);
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

  // K3 · sin el acarreo (`woodHaul`): `forest.ts` mira a `paths.ts` para avisar
  // de que los árboles se han movido, y la flecha no puede volver. Con el
  // bosque lejos el motor manda algún leñador más; aquí, al pisar los caminos,
  // cuentan los de siempre. Es desgaste de suelo, no madera.
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
  // §7.6, v3.07: sólo el bosque cercano al pueblo entra en el sorteo. Buscar
  // la celda más próxima entre las quinientas arboladas, para cada persona y
  // cada semana, era el grueso del coste desde que el invierno manda a la
  // aldea entera al bosque.
  const heart = centreOfVillage(state, homes);
  const forestVersion = FOREST_VERSION.get(state) ?? 0;
  const groundVersion = legacyGround(state);
  const wood = nearestCached(
    state, openTargets(state, treesOf(state)), heart, LABOUR.WOOD_CHOICES, forestVersion + groundVersion, 'wood',
  );
  const banks = nearestCached(
    state, openTargets(state, banksOf(state)), heart, LABOUR.WOOD_CHOICES, groundVersion, 'bank',
  );
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
  // §7.6, v3.07: un número, no una cadena. Construir aquí un texto con las
  // cuarenta personas, sus casas y todas las celdas costaba seiscientos
  // caracteres por tick, y esto corre en cada tick de cada semilla de cada
  // política del banco. La comparación es la misma; lo que cambia es que no
  // se reserva memoria para tirarla acto seguido.
  let key = 2166136261;
  const mix = (n: number): void => {
    key = Math.imul(key ^ (n | 0), 16777619) >>> 0;
  };
  for (const v of crew) {
    mix(v.id);
    mix(v.homeId ?? -1);
  }
  mix(farmers * 1000 + cutters);
  mix(wardens * 1000 + hunters);
  mix(fishers * 1000 + (winter ? 1 : 0));
  mix(FOREST_VERSION.get(state) ?? 0);
  mix(legacyGround(state));
  for (const cell of fields) mix(cell);
  for (const cell of sites) mix(cell);
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
  walkingGround(state);
  const ground = GROUND.get(state) ?? 0;
  const blocks = BLOCKS.get(state) ?? 0;
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
    if (known !== undefined && known.from === from && known.to === to && known.ground === ground
      && known.blocks === blocks) {
      if (known.cells.length > 0) out.set(id, known.cells);
      continue;
    }
    const cells = routeBetween(state, from, to, ground);
    cache.set(id, { from, to, ground, blocks, cells });
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
  // Y los de fuera, por el camino del valle (`valley-road.ts`).
  for (const cell of wearValleyRoad(state, valleyRoad(state))) active.add(cell);
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
  const { blocked } = walkingGround(state);
  // The old full-map pass emitted cells in numeric order. Preserve that public
  // ordering even though the working set follows route insertion order.
  for (const i of [...active].sort((a, b) => a - b)) {
    const terrain = state.map.terrain[i];
    if (blocked[i] !== 0 || terrain === TERRAIN_CODE.water) {
      const has = state.map.path[i] ?? 0;
      if (has > 0) {
        state.map.path[i] = 0;
        events.push({ cell: i, from: has as 0 | 1 | 2 | 3, to: 0 });
      }
      state.map.traffic[i] = 0;
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
  // A changed path changes what A* costs. v5.71: only a path made better can
  // move a route that does not cross it, and `routeBetween` checks which.
  logCheaper(state, events.filter(e => e.to > e.from).map(e => e.cell), false);
  if (events.length > 0) invalidateRoutes(state);
  return events;
}
