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
// Y una cuarta: sin un descanso tras jugar salían 58 pases por jornada y
// persona en el descarte. V-09 confió en que la misma `satisfy()`/`drift()`
// de `needs.ts` bastara sin portar `PLAYED_OUT` aparte (E.3.7); medido, no
// bastó, así que V-09b lo porta (`PLAYED_OUT`, abajo) y añade `Dweller.
// playedUntil` (`village.ts`). Informe de ronda: `docs/historico/life-rounds/V-09.md`
// y su sección V-09b.
//
// **V-09b añade la quinta lección, y es la que faltaba para que se jugara de
// verdad:** en el descarte, recibir un pase no era una elección — la pelota
// paraba cerca de alguien con dueño y ese alguien la cogía sin volver a
// competir por ella. Aquí el receptor tenía que ganar el mismo concurso de
// utilidad que cualquier otra oferta, y casi nunca lo ganaba: la cadena
// moría en el primer pase (medido: 6 % de las veces jugar valía más que lo
// que ya se hacía). `Prop.for` y el bloque de `village.ts` que lo lee tras
// `settle()` son ese arreglo: una interacción entre dos, como una escena de
// V-07, que no pasa por `decide`.

import { hash32 } from '@engine/rng';
import { population } from '@engine/people/demography';
import { hasTrait } from '@engine/state';
import type { GameState } from '@engine/state';
import { aleWindow } from '@engine/world/means';
import { plazaCentre } from '@engine/world/plaza';
import { blockedAt, fitsCircle, WALL_CLEAR, type Point, type Terrain } from './body';
import { doorOf, OFFERS, placedOffer, type Offer, type OfferSpec, type Place } from './offers';
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
  readonly kind: 'ball' | 'stick' | 'bucket' | 'bundle' | 'stone' | 'grain' | 'barrel' | 'plough';
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
  /**
   * V-09b: id de *cuerpo* a quien se lanzó éste, o nada. Lo pone `fling`;
   * `drop` y `scatter` lo dejan a `null`.
   *
   * **Recibir un pase es una reacción, no una elección** (E.4: sigue sin ser
   * una oferta que nombre a nadie — `propPlaces` no lee este campo). Es
   * `village.ts` quien, tras `settle()`, mira si la pelota parada tiene
   * dueño y se lo entrega directamente, como una escena de V-07: una
   * interacción entre dos que no pasa por `decide`.
   */
  for: number | null;
  /**
   * **Lo que el jugador metió en el valle, y por eso no se coge ni se tira.**
   *
   * El barril de la fiesta y el arado del campo son trastos por cómo se pintan
   * y se sitúan, no por cómo se usan: pesan, están donde están, y lo que la
   * aldea hace con ellos es rodearlos. Sin esta marca, la primera persona que
   * llegara al barril se lo llevaría en la mano —`village.ts` coge lo que
   * encuentra al llegar a la plaza de un trasto— y la fiesta se iría andando.
   *
   * Es la mitad visible de «lo que se da al valle se ve en el valle» (M-3): el
   * medio se paga con lo del valle, y desde ese día está ahí.
   */
  readonly fixed?: boolean;
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
function standable(land: Terrain, x: number, z: number): boolean {
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
function standableNear(land: Terrain, at: Point): Point {
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
type Building = GameState['buildings'][number];

/** El corazón de la aldea: el edificio con más vecinos a mano, el mismo
 *  criterio que usa `village.ts` para plantar a la gente. */
function heartOf(buildings: readonly Building[]): Building | undefined {
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
  return heart;
}

/** Los edificios más próximos al corazón: los caminos entre vecinos son
 *  cortos, y un trasto anclado lejos no se juega nunca (ver `ANCHOR_CANDIDATES`). */
function anchorPool(buildings: readonly Building[], heart: Building | undefined): Building[] {
  if (heart === undefined) return [...buildings];
  const h = heart;
  return [...buildings].sort((a, b) => {
    const da = Math.hypot(a.x - h.x, a.y - h.y);
    const db = Math.hypot(b.x - h.x, b.y - h.y);
    return da - db;
  }).slice(0, ANCHOR_CANDIDATES);
}

export function scatter(state: GameState, land: Terrain, seed: number): Prop[] {
  const buildings = state.buildings.filter((b) => b.lostTick === null);
  const count = Math.max(
    MIN_PROPS,
    Math.min(MAX_PROPS, Math.round(population(state) / PER_PEOPLE)),
  );

  const heart = heartOf(buildings);
  const pool = anchorPool(buildings, heart);

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
    props.push({ id: i, kind, x, z, y: 0, vx: 0, vz: 0, vy: 0, held: null, restUntil: 0, for: null });
  }

  return props;
}

/**
 * **Lo que el jugador dio, plantado donde se ve.** M-3, la mitad de vida de
 * «lo que se da al valle se ve en el valle».
 *
 * **Va aparte de `scatter` y siempre encendido**, y esa separación es la
 * decisión del dueño del diseño del 15 sep 2026 cumplida al pie de la letra:
 * los trastos repartidos por el prado están apagados —«esas pelotas eran de
 * prueba, ahora mismo no tiene ningún sentido que haya pelotas por ahí»— y lo
 * que se dejó dicho es que la maquinaria se quedaba «por si algún día un trasto
 * tiene sentido **en su sitio**: un cubo junto al pozo, un haz junto a la
 * leñera. Repartidos por el prado, no». El barril de la fiesta y el arado del
 * campo son exactamente eso: cosas con sitio, pagadas por el jugador.
 *
 * Dos cosas y no seis, porque son las dos que tienen sitio propio en la aldea:
 *
 *   · **el barril**, en la plaza y **sólo mientras dura la fiesta** que se pagó
 *     (`aleWindow`), ofreciendo de beber a seis a la vez: eso es la fiesta vista
 *     desde fuera, gente rodeando un barril y no una línea en la crónica;
 *   · **el arado**, apoyado en un campo **desde el día que se dio y para
 *     siempre** (el rasgo `plough` no caduca), sin ofrecer nada: es un apero
 *     apoyado, y quien trabaja el campo ya tiene su plaza de `work` en el campo.
 *
 * Los otros cuatro medios no ponen nada aquí y es deliberado: la pocilga son
 * cerdos —`state.herd`, que `beasts.ts` ya pinta—, el hacha y la reliquia
 * cambian lo que la aldea consigue, y un par de manos es una persona más en el
 * censo. Meterles un trasto para que «se notara» sería decorado.
 *
 * No consume azar del motor: el sitio sale de la semilla de la jornada, igual
 * que el resto de `scatter`.
 */
export function given(state: GameState, land: Terrain, from = 0): Prop[] {
  const buildings = state.buildings.filter((b) => b.lostTick === null);
  const heart = heartOf(buildings);
  const pool = anchorPool(buildings, heart);
  const made: Prop[] = [];
  // **Mejor nada que mal puesto.** Si no hay un sitio donde de verdad se pueda
  // estar, esto no coloca la cosa: un barril dentro de un muro no es una fiesta
  // a la que no se llega, es una fiesta que el jugador ve mal hecha.
  const put = (kind: Prop['kind'], at: Point | null): void => {
    if (at === null) return;
    made.push({
      id: from + made.length, kind, x: at.x, z: at.z, y: 0,
      vx: 0, vz: 0, vy: 0, held: null, restUntil: 0, for: null, fixed: true,
    });
  };

  if (aleWindow(state)) {
    // **En la plaza, y la plaza no es un invento de este módulo**: es
    // `valleyCore`, el mismo punto al que §11.8 convoca a la aldea cuando la
    // crónica dice «in the square» (`derive/gatherings.ts`, `placeOf`). La
    // frase del banco es literal —«they broached the barrel in {season} and the
    // square did not empty till dark»— así que el barril va donde esa frase
    // dice, y no donde le venga bien a un reparto de trastos.
    //
    // Antes estuvo anclado a la puerta del corazón de la aldea y **estaba mal
    // puesto**: el corazón de casi cualquier valle de este juego es un campo,
    // así que el barril de la fiesta acababa entre los sembrados y detrás de un
    // caballete. Rodado y mirado en la semilla 11, año 30.
    // **Donde se junta la aldea, y no donde este módulo crea que se junta.**
    //
    // `valleyCore` es el punto de la plaza y `placedOffer` es lo que §11.8 usa
    // para bajarlo a suelo donde de verdad cabe gente: su primera plaza es la
    // puerta de la reunión (`staging.ts`, `meetingPlace`). El barril se pone
    // **ahí**, así que por construcción está donde la aldea se reuniría, con
    // sitio alrededor —de once a veintiocho plazas en las doce semillas
    // medidas—.
    //
    // Costó dos intentos, y los dos estaban mal puestos de la misma manera: por
    // buscarle sitio yo. El primero lo anclaba a la puerta del corazón de la
    // aldea, que casi siempre es un campo, y el barril salía entre los
    // sembrados; el segundo buscaba en anillos el punto más despejado, y como
    // penalizaba estar en un sembrado, **se iba de la plaza**: medido, de 4,1 a
    // 6,6 celdas del punto de reunión en once de doce semillas, o sea a las
    // afueras. La plaza de este juego cae muchas veces entre campos y eso no es
    // un defecto de la plaza.
    // P-1 · y desde el esquema 8 la plaza **existe**: es un punto guardado con
    // su círculo reservado, no la media de los edificios. El barril va ahí, que
    // es donde está el empedrado.
    const middle = plazaCentre(state.plaza);
    const at = { x: middle.x, z: middle.y };
    const meeting = placedOffer(OFFERS['gather'] as OfferSpec, at, land);
    // **Y en la plaza más despejada de las suyas, no en la primera.** La
    // reunión reparte de once a veintiocho plazas alrededor del punto —medido
    // en doce semillas— y la primera cae donde caiga: con ella, el barril
    // quedaba a **dos centésimas de celda de una pared** en dos semillas y a
    // menos de media en seis, o sea metido en la cara de una casa y tapado por
    // su tejado. Eligiendo entre las plazas de la propia reunión no se sale de
    // la plaza y se sale del muro: el sitio sigue siendo el que §11.8 concede,
    // sólo que el del corro que está a la vista.
    const roofs = buildings.filter((b) => b.kind !== 'field');
    const base = meeting?.at ?? at;
    // **El aire es una condición, no un gusto**, y esto costó tres intentos con
    // su medida cada uno. Sumar despejo y cercanía en una sola cuenta da las dos
    // versiones malas según cómo se pesen: premiando el despejo, el barril se va
    // a la plaza de fuera del corro (de 4,0 a 5,0 celdas del punto en ocho de
    // doce semillas); premiando la cercanía, se pega a la pared de la casa de al
    // lado (a 0,33 de celda en cuatro semillas, metido en su cara y tapado por
    // el tejado). Así que el aire se pide como mínimo y, cumplido, manda la
    // cercanía: la plaza **más cercana al corro de las que tienen aire**.
    // Y **sin subirse a la fuente**, que ocupa el centro desde P-2: sin esto el
    // barril salía justo encima del pilón —la plaza está vacía y empedrada, así
    // que la primera plaza del corro es la del medio— y se veían las dos cosas
    // metidas una en otra.
    const seats = [...(meeting?.spots ?? []), base]
      .filter((p) => Math.hypot(p.x - middle.x, p.z - middle.y) > FOUNTAIN_CLEAR);
    const roomy = seats.filter((p) => openness(roofs, p) >= ROOM_AROUND && !inField(buildings, p));
    const pick = (list: readonly Point[]): Point | undefined => [...list]
      .sort((a, b) => Math.hypot(a.x - base.x, a.z - base.z) - Math.hypot(b.x - base.x, b.z - base.z))[0];
    // Y si en toda la plaza no hay una con aire —una aldea que se ha cerrado
    // sobre sí misma—, la que más tenga: sigue siendo la plaza.
    const chosen = pick(roomy)
      ?? [...seats].sort((a, b) => openness(roofs, b) - openness(roofs, a))[0]
      ?? base;
    put('barrel', placeable(land, chosen.x, chosen.z) ? chosen : null);
  }

  if (hasTrait(state, 'plough')) {
    // Apoyado en un campo, y en el mismo campo mientras ese campo exista: el
    // sitio sale del identificador del campo y no del día, así que el arado no
    // amanece cada mañana en una punta distinta del valle.
    const fields = pool.filter((b) => b.kind === 'field');
    const field = fields.length === 0
      ? state.buildings.find((b) => b.lostTick === null && b.kind === 'field')
      : fields[Math.floor(roll(1, 'plough:field') * fields.length)];
    if (field !== undefined) {
      // **Dentro del campo, y en su rincón más despejado.**
      //
      // Primero se probó alrededor del campo, y medido no vale: en la semilla
      // 11, año 30, **ninguno de los dieciséis puntos del borde era suelo donde
      // plantarse** —un pueblo apretado deja los bordes del campo a menos de
      // 0,94 de una pared, que es lo que `standable` exige— así que todos caían
      // en la reserva y el arado acababa en el centro del campo, detrás del
      // caballete de una casa. Un campo se anda (no está bloqueado: son
      // sembrados), así que el sitio de un arado es el propio campo, y de sus
      // rincones se elige el que más lejos está de un tejado.
      const others = buildings.filter((b) => b.id !== field.id && b.kind !== 'field');
      put('plough', inside(land, field, (spot) => openness(others, spot)));
    }
  }

  return made;
}

/**
 * Un sitio pisable a esa distancia de un punto, probando ángulos.
 *
 * **Un solo ángulo no vale, y esto lo aprendió el barril.** El corazón de la
 * aldea suele ser un campo, y un campo mide seis por seis: un ángulo elegido a
 * ciegas manda el barril **dentro** del campo, y desde el centro de un bloqueo
 * de seis celdas la espiral de `standableNear` —que llega a tres y media— no
 * sale. Medido: en la semilla 41 no había barril en la plaza durante la fiesta,
 * y en las otras tres sí, que es la peor clase de fallo porque parece una
 * semilla rara y es una colocación mal hecha.
 *
 * El ángulo sale de `key` y no del día, así que lo que se coloca con esto
 * amanece siempre en el mismo rincón. Si ninguno de los dieciséis vale, cae en
 * `standableNear`, que es lo que hace el resto de este módulo.
 */
/**
 * El mejor sitio para plantar algo junto a un punto: se prueban varios anillos
 * alrededor y se queda el que más le gusta a `prefer`, siempre entre los
 * pisables.
 *
 * **Es lo que distingue estar puesto de estar tirado.** Un solo anillo a una
 * distancia fija hereda el defecto de los trastos de V-09 —el sitio lo decide
 * el azar y el suelo, no si la cosa se ve— y con la plaza de este valle eso es
 * peor que con una pelota: la plaza es la media de los edificios, así que
 * muchas veces cae **dentro** de uno. Probando del anillo de media celda al de
 * cuatro y quedándose con el punto más despejado, la cosa sale del tejado y se
 * queda en el claro de al lado.
 */
/**
 * El aire que se le exige a lo que se planta en la plaza: 0,8 celdas al tejado
 * más cercano.
 *
 * TUNE: un cuerpo ocupa 0,32 de radio y el barril 0,13, así que con 0,45 ya
 * «cabe»; 0,8 es lo que hace falta para que **se vea**, que es otra cosa. Por
 * debajo de media celda el barril queda en la cara de la casa y el tejado se lo
 * come desde esta cámara: medido en las semillas 23, 41, 33, 2024 y 999.
 */
const ROOM_AROUND = 0.8;

/**
 * Lo que hay que dejarle a la fuente del centro de la plaza, en celdas.
 *
 * TUNE: una celda. El pilón mide 0,8 de ancho (`render3d/world/plaza.ts`) y su
 * celda está cerrada al paso, así que a menos de una celda del centro no hay
 * sitio para nada; y nadie podría acercarse a beber del barril por ese lado.
 */
const FOUNTAIN_CLEAR = 1;

/**
 * Si una cosa que **no se coge** puede estar aquí.
 *
 * **Y no es `standable`, que es el criterio de lo que sí se coge.** `standable`
 * exige 0,94 celdas de aire —el radio del cuerpo más `WALL_CLEAR`— porque quien
 * va a recoger una pelota tiene que poder plantarse encima de ella, y `avoid`
 * no le deja acercarse más a un muro. Un barril no se recoge: la gente bebe
 * **alrededor**, en las plazas que `seatsOn` reparte con el criterio laxo de
 * §11.8 (`fitsCircle` con 0,32, el mismo con el que se convoca una reunión en
 * la plaza). Pedirle a un barril el aire de una pelota es lo que lo mandaba a
 * las afueras: medido, cuatro celdas y media de la plaza en nueve de doce
 * semillas, porque en el casco no había un solo punto con 0,94 de aire.
 *
 * Así que lo que se pide es lo que de verdad hace falta: que la cosa quepa
 * donde se pone, y que quepa un cuerpo pegado a ella.
 */
function placeable(land: Terrain, x: number, z: number): boolean {
  if (x <= 0.5 || z <= 0.5 || x >= land.width - 0.5 || z >= land.height - 0.5) return false;
  if (!fitsCircle(land, x, z, 0.32)) return false;
  // Un cuerpo a su lado, en alguno de los cuatro rumbos: sin eso, un barril en
  // un callejón de una celda es un barril del que nadie puede beber.
  for (const [dx, dz] of [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]] as const) {
    if (fitsCircle(land, x + dx, z + dz, 0.32)) return true;
  }
  return false;
}


/** Si el punto cae dentro de un sembrado. Un barril de fiesta entre el trigo
 *  está mal puesto aunque se pueda estar de pie ahí. */
function inField(buildings: readonly Building[], spot: Point): boolean {
  return buildings.some((b) => b.kind === 'field'
    && spot.x >= b.x && spot.x <= b.x + b.w && spot.z >= b.y && spot.z <= b.y + b.h);
}

/**
 * El punto del propio campo más a gusto de `prefer`: sus cuatro rincones, los
 * cuatro medios de sus lados y el centro, metidos hacia dentro para no quedar
 * justo en la linde. Si ninguno es suelo donde plantarse, el centro, que en un
 * campo lo es siempre —un sembrado no bloquea— y es donde estaría un arado si
 * lo hubieran dejado a media faena.
 */
function inside(land: Terrain, field: Building, prefer: (spot: Point) => number): Point | null {
  const inset = 0.45;
  const middle = { x: field.x + field.w / 2, z: field.y + field.h / 2 };
  const xs = [field.x + inset, middle.x, field.x + field.w - inset];
  const zs = [field.y + inset, middle.z, field.y + field.h - inset];
  let best: Point | null = null;
  let score = -Infinity;
  for (const x of xs) {
    for (const z of zs) {
      if (!placeable(land, x, z)) continue;
      const value = prefer({ x, z });
      if (value > score) { score = value; best = { x, z }; }
    }
  }
  // Y si en el campo entero no hay un punto donde plantarse —un sembrado
  // encajonado entre casas—, mejor ningún arado que un arado en un muro.
  return best ?? (placeable(land, middle.x, middle.z) ? middle : null);
}

/**
 * Lo despejado que está un punto: la distancia al edificio más cercano.
 *
 * **Para que se vea.** El arado cabía en veinte sitios pisables alrededor de su
 * campo y el primero que salía podía ser el de detrás de un tejado: rodado y
 * mirado, en la semilla 11 asomaba media vertedera por encima del caballete de
 * una casa. Pisable no es visible, igual que pisable no era alcanzable
 * (`standable`). Con esto, de los dieciséis candidatos se queda el más
 * despejado, que en un pueblo apretado es el borde del campo que da al prado.
 */
function openness(buildings: readonly Building[], spot: Point): number {
  let gap = Infinity;
  for (const b of buildings) {
    const nx = Math.max(b.x, Math.min(spot.x, b.x + b.w));
    const nz = Math.max(b.y, Math.min(spot.z, b.y + b.h));
    gap = Math.min(gap, Math.hypot(spot.x - nx, spot.z - nz));
  }
  return gap;
}

// ---------------------------------------------------------------------------
// Física. Ported de spike (bloque `Prop`, paso 7b).
// ---------------------------------------------------------------------------

/** Lo que cae un trasto por segundo al cuadrado. Ported de spike (`GRAVITY`). */
const GRAVITY = 14;
/** Lo que frena una pelota rodando por la hierba, por segundo. Ported de spike
 *  (`ROLL_DRAG`). */
const ROLL_DRAG = 1.6;
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
    // Lo que el jugador dio pesa: no cae, no rueda y no rebota. Ya nace en el
    // suelo y sin velocidad, así que esto es una garantía y no un cálculo.
    if (prop.fixed === true) continue;

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

/**
 * A la altura de la mano, un poco por delante.
 *
 * **Portado de spike y rescalado, que es lo que faltaba.** Allí la altura era
 * 0,72 y el cuerpo del banco medía 1,05 de alto (`spike/bench.ts`, la cápsula
 * del aldeano), así que la mano caía al 69 % de la persona, que es donde está
 * una mano. Aquí el aldeano del catálogo mide **0,65 celdas** (D.6.2), así que
 * copiar el 0,72 tal cual ponía el trasto **por encima de su cabeza**: un cubo
 * flotando dos palmos sobre el sombrero. El número se porta conservando la
 * proporción, no la cifra — 0,69 de 0,65.
 */
const HAND_FORWARD = 0.38;
const HAND_HEIGHT = 0.45;

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
  // V-09b: lo que se suelta ya no es un pase de nadie a nadie.
  prop.for = null;

  // Donde se pueda volver a coger: quien lo suelta está en suelo pisable, pero
  // puede estar pegado a una pared, y ahí nadie llegaría a recogerlo después.
  const spot = standableNear(land, { x: by.body.x, z: by.body.z });
  prop.x = spot.x;
  prop.z = spot.z;
}

/**
 * Un poco por delante de la mano, a la altura de un pase. Ported de spike
 * (`fling`), **rescalado por la misma razón que `HAND_HEIGHT`**: allí 0,85
 * sobre un cuerpo de 1,05 es el 81 % de la persona —a la altura del pecho, que
 * es desde donde se tira— y aquí el aldeano mide 0,65.
 */
const THROW_FORWARD = 0.4;
const THROW_HEIGHT = 0.53;

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
 * Lo que se tarda en volver a tener ganas de jugar, tras un pase. Ported de
 * spike (`PLAYED_OUT`), sin retocar.
 *
 * Sin esto salían 58 pases por jornada y persona en el descarte —uno cada
 * dos segundos, la aldea entera detrás de una pelota— porque nada cansaba a
 * nadie de jugar. La primera versión de V-09 confió en que `satisfy()`
 * vaciara el aburrimiento y bastara (E.3.7: primero se mide si el mecanismo
 * que ya existe basta, antes de portar uno nuevo); no bastó — el rethink de
 * en medio volvía a ganar en cuanto el aburrimiento se vaciaba, con la
 * pelota pegada en la mano el resto del día (medido en `village.ts`) — así
 * que V-09b porta el descanso tal cual estaba en el descarte. Quien acaba
 * de tirar no vuelve a recoger ni a que `decide` le ofrezca `play` hasta
 * que pase (`village.ts`, filtrado al construir las opciones de éste, no
 * dentro de `decide`: E.4 sigue en pie).
 */
export const PLAYED_OUT = [11, 26] as const;

/**
 * Lanza un trasto hacia un punto, con su arco. **Velocidad, nunca posición**
 * (E.3, E.7): quien reciba el trasto lo ve volar y aterrizar, no aparecer.
 *
 * `forId` es V-09b: el id de *cuerpo* a quien se apunta, o nada si se tira
 * hacia delante por gusto porque no había con quién jugar. Queda anotado en
 * `prop.for` para que `village.ts` sepa, tras `settle()`, a quién entregarle
 * la pelota cuando pare — sin que eso pase por `decide` (E.4).
 */
export function fling(
  prop: Prop, from: Dweller, at: Point, force: number, loft: number, land: Terrain,
  forId: number | null,
): void {
  const away = Math.max(0.5, Math.hypot(at.x - from.body.x, at.z - from.body.z));
  prop.held = null;
  prop.for = forId;
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
const OFFER_OF: Readonly<Partial<Record<Prop['kind'], string>>> = {
  ball: 'play', stick: 'carry', bucket: 'carry', bundle: 'carry', stone: 'carry', grain: 'carry',
  // El barril de la fiesta da de beber a seis a la vez (`OFFERS.drink`): es la
  // fiesta pagada, vista desde fuera. El arado no ofrece nada — es un apero
  // apoyado— y por eso no está en esta tabla: `propPlaces` salta lo que no
  // encuentra aquí.
  barrel: 'drink',
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
    const wants = OFFER_OF[prop.kind];
    if (wants === undefined) continue;
    const spec = OFFERS[wants];
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
