// M-23 · Save format and the catch-up that follows loading one. design.md §13.

import { ANIMALS, BUILDINGS, TIME, WORLD } from './balance';
import { CATALOG, RETIRED_TEMPLATES } from './crossroads/catalog';
import { foundGame } from './found';
import { population } from './people/demography';
import { hash32, RNG_STREAMS } from './rng';
import { tick } from './sim';
import { herdCapacity } from './subsistence/herd';
import { HAPPENINGS, HERD_KINDS, MEANS_IDS, SCHEMA_VERSION, TERRAIN_CODE, valleyTraits } from './state';
import { choosePlaza } from './world/plaza';
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

const ENDS = new Set(['extinction', 'abandoned', 'dispersed', 'stormed']);
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
const STATS = new Set(['people', 'grain', 'wood', 'morale', 'faith', 'stone', 'silver']); // M-0: la mesa nueva
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
  // M-0 · con las retiradas: una partida que contestó al tratante antes de que
  // fuera una oferta tiene esa decisión en su registro, y sigue siendo suya.
  return typeof id === 'string'
    ? [...CATALOG, ...RETIRED_TEMPLATES].find((template) => template.id === id)
    : undefined;
}

/** M-0 · Un bien de oferta con la forma que `world/road.ts` sabe aplicar. */
function offerGood(value: unknown): boolean {
  if (!record(value)) return false;
  if (value['k'] === 'stat') {
    return ['grain', 'wood', 'morale', 'faith', 'stone', 'silver'].includes(value['stat'] as string)
      && finite(value['amount']);
  }
  if (value['k'] === 'herd') {
    return (HERD_KINDS as readonly string[]).includes(value['kind'] as string) && finite(value['amount']);
  }
  return value['k'] === 'flag' && typeof value['flag'] === 'string' && finite(value['years']);
}

function offerValue(value: unknown): boolean {
  return record(value) && (HAPPENINGS as readonly string[]).includes(value['id'] as string)
    && Array.isArray(value['gives']) && value['gives'].every(offerGood)
    && Array.isArray(value['takes']) && value['takes'].every(offerGood)
    && tickValue(value['postedTick']) && tickValue(value['expiresTick']);
}

function actRecord(value: unknown): boolean {
  if (!record(value) || !tickValue(value['tick']) || typeof value['done'] !== 'boolean') return false;
  const act = value['act'];
  if (!record(act)) return false;
  if (act['kind'] === 'offer') return typeof act['accept'] === 'boolean';
  // M-2 · y dar un medio, con su identificador del dominio cerrado: una partida
  // guardada que nombre un medio que este build no conoce no se puede jugar.
  // K-1 · y la corona, que se da a alguien: el `who` es un id de aldeano.
  if (act['kind'] === 'crown') return tickValue(act['who']);
  return act['kind'] === 'means' && (MEANS_IDS as readonly string[]).includes(act['means'] as string);
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

/** R-1 · un suceso guardado: su tick, un id de la lista y sus efectos visibles. */
function happeningRecord(value: unknown): boolean {
  if (!record(value) || !tickValue(value['tick'])) return false;
  if (!(HAPPENINGS as readonly string[]).includes(value['id'] as string)) return false;
  return Array.isArray(value['visible']) && value['visible'].every((v) => record(v) && typeof v['k'] === 'string')
    && Array.isArray(value['who']) && value['who'].every(tickValue);
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
    && (value['x'] as number) + (value['w'] as number) <= WORLD.WIDTH
    && (value['y'] as number) + (value['h'] as number) <= WORLD.HEIGHT
    && nullableTick(value['lostTick']) && nullableTick(value['blockedUntil'])
    && (value['tier'] === 0 || value['tier'] === 1) && typeof value['lit'] === 'boolean';
}

function work(value: unknown): boolean {
  return record(value) && tickValue(value['id']) && typeof value['kind'] === 'string'
    && value['kind'] in BUILDINGS
    && ['x', 'y', 'w', 'h', 'bpCost', 'bpDone', 'stoneDone', 'startedTick'].every((key) => finite(value[key]))
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
    // B2 · si hay una partida del clan vecino en camino (§1b).
    case 'raid': return typeof value['coming'] === 'boolean';
    case 'role': return ROLES.has(value['role'] as string) && typeof value['alive'] === 'boolean';
    case 'grudge': return finite(value['min']);
    case 'herd': return (HERD_KINDS as readonly string[]).includes(value['kind'] as string)
      && OPS.has(value['op'] as string) && finite(value['v']);
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

/** Cuántos códigos de terreno existen, para el validador de abajo. */
const TERRAIN_CODES = Object.keys(TERRAIN_CODE).length;

function byteMap(value: unknown): boolean {
  // Las medidas salen de `WORLD` y no de dos números escritos aquí: con el mapa
  // grande eran 72 × 112, y un validador con el tamaño de ayer dentro rechaza
  // como corrupta cualquier partida del tamaño de hoy.
  if (!record(value) || value['width'] !== WORLD.WIDTH || value['height'] !== WORLD.HEIGHT) return false;
  const cells = WORLD.WIDTH * WORLD.HEIGHT;
  return value['terrain'] instanceof Uint8Array && value['terrain'].length === cells
    && value['traffic'] instanceof Uint16Array && value['traffic'].length === cells
    && value['path'] instanceof Uint8Array && value['path'].length === cells
    && value['ruins'] instanceof Uint8Array && value['ruins'].length === cells
    && value['forestAge'] instanceof Uint8Array && value['forestAge'].length === cells
    && value['forestStock'] instanceof Uint16Array && value['forestStock'].length === cells
    // El tope sale de la tabla y no de un número escrito a mano: con la montaña
    // y el lago del mapa grande eran seis y ocho, y un validador que se queda en
    // cinco rechaza como corrupta una partida perfectamente válida.
    && value['terrain'].every((cell) => cell < TERRAIN_CODES)
    && value['path'].every((cell) => cell <= 3)
    && value['ruins'].every((cell) => cell <= 1);
}

function archivedGame(value: unknown): boolean {
  return record(value) && uint32(value['seed']) && uint32(value['terrainSeed'])
    && tickValue(value['endedTick']) && ENDS.has(value['cause'] as string)
    && tickValue(value['peakPeople']) && Array.isArray(value['chronicle'])
    && value['chronicle'].every(chronicleEntry) && value['ruins'] instanceof Uint8Array
    && value['ruins'].length === WORLD.WIDTH * WORLD.HEIGHT && value['ruins'].every((cell) => cell <= 1);
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
    // K-1 · la corona: o no hay, o tiene quién, desde cuándo y qué era.
    && (s['crown'] === null || (record(s['crown'])
      && tickValue((s['crown'] as Record<string, unknown>)['id'])
      && tickValue((s['crown'] as Record<string, unknown>)['since'])
      && ((s['crown'] as Record<string, unknown>)['trade'] === null
        || ROLES.has(String((s['crown'] as Record<string, unknown>)['trade'])))))
    // P-1 · la plaza. Se comprueba aquí y no en la migración porque la
    // migración ya ha corrido: a este punto llega con plaza o no llega.
    && record(s['plaza'])
    && finite((s['plaza'] as Record<string, unknown>)['x'])
    && finite((s['plaza'] as Record<string, unknown>)['y'])
    && record(village) && ['grain', 'wood', 'morale', 'faith', 'stone', 'silver'].every((key) => finite(village[key]))
    && record(s['herd']) && HERD_KINDS.every((kind) => tickValue((s['herd'] as Record<string, unknown>)[kind]))
    // La postura. Se comprueba que sea finita y no que esté en rango:
    // `allocateLabour` ya la recorta, y rechazar una partida entera por una
    // palanca fuera de sitio sería perder la aldea por un número.

    && Array.isArray(s['traits']) && s['traits'].every((one) => typeof one === 'string')
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
    && Array.isArray(s['happenings']) && s['happenings'].every(happeningRecord)
    && (s['offer'] === null || offerValue(s['offer']))
    && Array.isArray(s['acts']) && s['acts'].every(actRecord)
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
  } else if (candidate.schema !== SCHEMA_VERSION && ![2, 3, 6, 7, 8, 9, 10].includes(candidate.schema)) {
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
        minds: state.rng.minds ?? hash32(state.seed, 'minds'),
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
  // 3 -> 4 y su parche **se retiran en K-7**: `state.intent` ya no existe.
  //
  // Y con ello **la única excepción a §13.1 de toda la fase del rey**: una
  // partida de la v2.0 con una palanca puesta (`priority` distinto de `none`, o
  // `fields` distinto de 1) cambia de postura al cargarla, porque la palanca no
  // existe. Desde M-4 la interfaz no puede escribirla —la hoja de órdenes está
  // borrada— así que sólo afecta a guardados de antes de M-2.

  // Y los rasgos del valle (E5). Se **derivan** de la semilla del terreno en vez
  // de entrar vacíos: el valle de una partida guardada siempre tuvo esos rasgos,
  // se hubieran guardado o no, así que ponerlos es recordar y no cambiar. Es la
  // misma razón por la que el sorteo es una función pura de la semilla.
  // 10 -> 11 (B1, §1b): el clan del valle vecino y su flujo de azar. Aditiva.
  // **Entra a cero, y no a lo que le tocaría por los años que lleva la
  // partida**: el clan es gente que se junta, no una cuenta que corre sola, y
  // una aldea que se cargó antes de que esto existiera no tuvo vecinos
  // armándose. Empezar de cero le da los años de gracia que tuvo cualquier
  // valle nuevo, que es lo contrario de castigarla por ser vieja.
  if ((state as Partial<GameState>).threat === undefined) {
    state = {
      ...state,
      rng: { ...state.rng, raid: state.rng.raid ?? hash32(state.seed, 'raid') },
      threat: { strength: 0, comingTick: null, comingBand: 0, raids: 0, arrivedTick: null, lastBand: 0 },
    } as GameState;
  }
  if ((state as Partial<GameState>).traits === undefined) {
    state = { ...state, traits: valleyTraits(state.terrainSeed) };
  }
  // 6 -> 7 (M-0): piedra, plata, la oferta del camino y los actos del jugador.
  //
  // Todo entra a cero, y es recordar y no cambiar: antes del esquema 7 la
  // piedra no estaba en ningún montón —se cobraba dentro de la obra— y la plata
  // no existía. Una obra de piedra ya abierta sigue su curso con los puntos que
  // se le calcularon al abrirla. Y una encrucijada de comercio pendiente se
  // retira: esas plantillas ya no se plantean, y una pregunta que la pantalla
  // no sabe abrir se quedaría esperando para siempre, que es lo que §8.6
  // prohíbe (sólo una a la vez).
  if ((state as Partial<GameState>).acts === undefined) {
    const village = state.village as Partial<GameState['village']>;
    const retired = state.crossroad !== null
      && RETIRED_TEMPLATES.some((template) => template.id === state.crossroad?.templateId);
    state = {
      ...state,
      version: SCHEMA_VERSION,
      village: { ...state.village, stone: village.stone ?? 0, silver: village.silver ?? 0 },
      offer: null,
      acts: [],
      crossroad: retired ? null : state.crossroad,
      // Una obra en vuelo **ya pagó su piedra**: hasta el esquema 6 iba dentro
      // de su `bpCost` (`bp + piedra / STONE_PER_BP`) y su `bpDone` lleva la
      // cuenta. Entra con la piedra puesta, así que le queda exactamente el
      // trabajo que le quedaba; si entrara a cero, la aldea pagaría dos veces.
      works: state.works.map((work) => ({
        ...work,
        stoneDone: work.stoneDone ?? BUILDINGS[work.kind].stone,
      })),
    } as GameState;
  }
  // 7 -> 8 (P-1): la plaza.
  //
  // **Se deriva, y eso es recordar y no cambiar.** `choosePlaza` la busca al
  // lado de la casa fundadora —la primera que se levantó, que sigue en la lista
  // aunque se haya quemado—, así que una partida guardada recibe la plaza que
  // habría tenido si la regla hubiera existido el día que se fundó.
  //
  // Lo que **no** hace la migración es tirar nada: en un valle ya construido
  // puede haber casas dentro del círculo, y se quedan. La reserva sólo prohíbe
  // levantar de nuevo (`world/placement.ts`), que es lo que §13.1 permite:
  // cargar una partida no puede demoler la aldea del jugador.
  if ((state as Partial<GameState>).plaza === undefined) {
    state = { ...state, version: SCHEMA_VERSION, plaza: choosePlaza(state) } as GameState;
  }
  // 8 -> 9 (P-4): el anillo de muralla.
  //
  // Entra **vacío**, y es recordar y no cambiar: una partida guardada levantó su
  // empalizada sobre la envolvente del núcleo, pieza a pieza, así que no tiene
  // ningún anillo que recordar. Lo que ya está construido se queda donde está
  // —§13.1 no deja que cargar demuela nada— y el primer tramo nuevo fija el
  // primer anillo alrededor de la plaza.
  if ((state as Partial<GameState>).ring === undefined) {
    state = { ...state, version: SCHEMA_VERSION, ring: null } as GameState;
  }
  // 9 -> 10 (K-1): la corona.
  //
  // Entra **vacía**, y es recordar y no cambiar: una partida guardada tenía un
  // jefe que no ejercía ninguna voluntad, que es exactamente lo que
  // `will(state)` devuelve con `crown === null` —la voluntad de reposo, o sea
  // las mismas constantes que el reparto de manos y la cola de obras leían—. La
  // aldea sigue haciendo lo mismo el tick siguiente a cargarla (§13.1), y el
  // jugador puede coronar a quien quiera cuando quiera.
  if ((state as Partial<GameState>).crown === undefined) {
    state = { ...state, version: SCHEMA_VERSION, crown: null } as GameState;
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

/**
 * Cuántos ticks debe una ausencia de este tiempo, con el tope de §12.
 *
 * **`speed` es la velocidad a la que corría el juego** (v3.72). Por omisión ×1,
 * que es lo único que un arranque en frío puede suponer: el guardado no lleva
 * la velocidad. Una pestaña que se oculta sí sabe a qué iba, y ahí la ausencia
 * vale lo que habría valido mirándola —a ×16, catorce minutos fuera son
 * dieciséis semanas y no una—. El tope sigue siendo una generación de **tiempo
 * de aldea**, así que se aplica después de multiplicar: por deprisa que fuera,
 * nadie vuelve a más de novecientos sesenta ticks de distancia.
 */
export function ticksOwed(elapsedMs: number, speed = 1): number {
  const lived = Math.max(0, elapsedMs) * Math.max(0, speed);
  const capped = Math.min(lived, TIME.LETHARGY_CAP_MS);
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
