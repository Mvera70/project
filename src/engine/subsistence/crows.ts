// M-29 · The crows. design.md §7.7, §5.3.
//
// The birds were on the fields from v2.88 and took nothing. Now they take the
// only thing they could sensibly take: part of the harvest that has not been
// reaped yet.
//
// What makes them worth building is not the loss, it is the answer. There is
// no scarecrow to raise: the village keeps the crows off by standing in the
// field, and those are the same hands that would be cutting wood, building, or
// out in the woods hunting in a lean year. So for the six weeks before the
// reaping the valley has one more thing to spend people on, at exactly the
// moment it can least afford to — which is what makes it a decision instead of
// a tax.

import { ANIMALS, CROWS, TIME } from '../balance';
import type { Allocation, GameState } from '../state';
import { weekOf } from '../time';
import { count } from './building-counts';

/** True in the weeks the grain is standing ripe and the birds are on it. */
export function crowSeason(tick: number): boolean {
  const week = weekOf(tick);
  return week < TIME.HARVEST_WEEK
    && week >= TIME.HARVEST_WEEK - ANIMALS.CROW_WEEKS_BEFORE_HARVEST;
}

/** Hands it takes to watch every worked field this week. */
export function wardensWanted(state: GameState, workedFields: number): number {
  if (!crowSeason(state.tick)) return 0;
  if (count(state, 'field') === 0) return 0;
  return workedFields * CROWS.WARDEN_PER_FIELD;
}

/**
 * One week of birds. Adds to the bite the harvest will pay, in proportion to
 * how much of the field went unwatched. Deterministic: no draw. A harvest that
 * lost a tenth to crows because nobody was watching is a consequence of the
 * allocation, and the player must be able to see the cause in it.
 *
 * @returns what the birds took this week, as a share of the coming harvest.
 */
export function crowsPeck(state: GameState, a: Allocation): number {
  const wanted = wardensWanted(state, a.workedFields);
  if (wanted <= 0) return 0;

  const watched = Math.min(1, a.wardens / wanted);
  const bite = CROWS.BITE_PER_WEEK * (1 - watched);
  if (bite <= 0) return 0;

  const before = state.crowBite;
  state.crowBite = Math.min(CROWS.MAX_BITE, state.crowBite + bite);
  return state.crowBite - before;
}
