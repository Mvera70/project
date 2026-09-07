// M-06 · Steps 9 and 10 of the tick: the harvest and the granary.
// design.md §5.3.

import { FOOD, TIME } from '../balance';
import type { Allocation, GameState, HarvestResult } from '../state';
import { weekOf } from '../time';
import { count, has } from './building-counts';

/**
 * What the village can hold. §5.3.
 *
 * M-14's `capacityOf` will report this alongside the housing once buildings
 * exist; both must read the same granary count, which is why it is derived
 * here and not stored.
 */
export function storageCapacity(state: GameState): number {
  return FOOD.BASE_STORAGE + count(state, 'granary') * FOOD.GRANARY_CAPACITY;
}

/**
 * Step 9, week 35 only. §5.3.
 *
 *   yield = workedFields · FIELD_YIELD
 *         · weatherFactor              // 0.60 .. 1.45, drawn at the year's start
 *         · (0.8 + 0.4 · morale/100)
 *         · labourFactor
 *         · (mill ? 1.15 : 1.00)
 *
 * §5.3 also gives the harvest a morale bonus of (weatherFactor − 1) · 25. That
 * term is NOT applied here: §5.5 lists it among the morale terms, and every
 * change to morale belongs in one place. mood.ts applies it, on this same week.
 */
export function harvest(state: GameState, a: Allocation): HarvestResult {
  const weatherFactor = state.weather.factor;
  const empty: HarvestResult = {
    happened: false,
    yielded: 0,
    workedFields: a.workedFields,
    weatherFactor,
    labourFactor: a.labourFactor,
  };
  if (weekOf(state.tick) !== TIME.HARVEST_WEEK) return empty;

  const moraleFactor =
    FOOD.HARVEST_MORALE_BASE + FOOD.HARVEST_MORALE_SPAN * (state.village.morale / 100);

  const yielded =
    a.workedFields *
    FOOD.FIELD_YIELD *
    weatherFactor *
    moraleFactor *
    a.labourFactor *
    (has(state, 'mill') ? FOOD.MILL_BONUS : 1);

  state.village.grain += yielded;

  return { happened: true, yielded, workedFields: a.workedFields, weatherFactor, labourFactor: a.labourFactor };
}

/**
 * Step 10, every week. §5.3.
 *
 *   if grain > capacity: grain −= (grain − capacity) · SPOILAGE
 *
 * The spoilage is the brake that stops a prosperous village from piling up
 * grain until it has no problems left. Buying peace of mind means building a
 * granary, and a granary costs wood and work.
 *
 * Note it only ever removes part of the surplus, so the store approaches
 * capacity from above without ever crossing it.
 *
 * @returns how much was lost.
 */
export function applySpoilage(state: GameState): number {
  const capacity = storageCapacity(state);
  if (state.village.grain <= capacity) return 0;

  const lost = (state.village.grain - capacity) * FOOD.SPOILAGE;
  state.village.grain -= lost;
  return lost;
}
