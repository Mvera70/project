// M-01 · The clock. design.md §3.2, §4.1, §5.1.
//
// A tick is a week. Nobody derives the week, the year or the season by hand:
// every system asks here, so that a change to the calendar is a change in one
// place. These functions are pure — the tick comes in as a parameter, never
// from Date (design.md §2.4).
//
// Season and Clock are declared in state.ts, with the rest of the domain
// (design.md §3.2); the numbers come from TIME in balance.ts (§12.1).

import { TIME } from './balance';
import type { Clock, Season } from './state';

/** Season order within the year. The year opens in spring. design.md §5.1. */
export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'] as const;

/** Week within the year, 0..47. */
export function weekOf(tick: number): number {
  const t = Math.floor(tick);
  return ((t % TIME.WEEKS_PER_YEAR) + TIME.WEEKS_PER_YEAR) % TIME.WEEKS_PER_YEAR;
}

/** Year since the founding, 0..N. */
export function yearOf(tick: number): number {
  return Math.floor(Math.floor(tick) / TIME.WEEKS_PER_YEAR);
}

/** Season of the tick. Spring 0–11, summer 12–23, autumn 24–35, winter 36–47. */
export function seasonOf(tick: number): Season {
  return SEASONS[Math.floor(weekOf(tick) / TIME.WEEKS_PER_SEASON)] as Season;
}

/** Everything the clock knows about a tick, in one object. */
export function clockOf(tick: number): Clock {
  const t = Math.floor(tick);
  const week = weekOf(t);
  return {
    tick: t,
    week,
    year: yearOf(t),
    season: seasonOf(t),
    seasonWeek: week % TIME.WEEKS_PER_SEASON,
  };
}
