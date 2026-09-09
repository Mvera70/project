// M-29 · Hunting and fishing. design.md §7.7, §5.2.
//
// The bad-year food. A village with a full granary sends nobody to the woods:
// farming feeds more people per hand than hunting ever did, and §5.2's works
// reserve exists so that the valley keeps changing. But a village that will
// not reach the next harvest sends whoever it can spare, and that is the whole
// design — foraging is what a village does *instead* of watching itself starve.
//
// The split between the two is not a preference. Hunting depends on a forest
// that can be cut down; fishing depends on a river that cannot. So a valley
// that felled its woods still eats, and a valley with no water on the map does
// not — and both of those are visible on the map before they are felt.

import { FORAGE } from '../balance';
import { population } from '../people/demography';
import { TERRAIN_CODE, type Allocation, type GameState } from '../state';

export interface ForageResult {
  /** Bushel-equivalents brought back from the woods. */
  hunted: number;
  /** Bushel-equivalents brought back from the river. */
  fished: number;
}

/** True if the valley has open water in it at all. */
export function hasRiver(state: GameState): boolean {
  return state.map.terrain.includes(TERRAIN_CODE.water);
}

/**
 * How hungry the village is, as the fraction of the foraging threshold it has
 * fallen below: 0 with a full granary, 1 with an empty one. This is what
 * decides how many hands leave the works, so it is deliberately gradual — a
 * village does not go from farming to hunting in a single week.
 */
export function foragingUrgency(state: GameState, grainYears: number): number {
  if (population(state) === 0) return 0;
  if (grainYears >= FORAGE.THRESHOLD_YEARS) return 0;
  return Math.min(1, (FORAGE.THRESHOLD_YEARS - grainYears) / FORAGE.THRESHOLD_YEARS);
}

/**
 * Step 6's third half. The forest fraction comes in from outside for the same
 * reason `produce` takes its `woodCap` from outside: `subsistence/` may not
 * look at `world/`, and M-15 owns the trees.
 *
 * The food goes straight into the store. It is grain in the granary only in
 * the sense that the state has one number for food; what it is in the fiction
 * is meat and fish, and the chronicle says so.
 */
export function forage(state: GameState, a: Allocation, forestLeft: number): ForageResult {
  // `forestLeft` is the fraction of the whole valley still wooded, which opens
  // at about a quarter. Normalising against that is what makes a fresh valley
  // hunt at full rate and a cut-over one hunt badly, instead of every valley
  // hunting at a quarter rate forever.
  const woods = Math.min(1, forestLeft / FORAGE.FULL_FOREST);
  const hunted = forestLeft >= FORAGE.MIN_FOREST
    ? a.hunters * FORAGE.MEAT_PER_HUNTER * woods
    : 0;
  const fished = a.fishers * FORAGE.FISH_PER_FISHER;
  state.village.grain += hunted + fished;
  return { hunted, fished };
}
