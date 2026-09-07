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

/**
 * Whether casting `id` for this letter would leave a dependent letter with
 * nobody to fill it.
 *
 * `{as:'A', anyNamed}` followed by `{as:'B', grudgeAgainst:'A'}` used to pick A
 * blindly and then ask who hates them. With eight named villagers and one
 * quarrel in the valley it guessed right one time in eight, and the two feud
 * templates were eligible a fiftieth of the time and cast none of it — dead
 * content that no eligibility measurement could see, because the requires held
 * perfectly well.
 */
function wouldStrand(
  id: VillagerId,
  letter: string,
  pending: readonly CastSpec[],
  state: GameState,
): boolean {
  for (const other of pending) {
    if ('grudgeAgainst' in other && other.grudgeAgainst === letter) {
      if (worstEnemyOf(state, id) === null) return true;
    }
    if ('childOf' in other && other.childOf === letter) {
      const hasChild = state.people.villagers.some(
        (v) => isHere(v) && v.parentIds.includes(id),
      );
      if (!hasChild) return true;
    }
  }
  return false;
}

function fillOne(
  spec: CastSpec,
  state: GameState,
  filled: Record<string, VillagerId>,
  pending: readonly CastSpec[],
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
    const wide = inBand.length > 0 ? inBand : pool;

    // Somebody another letter can actually hang off. Falling back to the whole
    // pool keeps the old behaviour when nothing depends on this letter.
    const viable = wide.filter((v) => !wouldStrand(v.id, spec.as, pending, state));
    return pick(state.rng, 'cast', viable.length > 0 ? viable : wide).id;
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
      const laterOn = pending.filter((s) => s !== spec);
      const id = fillOne(spec, state, filled, laterOn);
      if (id === null) return null;
      filled[spec.as] = id;
    }
    pending = pending.filter((s) => !ready.includes(s));
  }

  return filled;
}
