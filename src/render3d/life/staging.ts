// V-11 · Lo que el motor manda. design.md Anexo E (V-11), §11.8, §7.9.
//
// **La dirección del dato es de una sola mano: el motor manda, la vida
// obedece.** Todo lo demás de esta capa decide por su cuenta —quién tiene sed,
// quién se aburre, quién se para a hablar—, y eso es lo que la hace viva. Pero
// hay cosas que no son suyas: si una decisión del jugador convocó a la aldea en
// el vado, la aldea está en el vado, y no porque a nadie le apetezca.
//
// **Y esto llevaba roto desde G-12, medido y declarado.** §11.8 dice que
// veinticinco de las cincuenta y seis opciones del catálogo convocan a la
// aldea, y el principio 1 del juego exige que toda opción cambie algo en
// pantalla. Hasta G-11 lo cumplía `actorsFor`: el día que había reunión, nadie
// iba al tajo y todos compartían destino. G-12 puso esta capa por defecto,
// `actorsFor` dejó de ejecutarse, y nadie lo vio porque la prueba que lo
// vigilaba llamaba a `actorsFor` directamente. `tests/fast/life-staging.test.ts`
// lo dejó escrito en rojo: el más lejano se quedaba a más de tres celdas del
// sitio de la reunión, porque la vida repartía a cada uno por sus propias
// ofertas y no había oído la orden.

import { CATALOG } from '@engine/crossroads/catalog';
import type { GameState, VillagerId } from '@engine/state';
import { gatheringsAt } from '@derive/gatherings';
import type { Point, Terrain } from './body';
import { OFFERS, placedOffer, type OfferSpec, type Place } from './offers';

/**
 * Lo que el motor le ordena a la jornada.
 *
 * Tres clases, y sólo la primera está servida hoy. Las otras dos quedan en el
 * tipo porque el brief las nombra y porque **lo que falta para servirlas está
 * medido**, no por adorno:
 *
 *  · `quarrel` — la riña de §7.9 existe en la crónica con los **nombres** de
 *    los dos, no con sus `id` (`sim.ts`, `quarrel.words`/`quarrel.blows`), y
 *    `quarrelOf` no se puede llamar desde aquí: consume azar del motor, y una
 *    tirada de esta capa jamás puede desplazar la simulación (§4.3). Para
 *    servirla hay que hacer que la entrada de crónica lleve los dos `id`, que
 *    es un cambio del motor y no de aquí.
 *  · `mourn` — lo mismo con la muerte: la crónica da el nombre.
 */
export type Order =
  | { readonly kind: 'gather'; readonly at: Point; readonly days: number }
  | { readonly kind: 'quarrel'; readonly a: VillagerId; readonly b: VillagerId; readonly blows: boolean }
  | { readonly kind: 'mourn'; readonly who: VillagerId };

/**
 * Las órdenes vivas para la jornada que empieza.
 *
 * Lee el estado congelado y nada más: es una función pura, no consume azar y no
 * toca la simulación.
 *
 * **La ventana es la semana en curso, y hasta v3.72 era de ocho.** Mientras una
 * jornada escénica cubría ocho semanas del motor, había que preguntar por «las
 * ocho últimas» o la mitad de las reuniones no se veían nunca: empezaban y
 * acababan entre dos amaneceres. Ahora una semana son siete jornadas
 * (`TIME.DAYS_PER_WEEK`), así que una reunión de una semana se ve **siete
 * jornadas seguidas** y preguntar por ahora mismo es lo correcto. Si algún día
 * la semana vuelve a durar menos que una jornada, esto vuelve a necesitar
 * ventana.
 */
export function ordersOf(state: GameState, since: number = state.tick): Order[] {
  return gatheringsAt(state, CATALOG, since)
    .map((meeting): Order => ({
      kind: 'gather',
      // `Gathering` habla en coordenadas del mapa (`x`, `y`); esta capa llama
      // `z` al segundo eje porque dibuja en tres dimensiones. Es el mismo punto.
      at: { x: meeting.x, z: meeting.y },
      days: meeting.ticks,
    }));
}

/**
 * El sitio que una reunión pone en el valle, o nada si ahí no cabe nadie.
 *
 * Un `Place` como cualquier otro —por eso `decide()` no necesita saber que esto
 * existe— con tres cosas que ningún otro tiene: aforo de aldea entera, hora
 * fija al mediodía, y lo que da es compañía y no deber. Una reunión no es un
 * turno de trabajo.
 */
export function meetingPlace(order: Order, land: Terrain, index: number): Place | null {
  if (order.kind !== 'gather') return null;
  const offer = placedOffer(OFFERS['gather'] as OfferSpec, order.at, land, MEETING_HOURS);
  if (offer === null) return null;
  // **El sitio es donde se puede estar, no donde el motor apunta**, y esto
  // costó una tarde de depuración. §11.8 convoca «en la capilla», «en la plaza»
  // o «en el vado», y `placeOf` devuelve el punto de esa cosa: el de la capilla
  // cae **dentro** de la capilla, que para un cuerpo es una pared
  // (`life/terrain.ts` cierra los edificios con muro). Con el punto crudo como
  // `at`, la reunión quedaba fuera de la orilla alcanzable y el valle la
  // descartaba entera —medido: veinticuatro personas repartidas por sus campos
  // como si no hubiera pasado nada—. `placedOffer` ya ha buscado suelo pisable
  // alrededor: su primera plaza es la puerta de la reunión.
  return { id: `gather:${index}`, at: offer.at, offers: [offer] };
}

/**
 * La hora de la reunión, como fase de la jornada.
 *
 * TUNE: de 0,25 a 0,75. Fija porque el brief lo pide —«una `Place` temporal con
 * aforo alto y hora fija»— y ancha porque una reunión de la aldea no es una
 * misa: la gente llega, se queda un rato y se va, y la ventana tiene que cubrir
 * el mediodía entero para que quien la mire a cualquier hora razonable vea
 * gente. Fuera de ella `hourFactor` la deja en 0,6 y no en cero, así que un
 * rezagado sigue acercándose al anochecer.
 */
const MEETING_HOURS: readonly [number, number] = [0.25, 0.75];
