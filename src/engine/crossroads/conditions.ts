// M-07 · The condition DSL, evaluated. design.md §8.2.
//
// Conditions are data, not functions. That is the whole point: a template that
// fired can be picked apart afterwards to say exactly which clause let it in,
// and a saved game can carry its pending seeds' conditions without carrying
// code.

import { FOOD, TIME } from '../balance';
import { freeBeds, housingCapacity, isHere, population } from '../people/demography';
import { grudges } from '../people/opinions';
import { TERRAIN_CODE } from '../state';
import type { Condition, GameState, Op, Role } from '../state';
import { seasonOf, weekOf, yearOf } from '../time';
import { count } from '../subsistence/building-counts';

function compare(a: number, op: Op, b: number): boolean {
  switch (op) {
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '==':
      return a === b;
    default:
      return false;
  }
}

/** The living villager holding an office, if anyone does. */
export function holderOf(state: GameState, role: Role): number | null {
  const v = state.people.villagers.find((x) => isHere(x) && x.role === role);
  return v?.id ?? null;
}

/** A flag is set while it has no expiry (0) or its expiry is still ahead. */
export function flagSet(state: GameState, flag: string): boolean {
  const until = state.flags[flag];
  if (until === undefined) return false;
  return until === 0 || until > state.tick;
}

/** Whether an outbreak is running this tick. §5.8. */
export function outbreakRunning(state: GameState): boolean {
  const o = state.outbreak;
  return o !== null && state.tick >= o.startedTick && state.tick < o.endsTick;
}

/**
 * The three ratios of §8.2, each a number a template can compare against.
 *
 *   grainYears  years of food in the granary at the current headcount
 *   housingFree spare beds as a fraction of the roof there is
 *   forestLeft  how much of the valley is still standing forest
 */
export function ratioOf(state: GameState, which: 'grainYears' | 'housingFree' | 'forestLeft'): number {
  switch (which) {
    case 'grainYears': {
      const people = population(state);
      if (people === 0) return Number.POSITIVE_INFINITY;
      return state.village.grain / (people * TIME.WEEKS_PER_YEAR * FOOD.GRAIN_PER_PERSON);
    }
    case 'housingFree': {
      const capacity = housingCapacity(state);
      return capacity === 0 ? 0 : freeBeds(state) / capacity;
    }
    case 'forestLeft': {
      const cells = state.map.terrain.length;
      if (cells === 0) return 0;
      let forest = 0;
      for (const t of state.map.terrain) if (t === TERRAIN_CODE.forest) forest += 1;
      return forest / cells;
    }
    default:
      return 0;
  }
}

/**
 * Evaluate one condition against the state. Total: every variant of §8.2 is
 * handled, and the switch is exhaustive so that adding a variant to the DSL
 * without handling it here does not compile.
 */
export function evaluate(c: Condition, state: GameState): boolean {
  switch (c.k) {
    case 'stat': {
      const value =
        c.stat === 'people' ? population(state) : state.village[c.stat];
      return compare(value, c.op, c.v);
    }
    case 'ratio':
      return compare(ratioOf(state, c.ratio), c.op, c.v);
    case 'season':
      return seasonOf(state.tick) === c.season;
    case 'year':
      return compare(yearOf(state.tick), c.op, c.v);
    case 'has':
      return count(state, c.building) > 0;
    case 'flag':
      return flagSet(state, c.flag) === c.set;
    case 'outbreak':
      return outbreakRunning(state) === c.active;
    case 'role':
      return (holderOf(state, c.role) !== null) === c.alive;
    case 'grudge':
      // "there is a grudge of at least N": the depth is how far the opinion
      // behind it still runs (§6.4).
      return grudges(state, c.min).length > 0;
    case 'trait': {
      const id = holderOf(state, c.role);
      if (id === null) return false;
      const v = state.people.villagers.find((x) => x.id === id);
      return v?.traits.includes(c.trait) === true;
    }
    case 'not':
      return !evaluate(c.c, state);
    case 'any':
      return c.cs.some((x) => evaluate(x, state));
    default:
      return false;
  }
}

/** Every condition must hold. §8.1: `requires` is an AND. */
export function all(cs: readonly Condition[], state: GameState): boolean {
  return cs.every((c) => evaluate(c, state));
}

/**
 * Weeks from now to the next harvest. §8.6 needs it for the projected famine:
 * the pantry has to last until week 35, and if it cannot, the village is
 * already in a crisis whether or not anyone has starved yet.
 */
export function weeksToHarvest(tick: number): number {
  const week = weekOf(tick);
  return week <= TIME.HARVEST_WEEK
    ? TIME.HARVEST_WEEK - week
    : TIME.WEEKS_PER_YEAR - week + TIME.HARVEST_WEEK;
}
