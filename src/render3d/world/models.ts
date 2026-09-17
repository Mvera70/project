// V-15 · Qué malla lleva cada persona. design.md D.6.2, Anexo E.
//
// **El problema que esta fase resuelve, dicho corto:** hasta ahora la malla se
// elegía **por el oficio** (`VILLAGER_BY_ROLE`, que vivía en `renderer.ts`), y
// en este juego los oficios son siete y la mayoría de la gente **no tiene
// ninguno**. Así que un niño, un anciano, un leñador, un albañil o un pastor no
// podían tener figura propia: no son oficios, y no hay hueco donde ponerlos.
// De hecho no se podían ni pedir al taller de arte, porque llegarían sin poder
// entrar en el juego.
//
// Lo dijo el dueño del diseño el 16 sep 2026, al corregirme cuando yo daba por
// hecho que el granjero tendría que sustituir al aldeano base: «esto futuro
// puede implementarse en nuevos aldeanos, no significa que el granjero vaya a
// ser el aldeano base». O sea que **el repertorio crece**, y el render tiene que
// admitir tipos que el motor no nombra.
//
// **Y no hace falta tocar el motor para eso.** El render ya recibe, por actor,
// la edad y lo que esa persona está haciendo ahora mismo: son datos que la capa
// de vida calcula y pasa en `Actor` (`contracts.ts`). Esta fase sólo cambia
// **de qué se lee** la malla.
//
// **Cómo entra el arte, y por qué esto se puede escribir antes que las mallas.**
// La regla devuelve un **nombre deseado**, y quien lo consume prueba ese nombre
// y **cae al aldeano base si el recurso no existe**. Así que el día que llegue
// `villager-child` de la sesión de Blender, los niños del valle cambian de
// figura sin tocar una línea; y mientras no llegue, se ven exactamente como
// hoy. No hay un paso de integración: hay mallas que aparecen.
//
// El encargo de arte con la lista entera y sus restricciones está en
// `docs/graphics-rounds/aldeanos-por-hacer.md`.

import { LIFE } from '@engine/balance';
import type { Role } from '@engine/state';
import type { Actor } from '../contracts';

/**
 * Los siete oficios con malla propia, tal como estaban en `renderer.ts`.
 *
 * `stranger` no está y es deliberado: no es un oficio, es «sin oficio todavía»,
 * y por eso usa el aldeano base. Si algún día quiere figura propia —y la lista
 * de encargo la pide, porque un desconocido entre conocidos se nota— entra por
 * la regla de abajo y no por aquí.
 */
export const VILLAGER_BY_ROLE: Readonly<Record<Exclude<Role, 'stranger'>, string>> = {
  leader: 'villager-leader',
  smith: 'villager-smith',
  midwife: 'villager-midwife',
  priest: 'villager-priest',
  woodward: 'villager-woodward',
  reeve: 'villager-reeve',
  herbalist: 'villager-herbalist',
};

/**
 * La malla del aldeano de siempre. Es el respaldo de todo lo de este fichero:
 * ninguna regla puede dejar a una persona sin figura.
 */
export const BASE_VILLAGER = 'villager';

/**
 * La figura del forastero, que **no es un oficio** aunque el motor lo guarde en
 * `role`: es «sin oficio todavía». Por eso no está en `VILLAGER_BY_ROLE` y entra
 * aquí, como los tipos que se eligen por lo que se hace. Es la figura que más
 * se nota en un valle —un desconocido entre conocidos— y mientras el taller no
 * la entregue, cae al base como siempre.
 */
export const STRANGER_VILLAGER = 'villager-stranger';

/**
 * **Todos los nombres que la cadena puede pedir**, incluidos los que el taller
 * todavía no ha entregado.
 *
 * Existe por un fallo que habría sido invisible: el cargador (`assets.ts`) sólo
 * trae los ids de la lista `WANTED` del renderer, y **un id que no está en esa
 * lista no se carga aunque exista en el catálogo**. Sin esto, `villager-farmer`
 * habría entrado en `art/catalog.json`, la cadena lo habría pedido, el cargador
 * lo habría ignorado, y la cadena habría caído al aldeano base para siempre sin
 * que nadie supiera por qué. El renderer mete esta lista en `WANTED`; un id que
 * aún no existe en el manifiesto simplemente se salta, así que no cuesta nada
 * pedirlo antes de tiempo.
 */
export const VILLAGER_MODELS: readonly string[] = [
  BASE_VILLAGER,
  ...Object.values(VILLAGER_BY_ROLE),
  'villager-child', 'villager-elder', STRANGER_VILLAGER,
  'villager-farmer', 'villager-woodcutter', 'villager-mason', 'villager-shepherd', 'villager-fisher',
];

/**
 * Hasta qué edad se es un crío y desde cuál se es un mayor, **leídos del motor**
 * (`LIFE.ADULT`) y no escritos aquí.
 *
 * Importa que sean los mismos que usa el resto del juego: la capa de vida ya
 * hace que los críos busquen más cerca de casa y que los mayores prefieran
 * pausas próximas con estos mismos umbrales (IA-3). Si la figura se partiera por
 * una edad distinta, se vería un adulto pequeño comportándose como un niño.
 */
const CHILD_UNDER = LIFE.ADULT[0];
const ELDER_OVER = LIFE.ADULT[1];

/**
 * Talla escénica contra un adulto. La malla infantil ya tiene proporciones de
 * niño, pero comparte los 1,95 m de altura base del rig adulto; por eso necesita
 * una reducción adicional. Las referencias visuales son 0,55 a los cuatro,
 * 0,67 a los ocho, 0,80 a los doce y 0,86 a los catorce. Entre quince y
 * dieciocho se completa el crecimiento sin un salto brusco al cambiar de malla.
 */
export function statureAt(age: number): number {
  if (age >= 60) return 0.97 - Math.min(0.05, (age - 60) * 0.003);
  if (age >= 18) return 1;
  if (age >= CHILD_UNDER) return 0.9 + (age - CHILD_UNDER) / (18 - CHILD_UNDER) * 0.1;
  return 0.42 + Math.max(0, age) / (CHILD_UNDER - 1) * 0.44;
}

/** La distinción de altura de los personajes nombrados empieza al ser adulto. */
export function displayScaleFor(actor: Pick<Actor, 'age' | 'named'>): number {
  const namedAdult = actor.named && actor.age >= 18 ? 1.08 : 1;
  return statureAt(actor.age) * namedAdult;
}

/**
 * Lo que una persona está haciendo, en los términos que le importan a la malla.
 *
 * Lo calcula la capa de vida (`life/cast.ts`) del sitio y la oferta que esa
 * persona está consumiendo, y llega en `Actor.occupation`. Es una lista corta a
 * propósito: **sólo lo que cambiaría la silueta**. No es el catálogo de ofertas
 * —hay quince— ni el de oficios del motor; es «qué figura pediría a un
 * ilustrador para esta persona en este instante».
 */
export type Occupation =
  | 'field'      // trabaja la tierra: es lo que hace la mayoría
  | 'felling'    // en el tajo del bosque, talando
  | 'building'   // en una obra
  | 'herding'    // con el rebaño: dando de comer, acariciando, espantando
  | 'water'      // en el vado o en el pozo
  | null;        // nada que distinga una silueta

/**
 * La malla que le corresponde a este actor, en orden de lo que más manda.
 *
 * El orden **es** la decisión de diseño, así que va explicado:
 *
 * 1. **La edad primero, por encima del oficio.** Un niño es un niño aunque un
 *    día herede un cargo, y un anciano es un anciano aunque sea el jefe. Es
 *    además la distinción que más se lee a la distancia de la cámara —silueta
 *    baja y cabeza grande, o espalda encorvada— y el cuaderno de referencia
 *    visual del dueño dice que a veinte píxeles lo que se lee es la silueta.
 * 2. **Después el oficio**, que es lo que había antes de esta fase y sigue
 *    valiendo: el herrero es herrero esté en la fragua o cruzando la plaza,
 *    porque el oficio es quién eres y no qué haces ahora.
 * 3. **Y por último lo que está haciendo**, que es lo que esta fase añade y lo
 *    que da figura a la mayoría de la aldea, que no tiene oficio: el que labra,
 *    el que tala, el que levanta un muro, el que anda con el rebaño.
 *
 * Quien llame a esto tiene que **caer al aldeano base** si el nombre devuelto
 * no tiene recurso. Ver la cabecera del fichero.
 */
export function modelFor(actor: Actor): string {
  return modelChainFor(actor)[0] as string;
}

/**
 * Las mallas que le valen a este actor, de la que más le cuadra a la que menos,
 * **y siempre con el aldeano base al final**.
 *
 * Es una cadena y no un solo nombre por una razón que costó verla: con un único
 * respaldo al base, **un jefe anciano perdía su malla de jefe**. Pedía
 * `villager-elder`, que todavía no existe, y se caía directo al aldeano de
 * siempre — o sea que enganchar esta regla habría **empeorado** lo que se ve
 * hoy, justo lo contrario de lo que pretendía.
 *
 * Con la cadena, ese jefe anciano pide anciano, no lo hay, pide jefe, y lo hay.
 * Y el día que llegue la malla de anciano, la coge sin tocar nada. La regla de
 * abajo es la misma de siempre: **manda la edad, luego el oficio, luego lo que
 * se está haciendo**, sólo que ahora expresada como preferencia y no como
 * decisión única.
 */
export function modelChainFor(actor: Actor): readonly string[] {
  const chain: string[] = [];

  if (actor.age < CHILD_UNDER) chain.push('villager-child');
  else if (actor.age > ELDER_OVER) chain.push('villager-elder');

  if (actor.role === 'stranger') chain.push(STRANGER_VILLAGER);
  else if (actor.role !== null) chain.push(VILLAGER_BY_ROLE[actor.role]);

  switch (actor.occupation) {
    case 'field': chain.push('villager-farmer'); break;
    case 'felling': chain.push('villager-woodcutter'); break;
    case 'building': chain.push('villager-mason'); break;
    case 'herding': chain.push('villager-shepherd'); break;
    case 'water': chain.push('villager-fisher'); break;
    default: break;
  }

  chain.push(BASE_VILLAGER);
  return chain;
}

/**
 * De qué sitio y qué oferta sale cada ocupación.
 *
 * Vive aquí y no en `life/cast.ts` para que la regla entera —qué figura y de
 * dónde sale— se lea de un tirón, y para que una prueba pueda comprobarla sin
 * montar una jornada.
 *
 * Los identificadores de sitio los pone `life/offers.ts`: `felling:<cell>` es el tajo
 * del bosque, `works:<id>` una obra en marcha, `<clase>:<id>` un edificio, y
 * `ford:crossing` el vado. Las ofertas son las de `OFFERS`.
 */
export function occupationOf(placeId: string, offerId: string): Occupation {
  if (placeId === 'felling' || placeId.startsWith('felling:')) return 'felling';
  if (placeId.startsWith('works:') || placeId.startsWith('quarry:')) return 'building';
  if (placeId.startsWith('field:') && offerId === 'work') return 'field';
  if (offerId === 'feed' || offerId === 'pet' || offerId === 'chase') return 'herding';
  if (offerId === 'drink' && placeId.startsWith('ford:')) return 'water';
  return null;
}
