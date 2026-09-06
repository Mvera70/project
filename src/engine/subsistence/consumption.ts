// M-06 · Steps 7 and 8 of the tick: eating, and burning wood to stay alive.
// design.md §5.3, §5.4.
//
// consume() runs BEFORE harvest() (§4.2, steps 7 and 9). The week of the
// harvest is eaten first and reaped afterwards, which is what makes a bad
// autumn show up in the granary before the winter rather than after it.

import { FOOD, LABOUR } from '../balance';
import { isHere, population } from '../people/demography';
import { ageOf } from '../people/villagers';
import { next, pick } from '../rng';
import type { GameState, Villager, VillagerId } from '../state';
import { seasonOf } from '../time';

/**
 * Step 7. §5.3.
 *
 *   demand   = people · GRAIN_PER_PERSON
 *   severity = max(0, demand − grain) / demand
 *   grain    = max(0, grain − demand)
 *   starving = people · STARVATION_RATE · severity
 *
 * The fractional part of `starving` is settled by one draw, not carried over
 * to the next tick. An accumulator would be new state: something to serialise,
 * migrate and keep in step with the save, in exchange for smoothing a number
 * that is already noise.
 *
 * The weakest go first — over 60, then under 5, then the rest by lot — and
 * within each of those groups the choice is also by lot, so it is not always
 * the same villager who starves for being early in the array.
 */
export function consume(state: GameState): { severity: number; starved: VillagerId[] } {
  const people = population(state);
  if (people === 0) return { severity: 0, starved: [] };

  const demand = people * FOOD.GRAIN_PER_PERSON;
  const severity = Math.max(0, demand - state.village.grain) / demand;
  state.village.grain = Math.max(0, state.village.grain - demand);

  if (severity <= 0) return { severity: 0, starved: [] };

  const expected = people * FOOD.STARVATION_RATE * severity;
  const whole = Math.floor(expected);
  // Always exactly one draw whenever there is hunger, whatever the fraction is,
  // so that a rounder number does not shift the stream for the deaths of §6.5.
  const toll = whole + (next(state.rng, 'deaths') < expected - whole ? 1 : 0);
  if (toll === 0) return { severity, starved: [] };

  const present = state.people.villagers.filter(isHere);
  const tiers: Villager[][] = [
    present.filter((v) => ageOf(v, state.tick) > FOOD.STARVE_ELDER_OVER),
    present.filter((v) => ageOf(v, state.tick) < FOOD.STARVE_CHILD_UNDER),
    present.filter(
      (v) =>
        ageOf(v, state.tick) <= FOOD.STARVE_ELDER_OVER &&
        ageOf(v, state.tick) >= FOOD.STARVE_CHILD_UNDER,
    ),
  ];

  const starved: VillagerId[] = [];
  for (const tier of tiers) {
    const pool = [...tier];
    while (starved.length < toll && pool.length > 0) {
      const v = pick(state.rng, 'deaths', pool);
      pool.splice(pool.indexOf(v), 1);
      v.diedTick = state.tick;
      v.causeOfDeath = 'starvation';
      starved.push(v.id);
    }
    if (starved.length >= toll) break;
  }

  if (starved.length > 0) {
    const gone = new Set(starved);
    state.people.namedIds = state.people.namedIds.filter((id) => !gone.has(id));
  }

  return { severity, starved };
}

/**
 * Step 8. §5.4. Only in winter.
 *
 * The village burns WINTER_WOOD per person per week. If the woodpile runs out
 * the week is marked `cold`, and §6.5 multiplies that week's mortality by 1.4.
 */
export function overwinter(state: GameState): { cold: boolean } {
  if (seasonOf(state.tick) !== 'winter') return { cold: false };

  const need = population(state) * LABOUR.WINTER_WOOD;
  if (state.village.wood >= need) {
    state.village.wood -= need;
    return { cold: false };
  }

  state.village.wood = 0;
  return { cold: true };
}
