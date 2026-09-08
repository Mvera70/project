// M-14 · What the village builds, and in what order. design.md §7.2, §7.3.
//
// Step 6 of the tick. M-06 produces the week's build points and hands them
// here; nothing else in the engine may spend them.
//
// The village builds **one project at a time**. §7.3 is written as an ordered
// list of what to start next, not as a set of parallel sites, and a village of
// twenty that opens eight foundations at once finishes none of them. A
// crossroad's `build` joins the same queue rather than jumping it (§8.4), so
// the only place that decides what gets built is this file.

import { BUILDING_RULES, BUILDINGS, FOOD, LIFE, WORLD } from '../balance';
import { count, has, smithyWorking, standing } from '../subsistence/building-counts';
import { housingCapacity, population } from '../people/demography';
import { storageCapacity } from '../subsistence/harvest';
import { TERRAIN_CODE } from '../state';
import type { BuildingKind, ConstructionWork, GameState } from '../state';
import { familyOf, houseHomeless, withinCap } from './buildings';
import type { BuiltEvent } from './buildings';
import { placeBuilding } from './placement';
import { nextUpgrade, upgradeSpot } from './upgrade';
import type { Upgrade } from './upgrade';

/** A project is either a new building of some kind or a stone upgrade. */
export type Project = BuildingKind | Upgrade;

interface NoProjectSnapshot {
  population: number;
  affordable: number;
  granaryWanted: boolean;
  chapelFaith: boolean;
  threatened: boolean;
  buildings: string;
  terrain: Uint8Array;
}

const NO_PROJECT = new WeakMap<GameState, NoProjectSnapshot>();
const AUTOMATIC_KINDS = [
  'field', 'house', 'granary', 'well', 'chapel', 'smithy', 'mill', 'palisade',
] as const;

function threatenedNow(state: GameState): boolean {
  const until = state.flags['threatened'];
  return until !== undefined && (until === 0 || until > state.tick);
}

function affordableMask(state: GameState): number {
  let mask = 0;
  for (let i = 0; i < AUTOMATIC_KINDS.length; i += 1) {
    if (state.village.wood >= BUILDINGS[AUTOMATIC_KINDS[i]!].wood) mask |= 1 << i;
  }
  return mask;
}

function buildingSignature(state: GameState): string {
  return state.buildings.map((building) => [
    building.id, building.kind, building.x, building.y, building.w, building.h,
    building.lostTick ?? '', building.tier, Number(building.lit),
  ].join(':')).join('|');
}

function projectSnapshot(state: GameState): NoProjectSnapshot {
  return {
    population: population(state),
    affordable: affordableMask(state),
    granaryWanted: count(state, 'granary') < FOOD.MAX_GRANARIES &&
      state.village.grain > BUILDING_RULES.GRANARY_FULL * storageCapacity(state),
    chapelFaith: state.village.faith >= BUILDING_RULES.CHAPEL_FAITH,
    threatened: threatenedNow(state),
    buildings: buildingSignature(state),
    terrain: Uint8Array.from(state.map.terrain),
  };
}

function sameTerrain(a: Uint8Array, b: GameState['map']['terrain']): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function noProjectStillApplies(state: GameState): boolean {
  const previous = NO_PROJECT.get(state);
  if (previous === undefined) return false;
  const granaryWanted = count(state, 'granary') < FOOD.MAX_GRANARIES &&
    state.village.grain > BUILDING_RULES.GRANARY_FULL * storageCapacity(state);
  return previous.population === population(state) &&
    previous.affordable === affordableMask(state) &&
    previous.granaryWanted === granaryWanted &&
    previous.chapelFaith === (state.village.faith >= BUILDING_RULES.CHAPEL_FAITH) &&
    previous.threatened === threatenedNow(state) &&
    previous.buildings === buildingSignature(state) &&
    sameTerrain(previous.terrain, state.map.terrain);
}

/**
 * The build points a project costs. §7.2, with the stone rule of v2.12.
 *
 *   bpCost = bp + stone / STONE_PER_BP
 *
 * Stone is not a sixth resource and never was: quarrying it is work, so it is
 * charged as work. `free` is §8.4's exemption — a crossroad that gives the
 * village a watchtower gives it the stone too, so only the raising is left.
 * The wood of the table is exempt for the same reason, and for the same
 * reason the base `bp` is not: `free` waives materials, never labour.
 */
export function bpCostOf(kind: BuildingKind, free = false): number {
  const spec = BUILDINGS[kind];
  return free ? spec.bp : spec.bp + spec.stone / WORLD.STONE_PER_BP;
}

/** Whether the valley can quarry at all: §7.2 wants a smithy and rock. */
export function canQuarry(state: GameState): boolean {
  if (!smithyWorking(state)) return false;
  return state.map.terrain.includes(TERRAIN_CODE.rock);
}

/**
 * §7.3, in order. Returns what to start next, or null.
 *
 * Point 9 — the stone upgrades — is exactly what its wording says: it applies
 * *when there is no room left*. So a wanted building that has nowhere to stand
 * does not block the queue; it falls through to the upgrades, which is what
 * keeps the works engine running after the valley fills up.
 *
 * The `threatened` flag of point 8 is read straight from `state.flags` rather
 * than through `crossroads/conditions`: nothing under `world/` may depend on
 * §8 (the module graph puts crossroads at the top). The semantics are the
 * flag's own — set, and either permanent or not yet expired.
 */
export function nextProject(state: GameState): Project | null {
  const people = population(state);
  const threatened = threatenedNow(state);

  const neededFields = Math.ceil(
    (people * 48 * FOOD.NEEDED_FIELDS_MARGIN) / FOOD.FIELD_YIELD,
  );

  const wanted: BuildingKind[] = [];
  // 1 · fields
  if (count(state, 'field') < Math.min(FOOD.MAX_FIELDS, neededFields)) wanted.push('field');
  // 2 · houses
  if (people > housingCapacity(state) - 2 &&
    standing(state, 'house').length + standing(state, 'stone_house').length < LIFE.MAX_HOUSES) {
    wanted.push('house');
  }
  // 3 · granaries
  if (count(state, 'granary') < FOOD.MAX_GRANARIES &&
    state.village.grain > BUILDING_RULES.GRANARY_FULL * storageCapacity(state)) {
    wanted.push('granary');
  }
  // 4 · the well
  if (!has(state, 'well') && people >= BUILDING_RULES.WELL_PEOPLE) wanted.push('well');
  // 5 · the chapel — a church is a chapel that got bigger, so it counts.
  if (!has(state, 'chapel') && !has(state, 'church') &&
    people >= BUILDING_RULES.CHAPEL_PEOPLE &&
    state.village.faith >= BUILDING_RULES.CHAPEL_FAITH) {
    wanted.push('chapel');
  }
  // 6 · the smithy
  if (!has(state, 'smithy') && people >= BUILDING_RULES.SMITHY_PEOPLE) wanted.push('smithy');
  // 7 · the mill
  if (!has(state, 'mill') && people >= BUILDING_RULES.MILL_PEOPLE) wanted.push('mill');
  // 8 · the palisade
  if (has(state, 'smithy') && threatened) wanted.push('palisade');

  for (const kind of wanted) {
    if (!withinCap(state, kind)) continue;
    if (state.village.wood < BUILDINGS[kind].wood) continue;
    if (placeBuilding(state, kind) !== null) return kind;
  }

  // 9 · stone upgrades, when nothing above could be placed.
  if (!canQuarry(state)) return null;
  return nextUpgrade(state);
}

/** Open a project. Charges its materials and reserves its plot. */
function open(state: GameState, project: Project, free = false): ConstructionWork | null {
  const kind = typeof project === 'string' ? project : project.kind;
  const spec = BUILDINGS[kind];

  let x: number;
  let y: number;
  let upgradeOf: number | null = null;
  if (typeof project === 'string') {
    const spot = placeBuilding(state, kind);
    if (spot === null) return null;
    ({ x, y } = spot);
  } else {
    const source = state.buildings.find((b) => b.id === project.buildingId);
    if (source === undefined || source.lostTick !== null) return null;
    const spot = upgradeSpot(state, kind, source);
    if (spot === null) return null;
    ({ x, y } = spot);
    upgradeOf = source.id;
  }

  if (!free) {
    if (state.village.wood < spec.wood) return null;
    state.village.wood -= spec.wood;
  }

  const work: ConstructionWork = {
    id: state.works.reduce((n, w) => Math.max(n, w.id + 1), 0),
    kind,
    x,
    y,
    w: spec.w,
    h: spec.h,
    bpCost: bpCostOf(kind, free),
    bpDone: 0,
    materialsPaid: true,
    startedTick: state.tick,
    upgradeOf,
  };
  state.works.push(work);
  return work;
}

/**
 * §8.4's `build`, always `free: true` in the schema (§17 M-14, v2.12).
 *
 * It is a project like any other, not a building that appears finished: the
 * plot is reserved now and the chronicle line is written when it is raised.
 * Returns null when there is nowhere to put it — a promise the valley cannot
 * keep is not silently turned into a building on top of the river.
 */
export function requestBuild(state: GameState, kind: BuildingKind): ConstructionWork | null {
  if (!withinCap(state, kind)) return null;
  return open(state, kind, true);
}

/** Wooden ruins vanish under a new building; the chronicle keeps them (§7.4). */
function clearRuins(state: GameState, work: ConstructionWork): void {
  for (let y = work.y; y < work.y + work.h; y += 1) {
    for (let x = work.x; x < work.x + work.w; x += 1) state.map.ruins[y * state.map.width + x] = 0;
  }
}

function complete(state: GameState, work: ConstructionWork): BuiltEvent {
  const spec = BUILDINGS[work.kind];
  const source = work.upgradeOf === null
    ? undefined
    : state.buildings.find((b) => b.id === work.upgradeOf);

  // An upgrade replaces its source rather than destroying it: no ruin, and the
  // family that lived there does not spend a week homeless.
  if (source !== undefined) source.lostTick = state.tick;

  const id = state.buildings.reduce((n, b) => Math.max(n, b.id + 1), 0);
  state.buildings.push({
    id,
    kind: work.kind,
    x: work.x,
    y: work.y,
    w: spec.w,
    h: spec.h,
    builtTick: state.tick,
    lostTick: null,
    tier: spec.tier,
    lit: true,
  });
  clearRuins(state, work);

  if (source !== undefined) {
    for (const person of state.people.villagers) {
      if (person.homeId === source.id) person.homeId = familyOf(work.kind) === 'house' ? id : null;
    }
  }
  if (familyOf(work.kind) === 'house') houseHomeless(state);

  return { id, kind: work.kind, upgradeOf: work.upgradeOf };
}

/**
 * Step 6 of the tick. Spends the week's build points and opens the next
 * project when the yard is empty.
 *
 * Points go to the oldest work first and the remainder carries on to the next,
 * so a week that finishes a house does not throw away what was left over. A
 * project opened this week is worked on this week: the village does not stand
 * around for a tick after deciding.
 */
export function advanceWorks(state: GameState, buildPoints: number): BuiltEvent[] {
  if (state.works.length === 0 && !noProjectStillApplies(state)) {
    const project = nextProject(state);
    if (project === null) NO_PROJECT.set(state, projectSnapshot(state));
    else {
      NO_PROJECT.delete(state);
      open(state, project);
    }
  }

  let left = Math.max(0, buildPoints);
  const built: BuiltEvent[] = [];
  for (const work of [...state.works].sort((a, b) => a.startedTick - b.startedTick || a.id - b.id)) {
    if (left <= 0) break;
    const needed = work.bpCost - work.bpDone;
    const spent = Math.min(left, needed);
    work.bpDone += spent;
    left -= spent;
    if (work.bpDone >= work.bpCost) built.push(complete(state, work));
  }

  state.works = state.works.filter((w) => w.bpDone < w.bpCost);
  return built;
}
