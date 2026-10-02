// v5.85 · La fauna por estaciones. Vera, 2 oct 2026: «que cada estación del
// valle se note en sus animales», y eligió las cuatro cosas —crías en
// primavera, aves de paso, un invierno escaso, mariposas y abejas en verano
// con los jabalíes al bosque en otoño—.
//
// **Puro y sin motor.** Esto sólo lee la semana del estado (`seasonOf`,
// `clockOf`) y el mapa, y dice qué fauna toca: cuántos ciervos se dejan ver,
// qué parte de las madres lleva cría, si vuelan golondrinas o se van las
// grullas. Nada de aquí escribe en `GameState`, consume azar del motor o cambia
// una cuenta: `state.herd` y la caza siguen igual, y **una cría es un cuerpo
// que se ve, no una cabeza nueva** (§7.7: la cabaña que se pinta es cosmética).
// La estación sale siempre del estado, nunca del reloj del navegador: dos
// pestañas con la misma partida ven el mismo valle.
//
// Las cifras son de presentación, como las de la capa de vida (E.8): viven
// aquí con su `TUNE:` y no en `balance.ts`, porque no mueven ni un número de
// §12.

import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type GameState, type Season } from '@engine/state';
import { clockOf, yearOf } from '@engine/time';
import { valleyCore } from './anchors';

/** Las madres que pueden llevar cría detrás. */
import type { AnimalKind } from './animals';

export type MotherKind = 'deer' | 'cow' | 'pig' | 'hen';

export interface Litter {
  /** Qué parte de las madres de esa clase lleva cría esta primavera, de 0 a 1. */
  readonly share: number;
  /** Cuántas crías lleva cada madre que la tiene. */
  readonly count: number;
  /** A qué escala se pinta la cría respecto al modelo adulto. */
  readonly scale: number;
  /**
   * v5.100 · El modelo de la cría, si tiene uno propio: el polluelo es su
   * modelo (`chick.glb`) a escala 1, no la gallina encogida. Sin él, la madre.
   */
  readonly kind?: AnimalKind;
}

export interface FaunaSeason {
  readonly season: Season;
  /** Las crías de primavera; fuera de ella, todo a cero. */
  readonly litters: Readonly<Record<MotherKind, Litter>>;
  /** Cuántos ciervos se dejan ver como mucho. */
  readonly deer: number;
  /** A cuánto del corazón de la aldea se acercan a pastar, en celdas. */
  readonly deerClearance: number;
  /** Si el ciervo busca el prado más cercano a la aldea, y no el de la linde. */
  readonly deerDownhill: boolean;
  /** Cuántos conejos salen de la madriguera como mucho. */
  readonly rabbits: number;
  /** Por cuánto se multiplica la distancia a la que huye la caza menuda. */
  readonly wariness: number;
  /** Jabalíes hozando en la linde del bosque (la montanera de otoño). */
  readonly boars: number;
  /** Si hay golondrinas: llegan en primavera y se quedan el verano. */
  readonly swallows: boolean;
  /** Si hay cigüeñas buscando en el prado húmedo. */
  readonly storks: boolean;
  /** Qué parte del otoño lleva ya pasando la bandada que se va al sur, 0 si no toca. */
  readonly migration: number;
  /** Cuántas mariposas y abejas hay sobre la hierba, de 0 a 1. */
  readonly pollinators: number;
}

const NONE: Litter = { share: 0, count: 0, scale: 1 };

/**
 * Las crías de primavera, por clase de madre.
 *
 * TUNE: la mitad de las vacas con su ternero y la mitad de las cerdas con dos
 * lechones; un tercio de las gallinas con tres polluelos, que es lo que se
 * lee como «nidada» sin convertir el corral en un hormiguero; y la cierva
 * con su cervatillo (la primera siempre: ver `hasYoung`). Las escalas son a
 * ojo contra el adulto: un ternero de un mes alza la mitad que su madre, un
 * polluelo menos de la mitad que la gallina.
 */
const SPRING_LITTERS: Readonly<Record<MotherKind, Litter>> = {
  deer: { share: 0.5, count: 1, scale: 0.55 },
  cow: { share: 0.5, count: 1, scale: 0.5 },
  pig: { share: 0.5, count: 2, scale: 0.45 },
  // El polluelo tiene modelo desde v5.100: a su tamaño, no la gallina a 0,42
  // («se leen mal: son gallinas diminutas», fauna-estaciones-2026-10-02).
  hen: { share: 0.34, count: 3, scale: 1, kind: 'chick' },
};

/**
 * Lo que se deja ver de la caza el resto del año y en invierno.
 *
 * TUNE: dos ciervos y tres conejos, las cifras de siempre (`deer.ts`,
 * `rabbits.ts`); en invierno uno y uno, y la caza menuda huye a vez y media de
 * distancia. «Menos caza y más escondida», en palabras de Vera.
 */
const DEER = 2;
const WINTER_DEER = 1;
const RABBITS = 3;
const WINTER_RABBITS = 1;
const WINTER_WARINESS = 1.5;
/**
 * TUNE: el ciervo pasta a doce celdas del corazón de la aldea (`deer.ts`). En
 * invierno baja al prado: nueve, y busca el pasto más cercano a la aldea en vez
 * de uno cualquiera de la linde. La distancia a cada casa no se toca (ocho
 * celdas): baja, pero no entra en el corral.
 */
const DEER_CLEARANCE = 12;
const WINTER_DEER_CLEARANCE = 9;
/** TUNE: dos jabalíes en otoño, una hembra y su cría del año. */
const AUTUMN_BOARS = 2;
/**
 * TUNE: las mariposas empiezan en la segunda mitad de la primavera, a medio
 * gas, y llenan el verano. En otoño y en invierno no hay.
 */
const LATE_SPRING_POLLINATORS = 0.4;

export function faunaSeason(state: GameState): FaunaSeason {
  const { season, seasonWeek } = clockOf(state.tick);
  const winter = season === 'winter';
  const half = seasonWeek / 12;
  return {
    season,
    litters: season === 'spring' ? SPRING_LITTERS : { deer: NONE, cow: NONE, pig: NONE, hen: NONE },
    deer: winter ? WINTER_DEER : DEER,
    deerClearance: winter ? WINTER_DEER_CLEARANCE : DEER_CLEARANCE,
    deerDownhill: winter,
    rabbits: winter ? WINTER_RABBITS : RABBITS,
    wariness: winter ? WINTER_WARINESS : 1,
    boars: season === 'autumn' ? AUTUMN_BOARS : 0,
    swallows: season === 'spring' || season === 'summer',
    storks: season === 'spring' || season === 'summer',
    migration: season === 'autumn' ? Math.min(1, half + 1 / 12) : 0,
    pollinators: season === 'summer' ? 1 : season === 'spring' && half >= 0.5 ? LATE_SPRING_POLLINATORS : 0,
  };
}

/**
 * Si esta madre lleva cría esta primavera.
 *
 * Estable todo el año —la misma vaca tiene su ternero de la primera a la
 * última semana de la primavera— porque el hash es de la semilla, la madre y
 * el año, no de la jornada. **La primera cierva siempre**: «cervatillos con la
 * cierva» es lo que Vera pidió ver, y con dos ciervos y la mitad a suertes una
 * primavera de cada cuatro se quedaría sin ninguno.
 */
export function hasYoung(state: GameState, kind: MotherKind, motherId: number, order: number): boolean {
  const litter = faunaSeason(state).litters[kind];
  if (litter.count === 0) return false;
  if (kind === 'deer' && order === 0) return true;
  return hash32(state.seed, `young:${kind}:${motherId}:${yearOf(state.tick)}`) / 4_294_967_296 < litter.share;
}

export interface Spot { readonly x: number; readonly z: number }

function near(state: GameState, x: number, z: number, code: number, reach: number): boolean {
  const { width, height, terrain } = state.map;
  for (let dz = -reach; dz <= reach; dz += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= width || nz >= height) continue;
      if (terrain[nz * width + nx] === code) return true;
    }
  }
  return false;
}

function farFromBuildings(state: GameState, x: number, z: number, gap: number): boolean {
  return state.buildings.every((b) => b.lostTick !== null
    || Math.hypot(Math.max(b.x - x, 0, x - b.x - b.w), Math.max(b.y - z, 0, z - b.y - b.h)) >= gap);
}

/**
 * TUNE: dos cigüeñas, en prado a una celda del agua o de la marisma, a cuatro
 * de cualquier casa (la cigüeña pica en el prado húmedo y no en el corral), y
 * las más cercanas al centro de la aldea, que es donde mira la cámara.
 */
const STORKS = 2;
const STORK_HOUSE_GAP = 4;

/** Dónde buscan las cigüeñas: el prado húmedo más cercano a la aldea. */
export function storkSpots(state: GameState): Spot[] {
  const centre = valleyCore(state);
  const { width, height, terrain } = state.map;
  const found: { x: number; z: number; d: number }[] = [];
  for (let z = 1; z < height - 1; z += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (terrain[z * width + x] !== TERRAIN_CODE.meadow) continue;
      if (!near(state, x, z, TERRAIN_CODE.water, 1) && !near(state, x, z, TERRAIN_CODE.marsh, 1)) continue;
      if (!farFromBuildings(state, x + 0.5, z + 0.5, STORK_HOUSE_GAP)) continue;
      found.push({ x: x + 0.5, z: z + 0.5, d: Math.hypot(x + 0.5 - centre.x, z + 0.5 - centre.y) });
    }
  }
  found.sort((a, b) => a.d - b.d || a.z - b.z || a.x - b.x);
  const chosen: Spot[] = [];
  for (const spot of found) {
    if (chosen.some((other) => Math.hypot(other.x - spot.x, other.z - spot.z) < 3)) continue;
    chosen.push({ x: spot.x, z: spot.z });
    if (chosen.length === STORKS) break;
  }
  return chosen;
}

export type Pollinator = 'butterfly' | 'bee';

/**
 * TUNE: veinticuatro mariposas y abejas, repartidas por los campos y el prado
 * que hay alrededor de la aldea (a dieciséis celdas del centro). Una de cada
 * tres es abeja, y las abejas van a los campos y al prado pegado a ellos; las
 * mariposas, a cualquier hierba.
 */
const POLLINATORS = 24;
const POLLINATOR_RANGE = 16;

/** Dónde revolotean mariposas y abejas; estable para una misma aldea. */
export function pollinatorSpots(state: GameState): (Spot & { kind: Pollinator })[] {
  const centre = valleyCore(state);
  const { width, height, terrain } = state.map;
  const fields = state.buildings.filter((b) => b.kind === 'field' && b.lostTick === null);
  const meadow: number[] = [];
  for (let z = 0; z < height; z += 1) {
    for (let x = 0; x < width; x += 1) {
      if (terrain[z * width + x] !== TERRAIN_CODE.meadow) continue;
      if (Math.hypot(x + 0.5 - centre.x, z + 0.5 - centre.y) > POLLINATOR_RANGE) continue;
      if (!farFromBuildings(state, x + 0.5, z + 0.5, 1)) continue;
      meadow.push(z * width + x);
    }
  }
  const spots: (Spot & { kind: Pollinator })[] = [];
  for (let n = 0; n < POLLINATORS; n += 1) {
    const bee = n % 3 === 0;
    const roll = hash32(state.seed, `pollinator:${n}`);
    const field = fields[roll % Math.max(1, fields.length)];
    if (bee && field !== undefined) {
      const u = (hash32(state.seed, `bee:x:${n}`) % 1000) / 1000;
      const v = (hash32(state.seed, `bee:z:${n}`) % 1000) / 1000;
      spots.push({ kind: 'bee', x: field.x + u * field.w, z: field.y + v * field.h });
      continue;
    }
    if (meadow.length === 0) continue;
    const cell = meadow[roll % meadow.length]!;
    spots.push({ kind: bee ? 'bee' : 'butterfly', x: cell % width + 0.5, z: Math.floor(cell / width) + 0.5 });
  }
  return spots;
}
