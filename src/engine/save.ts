// M-23 · Save format and the catch-up that follows loading one. design.md §13.

import { ANIMALS, BUILDINGS, TIME } from './balance';
import { CATALOG } from './crossroads/catalog';
import { foundGame } from './found';
import { population } from './people/demography';
import { hash32, RNG_STREAMS } from './rng';
import { tick } from './sim';
import { herdCapacity } from './subsistence/herd';
import { HERD_KINDS, SCHEMA_VERSION } from './state';
import type { ArchivedGame, DecisionRecord, GameState, Herd, SaveFile } from './state';
import { SEASONS } from './time';

/** The schema this build writes and reads. §13.1. */
export { SCHEMA_VERSION } from './state';

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

const ENDS = new Set(['extinction', 'abandoned', 'dispersed']);
const ROLES = new Set(['leader', 'smith', 'midwife', 'priest', 'woodward', 'reeve', 'herbalist', 'stranger']);
const TRAITS = new Set([
  'ambitious', 'devout', 'spiteful', 'craven', 'generous', 'stubborn', 'cunning', 'kind',
  'hot_tempered', 'frail', 'hardy', 'greedy', 'loyal', 'proud', 'secretive',
]);
const DEATHS = new Set(['natural', 'old_age', 'hunger', 'cold', 'plague', 'fire', 'violence']);
const MEMORIES = new Set([
  'lost_child', 'was_blamed', 'was_saved', 'was_passed_over', 'went_hungry',
  'lost_home', 'stole', 'unspoken',
]);
const OPS = new Set(['<', '<=', '>', '>=', '==']);
// §8.2's two closed name domains. `stat` is `StatName` plus the derived
// headcount; `ratio` is exactly what `ratioOf` can compute. A name outside
// either is not old content, it is content the engine cannot read: the
// comparison would run against `undefined` and the condition would answer
// something no template ever meant (v2.81).
const STATS = new Set(['people', 'grain', 'wood', 'morale', 'faith']);
const RATIOS = new Set(['grainYears', 'grainToHarvest', 'housingFree', 'forestLeft']);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function tickValue(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0;
}

function uint32(value: unknown): value is number {
  return tickValue(value) && (value as number) <= 0xffff_ffff;
}

function nullableTick(value: unknown): boolean {
  return value === null || tickValue(value);
}

function chronicleEntry(value: unknown): boolean {
  if (!record(value) || !tickValue(value['tick']) || typeof value['kind'] !== 'string'
    || typeof value['templateKey'] !== 'string' || ![1, 2, 3].includes(value['weight'] as number)
    || !record(value['params'])) return false;
  return Object.values(value['params']).every((item) => typeof item === 'string' || finite(item));
}

function catalogueTemplate(id: unknown) {
  return typeof id === 'string' ? CATALOG.find((template) => template.id === id) : undefined;
}

function catalogueOption(templateId: unknown, optionId: unknown) {
  const template = catalogueTemplate(templateId);
  return typeof optionId === 'string'
    ? template?.options.find((option) => option.id === optionId)
    : undefined;
}

function cast(value: unknown, letters: readonly string[]): boolean {
  return record(value) && Object.values(value).every(tickValue)
    && letters.every((letter) => tickValue(value[letter]));
}

function decisionRecord(value: unknown): boolean {
  if (!record(value) || !tickValue(value['tick'])) return false;
  const template = catalogueTemplate(value['templateId']);
  return template !== undefined && catalogueOption(template.id, value['optionId']) !== undefined
    && cast(value['cast'], template.cast.map((part) => part.as));
}

function building(value: unknown): boolean {
  return record(value) && tickValue(value['id']) && typeof value['kind'] === 'string'
    && value['kind'] in BUILDINGS && ['x', 'y', 'builtTick'].every((key) => tickValue(value[key]))
    && tickValue(value['w']) && (value['w'] as number) > 0 && tickValue(value['h']) && (value['h'] as number) > 0
    && (value['x'] as number) + (value['w'] as number) <= 36
    && (value['y'] as number) + (value['h'] as number) <= 56
    && nullableTick(value['lostTick']) && nullableTick(value['blockedUntil'])
    && (value['tier'] === 0 || value['tier'] === 1) && typeof value['lit'] === 'boolean';
}

function work(value: unknown): boolean {
  return record(value) && tickValue(value['id']) && typeof value['kind'] === 'string'
    && value['kind'] in BUILDINGS
    && ['x', 'y', 'w', 'h', 'bpCost', 'bpDone', 'startedTick'].every((key) => finite(value[key]))
    && typeof value['materialsPaid'] === 'boolean'
    && (value['upgradeOf'] === null || tickValue(value['upgradeOf']));
}

function memory(value: unknown): boolean {
  return record(value) && tickValue(value['tick']) && MEMORIES.has(value['kind'] as string)
    && (value['aboutId'] === null || tickValue(value['aboutId'])) && finite(value['weight']);
}

function grudge(value: unknown): boolean {
  return record(value) && tickValue(value['fromId']) && tickValue(value['toId'])
    && MEMORIES.has(value['cause'] as string) && tickValue(value['causeTick'])
    && tickValue(value['formedTick']) && nullableTick(value['healedTick']);
}

function villager(value: unknown): boolean {
  return record(value) && tickValue(value['id']) && typeof value['name'] === 'string'
    && typeof value['named'] === 'boolean' && (value['role'] === null || ROLES.has(value['role'] as string))
    && typeof value['female'] === 'boolean' && Number.isInteger(value['bornTick'])
    && nullableTick(value['diedTick']) && (value['causeOfDeath'] === null || DEATHS.has(value['causeOfDeath'] as string))
    && nullableTick(value['leftTick']) && Array.isArray(value['traits'])
    && value['traits'].every((item) => TRAITS.has(item as string))
    && (value['homeId'] === null || tickValue(value['homeId']))
    && Array.isArray(value['parentIds']) && value['parentIds'].length === 2
    && value['parentIds'].every((item) => item === null || tickValue(item))
    && Array.isArray(value['memories']) && value['memories'].every(memory) && record(value['opinions'])
    && Object.values(value['opinions']).every(finite);
}

function condition(value: unknown): boolean {
  if (value === null) return true;
  if (!record(value) || typeof value['k'] !== 'string') return false;
  switch (value['k']) {
    case 'stat': return STATS.has(value['stat'] as string) && OPS.has(value['op'] as string) && finite(value['v']);
    case 'ratio': return RATIOS.has(value['ratio'] as string) && OPS.has(value['op'] as string) && finite(value['v']);
    // `minWeek` is the week WITHIN the season (§8.2), so its ceiling is the
    // season itself: `weekOf(tick) % WEEKS_PER_SEASON` never reaches 12, and a
    // condition asking for week 12 of winter can only ever answer no.
    case 'season': return (SEASONS as readonly string[]).includes(value['season'] as string)
      && (value['minWeek'] === undefined
        || (tickValue(value['minWeek']) && (value['minWeek'] as number) < TIME.WEEKS_PER_SEASON));
    case 'year': return OPS.has(value['op'] as string) && finite(value['v']);
    case 'has': return typeof value['building'] === 'string' && value['building'] in BUILDINGS;
    case 'flag': return typeof value['flag'] === 'string' && typeof value['set'] === 'boolean';
    case 'outbreak': return typeof value['active'] === 'boolean';
    case 'role': return ROLES.has(value['role'] as string) && typeof value['alive'] === 'boolean';
    case 'grudge': return finite(value['min']);
    case 'trait': return ROLES.has(value['role'] as string) && TRAITS.has(value['trait'] as string);
    case 'not': return condition(value['c']);
    case 'any': return Array.isArray(value['cs']) && value['cs'].every(condition);
    default: return false;
  }
}

function crossroad(value: unknown): boolean {
  if (!record(value) || !tickValue(value['posedTick'])) return false;
  const template = catalogueTemplate(value['templateId']);
  if (template === undefined || !cast(value['cast'], template.cast.map((part) => part.as))
    || !Array.isArray(value['optionIds']) || value['optionIds'].length === 0) return false;
  const optionIds = value['optionIds'];
  return new Set(optionIds).size === optionIds.length
    && optionIds.every((optionId) => catalogueOption(template.id, optionId) !== undefined);
}

function plantedSeed(value: unknown): boolean {
  if (!record(value) || typeof value['id'] !== 'string' || !tickValue(value['plantedTick'])
    || !tickValue(value['firesAtTick'])) return false;
  const template = catalogueTemplate(value['fromTemplateId']);
  const option = catalogueOption(value['fromTemplateId'], value['fromOptionId']);
  if (template === undefined || option === undefined
    || !cast(value['cast'], template.cast.map((part) => part.as))) return false;
  const prefix = `${template.id}:${option.id}:`;
  const specId = value['id'].startsWith(prefix) ? value['id'].slice(prefix.length).split(':')[0] : undefined;
  return specId !== undefined && option.seeds.some((seed) => seed.id === specId)
    && condition(value['condition']) && nullableTick(value['firedTick']) && nullableTick(value['witheredTick']);
}

function byteMap(value: unknown): boolean {
  if (!record(value) || value['width'] !== 36 || value['height'] !== 56) return false;
  const cells = 36 * 56;
  return value['terrain'] instanceof Uint8Array && value['terrain'].length === cells
    && value['traffic'] instanceof Uint16Array && value['traffic'].length === cells
    && value['path'] instanceof Uint8Array && value['path'].length === cells
    && value['ruins'] instanceof Uint8Array && value['ruins'].length === cells
    && value['forestAge'] instanceof Uint8Array && value['forestAge'].length === cells
    && value['forestStock'] instanceof Uint16Array && value['forestStock'].length === cells
    && value['terrain'].every((cell) => cell <= 5)
    && value['path'].every((cell) => cell <= 3)
    && value['ruins'].every((cell) => cell <= 1);
}

function archivedGame(value: unknown): boolean {
  return record(value) && uint32(value['seed']) && uint32(value['terrainSeed'])
    && tickValue(value['endedTick']) && ENDS.has(value['cause'] as string)
    && tickValue(value['peakPeople']) && Array.isArray(value['chronicle'])
    && value['chronicle'].every(chronicleEntry) && value['ruins'] instanceof Uint8Array
    && value['ruins'].length === 36 * 56 && value['ruins'].every((cell) => cell <= 1);
}

/** Reject every persisted shape the running engine or renderer cannot consume. */
function isPlausibleState(value: unknown): value is GameState {
  if (!record(value)) return false;
  const s = value;
  const rng = s['rng'];
  const village = s['village'];
  const people = s['people'];
  const weather = s['weather'];
  const outbreak = s['outbreak'];
  const ended = s['ended'];
  const modifier = s['harvestModifier'];
  return (
    s['version'] === SCHEMA_VERSION && uint32(s['seed']) && uint32(s['terrainSeed'])
    && tickValue(s['tick']) && tickValue(s['peakPeople'])
    && record(rng) && RNG_STREAMS.every((stream) => uint32(rng[stream]))
    && byteMap(s['map'])
    && record(village) && ['grain', 'wood', 'morale', 'faith'].every((key) => finite(village[key]))
    && record(s['herd']) && HERD_KINDS.every((kind) => tickValue((s['herd'] as Record<string, unknown>)[kind]))
    && finite(s['crowBite']) && (s['crowBite'] as number) >= 0
    && record(people) && Array.isArray(people['villagers']) && people['villagers'].every(villager)
    && tickValue(people['nextId']) && Array.isArray(people['namedIds']) && people['namedIds'].every(tickValue)
    && Array.isArray(people['grudges']) && people['grudges'].every(grudge)
    && Array.isArray(s['buildings']) && s['buildings'].every(building)
    && Array.isArray(s['works']) && s['works'].every(work)
    && (s['crossroad'] === null || crossroad(s['crossroad']))
    && Array.isArray(s['seeds']) && s['seeds'].every(plantedSeed)
    && record(s['flags']) && Object.values(s['flags']).every(tickValue)
    && Array.isArray(s['chronicle']) && s['chronicle'].every(chronicleEntry)
    && Array.isArray(s['history']) && s['history'].every(decisionRecord)
    && record(weather) && tickValue(weather['year']) && tickValue(weather['index']) && finite(weather['factor'])
    && (outbreak === null || (record(outbreak) && tickValue(outbreak['startedTick'])
      && tickValue(outbreak['endsTick']) && tickValue(outbreak['deaths'])))
    && nullableTick(s['dwindlingSince']) && tickValue(s['noOneStreak'])
    && (modifier === null || (record(modifier) && finite(modifier['factor']) && tickValue(modifier['harvests'])))
    && (ended === null || (record(ended) && tickValue(ended['tick'])
      && ENDS.has(ended['cause'] as string) && (ended['lastId'] === null || tickValue(ended['lastId']))))
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
  } else if (candidate.schema !== SCHEMA_VERSION && candidate.schema !== 2) {
    throw new Error(`Save file schema ${candidate.schema} is not one this build can read.`);
  }

  // 2 -> 3 (§7.7, v2.91 and v2.93): the herd, its own random stream, and the
  // crows' running bite. Additive, like
  // every migration §13.1 allows. The herd starts at what its buildings can
  // hold, because that is exactly what the valley was already drawing before
  // the herd was state: the animals the player could see become the animals
  // the village has. The stream is derived from the master seed the same way
  // every other one is, so a migrated game stays reproducible.
  if (candidate.schema !== SCHEMA_VERSION || (state as Partial<GameState>).herd === undefined) {
    const withStream = {
      ...state,
      version: SCHEMA_VERSION,
      rng: {
        ...state.rng,
        animals: state.rng.animals ?? hash32(state.seed, 'animals'),
        murrain: state.rng.murrain ?? hash32(state.seed, 'murrain'),
        traders: state.rng.traders ?? hash32(state.seed, 'traders'),
        quarrels: state.rng.quarrels ?? hash32(state.seed, 'quarrels'),
      },
    };
    const capacity = herdCapacity(withStream as GameState);
    const herd: Herd = {
      hens: Math.min(capacity.hens, ANIMALS.HENS_PER_HOUSE * ANIMALS.MAX_PER_KIND),
      pigs: capacity.pigs,
      cows: capacity.cows,
    };
    state = { ...withStream, herd: (state as Partial<GameState>).herd ?? herd } as GameState;
  }
  // The crows' bite starts at zero on a migrated game: a village cannot owe
  // last year's birds a harvest it already reaped.
  if ((state as Partial<GameState>).crowBite === undefined) {
    state = { ...state, crowBite: 0 } as GameState;
  }
  if (!isPlausibleState(state)) throw new Error('Save file has no valid state.');
  if (!archive.every(archivedGame)) throw new Error('Save file has no valid archive.');
  if (!(candidate.decisions as unknown[]).every(decisionRecord)) {
    throw new Error('Save file has no valid decision record.');
  }

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
