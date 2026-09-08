// M-15 · The wood. design.md §7.5.
//
// The forest retreats from the village outwards, leaves a ragged edge, and
// grows back behind the cutters if they stop. Nothing here draws from a stream:
// which cell falls next is decided by distance to the core and, on a tie, by
// the lower cell index.

import { WORLD } from '../balance';
import { TERRAIN_CODE } from '../state';
import type { Building, GameState } from '../state';
import { TIME } from '../balance';
import { invalidateForest } from './paths';
import { neighbours4 } from './tiles';

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
export function fellForest(state: GameState, wood: number): number {
  if (wood <= 0) return 0;
  const centre = core(state);

  let got = 0;
  let cleared = false;
  while (got < wood) {
    let target = FELL_TARGET.get(state);
    if (target === undefined || target.coreX !== centre.x || target.coreY !== centre.y ||
      state.map.terrain[target.cell] !== TERRAIN_CODE.forest ||
      (state.map.forestStock[target.cell] as number) <= 0) {
      let cell = -1;
      let bestD = Number.POSITIVE_INFINITY;
      for (let i = 0; i < state.map.terrain.length; i += 1) {
        if (state.map.terrain[i] !== TERRAIN_CODE.forest ||
          (state.map.forestStock[i] as number) <= 0) continue;
        const dx = (i % state.map.width) + 0.5 - centre.x;
        const dy = Math.floor(i / state.map.width) + 0.5 - centre.y;
        const d = dx * dx + dy * dy;
        if (d < bestD || (d === bestD && i < cell)) {
          cell = i;
          bestD = d;
        }
      }
      if (cell < 0) break;
      target = { cell, coreX: centre.x, coreY: centre.y };
      FELL_TARGET.set(state, target);
    }

    const cell = target.cell;
    const have = state.map.forestStock[cell] as number;
    const take = Math.min(have, Math.ceil(wood - got));
    state.map.forestStock[cell] = have - take;
    got += take;
    // Emptied: the cell is cleared and starts counting towards its regrowth.
    if (state.map.forestStock[cell] === 0) {
      const wasOld = state.map.forestAge[cell] === WORLD.VIRGIN_FOREST;
      state.map.terrain[cell] = TERRAIN_CODE.cleared;
      state.map.forestAge[cell] = 0;
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
  return got;
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

  const before = Uint8Array.from(state.map.terrain);
  let grew = false;
  for (let i = 0; i < state.map.terrain.length; i += 1) {
    if (before[i] !== TERRAIN_CODE.cleared) continue;
    // Saturating, not stopping: a cell that waited two and a half centuries for
    // a third forest neighbour is still allowed to get one.
    state.map.forestAge[i] = Math.min(
      WORLD.VIRGIN_FOREST - 1,
      (state.map.forestAge[i] as number) + 1,
    );
    if ((state.map.forestAge[i] as number) < WORLD.FOREST_REGROWTH_YEARS) continue;
    if (occupied[i] === 1) continue;

    const neighbours = neighbours4(i)
      .filter((n) => before[n] === TERRAIN_CODE.forest).length;
    if (neighbours < WORLD.FOREST_REGROWTH_NEIGHBOURS) continue;

    state.map.terrain[i] = TERRAIN_CODE.forest;
    state.map.forestStock[i] = WORLD.WOOD_PER_FOREST_TILE;
    state.map.forestAge[i] = 0;
    grew = true;
  }
  if (grew) invalidateForest(state);
}
