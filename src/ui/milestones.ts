// What just happened that is worth celebrating. design.md §11.6, §9.2.
//
// §11.1's table is state — how many people, how much grain — and §11.6 says
// state is not enough: the valley has to tell what *just happened*, not only
// how it stands. `src/ui/notice.ts` does that for the chronicle's own
// weight-2/3 entries. This module is its sibling for a narrower, longer-lived
// kind of suceso: not "a house burned this week" but "the village has never
// been this big", "the first chapel", "ten years since the founding" — the
// things worth a beat of their own even though nothing dramatic happened.
//
// Pure derivation, nothing painted: given the state and the tick the caller
// last looked, this says what crossed a line worth marking. §11.6 is explicit
// that the visual vocabulary for this is not decided yet ("no es el
// vocabulario visual definitivo") — this module is only the logic half.

import { FOUNDING, MILESTONES, TIME } from '@engine/balance';
import { seasonOf, yearOf } from '@engine/time';
import type { Building, BuildingId, BuildingKind, GameState } from '@engine/state';

type MilestoneKind = 'first_of_kind' | 'peak_people' | 'turn_of_decade' | 'work_done';

export interface Milestone {
  readonly kind: MilestoneKind;
  /** Key into `BANK` (`@engine/chronicle/bank.en`). Never a sentence. */
  readonly key: string;
  readonly params: Readonly<Record<string, string | number>>;
  readonly tick: number;
  /** How much this is celebrated: 1 quiet, 2 notable, 3 the moment of the century. */
  readonly weight: 1 | 2 | 3;
}

// ---------------------------------------------------------------------------
// first_of_kind — the oldest building of each kind the village has ever
// raised, from `Building.builtTick`. Weight 3 for the kinds that change the
// shape of the village (a stone tier, or a building that exists exactly once
// and unlocks a new activity); weight 2 for the rest.
// ---------------------------------------------------------------------------

const TRANSFORMATIVE_KINDS: ReadonlySet<BuildingKind> = new Set<BuildingKind>([
  'stone_house', 'chapel', 'church', 'smithy', 'mill', 'wall',
]);

/**
 * Routine building kinds the village keeps raising for as long as it grows,
 * called out by name in design.md §9.2's own weight-1 row — "casas, campos,
 * graneros posteriores, cada tramo de empalizada o muro" — as the quiet
 * ticking underneath, never the headline. `first_of_kind` still marks the
 * very first of one of these (design.md §9.2 weight 2: "primer granero"); it
 * is only the second and later ones that `work_done` leaves alone, on the
 * same grounds the chronicle already does, so this module does not become a
 * teletype of every house and field a growing village puts up.
 */
const ROUTINE_KINDS: ReadonlySet<BuildingKind> = new Set<BuildingKind>([
  'house', 'field', 'granary', 'palisade', 'wall',
]);

/** The id of the oldest building of each kind on record, ties broken by id. */
function firstOfEachKind(buildings: readonly Building[]): ReadonlyMap<BuildingKind, BuildingId> {
  const sorted = [...buildings].sort((a, b) => a.builtTick - b.builtTick || a.id - b.id);
  const first = new Map<BuildingKind, BuildingId>();
  for (const b of sorted) {
    if (!first.has(b.kind)) first.set(b.kind, b.id);
  }
  return first;
}

function firstOfKindMilestones(state: GameState, sinceTick: number, firstId: ReadonlyMap<BuildingKind, BuildingId>): Milestone[] {
  const out: Milestone[] = [];
  const seen = new Set<BuildingKind>();
  for (const building of state.buildings) {
    if (firstId.get(building.kind) !== building.id) continue;
    if (seen.has(building.kind)) continue; // defends against a duplicated id, never expected
    seen.add(building.kind);
    if (building.builtTick <= sinceTick || building.builtTick > state.tick) continue;
    out.push({
      kind: 'first_of_kind',
      key: `milestone.first_of_kind.${building.kind}`,
      params: { year: yearOf(building.builtTick), season: seasonOf(building.builtTick) },
      tick: building.builtTick,
      weight: TRANSFORMATIVE_KINDS.has(building.kind) ? 3 : 2,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// work_done — a construction project of §7.3 finishing, for the kinds that
// are not the routine, unlimited-repeat ones above and that are not already
// told by `first_of_kind` for this same building. In practice this is a
// second-or-later stone-tier upgrade (a second stone house, another
// watchtower): the singular kinds (chapel, smithy, well, mill, church) are
// capped at one by §7.3's "si no existe" and never reach here twice.
// ---------------------------------------------------------------------------

function workDoneMilestones(state: GameState, sinceTick: number, firstId: ReadonlyMap<BuildingKind, BuildingId>): Milestone[] {
  const out: Milestone[] = [];
  for (const building of state.buildings) {
    if (building.builtTick <= sinceTick || building.builtTick > state.tick) continue;
    if (ROUTINE_KINDS.has(building.kind)) continue;
    if (firstId.get(building.kind) === building.id) continue; // told already, as first_of_kind
    out.push({
      kind: 'work_done',
      key: `milestone.work_done.${building.kind}`,
      params: { year: yearOf(building.builtTick), season: seasonOf(building.builtTick) },
      tick: building.builtTick,
      weight: 2,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// peak_people — a new all-time high, only on a round multiple of ten so a
// growing village does not celebrate every single arrival.
//
// There is no dated "population reached N at tick T" field to read, but every
// chronicle entry for a birth, death, arrival or departure already carries
// the exact headcount of the moment (`params.people`, `sim.ts`'s
// `population(state)` at the time it was pushed) — and the chronicle is
// append-only and dated, so walking it from the start reconstructs the
// village's population history exactly, tick by tick, without recomputing it
// from `Villager.bornTick`. That field is backdated for an arriving adult (it
// holds their birth year, not the week they walked in), so counting "who was
// alive at tick T" from it would place immigrants in the village years before
// they actually arrived — the chronicle's own recorded headcounts have no
// such error, because they were taken live as the village actually stood.
// ---------------------------------------------------------------------------

function peakPeopleMilestones(state: GameState, sinceTick: number): Milestone[] {
  const step = MILESTONES.PEAK_PEOPLE_STEP;
  const out: Milestone[] = [];
  let runningMax: number = FOUNDING.POPULATION;
  for (const entry of state.chronicle) {
    if (entry.tick > state.tick) break; // defensive; the chronicle never runs ahead of `tick`
    const people = entry.params['people'];
    if (typeof people !== 'number') continue;
    if (people > runningMax) {
      if (entry.tick > sinceTick && Math.floor(people / step) > Math.floor(runningMax / step)) {
        out.push({
          kind: 'peak_people',
          key: 'milestone.peak_people',
          params: { people, year: yearOf(entry.tick) },
          tick: entry.tick,
          weight: 2,
        });
      }
      runningMax = people;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// turn_of_decade — the village completes ten years, or a hundred.
// ---------------------------------------------------------------------------

const YEARS_PER_DECADE = 10;
const YEARS_PER_CENTURY = 100;

function turnOfDecadeMilestones(state: GameState, sinceTick: number): Milestone[] {
  const decadeTicks = YEARS_PER_DECADE * TIME.WEEKS_PER_YEAR;
  const out: Milestone[] = [];
  const firstN = Math.floor(sinceTick / decadeTicks) + 1;
  for (let n = Math.max(firstN, 1); n * decadeTicks <= state.tick; n += 1) {
    const tick = n * decadeTicks;
    const years = n * YEARS_PER_DECADE;
    const isCentury = years % YEARS_PER_CENTURY === 0;
    out.push({
      kind: 'turn_of_decade',
      key: isCentury ? 'milestone.turn_of_century' : 'milestone.turn_of_decade',
      params: { years, year: yearOf(tick), season: seasonOf(tick) },
      tick,
      weight: isCentury ? 3 : 2,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------

/**
 * What has happened between `sinceTick` (excluded) and the current tick that
 * is worth celebrating over the valley.
 *
 * Pure: reads `state`, never writes it, never touches `Math.random`, `Date`
 * or the clock. The same state and the same `sinceTick` always give the same
 * list, in the same order — sorted by weight descending and, at equal
 * weight, by tick ascending (and by key as a last, deterministic tie-break).
 * Whoever paints this decides whether to show one or all of them.
 */
export function milestonesAt(state: GameState, sinceTick: number): Milestone[] {
  const firstId = firstOfEachKind(state.buildings);
  const all = [
    ...firstOfKindMilestones(state, sinceTick, firstId),
    ...workDoneMilestones(state, sinceTick, firstId),
    ...peakPeopleMilestones(state, sinceTick),
    ...turnOfDecadeMilestones(state, sinceTick),
  ];
  return all.sort((a, b) => b.weight - a.weight || a.tick - b.tick || a.key.localeCompare(b.key));
}
