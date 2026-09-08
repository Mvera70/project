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

/**
 * §9.2's weight table, normative since v2.14. One entry per line of the table,
 * and the only place a weight is decided.
 *
 *   3  founding, extinction, the death of a named villager, succession, a
 *      crossroad and its deferred consequence, an outbreak, a famine with dead
 *   2  an exceptional harvest, people arriving or leaving, a fire, a singular
 *      building finished, a grudge formed
 *   1  everything else
 *
 * Weight is not decoration: §9.2 says every dump filters, so a weight set one
 * step too high is a line that pushes a death off the screen. That is why the
 * table lives here as code and not as a judgement made at each call site — the
 * previous version rated a finished house the same as a plague.
 */

/**
 * The buildings §9.2 calls singular, verbatim from the table: chapel, church,
 * smithy, mill, well, and the first granary. Everything else the village puts
 * up — houses, fields, later granaries, and every single length of palisade or
 * wall — is weight 1, because a year of building must not bury the year.
 */
const SINGULAR_BUILDINGS: readonly BuildingKind[] = [
  'chapel',
  'church',
  'smithy',
  'mill',
  'well',
];

/** §9.2: a finished building. `standing` counts it, itself included. */
export function builtWeight(kind: BuildingKind, standing: number): 1 | 2 {
  if (SINGULAR_BUILDINGS.includes(kind)) return 2;
  return kind === 'granary' && standing <= 1 ? 2 : 1;
}

/** §9.2: only a ruinous or an abundant harvest is worth a line of its own. */
export function harvestWeight(weatherFactor: number): 1 | 2 {
  return weatherFactor < 0.7 || weatherFactor > 1.3 ? 2 : 1;
}

/**
 * §9.2: anonymous dead. A famine with dead is a headline; the ordinary
 * mortality of a village is the quiet ticking underneath, however many it
 * takes in one week.
 */
export function anonDeathWeight(cause: DeathCause): 1 | 3 {
  return cause === 'hunger' ? 3 : 1;
}

/**
 * The yearly form of a key, or null if this kind of entry never aggregates.
 * §9.2, v2.14.
 *
 * Twenty-one lengths of palisade are one line with a count, not twenty-one
 * lines. `.one` and `.many` collapse into the same yearly key, because four
 * births in one week and one birth in four weeks are the same five children
 * come the end of the year.
 *
 * The families listed here are exactly the ones that count heads or buildings.
 * Nothing that names a person is on the list, and that is the point: two named
 * villagers who die in the same year share a key but not a life, and §9.4 gives
 * each of them their own line with their own epitaph. Collapsing those would
 * throw away the best thing the chronicle has.
 */
export function yearKey(templateKey: string): string | null {
  const counted = /^(birth\.anon|death\.[a-z_]+\.anon|arrival|departure)\.(?:one|many)$/
    .exec(templateKey);
  if (counted !== null) return `${counted[1] as string}.year`;
  if (/^(?:built|lost)\.[a-z_]+$/.test(templateKey)) return `${templateKey}.year`;
  return null;
}

/**
 * What one entry contributes to its yearly count.
 *
 * For people it is the heads the entry already carries. For a building it is
 * one: `count` there is how many of that kind now stand ("that made seven"),
 * which is a running total and not something that can be added up.
 */
export function tallyOf(e: ChronicleEntry): number {
  if (e.kind === 'built' || e.kind === 'lost') return 1;
  const n = e.params['count'];
  return typeof n === 'number' && n > 0 ? n : 1;
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
 * What a named villager's death drags behind it. §9.4, in this order:
 *
 *   1. The oldest grudge they never made up. Oldest, not deepest: a feud that
 *      has run for thirty years says more about who someone was than one that
 *      started last winter.
 *   2. Failing that, the longest grudge they DID make up. A closed arc is as
 *      good an epitaph as an open one, and gives one of the best lines this
 *      game can write: "They had not spoken for seven years, and then they had."
 *   3. Failing that, the heaviest thing they remembered.
 *   4. Failing everything, null — and the bare line is its own kind of epitaph.
 */
export function epitaphFor(
  state: GameState,
  v: Villager,
): { key: string; params: Record<string, string | number> } | null {
  if (!v.named) return null;

  const nameOf = (id: VillagerId): string =>
    state.people.villagers.find((x) => x.id === id)?.name ?? '';
  const mine = state.people.grudges.filter((g) => g.fromId === v.id);

  // 1 · the oldest open one
  const open = mine
    .filter((g) => g.healedTick === null)
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

  // 2 · the longest healed one. Longest by how many years it ran, not by when
  // it started: the length is what the line is about.
  const healed = mine
    .filter((g) => g.healedTick !== null)
    .sort(
      (a, b) =>
        (b.healedTick as number) - b.formedTick - ((a.healedTick as number) - a.formedTick) ||
        a.formedTick - b.formedTick,
    )[0];
  if (healed !== undefined) {
    const other = nameOf(healed.toId);
    const years = yearOf(healed.healedTick as number) - yearOf(healed.formedTick);
    // A quarrel that was made up inside the same year is not a story.
    if (other !== '' && years >= 1) {
      return {
        key: 'death.named.grudge_healed',
        params: { other, count: years, sinceYear: yearOf(healed.formedTick) },
      };
    }
  }

  // 3 · the heaviest memory
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
