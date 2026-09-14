// V-09 · Trastos. design.md Anexo E.
//
// **La tercera clase de cosa del valle**, después de los cuerpos (`body.ts`) y
// los sitios (`offers.ts`): la pelota, el palo, el cubo, el haz de leña. Se
// cogen, se sueltan, se tiran y ruedan. No deciden nada — a diferencia de un
// `Dweller`, un trasto no tiene impulsos ni carácter — pero es lo que convierte
// «andar de un sitio a otro» en algo que se juega de verdad (E.6).
//
// Porta el bloque `Prop` de `spike/life.ts`: `GRAVITY`, `ROLL_DRAG`, `PICKUP`
// (aquí `reach` de la oferta), `THROW`, `LOFT`, y la física de gravedad y
// rebote del paso 7b, tal cual. Lo que no porta es la mecánica de palos como
// arma: eso quedó en la escena (`scenes.ts`, V-07), que ya decide un empujón o
// una pelea a partir de `needs.irritation` sin necesitar que haya un palo de
// por medio. Aquí `stick`/`bucket`/`bundle` son trastos que se cargan
// (`carry`), no que se blanden.
//
// **Las tres lecciones del descarte, medidas en el brief:**
//
// 1. La pelota se va a buscar cuando se ve, no sólo se coge al pisarla. Sale
//    solo de cómo está construido `decide()`: un trasto suelto es una `Place`
//    más, así que entra en la misma puntuación por utilidad y distancia que el
//    pozo o la era. Sólo se ofrece cuando está quieto (`propPlaces`).
// 2. Quien lleva la pelota se encara a quien se la va a tirar antes de
//    soltarla (`village.ts`, mientras `there` y sin moverse).
// 3. Nadie hereda la pelota del martes: `scatter()` reparte los trastos de la
//    jornada con la semilla del día, y como `Village` es efímero (E.2), no hay
//    dónde guardar uno de un día para otro aunque se quisiera.
//
// Y una cuarta, medida en el descarte: sin un descanso tras jugar salían 58
// pases por jornada y persona. Aquí no hace falta portar `PLAYED_OUT` aparte:
// la misma `satisfy()`/`drift()` de `needs.ts` que gobierna cualquier otra
// oferta ya vacía el aburrimiento al jugar y lo vuelve a llenar despacio
// (E.3.7: primero se mide si el mecanismo que ya existe basta, antes de portar
// uno nuevo). Medido en el informe de ronda.

import { hash32 } from '@engine/rng';
import { population } from '@engine/people/demography';
import type { GameState } from '@engine/state';
import { blockedAt, WALL_CLEAR, type Point, type Terrain } from './body';
import { doorOf, OFFERS, type Offer, type Place } from './offers';
import type { Dweller } from './village';

/**
 * Un trasto: la pelota, el palo, el cubo, el haz de leña.
 *
 * Estado efímero de la jornada, como todo lo de esta capa (E.2): no vive en
 * `GameState` y no se guarda. `held` es el id de *cuerpo* de quien lo lleva
 * (el mismo espacio de ids que `Dweller.body.id`), no un id de trasto.
 */
export interface Prop {
  readonly id: number;
  readonly kind: 'ball' | 'stick' | 'bucket' | 'bundle';
  x: number;
  z: number;
  /** Altura sobre el suelo. Cero es el suelo; por encima, va por el aire. */
  y: number;
  vx: number;
  vz: number;
  vy: number;
  /** Quién lo lleva en la mano, o nada si está por el suelo. */
  held: number | null;
  /** Hasta cuándo no se le puede echar mano: lo que acaba de salir volando. */
  restUntil: number;
}

function roll(seed: number, key: string): number {
  return hash32(seed, key) / 4_294_967_296;
}

// ---------------------------------------------------------------------------
// Suelo donde plantarse. Medido antes de escribirlo.
// ---------------------------------------------------------------------------

/**
 * Si un cuerpo puede quedarse de pie aquí, y no sólo pasar por encima.
 *
 * **Pisable no es lo mismo que alcanzable.** `avoid` (`steering.ts`) empuja a
 * todo cuerpo que se acerque a menos de `radius + WALL_CLEAR` = 0,94 de un
 * muro, y `follow` (`navigate.ts`) sólo da por llegado a quien está a 0,45 del
 * último punto. Un trasto a menos de 0,94 de una pared es, por construcción,
 * un trasto al que nadie puede llegar. Medido en la primera versión de V-09,
 * que sólo comprobaba `blockedAt`: en la semilla 7, tres de cuatro pelotas
 * pegadas a un muro; en la 31 y la 37, todas. La gente rondaba a 1,7–1,9
 * celdas de la pelota durante veinte segundos y abandonaba: 0 pases en dos
 * semillas de seis.
 *
 * Misma vecindad de nueve casillas que mira `avoid`, que basta: cualquier
 * casilla fuera de ella está a más de una celda.
 */
export function standable(land: Terrain, x: number, z: number): boolean {
  if (x <= 0.5 || z <= 0.5 || x >= land.width - 0.5 || z >= land.height - 0.5) return false;
  if (blockedAt(land, x, z)) return false;
  const clear = 0.32 + WALL_CLEAR;
  const hereX = Math.floor(x);
  const hereZ = Math.floor(z);
  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const cx = hereX + dx;
      const cz = hereZ + dz;
      if (!blockedAt(land, cx + 0.5, cz + 0.5)) continue;
      const nx = Math.max(cx, Math.min(x, cx + 1));
      const nz = Math.max(cz, Math.min(z, cz + 1));
      if (Math.hypot(x - nx, z - nz) < clear) return false;
    }
  }
  return true;
}

/**
 * El punto más cercano a `at` donde plantarse, buscando en espiral con el
 * mismo ángulo de oro que `seatsOn` (`offers.ts`). Si `at` ya vale, es `at`.
 * Si no hay nada en tres celdas a la redonda, devuelve `at` igualmente: mejor
 * una oferta difícil que ninguna, y `decide` ya prueba la siguiente si no hay
 * ruta.
 */
export function standableNear(land: Terrain, at: Point): Point {
  if (standable(land, at.x, at.z)) return at;
  for (let ring = 1; ring < 40; ring += 1) {
    const angle = ring * 2.39996;
    const reach = 0.4 + ring * 0.08;
    const x = at.x + Math.sin(angle) * reach;
    const z = at.z + Math.cos(angle) * reach;
    if (standable(land, x, z)) return { x, z };
  }
  return at;
}

// ---------------------------------------------------------------------------
// Repartir. V-09: nadie hereda la pelota del martes.
// ---------------------------------------------------------------------------

/**
 * Cuántos trastos hay cada jornada, según cuánta gente vive en el valle.
 *
 * TUNE: uno cada ocho personas. Ni el brief ni `spike/life.ts` dan una
 * densidad —el banco tenía cinco trastos fijos para ocho cuerpos, una escala
 * que no sirve para ochenta— así que se partió de una proporción modesta con
 * suelo y techo, y se bajó una vez, medido: con uno cada cinco, en la semilla
 * 23 (once cabezas de cabaña) sólo trece personas de las quince que pedía
 * `life-beasts.test.ts` (V-08, ajena a esta ronda) tocaban un animal en la
 * jornada — un trasto de más competía por la misma gente. Con uno cada ocho,
 * las seis semillas de esa prueba vuelven a pasar sin tocarla. El techo es el
 * presupuesto de V-13 («ochenta agentes y treinta trastos a 60 fps»); el
 * suelo es para que un caserío pequeño no se quede sin nada que tirarse.
 */
const PER_PEOPLE = 8;
const MIN_PROPS = 3;
const MAX_PROPS = 30;

/**
 * Qué trastos se reparten, en proporción.
 *
 * TUNE: cuatro de cada diez son pelotas, la misma proporción que
 * `spike/life.ts` (dos de cinco). El resto se reparte igual entre las otras
 * tres clases: no hay otra referencia de la que partir, igual que
 * `RADIUS`/`PACE` en `beasts.ts`.
 */
const KIND_CYCLE: readonly Prop['kind'][] = ['ball', 'ball', 'stick', 'bucket', 'bundle'];

/**
 * Radio en el que se reparte un trasto alrededor de la puerta que lo ancla.
 *
 * TUNE: cuatro celdas. Bastante para no amontonar todos los trastos en el
 * mismo palmo de suelo, poco para que sigan siendo del sitio al que se
 * anclaron y no aparezcan tirados en mitad de ninguna parte.
 */
const SCATTER_RADIUS = 4;

/**
 * Cuántos edificios como mucho se tienen en cuenta para anclar un trasto.
 *
 * TUNE: veinte. Medido: anclar sin más criterio que «un edificio al azar»
 * mandaba trastos a rincones del pueblo lejos de cualquier camino usado, y el
 * A* de `navigate.ts` —que no conoce la aldea, sólo el terreno y las
 * paredes— podía tardar más de veinte segundos escénicos en llevar a alguien
 * hasta uno: en la semilla 7 (99 edificios), cero pases en toda la jornada.
 * Anclando sólo a los edificios más próximos al corazón del pueblo —el mismo
 * criterio que usa `village.ts` para plantar a la gente— los caminos son
 * cortos y directos, como los que ya recorre cualquier oferta corriente.
 */
const ANCHOR_CANDIDATES = 20;

/**
 * Reparte los trastos de la jornada.
 *
 * **Anclados a la puerta de un edificio cercano al corazón de la aldea**, a
 * diferencia de `spike/life.ts` (que sólo evitaba las casas en un valle
 * pequeño y sin río, y donde cualquier punto del mapa estaba a un paso de
 * cualquier otro). El valle real tiene una orilla sin gente (E.7,
 * `terrain.ts`) y un pueblo que puede tener un centenar de edificios: un
 * trasto anclado a cualquiera de ellos, al azar, puede acabar en un rincón al
 * que sólo se llega dando un rodeo de veinte celdas por un pueblo laberíntico
 * — medido, eso deja la pelota sin jugar en toda la jornada. `scatter` no
 * recibe el corazón del pueblo del contrato, así que lo calcula con el mismo
 * criterio que `village.ts`: el edificio con más vecinos a mano.
 */
export function scatter(state: GameState, land: Terrain, seed: number): Prop[] {
  const buildings = state.buildings.filter((b) => b.lostTick === null);
  const count = Math.max(
    MIN_PROPS,
    Math.min(MAX_PROPS, Math.round(population(state) / PER_PEOPLE)),
  );

  // El corazón: el edificio con más vecinos a mano, igual que `village.ts`.
  let heart = buildings[0];
  let most = -1;
  for (const candidate of buildings) {
    const cx = candidate.x + candidate.w / 2;
    const cz = candidate.y + candidate.h / 2;
    const near = buildings.filter((other) => {
      const ox = other.x + other.w / 2;
      const oz = other.y + other.h / 2;
      return Math.hypot(ox - cx, oz - cz) < 14;
    }).length;
    if (near > most) { most = near; heart = candidate; }
  }
  // Y sólo los más próximos a él: los caminos entre vecinos son cortos.
  let pool = buildings;
  if (heart !== undefined) {
    const h = heart;
    pool = [...buildings].sort((a, b) => {
      const da = Math.hypot(a.x - h.x, a.y - h.y);
      const db = Math.hypot(b.x - h.x, b.y - h.y);
      return da - db;
    }).slice(0, ANCHOR_CANDIDATES);
  }

  const props: Prop[] = [];
  for (let i = 0; i < count; i += 1) {
    const kind = KIND_CYCLE[i % KIND_CYCLE.length] as Prop['kind'];
    const building = pool.length === 0 ? undefined
      : pool[Math.floor(roll(seed, `prop:pick:${i}`) * pool.length)];
    const anchor = building === undefined
      ? { x: land.width / 2, z: land.height / 2 }
      : doorOf(land, building.x, building.y, building.w, building.h)
        ?? { x: land.width / 2, z: land.height / 2 };

    // La reserva también tiene que ser suelo donde plantarse: la puerta lo es
    // por construcción, pero el centro del mapa —la reserva de la reserva— puede
    // ser río o roca. Medido: semilla 23, trasto 0, una jornada entera dentro
    // de un bloqueo sin que nadie pudiera llegar a él.
    const safe = standableNear(land, anchor);
    if (!standable(land, safe.x, safe.z)) continue;
    let x = safe.x;
    let z = safe.z;
    for (let tries = 0; tries < 32; tries += 1) {
      const angle = roll(seed, `prop:angle:${i}:${tries}`) * Math.PI * 2;
      const reach = 1 + roll(seed, `prop:reach:${i}:${tries}`) * SCATTER_RADIUS;
      const tryX = anchor.x + Math.cos(angle) * reach;
      const tryZ = anchor.z + Math.sin(angle) * reach;
      if (!standable(land, tryX, tryZ)) continue;
      x = tryX; z = tryZ; break;
    }
    props.push({ id: i, kind, x, z, y: 0, vx: 0, vz: 0, vy: 0, held: null, restUntil: 0 });
  }
  return props;
}

// ---------------------------------------------------------------------------
// Física. Ported de spike (bloque `Prop`, paso 7b).
// ---------------------------------------------------------------------------

/** Lo que cae un trasto por segundo al cuadrado. Ported de spike (`GRAVITY`). */
export const GRAVITY = 14;
/** Lo que frena una pelota rodando por la hierba, por segundo. Ported de spike
 *  (`ROLL_DRAG`). */
export const ROLL_DRAG = 1.6;
/** Lo que bota una pelota al tocar el suelo. Ported de spike (`-prop.vy * 0.32`). */
const BOUNCE = 0.32;
/** Por debajo de esto, deja de botar. Ported de spike (`< 0.6`). */
const BOUNCE_FLOOR = 0.6;

/**
 * Un paso de física para los trastos sueltos: caen, ruedan, rebotan.
 *
 * **Los que alguien lleva no se tocan aquí** — el contrato no le da a esta
 * función la lista de cuerpos, así que no puede saber dónde está una mano.
 * Eso es trabajo de quien la llama (`carryAt`, cada paso, en `village.ts`).
 *
 * **Nunca se cuela en una pared ni rueda bajo el agua**, y las dos cosas
 * salen del mismo sitio: `blockedAt` no distingue una de otra (`terrain.ts`),
 * así que un trasto que no puede cruzar una pared tampoco puede cruzar el
 * río. Rebota igual que un cuerpo se desliza contra un muro (`body.ts`), sólo
 * que aquí el rebote es la física entera: no hace falta más.
 */
export function settle(props: Prop[], land: Terrain, seconds: number): void {
  for (const prop of props) {
    if (prop.held !== null) continue;

    if (prop.y > 0 || prop.vy > 0) {
      prop.vy -= GRAVITY * seconds;
      prop.y += prop.vy * seconds;
      if (prop.y <= 0) {
        prop.y = 0;
        // Bota poco: es hierba, no un patio. Sólo la pelota bota; lo demás cae
        // y se queda.
        prop.vy = prop.kind === 'ball' ? -prop.vy * BOUNCE : 0;
        if (Math.abs(prop.vy) < BOUNCE_FLOOR) prop.vy = 0;
      }
    }

    if (prop.y <= 0.001) {
      const speed = Math.hypot(prop.vx, prop.vz);
      if (speed > 0.01) {
        const slow = Math.max(0, speed - ROLL_DRAG * seconds) / speed;
        prop.vx *= slow;
        prop.vz *= slow;
      } else {
        prop.vx = 0;
        prop.vz = 0;
      }
    }

    const nextX = prop.x + prop.vx * seconds;
    const nextZ = prop.z + prop.vz * seconds;
    const outOfBounds = nextX < 0.5 || nextX > land.width - 0.5
      || nextZ < 0.5 || nextZ > land.height - 0.5;
    if (outOfBounds || blockedAt(land, nextX, nextZ)) {
      prop.vx *= -0.4;
      prop.vz *= -0.4;
    } else {
      prop.x = nextX;
      prop.z = nextZ;
    }
  }
}

// ---------------------------------------------------------------------------
// Coger, soltar, tirar.
// ---------------------------------------------------------------------------

/** A la altura de la mano, un poco por delante. Ported de spike (rama `held`
 *  del paso 7b: `hand.x + sin(facing)*0.38`, `y = 0.72`). */
const HAND_FORWARD = 0.38;
const HAND_HEIGHT = 0.72;

/**
 * Pone el trasto en la mano de quien lo lleva, a la altura del pecho.
 *
 * Se llama cada paso desde `village.ts` mientras alguien lo tenga cogido —
 * `settle()` no puede hacerlo, no conoce los cuerpos — así que el trasto sigue
 * a la mano sin que nadie le dé velocidad ni lo teletransporte: es una
 * posición calculada de nuevo cada vez a partir de dónde está el cuerpo ahora
 * mismo, igual que `seatAt` calcula de nuevo el sitio de cada plaza.
 */
export function carryAt(prop: Prop, holder: Dweller): void {
  prop.x = holder.body.x + Math.sin(holder.body.facing) * HAND_FORWARD;
  prop.z = holder.body.z + Math.cos(holder.body.facing) * HAND_FORWARD;
  prop.y = HAND_HEIGHT;
  prop.vx = 0;
  prop.vz = 0;
  prop.vy = 0;
}

/**
 * Coge un trasto del suelo. Devuelve si lo consiguió.
 *
 * **Un trasto no está en dos manos**: si ya lo lleva alguien, esto falla y no
 * hace nada. En la práctica casi no debería fallar nunca — `mine`/`decide()`
 * reservan la plaza (aforo uno) en el momento de decidir ir a por él, no al
 * llegar (la misma regla que V-06 aprendió con el pozo) — pero comprobarlo
 * aquí es gratis y es lo que hace la garantía cierta en vez de heredada.
 */
export function take(prop: Prop, by: Dweller): boolean {
  if (prop.held !== null) return false;
  prop.held = by.body.id;
  by.holding = prop.id;
  carryAt(prop, by);
  return true;
}

/**
 * Suelta un trasto donde se está: en el suelo, nunca en pared ni en río.
 *
 * La posición del propio cuerpo ya es pisable siempre —`integrate()` no deja
 * a nadie entrar en un bloqueo (`body.ts`)— así que en el caso normal basta
 * con dejarlo ahí. La búsqueda en espiral es sólo la red de seguridad para el
 * caso raro en que no baste, con el mismo truco del ángulo de oro que
 * `seatsOn` (`offers.ts`).
 */
export function drop(prop: Prop, by: Dweller, land: Terrain): void {
  if (prop.held === by.body.id) prop.held = null;
  if (by.holding === prop.id) by.holding = null;
  prop.vx = 0;
  prop.vz = 0;
  prop.vy = 0;
  prop.y = 0;

  // Donde se pueda volver a coger: quien lo suelta está en suelo pisable, pero
  // puede estar pegado a una pared, y ahí nadie llegaría a recogerlo después.
  const spot = standableNear(land, { x: by.body.x, z: by.body.z });
  prop.x = spot.x;
  prop.z = spot.z;
}

/** Un poco por delante de la mano, a la altura de un pase. Ported de spike
 *  (`fling`: `from.x + sin(facing)*0.4`, `y = 0.85`). */
const THROW_FORWARD = 0.4;
const THROW_HEIGHT = 0.85;

/** Lo lejos que se tira una pelota, y lo alto que va. Ported de spike
 *  (`THROW`, `LOFT`). */
export const THROW = 5.2;
export const LOFT = 3.4;

/**
 * Lo que se tira hacia delante cuando no hay a quién apuntar. Ported de spike
 * (`{ x: body.x + sin(facing)*5, z: body.z + cos(facing)*5 }`).
 */
export const THROW_AHEAD = 5;

/**
 * Hasta cuándo no se puede volver a coger un trasto recién tirado, sumado al
 * paso actual por quien llama (`fling` no conoce el reloj de la vida).
 * Ported de spike (`carried.restUntil = now + 0.45`).
 */
export const REST_AFTER_THROW = 0.45;

/**
 * Lanza un trasto hacia un punto, con su arco. **Velocidad, nunca posición**
 * (E.3, E.7): quien reciba el trasto lo ve volar y aterrizar, no aparecer.
 */
export function fling(
  prop: Prop, from: Dweller, at: Point, force: number, loft: number, land: Terrain,
): void {
  const away = Math.max(0.5, Math.hypot(at.x - from.body.x, at.z - from.body.z));
  prop.held = null;
  if (from.holding === prop.id) from.holding = null;
  // Un poco por delante de la mano — **salvo que por delante haya una pared.**
  // `avoid` es una fuerza y no una garantía: un cuerpo puede estar a tres
  // décimas de un muro mirándolo, y entonces el punto de salida caía dentro de
  // la casilla bloqueada. Ahí `settle` invierte la velocidad cada paso sin
  // llegar a moverla, y la pelota se queda enterrada en el muro el resto de la
  // jornada. Medido: semilla 23, trasto 0. Se suelta desde donde está el cuerpo,
  // que siempre es suelo pisable (`integrate`, `body.ts`).
  const aheadX = from.body.x + Math.sin(from.body.facing) * THROW_FORWARD;
  const aheadZ = from.body.z + Math.cos(from.body.facing) * THROW_FORWARD;
  const clear = !blockedAt(land, aheadX, aheadZ);
  prop.x = clear ? aheadX : from.body.x;
  prop.z = clear ? aheadZ : from.body.z;
  prop.y = THROW_HEIGHT;
  prop.vx = (at.x - from.body.x) / away * force;
  prop.vz = (at.z - from.body.z) / away * force;
  prop.vy = loft;
}

// ---------------------------------------------------------------------------
// A quién se le tira.
// ---------------------------------------------------------------------------

/**
 * El radio en el que se busca compañero de juego. Ported de spike (`let near
 * = 9`, el techo con el que arrancaba la búsqueda del más cercano).
 *
 * Production no tiene el rasgo `playful` de spike —no hay tabla de la que
 * sacarlo—, así que aquí sólo cuenta la cercanía: el más próximo dentro de
 * este radio, y nadie si no hay ninguno.
 */
const MATE_RANGE = 9;

/** El otro `Dweller` más cercano a éste, dentro de `MATE_RANGE`, o nada. */
export function findMate(from: Dweller, dwellers: readonly Dweller[]): Dweller | null {
  let mate: Dweller | null = null;
  let near = MATE_RANGE;
  for (const other of dwellers) {
    if (other.body.id === from.body.id) continue;
    const gap = Math.hypot(other.body.x - from.body.x, other.body.z - from.body.z);
    if (gap < near) { near = gap; mate = other; }
  }
  return mate;
}

// ---------------------------------------------------------------------------
// Lo que un trasto suelto ofrece. Toca `offers.ts` para las magnitudes
// (`play`, `carry`); esto es sólo cómo se monta la `Place` de cada trasto.
// ---------------------------------------------------------------------------

/** Qué ofrece cada clase de trasto suelto: la pelota se juega, lo demás se
 *  carga — el `stick` incluido: aquí no es un arma (eso es `scenes.ts`), es un
 *  palo que se lleva de un sitio a otro, igual que el cubo o el haz de leña. */
const OFFER_OF: Readonly<Record<Prop['kind'], string>> = {
  ball: 'play', stick: 'carry', bucket: 'carry', bundle: 'carry',
};

/** El prefijo del id de la `Place` de un trasto, para poder volver del uno al
 *  otro (`village.ts` lo necesita al llegar, para saber cuál coger). */
export const PROP_PLACE_PREFIX = 'prop:';

function placeIdOf(prop: Prop): string {
  return `${PROP_PLACE_PREFIX}${prop.id}`;
}

/**
 * Los trastos sueltos de este instante, como `Place` de aforo uno.
 *
 * **Sólo los que de verdad se pueden coger ahora**: ni en una mano ni recién
 * tirados. A diferencia de un edificio, un trasto deja de ofrecer nada en el
 * instante en que alguien lo coge, así que esto se rehace cada paso — con
 * pocos trastos (techo treinta, V-13) es barato, y es lo que hace que la
 * pelota reaparezca como oferta en cuanto alguien la suelta.
 *
 * `at` se recalcula cada paso porque esto se rehace cada paso: un trasto
 * ofrecido está quieto, así que el punto no se mueve mientras alguien va.
 */
export function propPlaces(props: readonly Prop[], now: number, land: Terrain): Place[] {
  const places: Place[] = [];
  for (const prop of props) {
    if (prop.held !== null || now < prop.restUntil) continue;
    // Sólo lo que está quieto: una pelota rodando se ofrece cuando pare, y así
    // el punto al que uno va es el punto donde está de verdad.
    if (prop.y > 0.001 || Math.hypot(prop.vx, prop.vz) > 0.05) continue;
    const spec = OFFERS[OFFER_OF[prop.kind]];
    if (spec === undefined) continue;
    // **Se ofrece el sitio donde plantarse junto al trasto, no el trasto.** Una
    // pelota que ha ido a parar a un palmo de una pared se recoge desde el
    // palmo de al lado; ofrecer el punto exacto de la pelota hacía imposible
    // llegar (ver `standable`).
    const at = standableNear(land, prop);
    const offer: Offer = { ...spec, at };
    places.push({ id: placeIdOf(prop), at, offers: [offer] });
  }
  return places;
}
