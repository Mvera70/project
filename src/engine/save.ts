// M-23 · Save format and the catch-up that follows loading one. design.md §13.

import { TIME } from './balance';
import { CATALOG } from './crossroads/catalog';
import { tick } from './sim';
import type { ArchivedGame, DecisionRecord, GameState, SaveFile } from './state';

/** The schema this build writes and reads. §13.1. */
export const SCHEMA_VERSION = 1;

/**
 * Assembles a `SaveFile`. Two fields the state itself does not carry:
 * `archive` (previous games, unrelated to this one's state) and `savedAtMs`
 * (wall clock) — the second is why this stays a plain function of its
 * arguments rather than reaching for the clock itself: `src/engine/` may not
 * import `Date` (CLAUDE.md), so whoever calls this — necessarily outside the
 * engine — hands in the moment it happened.
 */
export function serialize(
  state: GameState,
  decisions: readonly DecisionRecord[],
  archive: readonly ArchivedGame[],
  savedAtMs: number,
): SaveFile {
  return {
    schema: SCHEMA_VERSION,
    savedAtMs,
    state,
    decisions: [...decisions],
    archive: [...archive],
  };
}

/** Reject a value that plainly is not a `GameState`, without walking every field. */
function isPlausibleState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Partial<GameState>;
  return (
    typeof s.version === 'number' &&
    typeof s.seed === 'number' &&
    typeof s.tick === 'number' && s.tick >= 0 &&
    typeof s.rng === 'object' && s.rng !== null &&
    typeof s.map === 'object' && s.map !== null &&
    typeof s.village === 'object' && s.village !== null &&
    typeof s.people === 'object' && s.people !== null &&
    Array.isArray(s.buildings) &&
    Array.isArray(s.works) &&
    Array.isArray(s.seeds) &&
    typeof s.flags === 'object' && s.flags !== null &&
    Array.isArray(s.chronicle) &&
    Array.isArray(s.history) &&
    typeof s.weather === 'object' && s.weather !== null &&
    (s.dwindlingSince === null || typeof s.dwindlingSince === 'number') &&
    typeof s.noOneStreak === 'number'
  );
}

/**
 * Validates the shape of an unknown value and hands back a `SaveFile`, or
 * throws. Migration's hook: today there is only `SCHEMA_VERSION` to read, so
 * the switch has one case and a default that refuses anything else — the day
 * a second schema exists, its migration goes here, not scattered where saves
 * happen to be loaded.
 *
 * "Se rechaza sin romper la aplicación" (§17 M-23) is the caller's job, not
 * this function's: it throws plainly, on purpose, so a corrupt save cannot be
 * mistaken for a valid one and silently played.
 */
export function deserialize(raw: unknown): SaveFile {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Save file is not an object.');
  }
  const candidate = raw as Partial<SaveFile>;
  if (typeof candidate.schema !== 'number') {
    throw new Error('Save file has no schema version.');
  }

  switch (candidate.schema) {
    case SCHEMA_VERSION:
      break;
    default:
      throw new Error(`Save file schema ${candidate.schema} is not one this build can read.`);
  }

  if (typeof candidate.savedAtMs !== 'number' || !Number.isFinite(candidate.savedAtMs)) {
    throw new Error('Save file has no valid savedAtMs.');
  }
  if (!isPlausibleState(candidate.state)) {
    throw new Error('Save file has no valid state.');
  }
  if (!Array.isArray(candidate.decisions)) {
    throw new Error('Save file has no decision record.');
  }
  if (!Array.isArray(candidate.archive)) {
    throw new Error('Save file has no archive.');
  }

  return {
    schema: candidate.schema,
    savedAtMs: candidate.savedAtMs,
    state: candidate.state,
    decisions: candidate.decisions as DecisionRecord[],
    archive: candidate.archive as ArchivedGame[],
  };
}

/** How many ticks a gap of this length owes, capped at §12's four hours. */
export function ticksOwed(elapsedMs: number): number {
  const capped = Math.min(Math.max(0, elapsedMs), TIME.LETHARGY_CAP_MS);
  return Math.floor(capped / TIME.REAL_MS_PER_TICK);
}

/** What a catch-up did. `sinceTick` is where the welcome digest (§9.2) starts reading from. */
export interface CatchUpReport {
  sinceTick: number;
  ticks: number; // ticks actually run — fewer than owed only if the village ended
  capped: boolean; // elapsedMs exceeded the four-hour lethargy cap
  ended: boolean;
}

/**
 * §13.2, run all at once. A pending crossroad is never answered here — `tick`
 * is called with no decision, the same as any tick nobody was there to
 * answer, so the village lives those weeks exactly as if the player had been
 * watching and had not decided (§1: it does not resolve itself, expire, or
 * kill).
 *
 * This is the whole four hours in one synchronous call — the closed-book
 * primitive `catchUp`'s own test measures directly ("menos de 2 s"). The
 * batching of §13.2 (64 ticks per `requestAnimationFrame`, so the tab does
 * not visibly hitch) is `ui/lethargy.ts`'s own loop over `tick`, not this
 * function again in a wrapper: the two have different jobs, one synchronous
 * and total, one yielding between chunks, and forcing them through one shape
 * would cost either the atomicity or the batching.
 */
export function catchUp(state: GameState, elapsedMs: number): CatchUpReport {
  const sinceTick = state.tick;
  const owed = ticksOwed(elapsedMs);
  let ran = 0;
  while (ran < owed && state.ended === null) {
    tick(state, CATALOG);
    ran += 1;
  }
  return {
    sinceTick,
    ticks: ran,
    capped: elapsedMs > TIME.LETHARGY_CAP_MS,
    ended: state.ended !== null,
  };
}
