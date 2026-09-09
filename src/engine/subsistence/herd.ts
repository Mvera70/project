// M-29 · The herd, as a thing the village keeps and can lose. design.md §7.7.
//
// "Stored food that walks, eats, and can be taken." Every rule here is that
// sentence: upkeep is the eating, slaughter is the storing, wolves are the
// taking. Nothing draws from an RNG stream except the wolves, and they draw
// from `animals` and from nowhere else (§4.3) so that a raid can never shift
// the deaths of §6.5.

import { ANIMALS, FOOD, TIME } from '../balance';
import { population } from '../people/demography';
import { next } from '../rng';
import { HERD_KINDS, type GameState, type HerdKind } from '../state';
import { count } from './building-counts';
import { seasonOf } from '../time';

/** What the village's buildings can feed and shelter (§7.7's ceiling). */
export function herdCapacity(state: GameState): Record<HerdKind, number> {
  const houses = count(state, 'house') + count(state, 'stone_house');
  const fields = count(state, 'field');
  const hasGranary = count(state, 'granary') > 0;
  return {
    hens: Math.min(houses, ANIMALS.MAX_PER_KIND) * ANIMALS.HENS_PER_HOUSE,
    pigs: hasGranary ? Math.min(Math.floor(houses / ANIMALS.HOUSES_PER_PIG), ANIMALS.MAX_PER_KIND) : 0,
    cows: Math.min(Math.floor(fields / ANIMALS.FIELDS_PER_COW), ANIMALS.MAX_PER_KIND),
  };
}

/** Grain the herd eats this week. */
export function upkeep(state: GameState): number {
  return HERD_KINDS.reduce((sum, kind) => sum + state.herd[kind] * ANIMALS.UPKEEP[kind], 0);
}

export interface HerdReport {
  /** Grain eaten by the animals. */
  ate: number;
  /** Heads killed to feed people, by kind, and the food they gave. */
  slaughtered: Partial<Record<HerdKind, number>>;
  meat: number;
  /** A head born this week, if any. */
  bred: HerdKind | null;
  /** A head taken by wolves, if any. */
  wolved: HerdKind | null;
}

const EMPTY: HerdReport = { ate: 0, slaughtered: {}, meat: 0, bred: null, wolved: null };

/**
 * Step 7's half of the herd: it eats, and if there is not enough food it is
 * eaten. Called from `consume` BEFORE the shortage is worked out, so that a
 * village with animals in the yard never lets somebody starve while it still
 * has a hen — which is what a village would actually do.
 *
 * Slaughter runs smallest first. A hen is two person-weeks and a cow is sixty:
 * eating the hens first spends the cheap store before the breeding stock, and
 * makes the buffer degrade gradually instead of in one lump.
 */
export function feedAndSlaughter(state: GameState, demand: number): HerdReport {
  const report: HerdReport = { ate: 0, slaughtered: {}, meat: 0, bred: null, wolved: null };

  // The animals eat first, and only what there is: a herd cannot conjure grain
  // out of an empty granary to starve the village with.
  const wanted = upkeep(state);
  report.ate = Math.min(wanted, state.village.grain);
  state.village.grain -= report.ate;

  // Then, if the people are short, the herd is what stands between them and
  // hunger. One head at a time, smallest first, and never more than the week
  // needs — a village does not kill its cow to cover a missing bushel.
  for (const kind of HERD_KINDS) {
    while (state.village.grain < demand && state.herd[kind] > 0) {
      state.herd[kind] -= 1;
      state.village.grain += ANIMALS.MEAT[kind];
      report.meat += ANIMALS.MEAT[kind];
      report.slaughtered[kind] = (report.slaughtered[kind] ?? 0) + 1;
    }
  }
  return report;
}

/**
 * Step 14's half: the herd breeds when there is room and food to spare, and
 * the wolves come in winter when there is no palisade.
 *
 * Breeding is deterministic — every `BREED_EVERY` weeks, one head of whatever
 * is furthest below its ceiling. No draw: a herd that grows on a coin toss
 * would add noise to every balance measurement for no design gain.
 */
export function tendHerd(state: GameState): HerdReport {
  if (population(state) === 0) return EMPTY;
  const report: HerdReport = { ate: 0, slaughtered: {}, meat: 0, bred: null, wolved: null };
  const capacity = herdCapacity(state);

  const people = population(state);
  const grainYears = people === 0
    ? Number.POSITIVE_INFINITY
    : state.village.grain / (people * TIME.WEEKS_PER_YEAR * FOOD.GRAIN_PER_PERSON);
  if (state.tick % ANIMALS.BREED_EVERY === 0 && grainYears >= ANIMALS.BREED_GRAIN_YEARS) {
    // Furthest below its ceiling, ties by the fixed order of HERD_KINDS: never
    // by whichever the object happened to list first.
    let choice: HerdKind | null = null;
    let room = 0;
    for (const kind of HERD_KINDS) {
      const spare = capacity[kind] - state.herd[kind];
      if (spare > room) { room = spare; choice = kind; }
    }
    if (choice !== null) {
      state.herd[choice] += 1;
      report.bred = choice;
    }
  }

  // Wolves: winter, and only where nothing stands in their way. The palisade
  // was already a thing the player could build; this gives it a second reason.
  const sheltered = count(state, 'palisade') > 0 || count(state, 'wall') > 0;
  if (seasonOf(state.tick) === 'winter' && !sheltered) {
    if (next(state.rng, 'animals') < ANIMALS.WOLF_RAID_CHANCE) {
      // Largest first: a wolf that takes the cow is a loss worth a palisade.
      for (const kind of [...HERD_KINDS].reverse()) {
        if (state.herd[kind] > 0) {
          state.herd[kind] -= 1;
          report.wolved = kind;
          break;
        }
      }
    }
  }

  // A herd can also fall over its own ceiling: a house lost, a field lost.
  for (const kind of HERD_KINDS) {
    state.herd[kind] = Math.max(0, Math.min(state.herd[kind], capacity[kind]));
  }
  return report;
}
