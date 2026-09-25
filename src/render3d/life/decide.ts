// V-06 · Elegir. design.md Anexo E.
//
// Lo que convierte «me pide el cuerpo» y «el mundo ofrece» en «voy a hacer
// esto». Es la pieza que cierra la cabeza, y la que decide si el valle
// sorprende: si a partir de aquí la aldea sigue pareciendo una coreografía, el
// problema es el modelo y no falta más código encima.
//
// **Utilidad, no árbol.** Cada oferta al alcance se puntúa con lo que calma de
// lo que a uno le aprieta, y se hace la que más puntúe. Un árbol de decisión
// diría «si tiene sed, al pozo», y entonces todo el que tenga sed va al pozo
// siempre: con utilidad, el sediento que además está agotado y tiene el pozo a
// veinte pasos se sienta, y eso no lo ha escrito nadie.

import type { Trait } from '@engine/state';
import { hash32 } from '@engine/rng';
import { LIFE_STEP } from './clock';
import { blockedAt, type Point, type Terrain } from './body';
import type { Needs } from './needs';
import { NEED_NAMES } from './needs';
import type { Offer, Place } from './offers';
import { seatAt, seatKey } from './offers';
import type { Router, Waypoint } from './navigate';
import { STEPS_PER_DAY } from './clock';
import type { DayJob } from './day';

/** Lo que alguien está haciendo o yendo a hacer. */
export interface Intent {
  readonly durationSteps?: number;
  /** Un desvío por tráfico antes de abandonar esta intención. */
  detoured?: boolean;
  readonly place: Place;
  readonly offer: Offer;
  /** El camino hasta allí. Se va gastando al andarlo. */
  readonly route: Waypoint[];
  /** En qué paso se dio por empezado esto. */
  readonly since: number;
  /** Y en cuál se acaba, una vez llegado. */
  until: number;
  /** Si ya está en el sitio haciendo lo suyo, o todavía yendo. */
  there: boolean;
  /** Qué plaza ocupa, para no ponerse todos en el mismo palmo de suelo. */
  readonly seat: number;
  /**
   * El paso en el que el viaje se da por fallido si aún no se ha llegado.
   *
   * **No es `until`.** `until` es cuándo termina la ocupación y se fija al
   * decidir, así que contaba el viaje: el devoto, que ve la capilla a tres
   * veces la distancia, llegaba tarde a su propio plazo y abandonaba antes de
   * rezar (medido: 1,5 veces el rezo del resto en vez de más del doble). Esto
   * es el viaje esperado por la ruta, doblado y con holgura. Opcional porque
   * las intenciones de fórmula (pausa, animales) no lo necesitan.
   */
  readonly arriveBy?: number;
}

/** Holgura del plazo de un viaje: el doble de lo esperado y cinco segundos más. */
const JOURNEY_SLACK = 2;
const JOURNEY_GRACE_STEPS = 150;

/**
 * Lo lejos que se busca algo que hacer, en celdas.
 *
 * TUNE: cinco, y empezó en doce. Lo que manda no es cuánto se tarda en llegar
 * sino **cuánto dura lo que se va a hacer**: beber son cuatro segundos y sentarse
 * ocho, así que un viaje de diez deja una jornada que es todo ir y venir.
 * Medido con doce: entre el 78 % y el 85 % del día andando. Con cinco, la gente
 * usa lo que tiene al lado, que además es lo que hace la gente.
 */
const LOOK = 5;

/**
 * El suelo que se le da a una reunión convocada por el motor, y el límite por
 * encima del cual una necesidad propia manda sobre ella.
 *
 * TUNE: suelo 0,8 y límite 0,95. El suelo está por encima de lo que puntúa la
 * pausa de reserva —que es lo único que competía con la reunión— y por debajo
 * de una oferta que de verdad haga falta, así que no tapa una necesidad real.
 * El límite en 0,95 y no en 0,9 a propósito: 0,9 es la cota con la que se mide
 * «parado con un impulso al máximo» (`tools/reports/life-report.ts`), y si la reunión
 * cediera ahí, media aldea con sed se quedaría sin ir por un vaso de agua.
 */
const GATHER_FLOOR = 0.8;
const GATHER_URGENT = 0.95;

/**
 * Cuánto pesa lo lejos que está algo.
 *
 * TUNE: a doce celdas, una oferta vale la mitad que la misma al lado. Sin esto,
 * la aldea entera cruza el valle a por lo mejor y lo que se ve son ochenta
 * personas haciendo el mismo viaje.
 *
 * IA-3: `reach` es opcional y por defecto `LOOK`, igual que siempre — pero
 * quien llama puede dar uno más corto. Es el mismo mecanismo con el que un
 * mayor deja de cruzar el pueblo por una oferta que un adulto sí cogería: no
 * hace falta un camino aparte, sólo que la distancia pese más para él.
 */
function falloff(away: number, reach: number = LOOK): number {
  return 1 / (1 + away / reach);
}

/**
 * Lo que un rasgo empuja hacia una acción.
 *
 * El sitio donde el carácter elige y no sólo se cansa distinto. Un `devout` va a
 * rezar aunque no le apriete nada; un `secretive` esquiva el corro. Es la misma
 * tabla de §6.3 leída para esto.
 */
const LEANING: Partial<Record<Trait, Partial<Record<string, number>>>> = {
  // IA-18: al sacar las descargas profesionales de la elección ambiental
  // desaparece ruido que antes sostenía por accidente la proporción medida.
  // 2,8 conserva la preferencia observable de dos a uno sin forzar el rezo.
  devout: { pray: 2.8 },
  kind: { gossip: 1.5 },
  generous: { gossip: 1.6 },
  secretive: { gossip: 0.3, pray: 0.7 },
  craven: { watch: 1.3, work: 0.8 },
  ambitious: { work: 1.6 },
  stubborn: { work: 1.4 },
  greedy: { work: 1.5 },
  loyal: { work: 1.3 },
  hardy: { work: 1.2, sit: 0.6 },
  frail: { sit: 1.5, work: 0.8 },
  cunning: { watch: 1.4, loiter: 1.3 },
  proud: { gossip: 0.7, watch: 1.2 },
  hot_tempered: { pray: 0.6 },
  spiteful: { gossip: 0.6 },
};

function leanOf(traits: readonly Trait[], offer: string): number {
  let lean = 1;
  for (const trait of traits) {
    const bias = LEANING[trait]?.[offer];
    if (bias !== undefined) lean *= bias;
  }
  return lean;
}

/**
 * A quién más le pesa el sitio, si no es exactamente el carácter.
 *
 * IA-3: «los niños juegan cerca de casa; los mayores prefieren pausas
 * próximas» (brief) no es un rasgo — es la edad, que el motor ya lleva
 * (`ageOf`, `@engine/people/villagers`) y que `village.ts` traduce a esta
 * categoría antes de que `decide()` la vea, para que este fichero no tenga
 * que importar los umbrales de `@engine/balance` (`DAY.CHILD_UNDER`,
 * `DAY.ELDER_OVER`) sólo para esto.
 *
 * IA-12: niños y mayores quedan excluidos del trabajo antes de puntuar.
 */
const AGE_LEANING: Readonly<Record<'child' | 'elder', Partial<Record<string, number>>>> = {
  child: { play: 1.8, chase: 1.6, pet: 1.2, gossip: 0.6, pray: 0.5, work: 0.35 },
  elder: { sit: 1.6, watch: 1.4, pray: 1.2, work: 0.6 },
};

function ageLeanOf(group: 'child' | 'elder' | undefined, offer: string): number {
  if (group === undefined) return 1;
  return AGE_LEANING[group][offer] ?? 1;
}

/**
 * Cuánto vale una oferta en función de la hora del día.
 *
 * **Tiene que dar ventaja en su hora, no sólo penalizar fuera de ella.** La
 * primera versión topaba en 1,0 dentro de la franja punta y caía por debajo
 * fuera: así una oferta con hora nunca podía ganarle a una oferta idéntica sin
 * restricción horaria, porque ésa vale 1,0 siempre. Medido: la plaza (`gossip`
 * con hora) pierde casi siempre contra el pozo (`gossip` sin hora), y el claro
 * (`work` con hora) casi siempre contra un campo normal — en seis semillas,
 * la plaza no recibía visita en cuatro y el claro en dos. Con la hora como
 * puro lastre, los sitios comunes de V-10 no aportaban nada.
 *
 * TUNE: 1,4 dentro de la franja punta, 0,6 como mínimo fuera. Dentro gana a
 * cualquier alternativa sin hora que dé lo mismo; fuera sigue siendo viable,
 * porque nunca es cero.
 */
function hourFactor(offer: Offer, dayPhase: number): number {
  if (offer.hours === undefined) return 1;

  const [start, end] = offer.hours;
  // Cierra el intervalo: si es [0.6, 1.0] y la jornada es cíclica, hay que
  // considerar que [0.95, 1.0] y [0.0, 0.05] son adyacentes.
  const inRange = (dayPhase >= start && dayPhase <= end)
    || (start > end && (dayPhase >= start || dayPhase <= end));

  if (inRange) return 1.4;

  // Fuera de hora, vale menos pero no cero. Usa una caída suave según la
  // distancia: lo más lejano de la ventana vale menos.
  const mid = (start + end) / 2;
  let distance = Math.abs(dayPhase - mid);
  // Si la ventana cruza el borde del día, la distancia es la más corta en el
  // ciclo (acordeón).
  if (start > end && distance > 0.5) distance = 1 - distance;

  // Caída suave: lejos de la hora punta, valor base bajo.
  return 0.6 + 0.4 / (1 + distance * 5);
}

/**
 * Cuánto vale para alguien hacer esto, ahora.
 *
 * Lo que calma, pesado por lo que aprieta. Una oferta que da mucho de algo que
 * a uno no le pide nada vale poco, y ahí está lo que hace que dos personas
 * frente al mismo pozo hagan cosas distintas.
 *
 * `reach` (IA-3): opcional, por defecto `LOOK` — el mismo alcance de siempre.
 * `decide()` da uno más corto para un crío o un mayor, así que la lejanía les
 * pesa más sin que la fórmula tenga que cambiar de forma.
 */
export function worth(
  offer: Offer,
  needs: Needs,
  traits: readonly Trait[],
  from: Point,
  reach: number = LOOK,
): number {
  let value = 0;
  for (const name of NEED_NAMES) {
    const gives = offer.gives[name];
    if (gives === undefined) continue;
    value += needs[name] * gives;
  }
  if (value <= 0) return 0;
  const away = Math.hypot(offer.at.x - from.x, offer.at.z - from.z);
  return value * leanOf(traits, offer.id) * falloff(away, reach);
}

/**
 * Cuánto más corto busca un crío o un mayor, en fracción de `LOOK`.
 *
 * TUNE: 0,6 y 0,7. No es que no puedan llegar más lejos —si la sed aprieta,
 * `worth()` ya deja que la necesidad gane a la distancia (§ arriba)— es que,
 * a igualdad de necesidad, un crío o un mayor se conforma con lo de al lado
 * antes que un adulto. Menos que 0,5 dejaba a los mayores sin nada que hacer
 * en aldeas poco densas —midiendo, `doing === null` subía—, así que no se
 * aprieta más.
 */
const CHILD_RANGE_SCALE = 0.6;
const ELDER_RANGE_SCALE = 0.7;

/**
 * Cuánto más lejos busca un `devout` una capilla, comparado con cualquier otra
 * cosa sin hora fija.
 *
 * TUNE: 3, entre el 2 de una oferta corriente y el 4 de una con hora punta
 * (`hourFactor`): una capilla no convoca a una hora, pero para quien de
 * verdad la busca vale la pena caminar más que por un pozo cualquiera — «la
 * capilla alcanzable» del brief es exactamente esto, que el radio de
 * búsqueda se estire hasta donde de verdad se puede llegar, y `route === null`
 * en el bucle de abajo sigue descartando la que no se puede.
 */
const DEVOUT_REACH_MULT = 3;

/**
 * Un tirón extra hacia el punto de casa, sólo para críos.
 *
 * IA-3, «los niños juegan cerca de casa»: además de la distancia normal desde
 * donde el crío está ahora (`worth()`, de sobra para que no cruce el valle por
 * un capricho), esto pesa lo lejos que el sitio cae **de su puerta**, así que
 * un niño que ha salido a jugar prefiere quedarse por el barrio aunque en ese
 * instante esté más cerca de otra cosa. `home` puede faltar (sin casa, o es
 * una bestia sin rasgos): entonces no pesa nada, `1`.
 *
 * TUNE: nueve celdas — un poco más que `LOOK` (5), porque el radio de casa no
 * tiene que ser tan estrecho como el de «qué hay a mano ahora mismo»: es «no
 * salir del barrio», no «no moverse».
 */
const HOME_RANGE = 9;

function homePull(group: 'child' | 'elder' | undefined, home: Point | undefined, at: Point): number {
  if (group !== 'child' || home === undefined) return 1;
  const away = Math.hypot(at.x - home.x, at.z - home.z);
  return falloff(away, HOME_RANGE);
}

/**
 * Cada cuántos pasos se replantea uno la vida.
 *
 * TUNE: 45, que son segundo y medio escénico. **No cada paso**: alguien que
 * cambia de idea treinta veces por segundo tiembla, y lo que se ve es un
 * temblor y no una duda. Tampoco tan pocas veces que no reaccione a lo que
 * pasa delante.
 */
export const RETHINK = 45;

/**
 * Cuánto se queda un cuerpo en la misma plaza de un sitio antes de que el
 * sorteo le ofrezca otra, en pasos de la vida.
 *
 * TUNE: 900 pasos, treinta segundos escénicos — un cuarto de jornada. Elegido
 * contra la actividad más larga que hay (`ruminate`, 26 a 45 s en `beasts.ts`)
 * y contra la más corta (`peck`, 3 a 7 s): con esto, una tanda corta se repite
 * varias veces en el mismo palmo y una larga cabe entera, que es lo que hace
 * que «estar en un parche» se vea como estar y no como pasar.
 */
const SEAT_DWELL = 900;

/**
 * Cuánto se prefiere lo que ya se está haciendo.
 *
 * TUNE: un tercio más. Sin inercia nadie termina nada: en cuanto otra oferta
 * empata, se cambia, y lo que se ve es gente dando vueltas entre dos sitios.
 */
const STICKY = 1.35;

/**
 * Los rasgos que se quedan más al tajo, del brief IA-3: «más persistencia en
 * trabajo válido». No es que trabajen mejor —eso sería un número mecánico
 * que §6.3 prohíbe fuera de la lista cerrada— es que, ya puestos, no lo
 * sueltan por cualquier cosa que empate.
 */
const WORK_STICKY_TRAITS: readonly Trait[] = ['ambitious', 'stubborn', 'loyal'];

/**
 * Cuánto más se aferra uno de esos rasgos al tajo, encima de `STICKY`.
 *
 * TUNE: la mitad más. Con `STICKY` a secas los tres rasgos ya ganaban algo de
 * persistencia por el mero hecho de que `LEANING.work` los hace elegir el tajo
 * más a menudo (§ arriba), pero eso es «lo eligen más», no «lo sueltan menos»
 * — dos cosas distintas que el brief separa. Medido: sin este segundo empujón
 * la media de cambios de actividad al día de un `stubborn` en el tajo no se
 * distinguía de la de nadie más; con él, sí (ver la tabla de estabilidad del
 * informe de esta ronda).
 */
const WORK_STICKY_BONUS = 1.5;

function sticksToWork(traits: readonly Trait[]): boolean {
  return traits.some((trait) => WORK_STICKY_TRAITS.includes(trait));
}

/**
 * Cuánto se empuja hacia la plaza de más número (el borde del corro) un
 * `secretive`, del brief IA-3.
 *
 * TUNE: 2,4. Con 1 no habría sesgo (el dado de toda la vida); por debajo de 2
 * el borde ganaba demasiado poco para notarse al lado del resto de la aldea
 * —medido, la plaza media de un `secretive` casi no se distinguía de la de
 * cualquiera—; por encima de 3 casi siempre saca la última plaza exacta, lo
 * que en un corro de pocas plazas se lee como «siempre en el mismo sitio»,
 * justo el defecto que IA-1 quitó para las bestias. 2,4 deja un borde marcado
 * sin caer en eso.
 */
const SECRETIVE_EDGE_POWER = 2.4;

/**
 * Cuánto se acorta un encuentro social para un `secretive`, del brief IA-3.
 *
 * TUNE: 0,6. Bastante para que la diferencia se note contando cuerpo-segundos
 * por jornada (la medida de esta ronda) sin caer tan bajo que el encuentro se
 * confunda con un cruce sin más — `offer.seconds` ya tiene un mínimo (por
 * ejemplo `gossip: [6, 18]`) y 0,6 de eso sigue siendo una parada de verdad,
 * no un parpadeo.
 */
const SECRETIVE_SHORT = 0.6;

/**
 * Cuántas ofertas se prueban antes de darse por vencido.
 *
 * TUNE: cuatro. Pedir una ruta cuesta, así que no se pueden probar todas; pero
 * con una sola, cualquier oferta inalcanzable dejaba a alguien sin hacer nada
 * el resto del rato. Cuatro cubre el caso real —la mejor y sus vecinas
 * inmediatas suelen estar en el mismo rincón, y si ese rincón está cortado hay
 * que salir de él— sin convertir cada replanteo en un barrido del valle.
 */
const TRY = 4;

/** Lo que decide alguien, con todo lo suyo delante. */
export interface Chooser {
  readonly job?: DayJob | null | undefined;
  readonly phase?: number;
  readonly traits: readonly Trait[];
  readonly needs: Needs;
  readonly at: Point;
  readonly id: number;
  /** Lo que ya está haciendo, si es que hace algo. */
  readonly doing: Intent | null;
  /**
   * IA-3: si es un crío o un mayor, para lo que el brief pide («los niños
   * juegan cerca de casa; los mayores prefieren pausas próximas») y que no es
   * un rasgo — es la edad, que `village.ts` ya convierte a esta categoría con
   * los umbrales del motor (`@engine/balance`, `DAY.CHILD_UNDER`/
   * `DAY.ELDER_OVER`) antes de llegar aquí. `undefined` es un adulto, y
   * también lo que sigue siendo cualquier bestia (`beasts.ts` no la da).
   */
  readonly ageGroup?: 'child' | 'elder' | undefined;
  /**
   * IA-3: la puerta de su propia casa, sólo para el tirón de «cerca de casa»
   * de un crío (`homePull`, arriba). Falta si no tiene casa asignada o si
   * quien decide es una bestia; entonces no pesa nada.
   */
  readonly home?: Point | undefined;
  /**
   * Las plazas que ya le fallaron hace poco, por `failedSeatKey`. **La pieza
   * que faltaba** (task-log §4, punto 1): sin ella, quien abandonaba un viaje
   * por no avanzar volvía a elegir **la misma plaza inalcanzable** —la llave
   * del sorteo es la misma durante `SEAT_DWELL`— y reintentaba en bucle con
   * la necesidad a tope. Medido al probar el plazo vencido sin esto: parados
   * con un impulso al máximo de 0,06 % a 0,20 %. Lo rellena `village.ts` con
   * lo que `noProgress()` y el plazo vencido descartan, durante `SHUN_STEPS`.
   *
   * **Se descarta la plaza, no el sitio.** La primera versión descartaba el
   * sitio entero y le quitaba la capilla al devoto —es quien viaja más lejos
   * a rezar y a quien más se le vence el viaje—: rezaba 1,97 veces lo que el
   * resto en vez de más del doble. Con la plaza sola, al volver a mirar el
   * mismo sitio sale otra plaza libre.
   */
  readonly shunned?: ReadonlySet<string> | undefined;
  /** Celdas por segundo de quien decide, para el plazo del viaje. Sin él no hay plazo. */
  readonly pace?: number | undefined;
  /**
   * **La intención de ahora ha fallado: no la conserves.** Lo pone `village.ts`
   * cuando el viaje no avanza (`noProgress`) o se le ha pasado el plazo
   * (`arriveBy`), y sin esto el replanteo no servía de nada en el único caso
   * en que hace falta — ver la viabilidad de abajo.
   */
  readonly restart?: boolean | undefined;
}

/**
 * Cuánto dura el descarte de una plaza que falló: una ventana de sorteo
 * entera, para que al volver a mirar ese sitio salga otra plaza y no la misma.
 */
export const SHUN_STEPS = SEAT_DWELL;

/** La llave de una plaza concreta de una oferta en un sitio, para `Chooser.shunned`. */
export function failedSeatKey(doing: Pick<Intent, 'place' | 'offer' | 'seat'>): string {
  return `${seatKey(doing.place, doing.offer)}#${doing.seat}`;
}

/**
 * Qué hace uno ahora.
 *
 * Devuelve nada cuando no hay nada que merezca la pena a su alcance, que es una
 * respuesta legítima: quien no tiene nada que hacer se queda por ahí, y eso
 * también es una aldea.
 *
 * El ruido sale de `seed` por una función pura: **misma jornada, mismas
 * decisiones**. §4.3 en pie, y además es lo que permite reconstruir el día tras
 * un letargo sin que la aldea cambie de planes.
 */
export function decide(
  who: Chooser,
  places: readonly Place[],
  taken: ReadonlyMap<string, number>,
  land: Terrain,
  router: Router,
  seed: number,
  step: number,
): Intent | null {
  const dayPhase = who.phase ?? (step % STEPS_PER_DAY) / STEPS_PER_DAY;
  const options: { place: Place; offer: Offer; score: number; key: string }[] = [];

  // IA-3: un crío o un mayor busca más corto, a igualdad de necesidad — ver
  // `CHILD_RANGE_SCALE`/`ELDER_RANGE_SCALE`. Un adulto sigue con `LOOK` tal
  // cual, así que nada de esto cambia una sola cifra para quien ya tenía
  // medidas las suyas (docs/historico/rework.md, IA-1 e IA-2).
  const rangeScale = who.ageGroup === 'child' ? CHILD_RANGE_SCALE
    : who.ageGroup === 'elder' ? ELDER_RANGE_SCALE : 1;
  const personalReach = LOOK * rangeScale;
  const devout = who.traits.includes('devout');

  for (const place of places) {
    const away = Math.hypot(place.at.x - who.at.x, place.at.z - who.at.z);
    // Un sitio con hora punta se busca más lejos que uno corriente: es un
    // punto de encuentro deliberado (la plaza, el vado, el claro de V-10) y no
    // un pozo cualquiera, así que vale la pena caminar un poco más para
    // llegar a él. Sin esto, la plaza y el claro quedaban fuera del alcance de
    // casi todo el mundo —medido, sin visita en cuatro y dos semillas de seis
    // respectivamente— porque suelen caer en el borde del núcleo construido.
    const hasHour = place.offers.some((offer) => offer.hours !== undefined);
    // IA-3: y un `devout` busca una capilla igual de lejos — «preferencia
    // contextual por capilla alcanzable» del brief: el radio se estira, pero
    // sigue siendo `route === null` quien descarta la que de verdad no se
    // puede pisar (más abajo, en el bucle de `TRY`).
    const hasChapel = devout && place.offers.some((offer) => offer.id === 'pray');
    const reachMult = hasHour ? 4 : hasChapel ? DEVOUT_REACH_MULT : 2;
    // **Una convocatoria no se busca, se obedece.** El alcance de un sitio con
    // hora —la reunión que el motor ordena, §11.8— se mide **sin** el recorte
    // por edad que IA-3 introdujo: «los niños y los mayores buscan más corto»
    // vale para elegir dónde jugar o dónde sentarse, no para oír una llamada de
    // la aldea. Con el recorte puesto, un crío veía la reunión a doce celdas y
    // un mayor a catorce en vez de a veinte, así que en una aldea grande
    // **literalmente no se enteraban**: V-11 midió 18 de 33 en la capilla de la
    // semilla 23, por debajo del suelo de 0,6 que esa prueba guarda, y la
    // propiedad que V-11 existe para vigilar es justamente que la orden del
    // motor llegue a toda la aldea.
    const searchReach = hasHour ? LOOK * reachMult : personalReach * reachMult;
    // Y la convocatoria llega a todos, esté donde esté: con el mapa grande el
    // vado queda a más de veinte celdas de media aldea. Medido en la semilla 7
    // (vado, año 12): los trece que no iban estaban a 20–25 celdas, fuera de
    // `LOOK × 4`, y se quedaban en pausa toda la jornada.
    if (away > searchReach && who.job?.place !== place.id && !place.id.startsWith('gather:')) continue;
    for (const offer of place.offers) {
      const assigned = who.job?.place === place.id && who.job.offer === offer.id;
      // Las descargas y la recolección nacen de una rutina que ya lleva su
      // carga o su puesto. Sin este corte cualquier vecino podía «descargar»
      // piedra o grano con las manos vacías por calmar el deber.
      if (offer.routineOnly === true && !assigned) continue;
      if (offer.id === 'work' && (who.ageGroup !== undefined || (who.job !== undefined && !assigned))) continue;
      const key = seatKey(place, offer);
      // El aforo, salvo para quien ya está dentro: no se echa a nadie de su
      // propio sitio por estar lleno.
      const inside = who.doing?.place.id === place.id && who.doing?.offer.id === offer.id;
      if (!inside && (taken.get(key) ?? 0) >= offer.seats) continue;

      let score = worth(offer, who.needs, who.traits, who.at, personalReach);
      // El turno laboral admite descanso y agua urgentes, no un cambio continuo de oficio.
      if (assigned && dayPhase >= 0.16 && dayPhase < 0.65 && who.needs.thirst < 0.9 && who.needs.rest < 0.9) score = Math.max(score, 1.2);
      if (place.id.startsWith('leisure:')) {
        if (inside) score *= 0.15;
        else score = Math.max(score, who.ageGroup === 'child' ? 0.55 : 0.25);
      }
      // **La convocatoria se obedece, no se sopesa** (§11.8, V-11). La reunión
      // que el motor ordena da compañía y quita aburrimiento, así que a quien
      // no le falte ninguna de las dos **no le ofrece nada** y `worth` le da
      // cero: se queda donde está. Y desde que la pausa de reserva es local
      // —la ronda anterior, para que «no hacer nada» dejara de ser un viaje—
      // la pausa además le mantiene el aburrimiento bajo, así que nunca vuelve
      // a tener ganas. Medido: **18 de 33 en la capilla de la semilla 23, y
      // los quince que faltaban estaban a tres o cinco celdas del sitio, en
      // pausa.** Lo veían y no iban.
      //
      // El suelo hace que la orden gane a estar de brazos cruzados sin
      // convertirla en obligación ciega: `GATHER_URGENT` deja fuera a quien
      // tiene una necesidad al límite, que es lo que el brief de IA-3 prohíbe
      // pisar («no ignores necesidades urgentes para forzar una escena»).
      const summoned = place.id.startsWith('gather:');
      // El suelo se aplica **al final**, después de la hora, la edad, la casa,
      // lo pegajoso y el dado — ver abajo. Aquí sólo se evita descartar la
      // reunión por valer cero.
      if (summoned && score <= 0) score = Number.EPSILON;
      if (score <= 0) continue;
      // El valle más vivo · **la comida y la hoguera tienen su hora y sólo su
      // hora.** `hourFactor` deja fuera de franja un 0,6 —una charla en la plaza
      // vale a cualquier hora—, y con eso medio pueblo «comía» desde las siete
      // de la mañana hasta la cena (medido, semilla 23). Fuera de su franja no
      // se ofrecen.
      if ((offer.id === 'meal' || offer.id === 'hearth') && hourFactor(offer, dayPhase) < 1.4) continue;
      // Y en su franja **ganan al tajo**: el turno de trabajo pone un suelo de
      // 1,2 a su puesto (arriba) y con él nadie dejaba la azada para comer.
      // **Salvo a mitad de un porte**: quien lleva un haz o una carga de grano
      // a su almacén (una rutina de oficio que no es el tajo) la termina antes.
      // Sin esta salvedad se soltaban leña y grano en medio del camino
      // (`life-resources.test.ts`, que juega su jornada al mediodía).
      const carrying = who.doing !== null && who.doing.offer.routineOnly === true && who.doing.offer.id !== 'work';
      if ((offer.id === 'meal' || offer.id === 'hearth') && !carrying) score = Math.max(score, 1.3);
      // El valle más vivo · **el puesto del buhonero saca a la gente del tajo**,
      // pero sólo a la de alrededor: a menos de `BROWSE_PULL` celdas. Sin suelo,
      // medido en las semillas 7, 23 y 41, nadie se acercaba nunca —el turno
      // vale 1,2 y el puesto sólo está a mediodía—; con él, el aforo (tres)
      // hace el resto. Por debajo de la comida (1,3): a la una se come.
      if (offer.id === 'browse' && !carrying
        && Math.hypot(place.at.x - who.at.x, place.at.z - who.at.z) < BROWSE_PULL) score = Math.max(score, 1.25);
      score *= hourFactor(offer, dayPhase);
      score *= ageLeanOf(who.ageGroup, offer.id);
      score *= homePull(who.ageGroup, who.home, place.at);
      if (inside) {
        score *= STICKY;
        if (offer.id === 'work' && sticksToWork(who.traits)) score *= WORK_STICKY_BONUS;
      }
      // Un pellizco de azar, para que dos vecinos idénticos frente al mismo
      // pozo no se muevan como un solo cuerpo.
      const dice = hash32(seed, `pick:${who.id}:${step}:${place.id}:${offer.id}`) / 4_294_967_296;
      score *= 0.85 + dice * 0.3;
      // **Un suelo que se multiplica después no es un suelo.** La primera
      // versión ponía `GATHER_FLOOR` antes de los factores de hora, edad y
      // casa y de lo pegajoso de la intención actual, así que 0,8 acababa en
      // 0,3 y la pausa —ya elegida, y por tanto ×1,35— ganaba. V-11 volvió a
      // caer con otra muestra (capilla, semilla 7: 14 de 26, los doce que no
      // iban en pausa a cuatro o seis celdas) en cuanto el arreglo de los
      // campos movió a la gente de sitio. La orden del motor se aplica sobre
      // el resultado final, con la única excepción de una necesidad al límite.
      if (summoned) {
        // El deber no cuenta: en día de reunión no hay tajo que lo calme, y
        // contarlo dejaba fuera a todo el que venía de trabajar. Medido en la
        // semilla 7 (vado, año 12): quince de veintinueve parados en pausa,
        // todos con el deber a 0,92 o 1,0.
        const urgent = Math.max(...NEED_NAMES.filter((need) => need !== 'duty').map((need) => who.needs[need]));
        if (urgent < GATHER_URGENT) score = Math.max(score, GATHER_FLOOR);
      }

      options.push({ place, offer, score, key: seatKey(place, offer) });
    }
  }

  if (options.length === 0) return null;
  // De mejor a peor, y con desempate por clave para que dos ofertas que puntúen
  // exactamente igual no dependan del orden en que se recorrió el valle (§4.3).
  options.sort((a, b) => (b.score - a.score) || (a.key < b.key ? -1 : 1));

  for (const pick of options.slice(0, TRY)) {
    const same = who.doing !== null
      && who.doing.place.id === pick.place.id
      && who.doing.offer.id === pick.offer.id;
    // **Se sigue con lo mismo sólo si lo mismo todavía sirve**, y esto es el
    // arreglo de IA-9. Antes se devolvía la intención tal cual —«se sigue, sin
    // recalcular el camino»—, que es lo correcto para un viaje que avanza y
    // ruinoso para uno que no: con la ruta gastada sin haber llegado, `want`
    // vale cero y el cuerpo **se queda de pie para siempre**, porque cada
    // replanteo vuelve a elegir el mismo sitio y vuelve a devolver la misma
    // intención muerta. El descarte de plaza de IA-8 y el plazo del viaje
    // tampoco podían entrar: este atajo estaba antes que ellos.
    //
    // Medido en el navegador con `tools/graphics/film.mjs` (semilla 11, año 50,
    // 30 s de aldea, 44 personas): **una de cada cinco muestras era un cuerpo
    // con intención, sin llegar y a velocidad cero**, sin estar en ninguna
    // escena. El 91 pasó los 907 pasos de la película clavado en el mismo
    // punto persiguiendo una gallina, con la ruta a cero y la sed subiendo de
    // 0,22 a 0,58. Nada de eso se veía en el informe de fuera del navegador,
    // que sólo contaba a quien no tenía intención ninguna.
    //
    // Dos motivos para soltarla, y los dos vienen de fuera o de ella misma:
    // que la ruta esté gastada sin haber llegado, y que quien pregunta diga
    // que este viaje ya ha fallado (`restart`).
    const usable = who.doing !== null
      && who.restart !== true
      && (who.doing.there || who.doing.route.length > 0);
    if (same && usable) return who.doing;

    // La plaza que queda libre en ese sitio, y con ella el palmo de suelo donde
    // ponerse: un corro y no un montón.
    //
    // **Al azar entre las libres, no siempre la primera** (checklist IA-1,
    // punto 2). Con `seat = ya ocupadas` a secas, una oferta de uso exclusivo
    // —el `self` de un animal (`beasts.ts`), que nadie más elige nunca—
    // siempre ve cero ocupadas y siempre cae en el mismo `spots[0]`: la vaca
    // que «vuelve siempre al mismo sitio exacto» de docs/historico/rework.md §3.5.2, aun
    // dándole varios puntos entre los que elegir. El desempate sale de
    // `hash32` por persona, paso y oferta, así que dos máquinas colocan al
    // mismo animal en el mismo sitio (§4.3), y sigue sin poder pasarse del
    // aforo: el hueco es sólo entre las plazas que quedan libres.
    const already = taken.get(pick.key) ?? 0;
    const free = pick.offer.seats - already;
    // **La plaza se sortea una vez por estancia, no una por replanteo.** La
    // llave llevaba el paso, así que cada vez que alguien se replanteaba —cada
    // `RETHINK`, segundo y medio— salía **otra** plaza del mismo sitio y había
    // que ir hasta ella. Para una persona es un roce; para un cuerpo lento es
    // la jornada entera: medido, **la vaca andaba el 93 % del día y pastaba el
    // 5 %**, con sus cinco parches de pasto a entre 1,2 y 3,2 celdas del ancla
    // y un paso de 0,32 celdas por segundo, o sea hasta diez segundos de ida
    // para un pasto de catorce. Iba de parche en parche sin llegar a comer en
    // ninguno.
    //
    // Es el mismo error que `GREET_ODDS` (`scenes.ts`): una tirada con el paso
    // en la llave no es una tirada, son treinta por segundo. Y con la ventana
    // puesta sale gratis lo que el cuaderno de referencia visual pide para la
    // vaca —«pastar **por parches**», quedarse en uno y avanzar poco entre
    // tandas (`docs/visual-reference` §3)—: dentro de la estancia se vuelve al
    // mismo sitio, y al cambiar de ventana se pasa al siguiente.
    const dwell = Math.floor(step / SEAT_DWELL);
    const rawDice = hash32(seed, `seat:${who.id}:d${dwell}:${pick.key}`) / 4_294_967_296;
    // IA-3: «bordes del corro» para un `secretive`, del brief. Elevar el dado a
    // una potencia mayor que uno lo empuja hacia 1 y no hacia 0, así que en vez
    // de repartirse uniforme entre todas las plazas libres, un reservado casi
    // siempre saca la de más número — y `seatsOn()` (`offers.ts`) ya construye
    // `spots` de dentro a fuera, así que la de más número es la del anillo más
    // alejado del centro del corro. No cambia nada del aforo ni de si hay
    // plaza: sólo cuál, de las que ya estaban libres.
    const secretive = who.traits.includes('secretive');
    const shaped = secretive ? 1 - (1 - rawDice) ** SECRETIVE_EDGE_POWER : rawDice;
    const jitter = free <= 1 ? 0 : Math.floor(shaped * free);
    // La plaza que ya falló hace poco se salta: se prueban las demás libres en
    // orden, y si todas fallaron se pasa al siguiente sitio.
    let seat = already + jitter;
    if (who.shunned !== undefined && free > 0) {
      let tries = 0;
      while (tries < free && who.shunned.has(`${pick.key}#${seat}`)) {
        seat = already + (jitter + tries + 1) % free;
        tries += 1;
      }
      if (tries >= free) continue;
    }
    if (who.job?.place === pick.place.id && who.job.offer === pick.offer.id && who.job.seat !== undefined) seat = who.job.seat;
    const spot = seatAt(pick.offer, seat);
    const route = router.to(land, who.at, spot, who.job === undefined ? undefined : 0.32);
    // **Sin camino se prueba la siguiente, no se abandona el día.** Era la otra
    // mitad del fallo de las plazas en pared: bastaba con que la mejor oferta
    // fuera inalcanzable para que la persona se quedara sin hacer nada, y como
    // la elección es determinista, al replantearse volvía a ganar la misma y
    // volvía a no haber camino. Clavado hasta que se le pasaran las ganas.
    if (route === null) continue;

    const span = pick.offer.seconds;
    const dice = hash32(seed, `span:${who.id}:${step}`) / 4_294_967_296;
    let seconds = span[0] + dice * (span[1] - span[0]);
    // IA-3: «encuentros breves» para un `secretive` — del brief, la otra mitad
    // de la misma frase que los bordes del corro. Sólo en lo que de verdad es
    // un encuentro (la oferta da compañía, `gives.company`): beber o rezar no
    // se acortan, porque no son encuentros con nadie.
    if (secretive && pick.offer.gives.company !== undefined) seconds *= SECRETIVE_SHORT;
    return {
      place: pick.place,
      offer: pick.offer,
      route: [...route],
      seat,
      since: step,
      until: step + Math.round(seconds * 30),
      durationSteps: Math.round(seconds * 30),
      there: false,
      ...(who.pace === undefined || who.pace <= 0 ? {} : {
        arriveBy: step + Math.round((route.reduce((sum, point, i) => sum + Math.hypot(point.x - (route[i - 1] ?? who.at).x,
          point.z - (route[i - 1] ?? who.at).z), 0) / who.pace) * 30 * JOURNEY_SLACK) + JOURNEY_GRACE_STEPS,
      }),
    };
  }

  // Ninguna de las `TRY` mejores tiene ruta. Si ya se había llegado a algo
  // —`there === true`— se sigue: no hay motivo para soltar una ocupación en
  // marcha sólo porque nada mejor sea alcanzable ahora mismo, y esto también
  // cubre `who.doing === null` (no hay nada que conservar).
  //
  // **Pero una intención que iba de camino se invalida, no se repite**
  // (checklist IA-1, punto 4). Esta función sólo se llama con
  // `doing !== null && !there` cuando el viaje se ha dado por eterno —los dos
  // llamadores, `village.ts` y `beasts.ts`, sólo invocan `decide()` de camino
  // cuando `noProgress()` lo pide—, así que conservarla aquí es repetir el
  // mismo fracaso hasta `GIVE_UP` cada vez: el cuerpo vuelve a intentar la
  // misma ruta que ya ha demostrado no llevar a ningún sitio. `null` deja que
  // quien llama ofrezca otra cosa (`pauseHere`, más abajo).
  if (who.doing !== null && who.doing.there) return who.doing;
  return null;
}

/** Lo que una oferta calma, aplicado a quien la está haciendo. */
export function satisfy(needs: Needs, offer: Offer, seconds: number): void {
  for (const name of NEED_NAMES) {
    const gives = offer.gives[name];
    if (gives === undefined) continue;
    // Se calma poco a poco mientras dura, no de golpe al acabar: así sentarse
    // un rato corto sirve de algo y se puede interrumpir sin perderlo todo.
    const rate = gives / Math.max(1, offer.seconds[0]);
    needs[name] = Math.max(0, Math.min(1, needs[name] - rate * seconds));
  }
}

/**
 * Cada cuántos pasos se comprueba si un viaje avanza.
 *
 * TUNE: 90 pasos, tres segundos escénicos (checklist IA-1, punto 6). Ni cada
 * paso —confundiría el vaivén de un forcejeo de un instante con un atasco de
 * verdad— ni sólo al `GIVE_UP` entero (600 pasos, veinte segundos): eso es
 * justo la espera fija que se deja de hacer.
 */
export const PROGRESS_CHECK = 90;

/**
 * Cuánto tiene que haberse acercado al objetivo desde la última comprobación
 * para contar como avance, en celdas.
 *
 * TUNE: 0,3. Más que el vaivén de un forcejeo con un vecino o una pared
 * (docs/historico/rework.md §3.5.1 y §3.5.3, mismo margen que `TURN_MIN_PROGRESS` en
 * `body.ts`), menos que cualquier tramo real de camino andado a paso normal
 * en tres segundos.
 */
const PROGRESS_MIN = 0.3;

/**
 * Qué parte de lo que un cuerpo **andaría suelto** en la ventana de comprobación
 * cuenta como avanzar.
 *
 * TUNE: 0,25. `PROGRESS_MIN` es una distancia fija y estaba calibrada con el
 * paso de una persona (1,05 a 1,65 celdas por segundo, `village.ts`). Una
 * gallina anda a 0,55 y una vaca a 0,32, así que en los tres segundos de
 * `PROGRESS_CHECK` una vaca recorre menos de lo que la cota fija exige y
 * **«no avanzar» le pasaba andando**. Medido con una gallina paso a paso: se
 * acercaba de 1,66 a 0,61 celdas de su sitio —la llegada está en 0,6— y en ese
 * momento se la declaraba atascada, elegía otra actividad en dirección
 * contraria y volvía a empezar. Así, las tres especies pasaban entre el 69 % y
 * el 92 % de la jornada andando y no llegaban nunca: gallina picoteando el
 * 8 %, vaca pastando el 5,7 % y rumiando el 0,1 %, y `lie` y `amble` del cerdo
 * sin salir ni una vez.
 *
 * Relativo al paso propio, como ya lo son `TURN_MIN_SPEED` y
 * `TURN_MIN_PROGRESS` (`body.ts`), un cuerpo lento y uno rápido piden lo
 * mismo: avanzar un cuarto de lo que andarían sin que nada les retuviera.
 */
const PROGRESS_SHARE = 0.25;

/**
 * Lo que hace falta recordar, de una llamada a `noProgress()` a la
 * siguiente, para saber si una intención avanza.
 *
 * Vive fuera de `Dweller`/`Beast` a propósito: `Dweller` lo construyen
 * también ficheros ajenos a esta fase (pruebas de escenas, por ejemplo), y
 * añadirle campos obligatorios les rompería el tipo sin que esta fase pueda
 * tocarlos. `village.ts` guarda uno de éstos por persona en un mapa aparte;
 * `beasts.ts` lo lleva colgado del propio `Beast`, que sólo construye él.
 */
export interface ProgressState {
  at: number;
  gap: number;
  stalls: number;
}

/** Un `ProgressState` recién nacido: sin comprobación hecha todavía. */
export function freshProgress(): ProgressState {
  return { at: 0, gap: Number.POSITIVE_INFINITY, stalls: 0 };
}

/**
 * Si el viaje se ha quedado sin avanzar y toca replantearlo.
 *
 * **Espera creciente, no un `GIVE_UP` fijo** (checklist IA-1, punto 6): la
 * primera vez que no hay avance se concede el replanteo a los tres segundos
 * (`PROGRESS_CHECK`), y si la intención nueva vuelve a atascarse la espera se
 * dobla cada vez, hasta el tope que marca `giveUp` — así un tropiezo de un
 * instante no dispara el router de más (`RETHINK` ya evita recalcular cada
 * paso; esto evita recalcular cada tres segundos para siempre), y quien está
 * de verdad clavado no espera nunca el tope entero para que se note.
 *
 * Muta `state` porque necesita recordar, de una llamada a la siguiente,
 * cuánto se había acercado la última vez y cuántas veces seguidas no ha
 * mejorado — la misma clase de estado por cuerpo que `rethinkAt`, no algo que
 * quepa calcular sin memoria.
 */
export function noProgress(
  doing: Intent | null, state: ProgressState, at: Point, step: number, giveUp: number,
  /**
   * El paso del cuerpo, en celdas por segundo. Sin él se usa la cota fija de
   * siempre, que es lo que vale para una persona; con él, la cota se mide en
   * proporción a lo que ese cuerpo andaría suelto (ver `PROGRESS_SHARE`).
   */
  pace?: number,
): boolean {
  if (doing === null || doing.there) { state.stalls = 0; return false; }
  if (step < state.at) return false;

  const target = seatAt(doing.offer, doing.seat);
  const gap = Math.hypot(target.x - at.x, target.z - at.z);
  const least = pace === undefined
    ? PROGRESS_MIN
    : Math.min(PROGRESS_MIN, pace * PROGRESS_CHECK * LIFE_STEP * PROGRESS_SHARE);
  const improved = gap < state.gap - least;
  state.stalls = improved ? 0 : Math.min(state.stalls + 1, 4);
  state.gap = gap;
  state.at = step + Math.min(giveUp, PROGRESS_CHECK * 2 ** state.stalls);
  return !improved;
}

/**
 * Una pausa local, siempre alcanzable.
 *
 * Checklist IA-1, punto 5: para cuando `decide()` no encuentra nada que
 * merezca la pena — o lo que había se acaba de invalidar por inalcanzable
 * (punto 4) — el cuerpo tiene que poder hacer algo donde está, en vez de
 * quedarse con `doing === null` hasta que la jornada vuelva a intentarlo
 * entero. Es la medida que sigue sin moverse en docs/historico/rework.md §3.6: parados con
 * un impulso ≥ 0,9, 0,19 %.
 *
 * No es una oferta del catálogo (`offers.ts`, `OFFERS`): nadie más la ve —se
 * construye aquí mismo, de un uso— y no compite por aforo con nadie. Sólo
 * tiene que existir un instante y ser alcanzable de verdad, así que sus
 * `spots` viven a una o dos celdas del punto de partida (el rango que pide
 * docs/historico/rework.md §3.5.4) y sólo en celda libre; si ninguno de los intentos cae
 * bien —un rincón de una sola celda, rarísimo pero posible—, el propio punto
 * de partida entra como último recurso, porque ahí es donde el cuerpo ya
 * está de pie y por tanto siempre es alcanzable.
 *
 * `reach: 1` a propósito: `follow()` considera un tramo andado en cuanto se
 * está a `REACHED = 0.45` celdas (`navigate.ts`), y la llegada de verdad se
 * mide a `offer.reach * 0.6` — con `reach` por debajo de 0,75 ese margen cae
 * por debajo de 0,45 y un cuerpo podría vaciar la ruta sin llegar nunca a
 * marcarse como llegado, quedándose de pie sin `there === true` para
 * siempre.
 */
const PAUSE_SPOTS = 3;

/** Lo que dura una pausa para quien no es ni `hardy` ni `frail`, en segundos
 *  escénicos. Lo mismo que ya daba `pauseHere` antes de IA-3. */
const PAUSE_SPAN: readonly [number, number] = [4, 9];

/**
 * Cuánto escala la pausa un `hardy` o un `frail`, del brief IA-3: «pausas y
 * ritmo distintos, sin bloquear el cuerpo».
 *
 * TUNE: 0,7 más corto para el `hardy` (aguanta, no necesita tanto), 1,4 más
 * largo para el `frail` (se repone más despacio) — la misma proporción que
 * `TEMPER.rest` ya usa en `needs.ts` para lo contrario (cuánto le cuesta
 * cansarse), leída aquí del revés para cuánto tarda en reponerse una vez
 * parado. **Sin bloquear el cuerpo**: esto sólo cambia `offer.seconds`, nunca
 * el mecanismo — `RETHINK`, `GIVE_UP` y `noProgress()` siguen mandando igual,
 * así que un `frail` sigue sin poder quedarse pausado para siempre.
 */
const PAUSE_HARDY_SCALE = 0.7;
const PAUSE_FRAIL_SCALE = 1.4;

function pauseSpan(traits: readonly Trait[]): readonly [number, number] {
  const scale = traits.includes('hardy') ? PAUSE_HARDY_SCALE
    : traits.includes('frail') ? PAUSE_FRAIL_SCALE : 1;
  return [PAUSE_SPAN[0] * scale, PAUSE_SPAN[1] * scale];
}

/**
 * Libera la plaza de lo que se dejaba y ocupa la de lo nuevo, en el mismo
 * mapa de aforo.
 *
 * IA-2: `village.ts` y `beasts.ts` tenían estas mismas tres líneas escritas a
 * mano y por duplicado cada vez que `decide()` cambiaba de intención — la
 * misma clase de limpieza a mano que el registro de compromisos
 * (`commitments.ts`) viene a quitar de las escenas. Aquí y no en `offers.ts`:
 * `Intent` es de este fichero, y `offers.ts` no importa de aquí para no
 * cerrar un ciclo (`decide.ts` sí importa de `offers.ts`).
 */
export function moveSeat(
  taken: Map<string, number>, before: Intent | null, doing: Intent,
): void {
  if (before !== null) {
    const old = seatKey(before.place, before.offer);
    taken.set(old, Math.max(0, (taken.get(old) ?? 1) - 1));
  }
  const now = seatKey(doing.place, doing.offer);
  taken.set(now, (taken.get(now) ?? 0) + 1);
}

/**
 * Cuánto se aleja un cuerpo para hacer nada, en segundos de su propio paso.
 *
 * TUNE: 0,6 s. La pausa se plantaba a una o dos celdas **fijas**, y eso convertía
 * cada rato muerto en un viaje: una gallina picotea tres segundos, se le va el
 * aburrimiento, tarda veinte en volver a tenerlo (`BEAST_RISE`), y en ese hueco
 * ninguna actividad vale nada, así que entra la pausa —y se pasa el hueco
 * **andando hacia ella** a medio paso. Medido: del 65 % al 96 % de la jornada de
 * los tres animales en «andando», con la vaca pastando el 1,5 %, y la inmensa
 * mayoría de ese tiempo camino de una pausa.
 *
 * Medido en segundos del paso propio, «hacer nada» es quedarse más o menos
 * donde estás: una persona se mueve poco más de media celda, una gallina un
 * tercio. Es el mismo criterio que el margen con las paredes y el umbral de
 * avance: lo que se le pide a un cuerpo se mide con ese cuerpo.
 */
const PAUSE_SECONDS = 0.6;
/** Hasta dónde llama un puesto de la plaza, en celdas (`OFFERS.browse`). */
const BROWSE_PULL = 12;

export function pauseHere(
  at: Point, land: Terrain, router: Router, seed: number, id: number, step: number,
  // IA-3: opcional y al final, por defecto sin rasgos — así `beasts.ts`
  // (que llama sin este argumento, «un animal no tiene rasgos») sigue
  // compilando y comportándose exactamente igual que antes de esta ronda.
  traits: readonly Trait[] = [],
  /** El paso del cuerpo, para que «hacer nada» no sea un viaje (`PAUSE_SECONDS`). */
  pace = 1,
): Intent {
  const spots: Point[] = [];
  for (let n = 0; n < PAUSE_SPOTS; n += 1) {
    const angle = (hash32(seed, `pause:${id}:${step}:${n}:a`) / 4_294_967_296) * Math.PI * 2;
    const roam = Math.max(0.25, pace * PAUSE_SECONDS);
    const dist = roam * (0.4 + 0.6 * (hash32(seed, `pause:${id}:${step}:${n}:d`) / 4_294_967_296));
    const spot = { x: at.x + Math.cos(angle) * dist, z: at.z + Math.sin(angle) * dist };
    if (spot.x <= 0.5 || spot.z <= 0.5 || spot.x >= land.width - 0.5 || spot.z >= land.height - 0.5) continue;
    if (blockedAt(land, spot.x, spot.z)) continue;
    spots.push(spot);
  }
  if (spots.length === 0) spots.push({ x: at.x, z: at.z });

  const anchor = spots[0] as Point;
  const offer: Offer = {
    id: 'pause', at: anchor, reach: 1, seats: spots.length,
    // **Una pausa no bebe agua, ni cumple tu deber, ni te da compañía.** La
    // primera versión de IA-1 calmaba un pellizco de sed, compañía y deber
    // «para que nadie se quede con sed 1,0 mostrada indefinidamente», y eso es
    // tapar el síntoma: con la sed calmándose de pie, un cuerpo sediento se
    // queda parado en vez de ir al agua, y la cifra de §3.6 mejora sin que el
    // valle mejore. El sediento que no encuentra agua es un hueco de
    // contenido, no de decisión, y se arregla donde estaba el hueco: había un
    // solo pozo de dos plazas para toda la aldea, y ahora el vado da de beber
    // (`places.ts`, `OFFERS.drink`). Aquí sólo lo que de verdad da estar
    // parado un rato: descansar, dejar de aburrirse y templarse.
    gives: { rest: 0.2, boredom: 0.2, irritation: 0.15 },
    seconds: pauseSpan(traits),
    spots,
  };
  const place: Place = { id: `pause:${id}`, at: anchor, offers: [offer] };
  const route = router.to(land, at, anchor) ?? [{ x: anchor.x, z: anchor.z }];
  const dice = hash32(seed, `pausespan:${id}:${step}`) / 4_294_967_296;
  return {
    place,
    offer,
    route: [...route],
    seat: 0,
    since: step,
    until: step + Math.round((offer.seconds[0] + dice * (offer.seconds[1] - offer.seconds[0])) * 30),
    there: false,
  };
}

/**
 * El valle más vivo · **Esperar bajo un alero** cuando llueve y no hay nada que
 * hacer. Es `pauseHere` con el sitio elegido: pegado a la pared de una casa, por
 * fuera, donde el tejado vuela. Medido antes, en las semillas 7, 23 y 41 un día
 * de lluvia o tormenta: del 12 al 18 % de quien estaba fuera se quedaba parado
 * en mitad de la calle, mojándose, porque `pauseHere` para donde uno está.
 */
export function shelterUnder(
  eave: Point, from: Point, land: Terrain, router: Router, seed: number, id: number, step: number,
  traits: readonly Trait[] = [],
): Intent {
  const offer: Offer = {
    id: 'shelter', at: eave, reach: 0.5, seats: 1,
    // Lo mismo que da una pausa: estar parado un rato, sin más.
    gives: { rest: 0.2, boredom: 0.2, irritation: 0.15 },
    seconds: pauseSpan(traits),
    spots: [eave],
  };
  const place: Place = { id: `shelter:${id}`, at: eave, offers: [offer] };
  const route = router.to(land, from, eave) ?? [{ x: eave.x, z: eave.z }];
  const dice = hash32(seed, `sheltersp:${id}:${step}`) / 4_294_967_296;
  return {
    place, offer, route: [...route], seat: 0, since: step,
    until: step + Math.round((offer.seconds[0] + dice * (offer.seconds[1] - offer.seconds[0])) * 30),
    there: false,
  };
}
