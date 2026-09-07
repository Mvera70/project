// M-07 · Casting. design.md §8.3.
//
// Binds the letters of a template to actual villagers. If a part cannot be
// filled the template is not eligible at all — a crossroad about the smith is
// not a crossroad when there is no smith.
//
// **With backtracking.** Choosing `A` blind and then asking who hates them gets
// it right one time in eight, so a template can satisfy its `requires` every
// week of a century and never once cast. That is dead content no eligibility
// measurement can see, because the conditions hold perfectly well. Here, a
// choice that strands a dependent letter is undone and another is tried.
//
// The randomness is drawn ONCE per spec, before the search starts: an offset
// that rotates the candidate list. So the number of draws depends only on the
// shape of the template and never on how much backtracking it took, which is
// what keeps the stream aligned whatever state the village is in.
//
// Draws from the 'cast' stream, never from 'crossroads': which template comes
// up and who is in it are two separate questions, and keeping them on separate
// streams means a catalogue that grows does not reshuffle the casting of the
// templates that were already there.

import { isHere } from '../people/demography';
import { worstEnemyOf } from '../people/opinions';
import { ageOf } from '../people/villagers';
import { int } from '../rng';
import type { GameState, Villager, VillagerId } from '../state';
import { holderOf } from './conditions';
import type { CastSpec, CrossroadTemplate } from './schema';

function livingNamed(state: GameState): Villager[] {
  return state.people.namedIds
    .map((id) => state.people.villagers.find((v) => v.id === id))
    .filter((v): v is Villager => v !== undefined && isHere(v))
    .sort((a, b) => a.id - b.id); // total order, so the draw is reproducible
}

/**
 * Whether a spec can be resolved yet. `grudgeAgainst` and `childOf` point at
 * another letter, so they can only be filled once that one is.
 */
function dependsOn(spec: CastSpec): string | null {
  if ('grudgeAgainst' in spec) return spec.grudgeAgainst;
  if ('childOf' in spec) return spec.childOf;
  return null;
}

/** True for the specs whose answer is a choice rather than a lookup. */
function needsDraw(spec: CastSpec): boolean {
  return 'anyNamed' in spec || 'childOf' in spec;
}

/**
 * The specs in dependency order, or null if two letters point at each other.
 * A template may declare `{as:'B', grudgeAgainst:'A'}` before `A` and still
 * work; a cycle is not eligible rather than a hang.
 */
function inDependencyOrder(cast: readonly CastSpec[]): CastSpec[] | null {
  const ordered: CastSpec[] = [];
  const placed = new Set<string>();
  let pending = [...cast];

  while (pending.length > 0) {
    const ready = pending.filter((s) => {
      const needs = dependsOn(s);
      return needs === null || placed.has(needs);
    });
    if (ready.length === 0) return null;
    for (const s of ready) {
      ordered.push(s);
      placed.add(s.as);
    }
    pending = pending.filter((s) => !ready.includes(s));
  }
  return ordered;
}

/**
 * Everyone this spec could bind to, in the order the search will try them.
 *
 * Pure: the rotation offset is passed in, already drawn. An empty list means
 * this branch of the search is dead.
 */
function candidatesFor(
  spec: CastSpec,
  state: GameState,
  filled: Record<string, VillagerId>,
  offset: number,
): VillagerId[] {
  const taken = new Set(Object.values(filled));
  const rotate = (xs: VillagerId[]): VillagerId[] => {
    if (xs.length <= 1) return xs;
    const at = offset % xs.length;
    return [...xs.slice(at), ...xs.slice(0, at)];
  };

  if ('role' in spec) {
    const id = holderOf(state, spec.role);
    return id === null || taken.has(id) ? [] : [id];
  }

  if ('anyNamed' in spec) {
    // `excluding` names other letters, not villagers: "somebody else, not the
    // one already cast as A".
    const barred = new Set((spec.excluding ?? []).map((letter) => filled[letter]));
    const pool = livingNamed(state).filter((v) => !barred.has(v.id) && !taken.has(v.id));

    // A hard filter (§8.3, v2.9) with one escape: a village with nobody of that
    // age still has to be able to answer the question.
    const band = spec.agedBetween;
    const inBand =
      band === undefined
        ? pool
        : pool.filter((v) => {
            const age = ageOf(v, state.tick);
            return age >= band[0] && age <= band[1];
          });
    return rotate((inBand.length > 0 ? inBand : pool).map((v) => v.id));
  }

  if ('grudgeAgainst' in spec) {
    const target = filled[spec.grudgeAgainst];
    if (target === undefined) return [];
    const enemy = worstEnemyOf(state, target);
    return enemy === null || taken.has(enemy) ? [] : [enemy];
  }

  if ('childOf' in spec) {
    const parent = filled[spec.childOf];
    if (parent === undefined) return [];
    const children = state.people.villagers
      .filter((v) => isHere(v) && v.parentIds.includes(parent) && !taken.has(v.id))
      .sort((a, b) => a.id - b.id);
    return rotate(children.map((v) => v.id));
  }

  // youngestNamed: deterministic. Ties go to the lowest id.
  const pool = livingNamed(state)
    .filter((v) => spec.female === undefined || v.female === spec.female)
    .filter((v) => !taken.has(v.id));
  if (pool.length === 0) return [];
  const youngest = pool.reduce((best, v) =>
    ageOf(v, state.tick) < ageOf(best, state.tick) ? v : best,
  );
  return [youngest.id];
}

/**
 * Fill every letter of a template, or return null.
 *
 * The search is exhaustive over the candidates it is given, so if a complete
 * casting exists it is found. What it is not exhaustive over is orderings: the
 * rotation fixes which candidate is tried first, and the offsets are drawn
 * before the search, so the cost in randomness is the same whether the first
 * try worked or the twentieth did.
 */
export function fillCast(
  t: CrossroadTemplate,
  state: GameState,
): Record<string, VillagerId> | null {
  const order = inDependencyOrder(t.cast);
  if (order === null) return null;

  // One draw per spec that involves a choice, always, before anything is tried.
  const offsets = order.map((spec) => (needsDraw(spec) ? int(state.rng, 'cast', 0, 9973) : 0));

  const filled: Record<string, VillagerId> = {};

  const solve = (i: number): boolean => {
    const spec = order[i];
    if (spec === undefined) return true;
    for (const id of candidatesFor(spec, state, filled, offsets[i] ?? 0)) {
      filled[spec.as] = id;
      if (solve(i + 1)) return true;
      delete filled[spec.as];
    }
    return false;
  };

  return solve(0) ? filled : null;
}
