// V-05 · Lo que el mundo ofrece. design.md Anexo E.
//
// **El mecanismo del que sale el caos sin escribir un guion.**
//
// Cada sitio del valle ofrece cosas que hacer a quien pase cerca: el pozo
// ofrece beber, la era ofrece sentarse, la fragua ofrece mirar trabajar. Quien
// elige es el agente (V-06), según lo que le pide el cuerpo y cómo es.
//
// La regla que sostiene todo esto y que hay que defender: **ninguna oferta
// conoce a ningún agente concreto**. En cuanto una diga «si pasa Aelric,
// entonces…», esto deja de ser un mundo con cosas y se convierte en un guion con
// disfraz, que es de lo que veníamos huyendo.
//
// Y de ahí sale la propiedad que hace esto barato de crecer: **una oferta nueva
// da comportamiento a los ochenta a la vez**, sin tocar a nadie. Añadir «lavar
// en el río» es una entrada en una tabla, no una rama en un árbol de decisión.

import type { GameState } from '@engine/state';
import type { Point, Terrain } from './body';
import { blockedAt, WALL_CLEAR } from './body';
import type { NeedName } from './needs';

/** Algo que se puede hacer, y dónde. */
export interface Offer {
  /** Qué es. Vale para el clip que se pinta y para no repetirse. */
  readonly id: string;
  /** Dónde hay que ponerse. Siempre suelo pisable. */
  readonly at: Point;
  /** A qué distancia vale: no hay que clavarse en el punto. */
  readonly reach: number;
  /** Cuántos caben a la vez. El pozo no da de beber a nueve. */
  readonly seats: number;
  /** Qué calma, y cuánto. Un uno quita el impulso entero. */
  readonly gives: Partial<Record<NeedName, number>>;
  /** Lo que dura, en segundos escénicos: mínimo y máximo. */
  readonly seconds: readonly [number, number];
  /** Hora punta, como fase de la jornada [0, 1]. Fuera vale menos, nunca cero. */
  readonly hours?: readonly [number, number];
  /**
   * Dónde se pone cada uno de los que caben, ya comprobado que es suelo
   * pisable. Una por plaza, y `seats` es su cuenta.
   *
   * **Comprobado al montar el sitio y no al llegar**, que es lo que distingue
   * un corro de una fila de gente clavada mirando una pared.
   */
  readonly spots?: readonly Point[];
}

/** El molde de una oferta, sin sitio: el sitio lo pone el edificio. */
interface OfferSpec {
  readonly id: string;
  readonly reach: number;
  readonly seats: number;
  readonly gives: Partial<Record<NeedName, number>>;
  readonly seconds: readonly [number, number];
  readonly hours?: readonly [number, number];
}

/**
 * El catálogo.
 *
 * Lo que un edificio ofrece sale de **para qué sirve**, no de un adorno: el pozo
 * da agua porque es un pozo. Cuando el motor gane un edificio, gana su oferta
 * aquí y la aldea entera aprende a usarlo sin que nadie escriba una conducta.
 */
export const OFFERS: Readonly<Record<string, OfferSpec>> = {
  drink: { id: 'drink', reach: 0.9, seats: 2, gives: { thirst: 0.9 }, seconds: [4, 9] },
  sit: { id: 'sit', reach: 1.2, seats: 4, gives: { rest: 0.8, boredom: 0.2 }, seconds: [8, 20] },
  watch: { id: 'watch', reach: 1.4, seats: 3, gives: { boredom: 0.7, company: 0.3 }, seconds: [6, 16] },
  pray: { id: 'pray', reach: 1.1, seats: 5, gives: { irritation: 0.8, boredom: 0.2 }, seconds: [10, 24] },
  work: { id: 'work', reach: 1.6, seats: 6, gives: { duty: 0.9, boredom: -0.2 }, seconds: [20, 45] },
  gossip: { id: 'gossip', reach: 1.3, seats: 4, gives: { company: 0.9, boredom: 0.4 }, seconds: [6, 18] },
  /** Mirar correr el agua. No calma nada del cuerpo y despeja la cabeza. */
  loiter: { id: 'loiter', reach: 1.5, seats: 3, gives: { boredom: 0.5, irritation: 0.3 }, seconds: [8, 18] },
};

/** Qué ofrece cada clase de edificio. */
const BY_BUILDING: Readonly<Record<string, readonly string[]>> = {
  well: ['drink', 'gossip'],
  house: ['sit'],
  stone_house: ['sit'],
  granary: ['work'],
  field: ['work'],
  smithy: ['watch', 'work'],
  mill: ['watch', 'work'],
  chapel: ['pray'],
  church: ['pray', 'gossip'],
  grave_yard: ['pray'],
  watchtower: ['watch'],
};

/** Un sitio del valle, con lo que da. */
export interface Place {
  readonly id: string;
  readonly at: Point;
  readonly offers: readonly Offer[];
}

/**
 * Un punto pisable junto a un edificio, o nada si está encajonado.
 *
 * Se prueban las cuatro caras y luego el centro. Lo de las caras primero no es
 * capricho: lo que hay que ofrecer es **la puerta**, que es donde la escena se
 * entiende, y sólo si no hay puerta libre se recurre al medio.
 */
function doorOf(land: Terrain, x: number, z: number, w: number, h: number): Point | null {
  // **A la distancia a la que un cuerpo puede estar de verdad**, y ése fue el
  // fallo de la primera versión: la oferta se ponía a 0,6 celdas de la fachada
  // y `avoid` mantiene a la gente a `radius + WALL_CLEAR` = 0,94. El punto era
  // inalcanzable, así que nadie llegaba nunca y la aldea se pasaba entre el
  // 72 % y el 92 % de la jornada andando. Un sitio al que no se puede llegar no
  // es un sitio.
  const STAND = 0.32 + WALL_CLEAR + 0.25;
  const tries: Point[] = [
    { x: x + w / 2, z: z + h + STAND },
    { x: x - STAND, z: z + h / 2 },
    { x: x + w + STAND, z: z + h / 2 },
    { x: x + w / 2, z: z - STAND },
  ];
  for (const at of tries) {
    if (at.x <= 0.5 || at.z <= 0.5) continue;
    if (at.x >= land.width - 0.5 || at.z >= land.height - 0.5) continue;
    if (!blockedAt(land, at.x, at.z)) return at;
  }
  return null;
}

/**
 * Los sitios del valle y lo que ofrecen, sacados de lo que hay construido.
 *
 * Se rehace cuando cambia el pueblo, que es una vez por jornada escénica.
 */
export function placesOf(state: GameState, land: Terrain): Place[] {
  const places: Place[] = [];
  for (const building of state.buildings) {
    if (building.lostTick !== null) continue;
    const menu = BY_BUILDING[building.kind];
    if (menu === undefined) continue;
    const at = doorOf(land, building.x, building.y, building.w, building.h);
    if (at === null) continue;

    const offers: Offer[] = [];
    for (const name of menu) {
      const spec = OFFERS[name];
      if (spec === undefined) continue;
      const offer = placedOffer(spec, at, land);
      if (offer !== null) offers.push(offer);
    }
    if (offers.length > 0) places.push({ id: `${building.kind}:${building.id}`, at, offers });
  }
  return places;
}

/**
 * Las ofertas que se pueden alcanzar desde un punto, con su aforo libre.
 *
 * `taken` dice cuánta gente hay ya en cada una: el pozo de dos plazas no aparece
 * si ya hay dos bebiendo. Sin eso, media aldea converge al mismo palmo de suelo
 * y lo que se ve es un montón, no un pozo.
 */
export function offersNear(
  places: readonly Place[],
  from: Point,
  within: number,
  taken: ReadonlyMap<string, number>,
): Offer[] {
  const found: Offer[] = [];
  for (const place of places) {
    if (Math.hypot(place.at.x - from.x, place.at.z - from.z) > within) continue;
    for (const offer of place.offers) {
      if ((taken.get(`${place.id}/${offer.id}`) ?? 0) >= offer.seats) continue;
      found.push(offer);
    }
  }
  return found;
}


/**
 * Los sitios donde de verdad se puede poner la gente alrededor de un punto.
 *
 * **El corro, pero sólo sobre suelo que se pisa.** Es el mismo reparto de
 * siempre —ángulo de oro, el radio creciendo despacio— con una diferencia que
 * resultó valer un tercio de la jornada: la plaza que cae en una pared o en el
 * río **no se ofrece**, y el barrido sigue a los anillos de más afuera hasta
 * juntar las que caben.
 *
 * Sin esto, `seatAt` devolvía un punto que podía estar dentro de un muro;
 * `decide` pedía la ruta hasta allí, `pathTo` contestaba que no hay camino
 * —porque no lo hay— y la persona se quedaba clavada hasta que se le pasaran
 * las ganas. Medido en ocho semillas: entre el 51 % y el 96 % del tiempo que
 * la aldea pasaba sin nada que hacer salía exactamente de aquí.
 *
 * **Y pisable basta: se probó pedir más y salió peor.** El segundo intento
 * exigía además que la plaza estuviera a `radius + WALL_CLEAR` de todo muro —el
 * mismo criterio que `doorOf` usa para la puerta— con el argumento de que una
 * plaza pegada a la pared es una plaza donde `avoid` te está echando siempre.
 * Medido, el argumento era cierto y la consecuencia al revés: ese criterio se
 * llevaba por delante siete sitios y 42 de las 159 plazas de la semilla 7, la
 * aldea se concentraba en lo que quedaba, y el apiñamiento que venía a evitar
 * **subió**. Una aldea con menos sitios donde estar es una aldea más apretada,
 * y eso pesa más que la holgura de cada plaza.
 */
export function seatsOn(land: Terrain, at: Point, want: number): Point[] {
  const found: Point[] = [];
  if (!blockedAt(land, at.x, at.z)) found.push(at);
  // Cuarenta intentos para llenar como mucho seis plazas: de sobra para rodear
  // un pozo encajonado, y un tope para no barrer el valle entero buscando.
  for (let ring = 1; found.length < want && ring < 40; ring += 1) {
    const angle = ring * 2.39996;
    const reach = 0.55 + Math.floor(ring / 4) * 0.5;
    const spot = { x: at.x + Math.sin(angle) * reach, z: at.z + Math.cos(angle) * reach };
    if (spot.x <= 0.5 || spot.z <= 0.5) continue;
    if (spot.x >= land.width - 0.5 || spot.z >= land.height - 0.5) continue;
    if (blockedAt(land, spot.x, spot.z)) continue;
    found.push(spot);
  }
  return found;
}

/**
 * Una oferta puesta en un sitio, con sus plazas ya comprobadas.
 *
 * Devuelve nada si no cabe nadie: un sitio al que no se puede llegar no es un
 * sitio, y es mejor que no exista a que exista y no se pueda usar.
 */
export function placedOffer(
  spec: OfferSpec, at: Point, land: Terrain, hours?: readonly [number, number],
): Offer | null {
  const spots = seatsOn(land, at, spec.seats);
  const first = spots[0];
  if (first === undefined) return null;
  return {
    ...spec,
    at: first,
    spots,
    // El aforo es lo que de verdad cabe, no lo que el catálogo querría.
    seats: spots.length,
    ...(hours === undefined ? {} : { hours }),
  };
}

/** La clave con la que se cuenta el aforo de una oferta en un sitio. */
export function seatKey(place: Place, offer: Offer): string {
  return `${place.id}/${offer.id}`;
}

/**
 * Dónde se pone el que ocupa la plaza número `n` de una oferta.
 *
 * **Cada plaza tiene su sitio**, y no tenerlo era la causa del apiñamiento que
 * se veía: una oferta de cuatro plazas tenía un solo punto, así que las cuatro
 * personas iban exactamente al mismo palmo de suelo y se pasaban el rato
 * empujándose. Medido antes de esto: 1 478 pasos con velocidad y sin avanzar,
 * y gente a 0,55 celdas cuando dos radios son 0,64.
 *
 * Se reparten en corro alrededor del punto, que además es lo que hace la gente
 * cuando hay algo que mirar: se ponen en círculo, no en fila india.
 */
export function seatAt(offer: Offer, seat: number): Point {
  // Las plazas comprobadas mandan: `seatsOn` ya descartó las que caían en una
  // pared o en el río.
  const { spots } = offer;
  if (spots !== undefined && spots.length > 0) {
    const at = seat <= 0 ? 0 : seat % spots.length;
    return spots[at] as Point;
  }
  if (seat <= 0 || offer.seats <= 1) return offer.at;
  // El ángulo de oro reparte sin alinear a nadie, y el radio crece despacio
  // para que un corro de seis no se convierta en una rueda de carro.
  const angle = seat * 2.39996;
  const ring = 0.55 + Math.floor(seat / 4) * 0.5;
  return { x: offer.at.x + Math.sin(angle) * ring, z: offer.at.z + Math.cos(angle) * ring };
}
