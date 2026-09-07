// M-09 · Pushing events into the chronicle. design.md §3.7, §9.1.
//
// The chronicle stores keys and parameters, never prose. The text is composed
// when it is shown, so the bank can be rewritten without invalidating a saved
// game and translated without touching the engine.
//
// The key builders live here rather than in the systems that call them. A
// system knows a villager starved; it should not also have to know that the
// key for that is spelled `death.hunger.anon.many`.

import { ageOf } from '../people/villagers';
import type {
  BuildingKind,
  ChronicleEntry,
  DeathCause,
  GameState,
  Season,
  Villager,
  VillagerId,
} from '../state';
import { seasonOf, yearOf } from '../time';

/**
 * Push an entry. The tick is the state's, always — an entry that could claim a
 * tick of its own would be an entry that could lie about when it happened.
 */
export function record(state: GameState, e: Omit<ChronicleEntry, 'tick'>): void {
  state.chronicle.push({ ...e, tick: state.tick });
}

/** `.one` or `.many`: anonymous villagers are counted, never named (§6.1). */
function plural(count: number): string {
  return count === 1 ? 'one' : 'many';
}

/**
 * The key for a death.
 *
 * A named villager gets their own line with their own name. The anonymous get
 * counted, because the chronicle has no name to give them and inventing one
 * would make the village bigger than it is.
 */
export function deathKey(cause: DeathCause, named: boolean, count = 1): string {
  return named ? `death.${cause}.named` : `death.${cause}.anon.${plural(count)}`;
}

export function birthKey(named: boolean, female: boolean, count = 1): string {
  if (named) return `birth.named.${female ? 'daughter' : 'son'}`;
  return `birth.anon.${plural(count)}`;
}

/** Which of the five harvest lines fits this year's weather. §12.3. */
export function harvestKey(weatherFactor: number): string {
  if (weatherFactor < 0.7) return 'harvest.ruinous';
  if (weatherFactor < 0.9) return 'harvest.poor';
  if (weatherFactor < 1.1) return 'harvest.fair';
  if (weatherFactor < 1.3) return 'harvest.good';
  return 'harvest.abundant';
}

/** The granary burning is worth its own line; so is a house. §5.9. */
export function fireKey(kind: BuildingKind): string {
  if (kind === 'house' || kind === 'granary') return `fire.${kind}`;
  return 'fire.other';
}

export function builtKey(kind: BuildingKind): string {
  return `built.${kind}`;
}

export function lostKey(kind: BuildingKind): string {
  if (kind === 'house' || kind === 'granary' || kind === 'field') return `lost.${kind}`;
  return 'lost.other';
}

export function seasonKey(season: Season): string {
  return `season.${season}`;
}

export function arrivalKey(count: number): string {
  return `arrival.${plural(count)}`;
}

export function departureKey(count: number): string {
  return `departure.${plural(count)}`;
}

// ---------------------------------------------------------------------------
// §9.4 · The death of a named villager
// ---------------------------------------------------------------------------

/**
 * What a named villager's death drags behind it: the oldest grudge they never
 * made up, or failing that the heaviest thing they remembered.
 *
 * Returns a key and the parameters it needs, or null when there is nothing to
 * carry — a villager who quarrelled with nobody and remembered nothing gets the
 * plain line, and that is its own kind of epitaph.
 *
 * The oldest open grudge and not the deepest: a feud that has run for thirty
 * years says more about who someone was than one that started last winter.
 */
export function epitaphFor(
  state: GameState,
  v: Villager,
): { key: string; params: Record<string, string | number> } | null {
  if (!v.named) return null;

  const nameOf = (id: VillagerId): string =>
    state.people.villagers.find((x) => x.id === id)?.name ?? '';

  const open = state.people.grudges
    .filter((g) => g.fromId === v.id && g.healedTick === null)
    .sort((a, b) => a.formedTick - b.formedTick)[0];

  if (open !== undefined) {
    const other = nameOf(open.toId);
    if (other !== '') {
      return {
        key: 'death.named.grudge',
        params: { other, sinceYear: yearOf(open.formedTick) },
      };
    }
  }

  const heaviest = [...v.memories].sort(
    (a, b) => b.weight - a.weight || a.tick - b.tick,
  )[0];
  if (heaviest === undefined) return null;

  // `was_saved` is the one epitaph that needs somebody else in it. Without a
  // name to put there it becomes the unspoken one rather than a broken line.
  const other = heaviest.aboutId === null ? '' : nameOf(heaviest.aboutId);
  const kind = heaviest.kind === 'was_saved' && other === '' ? 'unspoken' : heaviest.kind;

  return {
    key: `death.named.${kind}`,
    params: { other, sinceYear: yearOf(heaviest.tick) },
  };
}

/**
 * The chronicle entry for a named villager's death. Weight 3 (§9.4): they were
 * one of the eight people the player was asked to hold in their head.
 */
export function namedDeathEntry(
  state: GameState,
  v: Villager,
  cause: DeathCause,
  extra: Record<string, string | number> = {},
): Omit<ChronicleEntry, 'tick'> {
  const epitaph = epitaphFor(state, v);
  return {
    kind: 'death',
    templateKey: deathKey(cause, true),
    weight: 3,
    params: {
      name: v.name,
      age: ageOf(v, state.tick),
      year: yearOf(state.tick),
      season: seasonOf(state.tick),
      ...extra,
      ...(epitaph === null ? {} : { tail: epitaph.key, ...epitaph.params }),
    },
  };
}
