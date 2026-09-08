// M-06 · The year's weather. design.md §5.1, §12.3.

import { WEATHER, WORLD } from '../balance';
import { weighted } from '../rng';
import type { GameState, YearWeather } from '../state';
import { yearOf } from '../time';

/**
 * One draw from the WEATHER table of §12.3, taken in week 0 and standing for
 * the whole year (§4.2 step 2). It is what multiplies the harvest of week 35
 * and what moves morale that week.
 *
 * Unlike the other annual rolls this one does not guard on the week, because it
 * has to return a weather whatever it is asked: M-10 calls it in week 0 and
 * assigns the result. Returning rather than writing keeps the roll separable
 * from the step that installs it.
 */
export function rollWeather(state: GameState): YearWeather {
  const floodUntil = state.flags['flood_prone'];
  const floodProne = floodUntil !== undefined && (floodUntil === 0 || floodUntil > state.tick);
  // Bare slopes add five points to the ruinous row and take them from fair.
  // The table itself stays normative and every roll still consumes one draw.
  const row = weighted(state.rng, 'weather', WEATHER, (w) => w.p + (
    floodProne && w === WEATHER[0]
      ? WORLD.FLOOD_PRONE_SHIFT
      : floodProne && w === WEATHER[2]
        ? -WORLD.FLOOD_PRONE_SHIFT
        : 0
  ));
  return {
    year: yearOf(state.tick),
    index: WEATHER.indexOf(row),
    factor: row.f,
  };
}
