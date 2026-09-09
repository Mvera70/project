// M-23 · Save format and the catch-up that follows loading one. design.md §13.

import { TIME } from './balance';
import { CATALOG } from './crossroads/catalog';
import { foundGame } from './found';
import { population } from './people/demography';
import { tick } from './sim';
import type { ArchivedGame, DecisionRecord, GameState, SaveFile } from './state';

/** The schema this build writes and reads. §13.1. */
export const SCHEMA_VERSION = 2;

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
    typeof s.terrainSeed === 'number' &&
    typeof s.tick === 'number' && s.tick >= 0 &&
    typeof s.peakPeople === 'number' && s.peakPeople >= 0 &&
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

  if (typeof candidate.savedAtMs !== 'number' || !Number.isFinite(candidate.savedAtMs)) {
    throw new Error('Save file has no valid savedAtMs.');
  }
  if (typeof candidate.state !== 'object' || candidate.state === null) {
    throw new Error('Save file has no valid state.');
  }
  if (!Array.isArray(candidate.decisions)) {
    throw new Error('Save file has no decision record.');
  }
  if (!Array.isArray(candidate.archive)) {
    throw new Error('Save file has no archive.');
  }

  let state = candidate.state as GameState;
  let archive = candidate.archive as ArchivedGame[];
  if (candidate.schema === 1) {
    const legacy = candidate.state as Omit<GameState, 'terrainSeed' | 'peakPeople'>;
    const observed = legacy.chronicle.reduce((peak, entry) => {
      const people = entry.params['people'];
      return typeof people === 'number' ? Math.max(peak, people) : peak;
    }, population(legacy as GameState));
    state = { ...legacy, version: SCHEMA_VERSION, terrainSeed: legacy.seed, peakPeople: observed };
    archive = archive.map((game) => ({ ...game, terrainSeed: game.terrainSeed ?? game.seed }));
  } else if (candidate.schema !== SCHEMA_VERSION) {
    throw new Error(`Save file schema ${candidate.schema} is not one this build can read.`);
  }
  if (!isPlausibleState(state)) throw new Error('Save file has no valid state.');

  return {
    schema: SCHEMA_VERSION,
    savedAtMs: candidate.savedAtMs,
    state,
    decisions: candidate.decisions as DecisionRecord[],
    archive,
  };
}

/** The whole visible footprint a finished village leaves behind. */
function ruinMask(state: GameState): Uint8Array {
  const ruins = Uint8Array.from(state.map.ruins);
  for (const building of state.buildings) {
    if (building.lostTick !== null) continue;
    for (let y = building.y; y < building.y + building.h; y += 1) {
      for (let x = building.x; x < building.x + building.w; x += 1) {
        ruins[y * state.map.width + x] = 1;
      }
    }
  }
  return ruins;
}

/** Freeze a finished village into §13.3's non-mechanical inheritance. */
export function archiveGame(state: GameState): ArchivedGame {
  if (state.ended === null) throw new Error('A living village cannot be archived.');
  return {
    seed: state.seed,
    terrainSeed: state.terrainSeed,
    endedTick: state.ended.tick,
    cause: state.ended.cause,
    peakPeople: state.peakPeople,
    chronicle: state.chronicle.map((entry) => ({ ...entry, params: { ...entry.params } })),
    ruins: ruinMask(state),
  };
}

/** Found different people in a fresh copy of the inherited terrain and ruins. */
export function foundSuccessor(game: ArchivedGame, seed: number): GameState {
  return foundGame(seed, { terrainSeed: game.terrainSeed, ruins: game.ruins });
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
