// M-15 · The wood. design.md §7.5.
//
// The forest retreats from the village outwards, leaves a ragged edge, and
// grows back behind the cutters if they stop. Nothing here draws from a stream:
// which cell falls next is decided by distance to the core and, on a tie, by
// the lower cell index.

import { LABOUR, WORLD } from '../balance';
import { TERRAIN_CODE } from '../state';
import type { Building, GameState } from '../state';
import { TIME } from '../balance';
import { next } from '../rng';
import { invalidateForest } from './paths';
import { plazaCentre } from './plaza';
import { inHeart, neighbours4 } from './tiles';

interface FellTarget {
  cell: number;
  coreX: number;
  coreY: number;
}

// A tree takes many weeks to fell. Remember the current nearest one instead of
// searching all 2,016 cells again until either it falls or the built core moves.
// Derived cache, never state: clones and loaded games rebuild it independently.
const FELL_TARGET = new WeakMap<GameState, FellTarget>();

/** The centre of mass of what is standing, in cell coordinates. */
function core(state: GameState): { x: number; y: number } {
  const live = state.buildings.filter((b: Building) => b.lostTick === null);
  if (live.length === 0) return { x: state.map.width / 2, y: state.map.height / 2 };
  return {
    x: live.reduce((n, b) => n + b.x + b.w / 2, 0) / live.length,
    y: live.reduce((n, b) => n + b.y + b.h / 2, 0) / live.length,
  };
}

/**
 * K2 · Si una celda de bosque es un plantón: brotó hace de uno a siete años
 * (`regrowForest`). La edad 0 es la del bosque que volvió a su claro —así desde
 * §7.5, también en las partidas guardadas— y 255 la del bosque de la fundación:
 * los dos están hechos.
 */
export function sapling(age: number): boolean {
  return age >= 1 && age < WORLD.FOREST_REGROWTH_YEARS;
}

/** Si una celda es de bosque con madera que dar: en pie y ya hecho (no un plantón). */
function fellable(state: GameState, i: number): boolean {
  return state.map.terrain[i] === TERRAIN_CODE.forest
    && (state.map.forestStock[i] as number) > 0
    && !sapling(state.map.forestAge[i] as number);
}

/** Distancia de una celda a la plaza, en celdas. */
function fromPlaza(state: GameState, i: number): number {
  const c = plazaCentre(state.plaza);
  return Math.hypot((i % state.map.width) + 0.5 - c.x, Math.floor(i / state.map.width) + 0.5 - c.y);
}

/**
 * El árbol que el motor talaría ahora mismo, sin tocar el estado.
 *
 * La vida visible usa esta consulta para mandar al leñador al mismo árbol que
 * perderá existencias al resolver la semana. Antes cada capa elegía su propio
 * bosque con un centro distinto y se podía animar una tala a veinte celdas del
 * claro que realmente avanzaba.
 *
 * K1 (Vera, 1 oct 2026) · **la regla es la de siempre: lo más cercano.** Lo
 * que vacía el interior antes de cerrar la villa no es otra regla sino una
 * celda más pequeña (`WOOD_PER_FOREST_TILE`, de 300 a 100): con 300 caía una
 * celda cada cuatro a doce meses y al cerrarse quedaba el 58 % del bosque de
 * dentro; con 100, el 9 %. Se probó también «primero lo de dentro del cerco» y
 * dejaba el 0 %, una diferencia de dos valles de doce: Vera prefirió la regla
 * simple (`docs/medidas/k1-k3-madera-2026-10-01.md` §6). Y K2: **ni un plantón
 * ni el último foco** —por debajo de `FOREST_FLOOR_CELLS` no se tala, y un
 * valle no se queda sin bosque (Vera)—.
 */
export function fellingTarget(state: GameState): number | null {
  if (forestCells(state) <= WORLD.FOREST_FLOOR_CELLS) return null;
  const centre = core(state);
  let cell = -1;
  let bestD = Number.POSITIVE_INFINITY;
  for (let i = 0; i < state.map.terrain.length; i += 1) {
    if (!fellable(state, i)) continue;
    const dx = (i % state.map.width) + 0.5 - centre.x;
    const dy = Math.floor(i / state.map.width) + 0.5 - centre.y;
    const d = dx * dx + dy * dy;
    if (d < bestD || (d === bestD && i < cell)) {
      cell = i;
      bestD = d;
    }
  }
  return cell < 0 ? null : cell;
}

/**
 * K3 (Vera, 1 oct 2026) · **lo que trae un leñador, por lo lejos que tala.**
 * Uno hasta `LABOUR.HAUL_NEAR` celdas de la plaza; más allá, `HAUL_NEAR /
 * distancia`, nunca menos de `HAUL_MIN`. Hasta K3 el bosque daba lo mismo a
 * dos celdas que a diecisiete, y un bosque que se aleja no se notaba en nada.
 */
export function woodHaul(state: GameState): number {
  const cell = fellingTarget(state);
  if (cell === null) return 1;
  const d = fromPlaza(state, cell);
  return d <= LABOUR.HAUL_NEAR ? 1 : Math.max(LABOUR.HAUL_MIN, LABOUR.HAUL_NEAR / d);
}

/** How much wood is still standing in the valley. */
export function woodStanding(state: GameState): number {
  let total = 0;
  for (let i = 0; i < state.map.terrain.length; i += 1) {
    if (state.map.terrain[i] === TERRAIN_CODE.forest) total += state.map.forestStock[i] as number;
  }
  return total;
}

/**
 * Cells of the wood that was standing when they arrived. §9, v2.16.
 *
 * Once this reaches zero it stays there: felling clears the mark, and regrowth
 * never sets it. That is what makes the last one an event worth a line.
 */
export function virginForestCells(state: GameState): number {
  let n = 0;
  for (let i = 0; i < state.map.terrain.length; i += 1) {
    if (state.map.terrain[i] === TERRAIN_CODE.forest &&
      state.map.forestAge[i] === WORLD.VIRGIN_FOREST) n += 1;
  }
  return n;
}

/** How many cells are still forest. §12.9 measures the valley in these. */
export function forestCells(state: GameState): number {
  let n = 0;
  for (const t of state.map.terrain) if (t === TERRAIN_CODE.forest) n += 1;
  return n;
}

/**
 * Fell up to `wood` units, nearest the core first, and say how much was got.
 *
 * §7.5: a cell holds WOOD_PER_FOREST_TILE and the cutters work the one closest
 * to the village. A week's cutting is a few units against a cell of three
 * hundred, so a cell stands part-felled for the better part of a year — which
 * is why the stock is a map layer and not a count of whole cells.
 *
 * Returns less than was asked for when the valley has run out, and that
 * shortfall is what caps §5.2's wood: a village that has cut everything down
 * does not keep producing timber out of nothing.
 */
export function fellForest(state: GameState, wood: number, permanent = false): number {
  return fellForestWithLocation(state, wood, permanent).wood;
}

export interface FellForestResult {
  wood: number;
  /** First cell the cutters actually touched, or null when no wood was taken. */
  firstCell: number | null;
}

/**
 * The same felling operation, retaining the first real cell for a visible
 * crossroad effect. Normal weekly production only needs `fellForest`'s number;
 * decisions need both without selecting the forest a second time.
 */
export function fellForestWithLocation(
  state: GameState,
  wood: number,
  permanent = false,
): FellForestResult {
  if (wood <= 0) return { wood: 0, firstCell: null };
  const centre = core(state);

  let got = 0;
  let firstCell: number | null = null;
  let cleared = false;
  while (got < wood) {
    let target = FELL_TARGET.get(state);
    if (target === undefined || target.coreX !== centre.x || target.coreY !== centre.y ||
      !fellable(state, target.cell)
      || forestCells(state) <= WORLD.FOREST_FLOOR_CELLS) {
      const cell = fellingTarget(state);
      if (cell === null) break;
      target = { cell, coreX: centre.x, coreY: centre.y };
      FELL_TARGET.set(state, target);
    }

    const cell = target.cell;
    firstCell ??= cell;
    const have = state.map.forestStock[cell] as number;
    const take = Math.min(have, Math.ceil(wood - got));
    state.map.forestStock[cell] = have - take;
    got += take;
    // Emptied: the cell is cleared and starts counting towards its regrowth.
    if (state.map.forestStock[cell] === 0) {
      const wasOld = state.map.forestAge[cell] === WORLD.VIRGIN_FOREST;
      state.map.terrain[cell] = TERRAIN_CODE.cleared;
      state.map.forestAge[cell] = permanent ? WORLD.BARREN_CLEARING : 0;
      cleared = true;
      FELL_TARGET.delete(state);
      // The last of the old wood. Counting the whole map is only worth doing
      // on the week a cell of it actually falls, and only until it is gone.
      if (wasOld && state.flags['old_forest_gone'] === undefined &&
        virginForestCells(state) === 0) {
        state.flags['old_forest_gone'] = 0; // permanent (§3.1)
      }
    }
  }
  // Only a cell that actually fell moves the wood. Taking seven units off a
  // cell of three hundred does not, and saying it did threw the route cache
  // away every single week for nothing.
  if (cleared) invalidateForest(state);
  return { wood: got, firstCell };
}

/**
 * Step 14, once a year. §7.5: a `cleared` cell with three or more forest
 * neighbours and no building on it goes back to forest after
 * FOREST_REGROWTH_YEARS.
 *
 * The neighbour rule is what gives the edge its shape. A cell in the open with
 * nothing around it never comes back, so the cleared ground next to the village
 * stays cleared, and the wood behind the cutters closes over again.
 *
 * Every cell is decided against the state at the start of the sweep, so a cell
 * that regrows this year cannot help its neighbour regrow in the same one.
 *
 * K1 · **dentro del cerco no vuelve nada**: el interior talado se queda
 * despejado (Vera, 1 oct 2026).
 *
 * K2 · **y el bosque se extiende.** Hasta K2 sólo volvía donde se taló; ahora,
 * además, cada prado o claro que linda con bosque —en el corazón del valle,
 * lejos del pueblo (`FOREST_SPREAD_CLEAR`, o el cerco si es mayor), sin obra,
 * campo ni camino encima— brota con `FOREST_SPREAD` por vecina arbolada. Lo
 * que brota es un plantón: la celda es bosque, pero su madera crece de año en
 * año hasta la entera en `FOREST_REGROWTH_YEARS`, y hasta entonces no se tala
 * (`fellable`). Así salen focos nuevos lejos del claro, que es donde la aldea
 * acaba yendo a leñar. Las tiradas son del flujo `forest`, una por celda
 * candidata y en orden de celda: no desplazan ninguna otra.
 */
export function regrowForest(state: GameState): void {
  if (state.tick % TIME.WEEKS_PER_YEAR !== 0) return;

  const occupied = new Uint8Array(state.map.terrain.length);
  for (const b of state.buildings) {
    if (b.lostTick !== null) continue;
    for (let y = b.y; y < b.y + b.h; y += 1) {
      for (let x = b.x; x < b.x + b.w; x += 1) occupied[y * state.map.width + x] = 1;
    }
  }
  for (const w of state.works) {
    for (let y = w.y; y < w.y + w.h; y += 1) {
      for (let x = w.x; x < w.x + w.w; x += 1) occupied[y * state.map.width + x] = 1;
    }
  }

  const ring = state.ring;
  const clear = Math.max(WORLD.FOREST_SPREAD_CLEAR, ring ?? 0);
  const before = Uint8Array.from(state.map.terrain);
  let grew = false;
  for (let i = 0; i < state.map.terrain.length; i += 1) {
    // K2 · el plantón crece: un año más, y su parte de madera.
    if (before[i] === TERRAIN_CODE.forest) {
      const age = state.map.forestAge[i] as number;
      if (sapling(age)) {
        state.map.forestAge[i] = age + 1;
        state.map.forestStock[i] = Math.min(WORLD.WOOD_PER_FOREST_TILE,
          (state.map.forestStock[i] as number) + WORLD.WOOD_PER_FOREST_TILE / WORLD.FOREST_REGROWTH_YEARS);
      }
      continue;
    }
    if (before[i] === TERRAIN_CODE.cleared && state.map.forestAge[i] !== WORLD.BARREN_CLEARING) {
      // Saturating, not stopping: a cell that waited two and a half centuries for
      // a third forest neighbour is still allowed to get one.
      state.map.forestAge[i] = Math.min(
        WORLD.BARREN_CLEARING - 1,
        (state.map.forestAge[i] as number) + 1,
      );
      if ((state.map.forestAge[i] as number) >= WORLD.FOREST_REGROWTH_YEARS && occupied[i] !== 1
        && !(ring !== null && fromPlaza(state, i) < ring + 1)) {
        const neighbours = neighbours4(i).filter((n) => before[n] === TERRAIN_CODE.forest).length;
        if (neighbours >= WORLD.FOREST_REGROWTH_NEIGHBOURS) {
          state.map.terrain[i] = TERRAIN_CODE.forest;
          state.map.forestStock[i] = WORLD.WOOD_PER_FOREST_TILE;
          // Lo que vuelve tras esperar su claro vuelve hecho (edad 0, §7.5).
          state.map.forestAge[i] = 0;
          grew = true;
          continue;
        }
      }
    }
    // K2 · el bosque que se extiende.
    if (before[i] !== TERRAIN_CODE.meadow && before[i] !== TERRAIN_CODE.cleared) continue;
    if (state.map.forestAge[i] === WORLD.BARREN_CLEARING || occupied[i] === 1) continue;
    const x = i % state.map.width;
    const y = Math.floor(i / state.map.width);
    if (!inHeart(x, y) || state.map.traffic[i]! >= WORLD.PATH_T1 || fromPlaza(state, i) < clear) continue;
    const neighbours = neighbours4(i).filter((n) => before[n] === TERRAIN_CODE.forest).length;
    if (neighbours === 0) continue;
    if (next(state.rng, 'forest') >= WORLD.FOREST_SPREAD * neighbours) continue;
    state.map.terrain[i] = TERRAIN_CODE.forest;
    state.map.forestStock[i] = WORLD.WOOD_PER_FOREST_TILE / WORLD.FOREST_REGROWTH_YEARS;
    state.map.forestAge[i] = 1;
    grew = true;
  }
  if (grew) invalidateForest(state);
}
