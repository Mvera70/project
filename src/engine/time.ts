// M-01 · The clock. design.md §3.2, §4.1, §5.1.
//
// A tick is a week. Nobody derives the week, the year or the season by hand:
// every system asks here, so that a change to the calendar is a change in one
// place. These functions are pure — the tick comes in as a parameter, never
// from Date (design.md §2.4).

/** design.md §3.2. M-02 moves this type to state.ts, which owns the domain. */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/** design.md §3.2. M-02 moves this type to state.ts, which owns the domain. */
export interface Clock {
  tick: number; // absolute week since the founding
  week: number; // 0..47 within the year
  year: number; // 0..N
  season: Season;
  seasonWeek: number; // 0..11
}

// TODO(M-02): these belong in balance.ts as part of TIME (design.md §12.1).
// M-01 may not touch balance.ts, so they live here meanwhile; when M-02 writes
// TIME, this block is replaced by an import and the values must stay identical.
export const WEEKS_PER_SEASON = 12;
export const WEEKS_PER_YEAR = 48;

/** Season order within the year. The year opens in spring. design.md §5.1. */
export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'] as const;

/** Week within the year, 0..47. */
export function weekOf(tick: number): number {
  const t = Math.floor(tick);
  return ((t % WEEKS_PER_YEAR) + WEEKS_PER_YEAR) % WEEKS_PER_YEAR;
}

/** Year since the founding, 0..N. */
export function yearOf(tick: number): number {
  return Math.floor(Math.floor(tick) / WEEKS_PER_YEAR);
}

/** Season of the tick. Spring 0–11, summer 12–23, autumn 24–35, winter 36–47. */
export function seasonOf(tick: number): Season {
  return SEASONS[Math.floor(weekOf(tick) / WEEKS_PER_SEASON)] as Season;
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
    seasonWeek: week % WEEKS_PER_SEASON,
  };
}
