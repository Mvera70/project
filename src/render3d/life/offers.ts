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
import { blockedAt } from './body';
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
}

/** El molde de una oferta, sin sitio: el sitio lo pone el edificio. */
interface OfferSpec {
  readonly id: string;
  readonly reach: number;
  readonly seats: number;
  readonly gives: Partial<Record<NeedName, number>>;
  readonly seconds: readonly [number, number];
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
  const tries: Point[] = [
    { x: x + w / 2, z: z + h + 0.6 },
    { x: x - 0.6, z: z + h / 2 },
    { x: x + w + 0.6, z: z + h / 2 },
    { x: x + w / 2, z: z - 0.6 },
    { x: x + w / 2, z: z + h / 2 },
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
      offers.push({ ...spec, at });
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

/** La clave con la que se cuenta el aforo de una oferta en un sitio. */
export function seatKey(place: Place, offer: Offer): string {
  return `${place.id}/${offer.id}`;
}
