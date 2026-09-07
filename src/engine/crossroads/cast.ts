// M-07 · Casting. design.md §8.3.
//
// Binds the letters of a template to actual villagers. If a part cannot be
// filled the template is not eligible at all — a crossroad about the smith is
// not a crossroad when there is no smith.
//
// Draws from the 'cast' stream, never from 'crossroads': which template comes
// up and who is in it are two separate questions, and keeping them on separate
// streams means a catalogue that grows does not reshuffle the casting of the
// templates that were already there.

import { isHere } from '../people/demography';
import { worstEnemyOf } from '../people/opinions';
import { ageOf } from '../people/villagers';
import { pick } from '../rng';
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

function fillOne(
  spec: CastSpec,
  state: GameState,
  filled: Record<string, VillagerId>,
): VillagerId | null {
  const taken = new Set(Object.values(filled));

  if ('role' in spec) {
    return holderOf(state, spec.role);
  }

  if ('anyNamed' in spec) {
    // `excluding` names other letters, not villagers: "somebody else, not the
    // one already cast as A".
    const barred = new Set((spec.excluding ?? []).map((letter) => filled[letter]));
    const pool = livingNamed(state).filter((v) => !barred.has(v.id) && !taken.has(v.id));
    if (pool.length === 0) return null;

    // The age band is a preference (§8.3): a village with nobody of that age
    // still has to be able to answer the question.
    const band = spec.agedBetween;
    const preferred =
      band === undefined
        ? pool
        : pool.filter((v) => {
            const age = ageOf(v, state.tick);
            return age >= band[0] && age <= band[1];
          });
    return pick(state.rng, 'cast', preferred.length > 0 ? preferred : pool).id;
  }

  if ('grudgeAgainst' in spec) {
    const target = filled[spec.grudgeAgainst];
    return target === undefined ? null : worstEnemyOf(state, target);
  }

  if ('childOf' in spec) {
    const parent = filled[spec.childOf];
    if (parent === undefined) return null;
    const children = state.people.villagers
      .filter((v) => isHere(v) && v.parentIds.includes(parent))
      .sort((a, b) => a.id - b.id);
    return children.length === 0 ? null : pick(state.rng, 'cast', children).id;
  }

  // youngestNamed: deterministic, no draw. Ties go to the lowest id.
  const pool = livingNamed(state)
    .filter((v) => spec.female === undefined || v.female === spec.female)
    .filter((v) => !taken.has(v.id));
  if (pool.length === 0) return null;
  return pool.reduce((youngest, v) =>
    ageOf(v, state.tick) < ageOf(youngest, state.tick) ? v : youngest,
  ).id;
}

/**
 * Fill every letter of a template, or return null.
 *
 * The specs are resolved in dependency order rather than declaration order, so
 * a template may write `{as:'B', grudgeAgainst:'A'}` before it writes A without
 * silently failing to cast. A cycle between two letters resolves to null, which
 * is the right answer: neither can be filled first.
 */
export function fillCast(
  t: CrossroadTemplate,
  state: GameState,
): Record<string, VillagerId> | null {
  const filled: Record<string, VillagerId> = {};
  let pending = [...t.cast];

  while (pending.length > 0) {
    const ready = pending.filter((s) => {
      const needs = dependsOn(s);
      return needs === null || filled[needs] !== undefined;
    });
    if (ready.length === 0) return null; // a cycle, or a reference to nothing

    for (const spec of ready) {
      const id = fillOne(spec, state, filled);
      if (id === null) return null;
      filled[spec.as] = id;
    }
    pending = pending.filter((s) => !ready.includes(s));
  }

  return filled;
}
