// M-06 · Step 11 of the tick: morale and faith. design.md §5.5, §5.6.
//
// Every change to morale and faith happens here and nowhere else, including the
// harvest bonus that §5.3 writes inside its own block: §5.5 lists it among the
// morale terms, and morale with two homes is morale that drifts apart.
//
// Faith gives no resources. It does two things (§5.6): it opens and closes
// crossroad templates, and it puts a floor under morale. A very devout village
// endures disasters that would sink a faithless one — which is exactly why the
// priest is dangerous.

import { MOOD, TIME } from '../balance';
import { housingCapacity, isHere, population } from '../people/demography';
import type { DeathCause, GameState, TickContext } from '../state';
import { weekOf } from '../time';
import { has } from './buildings';

/**
 * Which deaths a medieval village reads as having no worldly explanation, and
 * so charges to faith (§5.6). Hunger, cold and old age all explain themselves;
 * so does a death the player chose at a crossroad. The sickness and the fire do
 * not.
 *
 * M-10 counts the tick's deaths through this so that the definition lives in
 * one place.
 */
export function isUnexplained(cause: DeathCause): boolean {
  return cause === 'plague' || cause === 'fire';
}

const clamp = (x: number): number => Math.max(0, Math.min(100, x));

/**
 * §5.5 and §5.6, in that order, with the faith floor applied last.
 *
 * The floor goes after every other term and before the clamp, so that a devout
 * village is held up by its faith no matter what happened this week — and so
 * that the floor is computed from the faith of this tick, not the last one.
 */
export function updateMood(state: GameState, ctx: TickContext): void {
  const people = population(state);
  const chapel = has(state, 'chapel');
  const church = has(state, 'church');
  const mill = has(state, 'mill');
  const outbreak = ctx.outbreak !== null;

  // --- §5.5 · morale ------------------------------------------------------
  let morale = state.village.morale;
  morale += (MOOD.MORALE_DRIFT_TO - morale) * MOOD.MORALE_DRIFT;
  morale += MOOD.MORALE_HUNGER * ctx.severity;
  morale += MOOD.MORALE_PER_DEATH * ctx.deaths;
  morale += MOOD.MORALE_CROWDING * Math.max(0, people - housingCapacity(state));
  if (chapel) morale += MOOD.MORALE_CHAPEL;
  if (church) morale += MOOD.MORALE_CHURCH;
  if (mill) morale += MOOD.MORALE_MILL;
  if (outbreak) morale += MOOD.MORALE_OUTBREAK;
  // §5.3's harvest bonus, on the harvest week only.
  if (weekOf(state.tick) === TIME.HARVEST_WEEK) {
    morale += (state.weather.factor - 1) * MOOD.MORALE_HARVEST;
  }

  // --- §5.6 · faith -------------------------------------------------------
  const priest = state.people.villagers.find((v) => isHere(v) && v.role === 'priest');

  let faith = state.village.faith;
  faith += (MOOD.FAITH_DRIFT_TO - faith) * MOOD.FAITH_DRIFT;
  if (chapel) faith += MOOD.FAITH_CHAPEL;
  if (church) faith += MOOD.FAITH_CHURCH;
  if (priest !== undefined) {
    if (priest.traits.includes('devout')) faith += MOOD.FAITH_DEVOUT_PRIEST;
  } else {
    faith += MOOD.FAITH_NO_PRIEST;
  }
  if (outbreak) faith += MOOD.FAITH_OUTBREAK;
  faith += MOOD.FAITH_UNEXPLAINED_DEATH * ctx.unexplainedDeaths;
  faith = clamp(faith);

  // --- the floor, last ----------------------------------------------------
  morale = Math.max(morale, faith * MOOD.MORALE_FLOOR_FROM_FAITH);

  state.village.morale = clamp(morale);
  state.village.faith = faith;
}
