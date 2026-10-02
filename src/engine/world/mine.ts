// AR-2 · La mina: la veta al pie de la montaña, cuándo la abre la aldea y lo
// que saca cada semana. docs/plan-meta.md AR-2, docs/design.md §7.18.
//
// **La veta no es una capa del mapa.** Es una función pura del terreno y de lo
// construido: la celda al pie de la montaña, con roca seguida detrás y sitio
// delante para los raíles, más cercana a la plaza a partir de `MIN_DISTANCE`.
// Se elige el día que se abre la obra y desde entonces la mina **es** su
// edificio (`kind: 'mine'`), así que no hay nada nuevo que guardar ni que
// migrar: la boca sale de `building.x/y` y su frente de `mouthFacing`.
//
// Y no pasa por `placement.ts` a propósito: §7.4 coloca contra el pueblo
// —cerca de las casas, lejos de la muralla— y la mina va donde está la roca.
// Lo que sí comparte es `canPlace`, la misma puerta de suelo, plaza, paso del
// portón y obras que cualquier otro edificio.

import { MINE } from '../balance';
import { TERRAIN_CODE } from '../state';
import type { Allocation, GameState, ValleyMap } from '../state';
import { hash32 } from '../rng';
import { population } from '../people/demography';
import { has, smithyWorking } from '../subsistence/building-counts';
import { canPlace } from './placement';
import { plazaCentre } from './plaza';
import { floodCells, walkingBlocked } from './spatial';

/** La veta: la celda de la boca y hacia dónde mira, en cruz y hacia el valle. */
export interface Vein {
  readonly x: number;
  readonly y: number;
  readonly dx: -1 | 0 | 1;
  readonly dy: -1 | 0 | 1;
}

const CROSS = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;

function mountainAt(map: ValleyMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height
    && map.terrain[y * map.width + x] === TERRAIN_CODE.mountain;
}

/**
 * Hacia dónde da la boca de una celda al pie de la montaña: **la contraria a
 * la roca**, llevada a la dirección en cruz más parecida, porque los raíles
 * van rectos por la rejilla. Null si la celda no tiene `ROCK_BEHIND` vecinas
 * de montaña o si la tiene a los dos lados (una garganta, no una ladera).
 */
export function mouthFacing(map: ValleyMap, x: number, y: number): { dx: -1 | 0 | 1; dy: -1 | 0 | 1 } | null {
  let sx = 0, sy = 0, rock = 0;
  for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
    if ((dx !== 0 || dy !== 0) && mountainAt(map, x + dx, y + dy)) { sx += dx; sy += dy; rock += 1; }
  }
  if (rock < MINE.ROCK_BEHIND || (sx === 0 && sy === 0)) return null;
  // La boca da la espalda a la roca; si empatan los dos ejes, gana el vertical
  // por estabilidad (la regla da igual mientras sea siempre la misma).
  const [dx, dy] = Math.abs(sx) > Math.abs(sy) ? [-Math.sign(sx), 0] : [0, -Math.sign(sy)];
  // Y justo detrás tiene que haber roca: la galería se mete en la montaña.
  if (!mountainAt(map, x - dx, y - dy)) return null;
  return { dx: dx as -1 | 0 | 1, dy: dy as -1 | 0 | 1 };
}

/**
 * Dónde abriría hoy la aldea su mina, o null si no hay veta posible.
 *
 * Al pie de la montaña, con roca detrás (`mouthFacing`), `RAIL_CELLS` celdas
 * libres y andables delante —por donde salen los raíles hasta el acopio—, la
 * primera de ellas alcanzable a pie desde la plaza, y a `MIN_DISTANCE` celdas
 * de su centro o más. Entre las que quedan, **la más cercana a la plaza**,
 * que es la regla del leñador; los empates se deshacen con un hash del
 * terreno, sin consumir azar.
 */
export function veinSite(state: GameState): Vein | null {
  const map = state.map;
  const blocked = walkingBlocked(state);
  const centre = plazaCentre(state.plaza);
  const start = Math.floor(centre.y) * map.width + Math.floor(centre.x);
  // La plaza misma está bloqueada en `walkingBlocked` (su hoguera): se arranca
  // de las cuatro vecinas de su centro.
  const starts = CROSS.map(([dx, dy]) => start + dy * map.width + dx);
  const reach = floodCells(map, blocked, starts);
  let best: { vein: Vein; score: number } | null = null;
  for (let y = 1; y < map.height - 1; y += 1) {
    for (let x = 1; x < map.width - 1; x += 1) {
      const cell = y * map.width + x;
      if (blocked[cell] !== 0) continue;
      const distance = Math.hypot(x + 0.5 - centre.x, y + 0.5 - centre.y);
      if (distance < MINE.MIN_DISTANCE) continue;
      if (best !== null && distance > best.score + 1) continue;
      const facing = mouthFacing(map, x, y);
      if (facing === null) continue;
      let open = true;
      for (let n = 1; n <= MINE.RAIL_CELLS && open; n += 1) {
        const fx = x + facing.dx * n, fy = y + facing.dy * n;
        open = fx >= 0 && fy >= 0 && fx < map.width && fy < map.height
          && blocked[fy * map.width + fx] === 0;
      }
      if (!open || reach[(y + facing.dy) * map.width + x + facing.dx] !== 1) continue;
      if (!canPlace(state, 'mine', x, y)) continue;
      const score = distance + (hash32(state.terrainSeed, `vein:${cell}`) / 4_294_967_296) * 0.5;
      if (best === null || score < best.score) best = { vein: { x, y, ...facing }, score };
    }
  }
  return best?.vein ?? null;
}

/** Si el valle ha entrado en la edad de piedra: una obra de piedra en pie. */
function stoneAge(state: GameState): boolean {
  return state.buildings.some((b) => b.tier === 1 && b.lostTick === null);
}

/**
 * §7.3, punto 7b · si la aldea quiere abrir la mina esta semana.
 *
 * Después de la piedra («la edad del metal después de la de piedra», Vera),
 * con la fragua encendida —sin herrero el mineral no sirve de nada— y con
 * `MINE.PEOPLE` personas. Si se hunde o arde, se vuelve a pedir.
 */
export function mineWanted(state: GameState): boolean {
  return !has(state, 'mine') && smithyWorking(state) && stoneAge(state)
    && population(state) >= MINE.PEOPLE;
}

/** Si el valle está en la Edad del Hierro: la primera mina se terminó alguna vez. */
export function ironAge(state: GameState): boolean {
  return state.flags['age:iron'] !== undefined;
}

/**
 * Paso 6 · el mineral de la semana: lo que sacan los mineros que mandó el
 * reparto (`allocation.miners`), hasta llenar el acopio. `work` es lo que se
 * trabajó esa semana (la de la misa, menos).
 */
export function digOre(state: GameState, allocation: Allocation, work = 1): number {
  if (allocation.miners <= 0) return 0;
  const room = Math.max(0, MINE.ORE_STORE - state.village.ore);
  const dug = Math.min(room, allocation.miners * MINE.ORE_PER_MINER * work);
  state.village.ore += dug;
  return dug;
}

/**
 * Paso 6, después de la mina · lo que la fragua encendida gasta del acopio
 * (`MINE.SMITH_ORE`): el hierro de todos los días. Sin herrero o sin mineral
 * no gasta nada, y sin mina no hay mineral, así que una partida sin mina no
 * se mueve.
 */
export function forgeOre(state: GameState): number {
  if (state.village.ore <= 0 || !smithyWorking(state)) return 0;
  const used = Math.min(state.village.ore, MINE.SMITH_ORE);
  state.village.ore -= used;
  return used;
}
