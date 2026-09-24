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

import { hash32 } from '@engine/rng';
import type { GameState } from '@engine/state';
import { allocateLabour } from '@engine/subsistence/labour';
import { TIME } from '@engine/balance';
import { seasonOf, weekOf } from '@engine/time';
import { fellingTarget } from '@engine/world/forest';
import type { Point, Terrain } from './body';
import { blockedAt, fitsCircle, WALL_CLEAR } from './body';
import type { NeedName } from './needs';
import { quarryCells, stoneWork, woodStoreCells } from './resource-sites';
import { pathTo } from './navigate';

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
  /** Sólo una rutina profesional puede iniciarla; no entra en la elección ambiental. */
  readonly routineOnly?: boolean;
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
export interface OfferSpec {
  readonly id: string;
  readonly reach: number;
  readonly seats: number;
  readonly gives: Partial<Record<NeedName, number>>;
  readonly seconds: readonly [number, number];
  readonly hours?: readonly [number, number];
  readonly routineOnly?: boolean;
}

/**
 * El catálogo.
 *
 * Lo que un edificio ofrece sale de **para qué sirve**, no de un adorno: el pozo
 * da agua porque es un pozo. Cuando el motor gane un edificio, gana su oferta
 * aquí y la aldea entera aprende a usarlo sin que nadie escriba una conducta.
 */
export const OFFERS: Readonly<Record<string, OfferSpec>> = {
  // TUNE: seis plazas y no dos (IA-1). Con dos, **toda la aldea bebía de un
  // brocal de dos sitios**: la sed sube una vez cada ciento diez segundos para
  // cada uno (`needs.ts`, `RISE.thirst`) y una jornada dura ciento veinte, así
  // que en una aldea de treinta y cinco hay cola permanente y se midió gente
  // de pie con la sed al máximo (seis de treinta y cinco en la semilla 23,
  // `docs/historico/life-rounds/IA-0.md` §1). Seis es el aforo de `work`, que es el otro
  // sitio donde se junta media aldea, y un brocal con seis alrededor se lee
  // como un pozo con gente y no como una cola.
  drink: { id: 'drink', reach: 0.9, seats: 6, gives: { thirst: 0.9 }, seconds: [4, 9] },
  sit: { id: 'sit', reach: 1.2, seats: 4, gives: { rest: 0.8, boredom: 0.2 }, seconds: [8, 20] },
  watch: { id: 'watch', reach: 1.4, seats: 3, gives: { boredom: 0.7, company: 0.3 }, seconds: [6, 16] },
  pray: { id: 'pray', reach: 1.1, seats: 5, gives: { irritation: 0.8, boredom: 0.2 }, seconds: [10, 24] },
  work: { id: 'work', reach: 1.6, seats: 6, gives: { duty: 0.9, boredom: -0.2 }, seconds: [20, 45] },
  /** Recoger la cosecha ya resuelta por el motor en su única semana de siega. */
  harvest: { id: 'harvest', reach: 1.6, seats: 6, gives: { duty: 0.9 }, seconds: [6, 10], routineOnly: true },
  /** Cazar en el bosque: solo el reparto laboral puede iniciar esta rutina. */
  hunt: { id: 'hunt', reach: 1.2, seats: 4, gives: { duty: 0.6 }, seconds: [12, 24], routineOnly: true },
  gossip: { id: 'gossip', reach: 1.3, seats: 4, gives: { company: 0.9, boredom: 0.4 }, seconds: [6, 18] },
  /** Mirar correr el agua. No calma nada del cuerpo y despeja la cabeza. */
  loiter: { id: 'loiter', reach: 1.5, seats: 3, gives: { boredom: 0.5, irritation: 0.3 }, seconds: [8, 18] },

  // V-08 · Lo que un animal ofrece a quien pasa cerca. `life/beasts.ts` las usa
  // para montar la `Place` móvil de cada bicho: aforo uno, porque no se junta
  // un corro alrededor de una gallina. Magnitudes en la misma escala que el
  // resto de la tabla (`gives` entre 0,4 y 0,9, `seconds` de unos pocos a
  // veinte) porque no hay otra referencia de la que partir: ni el brief ni
  // `spike/life.ts` dan un número para esto.
  /** Corretear tras la gallina. Aburrimiento y un poco de compañía infantil. */
  chase: { id: 'chase', reach: 1.0, seats: 1, gives: { boredom: 0.5, company: 0.2 }, seconds: [3, 8] },
  /** Echarle las sobras al cerdo. Un pellizco de deber cumplido. */
  feed: { id: 'feed', reach: 1.0, seats: 1, gives: { duty: 0.15, boredom: 0.3 }, seconds: [3, 7] },
  /** Acariciar a la vaca. Compañía, sin la carga de hablar con nadie. */
  pet: { id: 'pet', reach: 1.0, seats: 1, gives: { company: 0.4, boredom: 0.3 }, seconds: [4, 10] },

  // V-09 · Lo que un trasto suelto en el suelo ofrece a quien pase cerca.
  // `life/props.ts` las usa para montar la `Place` de cada trasto: aforo uno,
  // porque un trasto no está en dos manos. `reach` es `PICKUP` de
  // `spike/life.ts` (0,75), tal cual. `gives`/`seconds` en la misma escala que
  // el resto de la tabla: ni el brief ni el descarte dan un número para esto,
  // la referencia es `chase`/`feed`/`pet` de V-08 — y a propósito no por
  // encima de ellas. Medido: con `boredom: 0,6` la pelota le ganaba la
  // elección a la cabaña más veces de las que debía, y `life-beasts.test.ts`
  // (V-08, ajena a esta ronda) bajó de 18 a 14 personas tocando un animal en
  // la semilla 31. Con estos números, por debajo de `chase`/`pet`, vuelve a
  // pasar la prueba sin tocarla.
  /** Jugar con la pelota: se coge, se apunta, se tira. */
  play: { id: 'play', reach: 0.75, seats: 1, gives: { boredom: 0.4, company: 0.2 }, seconds: [1, 2.2] },
  /** Cargar con el palo, el cubo o el haz de leña un rato, y soltarlo. */
  carry: { id: 'carry', reach: 0.75, seats: 1, gives: { duty: 0.2, boredom: 0.15 }, seconds: [5, 12] },
  /** Descargar la madera en la leñera. Sólo la rutina del talador la asigna. */
  deliver: { id: 'deliver', reach: 0.9, seats: 2, gives: { duty: 0.35 }, seconds: [2, 4], routineOnly: true },
  /** Asentar una carga de piedra en la obra que la consume. */
  'deliver-stone': { id: 'deliver-stone', reach: 0.9, seats: 2, gives: { duty: 0.35 }, seconds: [2, 4], routineOnly: true },
  /** Guardar una carga de la cosecha; sólo la asigna la rutina de la semana 35. */
  'deliver-grain': { id: 'deliver-grain', reach: 0.9, seats: 2, gives: { duty: 0.35 }, seconds: [2, 4], routineOnly: true },

  // C2 · Los dos puestos del cerco. design.md §1b: «las torres son aldeanos en
  // la muralla disparando». Quién sube lo dice `derive/garrison.ts` y dónde se
  // pone `life/garrison.ts`; esto es sólo lo que se hace ahí.
  //
  // Tres cosas los distinguen de todo lo demás de esta tabla:
  //
  //  · **`routineOnly`**, y es lo que impide que la aldea se vacíe. Sin él, un
  //    puesto es una oferta de deber alto que cualquiera con la jornada sin
  //    cumplir puede elegir, y lo que se vería es media aldea subida al cerco
  //    un martes cualquiera. Sube quien el reparto manda (`day.ts`).
  //  · **Aforo uno.** Un puesto es de uno: el sitio se lo da `garrison.ts`
  //    (`placedOffer` con la plaza puesta a mano) y no un corro alrededor de la
  //    estaca, que por el otro lado es campo abierto.
  //  · **Lo que dan es deber y nada más**, como el tajo. Estar de guardia no
  //    entretiene, no da compañía y no descansa: es un turno.
  //
  // `seconds` es el más largo de la tabla después de la reunión —de uno a dos
  // minutos escénicos— porque una guardia no se hace en tandas de diez
  // segundos: quien sube se queda, y `RETHINK` (45 pasos) le dejaría bajarse
  // a beber en cuanto le picara la sed.
  /** Sujetar el portón con una lanza. */
  guard: { id: 'guard', reach: 0.8, seats: 1, gives: { duty: 1 }, seconds: [60, 120], routineOnly: true },
  /** Vigilar el camino con un arco tensado. El que dispara en D2. */
  archer: { id: 'archer', reach: 0.8, seats: 1, gives: { duty: 1 }, seconds: [60, 120], routineOnly: true },

  // V-11 · La reunión que el motor convoca (§11.8). No es una oferta que nadie
  // elija por gusto: es la orden de una decisión del jugador puesta en el sitio
  // que el motor dice, y `life/staging.ts` es quien la monta.
  //
  // Los números son los de una aldea entera junta y no los de un corro:
  //
  //  · `seats: 40`, que es más gente de la que una aldea de este juego tiene
  //    (`LIFE.MAX_HOUSES` × `HOUSE_CAPACITY` = 80, y nunca están todos fuera).
  //    `seatsOn` recorta a lo que de verdad cabe en el suelo, así que pedir de
  //    más no inventa sitio: sólo impide que el aforo sea lo que corte.
  //  · `reach: 2.2`, el doble que cualquier otra. Una reunión es un gentío, no
  //    una fila: quien llega al borde ya está en la reunión.
  //  · `gives` lo llena de compañía y aburrimiento —es estar con todo el
  //    mundo— y **no da deber**: nadie está trabajando en una reunión, y ésa es
  //    la diferencia que se ve desde arriba.
  //  · `seconds: [40, 120]`, de las más largas de la tabla: se está un rato.
  gather: {
    id: 'gather', reach: 2.2, seats: 40,
    gives: { company: 1, boredom: 1 }, seconds: [40, 120],
  },
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

/** La oferta de trabajo, de la que salen los tajos de E2 con otro aforo. */
const WORK = OFFERS['work'] as OfferSpec;
/** TUNE escénico: una tanda de hachazos produce un haz transportable. La obra
 * dura 20–45 s, pero ese plazo ocupa casi toda la mañana y nunca deja tiempo
 * para volver a la leñera antes del regreso nocturno. */
const FELL = { ...WORK, seconds: [6, 10] as const };
/** Una tanda breve de pico antes de llevar la carga a la obra. */
const QUARRY = { ...WORK, seconds: [6, 10] as const };

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
 *
 * Exportada desde V-08: `life/beasts.ts` la reutiliza tal cual para anclar a
 * cada animal junto a su casa o su campo, en vez de reinventar «un punto
 * pisable cerca de un rectángulo», que es el mismo problema con otro nombre.
 */
export function doorOf(land: Terrain, x: number, z: number, w: number, h: number): Point | null {
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

  /**
   * E2 · **El reparto del jugador, convertido en sitios donde estar.**
   *
   * Aquí faltaba la mitad del mundo y nadie lo había notado: `placesOf` saca los
   * sitios de los **edificios**, y de los tres destinos que el jugador manda sólo
   * uno es un edificio. Los campos sí (`kind: 'field'`); **talar y construir no
   * tenían sitio ninguno en el valle**, así que los leñadores y los albañiles
   * eran una abstracción de la hoja de cálculo: el motor contaba sus manos y en
   * pantalla no había nadie haciéndolo. De ahí «no hay respuesta visual».
   *
   * `allocateLabour` es una función de lectura del motor y la capa de vida puede
   * llamarla (E.3): lee el estado, no escribe nada y no consume azar. Lo que se
   * hace con ella es traducir manos en **plazas**, que es la moneda de esta
   * capa: más manos al bosque, más plazas en el tajo del bosque, más gente que
   * la elige y se va allí andando. La orden se ve sin leer una cifra.
  */
  const hands = allocateLabour(state);
  const week = weekOf(state.tick);
  const winter = seasonOf(state.tick) === 'winter';
  const harvesting = week === TIME.HARVEST_WEEK;
  const workedFields = new Set(state.buildings
    .filter(building => building.kind === 'field' && building.lostTick === null)
    .sort((a, b) => a.id - b.id)
    .slice(0, hands.workedFields)
    .map(building => building.id));

  for (const building of state.buildings) {
    if (building.lostTick !== null) continue;
    // El motor sólo trabaja `workedFields` parcelas y en invierno deriva esas
    // manos al bosque o a la obra. No se ara rastrojo nevado ni un campo que
    // esta semana no produce.
    if (building.kind === 'field' && (winter || (harvesting && !workedFields.has(building.id)))) continue;
    const menu = building.kind === 'field'
      ? [harvesting ? 'harvest' : 'work']
      : BY_BUILDING[building.kind];
    if (menu === undefined) continue;
    // **Un campo es una parcela, no un edificio con puerta.** Su sitio es el
    // centro del rectángulo y sus puestos van dentro (`parcelSeats`); lo demás
    // sigue naciendo en la puerta. Es la corrección del 16 sep 2026: el 96 % de
    // los labradores trabajaban fuera de su campo.
    const parcel = building.kind === 'field';
    const centre = { x: building.x + building.w / 2, z: building.y + building.h / 2 };
    const at = parcel && !blockedAt(land, centre.x, centre.z)
      ? centre
      : doorOf(land, building.x, building.y, building.w, building.h);
    if (at === null) continue;

    const offers: Offer[] = [];
    for (const name of menu) {
      const spec = OFFERS[name];
      if (spec === undefined) continue;
      const seats = parcel
        ? parcelSeats(land, building.x, building.y, building.w, building.h, spec.seats, building.id)
        : undefined;
      // En una parcela se llega **al puesto**, no a su alcance: con el `reach`
      // de `work` (1,6) se daba por llegado a 0,96 celdas, y el 13,6 % de los
      // labradores cavaba la linde desde fuera (IA-7). `PARCEL_REACH` deja el
      // margen por encima de `REACHED` (`navigate.ts`, 0,45 = 0,9 × 0,6 → 0,54).
      const offer = placedOffer(parcel ? { ...spec, reach: PARCEL_REACH } : spec, at, land, undefined, seats);
      if (offer !== null) offers.push(offer);
    }
    if (offers.length > 0) places.push({ id: `${building.kind}:${building.id}`, at, offers });
  }

  // El juego guarda una capacidad base aunque no haya granero. La descarga
  // acaba primero en granero o molino y, mientras no exista ninguno, en una
  // vivienda real. Es coreografía de la cosecha atómica, no otro inventario.
  if (harvesting && workedFields.size > 0) {
    const live = state.buildings.filter(building => building.lostTick === null);
    const stores = live.filter(building => building.kind === 'granary' || building.kind === 'mill');
    const targets = stores.length > 0 ? stores : live
      .filter(building => building.kind === 'house' || building.kind === 'stone_house')
      .sort((a, b) => a.id - b.id);
    for (const building of targets) {
      const at = doorOf(land, building.x, building.y, building.w, building.h);
      if (at === null) continue;
      const offer = placedOffer(OFFERS['deliver-grain']!, at, land);
      if (offer !== null) places.push({ id: `grain-store:${building.id}`, at, offers: [offer] });
    }
  }

  // **El tajo del bosque.** Donde el pueblo tala: la celda de bosque más cercana
  // al centro de lo construido, que es donde §7.6 dice que se tala —cerca, no en
  // el confín del valle—. Las plazas son las manos que el jugador manda allí, así
  // que con la orden en «a la obra» el tajo desaparece y con ella en «al bosque»
  // se llena.
  // **Techo y no redondeo**, y es una diferencia que se ve. Las manos sobrantes
  // de una aldea de veinte personas son fracciones —0,60 con la orden en «a la
  // obra» y 1,27 con ella en «al bosque», medido en la semilla 7 al año doce— y
  // redondear las aplasta a la misma plaza: el tajo se veía idéntico con las dos
  // órdenes. Con techo son una plaza y dos. Y es lo honesto además de lo
  // legible: si hay 0,60 de semana-persona en el bosque, alguien va al bosque.
  const tree = fellingTarget(state);
  const felling = Math.ceil(hands.cutters + (winter && tree !== null ? hands.farmers : 0));
  if (felling > 0) {
    const cell = tree;
    if (cell !== null) {
      const at = { x: cell % state.map.width + 0.5, z: Math.floor(cell / state.map.width) + 0.5 };
      const offer = placedOffer({ ...FELL, seats: Math.min(felling, MOST_SEATS) }, at, land);
      if (offer !== null) places.push({ id: `felling:${cell}`, at: offer.at, offers: [offer] });
    }
    const store = woodStoreCells(state)[0];
    if (store !== undefined) {
      const at = { x: store % state.map.width + 0.5, z: Math.floor(store / state.map.width) + 0.5 };
      const offer = placedOffer({ ...OFFERS.deliver!, seats: Math.min(felling, 2) }, at, land);
      if (offer !== null) places.push({ id: `wood-store:${store}`, at, offers: [offer] });
    }
  }

  // La caza comparte el reparto agregado del motor; este sitio solo convierte
  // sus cazadores en plazas visibles. El objetivo usa suelo forestal pisable y
  // conectado con algún sitio ya alcanzable de la aldea.
  if (hands.hunters > 0 && tree !== null) {
    const at = { x: tree % state.map.width + 0.5, z: Math.floor(tree / state.map.width) + 0.5 };
    const offer = placedOffer({ ...OFFERS.hunt!, seats: Math.ceil(hands.hunters) }, at, land);
    if (offer !== null && places.some(place => !place.id.startsWith('felling:')
      && pathTo(land, place.at, offer.at, 0.32) !== null)) {
      places.push({ id: `hunt:${tree}`, at: offer.at, offers: [offer] });
    }
  }

  // **La obra.** Donde se está levantando algo, si hay algo. Las plazas son los
  // albañiles: una aldea que no construye no tiene andamio con gente encima, y
  // eso también es la orden vista sin leer nada.
  const building = Math.ceil(hands.builders + (winter && tree === null ? hands.farmers : 0));
  const work = state.works[0];
  if (building > 0 && work !== undefined) {
    const at = doorOf(land, work.x, work.y, work.w, work.h);
    if (at !== null) {
      const offers: Offer[] = [];
      const offer = placedOffer({ ...WORK, seats: Math.min(building, MOST_SEATS) }, at, land);
      if (offer !== null) offers.push(offer);
      if (stoneWork(state) !== null) {
        const delivery = placedOffer({ ...OFFERS['deliver-stone']!, seats: Math.min(building, 2) }, at, land);
        if (delivery !== null) offers.push(delivery);
      }
      if (offers.length > 0) places.push({ id: `works:${work.id}`, at, offers });
    }
    if (stoneWork(state) !== null) {
      const workAt = doorOf(land, work.x, work.y, work.w, work.h);
      for (const cell of quarryCells(state)) {
        const at = { x: cell % state.map.width + 0.5, z: Math.floor(cell / state.map.width) + 0.5 };
        const offer = placedOffer({ ...QUARRY, seats: Math.min(building, MOST_SEATS) }, at, land);
        if (offer === null || workAt === null || pathTo(land, workAt, offer.at, 0.32) === null) continue;
        places.push({ id: `quarry:${cell}`, at, offers: [offer] });
        break;
      }
    }
  }

  return places;
}

/**
 * Cuántas plazas puede llegar a tener un tajo.
 *
 * TUNE: ocho. `seatsOn` reparte las plazas en corro alrededor del punto y un
 * corro de más de ocho deja de leerse como un grupo trabajando: se lee como una
 * aglomeración. Y una aldea de veinte personas no pone doce a talar el mismo
 * árbol por mucho que la orden lo diga.
 */
const MOST_SEATS = 8;

/**
 * La celda de ese terreno más cercana a lo construido, o nada si no hay.
 *
 * El mapa del motor y no el de la capa de vida: `Terrain` sólo sabe si una celda
 * se pisa, que es todo lo que necesita para mover un cuerpo. De qué **tipo** es
 * una celda lo sabe `state.map`, y preguntárselo es leer del motor, que es lo
 * que E.3 permite.
 */
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
/**
 * Los puestos de trabajo de una **parcela**: dentro de su rectángulo, no en
 * anillos alrededor de un punto de fuera.
 *
 * **El fallo que esto arregla lo vio el dueño del diseño en pantalla el 16 sep
 * 2026**: «los trabajadores ni siquiera interpretan el campo de trabajo y se
 * salen fuera de él para labrar el suelo». Medido antes de tocar nada, tres
 * semillas y dos jornadas: **el 96 % de los labradores trabajaban fuera de su
 * campo**, hasta tres celdas del borde, y sólo el 4 % dentro. La causa era una
 * línea: el sitio de **todo** edificio nacía en `doorOf()`, un punto de pie
 * junto a la fachada, y `seatsOn()` repartía los puestos en anillos alrededor
 * de ese punto exterior. Para una casa es correcto —se está en la puerta—; para
 * un campo es tratar una parcela como si fuera un edificio con puerta, y nadie
 * sabía dónde estaba el campo.
 *
 * Aquí un puesto por celda del contorno, en el centro de la celda con un
 * temblor pequeño y **determinista** (`hash32` del edificio y del puesto: azar
 * de presentación, nunca del motor), y si hacen falta más puestos que celdas se
 * vuelve a empezar con otro temblor. Todo dentro del rectángulo, así que un
 * cuerpo que llega a su puesto está en su campo, y la azada cae en tierra
 * labrada y no en el prado.
 */
/** Alcance de llegada a un puesto de parcela: dentro del campo, o no se ha llegado. */
const PARCEL_REACH = 0.9;

function parcelSeats(
  land: Terrain, x: number, z: number, w: number, h: number, want: number, id: number,
): Point[] {
  const found: Point[] = [];
  const cells = Math.max(1, w * h);
  for (let n = 0; found.length < want && n < cells * 3; n += 1) {
    const cell = n % cells;
    const cx = x + (cell % w) + 0.5;
    const cz = z + Math.floor(cell / w) + 0.5;
    // ±0,15 y no ±0,25: con un cuerpo de radio 0,32, un puesto a 0,25 del borde
    // de su celda solapaba la celda vecina si estaba bloqueada (un almiar),
    // y eso contaba como «círculo en celda cerrada».
    const jx = (hash32(id, `parcel:${n}:x`) / 4_294_967_296 - 0.5) * 0.3;
    const jz = (hash32(id, `parcel:${n}:z`) / 4_294_967_296 - 0.5) * 0.3;
    const spot = { x: cx + jx, z: cz + jz };
    if (spot.x <= 0.5 || spot.z <= 0.5) continue;
    if (spot.x >= land.width - 0.5 || spot.z >= land.height - 0.5) continue;
    if (!fitsCircle(land, spot.x, spot.z, 0.32)) continue;
    found.push(spot);
  }
  return found;
}

function seatsOn(land: Terrain, at: Point, want: number): Point[] {
  const found: Point[] = [];
  if (fitsCircle(land, at.x, at.z, 0.32)) found.push(at);
  // Cuarenta intentos para llenar como mucho seis plazas: de sobra para rodear
  // un pozo encajonado, y un tope para no barrer el valle entero buscando.
  for (let ring = 1; found.length < want && ring < 40; ring += 1) {
    const angle = ring * 2.39996;
    const reach = 0.55 + Math.floor(ring / 4) * 0.5;
    const spot = { x: at.x + Math.sin(angle) * reach, z: at.z + Math.cos(angle) * reach };
    if (spot.x <= 0.5 || spot.z <= 0.5) continue;
    if (spot.x >= land.width - 0.5 || spot.z >= land.height - 0.5) continue;
    if (!fitsCircle(land, spot.x, spot.z, 0.32)) continue;
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
  /**
   * Puestos ya calculados, para los sitios que **no** son un punto con anillos
   * alrededor: una parcela se trabaja dentro (`parcelSeats`). Si no se dan,
   * se reparten en anillos alrededor de `at`, que es lo de siempre.
   */
  given?: readonly Point[],
): Offer | null {
  const spots = given !== undefined && given.length > 0 ? [...given] : seatsOn(land, at, spec.seats);
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
