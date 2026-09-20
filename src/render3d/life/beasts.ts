// V-08 · Los animales, iguales que la gente. design.md Anexo E.
//
// **Un animal deja de ser una fórmula del reloj y pasa a ser un cuerpo con
// impulsos**, exactamente el mismo `Dweller` que ya vive en `village.ts`: un
// cuerpo que colisiona (V-02), que navega (V-03), que le pide algo por dentro
// (V-04) y que elige (V-06). Con `traits: []` porque un cerdo no tiene
// carácter, y con su propia tabla de impulsos —`BEAST_RISE`— porque el
// carácter que sí tiene es la especie: la gallina picotea, el cerdo hoza, la
// vaca pasta, cada uno a su ritmo.
//
// **La consecuencia que pedía el brief sale sola, no se programa aparte**: un
// animal es también un cuerpo que `integrate()` no deja meter en el agua —el
// mismo `Terrain.blocked` que para la gente— así que no hace falta ningún
// `ashore()` que lo saque de un empujón después. El brinco de 1,08 celdas que
// medía G-10 no es que se arregle: es que deja de poder pasar, porque el
// animal nunca llega a pisar el agua.
//
// Lo que NO se hace aquí: cuervos y peces. No eligen (E.8), siguen siendo
// decorado puro en `effects/fauna.ts`, con las mismas `wildlifePositions` de
// siempre. Y el rebaño no se cuenta del tick vivo — se cuenta de
// `state.herd`, el estado de anoche, exactamente como el resto de la capa lee
// el estado congelado y no lo que el motor decida a media jornada (D.6.7).
//
// **IA-4** (`docs/life-ai-implementation-prompt.md`) amplía esto: cada
// especie gana varias actividades propias en vez de una sola
// (`SELF_ACTIVITIES`), un espacio de uso distinto (`range` por actividad, más
// ancho para la vaca que para la gallina), y una reacción de verdad a quien
// se acerca —`updateReaction()`, con principio y final, sobre el mismo
// registro de compromisos que IA-2 dejó en `commitments.ts`—: la gallina se
// aparta, el cerdo y la vaca se paran a que les hagan caso, y los tres vuelven
// a lo suyo cuando la visita se ha ido y ha pasado la calma. La vaca gana
// además el vado (`fordDrinkOf`, reutilizando `places.ts`) y un tirón suave
// hacia el resto del rebaño cuando anda sola (`herdPullOf`). Nada de esto
// toca el motor: es presentación, igual que todo lo demás de este fichero.

import { ANIMALS } from '@engine/balance';
import { hash32 } from '@engine/rng';
import type { GameState } from '@engine/state';
import {
  blockedAt, fitsCircle, gap, integrate, turnTo, TURN_MIN_PROGRESS, TURN_MIN_SPEED,
  type Body, type Point, type Terrain,
} from './body';
import { LIFE_STEP } from './clock';
import {
  type ActorRef, type CommitmentRegistry, type CommitmentStage, type InteractionKind,
} from './commitments';
import {
  decide, freshProgress, moveSeat, noProgress, pauseHere, satisfy, PROGRESS_CHECK, RETHINK,
  type ProgressState,
} from './decide';
import type { Neighbourhood } from './grid';
import { freshNeeds, type Needs, type NeedName } from './needs';
import { follow, routeAroundBodies, type Router } from './navigate';
import { doorOf, OFFERS, seatAt, type Offer, type OfferSpec, type Place } from './offers';
import { commons } from './places';
import { avoid, drive, seek, separate, type Push } from './steering';
import { canReach, nearestReachable } from './terrain';
import type { Dweller } from './village';

/** Las tres clases que hoy tienen cuerpo, cabaña y nombre en `state.herd`. */
export type BeastKind = 'hen' | 'pig' | 'cow';

/**
 * El radio de un cuerpo, por clase, en celdas.
 *
 * TUNE: nadie mide esto en el brief ni en `spike/life.ts` — ninguno de los dos
 * tenía animales con cuerpo. Se parte del radio de una persona (0,32,
 * `village.ts`) y se escala a ojo por tamaño relativo: una gallina es un
 * tercio de una persona, un cerdo algo más de la mitad, una vaca algo mayor.
 * Sin ver esto en pantalla no se puede afinar más — queda anotado en el
 * informe de ronda como lo que hace falta mirar primero.
 */
const RADIUS: Readonly<Record<BeastKind, number>> = {
  hen: 0.14,
  pig: 0.24,
  cow: 0.4,
};

/**
 * Lo que anda cada clase sin que nada le retenga, en celdas por segundo.
 *
 * TUNE: mismo origen que `RADIUS`. Una persona anda a 1,05-1,65
 * (`village.ts`, `pace`); un corral no se aleja de casa, así que todo va por
 * debajo de eso. La gallina picotea a saltos y por eso es la más rápida de
 * las tres pese a ser la más pequeña; la vaca pasta despacio.
 */
const PACE: Readonly<Record<BeastKind, number>> = {
  hen: 0.55,
  pig: 0.4,
  cow: 0.32,
};

/**
 * Cuánto sube el aburrimiento por segundo, para cada clase. La tabla de
 * impulsos propia que pide el brief.
 *
 * Un animal no tiene rasgos (`traits: []`), así que aquí no hay `TEMPER`
 * (`needs.ts`) que multiplique nada: el carácter que hace que la gallina
 * picotee sin parar y la vaca se lo tome con calma **es la especie**, y por
 * eso la tabla vive en la clase y no en un rasgo.
 *
 * TUNE: calibrado igual que `RISE` en `needs.ts` contra la jornada de ciento
 * veinte segundos — que a un animal le apetezca volver a su ocupación varias
 * veces al día y no una sola vez ni cincuenta.
 */
const BEAST_RISE: Readonly<Record<BeastKind, number>> = {
  hen: 1 / 20,
  pig: 1 / 35,
  cow: 1 / 55,
};

/**
 * IA-4: cuánto sube la sed por segundo, para cada clase.
 *
 * Sólo la vaca la tiene: es la única con vado al alcance
 * (`fordDrinkOf`/`Beast.drink`, más abajo), y darle sed a la gallina o al
 * cerdo sin ningún sitio propio donde saciarla sería dejarles siempre con el
 * impulso alto — el mismo síntoma de gente con la sed al máximo que
 * `docs/historico/life-rounds/IA-1.md` §4.1 ya cerró una vez para las personas.
 *
 * TUNE: la misma cadencia que la gente (`needs.ts`, `RISE.thirst = 1/110`):
 * no hay una medida propia de un animal de la que partir, y usar la
 * referencia que sí está medida es lo único no inventado a mano.
 */
const BEAST_THIRST: Readonly<Record<BeastKind, number>> = { hen: 0, pig: 0, cow: 1 / 110 };

/**
 * Una actividad que un animal hace solo, junto a su ancla.
 *
 * `spots`/`range` son el checklist IA-1 punto 2 (varios sitios, no uno) y el
 * punto 5 del brief IA-4 (espacio de uso distinto por especie): cuántos
 * puntos tiene esta actividad y a qué distancia del ancla, en celdas.
 */
interface SelfActivity {
  readonly id: string;
  readonly reach: number;
  readonly gives: Partial<Record<NeedName, number>>;
  readonly seconds: readonly [number, number];
  readonly spots: number;
  readonly range: readonly [number, number];
}

/**
 * Lo que cada clase hace sola, junto a su ancla — **varias actividades por
 * especie, no una** (IA-4, checklist del brief): antes las tres hacían lo
 * mismo con otro nombre y otra velocidad (`docs/historico/life-rounds/IA-1.md`), y eso
 * es justo lo que esta fase rompe. `gives`/`seconds` en la misma escala que
 * `OFFERS` (`offers.ts`): no hay otra referencia de la que partir.
 *
 * TUNE de cada `range`: la gallina no se aleja del corral (0,5 a 1,2 celdas);
 * el cerdo hoza y busca comida un poco más lejos (0,7 a 1,8) y su paseo corto
 * llega algo más allá (1,0 a 2,0); la vaca pasta por el prado, mucho más
 * ancho que un corral (1,2 a 3,2), y rumia clavada junto al ancla (0,4 a 0,9)
 * — es lo que el brief pide como «espacio de uso distinto por especie», y no
 * el mismo radio de 0,8 a 1,5 que las tres compartían antes de esta fase.
 */
const SELF_ACTIVITIES: Readonly<Record<BeastKind, readonly SelfActivity[]>> = {
  // La gallina: picotear y escarbar, cortas y muchas. El tercer y cuarto verbo
  // del brief («apartarse y volver») no son una actividad más: son la
  // cautela, y viven en la reacción (`updateReaction`, más abajo), no aquí.
  hen: [
    { id: 'peck', reach: 1.0, gives: { boredom: 0.55 }, seconds: [3, 7], spots: 3, range: [0.5, 1.2] },
    { id: 'scratch', reach: 1.0, gives: { boredom: 0.5, rest: 0.1 }, seconds: [4, 8], spots: 3, range: [0.5, 1.2] },
  ],
  // El cerdo: hozar, buscar comida, un paseo corto y tumbarse. Ritmo lento —
  // duraciones largas, y `PACE.pig` ya es la mitad de rápido que la gallina—,
  // y tumbarse es una actividad de verdad, con su propio `gives.rest`, no la
  // ausencia de una.
  pig: [
    { id: 'root', reach: 1.1, gives: { boredom: 0.5 }, seconds: [8, 16], spots: 3, range: [0.7, 1.6] },
    { id: 'forage', reach: 1.1, gives: { boredom: 0.45, duty: 0.1 }, seconds: [10, 18], spots: 3, range: [0.8, 1.8] },
    { id: 'amble', reach: 1.2, gives: { boredom: 0.3 }, seconds: [5, 10], spots: 3, range: [1.0, 2.0] },
    { id: 'lie', reach: 1.0, gives: { boredom: 0.3, rest: 0.5 }, seconds: [16, 30], spots: 2, range: [0.4, 0.9] },
  ],
  // La vaca: parches de pasto —varios sitios, y cada nueva ronda de pasto
  // vuelve a sortear entre todos ellos, así que no es «volver siempre al
  // mismo palmo» (checklist IA-1, punto 2) sino ir de parche en parche— y
  // rumiar, quieta y larga, junto al ancla. Beber y «cerca del grupo» no son
  // una actividad de la tabla: la primera sale de `fordDrinkOf`, la segunda
  // de `herdPullOf`, las dos más abajo.
  cow: [
    { id: 'graze', reach: 1.3, gives: { boredom: 0.45 }, seconds: [14, 26], spots: 5, range: [1.2, 3.2] },
    { id: 'ruminate', reach: 1.2, gives: { boredom: 0.3, rest: 0.5 }, seconds: [26, 45], spots: 2, range: [0.4, 0.9] },
  ],
};

/**
 * Los puntos alrededor del ancla donde un animal hace una actividad, todos en
 * celda libre y en la misma orilla que el resto de la aldea.
 *
 * Checklist IA-1, punto 2: con un solo punto, un animal vuelve siempre al
 * mismo palmo de corral en cuanto se le da un rato. Con varios y la elección
 * al azar entre los libres que ya hace `decide()`, un cerdo hoza por el
 * corral entero en vez de volver siempre al mismo palmo.
 *
 * IA-4: `salt` entra en el hash además de `id`/`n`/`attempt` porque ahora cada
 * animal tiene varias actividades (`SELF_ACTIVITIES`) y sin él «picotear» y
 * «escarbar» sortearían los mismos puntos exactos para la misma gallina —dos
 * actividades indistinguibles en el mapa, aunque se llamen distinto.
 *
 * TUNE: hasta veinte intentos por punto porque un corral apretado entre dos
 * casas puede tener pocas celdas libres alrededor; si ninguno cuaja para un
 * punto dado, el propio ancla —ya libre y conectada por `anchorOf`— entra en
 * su lugar, para no dejar la actividad con menos plazas de las que promete.
 */
function spotsAround(
  land: Terrain, reach: Uint8Array, anchor: Point, seed: number, id: number,
  count: number, range: readonly [number, number], salt: string,
): Point[] {
  const spots: Point[] = [];
  const [near, far] = range;
  const span = far - near;
  for (let n = 0; n < count; n += 1) {
    let found: Point | null = null;
    for (let attempt = 0; attempt < 20 && found === null; attempt += 1) {
      const angle = (hash32(seed, `beast:spot:${salt}:${id}:${n}:${attempt}:a`) / 4_294_967_296) * Math.PI * 2;
      const dist = near + (hash32(seed, `beast:spot:${salt}:${id}:${n}:${attempt}:d`) / 4_294_967_296) * span;
      const at = { x: anchor.x + Math.cos(angle) * dist, z: anchor.z + Math.sin(angle) * dist };
      if (at.x <= 0.5 || at.z <= 0.5 || at.x >= land.width - 0.5 || at.z >= land.height - 0.5) continue;
      if (blockedAt(land, at.x, at.z)) continue;
      if (!canReach(land, reach, at)) continue;
      found = at;
    }
    spots.push(found ?? anchor);
  }
  return spots;
}

/**
 * Lo que cada clase ofrece a quien pase, del catálogo central (`offers.ts`).
 *
 * IA-4: el mismo nombre es ahora también el `InteractionKind` que
 * `updateReaction()` reserva en el registro de compromisos (IA-2,
 * `commitments.ts`) en cuanto un animal nota a la persona que se lo está
 * pidiendo — es donde `feed`/`pet`/`chase` dejan de ser sólo una oferta que
 * la persona consume sin que el animal se entere.
 */
const GIFT_OFFER: Readonly<Record<BeastKind, InteractionKind>> = {
  hen: 'chase',
  pig: 'feed',
  cow: 'pet',
};

/**
 * El espacio de identificadores de los animales, aparte del de las personas.
 *
 * Mismo criterio que `wildlifePositions` (`render/animals.ts`): «su propio
 * rango, para que un cuervo nunca comparta id con una gallina». Aquí, para
 * que ningún animal comparta id de cuerpo con una persona — `village.ts`
 * junta los dos en la misma rejilla de vecinos y los dos tienen que poder
 * convivir en el mismo `Map` por id.
 */
const BEAST_ID_BASE = 10_000;

/**
 * Cuánto se aguanta yendo al ancla antes de replantearse. Mismo criterio que
 * `GIVE_UP` en `village.ts`: el ancla de un animal está siempre a un paso de
 * donde ya estaba, así que esto casi nunca salta — es la red por si el paso
 * se llena de gente por medio.
 */
const GIVE_UP = 600;

/**
 * IA-4: a qué distancia nota un animal que hay una persona cerca, por
 * especie, en celdas.
 *
 * TUNE: la primera versión usaba 1,5-1,8 —el alcance del regalo (1,0) más un
 * margen generoso— y **medido, era demasiado**: `tools/reports/life-report-species.ts`
 * daba a la gallina reaccionando dos tercios de la jornada, y a cerdo y vaca
 * más de la mitad, no por visitas de verdad sino por quien se sienta o
 * cotillea junto a la puerta de al lado —`sit`/`gossip` duran hasta veinte
 * segundos, y un corral vive pegado a una casa—. La cautela y la interacción
 * tienen que notar a alguien que se acerca **a él**, no a cualquiera que ande
 * ocupado con lo suyo a un par de celdas. Con esto, apenas más que el propio
 * alcance del regalo, la puerta de al lado —a 1,4 celdas de media, el nudge de
 * `anchorOf`— deja de contar casi siempre, y sólo dispara cuando alguien
 * viene de verdad hacia el animal.
 */
const NOTICE_RADIUS: Readonly<Record<BeastKind, number>> = { hen: 1.15, pig: 1.15, cow: 1.15 };

/**
 * IA-5: a qué distancia nota una gallina que el lobo del corral (`wildlife.ts`)
 * está cerca, en celdas.
 *
 * TUNE: 3,5, muy por encima de `NOTICE_RADIUS.hen` (1,15): un lobo se nota de
 * más lejos que una visita curiosa, y es justo esa distancia la que lo hace
 * un lobo y no un vecino. Exportada porque `village.ts` necesita el mismo
 * número para contar cuántas veces la visita ha llegado a notarse de verdad
 * — dos sitios con la misma cifra por copiarla habrían sido dos cifras en
 * cuanto una se afinara sin la otra.
 */
export const WOLF_ALARM_RADIUS = 3.5;

/** Cuánto más allá del alcance del regalo cuenta como «encima», en celdas. */
const CLOSE_MARGIN = 0.15;

/**
 * Por debajo de qué fracción de su propio paso cuenta una visita como
 * «parada», para de verdad estar dando de comer o acariciando y no sólo
 * pasando cerca. Mismo criterio relativo que `TURN_MIN_SPEED` (`body.ts`).
 */
const STILL_FACTOR = 0.3;

/**
 * Cuánto tarda en calmarse un animal tras irse la visita, en segundos
 * escénicos.
 *
 * TUNE: dos. Ni instantáneo —volver a lo suyo en el mismo paso en que la
 * visita se aleja se lee como un interruptor, no como un animal— ni tan largo
 * que parezca que sigue reaccionando a alguien que ya no está.
 */
const RECOVER_SECONDS = 2;
const RECOVER_STEPS = Math.round(RECOVER_SECONDS / LIFE_STEP);

/**
 * Cuánto dura, como mucho, el contacto de verdad (`act`) aunque la visita se
 * quede al lado, por especie — en pasos, sacado de lo que ya dura esa misma
 * interacción como regalo (`GIFT_OFFER`, `OFFERS.chase`/`feed`/`pet`,
 * `seconds[1]`).
 *
 * TUNE: sin este tope, un cerdo o una vaca se quedaba plantado mientras
 * durase la visita **aunque no tuviera ninguna intención de tocarlo** —medido
 * con `tools/diag-ia4-temp.ts`: un cerdo firme 18,3 segundos junto a la puerta
 * de una casa mientras una persona pasaba de camino al pozo (`well:16/drink`,
 * `there: false` todo el rato) y no llegaba nunca a arrancar porque el propio
 * cerdo, congelado, le cortaba el paso — la clase de bloqueo mutuo que IA-1
 * existe para evitar, sólo que entre especies distintas. `feed`/`pet`/`chase`
 * duran lo que duran en el catálogo; el contacto de la reacción no puede durar
 * más que eso, se haya ido la visita o no.
 */
const ACT_MAX_STEPS: Readonly<Record<BeastKind, number>> = {
  hen: Math.round((OFFERS[GIFT_OFFER.hen] as OfferSpec).seconds[1] / LIFE_STEP),
  pig: Math.round((OFFERS[GIFT_OFFER.pig] as OfferSpec).seconds[1] / LIFE_STEP),
  cow: Math.round((OFFERS[GIFT_OFFER.cow] as OfferSpec).seconds[1] / LIFE_STEP),
};

/**
 * Cuánto tiene que pasar, calmado del todo, antes de poder volver a
 * reaccionar — a la misma visita o a otra.
 *
 * TUNE: tres segundos. Sin esto, en cuanto se suelta una reacción por el tope
 * de arriba, si la visita seguía al lado se abría otra en el mismo paso y el
 * animal no llegaba a moverse nunca de verdad —el mismo bloqueo, sólo que
 * trenzado en episodios en vez de uno solo—. Con la calma obligada de por
 * medio, el `decide()`/replanteo normal recupera el cuerpo un rato de verdad,
 * que es lo que deja a `separate()`/`avoid()` sacarlo del hueco si estaba
 * estorbando.
 */
const COOLDOWN_SECONDS = 3;
const COOLDOWN_STEPS = Math.round(COOLDOWN_SECONDS / LIFE_STEP);

/**
 * Cuánto dura, como mucho, una reacción antes de soltarse sola.
 *
 * TUNE: un minuto escénico. Red de seguridad (IA-2, `commitments.expire()`):
 * la reacción se suelta sola en cuanto pasa `ACT_MAX_STEPS` más la calma, así
 * que esto no debería hacer falta nunca — pero si algo se queda a medias,
 * evita que un animal reaccione a alguien para siempre.
 */
const REACTION_TIMEOUT = Math.round(60 / LIFE_STEP);

/**
 * A qué distancia dos vacas cuentan como «juntas», en celdas.
 *
 * TUNE: cuatro. Más que el corro de una oferta corriente (`offers.ts`,
 * `seatsOn`, dos plazas como mucho) porque un prado es más grande que un
 * corral, y menos que el alcance más largo de un parche de pasto
 * (`SELF_ACTIVITIES.cow`, hasta 3,2) para que «cerca del grupo» no sea lo
 * mismo que «en el mismo parche».
 */
const HERD_RADIUS = 4;

/**
 * Cuánto tira el rebaño de una vaca sola, en celdas por segundo — la misma
 * escala que `seek()` (`steering.ts`).
 *
 * TUNE: 0,15. Un tirón suave y no una orden: nunca debe ganarle a la ruta
 * hacia lo que la vaca ha elegido hacer, sólo inclinarla hacia el resto del
 * rebaño cuando no hay ninguna cerca.
 */
const HERD_PULL = 0.15;

/** Un animal, entero: el mismo `Dweller` que una persona, más lo que le hace falta. */
export interface Beast {
  readonly dweller: Dweller;
  readonly kind: BeastKind;
  /**
   * El punto fijo junto a su casa o su campo. No es el cuerpo: es a donde
   * vuelve. La gallina se aparta de aquí para picotear y `separate()`/`avoid()`
   * la empujan un poco más, pero siempre hay un sitio al que decide regresar.
   */
  readonly anchor: Point;
  /**
   * Lo que ofrece a quien pase: `pet`, `chase` o `feed`, aforo uno. Su `at` es
   * el cuerpo del animal —la misma referencia—, así que sigue al bicho sin que
   * nadie tenga que reescribirlo paso a paso.
   */
  readonly gift: Place;
  /** Lo que el bicho hace solo, junto al ancla: varias actividades, IA-4. */
  readonly self: Place;
  /**
   * IA-4: dónde bebe, si el valle tiene vado (`fordDrinkOf`). Sólo la vaca lo
   * usa; la gallina y el cerdo se quedan en `null` y nunca ven esta oferta
   * entre sus opciones — no tienen sitio propio donde beber cerca del corral,
   * y forzarles el impulso sin oferta sería el mismo síntoma que
   * `docs/historico/life-rounds/IA-1.md` §4.1 ya cerró una vez para las personas.
   */
  readonly drink: Place | null;
  /**
   * Lo que `noProgress()` (`decide.ts`) necesita recordar para saber si el
   * viaje en marcha avanza. Checklist IA-1, punto 6. Vive aquí y no en
   * `Dweller` porque `Dweller` lo construyen también ficheros ajenos a esta
   * fase (pruebas de escenas) y añadirle campos obligatorios les rompería el
   * tipo.
   */
  readonly progress: ProgressState;
  /** IA-4: la reacción a la persona más cercana, si hay una ahora mismo. */
  readonly reaction: Reaction;
}

/**
 * IA-4: el compás de la reacción de un animal a la persona más cercana.
 *
 * `stage` usa el mismo `CommitmentStage` que el registro de IA-2
 * (`commitments.ts`): `approach` mientras sólo se ha notado, `act` mientras
 * dura el contacto, `recover` mientras se calma tras la visita. `null` es
 * calma del todo, sin nada que reaccionar.
 */
interface Reaction {
  /** El id del compromiso vivo en `encountersOf()`, o nada si está en calma. */
  commitmentId: string | null;
  stage: CommitmentStage | null;
  /** Desde qué paso dura el contacto (`act`), para el tope de `ACT_MAX_STEPS`. */
  actSince: number | null;
  /** Hasta qué paso dura la calma antes de soltar el compromiso del todo. */
  recoverUntil: number;
  /** Hasta qué paso no puede abrirse una reacción nueva tras soltar la última. */
  cooldownUntil: number;
}

function freshReaction(): Reaction {
  return { commitmentId: null, stage: null, actSince: null, recoverUntil: 0, cooldownUntil: 0 };
}

/** Lo de siempre entre cero y uno, igual que en `needs.ts`. */
function hold(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Un paso de vida para los impulsos propios de un animal: aburrimiento, y
 *  sed sólo para quien la tiene (IA-4, `BEAST_THIRST`). */
function driftBeast(needs: Needs, kind: BeastKind, seconds: number): void {
  needs.boredom = hold(needs.boredom + BEAST_RISE[kind] * seconds);
  const thirstRate = BEAST_THIRST[kind];
  if (thirstRate > 0) needs.thirst = hold(needs.thirst + thirstRate * seconds);
}

function selfPlaceOf(
  kind: BeastKind, id: number, anchor: Point, land: Terrain, reach: Uint8Array, seed: number,
): Place {
  const offers: Offer[] = SELF_ACTIVITIES[kind].map((activity) => {
    const spots = spotsAround(land, reach, anchor, seed, id, activity.spots, activity.range, activity.id);
    return {
      id: activity.id, at: anchor, reach: activity.reach, seats: spots.length,
      gives: activity.gives, seconds: activity.seconds, spots,
    };
  });
  return { id: `beast:${id}:self`, at: anchor, offers };
}

function giftPlaceOf(kind: BeastKind, id: number, body: Point): Place {
  const spec = OFFERS[GIFT_OFFER[kind]] as Offer;
  return { id: `beast:${id}:gift`, at: body, offers: [{ ...spec, at: body }] };
}

/**
 * IA-4: dónde puede beber la vaca, si el valle tiene vado.
 *
 * Reutiliza `commons()` (`places.ts`, V-10): es la misma función que ya
 * detecta el vado para la gente, y desde IA-1 el vado también da de beber
 * (`OFFERS.drink`, `places.ts`, `detectFord`). No se inventa una segunda
 * detección de vado aquí —sería la clase de duplicado que un día diverge del
 * original—, sólo se recorta el resultado a la única oferta que a una vaca le
 * interesa: no le hace falta pararse a mirar el agua correr (`loiter`), sólo
 * beber.
 */
function fordDrinkOf(state: GameState, land: Terrain): Place | null {
  const ford = commons(state, land).find((place) => place.id === 'ford:crossing');
  const drink = ford?.offers.find((offer) => offer.id === 'drink');
  if (ford === undefined || drink === undefined) return null;
  return { id: ford.id, at: ford.at, offers: [drink] };
}

/**
 * La cabaña de esta jornada, con cuerpo y sitio para cada cabeza.
 *
 * **Cuenta lo que `state.herd` dice, no lo que el tick vivo tenga** (D.6.7,
 * regla del brief): el estado llega congelado y una matanza o una cría de hoy
 * no se ve hasta mañana, exactamente como con las personas.
 *
 * El ancla sale de `doorOf`, la misma función que pone las ofertas de los
 * edificios: junto a una casa para gallinas y cerdos, junto a un campo para
 * las vacas (§7.7). Si un edificio no tiene puerta libre —encajonado del
 * todo, rarísimo— se cae al corazón de la aldea en vez de perder la cabeza:
 * la cuenta por clase tiene que cuadrar siempre con la cabaña, y un animal sin
 * sitio bueno sigue siendo un animal.
 */
export function createBeasts(
  state: GameState, land: Terrain, heart: Point, seed: number, shore: Uint8Array,
  secure = false,
): Beast[] {
  const houses = state.buildings
    .filter((b) => (b.kind === 'house' || b.kind === 'stone_house') && b.lostTick === null)
    // E0a: durante la preparación se empieza por las casas más interiores.
    // El corazón ya pertenece a la región con más aldea y cada ancla pasa
    // después por `canReach`, así que esto no inventa un recinto ni atraviesa
    // su muralla. Fuera de esa jornada se conserva literalmente el orden viejo.
    .sort((a, b) => secure
      ? gap({ x: a.x + a.w / 2, z: a.y + a.h / 2 }, heart)
        - gap({ x: b.x + b.w / 2, z: b.y + b.h / 2 }, heart) || a.id - b.id
      : a.id - b.id);
  const fields = state.buildings
    .filter((b) => b.kind === 'field' && b.lostTick === null)
    .sort((a, b) => a.id - b.id);
  // IA-4: se detecta una sola vez por jornada, igual que el resto de la
  // geometría del valle (`houses`/`fields` arriba) — no por cuerpo ni por
  // paso.
  const drink = fordDrinkOf(state, land);

  const beasts: Beast[] = [];
  let n = 0;

  const spawn = (kind: BeastKind, anchor: Point): void => {
    // El centro libre no basta: el cuerpo entero debe caber al nacer.
    if (!fitsCircle(land, anchor.x, anchor.z, RADIUS[kind])) {
      const free = nearestReachable(land, shore, anchor, RADIUS[kind]);
      if (free === null) return;
      anchor = free;
    }
    const id = BEAST_ID_BASE + n;
    const paceDice = hash32(seed, `beast:pace:${id}`) / 4_294_967_296;
    const body: Body = {
      id, x: anchor.x, z: anchor.z, vx: 0, vz: 0, facing: 0,
      radius: RADIUS[kind], pace: PACE[kind] * (0.85 + paceDice * 0.3),
    };
    const dweller: Dweller = {
      body,
      // No es una persona: ningún villager real tiene este id. `opinionOf`
      // devuelve 0 para quien no encuentra un villager (`opinions.ts`), y
      // como un animal nunca entra en la lista que `scenes.ts` mira
      // (`village.ts` la construye sólo de `dwellers`), este campo no llega a
      // usarse — está aquí porque `Dweller` lo exige, no porque nadie lo lea.
      villager: -1 - id,
      traits: [],
      needs: freshNeeds(),
      doing: null,
      travelled: 0,
      faceAnchor: { x: anchor.x, z: anchor.z },
      scene: null,
      sceneCooldownUntil: 0,
      // V-09: la cabaña no coge trastos. Nunca cambian.
      holding: null,
      aimAt: null,
      // V-09b: la cabaña no juega, así que nunca se le pasan las ganas.
      playedUntil: 0,
      failed: new Map(),
      rethinkAt: Math.floor((hash32(seed, `beast:think:${id}`) / 4_294_967_296) * RETHINK),
    };
    beasts.push({
      dweller,
      kind,
      anchor,
      self: selfPlaceOf(kind, id, anchor, land, shore, seed),
      gift: giftPlaceOf(kind, id, body),
      drink: kind === 'cow' ? drink : null,
      progress: freshProgress(),
      reaction: freshReaction(),
    });
    n += 1;
  };

  const anchorOf = (
    building: { x: number; y: number; w: number; h: number } | undefined,
    id: number,
  ): Point => {
    if (building === undefined) return heart;
    const door = doorOf(land, building.x, building.y, building.w, building.h);
    if (door === null) return heart;
    // **No al mismo punto exacto que la gente.** `doorOf` es determinista y
    // sin este empujón un animal se plantaba en el mismo palmo que la oferta
    // `sit` del propio edificio — la puerta es un único punto, y compartirlo
    // no es «junto a la casa», es «encima del banco». Medido: 865 forcejeos
    // de 9600 con el punto compartido, contra 768 como techo de la prueba de
    // V-06 (que no toca esta ronda). Un empujón lateral, corto y determinista
    // por bicho, saca al animal del mismo palmo sin alejarlo de la casa.
    const angle = (hash32(seed, `beast:corner:${id}`) / 4_294_967_296) * Math.PI * 2;
    const nudge = { x: door.x + Math.cos(angle) * 1.4, z: door.z + Math.sin(angle) * 1.4 };
    const inBounds = nudge.x > 0.5 && nudge.z > 0.5
      && nudge.x < land.width - 0.5 && nudge.z < land.height - 0.5;
    const candidate = inBounds && !blockedAt(land, nudge.x, nudge.z) ? nudge : door;
    // **Checklist IA-1, punto 1: libre y conectada, no sólo libre.** Antes,
    // caer en celda cerrada volvía a la puerta sin más comprobación — y la
    // puerta está a 0,82 celdas del muro, así que un cerdo de radio 0,24 se
    // pasaba el día apretado contra él. Ahora se exige además que la celda
    // esté en la misma orilla que el corazón de la aldea (`shore`,
    // `reachableFrom` en `village.ts`): un patio sin salida es tan inútil
    // como una celda dentro del muro (E.7). Si ni la puerta lo cumple, se
    // busca la celda libre y conectada más cercana (`nearestReachable`,
    // `terrain.ts`); si el valle entero estuviera cerrado —no ocurre en la
    // práctica, el corazón siempre tiene suelo alrededor— el corazón mismo
    // cierra el reparto.
    if (canReach(land, shore, candidate)) return candidate;
    return nearestReachable(land, shore, candidate) ?? heart;
  };

  // Gallinas: dos por casa, como en `render/animals.ts` (`HENS_PER_HOUSE`).
  for (let i = 0; i < state.herd.hens; i += 1) {
    const house = houses[Math.floor(i / ANIMALS.HENS_PER_HOUSE) % Math.max(1, houses.length)];
    spawn('hen', anchorOf(house, BEAST_ID_BASE + n));
  }
  // Cerdos: uno de cada dos casas (`HOUSES_PER_PIG`).
  for (let i = 0; i < state.herd.pigs; i += 1) {
    const house = houses[(i * ANIMALS.HOUSES_PER_PIG) % Math.max(1, houses.length)];
    spawn('pig', anchorOf(house, BEAST_ID_BASE + n));
  }
  // Vacas: junto a los campos, dos por cabeza (`FIELDS_PER_COW`). E0a las
  // lleva junto a las mismas casas interiores que ya cobijan al resto de la
  // cabaña; no desaparecen ni cambia una unidad de `state.herd`.
  for (let i = 0; i < state.herd.cows; i += 1) {
    const shelter = secure
      ? houses[(i * ANIMALS.FIELDS_PER_COW) % Math.max(1, houses.length)]
      : fields[(i * ANIMALS.FIELDS_PER_COW) % Math.max(1, fields.length)];
    spawn('cow', anchorOf(shelter, BEAST_ID_BASE + n));
  }

  return beasts;
}

/**
 * IA-4: el registro de compromisos bestia↔persona, uno por jornada.
 *
 * `stepBeasts()` no puede recibir el registro de `village.ts` —es un fichero
 * cerrado para esta fase, con otro agente trabajando en `decide.ts`/
 * `needs.ts` a la vez (IA-3)— así que ésta es su propia instancia, con el
 * mismo contrato de IA-2 (`commitments.ts`). Vive en un `WeakMap` indexado
 * por el propio array de bestias del día: `createBeasts()` construye un array
 * nuevo cada jornada y `village.ts` pasa siempre esa misma referencia a
 * `stepBeasts()`, paso a paso, así que el registro dura lo que dura la
 * jornada y desaparece con ella sin que nadie tenga que soltarlo a mano —y
 * reconstruir la misma jornada crea un array nuevo con un registro nuevo,
 * así que la propiedad de E.3.5 (misma jornada, misma aldea) no se rompe: el
 * registro es tan puro función de la semilla y los pasos como todo lo demás.
 */

/** La persona más cercana a este cuerpo, dentro de `radius`, o nada. */
function nearestPerson(around: Neighbourhood, body: Body, radius: number): Body | null {
  let found: Body | null = null;
  let bestDist = radius;
  around.near(body, (other) => {
    if (other.id >= BEAST_ID_BASE) return; // sólo personas: los animales viven a partir de aquí.
    const dist = Math.hypot(other.x - body.x, other.z - body.z);
    if (dist <= bestDist) { bestDist = dist; found = other; }
  });
  return found;
}

/** Apartarse de quien se acerca, a paso llano — la cautela de la gallina. */
function flee(body: Body, from: Point): Push {
  const dx = body.x - from.x;
  const dz = body.z - from.z;
  const away = Math.hypot(dx, dz);
  if (away < 1e-6) {
    // En el mismo punto exacto: una dirección determinista por cuerpo, no un
    // azar de verdad — no hay `from` que decir hacia dónde huir.
    const angle = (hash32(body.id, 'flee:coincident') / 4_294_967_296) * Math.PI * 2;
    return { x: Math.cos(angle) * body.pace, z: Math.sin(angle) * body.pace };
  }
  return { x: (dx / away) * body.pace, z: (dz / away) * body.pace };
}

/**
 * IA-4: el tirón hacia el resto del rebaño, si esta vaca está sola.
 *
 * «Mantenerse cerca del grupo» (brief): una vaca sin ninguna otra a
 * `HERD_RADIUS` se inclina hacia el centro de masas de las demás. Se
 * suprime durante una reacción (`suppress`): no tiene sentido que el rebaño
 * tire de ella a la vez que huye o se está quieta para que la acaricien —eso
 * no aplica a la vaca, que no huye, pero sí se está quieta en `act`.
 */
function herdPullOf(beast: Beast, beasts: readonly Beast[], suppress: boolean): Push {
  if (suppress || beast.kind !== 'cow') return { x: 0, z: 0 };
  // **Y no mientras va a algún sitio.** El tirón era constante, así que dos
  // vacas ancladas en campos distintos —y con dos vacas en el rebaño eso es lo
  // normal— se atraían la una a la otra **sin parar** mientras su parche de
  // pasto las tiraba en sentido contrario. Las dos fuerzas se anulaban y la
  // vaca se arrastraba sin llegar a ninguna de las dos cosas: medido, **el
  // 95 % de la jornada andando y el 2,8 % pastando**, la peor cifra de las tres
  // especies y la única que no mejoró con los arreglos anteriores.
  //
  // Juntarse con las otras es lo que se hace cuando no hay nada mejor, no algo
  // que se hace **además** de ir a comer. Así que sólo tira cuando no hay
  // destino pendiente: sin intención, o ya en el sitio.
  const going = beast.dweller.doing;
  if (going !== null && !going.there) return { x: 0, z: 0 };
  const { body } = beast.dweller;
  let near = 0;
  let cx = 0;
  let cz = 0;
  let n = 0;
  for (const other of beasts) {
    if (other.kind !== 'cow' || other === beast) continue;
    const ob = other.dweller.body;
    n += 1;
    cx += ob.x;
    cz += ob.z;
    if (Math.hypot(ob.x - body.x, ob.z - body.z) <= HERD_RADIUS) near += 1;
  }
  if (n === 0 || near > 0) return { x: 0, z: 0 };
  cx /= n;
  cz /= n;
  const dx = cx - body.x;
  const dz = cz - body.z;
  const dist = Math.hypot(dx, dz) || 1;
  return { x: (dx / dist) * HERD_PULL, z: (dz / dist) * HERD_PULL };
}

/**
 * IA-4: nota, reacciona y se calma.
 *
 * `feed`/`pet`/`chase` pasan de oferta a interacción aquí: en cuanto se nota
 * a alguien se abre un compromiso de verdad en el registro de IA-2
 * (`tryReserve`), se avanza de compás según la distancia real (`advance`), y
 * se suelta (`release`) sólo cuando la visita se ha ido del todo y ha pasado
 * la calma — nunca antes, así que dos animales no se disputan a la misma
 * persona ni un animal arrastra dos compromisos a la vez (`busy()`, IA-2).
 */
function updateReaction(
  beast: Beast, visitor: Body | null, inClose: boolean, came: boolean,
  registry: CommitmentRegistry, step: number,
): void {
  const { reaction } = beast;
  const beastRef: ActorRef = { kind: 'beast', id: beast.dweller.body.id };

  if (reaction.commitmentId === null) {
    // Tras soltar una reacción hace falta un respiro antes de abrir la
    // siguiente (`COOLDOWN_STEPS`): si la misma visita seguía al lado, sin
    // esto se abría otra en el mismo paso y el animal no llegaba a moverse de
    // verdad nunca — el mismo bloqueo de antes, sólo que trenzado en
    // episodios.
    if (step < reaction.cooldownUntil) return;
    if (visitor === null) return;
    // **Un compromiso es una interacción de verdad, no una cercanía**
    // (consolidación de IA-4, segunda vuelta). Crearlo en cuanto alguien
    // entraba en `NOTICE_RADIUS` dejaba al cerdo y a la vaca esperando en
    // `approach` hasta que la reserva caducaba —y caduca a los sesenta
    // segundos, media jornada—: medido, **el 48 % de la jornada del cerdo y el
    // 37 % de la de la vaca en `approach`**, con la vaca rumiando el 0,1 %.
    // Ahora sólo se reserva cuando la persona está haciendo justamente el
    // regalo de esta especie. La cautela de la gallina no pasa por aquí: es un
    // reflejo y se resuelve sin reserva (ver `fleeing` en `stepBeasts`).
    if (!came) return;
    if (registry.busy(beastRef)) return;
    const personRef: ActorRef = { kind: 'villager', id: visitor.id };
    if (registry.busy(personRef)) return; // ya está en algo con otro animal.
    const id = `beast-react:${beastRef.id}:${personRef.id}:${step}`;
    const spots: readonly [Point, Point] = [
      { x: beast.dweller.body.x, z: beast.dweller.body.z },
      { x: visitor.x, z: visitor.z },
    ];
    const lease = registry.tryReserve({
      id, kind: GIFT_OFFER[beast.kind], initiator: personRef, recipient: beastRef,
      spots, expiresAtStep: step + REACTION_TIMEOUT,
    }, step);
    if (lease === null) return;
    reaction.commitmentId = id;
    reaction.stage = 'approach';
    return;
  }

  const id = reaction.commitmentId;

  // **Una reserva caducada se suelta aquí, no en la red de seguridad de la
  // aldea** (consolidación de IA-4). Con el registro compartido, cualquier
  // reserva que siguiera puesta al caducar la contaba `village.ts` como
  // interacción colgada, y colgada quiere decir «alguien se saltó su cierre»,
  // que no es el caso: una reacción cuya visita se fue y cuyo plazo venció es
  // un final normal. Medido: una por jornada en la semilla 7, y la prueba de
  // IA-2 exige cero con razón.
  if (registry.get(id) === undefined || step >= REACTION_TIMEOUT + (reaction.actSince ?? step)) {
    const lease = registry.get(id);
    if (lease !== undefined && step >= lease.expiresAtStep) {
      registry.release(id);
      reaction.commitmentId = null;
      reaction.stage = null;
      reaction.cooldownUntil = step + COOLDOWN_STEPS;
      return;
    }
    if (lease === undefined) {
      reaction.commitmentId = null;
      reaction.stage = null;
      reaction.cooldownUntil = step + COOLDOWN_STEPS;
      return;
    }
  }

  // **`recover` es firme**: una vez dentro no hay marcha atrás a `act` aunque
  // la visita se quede al lado o vuelva a acercarse. Es lo que de verdad
  // rompe el bloqueo mutuo que `ACT_MAX_STEPS` sólo a medias evitaba: con la
  // visita pegada justo al borde del radio, `act` y `recover` se alternaban
  // cada pocos pasos sin que la calma llegara nunca a completarse —medido con
  // `tools/diag-ia4-temp.ts`, más de sesenta segundos seguidos alternando—.
  // `recover` cuenta su propio reloj y suelta, pase lo que pase fuera.
  if (reaction.stage === 'recover') {
    if (step >= reaction.recoverUntil) {
      registry.release(id);
      reaction.commitmentId = null;
      reaction.stage = null;
      reaction.actSince = null;
      reaction.cooldownUntil = step + COOLDOWN_STEPS;
    }
    return;
  }

  if (inClose) {
    if (reaction.stage !== 'act') {
      reaction.stage = 'act';
      reaction.actSince = step;
      registry.advance(id, 'act');
      return;
    }
    // **El contacto no dura para siempre aunque la visita se quede al lado**
    // (`ACT_MAX_STEPS`): se calma sola pasado ese tope, la visita se haya ido
    // o no — ver el porqué en el comentario de la constante.
    const since = reaction.actSince ?? step;
    if (step - since >= ACT_MAX_STEPS[beast.kind]) {
      reaction.stage = 'recover';
      registry.advance(id, 'recover');
      reaction.recoverUntil = step + RECOVER_STEPS;
    }
    return;
  }

  // No está encima. Si venía de un contacto de verdad (`act`), se calma; si
  // sólo rondaba (`approach`) sin haber llegado a tocarlo, se le deja seguir
  // rondando mientras la visita siga dentro del radio de aviso, y se calma en
  // cuanto se va del todo.
  if (reaction.stage === 'act' || visitor === null) {
    reaction.stage = 'recover';
    registry.advance(id, 'recover');
    reaction.recoverUntil = step + RECOVER_STEPS;
  }
}

/**
 * Un paso de vida para toda la cabaña.
 *
 * **Igual que el paso de una persona en `village.ts`, con una cosa menos**: no
 * entra en escenas (`scenes.ts` sólo mira `dwellers`, las personas). Elige de
 * su propio menú de actividades (`self`, y el vado para la vaca si lo hay),
 * con el aforo compartido de verdad con la gente (`taken`, checklist IA-1
 * punto 3).
 *
 * IA-4: antes de decidir nada, cada animal nota o no a la persona más cercana
 * y avanza su reacción (`updateReaction`). Mientras dura —la gallina desde
 * que nota, el cerdo y la vaca sólo cuando la visita ya está encima— el
 * `decide()`/replanteo normal se salta entero y el movimiento lo gobierna la
 * reacción: huir para la gallina, quedarse quieto mirando a quien la visita
 * para el cerdo y la vaca. La intención de antes (`dweller.doing`) no se toca
 * mientras tanto —ni se avanza su ruta, ni se marca como llegada—, así que al
 * soltarse la reacción sólo hace falta invalidarla explícitamente para que
 * «volver a una actividad alcanzable» sea un `decide()` limpio y no un cuerpo
 * que se cree `there` a varias celdas de donde debería estar.
 *
 * IA-5: además de la persona más cercana, una gallina también nota al lobo
 * del corral si lo hay (`threat`, `village.ts`, `wildlife.ts`) y huye de él
 * con el mismo reflejo — ver el comentario junto a `WOLF_ALARM_RADIUS`.
 */
export function stepBeasts(
  beasts: readonly Beast[],
  land: Terrain,
  around: Neighbourhood,
  router: Router,
  seed: number,
  step: number,
  taken: Map<string, number>,
  /**
   * **El registro de compromisos de la aldea, no uno propio** (consolidación de
   * IA-4). La primera versión de esta fase se creaba el suyo en un `WeakMap`
   * porque `village.ts` estaba en manos de otra fase, y eso contradice
   * exactamente lo que IA-2 existe para garantizar: que una persona y un animal
   * no puedan reservarse por separado. Con dos registros, «un actor está en un
   * compromiso como mucho» dejaba de ser verdad en cuanto el actor era una
   * persona vista desde los dos lados.
   */
  registry: CommitmentRegistry,
  /**
   * Qué está haciendo **ahora** la persona de este cuerpo, o `null` si no ha
   * llegado a su sitio todavía. Es una ventana estrecha a propósito: la capa de
   * vida ya tiene los `Dweller` en `village.ts` y los animales sólo necesitan
   * saber si el que tienen al lado viene a ellos o pasaba por ahí.
   */
  intentOf: (bodyId: number) => string | null,
  /**
   * IA-5: dónde está el lobo del corral ahora mismo (`wildlife.ts`), o `null`
   * si no hay visita hoy o ya se ha ido. Opcional y con valor por defecto para
   * no romper a quien llame sin saber de lobos —las pruebas de esta fase, el
   * resto del año—: la inmensa mayoría de las jornadas no tienen ninguno.
   */
  threat: Point | null = null,
): void {
  const encounters = registry;
  encounters.expire(step);

  for (const beast of beasts) {
    const { dweller, self, drink, progress, reaction } = beast;
    const { body } = dweller;

    const closeRadius = (beast.gift.offers[0]?.reach ?? 1) + CLOSE_MARGIN;
    const visitor = nearestPerson(around, body, NOTICE_RADIUS[beast.kind]);
    // **El contacto de verdad exige que la visita se haya parado**, no sólo
    // que ande cerca. Sin esto, cualquiera que pasara de camino a otro sitio
    // —o que se hubiera sentado a cotillear a la puerta de al lado, no junto
    // al animal— disparaba `act` igual que quien de verdad se para a dar de
    // comer o acariciar: medido con seis semillas, más de un tercio de la
    // jornada de cerdo y de vaca «congelados» por gente que ni siquiera
    // llegaba a mirarlos (`tools/reports/life-report-species.ts`). `visitor.pace` es
    // el mismo umbral relativo que `TURN_MIN_SPEED` (`body.ts`): una persona
    // rápida y una lenta cuentan igual de «parada» si las dos van muy por
    // debajo de su propio paso. La cautela de la gallina (`approach`, más
    // abajo) no pasa por aquí: eso reacciona a que se acerquen, se paren o no.
    const visitorStill = visitor !== null
      && Math.hypot(visitor.vx, visitor.vz) <= visitor.pace * STILL_FACTOR;
    // **Y que la persona venga de verdad a eso** (consolidación de IA-4). Con
    // cercanía y quietud bastaba, y eso medía mal lo que quería medir: quien se
    // sienta a cotillear, reza en la capilla de al lado o bebe en el pozo está
    // cerca y está quieto, y el cerdo se paraba a mirarle igual que a quien le
    // trae de comer. Medido con `tools/reports/life-report-species.ts` en las semillas
    // 7 y 23: **el cerdo pasaba el 38 % de la jornada reaccionando y el 12 %
    // hozando, y la vaca el 43 % reaccionando, el 6 % pastando y el 0,4 %
    // rumiando**. Un rebaño pendiente de la gente en vez de comiendo, que es lo
    // contrario de lo que pide el brief.
    //
    // Ahora el contacto exige que lo que la persona está haciendo sea
    // justamente el regalo de esta especie (`GIFT_OFFER`: dar de comer al
    // cerdo, acariciar a la vaca, espantar a la gallina). **La cautela de la
    // gallina no pasa por aquí y sigue siendo un reflejo**: huye durante
    // `approach`, que se dispara por cercanía, porque una gallina se aparta de
    // quien pasa y no sólo de quien viene a por ella.
    const visitorCame = visitor !== null && intentOf(visitor.id) === GIFT_OFFER[beast.kind];
    const inClose = visitor !== null && visitorStill && visitorCame
      && Math.hypot(visitor.x - body.x, visitor.z - body.z) <= closeRadius;

    const wasReacting = reaction.stage !== null;
    updateReaction(beast, visitor, inClose, visitorCame, encounters, step);
    const stillReacting = reaction.stage !== null;
    if (wasReacting && !stillReacting) {
      // Se acaba de soltar la reacción del todo: lo que se estuviera
      // haciendo antes puede llevar tiempo lejos de su sitio exacto, así que
      // se descarta y se fuerza un `decide()` limpio este mismo paso — es lo
      // que hace que «volver a una actividad alcanzable» sea de verdad
      // alcanzable.
      dweller.doing = null;
      dweller.rethinkAt = step;
    }

    // **`doing` no puede quedarse en `null` ni siquiera mientras se reacciona**
    // (checklist IA-1, punto 5, y era el fallo real de la primera versión de
    // esta fase: medido, un 8,75 % de los cuerpo-segundos de gallina con
    // aburrimiento pegado a 1 y `doing === null` sin fin). El bloque de más
    // abajo que redecide sólo corre cuando `!overridden`, así que si la
    // actividad de antes terminó (`until`) justo cuando empezaba a reaccionar
    // —el caso real: una gallina que acaba de picotear junto a alguien que
    // encima está sentado a su lado—, nadie volvía a llamar a `decide()`
    // hasta que la visita se iba del todo, y mientras tanto el aburrimiento
    // subía sin que nada lo calmara. La reacción gobierna el movimiento por su
    // cuenta (`fleeing`/`holdingStill`/`calming`, más abajo) sin mirar
    // `dweller.doing`, así que rellenarlo aquí con una pausa no interfiere con
    // ella: sólo mantiene el invariante y dice la verdad si se muestrea a
    // media reacción.
    if (dweller.doing === null) {
      dweller.doing = pauseHere(body, land, router, seed, body.id, step, [], body.pace);
      moveSeat(taken, null, dweller.doing);
      progress.at = step + PROGRESS_CHECK;
      progress.gap = Number.POSITIVE_INFINITY;
      progress.stalls = 0;
    }

    // La gallina se aparta en cuanto nota a alguien —«si una persona se le
    // acerca, se aparta» (brief IA-4)—; el cerdo y la vaca sólo se paran
    // cuando la visita ya está encima, dándoles de comer o acariciándolos.
    // **La gallina huye por reflejo y sin reserva** (consolidación de IA-4). Se
    // apartaba sólo mientras hubiera un compromiso puesto, y desde que el
    // compromiso pide que la persona venga a por ella, eso habría dejado a las
    // gallinas impasibles ante quien pasa — que es lo contrario de una gallina.
    // Apartarse no es un compromiso: no reserva a nadie, no tiene final que
    // negociar y no puede fallar.
    //
    // **IA-5: el lobo del corral asusta a la gallina por el mismo reflejo**,
    // sólo que desde más lejos (`WOLF_ALARM_RADIUS`, muy por encima de
    // `NOTICE_RADIUS.hen`): un lobo no es una visita curiosa. Cuando los dos
    // están cerca a la vez, gana el lobo — huir de un depredador no compite
    // con apartarse de quien pasa.
    const personNear = beast.kind === 'hen' && visitor !== null
      && Math.hypot(visitor.x - body.x, visitor.z - body.z) <= NOTICE_RADIUS.hen;
    const wolfNear = beast.kind === 'hen' && threat !== null
      && Math.hypot(threat.x - body.x, threat.z - body.z) <= WOLF_ALARM_RADIUS;
    const fleeFrom: Point | null = wolfNear ? threat : personNear ? visitor : null;
    const fleeing = fleeFrom !== null;
    const holdingStill = beast.kind !== 'hen' && reaction.stage === 'act';
    const calming = reaction.stage === 'recover';
    const overridden = fleeing || holdingStill || calming;

    if (!overridden) {
      const onTheWay = dweller.doing !== null && !dweller.doing.there;
      // Espera creciente, no `GIVE_UP` fijo (checklist IA-1, punto 6): igual
      // que en `village.ts`, ver `decide.ts` (`noProgress`).
      let tooLong = noProgress(dweller.doing, progress, body, step, GIVE_UP, body.pace);
      if (tooLong && dweller.doing !== null && !dweller.doing.there && !dweller.doing.detoured) {
        dweller.doing.detoured = true;
        const nearby: Body[] = []; around.near(body, other => nearby.push(other));
        const alternative = routeAroundBodies(land, body, seatAt(dweller.doing.offer, dweller.doing.seat), nearby);
        if (alternative !== null) {
          dweller.doing.route.splice(0, dweller.doing.route.length, ...alternative);
          progress.at = step + PROGRESS_CHECK; progress.gap = Number.POSITIVE_INFINITY; tooLong = false;
        }
      }
      if (step >= dweller.rethinkAt && (!onTheWay || tooLong)) {
        dweller.rethinkAt = step + RETHINK;
        const before = dweller.doing;
        // IA-4: la vaca tiene además el vado, si el valle lo tiene
        // (`Beast.drink`) — la gallina y el cerdo se quedan con lo suyo,
        // `[self]`, exactamente como antes de esta fase.
        const places = drink === null ? [self] : [self, drink];
        // Checklist IA-1, punto 5: si no hay nada alcanzable que valga, una
        // pausa local siempre lo es — igual que en `village.ts`.
        dweller.doing = decide(
          { traits: [], needs: dweller.needs, at: body, id: body.id, doing: before },
          places, taken, land, router, seed, step,
        ) ?? pauseHere(body, land, router, seed, body.id, step, [], body.pace);
        moveSeat(taken, before, dweller.doing);
        if (dweller.doing !== before) {
          progress.at = step + PROGRESS_CHECK;
          progress.gap = Number.POSITIVE_INFINITY;
          progress.stalls = 0;
        }
      }

      // **Un viaje que no llega a su hora se abandona.** `until` es la hora en
    // que la intención termina, y sólo se comprobaba **después de haber
    // llegado**: si el cuerpo no llegaba, la intención se quedaba puesta para
    // siempre. Medido siguiendo una vaca paso a paso: decidía beber a cinco
    // celdas en el paso 26 con plazo hasta el 247, se acercaba hasta 3,16,
    // retrocedía, se quedaba clavada a 3,9 con velocidad 0,01 — y en el paso
    // 840 **seguía con la misma intención de beber**, ruta intacta y plazo
    // vencido hacía seiscientos pasos. De ahí salía su 95 % de jornada
    // «andando»: no andaba, estaba atascada con un viaje que nadie cerraba.
    //
    // `noProgress()` no la salvaba porque su espera se dobla en cada atasco
    // (IA-1) y acaba en `GIVE_UP`: pensado para no dar bandazos, pero con el
    // efecto de dejar un cuerpo parado veinte segundos. El plazo es la red
    // buena, porque no depende de medir el avance.
    if (dweller.doing !== null && !dweller.doing.there && step >= dweller.doing.until) {
      dweller.doing = null;
      dweller.rethinkAt = step;
      progress.stalls = 0;
    }

    if (dweller.doing !== null && dweller.doing.there && step >= dweller.doing.until) {
        dweller.doing = null;
        dweller.rethinkAt = step;
      }

      if (dweller.doing !== null && !dweller.doing.there) {
        const spot = seatAt(dweller.doing.offer, dweller.doing.seat);
        const away = Math.hypot(spot.x - body.x, spot.z - body.z);
        // **Y con la ruta agotada, el alcance entero.** La cota estrecha
        // —`reach * 0.6`, o sea 0,6 celdas para una oferta de alcance 1— la
        // puso IA-1 para que nadie se declarase llegado a media legua, y para
        // una persona está bien. Para un cuerpo pequeño y lento que además se
        // codea con los suyos alrededor del mismo corral, no: medido con una
        // gallina paso a paso, se acercaba hasta 0,61 celdas —a un pelo— y
        // ahí se quedaba, y como nunca llegaba nunca ejecutaba su actividad.
        // Así, las tres especies pasaban del 65 % al 96 % de la jornada
        // «andando» con la vaca pastando el 1,5 %.
        //
        // La condición laxa sigue acotada, que es lo que la separa del fallo
        // que IA-1 arregló: hace falta **haber agotado la ruta** —o sea estar
        // en el último tramo— y estar dentro del alcance de la oferta, no en
        // cualquier sitio.
        const arrived = away <= dweller.doing.offer.reach * 0.6
          || (dweller.doing.route.length === 0 && away <= dweller.doing.offer.reach);
        if (arrived) {
          dweller.doing.there = true;
          dweller.doing.route.length = 0;
        }
      }
    }
    // **Llegar es alcanzar la zona válida, no vaciar la ruta** (checklist
    // IA-1, punto 6): la comprobación de arriba ya cubre el caso normal, y si
    // la ruta se vacía sin haber pasado por ahí el cuerpo se queda de pie con
    // `there` en `false` hasta que `noProgress()` note que no se acerca.
    const next = overridden || dweller.doing === null || dweller.doing.there
      ? null
      : follow(body, dweller.doing.route);

    let want: Push;
    if (fleeing && fleeFrom !== null) {
      want = flee(body, fleeFrom);
    } else if (holdingStill || calming) {
      want = { x: 0, z: 0 };
    } else {
      want = next === null ? { x: 0, z: 0 } : seek(body, next);
    }
    const push = separate(body, around);
    const wall = avoid(body, land);
    // IA-4: una vaca sola busca al rebaño. Se suprime mientras reacciona: no
    // tiene sentido que el rebaño la tire a la vez que se queda quieta para
    // que la acaricien.
    const herd = herdPullOf(beast, beasts, overridden);
    // La intención cumplida frena de verdad, igual que la gente en
    // `village.ts` (docs/historico/rework.md §3.5.3): `doing.there === true`, no «no hay
    // ruta» —`next` también es nulo sin intención todavía, y frenar ahí de
    // raíz le corta las alas a `avoid()` para sacar a la bestia de un mal
    // sitio, dejándola arrastrarse sin escapar nunca del todo—. Sin este
    // matiz, un animal que ya había llegado a su ancla seguía empujado por
    // `separate`/`avoid` con la velocidad vieja de fondo y oscilaba apretado
    // contra sus compañeros de corral.
    if (!overridden && dweller.doing?.there === true) { body.vx = 0; body.vz = 0; }
    drive(body, {
      x: want.x + push.x + wall.x + herd.x, z: want.z + push.z + wall.z + herd.z,
    });
    integrate(body, land, LIFE_STEP);

    const speed = Math.hypot(body.vx, body.vz);
    if (speed > 0.05) {
      dweller.travelled += speed * LIFE_STEP;
    } else {
      dweller.travelled = 0;
    }

    // La cara sólo sigue al cuerpo cuando el cuerpo anda de verdad: mismo
    // criterio y mismas constantes que la gente (`body.ts`,
    // `TURN_MIN_SPEED`/`TURN_MIN_PROGRESS`), porque una gallina apretada en la
    // puerta con dos compañeras da la misma vuelta sobre sí misma que una
    // persona en la misma aprieto.
    if (speed <= TURN_MIN_SPEED * body.pace) {
      dweller.faceAnchor = { x: body.x, z: body.z };
    } else if (gap(dweller.faceAnchor, body) > TURN_MIN_PROGRESS) {
      turnTo(body, Math.atan2(body.x - dweller.faceAnchor.x, body.z - dweller.faceAnchor.z), LIFE_STEP);
      dweller.faceAnchor = { x: body.x, z: body.z };
    }
    // IA-4: quien se para a que le hagan caso mira a quien se lo hace — igual
    // que quien va a tirar la pelota se encara a su compañero (`village.ts`,
    // V-09): mirar a propósito no es el paso al andar, así que no pasa por el
    // umbral de arriba.
    if (holdingStill && visitor !== null) {
      turnTo(body, Math.atan2(visitor.x - body.x, visitor.z - body.z), LIFE_STEP);
    }

    driftBeast(dweller.needs, beast.kind, LIFE_STEP);
    if (!overridden && dweller.doing?.there === true) satisfy(dweller.needs, dweller.doing.offer, LIFE_STEP);
  }
}
