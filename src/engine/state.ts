// M-02 · The common contract. design.md §3, §13.1.
//
// Types and nothing else: no logic, no functions, no values. Every other module
// is written against these names, so a name changed here changes five modules.
//
// The state is flat and serializable (design.md §2.3): no classes, no Map, no
// Set, no circular references. Objects, arrays and references by id. That is
// what makes saving a structuredClone and comparing two games a diff.

import type { RngBundle } from './rng';

// ---------------------------------------------------------------------------
// §3.2 · Time
// ---------------------------------------------------------------------------

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface Clock {
  tick: number; // absolute week since the founding
  week: number; // 0..47 within the year
  year: number; // 0..N
  season: Season;
  seasonWeek: number; // 0..11
}

// ---------------------------------------------------------------------------
// §3.3 · Village statistics
// ---------------------------------------------------------------------------

/**
 * Exactly five. A sixth requires changing design.md §3.3.
 * ('people' is not stored: it is people.villagers.filter(alive).length.)
 */
export interface VillageStats {
  grain: number; // units. 1 unit = 1 person · 1 week
  wood: number; // units
  morale: number; // 0..100
  faith: number; // 0..100
}

/** The four statistics an effect can move. design.md §8.4. */
export type StatName = 'grain' | 'wood' | 'morale' | 'faith';

// ---------------------------------------------------------------------------
// §3.4 · People
// ---------------------------------------------------------------------------

export type VillagerId = number;

export type Role =
  | 'leader'
  | 'smith'
  | 'midwife'
  | 'priest'
  | 'woodward'
  | 'reeve'
  | 'herbalist'
  | 'stranger';

export type Trait =
  | 'ambitious'
  | 'devout'
  | 'spiteful'
  | 'craven'
  | 'generous'
  | 'stubborn'
  | 'cunning'
  | 'kind'
  | 'hot_tempered'
  | 'frail'
  | 'hardy'
  | 'greedy'
  | 'loyal'
  | 'proud'
  | 'secretive';

/**
 * How a villager died. Content identifiers: stable forever, they are written
 * into saved games (design.md §2.2). Sources: §5.8 plague, §5.9 fire, §6.5 age,
 * starvation and cold, §8.4 the `kill` effect of a crossroad.
 */
export type DeathCause = 'age' | 'starvation' | 'cold' | 'plague' | 'fire' | 'crossroad';

/**
 * What a named villager remembers. design.md §3.4 names the first three and
 * §6.4 the events that write them; M-07 and M-09 extend this union as the
 * catalogue grows. Content identifiers: stable forever.
 */
export type MemoryKind =
  | 'lost_child'
  | 'was_blamed'
  | 'was_saved'
  | 'was_passed_over' // §6.6: the succession they did not win
  | 'went_hungry'
  | 'lost_home';

export interface Villager {
  id: VillagerId;
  name: string; // 'Aelric' — only the named have this non-empty
  named: boolean;
  role: Role | null;
  female: boolean;
  bornTick: number;
  diedTick: number | null;
  causeOfDeath: DeathCause | null;
  traits: Trait[]; // 3..4, only on the named
  homeId: BuildingId | null;
  parentIds: [VillagerId | null, VillagerId | null];
  memories: Memory[]; // only on the named, max 12
  opinions: Record<VillagerId, number>; // -100..100, only between the named
}

export interface Memory {
  tick: number;
  kind: MemoryKind;
  aboutId: VillagerId | null;
  weight: number; // 1..5, decays with the years
}

/**
 * A grudge. Born when an opinion crosses -50, with its cause on record
 * (design.md §3.4, §6.4). Stored rather than derived from `opinions` because
 * the cause and the tick are what the feud templates quote.
 */
export interface Grudge {
  fromId: VillagerId;
  toId: VillagerId;
  cause: MemoryKind;
  causeTick: number; // when the thing that caused it happened
  formedTick: number; // when the opinion crossed -50
  healedTick: number | null; // set when the opinion climbs back above -20
}

export interface PeopleState {
  villagers: Villager[]; // includes the dead; nobody is ever removed
  nextId: VillagerId;
  namedIds: VillagerId[]; // alive and named, max 8
  grudges: Grudge[]; // append-only, same discipline as villagers
}

// ---------------------------------------------------------------------------
// §3.5 · The valley
// ---------------------------------------------------------------------------

export type Terrain = 'meadow' | 'forest' | 'water' | 'rock' | 'marsh' | 'cleared';

export interface ValleyMap {
  width: 36;
  height: 56;
  terrain: Uint8Array; // 36*56, index = y*36 + x
  traffic: Uint16Array; // accumulated wear per cell
  path: Uint8Array; // 0 none, 1 trodden, 2 track, 3 road
  ruins: Uint8Array; // 0 none, 1 ruin; permanent
  forestAge: Uint8Array; // years since felling, for the regrowth
}

export type BuildingId = number;

export type BuildingKind =
  | 'house'
  | 'field'
  | 'granary'
  | 'chapel'
  | 'smithy'
  | 'well'
  | 'mill'
  | 'palisade'
  | 'wall'
  | 'church'
  | 'stone_house'
  | 'watchtower'
  | 'grave_yard';

export interface Building {
  id: BuildingId;
  kind: BuildingKind;
  x: number;
  y: number; // top-left corner
  w: number;
  h: number;
  builtTick: number;
  lostTick: number | null; // if !== null, it is a ruin
  tier: 0 | 1; // 0 wood, 1 stone
  lit: boolean; // the smithy goes dark if the smith takes offence
}

/**
 * A building under construction. Step 6 of the tick advances these and
 * completes the ones that reach their cost (design.md §4.2, §7.2).
 */
export interface ConstructionWork {
  id: number;
  kind: BuildingKind;
  x: number;
  y: number;
  w: number;
  h: number;
  bpCost: number; // build points, from BUILDINGS
  bpDone: number;
  materialsPaid: boolean; // wood, and stone for tier 1, are paid up front
  startedTick: number;
  upgradeOf: BuildingId | null; // §7.3 point 9: the stone upgrades
}

// ---------------------------------------------------------------------------
// §3.6 · Crossroads and seeds
// ---------------------------------------------------------------------------

export interface PendingCrossroad {
  templateId: string;
  posedTick: number;
  cast: Record<string, VillagerId>; // 'A' -> 17
  optionIds: string[];
}

export interface PlantedSeed {
  id: string;
  fromTemplateId: string;
  fromOptionId: string;
  plantedTick: number;
  firesAtTick: number;
  cast: Record<string, VillagerId>;
  condition: Condition | null; // if it fails when due, the seed withers
}

export interface DecisionRecord {
  tick: number;
  templateId: string;
  optionId: string;
  cast: Record<string, VillagerId>;
}

/** What the player hands to the tick. The recorded form is DecisionRecord. */
export interface Decision {
  templateId: string;
  optionId: string;
}

// ---------------------------------------------------------------------------
// §8.2 · The condition DSL
//
// It lives here, and not in crossroads/schema.ts, because PlantedSeed above
// depends on it: the other direction would make state.ts and schema.ts import
// each other. Everything else of §8 is in schema.ts, which imports from here.
//
// Data, not functions. Serializable, so that why a crossroad fired can be
// inspected after the fact.
// ---------------------------------------------------------------------------

export type Op = '<' | '<=' | '>' | '>=' | '==';

export type Condition =
  | { k: 'stat'; stat: StatName | 'people'; op: Op; v: number }
  | { k: 'ratio'; ratio: 'grainYears' | 'housingFree' | 'forestLeft'; op: Op; v: number }
  | { k: 'season'; season: Season }
  | { k: 'year'; op: Op; v: number }
  | { k: 'has'; building: BuildingKind }
  | { k: 'flag'; flag: string; set: boolean }
  | { k: 'outbreak'; active: boolean }
  | { k: 'role'; role: Role; alive: boolean }
  | { k: 'grudge'; min: number } // a grudge of at least N exists
  | { k: 'trait'; role: Role; trait: Trait }
  | { k: 'not'; c: Condition }
  | { k: 'any'; cs: Condition[] };

// ---------------------------------------------------------------------------
// §3.7 · The chronicle
// ---------------------------------------------------------------------------

export type ChronicleKind =
  | 'founding'
  | 'season'
  | 'birth'
  | 'death'
  | 'harvest'
  | 'famine'
  | 'plague'
  | 'fire'
  | 'built'
  | 'lost'
  | 'arrival'
  | 'departure'
  | 'grudge'
  | 'succession'
  | 'crossroad_posed'
  | 'crossroad_taken'
  | 'consequence'
  | 'extinction';

/**
 * The chronicle stores keys and parameters, never prose. The text is composed
 * when shown, so the text bank can be rewritten without invalidating saved
 * games, and translated without touching the engine.
 */
export interface ChronicleEntry {
  tick: number;
  kind: ChronicleKind;
  templateKey: string; // key into the text bank
  params: Record<string, string | number>;
  weight: 1 | 2 | 3; // 3 = headline of the generation
}

// ---------------------------------------------------------------------------
// Weather, outbreak, ending
// ---------------------------------------------------------------------------

/**
 * The weather is drawn once a year, in week 0 (design.md §4.2 step 2), from the
 * WEATHER table of §12.3. The factor multiplies the harvest.
 */
export interface YearWeather {
  year: number;
  index: number; // index into balance WEATHER
  factor: number; // the `f` of that row
}

/** An active plague. design.md §5.8. Lasts 6–10 weeks. */
export interface Outbreak {
  startedTick: number;
  endsTick: number;
  deaths: number; // running count, for the chronicle
}

/**
 * The end of a game. Only population zero ends it (design.md §1): never a
 * statistic, never an absence.
 */
export interface EndState {
  tick: number;
  cause: 'extinction';
  lastId: VillagerId | null; // the last to die, quoted by the chronicle
}

// ---------------------------------------------------------------------------
// §3.1 · Root state
// ---------------------------------------------------------------------------

export interface GameState {
  readonly version: number; // save schema version
  readonly seed: number; // master seed
  tick: number; // weeks since the founding
  rng: RngBundle; // state of the random streams
  map: ValleyMap;
  village: VillageStats;
  people: PeopleState;
  buildings: Building[];
  works: ConstructionWork[]; // works in progress
  crossroad: PendingCrossroad | null;
  seeds: PlantedSeed[]; // deferred consequences
  flags: Record<string, number>; // state flags, value = expiry tick (0 = permanent)
  chronicle: ChronicleEntry[];
  history: DecisionRecord[]; // record of the player's decisions
  weather: YearWeather;
  outbreak: Outbreak | null;
  ended: EndState | null;
}

// ---------------------------------------------------------------------------
// §13.1 · Save format
// ---------------------------------------------------------------------------

/**
 * A finished village. Its chronicle and the mask of its buildings survive into
 * the next game, which seeds them into map.ruins (design.md §13.3). The ruins
 * have no mechanical effect: they are there to be seen.
 */
export interface ArchivedGame {
  seed: number;
  endedTick: number;
  cause: EndState['cause'];
  peakPeople: number;
  chronicle: ChronicleEntry[];
  ruins: Uint8Array; // building mask, 36*56
}

/**
 * Both the snapshot and the record, on purpose (design.md §13.1). The snapshot
 * is the truth and survives a balance change; the record replays the game from
 * the seed to debug it. Keeping only the record would be elegant and fragile:
 * touch one number of §12 and every saved game diverges.
 */
export interface SaveFile {
  schema: number; // schema version
  savedAtMs: number; // wall clock, to work out the absence
  state: GameState; // full snapshot, authoritative
  decisions: DecisionRecord[]; // parallel record, to debug and migrate
  archive: ArchivedGame[]; // chronicles of previous games and their ruins
}
