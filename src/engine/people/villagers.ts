// M-03 · Making people. design.md §3.4, §6.1, §6.2, §12.2.
//
// Two populations (§6.1). The anonymous are records with an age, a sex and a
// house: no traits, no memory, no opinions. The named — six at the founding,
// up to eight — are the only ones the chronicle quotes and the only ones a
// crossroad can cast.
//
// Everything here draws from the 'names' stream except the traits, which go
// through 'cast' (see traits.ts).

import { FOUNDING, LIFE, PEOPLE, TIME } from '../balance';
import type { RngBundle } from '../rng';
import { int, next } from '../rng';
import type {
  BuildingId,
  GameState,
  PeopleState,
  Role,
  Trait,
  Villager,
  VillagerId,
} from '../state';
import { makeName } from './names';
import { rollTraits } from './traits';

/** The six offices the village is founded with, in the order of §6.2. */
export const FOUNDING_ROLES: readonly Role[] = [
  'leader',
  'smith',
  'midwife',
  'priest',
  'woodward',
  'reeve',
] as const;

/**
 * The founding offices again, hardest to fill first. Ties keep the order of
 * §6.2, so the listing order of the spec is still what breaks them.
 */
const ROLES_BY_DEMAND: readonly Role[] = [...FOUNDING_ROLES].sort(
  (a, b) => minAgeFor(b) - minAgeFor(a),
);

/** Years lived by tick `tick`. Everyone has a birthday at once, in week 0. */
export function ageOf(v: Villager, tick: number): number {
  return Math.floor((tick - v.bornTick) / TIME.WEEKS_PER_YEAR);
}

/** The age floor of a role, or 0 for the roles §12.4 leaves without one. */
export function minAgeFor(role: Role): number {
  const floors: Partial<Record<Role, number>> = PEOPLE.ROLE_MIN_AGE;
  return floors[role] ?? 0;
}

/**
 * The oldest of `ids` who clears the role's floor; if nobody does, the oldest
 * of them anyway — an office held young beats an office left vacant at the
 * founding. Ties go to the lowest id, so the choice is total and deterministic.
 */
function oldestFor(
  villagers: readonly Villager[],
  ids: readonly VillagerId[],
  role: Role,
  tick: number,
): VillagerId | undefined {
  const floor = minAgeFor(role);
  const byAge = [...ids].sort((a, b) => {
    const ageA = ageOf(villagers[a] as Villager, tick);
    const ageB = ageOf(villagers[b] as Villager, tick);
    return ageB - ageA || a - b;
  });
  return byAge.find((id) => ageOf(villagers[id] as Villager, tick) >= floor) ?? byAge[0];
}

export interface VillagerSpec {
  id: VillagerId;
  female: boolean;
  bornTick: number;
  named?: boolean;
  name?: string;
  role?: Role | null;
  traits?: readonly Trait[];
  homeId?: BuildingId | null;
  parentIds?: readonly [VillagerId | null, VillagerId | null];
}

/**
 * A living villager. Pure: no randomness, so that M-04 can build a newborn
 * from a mother and a father without touching a stream.
 *
 * The defaults are the anonymous shape of §6.1: no name, no role, no traits,
 * no memory, no opinions.
 */
export function makeVillager(spec: VillagerSpec): Villager {
  return {
    id: spec.id,
    name: spec.name ?? '',
    named: spec.named ?? false,
    role: spec.role ?? null,
    female: spec.female,
    bornTick: spec.bornTick,
    diedTick: null,
    causeOfDeath: null,
    traits: [...(spec.traits ?? [])],
    homeId: spec.homeId ?? null,
    parentIds: [...(spec.parentIds ?? [null, null])] as [VillagerId | null, VillagerId | null],
    memories: [],
    opinions: {},
  };
}

/** An age group of the founding: how many, and the inclusive range in years. */
interface AgeGroup {
  count: number;
  range: readonly [number, number];
}

const FOUNDING_GROUPS: readonly AgeGroup[] = [
  { count: FOUNDING.ADULTS, range: [FOUNDING.AGE_RANGES.adults[0], FOUNDING.AGE_RANGES.adults[1]] },
  {
    count: FOUNDING.CHILDREN,
    range: [FOUNDING.AGE_RANGES.children[0], FOUNDING.AGE_RANGES.children[1]],
  },
  { count: FOUNDING.ELDERS, range: [FOUNDING.AGE_RANGES.elders[0], FOUNDING.AGE_RANGES.elders[1]] },
];

function isFertileWoman(female: boolean, age: number): boolean {
  return female && age >= LIFE.FERTILE[0] && age <= LIFE.FERTILE[1];
}

/**
 * The twenty who came over the ridge. design.md §12.2.
 *
 * Thirteen adults, five children, two elders; six of the adults hold the
 * founding offices of §6.2 and are named. Nobody has parents: they are the ones
 * who arrived.
 */
export function foundPeople(b: RngBundle, tick: number): PeopleState {
  // 1 · Ages and sexes, group by group, in a fixed order.
  const draws: { age: number; female: boolean }[] = [];
  for (const group of FOUNDING_GROUPS) {
    for (let i = 0; i < group.count; i += 1) {
      const age = int(b, 'names', group.range[0], group.range[1]);
      draws.push({ age, female: next(b, 'names') < 0.5 });
    }
  }

  // 2 · The founding must be able to reproduce. A village that cannot is not
  // interesting variance, it is a game dead on arrival, and it is the first
  // thing the player sees. The correction is deterministic and consumes no
  // draws, so a corrected founding does not shift the stream for the map.
  const adults = draws.slice(0, FOUNDING.ADULTS);
  let fertile = adults.filter((d) => isFertileWoman(d.female, d.age)).length;

  for (const d of adults) {
    if (fertile >= FOUNDING.MIN_FERTILE_WOMEN) break;
    if (!d.female && d.age >= LIFE.FERTILE[0] && d.age <= LIFE.FERTILE[1]) {
      d.female = true;
      fertile += 1;
    }
  }
  for (const d of adults) {
    // Only reachable if fewer than MIN_FERTILE_WOMEN adults were of an age to
    // bear at all — vanishingly rare, but the guarantee has to be total.
    if (fertile >= FOUNDING.MIN_FERTILE_WOMEN) break;
    if (isFertileWoman(d.female, d.age)) continue;
    d.female = true;
    d.age = Math.min(d.age, LIFE.FERTILE[1]);
    fertile += 1;
  }

  // 3 · The villagers themselves, anonymous for now.
  const villagers: Villager[] = draws.map((d, i) =>
    makeVillager({
      id: i,
      female: d.female,
      bornTick: tick - d.age * TIME.WEEKS_PER_YEAR,
    }),
  );

  // 4 · Who holds which office. Each goes to the oldest adult who clears its
  // floor (§12.4 ROLE_MIN_AGE); if nobody clears it, to the oldest available
  // rather than leaving the office vacant. The offices are filled in order of
  // decreasing demand so that the hardest to fill chooses first — the midwife
  // is both the oldest floor and the only one with a sex requirement (§6.2),
  // so she is served before anyone can take the elder she needed.
  const free = new Set<VillagerId>(villagers.slice(0, FOUNDING.ADULTS).map((v) => v.id));
  const holder: Partial<Record<Role, VillagerId>> = {};

  for (const role of ROLES_BY_DEMAND) {
    const eligible = [...free].filter(
      (id) => role !== 'midwife' || villagers[id]?.female === true,
    );
    const id = oldestFor(villagers, eligible, role, tick);
    if (id === undefined) continue;
    holder[role] = id;
    free.delete(id);
  }

  // 5 · Naming them. A character is born: name, traits, and a neutral opinion
  // of everyone else at the table.
  const namedIds: VillagerId[] = [];
  const used = new Set<string>();

  for (const role of FOUNDING_ROLES) {
    const id = holder[role];
    if (id === undefined) continue;
    const v = villagers[id];
    if (v === undefined) continue;
    v.named = true;
    v.role = role;
    v.name = makeName(b, v.female, used);
    used.add(v.name);
    v.traits = rollTraits(b, role);
    namedIds.push(id);
  }

  for (const id of namedIds) {
    const v = villagers[id];
    if (v === undefined) continue;
    for (const other of namedIds) {
      if (other !== id) v.opinions[other] = 0;
    }
  }

  return {
    villagers,
    nextId: villagers.length,
    namedIds,
    grudges: [],
  };
}

/**
 * An anonymous villager becomes a character: name, traits, and neutral opinions
 * both ways with everyone already named (§6.2). Mutates the state and nothing
 * else — the chronicle entry that announces it belongs to M-09.
 *
 * Does nothing if the villager is unknown, dead, already named, or if the eight
 * seats are taken.
 */
export function promoteToNamed(state: GameState, id: VillagerId, role: Role): void {
  const people = state.people;
  const v = people.villagers.find((x) => x.id === id);
  if (v === undefined || v.diedTick !== null || v.named) return;
  if (people.namedIds.length >= PEOPLE.MAX_NAMED) return;
  if (ageOf(v, state.tick) < minAgeFor(role)) return; // §12.4 ROLE_MIN_AGE

  const living = people.namedIds
    .map((nid) => people.villagers.find((x) => x.id === nid))
    .filter((x): x is Villager => x !== undefined && x.diedTick === null);

  v.named = true;
  v.role = role;
  v.name = makeName(state.rng, v.female, new Set(living.map((x) => x.name)));
  v.traits = rollTraits(state.rng, role);

  // Opinions only among the living: the dead are remembered by the chronicle,
  // not by an opinion that could still drift.
  for (const other of living) {
    v.opinions[other.id] = 0;
    other.opinions[v.id] = 0;
  }

  people.namedIds.push(id);
}
