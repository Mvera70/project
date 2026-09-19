// M-02 · The common contract. design.md §3, §13.1.
//
// Types and nothing else: no logic, no functions, no values. Every other module
// is written against these names, so a name changed here changes five modules.
//
// The state is flat and serializable (design.md §2.3): no classes, no Map, no
// Set, no circular references. Objects, arrays and references by id. That is
// what makes saving a structuredClone and comparing two games a diff.

import { hash32 } from './rng';
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
  /**
   * M-0 · **La piedra es una existencia**, no trabajo escondido.
   *
   * Hasta el esquema 6 se cobraba como puntos de obra (`bp + stone /
   * STONE_PER_BP`) y nunca estaba en ningún sitio: la capa de vida enseñaba la
   * cantera y el acarreo, y el motor era el único que no la contaba. Se cantea
   * con los mismos puntos y al mismo cambio (`world/works.ts`), así que el
   * trabajo total de una obra de piedra no se mueve; lo que cambia es que el
   * montón existe, se ve y se puede gastar en otra cosa.
   */
  stone: number;
  /**
   * M-0 · **La plata: lo único que viene de fuera del valle.**
   *
   * Entra vendiendo a quien pasa por el camino y sale comprándole lo que el
   * valle no sabe hacer, y con el diezmo del señor. No se produce dentro: por
   * eso es la que hace que el camino importe (`docs/plan-medios.md` §6.3).
   */
  silver: number;
}

/** The statistics an effect can move. design.md §8.4; stone and silver since M-0. */
export type StatName = 'grain' | 'wood' | 'morale' | 'faith' | 'stone' | 'silver';

/**
 * The village's animals, as counts. design.md §7.7.
 *
 * Counts and not individuals on purpose: the chronicle says "wolves took a
 * cow", never "wolves took Bertha's cow", so nothing needs an identity. Flat
 * numbers keep §2.3's rule that the state is serialisable without ceremony.
 */
export interface Herd {
  hens: number;
  pigs: number;
  cows: number;
}

/** The kinds, largest last: the order the village slaughters in (§7.7). */
export const HERD_KINDS = ['hens', 'pigs', 'cows'] as const;
export type HerdKind = (typeof HERD_KINDS)[number];

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

/**
 * K-1 · **La corona del valle**: quién la lleva, desde cuándo, y qué era antes.
 *
 * `trade` es el oficio que tenía el día que la recibió, y es lo que decide su
 * estilo (`people/crown.ts`): el herrero tira a la muralla, el cura a la
 * capilla. Se guarda en lugar de leerse de `villager.role` porque al coronar el
 * oficio se pierde —el rey ocupa el asiento de `leader`— y sin esto un rey
 * herrero dejaría de ser herrero en el momento de coronarlo.
 *
 * `id` puede ser de alguien muerto: entonces el trono está vacante y la corona
 * espera a la sucesión de A.15 (§6.6).
 */
export interface Crown {
  id: VillagerId;
  since: number;
  trade: Role | null;
}

/** Hacia dónde tira la aldea con ese rey. Sale del oficio, no del rasgo. */
export type CrownStyle = 'forge' | 'plough' | 'chapel' | 'court';

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
 * into saved games (design.md §2.2).
 *
 * `natural` and `old_age` are the same base mortality table (§12.4) split by
 * age, and the split is what §5.6 needs: an unexplained death — the kind a
 * village reads as a sign — is a `natural` death between 5 and 59. The same
 * death at 74 is `old_age` and explains itself.
 *
 * `cold` is not in §5.6's list of explained causes because §5.6 lists what an
 * unexplained death is NOT; freezing in a winter with no firewood explains
 * itself as plainly as hunger does, and the chronicle wants to say so.
 */
export type DeathCause =
  | 'natural' // the table took them, and they were not old (§5.6)
  | 'old_age' // the table took them, and nobody was surprised
  | 'hunger' // §5.3
  | 'cold' // §5.4, a winter with the woodpile empty
  | 'plague' // §5.8
  | 'fire' // §5.9
  | 'violence'; // §8.4, the `kill` effect of a crossroad

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
  | 'lost_home'
  | 'stole' // Annex A.1: took the lord's grain in the night
  | 'unspoken'; // a grudge whose cause nobody wrote down (§6.4)

export interface Villager {
  id: VillagerId;
  name: string; // 'Aelric' — only the named have this non-empty
  named: boolean;
  role: Role | null;
  female: boolean;
  bornTick: number;
  diedTick: number | null;
  causeOfDeath: DeathCause | null;
  leftTick: number | null; // walked out of the valley (§5.7); not dead
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

export type Terrain = 'meadow' | 'forest' | 'water' | 'rock' | 'marsh' | 'cleared'
  | 'mountain' | 'lake' | 'ford';

/**
 * How a terrain is written into `map.terrain`. §3.5.
 *
 * A serialisation contract, not a tunable — which is why it is here and not in
 * balance.ts, whose whole purpose is to be edited. The bytes of every saved
 * game depend on these values and **the order is never changed**. A new terrain
 * gets the next free number; none of the six below ever moves.
 *
 * This is the one value in a file that is otherwise types only, and it earns
 * the exception by being the thing that gives those types a meaning on disk.
 */
/**
 * Cómo se funda un valle: cuántos vienen, qué traen, qué levantan.
 *
 * `FOUNDING` de `balance.ts` es el perfil del juego —una pareja desde el 15 sep
 * 2026— y `foundGame`/`foundPeople` lo toman por defecto. El tipo existe para
 * que las pruebas de **mecánica** —repartos, oficios, opiniones, subsistencia—
 * sigan usando la fundación de veinte con la que se escribieron
 * (`tests/helpers/founding.ts`): prueban cómo se comporta una aldea, no cómo
 * nace, y una aldea de dos no tiene herrero ni cura que repartir.
 */
export interface FoundingProfile {
  readonly POPULATION: number;
  readonly ADULTS: number;
  readonly CHILDREN: number;
  readonly ELDERS: number;
  readonly GRAIN: number;
  readonly WOOD: number;
  readonly MORALE: number;
  readonly FAITH: number;
  readonly HOUSES: number;
  readonly FIELDS: number;
  readonly HERD: Readonly<Record<HerdKind, number>>;
  readonly AGE_RANGES: {
    readonly adults: readonly [number, number];
    readonly children: readonly [number, number];
    readonly elders: readonly [number, number];
  };
  readonly MIN_FERTILE_WOMEN: number;
  readonly MIN_MEN: number;
}

export const TERRAIN_CODE = {
  meadow: 0,
  forest: 1,
  water: 2,
  rock: 3,
  marsh: 4,
  cleared: 5,
  // El mapa grande, paso 1 (`docs/next-plan.md`). **Nada los genera todavía**:
  // esto es el tipo, el coste de A*, la prohibición de construir, el color y la
  // cota, con el mapa al tamaño de hoy. Se hace en un paso propio justamente
  // porque veinte ficheros miran esta tabla y unos cuantos daban por hecho que
  // los códigos eran seis; si la suite se mueve con esto puesto y nada
  // generado, ahí está el que lo daba por hecho.
  //
  // Los dos son **terreno que no produce**: ni madera, ni forraje, ni solar, y
  // A* no los cruza. Eso es lo que permite que el valle crezca sin que la
  // economía se entere — la trampa medida del brief: el bosque es una fracción
  // del mapa, así que un mapa cuatro veces mayor cuadruplicaba la madera en pie
  // y §5.4 dejaba de apretar.
  mountain: 6,
  lake: 7,
  /**
   * El vado: el paso de piedras por donde se cruza el río.
   *
   * **Es terreno y no un dibujo, y eso es un arreglo de fondo.** El río es
   * intransitable para A* (`astar.ts`), así que hasta aquí **nadie cruzaba el
   * río nunca**: una aldea con campos en las dos orillas dejaba a media aldea
   * sin ruta —medido con el mapa grande: cuatro rutas para treinta y nueve
   * personas en la semilla 7, con cincuenta y cuatro pares casa-campo a más de
   * dos celdas—. Y mientras tanto la ficción hablaba del vado en veinte sitios
   * («came up the ford road»), la crónica reunía gente ahí y el 3D dibujaba las
   * losas: todos menos el que decide por dónde se anda.
   *
   * Sigue siendo agua para la vista y para la marisma; lo que cambia es que se
   * puede pisar, pagando (`PATHING.FORD`). Y sigue sin poderse construir encima.
   */
  ford: 8,
} as const;

export interface ValleyMap {
  width: 72;
  height: 112;
  terrain: Uint8Array; // WIDTH*HEIGHT, index = y*WIDTH + x
  traffic: Uint16Array; // accumulated wear per cell
  path: Uint8Array; // 0 none, 1 trodden, 2 track, 3 road
  ruins: Uint8Array; // 0 none, 1 ruin; permanent
  forestAge: Uint8Array; // years since felling; 254 barren, 255 virgin forest
  /**
   * Wood left in each forest cell, out of WORLD.WOOD_PER_FOREST_TILE (§7.5).
   *
   * Declared deviation of M-15: §3 did not have this layer and the brief lists
   * only paths.ts, forest.ts and astar.ts. But "cada celda de bosque contiene
   * WOOD_PER_FOREST_TILE unidades" is per-cell state, and a week's felling is
   * about seven units against a cell of three hundred, so a cell is part-cut
   * for the better part of a year. Without somewhere to keep that, felling
   * either takes a whole cell a week or nothing at all.
   */
  forestStock: Uint16Array;
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
  // A2 · **el portón**: la puerta del anillo. Es un edificio y no un cálculo
  // sobre una estaca (§1b, fase 3), porque lo que viene detrás tiene que poder
  // romperlo, y lo que se rompe en este motor es un edificio.
  | 'gate'
  | 'church'
  | 'stone_house'
  | 'watchtower'
  | 'grave_yard'
  // K-4 · la sala del rey: la casa que se diferencia, y la única construcción
  // que sólo existe si alguien lleva la corona.
  | 'hall'
  // A3 · **el bastión**: una torre construida en la propia línea de muralla, no
  // al lado de ella. §7.4c prohíbe un segundo anillo (medido: 1 824 tramos
  // contra 131 casas en doce semillas), así que lo que A3 pide de verdad es
  // esto — más altura sobre el mismo cerco, no más cerco. De una pieza de
  // muralla (`upgradeOf: 'wall'`), y **1×1** y no 2×2 como la atalaya suelta:
  // una torre de dos celdas sobre un anillo de una tapa dos o tres tramos y
  // `upgradeOf` sólo da de baja uno, dejando `ringClosed` diciendo que el
  // anillo sigue cerrado cuando en realidad tiene un hueco detrás de la torre.
  | 'bastion';

export interface Building {
  id: BuildingId;
  kind: BuildingKind;
  x: number;
  y: number; // top-left corner
  w: number;
  h: number;
  builtTick: number;
  lostTick: number | null; // if !== null, it is a ruin
  /**
   * A ruin that still holds its ground. §7.4 lets a wooden ruin be built over
   * and a stone one never; this is the third case the catalogue asked for and
   * §3 did not have — burnt ground that nobody will touch for a while (A.5's
   * `the_burnt_row`). Null on everything that is not one.
   */
  blockedUntil: number | null;
  tier: 0 | 1; // 0 wood, 1 stone
  lit: boolean; // the smithy goes dark if the smith takes offence
}

/** A cell whose path level changed this tick. §7.6, M-15's report. */
export interface PathEvent {
  cell: number;
  from: 0 | 1 | 2 | 3;
  to: 0 | 1 | 2 | 3;
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
  /**
   * M-0 · La piedra que esta obra ya tiene, de la que pide (`BUILDINGS`).
   *
   * Mientras es menor que su coste, la obra **está en la cantera**: los puntos
   * de la semana se van a picar piedra al montón del valle y de ahí a la obra.
   * Es lo que hace que canteala se vea —la capa de vida lee esto para mandar
   * gente a la roca— y lo que mantiene el trabajo total igual que cuando la
   * piedra iba escondida dentro de `bpCost`.
   */
  stoneDone: number;
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
  // Append-only, the same discipline as villagers and grudges (§3.6): a seed
  // is never removed from the array. One of these two is stamped when it comes
  // due, and which one it is stays on the record.
  firedTick: number | null;
  witheredTick: number | null;
}

export interface DecisionRecord {
  tick: number;
  templateId: string;
  optionId: string;
  cast: Record<string, VillagerId>;
}

/**
 * §11.5 · Lo que una decisión —o un suceso del valle, desde R-1— cambia en la
 * pantalla. Vivía en `crossroads/schema.ts`; está aquí porque el estado guarda
 * los de cada suceso y el estado no importa del catálogo (grafo de §2).
 */
export type VisualEffect =
  | { k: 'raise'; kind: BuildingKind }
  | { k: 'ruin'; kind: BuildingKind }
  | { k: 'banner'; colour: string; years: number } // a banner over the core
  /**
   * Put a building's fire out. `who`, when given, is a cast letter (§8.1,
   * v2.62): the building is that person's own, not just any of `kind` — A.7
   * promised "B's building" and the catalogue had no way to say so.
   */
  | { k: 'douse'; kind: BuildingKind; who?: string }
  | { k: 'gather'; where: 'square' | 'chapel' | 'ford'; days: number }
  | { k: 'scar'; what: 'burnt_field' | 'grave_row' | 'felled_wood' };

/**
 * R-1 · Los sucesos del valle, en orden estable: el sorteo de `world/fate.ts`
 * recorre esta lista, y el guardado valida contra ella.
 */
export const HAPPENINGS = [
  'lightning_fire',
  'river_flood',
  'wolves_at_the_coop',
  'wedding',
  'pedlar',
  'good_catch',
  'roof_under_snow',
  'harvest_feast',
  'quarrel_in_the_square',
  'bear_in_the_wood',
  'child_lost',
  'stranger_passes',
  // M-2 · lo que los medios abren. `ale_feast` la paga el jugador y no se
  // sortea; las otras dos son las dos caras de haber prosperado: la matanza de
  // la fiesta con el corral lleno, y las ratas con el granero lleno.
  'ale_feast',
  'pig_slaughter',
  'rats_in_the_granary',
  // M-0 · las visitas del camino. No cambian el estado al salir: dejan una
  // oferta (`state.offer`) que el jugador acepta o deja pasar. El buhonero de
  // arriba también es ya una de ellas.
  'factor_visit',
  'drover_visit',
  'salt_visit',
] as const;

export type HappeningId = (typeof HAPPENINGS)[number];

/** Lo que un suceso deja en el estado para que la pantalla lo sirva (§7.10). */
export interface HappeningRecord {
  tick: number;
  id: HappeningId;
  /** Efectos visibles de §11.5, los mismos que una opción de encrucijada. */
  visible: VisualEffect[];
  /** A quién le pasó, si le pasó a alguien con nombre. */
  who: VillagerId[];
}

/** What the player hands to the tick. The recorded form is DecisionRecord. */
export interface Decision {
  templateId: string;
  optionId: string;
}

// ---------------------------------------------------------------------------
// M-0 · Lo que el jugador hace sin que nadie le pregunte
// ---------------------------------------------------------------------------

/** Una cosa que una oferta da o pide. */
export type OfferGood =
  | { k: 'stat'; stat: StatName; amount: number }
  | { k: 'herd'; kind: HerdKind; amount: number }
  | { k: 'flag'; flag: string; years: number };

/**
 * M-0 · **Alguien ha subido por el camino con un trato.**
 *
 * Es lo que las tres encrucijadas de comercio y el buhonero eran, pasado de
 * pregunta a pantalla entera a **oferta que se acepta o se deja pasar** desde
 * la voz de la bandeja (decisión del dueño del diseño, 17 sep 2026). La deja un
 * suceso de `world/fate.ts`, caduca sola, y aceptarla es un acto del jugador
 * que `tick` aplica al empezar la semana.
 */
export interface Offer {
  id: HappeningId;
  /** Lo que el valle recibe si acepta. */
  gives: OfferGood[];
  /** Lo que el valle entrega. Se comprueba al aceptar, no al ofrecer. */
  takes: OfferGood[];
  postedTick: number;
  /** El último tick en que se puede aceptar. */
  expiresTick: number;
}

/**
 * M-0 · Un acto del jugador fuera de las encrucijadas. Va por `tick`, igual que
 * una decisión, y queda en `state.acts`: el guardado sigue siendo instantánea
 * más registro, y la partida se puede reproducir byte a byte.
 *
 * Es un canal aparte de `Decision` y no una unión con ella, a propósito (y es
 * una desviación del brief de `rework.md` §4b): una semana puede traer una
 * respuesta a la encrucijada **y** una oferta aceptada, y `history` —que las
 * encrucijadas leen para no repetirse— no tiene por qué aprender a saltarse lo
 * que no es suyo.
 */
export type PlayerAct =
  | { kind: 'offer'; accept: boolean }
  // M-2 · dar un medio al valle. No dice qué hacer con él.
  | { kind: 'means'; means: MeansId }
  // K-1 · dar la corona a alguien. Tampoco dice qué hacer: dice **quién**.
  | { kind: 'crown'; who: VillagerId }
  /**
   * B4 · **Lo que el mundo hizo**: el parte de una batalla física (§1b).
   *
   * Es el único acto que no hace el jugador, y entra por aquí a propósito.
   * §1b abre una frontera —«el asalto se resuelve en físico y no es
   * determinista»— y ésta es la puerta: la capa de vida pelea la batalla con
   * Rapier, y lo que salió de ella llega al motor **como datos**, igual que
   * llega una oferta aceptada. Así el motor sigue siendo determinista *dadas
   * sus entradas*, las partidas guardadas siguen cargando byte a byte, y lo que
   * pasó en la muralla no se recalcula: se cuenta.
   *
   * Lo dijo el dueño del diseño: «el resultado entra en el motor por la misma
   * puerta por la que entra lo que hace el jugador cada semana».
   */
  | {
    kind: 'battle';
    /** Cuántos del clan quedaron en el suelo. */
    slain: number;
    /** Cuántos de los nuestros. */
    lost: number;
    /** Si llegaron a entrar. Lo único que decide si la partida acaba. */
    breached: boolean;
  };

export interface ActRecord {
  tick: number;
  act: PlayerAct;
  /** Si el motor lo llevó a cabo: una oferta que ya no se puede pagar, no. */
  done: boolean;
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
  | {
      k: 'ratio';
      ratio: 'grainYears' | 'grainToHarvest' | 'housingFree' | 'forestLeft';
      op: Op;
      v: number;
    }
  // `minWeek` is the week WITHIN the season, 0..11. §8.1 needs "deep winter"
  // and not merely "winter": the granary is fullest the week after the harvest,
  // which is the first week of winter.
  | { k: 'season'; season: Season; minWeek?: number }
  | { k: 'year'; op: Op; v: number }
  | { k: 'has'; building: BuildingKind }
  | { k: 'flag'; flag: string; set: boolean }
  | { k: 'outbreak'; active: boolean }
  | { k: 'role'; role: Role; alive: boolean }
  | { k: 'grudge'; min: number } // a grudge of at least N exists
  | { k: 'trait'; role: Role; trait: Trait }
  // v3.69 · cuántas cabezas hay en el corral. Nació de una captura: el tratante
  // de §7.8 le ofrecía «vender dos cerdos» a una pareja que tenía tres gallinas.
  | { k: 'herd'; kind: HerdKind; op: Op; v: number }
  // B2 · **Si hay una partida del clan vecino en camino** (§1b). La respuesta
  // la da `state.threat.comingTick`, que B1 pone ocho semanas antes de que
  // lleguen: ese hueco existe justamente para que se pueda preguntar aquí.
  | { k: 'raid'; coming: boolean }
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
  | 'forage' // hunting and fishing in a lean year (§7.7)
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
  | 'extinction'
  | 'abandonment'
  | 'happening' // R-1: un suceso del valle (§7.10), sin decisión detrás
  // M-0 · lo que se cierra en el camino: un trato hecho, uno que se fue, el
  // diezmo. **No es un `happening`** y la diferencia importa: un suceso le pasa
  // al valle y queda en `state.happenings`, y esto es lo que el valle **hizo**
  // con lo que le pasó. Contarlo como suceso descuadraba la cuenta de R-1 (una
  // prueba compara las dos listas) y le pedía tres frases a una línea de
  // contabilidad.
  | 'road'
  // M-2 · lo que el jugador metió en el valle. No es un suceso: es un acto, y
  // la crónica lo cuenta como lo que es.
  | 'means'
  // B1 · el clan del valle vecino (§1b). **Tampoco es un `happening`**, y por
  // el mismo motivo que `road`: un suceso de R-1 le pasa al valle y queda en
  // `state.happenings`, y esto es gente que baja de la ladera de al lado. Una
  // prueba compara las dos listas y contarlo como suceso las descuadra.
  | 'raid';

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
  /**
   * `extinction` — the last of them died.
   * `abandoned` — §5.7: too few for too long, and the rest walked out.
   * `dispersed` — Annex A.15, v2.22: refused a leader three times running,
   *   with nobody appointed in between, and gave up on the valley.
   * `stormed` — §1b, B3 (18 sep 2026): the neighbouring clan got in and broke
   *   it. **The only end that somebody else causes**, and the reason the goal
   *   of the project is "a walled village that falls or holds": the first three
   *   are a valley running out, this one is a valley taken. The owner's own
   *   words: "cuando la aldea muera tiene que ser que el ejército rival
   *   consiga entrar y rompa todo".
   *
   * The first three leave the valley at zero, which was the only way §1 allowed
   * a game to be lost until the siege existed. They are told apart because the
   * chronicle has to say which: a failed settlement is not a village that
   * starved, a valley that talked itself out of having anyone in charge is not
   * one that simply dwindled, and none of them is a valley that was stormed.
   */
  cause: 'extinction' | 'abandoned' | 'dispersed' | 'stormed';
  lastId: VillagerId | null; // the last to die, quoted by the chronicle
}

// ---------------------------------------------------------------------------
// The tick context and what the systems report
//
// TickContext carries what one step of the tick computed and the next steps
// read. Demography consumes it; M-06 produces it. Passing it explicitly is what
// keeps step 12 from having to recompute the hunger of step 7.
// ---------------------------------------------------------------------------

export interface TickContext {
  severity: number; // 0..1, this week's hunger (§5.3)
  cold: boolean; // winter with the firewood gone (§5.4)
  outbreak: Outbreak | null; // the running plague, if any (§5.8)
  /**
   * Deaths recorded so far this tick, which §5.5 charges to morale.
   *
   * MOOD is step 11 and DEATHS is step 12 (§4.2), so what mood can see are the
   * deaths of steps 3, 4 and 7 — crossroads, seeds and starvation. M-10 fills
   * these from the tick's event buffer.
   */
  deaths: number;
  /** Of those, the ones with no worldly explanation. §5.6, see mood.ts. */
  unexplainedDeaths: number;
}

/**
 * How the week's labour was split. §5.2. Produced by M-06 in step 5 and read by
 * steps 6 and 9; M-10 carries it between them.
 */
export interface Allocation {
  workforce: number; // W
  workedFields: number; // capped at what the village actually needs
  farmers: number;
  cutters: number;
  builders: number;
  /** Hands sent to the woods and the river when the granary is low (§7.7). */
  hunters: number;
  fishers: number;
  /** Hands standing in the fields keeping the crows off the grain (§7.7). */
  wardens: number;
  labourFactor: number; // 0..1, how well the worked fields were manned
}

export interface HarvestResult {
  happened: boolean; // false every week that is not HARVEST_WEEK
  yielded: number;
  workedFields: number;
  weatherFactor: number;
  labourFactor: number;
}

/**
 * A fire that broke out. §5.9. Nothing has been destroyed yet: M-14 owns the
 * buildings and executes this once it exists.
 */
export interface FireResult {
  buildingId: BuildingId;
  kind: BuildingKind;
  grainLost: number;
  moraleDelta: number;
}

export interface DeathEvent {
  id: VillagerId;
  cause: DeathCause;
  age: number;
  named: boolean;
  role: Role | null;
}

export interface BirthEvent {
  id: VillagerId;
  motherId: VillagerId;
  fatherId: VillagerId | null;
  female: boolean;
}

export type MigrationEvent =
  | { kind: 'arrival'; ids: VillagerId[] }
  | { kind: 'departure'; ids: VillagerId[] };

// ---------------------------------------------------------------------------
// §3.1 · Root state
// ---------------------------------------------------------------------------

/**
 * Version of the save schema this build writes and reads. It lives here, with
 * the shape it numbers, so that `found.ts` can stamp it without importing
 * `save.ts` — which imports `found.ts` and would close a cycle. v2.93: it used
 * to be written by hand in two places, and they drifted apart.
 */
/**
 * El esquema de la partida guardada. §13.1.
 *
 * **5 desde el mapa grande, y esta subida sí rompe las partidas guardadas.**
 * Las cuatro anteriores se migraban porque lo que cambiaba eran campos; aquí lo
 * que cambia es la forma del mapa —36 × 56 pasa a 72 × 112— y no hay migración
 * honesta: un valle de 2 016 celdas no se convierte en uno de 8 064 sin
 * inventar seis mil celdas de terreno que nadie generó.
 *
 * Se acepta ahora y no más adelante, y la razón está escrita en el brief: hoy
 * no hay ningún móvil con una partida de varios días encima, y el hito 6 —que
 * es cuando lo habrá— no se ha validado todavía. Después de ese hito, esto ya
 * no sería aceptable.
 */
export const SCHEMA_VERSION = 11; // B1: el clan vecino (10 era K-1: la corona)
// F3a no sube el esquema: `ArchivedGame.ledger` es opcional y lo que falta se
// recuenta de la crónica, así que una partida vieja carga sin migración.


/** Las familias de §7.3 que el jugador puede adelantar. */
export type PriorityName = 'none' | 'food' | 'shelter' | 'faith' | 'craft' | 'defence' | 'court';

/**
 * Qué entra en cada familia.
 *
 * Por lo que **hacen** y no por su material: una casa de piedra sigue siendo
 * techo, y el pozo entra en oficios y no en comida porque lo que quita es un
 * acarreo, no un hambre. La empalizada, la muralla y la atalaya van juntas
 * porque quien las quiere las quiere por lo mismo.
 */
export const PRIORITY_FAMILIES: Readonly<Record<Exclude<PriorityName, 'none'>, readonly string[]>> = {
  food: ['field', 'granary'],
  shelter: ['house', 'stone_house'],
  faith: ['chapel', 'church'],
  craft: ['smithy', 'mill', 'well'],
  defence: ['palisade', 'wall', 'watchtower'],
  // K-4 · la sala del rey. Una familia de una sola cosa, porque es una sola
  // cosa: la casa del que manda, y la quiere quien la quiere por eso.
  court: ['hall'],
};


/**
 * Lo que **este** valle tiene y otro no. E5 de `docs/plan-juego.md`.
 *
 * *«La aldea no muta en diferentes partidas, siempre prácticamente es lo
 * mismo.»* Y era verdad, con tres recetas fijas detrás: un mapa —río, fracción
 * de bosque, manchas de roca, marisma—, un orden de construcción, y las mismas
 * ocho o diez encrucijadas de veinte. Cambiaba el ruido, no la partida.
 *
 * Un rasgo del valle **cambia un número de la economía para siempre**, se sortea
 * en la fundación y se cuenta en la crónica. No es una bandera de §8 —esas las
 * pone una decisión y caducan— es lo que el valle era antes de que llegara
 * nadie: dos rasgos por partida, de cuatro, y ninguno se pisa con otro.
 *
 * **Y cambian qué postura funciona**, que es lo que hace que importen: en un
 * valle de tierra delgada sembrar de más no compensa y hay que ir al bosque; en
 * uno sin piedra la aldea nunca pasa de la madera, así que la fe y los oficios
 * llegan antes que las murallas. Es la misma palanca dando otra partida.
 */
export type ValleyTrait = 'good_clay' | 'thin_soil' | 'old_forest' | 'bare_hills'
  // M-2 · **un medio con rasgo es un rasgo de valle que pone el jugador.** Los
  // cuatro de arriba se sortean al fundar y dicen lo que el valle era antes de
  // que llegara nadie (E5); éste lo mete el jugador a mitad de partida y lo
  // paga. El mecanismo es el mismo a propósito: cambia un número de la economía
  // para siempre y se cuenta en la crónica.
  | 'plough'
  // M-3 · **la pocilga**, y la medida que la obligó: el corral se llena solo
  // —`tendHerd` cría hasta la capacidad que dan las casas— así que «dos cerdos»
  // era un medio que casi nunca se podía dar (la negativa era `room` en las
  // cuatro aldeas que se midieron). Un medio que no se puede dar no es un
  // medio. Lo que se da es **sitio**: la pocilga sube el techo del corral, y los
  // cerdos que entran con ella se ven desde el primer día.
  | 'sty'
  // M-4 · los tres que cierran el carro. Un hacha buena, una reliquia, y —el
  // único que no es una cosa— el forastero que se queda: lo que trae es un par
  // de manos, que es lo más caro que hay en este valle.
  | 'axe'
  | 'relic'
  // C1 · Los tres de la defensa (§1b, fase 4), y el mecanismo vuelve a ser el
  // mismo: un medio con rasgo es un rasgo de valle que pone el jugador y paga.
  // `arms` hace que la aldea se lleve menos golpe, `bows` que tienten menos —y
  // que cuando bajen, bajen con más— y `watch` que se les vea venir antes.
  // **No entran en `VALLEY_TRAITS`**: esos cuatro son lo que el valle era antes
  // de que llegara nadie, y unas armas no le salen a un valle de la tierra.
  | 'arms'
  | 'bows'
  | 'watch';

/** M-2 · Lo que el jugador puede meter en el valle. `world/means.ts`. */
// C1 · Los tres medios de defensa (§1b, fase 4). Van al final porque el orden
// de esta lista es el orden del carro, y lo que se da para defenderse llega
// después de lo que se da para vivir: primero se come, luego se aguanta.
export const MEANS_IDS = [
  'plough', 'pigs', 'ale', 'axe', 'relic', 'hand',
  'arms', 'bows', 'tower', 'gate',
] as const;
export type MeansId = (typeof MEANS_IDS)[number];

/** Los cuatro, en orden estable: el sorteo de la fundación recorre esta lista. */
export const VALLEY_TRAITS: readonly ValleyTrait[] = [
  'good_clay', 'thin_soil', 'old_forest', 'bare_hills',
];

/**
 * Los dos rasgos de un valle, sorteados de su semilla de terreno.
 *
 * **Dos de cuatro y sin repetir**, y el sorteo es una función pura de la semilla
 * en vez de una tirada del `RngBundle`: así preguntar por los rasgos no consume
 * azar y no desplaza la simulación (§4.3), y el mismo terreno da siempre el
 * mismo valle — que es lo que hace que una partida heredada siga siendo el mismo
 * sitio (§13.3).
 *
 * Vive aquí y no en `found.ts` porque `mapgen` también lo necesita —el bosque de
 * un valle viejo es viejo desde antes de generarse— y `mapgen` no puede importar
 * de `found` sin cerrar un ciclo. `state.ts` sólo importa de `rng.ts`, que es lo
 * que el grafo de §2.4 permite.
 */
export function valleyTraits(terrainSeed: number): ValleyTrait[] {
  return VALLEY_TRAITS
    .map((trait) => ({ trait, draw: hash32(terrainSeed, `valley:${trait}`) }))
    .sort((a, b) => a.draw - b.draw)
    .slice(0, 2)
    .map((one) => one.trait);
}

/** Si este valle tiene ese rasgo. */
export function hasTrait(state: { traits: readonly ValleyTrait[] }, trait: ValleyTrait): boolean {
  return state.traits.includes(trait);
}


export interface GameState {
  readonly version: number; // save schema version
  readonly seed: number; // master seed
  readonly terrainSeed: number; // may outlive a village across §13.3 succession
  tick: number; // weeks since the founding
  peakPeople: number; // greatest population observed at a completed tick
  rng: RngBundle; // state of the random streams
  map: ValleyMap;
  /**
   * P-1 · **La plaza de este valle**, en celdas, elegida el día de la fundación
   * y fija para siempre (esquema 8).
   *
   * Está guardada y no se deriva, y eso es la decisión: hasta el esquema 7 la
   * plaza era `valleyCore` —la media de los centros de los edificios— que se
   * recalcula cada vez que se pregunta y **se movía sola** mientras la aldea
   * crecía: medido, de 4,2 a 10,8 celdas entre la fundación y el año 60 en ocho
   * semillas. Un empedrado y una fuente no pueden ir en un punto que se muda.
   *
   * La elige `world/plaza.ts` sin consumir azar, y `world/placement.ts` no deja
   * levantar nada dentro de su radio (`PLAZA.RADIUS`).
   */
  plaza: { x: number; y: number };
  /**
   * K-1 · **La corona de este valle**, o nada si nadie la lleva todavía
   * (esquema 10).
   *
   * Entra a `null` y una partida sin coronar es **byte a byte** la de antes de
   * la fase del rey: `will(state)` devuelve entonces la voluntad de reposo, que
   * es literalmente lo que el reparto de manos y la cola de obras leían de la
   * postura retirada de v2.0.
   */
  crown: Crown | null;
  /**
   * P-4 · **El anillo de muralla que se está levantando**, como radio en celdas
   * desde la plaza, o nada si la aldea todavía no ha empezado ninguno
   * (esquema 9).
   *
   * Está guardado y no se deriva, y esta vez el motivo se midió: derivarlo de
   * la muralla construida —la mediana del tramo más largo— **no es estable**.
   * La mediana se mueve al añadir cada pieza, la banda del anillo es de una
   * celda, y con el radio moviéndose medio paso la pieza siguiente ya no cae en
   * el mismo círculo: en la semilla 41 al año 60 salían **48 tramos, 17 de ellos
   * de una sola pieza**. Un anillo es una decisión, no una media: se toma una
   * vez, se escribe, y la muralla se levanta sobre ella hasta que no cabe nada
   * más.
   */
  ring: number | null;
  village: VillageStats;
  herd: Herd; // §7.7, schema 3
  people: PeopleState;
  buildings: Building[];
  works: ConstructionWork[]; // works in progress
  crossroad: PendingCrossroad | null;
  seeds: PlantedSeed[]; // deferred consequences
  flags: Record<string, number>; // state flags, value = expiry tick (0 = permanent)
  chronicle: ChronicleEntry[];
  history: DecisionRecord[]; // record of the player's decisions
  /** R-1 · lo que le ha pasado al valle por su cuenta (§7.10). Schema 6. */
  happenings: HappeningRecord[];
  offer: Offer | null; // M-0, schema 7
  acts: ActRecord[]; // M-0, schema 7: what the player did outside the crossroads
  weather: YearWeather;
  outbreak: Outbreak | null;
  /**
   * When the village first fell below `MIGRATION.VIABLE_POPULATION`, or null if
   * it is above it. §5.7's abandonment counts from here.
   *
   * A tick and not a counter of years, so that it says the same thing however
   * often it is looked at, and so that a saved game does not have to remember
   * how far through a year it was.
   */
  dwindlingSince: number | null;
  /**
   * Consecutive `succession:no_one` answers with no leader appointed between
   * them. §17 Annex A.15, v2.22: reset to 0 by `choose_a` or `choose_b`: a
   * leader in office, however briefly, breaks the streak.
   */
  noOneStreak: number;
  /**
   * A harvest that has been spoken for. §5.3, v2.25: the year a decision costs
   * the village its harvest rather than its granary.
   *
   * Counted in harvests rather than in ticks, so that "next year's harvest" is
   * the next one whenever the decision was taken — the same promise whether it
   * was answered in the spring or the week before the reaping.
   */
  harvestModifier: { factor: number; harvests: number } | null;
  /**
   * Share of the coming harvest the crows have already taken (§7.7, schema 4).
   * Accumulates through the weeks before the reaping and is spent, and reset,
   * by the harvest itself.
   */
  crowBite: number;
  /**
   * Lo que este valle tiene y otro no. Esquema 4.
   *
   * Se sortea con la semilla del **terreno** y no con la maestra, así que una
   * aldea que hereda el valle de la anterior (§13.3) hereda también sus rasgos:
   * el valle no cambia porque haya muerto la gente.
   */
  traits: ValleyTrait[];
  /** B1 · El clan del valle vecino. Esquema 11. */
  threat: Threat;
  ended: EndState | null;
}

/**
 * §1b · **El clan del valle vecino**, que es quien ataca.
 *
 * Lo decidió el dueño del diseño el 18 sep 2026 —otro valle, no bandidos ni el
 * señor— y de esa elección salen las dos mitades de esto:
 *
 *  · **`strength` corre con los años**, no con tu riqueza: es un valle que se
 *    desarrolla en paralelo al tuyo y que no sabe que existes. Por eso crece
 *    igual en un caserío miserable que en una villa rica.
 *  · **lo que tú has juntado decide el premio y la dureza**: cuánto tientas
 *    (`worth`) es lo que marca si bajan este año y con cuánta gente. Eso es §1
 *    intacto —la letalidad sale de lo que el jugador acumuló— visto desde la
 *    otra ladera.
 *
 * `comingTick` es la partida que **ya viene**: se decide con semanas de
 * antelación para que el valle pueda enterarse (B2) y hacer algo. Mientras es
 * `null`, no hay nadie en camino.
 */
export interface Threat {
  /** Lo que el clan ha juntado, en hombres. Crece con los años. */
  strength: number;
  /** El tick en que llega la partida en camino, o `null` si no viene ninguna. */
  comingTick: number | null;
  /** Con cuántos viene la que está en camino. Cero si no hay ninguna. */
  comingBand: number;
  /** Cuántas han llegado ya, para que la crónica y §8.6 sepan que no es la primera. */
  raids: number;
  /**
   * D3 · El tick en que llegó la última partida, o `null` si no ha llegado
   * ninguna. **Lo que la capa de vida necesita para enseñarla**: un asalto pasa
   * en una semana y el motor lo resuelve y lo olvida, así que sin esto la
   * jornada no tiene forma de saber que hoy hay gente en el camino. Es el mismo
   * trato que `state.happenings` le da al lobo del corral (IA-5): el hecho se
   * apunta, y quien dibuja lo lee.
   */
  arrivedTick: number | null;
  /** Y de cuántos era, por la misma razón. */
  lastBand: number;
}

// ---------------------------------------------------------------------------
// §13.1 · Save format
// ---------------------------------------------------------------------------

/**
 * A finished village. Its chronicle and the mask of its buildings survive into
 * the next game, which seeds them into map.ruins (design.md §13.3). The ruins
 * have no mechanical effect: they are there to be seen.
 */
/**
 * F3a · Las cuentas de una partida, tal como se enseñan al acabar.
 *
 * La forma está aquí porque es parte de lo que se guarda (`ArchivedGame`);
 * **cómo se cuenta** está en `chronicle/ledger.ts`, que es lo que puede cambiar.
 *
 * Números y nada más: sin texto, sin claves de banco y sin nada que dependa
 * del idioma. Quien lo pinta decide cómo se llama cada fila (`F3b`), que es la
 * misma división que tiene la crónica entre lo que pasó y cómo se cuenta.
 */
export interface Ledger {
  // ---- las tres grandes (plan-final.md §5, decisión 2) --------------------
  /** Los años que duró el valle. */
  years: number;
  /** La gente que tuvo en su mejor momento. */
  peak: number;
  /** Los asaltos que el cerco aguantó. La cifra de la que se presume. */
  raidsHeld: number;

  // ---- la cuenta larga ---------------------------------------------------
  born: number;
  died: number;
  arrived: number;
  left: number;
  /** Obras terminadas y obras perdidas, de todas las clases. */
  built: number;
  lostWorks: number;
  /** Decisiones contestadas, medios dados y coronas puestas. */
  decisions: number;
  given: number;
  kings: number;
  /** Asaltos que bajaron al valle, contando el que lo tumbó. */
  raids: number;
  /** Lo que costó la defensa: del clan y de los nuestros. */
  slain: number;
  fallen: number;
  /** El año de la primera obra de piedra, o nada si nunca llegó. */
  stoneYear: number | null;

  // ---- lo que sólo sabe el estado del último día -------------------------
  /**
   * Casas y tramos de cerco **en pie al acabar**, o `null` en una partida
   * archivada antes de F3a: la crónica dice lo que se levantó y lo que se
   * perdió, pero no lo que quedó, y un cero ahí sería mentira y no un dato que
   * falta.
   */
  houses: number | null;
  wall: number | null;
}

export interface ArchivedGame {
  seed: number;
  terrainSeed: number;
  endedTick: number;
  cause: EndState['cause'];
  peakPeople: number;
  chronicle: ChronicleEntry[];
  ruins: Uint8Array; // building mask, WIDTH*HEIGHT
  /**
   * F3a · **Las cuentas de esa partida** (`docs/plan-final.md`).
   *
   * Casi todas se pueden recontar de `chronicle`, y de hecho una partida
   * archivada antes de F3a se recuenta así al enseñarla. Se guardan de todos
   * modos por dos razones: **qué quedó en pie** el último día no está en la
   * crónica y sólo se sabe al cerrar el estado, y la decisión 3 del plan poda
   * la crónica de las partidas viejas —de todas menos las tres últimas se
   * guardan sólo los titulares— con lo que recontar dejaría de ser posible.
   *
   * Opcional a propósito: una partida guardada antes de F3a no lo tiene y no
   * hay nada que migrar. Quien la enseñe lo recuenta (`ledgerFromChronicle`).
   */
  ledger?: Ledger;
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
