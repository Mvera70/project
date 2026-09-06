// M-06 · The year's weather. design.md §5.1, §12.3.

import { WEATHER } from '../balance';
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
  const row = weighted(state.rng, 'weather', WEATHER, (w) => w.p);
  return {
    year: yearOf(state.tick),
    index: WEATHER.indexOf(row),
    factor: row.f,
  };
}
