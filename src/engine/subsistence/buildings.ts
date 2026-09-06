// M-06 · What is standing in the valley right now.
//
// The one place that filters `lostTick === null`. Nobody builds anything until
// M-14, but the subsistence formulas already read the counts, and every count
// is derived from `state.buildings` — never cached beside it. A parallel
// counter would be a second source of truth, and the two would drift the first
// time a fire takes a granary.
//
// This is a query, not construction. M-14 owns `world/buildings.ts`, which
// raises and destroys them, and its `capacityOf` will be the richer reading of
// the same array.

import type { Building, BuildingKind, GameState } from '../state';

/** Every building of a kind that has not been lost. */
export function standing(state: GameState, kind: BuildingKind): Building[] {
  return state.buildings.filter((b) => b.kind === kind && b.lostTick === null);
}

/** How many of a kind are standing. */
export function count(state: GameState, kind: BuildingKind): number {
  return standing(state, kind).length;
}

/** Whether at least one is standing. */
export function has(state: GameState, kind: BuildingKind): boolean {
  return count(state, kind) > 0;
}

/**
 * The smithy speeds up the works only while its fire is alight. §5.2 gives the
 * bonus to "smithy"; §3.5 gives the building a `lit` flag because the smith's
 * workshop goes dark when he takes offence. Reading both is what makes the flag
 * mean something in the valley.
 */
export function smithyWorking(state: GameState): boolean {
  return standing(state, 'smithy').some((b) => b.lit);
}
