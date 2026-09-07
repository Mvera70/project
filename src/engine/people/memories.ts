// M-05 · What the named remember. design.md §3.4, §6.4.
//
// Only the named remember anything (§6.1). Twelve memories each, weight 1 to 5,
// fading by 0.02 a year. When the twelfth is full the faintest one goes — which
// is how a villager who has lived through everything ends up carrying only what
// mattered.

import { MEMORY, TIME } from '../balance';
import type { GameState, Memory, Villager } from '../state';
import { weekOf } from '../time';

const clampWeight = (w: number): number =>
  Math.max(MEMORY.WEIGHT_MIN, Math.min(MEMORY.WEIGHT_MAX, w));

/**
 * Give a named villager something to remember.
 *
 * The weight stored is the weight decayed so far, so "the faintest memory" is
 * simply the smallest `weight` — there is no second, derived number that could
 * fall out of step with this one.
 *
 * Anonymous villagers remember nothing (§6.1) and the call is ignored.
 */
export function remember(v: Villager, m: Memory): void {
  if (!v.named) return;

  v.memories.push({ ...m, weight: clampWeight(m.weight) });
  if (v.memories.length <= MEMORY.MAX) return;

  // The faintest goes. Ties go to the oldest, so a fresh memory is never
  // dropped in favour of one of equal weight that has already had its years.
  let worst = 0;
  for (let i = 1; i < v.memories.length; i += 1) {
    const a = v.memories[i] as Memory;
    const b = v.memories[worst] as Memory;
    if (a.weight < b.weight || (a.weight === b.weight && a.tick < b.tick)) worst = i;
  }
  v.memories.splice(worst, 1);
}

/**
 * A year passes and everything fades a little. §6.4: −0.02 per year.
 *
 * Runs in week 0, with the rest of the year boundary. A memory worn down to
 * nothing is forgotten outright rather than kept as a zero: it no longer says
 * anything about the villager, and leaving it there would hold a slot that a
 * living memory could use.
 */
export function decayMemories(state: GameState): void {
  if (weekOf(state.tick) !== 0) return;

  for (const id of state.people.namedIds) {
    const v = state.people.villagers.find((x) => x.id === id);
    if (v === undefined) continue;
    for (const m of v.memories) m.weight -= MEMORY.DECAY_PER_YEAR;
    v.memories = v.memories.filter((m) => m.weight > 0);
  }
}

/** The memories one villager holds about another, heaviest first. */
export function memoriesAbout(v: Villager, aboutId: number): Memory[] {
  return v.memories
    .filter((m) => m.aboutId === aboutId)
    .sort((a, b) => b.weight - a.weight || a.tick - b.tick);
}

/** How many years ago a memory was made. Only used for reading it back. */
export function yearsSince(m: Memory, tick: number): number {
  return Math.floor((tick - m.tick) / TIME.WEEKS_PER_YEAR);
}
