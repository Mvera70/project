// M-09 · The welcome report. design.md §9.2, §13.2.
//
// What the player is shown when they come back after being away. Not the whole
// chronicle — the one headline, a handful of the things that mattered, and the
// numbers. The village lived those weeks without them, and this is the account.

import { population } from '../people/demography';
import type { ChronicleEntry, GameState } from '../state';

/** How many weight-2 entries the report carries at most. §9.2. */
const MAX_ENTRIES = 4;

export interface DigestSummary {
  weeks: number; // how long they were away
  people: number; // how many are left
  born: number;
  died: number;
  arrived: number;
  left: number;
  built: number;
  lost: number;
}

export interface Digest {
  headline: ChronicleEntry | null; // the most recent weight 3, if there was one
  entries: ChronicleEntry[]; // up to four of weight 2, oldest first
  summary: DigestSummary;
}

/** How many people an entry accounts for. Aggregated entries carry a count. */
function headsIn(e: ChronicleEntry): number {
  const count = e.params['count'];
  return typeof count === 'number' && count > 0 ? count : 1;
}

/**
 * §9.2: at most the most recent weight-3 headline, up to four weight-2
 * entries, and a numeric summary of what changed.
 *
 * The summary is counted off the chronicle rather than off the state, because
 * the state only knows how things stand now — it cannot say how many were born
 * while nobody was watching. This is the one place that reads the chronicle as
 * data rather than as text.
 */
export function welcomeDigest(state: GameState, sinceTick: number): Digest {
  const window = state.chronicle
    .filter((e) => e.tick > sinceTick)
    .sort((a, b) => a.tick - b.tick);

  const headlines = window.filter((e) => e.weight === 3);
  const notable = window.filter((e) => e.weight === 2);

  const summary: DigestSummary = {
    weeks: Math.max(0, state.tick - sinceTick),
    people: population(state),
    born: 0,
    died: 0,
    arrived: 0,
    left: 0,
    built: 0,
    lost: 0,
  };

  for (const e of window) {
    switch (e.kind) {
      case 'birth':
        summary.born += headsIn(e);
        break;
      case 'death':
      case 'extinction':
        summary.died += headsIn(e);
        break;
      case 'arrival':
        summary.arrived += headsIn(e);
        break;
      case 'departure':
        summary.left += headsIn(e);
        break;
      case 'built':
        summary.built += 1;
        break;
      case 'lost':
        summary.lost += 1;
        break;
      default:
        break;
    }
  }

  return {
    headline: headlines[headlines.length - 1] ?? null,
    // The last four, still oldest first: what happened most recently matters
    // most, but it should read forwards.
    entries: notable.slice(-MAX_ENTRIES),
    summary,
  };
}
