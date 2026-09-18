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

import { BUILDING_RULES, BUILDINGS, CROWN, FOOD, LIFE, TRAITS, WORLD } from '../balance';
import { hasTrait, PRIORITY_FAMILIES } from '../state';
import { count, has, smithyWorking, standing } from '../subsistence/building-counts';
import { housingCapacity, population } from '../people/demography';
import { kingOf, will } from '../people/crown';
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
  wallUnlocked: boolean;
  stoneHouseUnlocked: boolean;
  buildings: string;
  terrain: Uint8Array;
  /**
   * K-2 · el estilo del rey.
   *
   * **Sin esto, coronar no se nota hasta que cambie otra cosa.** `NO_PROJECT` es
   * una caché de «aquí no hay nada que construir» que sólo se invalida si su
   * instantánea cambia, y la voluntad del rey mueve el orden y abre la muralla:
   * una aldea que había llegado a «nada que hacer» seguiría diciéndolo con un
   * rey herrero recién coronado.
   */
  style: string;
}

const NO_PROJECT = new WeakMap<GameState, NoProjectSnapshot>();
const AUTOMATIC_KINDS = [
  'field', 'house', 'granary', 'well', 'chapel', 'smithy', 'mill', 'palisade',
  // K-4 · la sala. Entra en la máscara de «qué se puede pagar» porque si no, la
  // caché de «nada que hacer» no se enteraría de que la aldea ya tiene madera
  // para levantarla.
  'hall',
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
    wallUnlocked: flagNow(state, 'wall_unlocked'),
    stoneHouseUnlocked: flagNow(state, 'stone_house_unlocked'),
    buildings: buildingSignature(state),
    terrain: Uint8Array.from(state.map.terrain),
    style: will(state).style ?? 'none',
  };
}

function sameTerrain(a: Uint8Array, b: GameState['map']['terrain']): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function flagNow(state: GameState, flag: string): boolean {
  const until = state.flags[flag];
  return until !== undefined && (until === 0 || until > state.tick);
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
    previous.wallUnlocked === flagNow(state, 'wall_unlocked') &&
    previous.stoneHouseUnlocked === flagNow(state, 'stone_house_unlocked') &&
    previous.buildings === buildingSignature(state) &&
    sameTerrain(previous.terrain, state.map.terrain);
}

/**
 * The build points a project costs, once it is open. §7.2.
 *
 * **M-0 · la piedra ya no va aquí.** Hasta el esquema 6 era `bp + stone /
 * STONE_PER_BP`: la piedra «no era un sexto recurso, canteala es trabajo, así
 * que se cobra como trabajo». Sigue siendo trabajo, y **al mismo cambio**: la
 * obra la cantea con sus propios puntos antes de abrir el proyecto
 * (`quarryFor`, más abajo) y la gasta del montón al abrirlo. El trabajo total
 * de una casa de piedra no se mueve; lo que cambia es que la piedra está en
 * algún sitio entre medias —el montón de `village.stone`—, que es lo que la
 * capa de vida ya enseñaba y el motor no contaba.
 *
 * Y **se queda sin el parámetro `free`**: lo tenía para eximir la piedra de un
 * regalo de §8.4, y `bp` nunca fue material, así que hoy no distinguiría nada.
 * Lo que `free` exime —madera y piedra— lo exime `open`.
 */
export function bpCostOf(kind: BuildingKind): number {
  return BUILDINGS[kind].bp;
}

/** Cuánta piedra pide levantar algo. La tabla de §7.2, sin rasgo que la mueva. */
export function stoneCostOf(kind: BuildingKind): number {
  return BUILDINGS[kind].stone;
}

/**
 * M-0 · **La obra en la cantera**: pica piedra al montón del valle y de ahí a la
 * obra, y devuelve los puntos de la semana que sobran.
 *
 * Es exactamente el trabajo que `bpCostOf` cobraba antes dentro del proyecto
 * —al mismo cambio, `WORLD.STONE_PER_BP`—, sólo que ahora se ve: el montón sube
 * mientras se cantea y baja cuando la obra se lo lleva, y la obra está **abierta**
 * todo ese tiempo, que es de donde la capa de vida saca a quién mandar a la roca
 * (`life/resource-sites.ts`).
 *
 * Si en el montón ya hay piedra —porque la aldea canteó con la obra parada, o
 * porque el jugador la compró— la obra la usa y no pica de más.
 */
function quarryFor(state: GameState, work: ConstructionWork, points: number): number {
  const missing = stoneCostOf(work.kind) - work.stoneDone;
  if (missing <= 0) return points;
  let left = points;
  const shortfall = missing - state.village.stone;
  if (shortfall > 0 && left > 0) {
    const spent = Math.min(left, shortfall / WORLD.STONE_PER_BP);
    state.village.stone += spent * WORLD.STONE_PER_BP;
    left -= spent;
  }
  if (state.village.stone + 1e-9 >= missing) {
    state.village.stone -= missing;
    work.stoneDone = stoneCostOf(work.kind);
  }
  return left;
}

/** Whether the valley can quarry at all: §7.2 wants a smithy and rock. */
export function canQuarry(state: GameState): boolean {
  // E5 · las lomas peladas no se notan aquí sino en el mapa: hay la mitad de
  // pedregales, así que la piedra llega tarde en vez de no llegar. Prohibirla
  // del todo fue mi primera versión y estaba medida como un acantilado — ver
  // `TRAITS.BARE_HILLS_ROCK`.
  if (!smithyWorking(state)) return false;
  return state.map.terrain.includes(TERRAIN_CODE.rock);
}

/** Lo que cuesta de madera levantar algo en **este** valle. */
export function woodCostOf(state: GameState, kind: BuildingKind): number {
  const clay = hasTrait(state, 'good_clay') ? TRAITS.GOOD_CLAY_WOOD : 1;
  return BUILDINGS[kind].wood * clay;
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
  // 2b · K-4 · **la sala del rey**, en cuanto hay rey y gente para sostenerla.
  // Va aquí —después de las casas y antes del granero— porque es la casa del que
  // manda: un techo, no un lujo. Sin rey no se pide nunca, y con el rey de corte
  // además va delante de todo (familia `court`).
  //
  // **Y sólo la pide el rey de corte**, que es lo medido: la sala cuesta
  // doscientos de madera y ciento sesenta de obra, y con cualquier rey eso se
  // come dos o tres casas —diez casas sin rey, siete u ocho con él en 24
  // partidas de sesenta años—. Como las casas son el techo de la población, la
  // corona salía cara para todos por igual y eso no es una elección, es un
  // impuesto. Ahora la sala es la marca del noble: su estilo la pide, la
  // adelanta (familia `court`) y paga por ella.
  if (will(state).style === 'court' && !has(state, 'hall') && people >= CROWN.HALL_PEOPLE) {
    wanted.push('hall');
  }
  // 3 · granaries
  // **Y el tope del granero lo levanta el rey del campo.** Esta cuenta va aparte
  // de `withinCap`, así que subir el tope allí no llegaba hasta aquí: medido,
  // tres graneros y 2 750 de bodega en las cinco maneras de jugar, la del rey
  // del campo incluida. Con el tope bien leído, su valle guarda mil fanegas más.
  if (count(state, 'granary') < FOOD.MAX_GRANARIES + will(state).moreGranaries &&
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
  // K-2 · con un rey herrero, la muralla no espera a que haya amenaza: es lo que
  // «si eliges al herrero, pues haces más armas» significa en un juego que no
  // tiene armas como montón (§7.12: las armas son la muralla y el señor que la
  // cuenta).
  // **Y la muralla espera a que haya pueblo que amurallar.** Once casas
  // (`BUILDING_RULES.PALISADE_HOUSES`), que es la regla que pidió el dueño del
  // diseño —«la muralla se podría hacer a partir de X número de casas»— y el
  // número está medido: con once, las casas ocupan ya el 91 % del radio que van
  // a ocupar. Importa porque el anillo de §7.4c **se fija una sola vez**: con la
  // muralla pedida en el año dos, el valle acababa creciendo fuera de ella.
  if (has(state, 'smithy') && (threatened || will(state).arms)
    && standing(state, 'house').length + standing(state, 'stone_house').length
      >= BUILDING_RULES.PALISADE_HOUSES) {
    wanted.push('palisade');
  }

  // **E3 · lo que el jugador quiere antes va antes.**
  //
  // La lista de arriba es el orden de §7.3 y sigue siendo el de la aldea: lo que
  // esta palanca hace es **adelantar una familia entera** sin borrar el resto,
  // con un orden estable, así que lo que no se puede levantar todavía sigue
  // esperando su turno y lo que ya no hace falta sigue sin hacerse. Con la
  // palanca en `none` esto no mueve un solo elemento y §7.3 queda intacta.
  //
  // Es la palanca que da el lado bueno del triángulo: E1 midió que con las dos
  // primeras el jugador podía hacerlo peor que la aldea sola pero casi nunca
  // mejor, porque el **qué** construir no era suyo.
  //
  // **Y desde K-2 la palanca es el rey.** `state.intent` se quedó sin quien lo
  // escriba cuando M-2 retiró las órdenes (la hoja de la interfaz está
  // borrada), así que lo que adelanta una familia es ahora la voluntad de quien
  // lleva la corona: el herrero pide muralla, el del campo comida, el cura
  // capilla y el noble su sala. Sin rey, `will()` devuelve `'none'` y §7.3
  // queda exactamente como estaba.
  const crownPriority = will(state).priority;
  const family = crownPriority === 'none' ? null : PRIORITY_FAMILIES[crownPriority];
  const ordered = family === null
    ? wanted
    : [...wanted].sort((a, b) => Number(family.includes(b)) - Number(family.includes(a)));

  for (const kind of ordered) {
    if (!withinCap(state, kind)) continue;
    if (state.village.wood < woodCostOf(state, kind)) continue;
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
    const cost = woodCostOf(state, kind);
    if (state.village.wood < cost) return null;
    state.village.wood -= cost;
  }

  const work: ConstructionWork = {
    id: state.works.reduce((n, w) => Math.max(n, w.id + 1), 0),
    kind,
    x,
    y,
    w: spec.w,
    h: spec.h,
    bpCost: bpCostOf(kind),
    bpDone: 0,
    // M-0 · un regalo de §8.4 llega con su piedra; el resto hay que picarla.
    stoneDone: free ? spec.stone : 0,
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
    blockedUntil: null,
  });
  clearRuins(state, work);

  if (source !== undefined) {
    for (const person of state.people.villagers) {
      if (person.homeId === source.id) person.homeId = familyOf(work.kind) === 'house' ? id : null;
    }
  }
  if (familyOf(work.kind) === 'house') houseHomeless(state);
  // K-4 · **y el rey se muda a su sala el día que se termina.** Es lo que el
  // dueño del diseño pidió —«debe tener una casa que se diferencie»—: la sala no
  // es una sede, es su casa, y por eso cuenta camas.
  if (work.kind === 'hall') {
    const king = kingOf(state);
    if (king !== null) king.homeId = id;
    houseHomeless(state);
  }

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
  let left = Math.max(0, buildPoints);
  if (state.works.length === 0 && !noProjectStillApplies(state)) {
    const project = nextProject(state);
    if (project === null) NO_PROJECT.set(state, projectSnapshot(state));
    else {
      NO_PROJECT.delete(state);
      open(state, project);
    }
  }

  const built: BuiltEvent[] = [];
  for (const work of [...state.works].sort((a, b) => a.startedTick - b.startedTick || a.id - b.id)) {
    if (left <= 0) break;
    // M-0 · primero la piedra, si la pide: una obra no se levanta con lo que no
    // tiene. Mientras esté en la cantera, la semana se va ahí.
    left = quarryFor(state, work, left);
    if (work.stoneDone < stoneCostOf(work.kind)) continue;
    if (left <= 0) break;
    const needed = work.bpCost - work.bpDone;
    const spent = Math.min(left, needed);
    work.bpDone += spent;
    left -= spent;
    if (work.bpDone >= work.bpCost) built.push(complete(state, work));
  }

  state.works = state.works.filter((w) => w.bpDone < w.bpCost);

  // M-0 · **y con la obra parada, se cantea.** Una aldea con fragua y roca que
  // no tiene nada que levantar esta semana manda sus manos a la cantera en vez
  // de perder los puntos, hasta `STONE_IDLE_CAP`. Es lo que hace que la piedra
  // exista antes de que haga falta, y la última década de una partida —que
  // `plan-juego.md` §3.1 midió vacía: el 100 % de las semanas sin nada que
  // querer construir— deja un montón en vez de nada.
  if (state.works.length === 0 && left > 0 && canQuarry(state)) {
    const room = Math.max(0, WORLD.STONE_IDLE_CAP - state.village.stone);
    state.village.stone += Math.min(room, left * WORLD.STONE_PER_BP);
  }
  return built;
}
