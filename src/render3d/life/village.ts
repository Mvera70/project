// V-06 · La aldea viva, entera. design.md Anexo E.
//
// Aquí se juntan las seis fases: el reloj de paso fijo (V-01), los cuerpos que
// ocupan sitio (V-02), la navegación (V-03), lo que a cada uno le pide el
// cuerpo (V-04), lo que el mundo ofrece (V-05) y la elección (V-06).
//
// **Un paso de esta función es un instante del valle.** Todo lo que pase en
// pantalla sale de aquí, y nada de aquí sale del reloj de la pared ni escribe
// una coma en `GameState`.

import { homeRoutine, indoors, isNight, stepHome, type HomeRoutine } from './home';
import { statureAt } from '../world/models';
import type { GameState, Trait, VillagerId } from '@engine/state';
import { DAY, FOOD } from '@engine/balance';
import { population } from '@engine/people/demography';
import { opinionOf } from '@engine/people/opinions';
import { ageOf } from '@engine/people/villagers';
import { hash32 } from '@engine/rng';
import {
  blockedAt, fitsCircle, gap, integrate, turnTo, TURN_MIN_SPEED,
  type Body, type Point, type Terrain,
} from './body';
import { meetingPlace, ordersOf, quarrelToday, wolfRaidToday } from './staging';
import { createNeighbourhood, type Neighbourhood } from './grid';
import { drive, resolve, seek, separate } from './steering';
import { clearBetween, createRouter, pathTo, routeAroundBodies, type Router } from './navigate';
import { dayPlans, leisurePlaces, type DayPlan } from './day';
import { canReach, reachableFrom, terrainOf } from './terrain';
import { drift, freshNeeds, type Doing, type Needs } from './needs';
import { doorOf, OFFERS, placesOf, seatAt, seatKey, type Offer, type Place } from './offers';
import { garrisonPlaces, type Manned } from './garrison';
import { commons } from './places';
import {
  decide, failedSeatKey, freshProgress, moveSeat, noProgress, pauseHere, satisfy, PROGRESS_CHECK, RETHINK, SHUN_STEPS,
  type Intent, type ProgressState,
} from './decide';
import {
  alive as sceneAlive, play, playGreet, playQuarrel, playYield, propose, proposeGreet,
  proposeQuarrel, proposeYield, SCENE_COOLDOWN, SCENE_EARSHOT,
  type Greeting, type QuarrelScene, type Scene, type Yielding,
} from './scenes';
import { createCommitmentRegistry, type ActorRef } from './commitments';
import { LIFE_STEP, seedOfDay } from './clock';
import { createBeasts, stepBeasts, WOLF_ALARM_RADIUS, type Beast } from './beasts';
import { createRaiders, raidToday, stepRaider, type Raider } from './raiders';
import { createWolf, stepWolf, WOLF_START_STEP, type Wolf } from './wildlife';
import type { Animal } from '@derive/animals';
import {
  carryAt, drop, findMate, fling, given, LOFT, PLAYED_OUT, propPlaces, PROP_PLACE_PREFIX,
  REST_AFTER_THROW, scatter, settle, take, THROW, THROW_AHEAD, type Prop,
} from './props';

/**
 * Lo que se aguanta yendo a un sitio antes de pensárselo otra vez, en pasos.
 *
 * TUNE: 600, veinte segundos escénicos. Cruzar el valle entero son unos quince,
 * así que esto sólo salta cuando algo ha salido mal: el sitio se llenó mientras
 * se iba, o hay medio pueblo cortando el paso.
 */
const GIVE_UP = 600;

/**
 * A qué distancia se coge un pase sin pasar por `decide`. V-09b.
 *
 * El número lo da el brief tal cual («a menos de dos celdas de ese cuerpo»),
 * no una medida: es el umbral con el que `fling` ya tira —`THROW` manda la
 * pelota a por lo menos varias celdas— así que un receptor que se ha quedado
 * quieto donde estaba cuando se la tiraron cae dentro sin más ajuste.
 */
const CATCH_RANGE = 2;

/** Una persona, entera: cuerpo, cabeza y lo que está haciendo. */
export interface Dweller {
  readonly residence?: HomeRoutine;
  readonly body: Body;
  readonly villager: VillagerId;
  readonly traits: readonly Trait[];
  readonly needs: Needs;
  doing: Intent | null;
  /** En qué paso le toca replantearse la vida. Escalonado, no todos a la vez. */
  rethinkAt: number;
  /**
   * Suelo recorrido desde que empezó a andar, en celdas.
   *
   * Lo que mueve el clip de la zancada (G-04): la animación avanza con el suelo
   * que se pisa, no con el reloj, y por eso los pies no patinan. Se pone a cero
   * al pararse, que es cuando empieza otra caminata.
   */
  travelled: number;
  /** Velocidad realmente recorrida, después de resolver contactos. Sólo presentación. */
  motionSpeed?: number;
  /**
   * Desde dónde se cuenta el recorrido para decidir si la cara sigue al
   * cuerpo. rework.md §3.5.3.
   *
   * No es lo mismo que `travelled`: aquél es la longitud del camino —lo que
   * mueve el clip de andar, y por eso cuenta aunque el cuerpo tiemble sin
   * moverse de sitio— y esto es **desplazamiento neto** desde la última vez
   * que se giró la cara. Un cuerpo apretado contra un muro o contra sus
   * vecinos puede llevar velocidad de sobra y seguir sin alejarse de aquí:
   * eso es lo que distingue andar de la vuelta sobre sí mismo.
   */
  faceAnchor: Point;
  /**
   * Con quién tiene algo ahora mismo, si tiene. V-07.
   *
   * El mismo objeto vive en los dos `Dweller` que participan: no hay copia,
   * hay referencia compartida, que es lo que le deja a `alive()` comprobar por
   * `id` de cuerpo en vez de llevar la cuenta por separado.
   */
  scene: Scene | null;
  /**
   * IA-6: con quién está en la riña real ahora mismo, si está. Campo propio y
   * no una ampliación de `scene`, porque `QuarrelScene` no comparte el
   * `SceneKind` de `chat`/`shove`/`brawl` (`scenes.ts` explica por qué:
   * ensancharlo habría roto pruebas de otras fases que enumeran esos tres por
   * nombre). Opcional por la misma razón que `ageGroup`/`home` — un
   * `Dweller` construido a mano en `tests/journeys/life-scenes.test.ts`, fuera
   * del alcance de esta fase, no lo rellena y no tiene por qué; `undefined` se
   * trata igual que `null`, nadie en una riña.
   */
  quarrel?: QuarrelScene | null | undefined;
  /** Hasta qué paso no le apetece volver a pararse con nadie, tras la última
   *  escena. V-07, ported de `spike/life.ts` (`cooldown`). */
  sceneCooldownUntil: number;
  /**
   * V-09: qué trasto lleva en la mano ahora mismo, si lleva alguno. Id de
   * `Prop`, no de cuerpo.
   *
   * La cabaña (`beasts.ts`, V-08) no coge nada y lo lleva siempre a `null`:
   * mejor un campo obligatorio que nunca cambia que uno opcional que obliga a
   * preguntar `?? null` en cada uso, que es lo que hacía la primera versión.
   */
  holding: number | null;
  /** V-09: a quién apunta mientras espera para tirar lo que lleva. Id de
   *  cuerpo. */
  aimAt: number | null;
  /**
   * V-09b: hasta qué instante escénico no le apetece volver a jugar, tras el
   * último pase. Ported de spike (`playedUntil`, `PLAYED_OUT` en `props.ts`).
   *
   * Obligatorio, como `holding`/`aimAt` (E.3.7 aprendido en la primera
   * versión de V-09: un campo opcional obliga a preguntar `?? 0` en cada
   * lectura). La cabaña (`beasts.ts`) no juega nunca y lo lleva a `0` para
   * siempre.
   */
  playedUntil: number;
  /**
   * Plazas que le fallaron hace poco (`failedSeatKey` → paso hasta el que se
   * descartan). Es la pieza que faltaba para el plazo vencido: ver
   * `Chooser.shunned` en `decide.ts` y la cifra que hay al lado.
   */
  failed: Map<string, number>;
  /**
   * IA-3: si es un crío o un mayor, del brief («los niños juegan cerca de
   * casa; los mayores prefieren pausas próximas»). Sale de `ageOf` (motor,
   * sólo lectura) contra los mismos umbrales que ya usaba el camino viejo
   * (`@engine/balance`, `DAY.CHILD_UNDER`/`DAY.ELDER_OVER`) para lo mismo.
   *
   * Opcional y no obligatorio, a propósito: `tests/journeys/life-scenes.test.ts`
   * construye un `Dweller` a mano y no está entre los ficheros autorizados de
   * esta fase (mismo motivo que `Beast.progress` en IA-1, `decide.ts` §4.2).
   * `undefined` es un adulto, y también lo que sigue siendo cualquier bestia.
   */
  readonly ageGroup?: 'child' | 'elder' | undefined;
  readonly dayPlan?: DayPlan;
  readonly leisure?: readonly Place[];
  /**
   * IA-3: la puerta de su propia casa, si tiene una en pie. Sólo se usa para
   * el tirón de «cerca de casa» de un crío (`decide.ts`, `homePull`).
   * Opcional por la misma razón que `ageGroup`.
   */
  readonly home?: Point | undefined;
}

/**
 * Un pase, para poder medir una cadena. V-09b.
 *
 * `to` es nada cuando se tiró hacia delante por gusto porque no había con
 * quién jugar (`THROW_AHEAD`): eso cuenta como pase pero no puede ser parte
 * de una cadena, porque no hay un segundo cuerpo al que seguirle la pista.
 */
interface PassRecord {
  readonly from: number;
  readonly to: number | null;
  readonly step: number;
}

export interface Village {
  readonly land: Terrain;
  readonly places: readonly Place[];
  readonly dwellers: readonly Dweller[];
  /** La cabaña, V-08: gallinas, cerdos y vacas, con el mismo trato que la gente. */
  readonly beasts: readonly Beast[];
  /** Los trastos de la jornada, V-09: la pelota, el palo, el cubo, el haz de
   *  leña. Repartidos al amanecer con la semilla del día (`scatter`), y como
   *  el resto de esta capa, no sobreviven a la jornada. */
  readonly props: readonly Prop[];
  /** Un paso de vida para todos. */
  step(phase?: number): void;
  /** Cuántos pasos lleva la jornada. */
  readonly steps: number;
  /** Pases de pelota dados en la jornada, V-09: lo que sale de jugar. */
  readonly passes: number;
  /** Haces llevados del árbol a la leñera durante esta jornada. */
  readonly timberDeliveries: number;
  /** Cargas llevadas del pedregal a una obra de piedra durante esta jornada. */
  readonly stoneDeliveries: number;
  /** Cargas llevadas del campo al almacén durante la semana real de cosecha. */
  readonly harvestDeliveries: number;
  /** Cada pase, en orden, con quién lo dio y a quién iba. V-09b: lo que hace
   *  falta para medir una cadena — `passes` sólo da el total. */
  readonly passLog: readonly PassRecord[];
  /**
   * IA-2: la cuenta de interacciones de la jornada (chat, shove, brawl,
   * greet, yield). `completed` es quien llega a su `until` con los dos
   * participantes todavía en la aldea; `invalidated` es quien se cierra
   * porque uno de los dos ha dejado de estar (E.3: dentro de una jornada
   * congelada esto no ocurre hoy, pero el cierre lo distingue igual, por si
   * un día deja de ser cierto). `stuck` tiene que ser siempre cero — es lo
   * que cuenta el `expire()` de emergencia del registro, que sólo encuentra
   * algo si el cierre normal de una interacción ha fallado.
   */
  readonly interactions: {
    readonly started: number;
    readonly completed: number;
    readonly invalidated: number;
    readonly stuck: number;
  };
  /**
   * IA-6: la cuenta de las escenas de historia —hoy sólo la riña, `quarrel`—,
   * las que salen de un hecho real de `state.happenings` y no de un cruce
   * cualquiera. Mismo criterio que `interactions`, aparte para poder demostrar
   * en el informe que lo que se monta viene de un suceso concreto.
   */
  readonly stories: {
    readonly started: number;
    readonly completed: number;
    readonly invalidated: number;
    readonly stuck: number;
    /** El tick del motor en el que ocurrió el suceso que puede disparar una
     *  historia hoy, o nada si esta semana no tiene ninguno de los que esta
     *  fase sabe escenificar. Sirve para comprobar que lo que se cuenta sale
     *  de un hecho real y en qué semana pasó. */
    readonly triggerTick: number | null;
  };
  /**
   * IA-5: el lobo del corral, listo para pintarse — vacío si no hay visita
   * hoy o ya se ha ido. Misma forma que `@derive/animals`' `Animal`, la que
   * ya consume `effects/fauna.ts`, para que el render no necesite un segundo
   * tipo sólo para esto: una fuente en vivo en vez de la fórmula de siempre.
   */
  readonly wildlife: readonly Animal[];
  /**
   * D3 · La partida del valle vecino, si hoy hay una (§1b, fase 4).
   *
   * Vacía casi siempre: sólo la semana que el motor dice que llegaron
   * (`threat.arrivedTick`). No son vecinos —no tienen `VillagerId`, ni casa, ni
   * necesidades— así que van por su lista y no por `dwellers`: quien los dibuja
   * los pinta como forasteros, que es lo que son.
   */
  readonly raiders: readonly Raider[];
  /**
   * C2 · Los puestos del cerco ocupados hoy, con su arma y su puesto (§1b).
   *
   * Vacía casi siempre, por lo mismo que `raiders`: sólo la víspera de un
   * asalto y el día que llegan. Va aquí y no dentro de `dwellers` porque un
   * puesto no es una persona: es un sitio con un arma, y quién está en él lo
   * dice el reparto de la jornada. **Lo que D2 necesita** para saber desde
   * dónde y con qué se dispara sale de esta lista.
   */
  readonly manned: readonly Manned[];
  /**
   * IA-5: la cuenta de la visita del lobo, del mismo tipo que `stories` —
   * episodios, no pasos—: cuántas veces ha aparecido (a lo sumo una por
   * jornada), cuántas ha llegado a notarla de verdad una gallina, cuántas se
   * ha ido en calma y cuántas ha tenido que cortarse por el tope de pasos en
   * vez de terminar sola. Esta última tiene que quedarse en cero: los topes
   * de `wildlife.ts` están medidos con margen para que la visita siempre
   * quepa dentro de la noche.
   */
  readonly threats: {
    readonly appeared: number;
    readonly noticed: number;
    readonly recovered: number;
    readonly stuck: number;
    readonly triggerTick: number | null;
  };
  /** Qué está haciendo la aldea ahora, para poder contarlo. */
  tally(): Record<string, number>;
}

/**
 * Monta la aldea de una jornada sobre el estado del motor.
 *
 * El estado llega **congelado** (§D.6.7): lo que el motor decida durante el día
 * entra mañana. Aquí no se lee nada que pueda cambiar a media jornada.
 */
/**
 * Lo que una jornada puede llevar además de la gente y la cabaña.
 *
 * `props` son los trastos de V-09 —la pelota, el palo, el cubo, el haz—, y
 * **en el juego van apagados** (15 sep 2026). Eran el descarte de físicas de
 * `spike/life.ts` portado tal cual, y el dueño del diseño lo dijo sin rodeos:
 * «esas pelotas eran de prueba, ahora mismo no tiene ningún sentido que haya
 * pelotas por ahí, además están atravesando el suelo». Tenía razón en las dos
 * cosas. La maquinaria se queda —se prueba con esta opción encendida— por si
 * algún día un trasto tiene sentido en su sitio: un cubo junto al pozo, un haz
 * junto a la leñera. Repartidos por el prado, no.
 */
export interface DayOptions {
  readonly props?: boolean;
  readonly land?: Terrain;
}

/**
 * La referencia de un `Dweller` para el registro de compromisos (IA-2,
 * `commitments.ts`). No hay campo nuevo que leer: `villager < 0` es ya la
 * marca que distingue a un animal de una persona (`beasts.ts`,
 * `villager: -1 - id`), así que esto no inventa nada, sólo lo traduce a
 * `ActorRef`.
 */
function actorOf(dweller: Dweller): ActorRef {
  return { kind: dweller.villager < 0 ? 'beast' : 'villager', id: dweller.body.id };
}

/**
 * El id con el que una escena de dos (`scenes.ts`, chat/shove/brawl) vive en
 * el registro de compromisos.
 *
 * Determinista de lo que la propia `Scene` ya guarda —los dos ids de cuerpo,
 * ordenados, y el paso en que nació—, así que no hace falta guardar nada más
 * en `Scene` para poder liberarla por este camino.
 */
function sceneCommitmentId(scene: Scene): string {
  return `scene:${Math.min(scene.a, scene.b)}:${Math.max(scene.a, scene.b)}:${scene.since}`;
}

/**
 * Lo que le toca a un cuerpo cuyo movimiento no gobierna `village.ts` este
 * paso —está en una escena, o cediendo el paso— salvo integrar la velocidad
 * que ya se le ha puesto y seguir sintiendo la jornada: sed, cansancio,
 * compañía.
 *
 * IA-2: antes esto estaba escrito una sola vez, dentro de la rama de
 * `dweller.scene !== null`; con la cesión de paso hacía falta la misma
 * media docena de líneas una segunda vez, y es justo la clase de bloque
 * duplicado que el brief pide dejar de escribir a mano.
 */
function settleHeldBody(dweller: Dweller, land: Terrain, around: Neighbourhood, hunger: number): void {
  const { body } = dweller;
  integrate(body, land, LIFE_STEP);
  const speed = Math.hypot(body.vx, body.vz);
  if (speed > 0.05) dweller.travelled += speed * LIFE_STEP;
  dweller.faceAnchor = { x: body.x, z: body.z };
  let company = false;
  around.near(body, (other) => {
    if (!company && Math.hypot(other.x - body.x, other.z - body.z) < 2.2) company = true;
  });
  drift(dweller.needs, dweller.traits, {
    moving: speed > 0.25, withOthers: company, working: false, hunger,
  }, LIFE_STEP);
}

/**
 * Cuánto más tarda en volver a tener ganas de pararse un `hot_tempered` o un
 * `spiteful`, tras un encontronazo (`shove`/`brawl`, nunca un `chat`).
 *
 * IA-3, «tensión más rápido, sin peleas constantes»: `needs.ts` ya hace que a
 * estos dos les suba la irritación más deprisa (`TEMPER.irritation`, ×3 y
 * ×1,8), y eso es lo que dispara el encontronazo en `scenes.ts` — sin tocar
 * ese fichero, que es de otra fase. Lo que sí es de aquí es que no encadenen
 * uno detrás de otro: un enfriamiento más largo tras el empujón hace que la
 * misma persona no vuelva a saltar con el primero que se cruce dos segundos
 * después. Un `chat` no se alarga: hablar no necesita el mismo respiro que un
 * empujón.
 *
 * TUNE: 1,6. Con 1 (sin cambio) la tabla de esta ronda mostraba a
 * `hot_tempered` encadenando `shove` tras `shove` en la misma jornada más a
 * menudo que el resto — ver la tabla de estabilidad del informe. Por encima
 * de 2 el enfriamiento empezaba a notarse como una pausa forzada más que
 * como carácter.
 */
const FIERY_COOLDOWN_MULT = 1.6;

function fieryCooldown(dweller: Dweller, scene: Scene): number {
  const fiery = scene.kind !== 'chat'
    && (dweller.traits.includes('hot_tempered') || dweller.traits.includes('spiteful'));
  return SCENE_COOLDOWN * (fiery ? FIERY_COOLDOWN_MULT : 1);
}

/**
 * Cierra la parte de una escena que le toca a uno de los dos, si es que
 * sigue siendo suya.
 *
 * IA-2: la única función de liberación para chat/shove/brawl, llamada desde
 * el único sitio de `village.ts` que cierra escenas — antes eran dos bloques
 * `if` casi iguales, escritos a mano, uno por participante (`IA-0.md` §2).
 * `dweller.scene !== scene` de guarda es lo que hace esto seguro de llamar
 * con alguien que ya no está, o que ya ha entrado en otra cosa.
 */
function closeScene(dweller: Dweller | undefined, scene: Scene, steps: number): void {
  if (dweller === undefined || dweller.scene !== scene) return;
  dweller.scene = null;
  dweller.sceneCooldownUntil = steps + Math.round(fieryCooldown(dweller, scene) / LIFE_STEP);
  dweller.rethinkAt = steps;
}

/** Un saludo de paso, vivo, con el id que lo guarda en el registro. IA-2. */
interface ActiveGreet { readonly id: string; readonly greeting: Greeting }
/** Una cesión de paso, viva, con el id que la guarda en el registro. IA-2. */
interface ActiveYield { readonly id: string; readonly yielding: Yielding }
/** La riña de la plaza, viva, con el id que la guarda en el registro. IA-6.
 *  A lo sumo una por jornada (`quarrelStaged`), así que basta con un valor
 *  nulable y no una lista. */
interface ActiveQuarrel { readonly id: string; readonly scene: QuarrelScene }

export function createVillage(state: GameState, day: number, options: DayOptions = {}): Village {
  const land = options.land ?? terrainOf(state);
  const seed = seedOfDay(state.seed, day);
  // IA-6 · La riña de la plaza (§7.10, `docs/rework.md` §4 R-2 punto 1): si el
  // motor tiró `quarrel_in_the_square` esta semana, éstos son los dos `id` de
  // verdad — nunca una pareja que esta capa se invente. `null` si esta semana
  // no hubo ninguno, o si el suceso no llegó a tener dos nombrados vivos
  // (`worstPair` en `fate.ts` puede devolver nada).
  const quarrelPair = quarrelToday(state);
  // V-11 · **Y lo que el motor haya ordenado para hoy manda sobre todo esto.**
  //
  // Si una decisión del jugador convocó a la aldea (§11.8), el sitio de la
  // reunión **sustituye** a los destinos del día en vez de competir con ellos, y
  // eso es deliberado: es lo que hacía el camino viejo que G-12 apagó —«el día
  // que había reunión, nadie iba al tajo y todos compartían destino»— y es lo
  // único que cumple el principio 1 del juego, que toda opción de encrucijada
  // cambie algo en pantalla. Compitiendo no se cumple: medido en la prueba de
  // V-11, con la reunión como una oferta más el más lejano se quedaba a más de
  // tres celdas y la mitad de la aldea seguía en sus campos.
  //
  // Lo que sí sigue en pie es el cuerpo: la cabaña y los trastos entran en la
  // lista igual que siempre (más abajo), porque un animal que pasa por delante
  // no deja de estar ahí porque haya reunión. Y si el sitio de la reunión no
  // admite a nadie —agua, roca— no se sustituye nada: mejor la jornada de
  // siempre que una aldea sin ningún sitio adonde ir.
  const places = [...placesOf(state, land), ...commons(state, land)];
  const around: Neighbourhood = createNeighbourhood(land.width, land.height);
  const router: Router = createRouter();

  // El hambre de la aldea, que agria a todo el mundo (§7.9). Se lee una vez: es
  // del tick, y el tick no cambia dentro de una jornada.
  const people = Math.max(1, population(state));
  const weeks = state.village.grain / (people * FOOD.GRAIN_PER_PERSON);
  const hunger = Math.max(0, Math.min(1, 1 - weeks / 12));

  // Quién vive aquí. Sólo los que están y sólo donde se puede estar: alguien al
  // otro lado del río no tiene nada que hacer en esta orilla, y el río no se
  // cruza (ver `terrain.ts`).
  const dwellers: Dweller[] = [];
  // El corazón es el sitio con más vecinos a mano, no el primero de la lista:
  // el primero puede caer al otro lado del río y entonces «esta orilla» sería
  // la que no tiene pueblo.
  let heart = places[0]?.at ?? { x: land.width / 2, z: land.height / 2 };
  let most = -1;
  const evaluated = new Uint8Array(land.width * land.height);
  for (const place of places) {
    const cell = Math.floor(place.at.z) * land.width + Math.floor(place.at.x);
    if (evaluated[cell] === 1 || blockedAt(land, place.at.x, place.at.z)) continue;
    const region = reachableFrom(land, place.at);
    for (let i = 0; i < region.length; i += 1) if (region[i] === 1) evaluated[i] = 1;
    // La proximidad geométrica no basta: dos plazas a un metro pueden estar
    // separadas por una pared. Se elige la región con más destinos alcanzables.
    const near = places.filter(other => canReach(land, region, other.at)).length;
    if (near > most) { most = near; heart = place.at; }
  }
  const shore = reachableFrom(land, heart);
  // C2 · **Los puestos del cerco, si hoy hay alerta.** Entran en la lista de
  // sitios como uno más —eso es todo lo que hace falta para que el reparto de la
  // jornada los ocupe (`day.ts`)— y sólo existen la víspera de un asalto y el
  // día que llegan, porque `garrisonOf` sólo los da entonces. Van después del
  // corazón a propósito: el corazón se calcula con los sitios de la aldea, y una
  // guardia en la muralla no es un sitio donde viva nadie.
  const manned = garrisonPlaces(state, land, heart, shore);
  places.push(...manned.map((post) => post.place));
  // **Y sólo cuentan los sitios de esta orilla.** El río no se cruza, así que un
  // sitio del otro lado no es un sitio para esta gente: dejar a alguien allí era
  // condenarle a andar sin llegar nunca, y se veía — medido, hasta el 83 % de la
  // jornada en tránsito en las semillas donde el pueblo queda partido.
  //
  // V-08: la cabaña se crea aquí, no antes, porque su ancla (`doorOf`, junto a
  // casa o campo) no depende de `mine` pero lo que ofrece a la gente —`pet`,
  // `chase`, `feed`— sí entra en la misma lista que el resto de sitios: para
  // `decide()` un animal cerca no es distinto de un pozo cerca.
  const beasts = createBeasts(state, land, heart, seed, shore);
  // IA-5 · El lobo del corral (§7.10, `wolves_at_the_coop`): si el motor lo
  // soltó esta semana (`wolfRaidToday`, `staging.ts`), hay visita esta
  // jornada, guionizada en `wildlife.ts`. El corral es el ancla de la primera
  // gallina que haya —determinista, es la primera que crea `createBeasts`—, o
  // el corazón de la aldea si el suceso se llevó ya a todas: el lobo sigue
  // teniendo sentido narrativo aunque no quede ninguna a la que asustar.
  const wolfRaid = wolfRaidToday(state);
  const henAnchor = beasts.find((beast) => beast.kind === 'hen')?.anchor ?? heart;
  // V-11 · **Y cuando hay reunión, la reunión es lo único que se ofrece.**
  //
  // Medido, porque mi primera versión sólo sustituía los sitios del valle y
  // dejaba la cabaña en la lista: de veinticuatro personas, **veinticuatro se
  // fueron con los animales** y una a por un trasto. Ninguna a la reunión. Una
  // oferta que da compañía entera a once celdas pierde contra una gallina que
  // da un tercio a una celda, y así es como tiene que ser el resto del año.
  //
  // Lo que §11.8 pide no es que la reunión compita: es que la aldea esté ahí.
  // Así que ese día la lista es la reunión, igual que en el camino que G-12
  // apagó —«nadie iba al tajo y todos compartían destino»—. Los animales y los
  // trastos siguen en el valle, con su cuerpo y su deriva; lo que no hacen es
  // ofrecer nada mientras la aldea está convocada.
  //
  // Y **el sitio de la reunión tiene que estar en esta orilla**, como cualquier
  // otro sitio: una reunión al otro lado del río es una orden que no se puede
  // cumplir, y dejar la lista vacía por obedecerla fue mi segundo error —
  // medido: veintitrés personas con `doing: null` toda la jornada, plantadas
  // donde nacieron—. Si no se puede llegar, la jornada es la de siempre.
  // B-1 · **y el corro se busca con la orilla en la mano**, no después. Esto
  // filtraba reuniones ya colocadas, y colocarlas sin saber qué suelo es
  // alcanzable las ponía en bolsas cerradas: con la aldea densa que trae el
  // ritmo nuevo, la reunión de la capilla caía en un patio al que llegaban dos
  // casas de seis y se descartaba entera (semilla 7, cero de veinticinco).
  // Dándole la orilla, `meetingPlace` mueve el punto a la celda alcanzable más
  // cercana y descarta las plazas de otra bolsa; si de verdad no hay ninguna,
  // sigue devolviendo nada y la jornada es la de siempre.
  const summons = ordersOf(state)
    .map((order, index) => meetingPlace(order, land, index, shore))
    .filter((place): place is Place => place !== null);
  /** Si el motor ha convocado a la aldea hoy y hay dónde reunirse. */
  const summoned = summons.length > 0;
  // C2 · **y el cerco va en las dos ramas.** Una reunión sustituye los sitios de
  // la aldea a propósito (arriba), pero una guardia no es un sitio al que se va
  // por gusto: si el motor convocó a la aldea la misma semana que baja el clan,
  // la reunión es de los que no están en la muralla. Sin esto, los puestos se
  // caían de la lista que reparte la jornada y **nadie subía** — medido en la
  // semilla 11: siete puestos con sitio y cero asignados.
  const mine = summoned
    ? [...summons, ...manned.map((post) => post.place)]
    : [
      ...places,
      ...beasts.map((beast) => beast.gift),
    ];

  // V-09: los trastos de la jornada, anclados a puertas de verdad y por tanto
  // ya en la orilla que se usa (`scatter`, `props.ts`). `propsById` es cómo
  // `village.ts` vuelve de «qué trasto lleva éste» (un id) al trasto mismo.
  // Los trastos de V-09 siguen apagados (`DayOptions.props`), y lo que el
  // jugador dio va siempre: es una cosa con sitio y no una pelota en el prado
  // (M-3, ver `given` en `props.ts`).
  const loose: Prop[] = options.props === true ? scatter(state, land, seed) : [];
  const props: Prop[] = [...loose, ...given(state, land, loose.length)];
  const propsById = new Map(props.map((prop) => [prop.id, prop]));

  const alive = state.people.villagers.filter((v) => v.diedTick === null && v.leftTick === null);
  alive.forEach((villager, n) => {
    // Se le deja junto a un sitio de la aldea, repartidos.
    const homeBuilding = villager.homeId === null ? undefined
      : state.buildings.find((b) => b.id === villager.homeId && b.lostTick === null);
    const residence = homeBuilding === undefined ? undefined : homeRoutine(homeBuilding, land);
    // Cada habitante nace en el lado de su casa, no en un patio elegido para
    // todo el pueblo. Las decisiones descartan después las rutas imposibles.
    const offered = Array.from({ length: mine.length }, (_, offset) =>
      mine[(n + offset) % Math.max(1, mine.length)]?.at)
      .find((at): at is Point => at !== undefined && fitsCircle(land, at.x, at.z, 0.32));
    const spot = residence !== undefined && fitsCircle(land, residence.approach.x, residence.approach.z, 0.32)
      ? residence.approach : offered ?? heart;
    const personalShore = reachableFrom(land, spot);
    // **El sitio de partida, si los cuarenta anillos fallan, ya no es el punto
    // exacto del sitio.** Era `spot` a secas, y eso es un montón: dos personas
    // cuyos anillos fallan los dos nacen en **la misma coordenada exacta**, que
    // es el único solape que el separador de `steering.ts` no podía deshacer
    // —el vector que separa dos puntos iguales es cero—. Con el mapa grande
    // pasó de raro a visible. El sorteo sale de `hash32` y de la persona, así
    // que dos máquinas colocan la misma aldea igual (§4.3).
    const scatterAngle = (hash32(seed, `spawn:${villager.id}`) / 4_294_967_296) * Math.PI * 2;
    let x = spot.x + Math.cos(scatterAngle) * 0.45;
    let z = spot.z + Math.sin(scatterAngle) * 0.45;
    if (!fitsCircle(land, x, z, 0.32)) { x = spot.x; z = spot.z; }
    for (let ring = 0; ring < 40; ring += 1) {
      const angle = ring * 2.39996;
      const reach = 0.6 + ring * 0.35;
      const tryX = spot.x + Math.sin(angle) * reach;
      const tryZ = spot.z + Math.cos(angle) * reach;
      if (tryX <= 1 || tryZ <= 1 || tryX >= land.width - 1 || tryZ >= land.height - 1) continue;
      if (!canReach(land, personalShore, { x: tryX, z: tryZ }) || !fitsCircle(land, tryX, tryZ, 0.32)) continue;
      // **Y las bestias también ocupan sitio.** Esto miraba sólo a la gente, y
      // la cabaña se crea antes (V-08), así que alguien podía nacer **encima**
      // de una vaca. Dos cuerpos en el mismo punto exacto son el único caso que
      // el separador no puede arreglar: empuja a lo largo del vector que los
      // separa, y ese vector es cero. Medido con el mapa grande: la bestia
      // 10039 y la persona 52 en 23,03 / 67,13, las dos, seiscientos pasos
      // después de empezar ahí.
      if (dwellers.some((d) => Math.hypot(d.body.x - tryX, d.body.z - tryZ) < 0.8)) continue;
      if (beasts.some((b) => Math.hypot(b.dweller.body.x - tryX, b.dweller.body.z - tryZ) < 0.8)) continue;
      x = tryX; z = tryZ; break;
    }
    const pace = 1.05 + (hash32(seed, `pace:${villager.id}`) / 4_294_967_296) * 0.6;
    // IA-3: la edad es del motor, sólo lectura (`ageOf`), y aquí se convierte
    // en categoría de una vez por jornada — no en cada paso de `decide()` — con
    // los mismos umbrales que ya usaba el camino que G-12 apagó
    // (`@engine/balance`, `DAY.CHILD_UNDER`/`DAY.ELDER_OVER`).
    const age = ageOf(villager, state.tick);
    const ageGroup: 'child' | 'elder' | undefined = age < DAY.CHILD_UNDER ? 'child'
      : age > DAY.ELDER_OVER ? 'elder' : undefined;
    // Y la puerta de su casa, si tiene una en pie: falta si nunca se le asignó
    // una o si se perdió (`lostTick`), y entonces el tirón de «cerca de casa»
    // (`decide.ts`, `homePull`) simplemente no pesa nada.
    const home = homeBuilding === undefined ? undefined
      : doorOf(land, homeBuilding.x, homeBuilding.y, homeBuilding.w, homeBuilding.h) ?? undefined;
    dwellers.push({
      // TUNE: el GLB adulto mide 0,35 celdas de ancho; 0,19 incluye brazos
      // y un margen pequeño. Los 0,32 siguen protegiendo la ruta de fachadas.
      body: { id: n, x, z, vx: 0, vz: 0, facing: 0, radius: 0.32,
        contactRadius: 0.19 * statureAt(age), pace },
      villager: villager.id,
      traits: villager.traits,
      needs: freshNeeds(),
      doing: null,
      travelled: 0,
      faceAnchor: { x, z },
      scene: null,
      quarrel: null,
      sceneCooldownUntil: 0,
      holding: null,
      aimAt: null,
      playedUntil: 0,
      failed: new Map(),
      ageGroup,
      leisure: leisurePlaces(land, residence?.approach ?? spot, ageGroup === 'child', villager.id, ageGroup === 'elder'),
      home,
      ...(residence === undefined ? {} : { residence }),
      // Escalonados: si todos se replantean la vida en el mismo paso, la aldea
      // entera cambia de idea a la vez y se ve el mecanismo.
      rethinkAt: Math.floor((hash32(seed, `think:${villager.id}`) / 4_294_967_296) * RETHINK),
    });
  });

  // V-08: la cabaña colisiona con la gente y con ella misma — la misma rejilla
  // y la misma `resolve()`, así que un niño y una gallina se apartan el uno del
  // otro exactamente como se apartarían dos personas.
  const bodies = [...dwellers.map((d) => d.body), ...beasts.map((b) => b.dweller.body)];
  const plans = dayPlans(state, mine, land, new Map(dwellers.map(d => [d.villager, d.body])), day);
  dwellers.forEach((dweller, index) => { dwellers[index] = { ...dweller, dayPlan: plans.get(dweller.villager)! }; });
  const byId = new Map(dwellers.map((d) => [d.body.id, d]));

  // Checklist IA-1, punto 6: lo que `noProgress()` (`decide.ts`) necesita
  // recordar por persona para medir si un viaje avanza. Fuera de `Dweller` a
  // propósito — ver el comentario de `ProgressState` en `decide.ts` — así que
  // vive aquí, un `ProgressState` por cuerpo, poblado una vez por jornada.
  const progress = new Map<number, ProgressState>(dwellers.map((d) => [d.body.id, freshProgress()]));
  // Las escenas vivas ahora mismo. Un mismo objeto lo referencian los dos
  // `Dweller` que participan (ver `Dweller.scene`); esta lista es sólo para no
  // tener que recorrer a toda la aldea buscando quién está en una.
  let scenes: Scene[] = [];
  // IA-2: el registro común de compromisos (`commitments.ts`) y las dos
  // interacciones nuevas que lo usan de principio a fin. `scenes` (arriba)
  // sigue siendo quien mueve los cuerpos de un chat/empujón/pelea; esto es
  // quién puede empezar algo con quién, y hasta cuándo — de personas, y de
  // bestias el día que las haya (IA-4).
  const commitments = createCommitmentRegistry();
  let greetings: ActiveGreet[] = [];
  let yieldings: ActiveYield[] = [];
  // IA-6: la riña real, si se ha llegado a montar hoy. Ver `ActiveQuarrel`.
  let activeQuarrel: ActiveQuarrel | null = null;
  // La cuenta de esta fase, para el informe: cuántas interacciones nuevas
  // (chat/shove/brawl/greet/yield) han empezado, cuántas han llegado a su
  // final natural, cuántas se han invalidado (nunca llegan a `there`/`act`
  // por falta de ruta o de hueco) y cuántas ha tenido que barrer el `expire`
  // de emergencia en vez de su propio cierre — que tiene que quedarse en
  // cero, porque si no es cero es que algo se ha quedado colgado.
  let interactionsStarted = 0;
  let interactionsCompleted = 0;
  let interactionsInvalidated = 0;
  let interactionsStuck = 0;
  // IA-6: la misma cuenta, pero sólo de las escenas de historia (`quarrel`
  // hoy). `quarrelStaged` es lo que evita escenificar la misma riña real una y
  // otra vez cada vez que los dos se cruzan en la jornada — el hecho pasó una
  // vez esta semana en el motor, no cada pocos pasos en pantalla.
  let quarrelStaged = false;
  let storiesStarted = 0;
  let storiesCompleted = 0;
  let storiesInvalidated = 0;
  let storiesStuck = 0;
  // IA-5: el lobo del corral, si lo hay hoy. Uno solo (`wolfSpawned` evita
  // que se cree una segunda vez la misma jornada una vez que la primera ya se
  // ha ido), y sus cuatro cuentas — amenaza, aviso, calma, forzada — son el
  // mismo tipo de prueba que `stories` de más arriba: episodios por visita,
  // no pasos.
  // D3 · la partida, si el motor dice que llegó esta semana. Se monta una vez
  // al abrir la jornada, como los animales: no se sortea cada paso.
  const bandSize = raidToday(state);
  const raiders: Raider[] = bandSize === 0
    ? []
    : createRaiders(state, land, heart, seed, 0, bandSize);
  let wolf: Wolf | null = null;
  let wolfSpawned = false;
  let wolfNoticedThisVisit = false;
  let wildlifeThreats = 0;
  let wildlifeNoticed = 0;
  let wildlifeRecovered = 0;
  let wildlifeStuck = 0;
  let steps = 0;
  // V-09: pases de pelota dados en la jornada. Contados igual que en
  // `spike/life.ts` (`world.passes += 1`): cualquier tirada de una pelota a
  // alguien cuenta, aunque no haya nadie a quien apuntar y se tire hacia
  // delante por gusto (`finishHolding`, más abajo).
  let passes = 0;
  let timberDeliveries = 0;
  let stoneDeliveries = 0;
  let harvestDeliveries = 0;
  // V-09b: el registro de cada pase, para poder medir una cadena — `passes`
  // por sí solo no dice quién se la pasó a quién.
  const passLog: PassRecord[] = [];

  /**
   * Cuánta gente y cuánta cabaña hay en cada oferta ahora mismo.
   *
   * Checklist IA-1, punto 3: **el aforo se comparte entre personas y
   * animales**, así que la cuenta también — la misma que `village.ts` ya
   * hacía sólo para `dwellers` ahora suma también `beasts`, y el mapa que
   * sale de aquí es el que `stepBeasts()` recibe más abajo, en vez de
   * construirse el suyo propio siempre vacío.
   */
  function seats(): Map<string, number> {
    const taken = new Map<string, number>();
    for (const dweller of dwellers) {
      if (dweller.doing === null) continue;
      const key = seatKey(dweller.doing.place, dweller.doing.offer);
      taken.set(key, (taken.get(key) ?? 0) + 1);
    }
    for (const beast of beasts) {
      if (beast.dweller.doing === null) continue;
      const key = seatKey(beast.dweller.doing.place, beast.dweller.doing.offer);
      taken.set(key, (taken.get(key) ?? 0) + 1);
    }
    return taken;
  }

  return {
    land,
    places: mine,
    dwellers,
    beasts,
    props,
    get steps(): number { return steps; },
    get passes(): number { return passes; },
    get timberDeliveries(): number { return timberDeliveries; },
    get stoneDeliveries(): number { return stoneDeliveries; },
    get harvestDeliveries(): number { return harvestDeliveries; },
    get passLog(): readonly PassRecord[] { return passLog; },
    get interactions() {
      return {
        started: interactionsStarted,
        completed: interactionsCompleted,
        invalidated: interactionsInvalidated,
        stuck: interactionsStuck,
      };
    },

    get stories() {
      return {
        started: storiesStarted,
        completed: storiesCompleted,
        invalidated: storiesInvalidated,
        stuck: storiesStuck,
        triggerTick: quarrelPair === null ? null : state.tick,
      };
    },

    get raiders(): readonly Raider[] { return raiders; },

    get manned(): readonly Manned[] { return manned; },

    get wildlife(): readonly Animal[] {
      return wolf !== null && wolf.phase !== 'gone'
        ? [{ id: wolf.body.id, kind: 'wolf', x: wolf.body.x, y: wolf.body.z }]
        : [];
    },

    get threats() {
      return {
        appeared: wildlifeThreats,
        noticed: wildlifeNoticed,
        recovered: wildlifeRecovered,
        stuck: wildlifeStuck,
        triggerTick: wolfRaid ? state.tick : null,
      };
    },

    tally(): Record<string, number> {
      const count: Record<string, number> = {};
      for (const dweller of dwellers) {
        const what = dweller.doing === null ? 'nada'
          : dweller.doing.there ? dweller.doing.offer.id : 'andando';
        count[what] = (count[what] ?? 0) + 1;
      }
      return count;
    },

    step(phase = 0.45): void {
      const now = steps * LIFE_STEP;
      const starts = dwellers.map(d => ({ x: d.body.x, z: d.body.z, travelled: d.travelled }));
      const outside = (): Body[] => bodies.filter(body => { const person = byId.get(body.id); return person === undefined || !indoors(person); });
      const taken = seats();
      // Se va actualizando conforme la gente decide: ver el comentario de abajo.
      around.rebuild(outside());

      // V-09: los trastos sueltos ahora mismo, como opciones más para decidir
      // — se rehace cada paso porque un trasto deja de ofrecer nada en cuanto
      // alguien lo coge, cosa que un edificio nunca hace (`propPlaces`,
      // `props.ts`). Compartido entre todos: lo que cambia persona a persona
      // (V-09b, `PLAYED_OUT`) se filtra más abajo, al llamar a `decide` por
      // cada uno — no aquí, que es de todos, y no dentro de `decide`, que no
      // puede saber quién pregunta (E.4).
      const propOptions = props.length === 0 ? [] : propPlaces(props, now, land);

      // 0 · Vivir las escenas que ya estaban en marcha. V-07.
      //
      //    Antes que nada, porque lo que una escena decida esta vez —colocar,
      //    empujar, hacer trastabillar— es lo que el resto del paso tiene que
      //    respetar para esos dos cuerpos: ninguno de los dos vuelve a pasar
      //    por el `want`/`push`/`wall`/`drive` normal más abajo.
      //
      //    Cerrarla no puede dejar a nadie atrapado: si el paso ya pasó de
      //    `until`, o si uno de los dos ha dejado de estar en la aldea —se
      //    murió, se fue— se suelta a quien quede, con su enfriamiento, y
      //    sigue su vida en el mismo paso.
      const done: Scene[] = [];
      for (const scene of scenes) {
        const dwA = byId.get(scene.a);
        const dwB = byId.get(scene.b);
        const sceneInvalid = dwA === undefined || dwB === undefined || !sceneAlive(scene, dwellers);
        if (sceneInvalid || steps >= scene.until) {
          closeScene(dwA, scene, steps);
          closeScene(dwB, scene, steps);
          commitments.release(sceneCommitmentId(scene));
          if (sceneInvalid) interactionsInvalidated += 1; else interactionsCompleted += 1;
          done.push(scene);
          continue;
        }
        play(scene, dwA, dwB, steps);
      }
      if (done.length > 0) scenes = scenes.filter((scene) => !done.includes(scene));

      // 0b · IA-2 · Cerrar las cesiones de paso que ya han cumplido su plazo
      //      —el paso a un lado más su cola de recuperación— y las que ya no
      //      tienen a los dos participantes.
      const doneYields: string[] = [];
      for (const active of yieldings) {
        const yielder = byId.get(active.yielding.yielder);
        const passer = byId.get(active.yielding.passer);
        const yieldInvalid = yielder === undefined || passer === undefined;
        if (yieldInvalid || steps >= active.yielding.until) {
          commitments.release(active.id);
          if (yielder !== undefined) {
            yielder.sceneCooldownUntil = steps + Math.round(SCENE_COOLDOWN / LIFE_STEP);
          }
          if (passer !== undefined) {
            passer.sceneCooldownUntil = steps + Math.round(SCENE_COOLDOWN / LIFE_STEP);
          }
          if (yieldInvalid) interactionsInvalidated += 1; else interactionsCompleted += 1;
          doneYields.push(active.id);
        }
      }
      if (doneYields.length > 0) yieldings = yieldings.filter((y) => !doneYields.includes(y.id));
      // Consultado por cuerpo dentro del bucle principal, más abajo: quien
      // cede tiene su movimiento gobernado por `playYield` mientras dure el
      // paso a un lado (`actUntil`), y el resto de la cesión es sólo cola de
      // enfriamiento — el `seek`/`separate`/`avoid` normal ya lo trae de
      // vuelta a lo suyo.
      const yieldingByYielder = new Map(yieldings.map((active) => [active.yielding.yielder, active]));

      // 0c · IA-2 · Cerrar los saludos que ya han durado lo suyo.
      const doneGreets: string[] = [];
      for (const active of greetings) {
        const a = byId.get(active.greeting.a);
        const b = byId.get(active.greeting.b);
        const greetInvalid = a === undefined || b === undefined;
        if (greetInvalid || steps >= active.greeting.until) {
          commitments.release(active.id);
          if (a !== undefined) a.sceneCooldownUntil = steps + Math.round(SCENE_COOLDOWN / LIFE_STEP);
          if (b !== undefined) b.sceneCooldownUntil = steps + Math.round(SCENE_COOLDOWN / LIFE_STEP);
          if (greetInvalid) interactionsInvalidated += 1; else interactionsCompleted += 1;
          doneGreets.push(active.id);
        }
      }
      if (doneGreets.length > 0) greetings = greetings.filter((g) => !doneGreets.includes(g.id));

      // 0d · IA-6 · Vivir y cerrar la riña real, si hay una montada hoy.
      //
      //      Mismo trato que las escenas de `scenes` (arriba): se vive antes
      //      de que nadie más decida nada este paso, y se cierra —liberando
      //      compromiso y actor— en cuanto pasa de `until` o le falta uno de
      //      los dos. A lo sumo una a la vez, así que no hace falta un array.
      if (activeQuarrel !== null) {
        const dwA = byId.get(activeQuarrel.scene.a);
        const dwB = byId.get(activeQuarrel.scene.b);
        const quarrelInvalid = dwA === undefined || dwB === undefined;
        if (quarrelInvalid || steps >= activeQuarrel.scene.until) {
          commitments.release(activeQuarrel.id);
          if (dwA !== undefined && dwA.quarrel === activeQuarrel.scene) {
            dwA.quarrel = null;
            dwA.sceneCooldownUntil = steps + Math.round(SCENE_COOLDOWN / LIFE_STEP);
            dwA.rethinkAt = steps;
          }
          if (dwB !== undefined && dwB.quarrel === activeQuarrel.scene) {
            dwB.quarrel = null;
            dwB.sceneCooldownUntil = steps + Math.round(SCENE_COOLDOWN / LIFE_STEP);
            dwB.rethinkAt = steps;
          }
          if (quarrelInvalid) storiesInvalidated += 1; else storiesCompleted += 1;
          activeQuarrel = null;
        } else {
          playQuarrel(activeQuarrel.scene, dwA, dwB, steps);
        }
      }

      // **Red de seguridad, no cierre normal**: todo lo de arriba ya libera lo
      // suyo por su propio `until`/`expiresAtStep`, así que esto no debería
      // encontrar nunca nada — si encuentra algo, es que un cierre se ha
      // saltado su compromiso, y `interactionsStuck` (expuesto en
      // `tally`/`interactions`) es la cifra que lo delata.
      // **Sólo lo que esta red cierra**, o sea los compromisos entre personas
      // (consolidación de IA-4). Desde que el registro es uno solo, dentro
      // viven también las reacciones de los animales, y ésas las suelta
      // `stepBeasts`, que corre **después** de este contador en el mismo paso:
      // contarlas aquí marcaba como colgada una reserva que se soltaba un
      // instante después. Medido: una por jornada en la semilla 7, y la prueba
      // que exige cero tenía razón en exigirlo.
      interactionsStuck += commitments.entries().filter((entry) => entry.expiresAtStep <= steps
        && entry.participants.every((who) => who.kind === 'villager')).length;
      // IA-6: la misma red de seguridad, contada aparte para las historias.
      storiesStuck += commitments.entries().filter((entry) => entry.expiresAtStep <= steps
        && entry.kind === 'quarrel').length;
      commitments.expire(steps);

      for (const dweller of dwellers) {
        const { body } = dweller;

        // Quien está en una escena ya ha recibido su velocidad de `play`: sólo
        // falta integrarla —**nunca se escribe `x`/`z` a mano**, es el mismo
        // `integrate` de `body.ts` el que la mueve, chocando con lo que haya— y
        // contar el suelo que eso pisa, para que el clip de andar no patine si
        // el encuentro incluye un traspié. No se replantea la vida mientras
        // dura: es quien decide dejar de andar un momento, no quien decide su
        // día entero.
        if (dweller.scene !== null) {
          integrate(body, land, LIFE_STEP);
          // La cara la gobierna `play()` mientras dura la escena (no el
          // umbral normal de más abajo): se resincroniza el ancla para que al
          // volver a la vida normal el primer recorrido se cuente desde aquí,
          // no desde dondequiera que estuviera antes de pararse a hablar —
          // `settleHeldBody` ya hace exactamente eso.
          settleHeldBody(dweller, land, around, hunger);
          continue;
        }

        // IA-6 · Quien está en la riña real: su velocidad ya la ha puesto
        // `playQuarrel` en la sección 0d, con el mismo criterio que cualquier
        // otra escena de arriba — sólo falta integrarla, y tampoco se
        // replantea la vida mientras dura.
        if (dweller.quarrel !== null && dweller.quarrel !== undefined) {
          integrate(body, land, LIFE_STEP);
          settleHeldBody(dweller, land, around, hunger);
          continue;
        }

        // IA-2 · Quien cede el paso, mientras dura el paso a un lado: su
        // velocidad la pone `playYield`, no el `want`/`push`/`wall` normal de
        // más abajo. Pasada `actUntil` (la cola de recuperación) ya no entra
        // aquí y sigue su vida como cualquiera, con la ruta intacta —no se ha
        // tocado `follow()` mientras cedía, así que retoma justo donde se
        // había quedado.
        const yielding = yieldingByYielder.get(body.id);
        if (yielding !== undefined && steps < yielding.yielding.actUntil) {
          playYield(yielding.yielding, dweller);
          settleHeldBody(dweller, land, around, hunger);
          continue;
        }

        // 1 · ¿Toca replantearse?
        //
        //     **No mientras se va de camino**, que fue el fallo gordo de la
        //     primera versión: replanteándose cada segundo y medio, la gente
        //     cambiaba de destino antes de llegar y se pasaba el día andando.
        //     Medido: entre el 72 % y el 91 % de la jornada en tránsito, y casi
        //     nadie haciendo nada. Uno decide ir al pozo y va; no reconsidera su
        //     vida cada dos pasos.
        //
        //     Con un tope, eso sí: si el camino se ha hecho eterno —porque el
        //     sitio se llenó, o porque hay medio pueblo por medio— se replantea
        //     igual. Quedarse andando para siempre es el otro modo de fallar.
        if (stepHome(dweller, phase, steps, land, around, dwellers)) {
          // Un haz es parte de la jornada, no de la persona: al volver a casa
          // se considera descargado y no entra con él por la puerta.
          if (dweller.holding !== null && dweller.holding < 0) dweller.holding = null;
          continue;
        }
        const onTheWay = dweller.doing !== null && !dweller.doing.there;
        // **Espera creciente, no `GIVE_UP` fijo** (checklist IA-1, punto 6):
        // `noProgress()` sólo concede el replanteo cuando el viaje lleva de
        // verdad sin acercarse, con una espera que se dobla cada vez que
        // vuelve a atascarse — ver `decide.ts`.
        const prog = progress.get(dweller.body.id) as ProgressState;
        let tooLong = noProgress(dweller.doing, prog, body, steps, GIVE_UP);
        if (tooLong && dweller.doing !== null && !dweller.doing.there && !dweller.doing.detoured) {
          dweller.doing.detoured = true;
          const alternative = routeAroundBodies(land, body, seatAt(dweller.doing.offer, dweller.doing.seat), outside());
          if (alternative !== null) {
            dweller.doing.route.splice(0, dweller.doing.route.length, ...alternative);
            prog.at = steps + PROGRESS_CHECK; prog.gap = Number.POSITIVE_INFINITY; tooLong = false;
          }
        }
        // Una carga profesional no vuelve al campo porque un corro haya
        // cerrado temporalmente el último tramo. Tras probar el rodeo móvil,
        // recalcula el camino estático y conserva la entrega; en la semilla 7
        // la ruta larga de cosecha progresaba durante treinta segundos y el
        // replanteo la mandaba de vuelta aún con el saco en la mano.
        const delivering = dweller.holding !== null && dweller.holding < 0
          && dweller.doing?.offer.id.startsWith('deliver') === true;
        if (tooLong && delivering && dweller.doing !== null) {
          const target = seatAt(dweller.doing.offer, dweller.doing.seat);
          const retry = pathTo(land, body, target, body.radius);
          if (retry !== null) {
            dweller.doing.route.splice(0, dweller.doing.route.length, ...retry);
            dweller.doing.detoured = false;
            prog.at = steps + PROGRESS_CHECK; prog.gap = Number.POSITIVE_INFINITY;
            dweller.rethinkAt = steps + GIVE_UP; tooLong = false;
          }
        }
        // V-09 · Con un trasto ya en la mano y a la espera de soltarlo, tampoco
        // se replantea la vida: la jugada dura menos que `RETHINK` (1,5 s) a
        // propósito —«no se come la jornada»—, y sin este freno el rethink de
        // en medio ganaba casi siempre en cuanto `satisfy()` vaciaba el
        // aburrimiento que hacía atractivo jugar, dejando a la pelota
        // pegada en la mano para el resto del día. Medido: 3 139 pasos con la
        // pelota en la mano y cero pases en la semilla 3, antes de este freno.
        const heldSteady = dweller.doing?.there === true && (dweller.holding !== null
          || (steps < dweller.doing.until && dweller.needs.thirst < 0.9 && dweller.needs.rest < 0.9));
        // **El plazo vencido, también sin haber llegado.** Es el mismo hueco
        // que se cerró para los animales en IA-4: `until` sólo contaba una
        // vez llegado, así que quien no llegaba se quedaba con el viaje
        // puesto. Ahora entra porque la plaza que falló se descarta abajo:
        // sin eso, medido, empeoraba (0,06 % → 0,20 % de parados con un
        // impulso al máximo, `docs/life-rounds/IA-6.md` §4.3).
        const overdue = onTheWay && dweller.doing?.arriveBy !== undefined && steps >= dweller.doing.arriveBy;
        if (!heldSteady && steps >= dweller.rethinkAt && (!onTheWay || tooLong || overdue)) {
          dweller.rethinkAt = steps + RETHINK;
          const before = dweller.doing;
          // La plaza a la que no se llegó se descarta durante una ventana, y
          // las que ya caducaron se olvidan.
          if (before !== null && !before.there) {
            dweller.failed.set(failedSeatKey(before), steps + SHUN_STEPS);
          }
          for (const [key, until] of dweller.failed) if (until <= steps) dweller.failed.delete(key);
          const shunned = dweller.failed.size === 0 ? undefined : new Set(dweller.failed.keys());
          // V-09b · Hasta que se le pasen las ganas (`PLAYED_OUT`), a éste no
          // se le ofrece `play`: se filtra aquí, al montar las opciones de
          // *este* dweller, no dentro de `decide` — una oferta no puede saber
          // quién pregunta (E.4). El resto de la aldea sigue viendo la pelota
          // como siempre.
          const playedOut = now < dweller.playedUntil;
          // V-11: con la aldea convocada no se ofrecen trastos, por lo mismo
          // que no se ofrece la cabaña — ver `mine` arriba.
          const options = summoned
            ? mine
            : !playedOut || propOptions.length === 0
              ? [...mine, ...propOptions]
              : [...mine, ...propOptions.filter((place) => place.offers[0]?.id !== 'play')];
          // Los protagonistas de un hecho del motor se reúnen en plazas
          // contiguas; el azar del corro no debe impedir escenificarlo.
          const enactment = !quarrelStaged && quarrelPair?.includes(dweller.villager)
            ? mine.find(place => place.id.startsWith('gather:')) : undefined;
          const eventOffer = enactment?.offers[0];
          const closeSeat = eventOffer?.spots?.map((point, seat) => ({ seat, distance: gap(point, eventOffer.spots![0]!) }))
            .filter(item => item.seat > 0).sort((a, b) => a.distance - b.distance)[0]?.seat ?? 1;
          const eventOptions = enactment === undefined ? options : options.map(place => place !== enactment ? place
            : { ...place, offers: place.offers.map(offer => ({ ...offer, reach: 0.75 })) });
          // **Checklist IA-1, punto 5: si `decide()` no encuentra nada que
          // merezca la pena —o acaba de invalidar lo que había por
          // inalcanzable (punto 4)— siempre queda `pauseHere()`**, una pausa
          // local que sí se puede alcanzar. `dweller.doing` deja de poder
          // quedarse en `null` de aquí en adelante: es lo que arregla la
          // medida que rework.md §3.6 dejó sin mover, parados con un impulso
          // ≥ 0,9.
          dweller.doing = decide(
            {
              traits: dweller.traits, needs: dweller.needs, at: body, id: body.id, doing: before,
              ageGroup: dweller.ageGroup, home: dweller.home, shunned, pace: body.pace,
              job: enactment === undefined ? dweller.dayPlan?.job : {
                place: enactment.id, offer: enactment.offers[0]!.id, seat: quarrelPair!.indexOf(dweller.villager) === 0 ? 0 : closeSeat,
              }, phase,
              // IA-9 · si el viaje no avanza o se le pasó el plazo, que no se
              // conserve: es justo el caso en que conservarlo deja a alguien de
              // pie para siempre.
              restart: tooLong || overdue,
            },
            summoned ? eventOptions : [...eventOptions, ...(dweller.leisure ?? [])], taken, land, router, seed, steps,
          ) ?? pauseHere(body, land, router, seed, body.id, steps, dweller.traits, body.pace);
          // **La plaza se reserva al decidir, no al llegar**, y ése era el imán
          // que se veía en pantalla: el aforo se contaba una vez al empezar el
          // paso, así que los veinte que decidían en ese instante veían el mismo
          // pozo libre y se iban los veinte. Medido: setenta y cinco veces más
          // gente de la que cabe yendo al mismo sitio en una sola jornada.
          moveSeat(taken, before, dweller.doing);
          // Sólo se reinicia el reloj de progreso cuando la intención cambia
          // de verdad: `decide()` devuelve la misma referencia cuando sigue
          // con lo mismo (arriba, «se sigue, sin recalcular el camino»), y
          // reiniciarlo también ahí borraría el atasco que se acaba de medir.
          if (dweller.doing !== before) {
            prog.at = steps + PROGRESS_CHECK;
            prog.gap = Number.POSITIVE_INFINITY;
            prog.stalls = 0;
          }
        }

        // 2 · ¿Se acabó lo que estaba haciendo?
        // **El plazo vencido de quien no ha llegado se resuelve más arriba**,
        // con el replanteo (`overdue`), y entró el día que existió la pieza que
        // faltaba: descartar la plaza que falló (`Dweller.failed`,
        // `Chooser.shunned`). Sin ella, medido, empeoraba: parados con un
        // impulso al máximo de 0,06 % a 0,20 % (`life-rounds/IA-6.md` §4.3),
        // porque se volvía a elegir la misma plaza inalcanzable. Con ella:
        // parados 0,08 %, y los giros suben de 0,37 % a 0,54 % porque quien
        // abandona ahora **se da la vuelta y va a otro sitio**, que es lo que
        // debe pasar — antes se quedaba clavado mirando a la plaza fallida.
        // Aquí queda sólo el final normal de una ocupación cumplida.
        if (dweller.doing !== null && dweller.doing.there && steps >= dweller.doing.until) {
          // La cosecha entra en el motor de golpe en la semana 35. Esta ruta
          // hace visible esa jornada sin volver a sumar grano ni adjudicar una
          // producción a una parcela que el estado no conoce.
          const harvesting = dweller.doing.place.id.startsWith('field:')
            && dweller.doing.offer.id === 'harvest'
            && dweller.dayPlan?.job?.offer === 'harvest';
          if (harvesting) {
            const stores = mine.filter(place => place.id.startsWith('grain-store:'))
              .sort((a, b) => Math.hypot(body.x - a.at.x, body.z - a.at.z)
                - Math.hypot(body.x - b.at.x, body.z - b.at.z));
            for (const store of stores) {
              const offer = store.offers.find(item => item.id === 'deliver-grain');
              const seat = offer === undefined ? 0
                : (dweller.dayPlan?.job?.seat ?? 0) % Math.max(1, offer.seats);
              const spot = offer === undefined ? null : seatAt(offer, seat);
              const route = spot === null ? null : pathTo(land, body, spot, body.radius);
              if (offer === undefined || route === null) continue;
              const durationSteps = Math.round(2 / LIFE_STEP);
              dweller.holding = -2_000_000 - body.id;
              dweller.doing = {
                place: store, offer, seat, route: [...route], since: steps,
                until: steps + durationSteps, durationSteps, there: false,
              };
              dweller.rethinkAt = steps + GIVE_UP;
              break;
            }
            if (dweller.holding !== null) continue;
          }
          // Una tanda de hachazos termina con un viaje visible a la leñera.
          // Es coreografía derivada: no añade madera ni condiciona el tick.
          const felling = dweller.doing.place.id.startsWith('felling:')
            && dweller.dayPlan?.job?.place.startsWith('felling:') === true;
          if (felling) {
            const store = mine.find(place => place.id.startsWith('wood-store:'));
            const offer = store?.offers.find(item => item.id === 'deliver');
            const seat = offer === undefined ? 0
              : (dweller.dayPlan?.job?.seat ?? 0) % Math.max(1, offer.seats);
            const spot = offer === undefined ? null : seatAt(offer, seat);
            const route = spot === null ? null : pathTo(land, body, spot, body.radius);
            if (store !== undefined && offer !== undefined && route !== null) {
              const durationSteps = Math.round(3 / LIFE_STEP);
              dweller.holding = -1 - body.id;
              dweller.doing = {
                place: store, offer, seat, route: [...route], since: steps,
                until: steps + durationSteps, durationSteps, there: false,
              };
              // El viaje y la descarga son una sola tarea. Replantearla a los
              // tres segundos cortaba portes largos justo al llegar.
              dweller.rethinkAt = steps + GIVE_UP;
              continue;
            }
          }
          // El coste de piedra ya forma parte de `bpCost`: esta ida representa
          // esa fracción de trabajo, sin crear un sexto recurso ni escribir en
          // el motor. La carga sólo existe durante la jornada visible.
          const quarrying = dweller.doing.place.id.startsWith('quarry:')
            && dweller.dayPlan?.job?.place.startsWith('quarry:') === true;
          if (quarrying) {
            const works = mine.find(place => place.id.startsWith('works:'));
            const offer = works?.offers.find(item => item.id === 'deliver-stone');
            const seat = offer === undefined ? 0
              : (dweller.dayPlan?.job?.seat ?? 0) % Math.max(1, offer.seats);
            const spot = offer === undefined ? null : seatAt(offer, seat);
            const route = spot === null ? null : pathTo(land, body, spot, body.radius);
            if (works !== undefined && offer !== undefined && route !== null) {
              // La cantera queda lejos y el regreso empieza en fase 0,5. Una
              // descarga breve cabe antes de volver a casa sin cortar la carga.
              const durationSteps = Math.round(1.5 / LIFE_STEP);
              dweller.holding = -1_000_000 - body.id;
              dweller.doing = {
                place: works, offer, seat, route: [...route], since: steps,
                until: steps + durationSteps, durationSteps, there: false,
              };
              dweller.rethinkAt = steps + GIVE_UP;
              continue;
            }
          }
          if (dweller.doing.offer.id === 'deliver' && dweller.holding !== null && dweller.holding < 0) {
            timberDeliveries += 1;
            // Hasta tres haces quedan junto a la descarga durante la jornada.
            // No son inventario y no se pueden volver a coger: hacen visible
            // el resultado inmediato antes de que el siguiente tick reconstruya
            // la pila estable a partir de `village.wood`.
            if (timberDeliveries <= 3) {
              const bundle: Prop = {
                id: -10_000_000 - timberDeliveries,
                kind: 'bundle', x: body.x, z: body.z, y: 0,
                vx: 0, vz: 0, vy: 0, held: null,
                restUntil: Number.POSITIVE_INFINITY, for: null,
              };
              props.push(bundle);
              propsById.set(bundle.id, bundle);
            }
          }
          if (dweller.doing.offer.id === 'deliver-stone'
            && dweller.holding !== null && dweller.holding <= -1_000_000) {
            stoneDeliveries += 1;
            if (stoneDeliveries <= 3) {
              const stone: Prop = {
                id: -20_000_000 - stoneDeliveries,
                kind: 'stone', x: body.x, z: body.z, y: 0,
                vx: 0, vz: 0, vy: 0, held: null,
                restUntil: Number.POSITIVE_INFINITY, for: null,
              };
              props.push(stone);
              propsById.set(stone.id, stone);
            }
          }
          if (dweller.doing.offer.id === 'deliver-grain'
            && dweller.holding !== null && dweller.holding <= -2_000_000) {
            harvestDeliveries += 1;
            if (harvestDeliveries <= 3) {
              const grain: Prop = {
                id: -30_000_000 - harvestDeliveries,
                kind: 'grain', x: body.x, z: body.z, y: 0,
                vx: 0, vz: 0, vy: 0, held: null,
                restUntil: Number.POSITIVE_INFINITY, for: null,
              };
              props.push(grain);
              propsById.set(grain.id, grain);
            }
          }
          // V-09: si se acaba con un trasto en la mano, se resuelve. Una
          // pelota se tira —encarado a quien tocara, o hacia delante si nadie
          // quiso jugar— y cualquier otra cosa se suelta donde se está.
          if (dweller.holding !== null) {
            const held = propsById.get(dweller.holding);
            if (held !== undefined) {
              if (held.kind === 'ball') {
                const mate = dweller.aimAt === null ? undefined : byId.get(dweller.aimAt);
                const at = mate !== undefined
                  ? { x: mate.body.x, z: mate.body.z }
                  : {
                    x: body.x + Math.sin(body.facing) * THROW_AHEAD,
                    z: body.z + Math.cos(body.facing) * THROW_AHEAD,
                  };
                fling(held, dweller, at, THROW, LOFT, land, mate?.body.id ?? null);
                held.restUntil = now + REST_AFTER_THROW;
                passes += 1;
                passLog.push({ from: dweller.body.id, to: mate?.body.id ?? null, step: steps });
                // V-09b · Se le pasan las ganas por un rato, como en el
                // descarte: sin esto el rethink de en medio ganaba en cuanto
                // `satisfy()` vaciaba el aburrimiento, y la pelota volvía a la
                // misma mano una y otra vez.
                const rest = hash32(seed, `playedout:${dweller.body.id}:${steps}`) / 4_294_967_296;
                dweller.playedUntil = now + PLAYED_OUT[0] + rest * (PLAYED_OUT[1] - PLAYED_OUT[0]);
              } else {
                drop(held, dweller, land);
              }
            }
            dweller.holding = null;
          }
          dweller.aimAt = null;
          dweller.doing = null;
          dweller.rethinkAt = steps;
        }

        // 3 · Andar hacia ello, o estarse haciéndolo.
        //
        //     **Se llega cuando se está a su alcance, no cuando se pisa el
        //     punto.** Para eso existe `reach` en la oferta, y no usarlo fue la
        //     segunda mitad del mismo fallo: en sitios apretados entre casas, el
        //     empujón de las paredes impide clavarse en el punto exacto y la
        //     gente se quedaba dando vueltas al lado de donde quería estar.
        const wasThere = dweller.doing?.there === true;
        if (dweller.doing !== null && !dweller.doing.there) {
          const spot = seatAt(dweller.doing.offer, dweller.doing.seat);
          if (Math.hypot(spot.x - body.x, spot.z - body.z) <= dweller.doing.offer.reach * 0.6) {
            dweller.doing.there = true;
            dweller.doing.until = steps + (dweller.doing.durationSteps ?? Math.round(dweller.doing.offer.seconds[0] * 30));
            dweller.doing.route.length = 0;
          }
        }
        const route = dweller.doing?.route;
        // Se gira cuando el siguiente tramo es seguro desde la posición real,
        // sin exigir acertar un punto microscópico ni recortar una esquina.
        while (route !== undefined && route.length > 1 && gap(body, route[0]!) < 0.4
          && clearBetween(land, body, route[1]!, body.radius)) route.shift();
        const next = dweller.doing === null || dweller.doing.there ? null : route?.[0] ?? null;
        // **Llegar es alcanzar la zona válida, no vaciar la ruta** (checklist
        // IA-1, punto 6). La comprobación de arriba ya cubre el caso normal
        // —estar a `reach` de la plaza—; si la ruta se vacía sin que eso haya
        // pasado (`next === null` y `there` sigue en `false`), no se marca
        // como llegado donde no se está: antes esta rama daba la intención
        // por cumplida con sólo consumir la ruta, así que un cuerpo podía
        // quedarse «llegado» —y recibiendo `satisfy()`— a varias celdas de la
        // oferta. Ahora se queda de pie con la ruta vacía (`want` es cero sin
        // ruta que seguir) hasta que `noProgress()`, más arriba, note que no
        // se acerca y lo replantee.
        // V-09 · Primera lección del descarte: al llegar junto a un trasto
        // suelto se coge, no hace falta pisarlo. Sólo en el instante de
        // llegar (`!wasThere`), y sólo si de verdad hay algo que ofrezca
        // `play`/`carry` ahí: el aforo ya reservó la plaza al decidir, así
        // que en condiciones normales sigue libre.
        //
        // **Y sólo lo que se coge con la mano.** El comentario de arriba decía
        // «sólo si de verdad hay algo que ofrezca `play`/`carry`» y el código no
        // lo comprobaba: cogía cualquier trasto a cuya plaza se hubiera llegado.
        // Con el barril de la fiesta (M-3) eso se volvió visible — el primero en
        // llegar a beber se llevaba el barril en la mano y la fiesta se iba
        // andando detrás de él— así que ahora la condición está escrita: un
        // trasto marcado `fixed` está donde está, y la oferta tiene que ser de
        // las de coger.
        if (dweller.doing !== null && dweller.doing.there && !wasThere
          && dweller.holding === null
          && dweller.doing.place.id.startsWith(PROP_PLACE_PREFIX)
          && (dweller.doing.offer.id === 'play' || dweller.doing.offer.id === 'carry')) {
          const prop = propsById.get(Number(dweller.doing.place.id.slice(PROP_PLACE_PREFIX.length)));
          if (prop !== undefined && prop.fixed !== true && take(prop, dweller)) {
            dweller.aimAt = dweller.doing.offer.id === 'play'
              ? (findMate(dweller, dwellers)?.body.id ?? null)
              : null;
          }
        }

        const want = next === null ? { x: 0, z: 0 } : seek(body, next);
        if (next !== null) {
          const distance = Math.hypot(next.x - body.x, next.z - body.z);
          const pace = Math.min(body.pace, distance / LIFE_STEP);
          if (distance > 0) { want.x = (next.x - body.x) / distance * pace; want.z = (next.z - body.z) / distance * pace; }
        }
        const push = separate(body, around);
        const norm = Math.hypot(want.x, want.z);
        const along = norm > 0 ? (push.x * want.x + push.z * want.z) / (norm * norm) : 0;
        // **La intención cumplida frena de verdad** (rework.md §3.5.3):
        // `doing.there === true`, no «no hay ruta que seguir» —`next` también
        // es nulo sin intención todavía, recién llegado el día o entre una
        // ocupación y la siguiente, y frenar ahí de raíz cada paso le corta
        // las alas al empujón de `avoid()` para sacar a alguien de un mal
        // sitio: la velocidad nunca llega a acumularse de un paso a otro y se
        // queda arrastrándose. Sin esto, quien ya había llegado seguía
        // empujado por `separate`/`avoid` con la velocidad vieja de fondo, y
        // el forcejeo con un vecino apretado le hacía oscilar de velocidad
        // cada paso: eso es la vuelta sobre sí mismo, no el andar.
        if (next === null) { body.vx = 0; body.vz = 0; }
        const before = { x: body.x, z: body.z };
        drive(body, next === null ? { x: 0, z: 0 }
          : { x: want.x + (push.x - want.x * along) * 0.25, z: want.z + (push.z - want.z * along) * 0.25 });
        // La inercia y la separación no pueden sacar al cuerpo del tramo seguro.
        if (next !== null && !clearBetween(land, body,
          { x: body.x + body.vx * LIFE_STEP, z: body.z + body.vz * LIFE_STEP }, body.radius)) {
          body.vx = want.x; body.vz = want.z;
        }
        integrate(body, land, LIFE_STEP);

        const speed = Math.hypot(body.vx, body.vz);
        if (speed > 0.05) {
          dweller.travelled += Math.hypot(body.x - before.x, body.z - before.z);
        }

        // El umbral de velocidad evita seguir pequeñas oscilaciones; durante
        // la marcha el giro se actualiza continuamente, con el límite angular
        // de turnTo. El ancla se conserva para las escenas que la consultan.
        if (speed <= TURN_MIN_SPEED * body.pace) {
          dweller.faceAnchor = { x: body.x, z: body.z };
        } else {
          // Girar cada paso de marcha: esperar 0,3 celdas y girar sólo un
          // paso dejaba la cara retrasada durante metros de avance lateral.
          turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
          dweller.faceAnchor = { x: body.x, z: body.z };
        }

        // V-09 · Segunda lección del descarte: quien va a tirar la pelota se
        // encara a quien se la va a tirar antes de soltarla. Esto es mirar a
        // alguien a propósito y no el paso al andar, así que no pasa por el
        // umbral de arriba: sólo hace falta estar parado.
        if (speed <= 0.05 && dweller.doing?.there === true && dweller.doing.offer.id === 'play'
          && dweller.aimAt !== null) {
          const mate = byId.get(dweller.aimAt);
          if (mate !== undefined) {
            turnTo(body, Math.atan2(mate.body.x - body.x, mate.body.z - body.z), LIFE_STEP);
          }
        }

        // 4 · Y lo que eso le hace por dentro.
        let company = false;
        around.near(body, (other) => {
          if (!company && Math.hypot(other.x - body.x, other.z - body.z) < 2.2) company = true;
        });
        const doing: Doing = {
          moving: speed > 0.25,
          withOthers: company,
          working: dweller.doing?.there === true && dweller.doing.offer.id === 'work',
          hunger,
        };
        drift(dweller.needs, dweller.traits, doing, LIFE_STEP);
        if (dweller.doing?.there === true) satisfy(dweller.needs, dweller.doing.offer, LIFE_STEP);
      }

      // 6b · IA-2 · El gesto de un saludo, después de que la marcha normal ya
      //      haya puesto la cara mirando hacia donde se anda: esto la
      //      sobrescribe un instante. Nunca toca velocidad ni posición —
      //      «siguen andando» (docs/life-ai-proposal.md §7) — así que va
      //      después del bucle principal y no dentro, sin ganarle la mano a
      //      nada de lo que ya ha decidido este paso.
      for (const active of greetings) {
        const a = byId.get(active.greeting.a);
        const b = byId.get(active.greeting.b);
        if (a === undefined || b === undefined) continue;
        // **El mismo umbral contra la vuelta sobre sí mismo que el resto del
        // valle** (rework.md §3.5.3, `TURN_MIN_SPEED`): un saludo es un gesto
        // de quien anda, y sobrescribir la cara de quien está casi parado
        // —por ejemplo, a un paso de que `decide()` le mande a otra cosa— es
        // justo el defecto que esa regla existe para evitar. Medido: sin este
        // umbral, `tools/life-report.ts` subía los giros de 0,34 % a 0,43 %;
        // con él, se quedan donde estaban.
        const speedA = Math.hypot(a.body.vx, a.body.vz);
        const speedB = Math.hypot(b.body.vx, b.body.vz);
        if (speedA > TURN_MIN_SPEED * a.body.pace && speedB > TURN_MIN_SPEED * b.body.pace) {
          playGreet(a, b);
        }
      }

      // 7b · Los trastos. V-09. Los sueltos caen y ruedan (`settle`, física
      //      pura); los que alguien lleva van en su mano (`carryAt`) — eso no
      //      puede vivir dentro de `settle`, que no conoce los cuerpos.
      settle(props, land, LIFE_STEP);
      for (const dweller of dwellers) {
        if (dweller.holding === null) continue;
        const held = propsById.get(dweller.holding);
        if (held !== undefined) carryAt(held, dweller);
      }

      // 7c · Recibir un pase es una reacción, no una elección. V-09b.
      //
      //    Después de la física del paso (7b), con la pelota ya parada donde
      //    va a parar: si una pelota lanzada a alguien (`Prop.for`) está
      //    quieta a menos de dos celdas de ese cuerpo, y ese `Dweller` no está
      //    en escena, no lleva nada ya y no está en `PLAYED_OUT`, la coge y se
      //    pone a jugar directamente — **sin pasar por `decide`**, la misma
      //    clase de cosa que una escena de V-07: una interacción entre dos que
      //    no es una oferta y por tanto no nombra a nadie (E.4, `propPlaces`
      //    no cambia). Sin esto el receptor tenía que volver a ganar el mismo
      //    concurso de utilidad que cualquier otra oferta para coger lo que le
      //    acababan de tirar, y casi nunca lo ganaba: la cadena moría en el
      //    primer pase (medido, `docs/life-rounds/V-09.md`).
      //
      //    **La plaza se sigue reservando al decidir, no al llegar** (V-06,
      //    E.7): si la pelota lleva ya un paso quieta y ofreciéndose de
      //    verdad (`propPlaces`), alguien puede haberla elegido por el
      //    concurso normal de utilidad antes de que el destinatario llegara a
      //    tiempo. Robársela igualmente rompía esa garantía — medido: un
      //    exceso de aforo en `life-decide.test.ts` («nadie se apiña, nadie
      //    se pasa del aforo»), el mismo síntoma que V-06 ya cerró una vez
      //    para los sitios normales. Aquí no hay `taken` que consultar
      //    (7c corre después del reparto de plazas del paso), así que se
      //    mira directamente si alguien más ya tiene esta plaza como destino.
      for (const prop of props) {
        if (prop.kind !== 'ball' || prop.for === null || prop.held !== null) continue;
        // Quieta: mismo criterio que `propPlaces` para «se puede coger».
        if (prop.y > 0.001 || Math.hypot(prop.vx, prop.vz) > 0.05) continue;
        const target = byId.get(prop.for);
        if (target === undefined || target.scene !== null || target.holding !== null) continue;
        if (now < target.playedUntil) continue;
        const gap = Math.hypot(target.body.x - prop.x, target.body.z - prop.z);
        if (gap >= CATCH_RANGE) continue;
        const placeId = `${PROP_PLACE_PREFIX}${prop.id}`;
        const claimed = dwellers.some((other) => other.body.id !== target.body.id
          && other.doing !== null && other.doing.place.id === placeId);
        if (claimed) continue;
        // Vive en el catálogo (`offers.ts`) y no puede faltar, pero `OFFERS`
        // es un `Record<string, OfferSpec>` y TypeScript no lo sabe estático.
        const spec = OFFERS.play;
        if (spec === undefined) continue;
        if (!take(prop, target)) continue;

        const dice = hash32(seed, `catch:${target.body.id}:${steps}`) / 4_294_967_296;
        const span = Math.round((spec.seconds[0] + dice * (spec.seconds[1] - spec.seconds[0])) * 30);
        const at = { x: target.body.x, z: target.body.z };
        const offer: Offer = { ...spec, at };
        target.doing = {
          place: { id: placeId, at, offers: [offer] },
          offer,
          route: [],
          seat: 0,
          since: steps,
          until: steps + span,
          there: true,
        };
        target.rethinkAt = steps + RETHINK;
        target.aimAt = findMate(target, dwellers)?.body.id ?? null;
      }

      // 7e · IA-5 · La amenaza del lobo, si el motor la soltó esta semana.
      //
      //     Antes de que la cabaña decida nada, para que la gallina que huye
      //     este mismo paso huya de dónde está el lobo *ahora*, no de dónde
      //     estaba hace un paso. Guionizado (`wildlife.ts`), no navegado ni
      //     metido en el registro de compromisos: no es una interacción de
      //     dos actores por unas plazas, es una amenaza sobre el corral
      //     entero, y nunca escribe en `GameState` — el motor ya decidió
      //     cuántas gallinas se llevó (`fate.ts`), esto sólo lo enseña.
      if (wolfRaid && !wolfSpawned && steps >= WOLF_START_STEP) {
        wolf = createWolf(state, land, shore, router, henAnchor, steps);
        wolfSpawned = true;
        wolfNoticedThisVisit = false;
        wildlifeThreats += 1;
      }
      // D3 · y la partida anda lo suyo. Guionizada como el lobo y por la misma
      // razón (E.8): lo que se llevan ya lo decidió el motor antes de que
      // empiece el día, y esto sólo lo enseña. No pelea, no rompe y no mata.
      for (const raider of raiders) stepRaider(raider, land, seed, steps);

      if (wolf !== null && wolf.phase !== 'gone') {
        // Ligado a una constante propia y no a `wolf` a secas: `stepWolf`
        // muta `.phase` por dentro, y TypeScript no lo sabe — sigue creyendo,
        // tras la llamada, que `wolf.phase` es lo que era antes de ella. Con
        // `active` la comprobación de más abajo es fresca de verdad.
        const active = wolf;
        stepWolf(active, land, router, seed, steps);
        if (!wolfNoticedThisVisit) {
          const alarmed = beasts.some((beast) => beast.kind === 'hen'
            && Math.hypot(beast.dweller.body.x - active.body.x, beast.dweller.body.z - active.body.z)
              <= WOLF_ALARM_RADIUS);
          if (alarmed) wolfNoticedThisVisit = true;
        }
        if (active.phase === 'gone') {
          if (wolfNoticedThisVisit) wildlifeNoticed += 1;
          if (active.forced) wildlifeStuck += 1; else wildlifeRecovered += 1;
        }
      }

      // 8 · La cabaña vive su propio paso. V-08.
      //
      //    Después de la gente y antes de `resolve()`, para que la corrección
      //    final de solapes vea las posiciones ya movidas de todo el mundo —
      //    persona y animal por igual. No entra en escenas (eso sigue siendo
      //    cosa de `dwellers`, sólo personas): lo que un animal ofrece a quien
      //    pase ya está en `mine`, y quien lo elige es la gente decidiendo,
      //    no una escena de dos.
      // El mismo `taken` que acaba de usar la gente (checklist IA-1, punto 3):
      // `seats()` ya cuenta personas y bestias, y lo que la gente decidió
      // arriba ya está reflejado aquí, así que la cabaña ve el aforo real y
      // no un mapa vacío.
      // El registro es el de la aldea y la ventana de intención sale de los
      // `Dweller` que ya tenemos aquí: un animal sólo necesita saber si quien
      // tiene al lado viene a él (consolidación de IA-4). Y desde IA-5, si hay
      // lobo vivo, su posición es la amenaza que puede hacer huir a una
      // gallina (`WOLF_ALARM_RADIUS`, `beasts.ts`).
      stepBeasts(beasts, land, around, router, seed, steps, taken, commitments,
        (bodyId) => {
          const person = byId.get(bodyId);
          return person?.doing?.there === true ? person.doing.offer.id : null;
        },
        wolf !== null && wolf.phase !== 'gone' ? { x: wolf.body.x, z: wolf.body.z } : null);

      resolve(outside(), around, land);
      // El contacto puede cancelar parte del avance o apartar el cuerpo. La
      // zancada sigue la posición final, no el trayecto anterior a la corrección.
      dwellers.forEach((d, i) => {
        const start = starts[i]!;
        const distance = gap(start, d.body);
        d.travelled = start.travelled + distance;
        d.motionSpeed = distance / LIFE_STEP;
      });

      // 9 · ¿Quién se ha encontrado con quién? V-07, ampliado en IA-2.
      //
      //    Después de mover y resolver a todos, con las posiciones ya
      //    definitivas del paso: un encuentro que no estaba escrito al
      //    amanecer, ocurre porque dos cuerpos se han acercado andando. Cada
      //    pareja se mira una vez (`other.id > body.id`), y sólo entran los
      //    que no están ya en algo y no acaban de salir de otra cosa — contra
      //    el registro de compromisos, no sólo contra `.scene`, porque un
      //    saludo o una cesión de paso también ocupan a alguien sin que
      //    `.scene` lo sepa.
      //
      //    **Se recogen todas las propuestas del paso antes de conceder
      //    ninguna, y se conceden en orden canónico por id de cuerpo** — no
      //    por el orden en que `around.near` las haya encontrado (§8 del
      //    brief): así reconstruir el mismo día da las mismas parejas, y dos
      //    propuestas que compitan por el mismo cuerpo en el mismo paso no
      //    dependen de quién se mirara primero.
      around.rebuild(outside());

      type Candidate =
        | { readonly a: Dweller; readonly b: Dweller; readonly tag: 'yield'; readonly data: Yielding }
        | { readonly a: Dweller; readonly b: Dweller; readonly tag: 'quarrel'; readonly data: QuarrelScene }
        | { readonly a: Dweller; readonly b: Dweller; readonly tag: 'chat'; readonly data: Scene }
        | { readonly a: Dweller; readonly b: Dweller; readonly tag: 'conflict'; readonly data: Scene }
        | { readonly a: Dweller; readonly b: Dweller; readonly tag: 'greet'; readonly data: Greeting };

      const freeToPropose = (d: Dweller): boolean => !indoors(d) && (d.residence === undefined || ['day', 'returning'].includes(d.residence.stage)) && d.scene === null
        && (steps >= d.sceneCooldownUntil || isNight(phase) || (!quarrelStaged && quarrelPair?.includes(d.villager) === true))
        && !commitments.busy(actorOf(d));
      const onDuty = (d: Dweller): boolean => d.holding !== null && d.holding < 0
        || d.doing?.offer.id === 'deliver' || d.doing?.offer.id === 'deliver-stone'
        || d.doing?.offer.id === 'deliver-grain'
        || (phase >= 0.16 && phase < 0.65
          && d.dayPlan?.job !== null && d.dayPlan?.job !== undefined
          && ['work', 'pray'].includes(d.dayPlan.job.offer)
          && (d.doing === null || d.doing.place.id === d.dayPlan.job.place));

      // IA-6: si estos dos son, en cualquier orden, los `id` de la riña real
      // de esta semana. `quarrelPair` sale de `state.happenings[].who`
      // (`quarrelToday`), nunca de si están enfadados ahora mismo — eso ya lo
      // decidió el motor, no esta capa.
      const isQuarrelPair = (x: Dweller, y: Dweller): boolean => quarrelPair !== null
        && ((x.villager === quarrelPair[0] && y.villager === quarrelPair[1])
          || (x.villager === quarrelPair[1] && y.villager === quarrelPair[0]));

      const candidates: Candidate[] = [];
      for (const dweller of dwellers) {
        if (!freeToPropose(dweller)) continue;
        around.near(dweller.body, (otherBody) => {
          if (otherBody.id <= dweller.body.id) return;
          const other = byId.get(otherBody.id);
          if (other === undefined || !freeToPropose(other)) return;

          // Orden de prioridad, docs/life-ai-proposal.md §3.2: primero el
          // paso físico (`yield` — un cruce que si no se resuelve se ve como
          // un empujón mudo), luego una escena de verdad (`propose`, con
          // genio y disposición de por medio) y sólo si no hay ni una cosa ni
          // la otra, el gesto más ligero de todos (`greet`) — para que un
          // saludo nunca le quite el sitio a un encuentro que de verdad tenía
          // algo que decir.
          const yielding = proposeYield(land, dweller, other, seed, steps);
          if (yielding !== null) {
            candidates.push({ a: dweller, b: other, tag: 'yield', data: yielding });
            return;
          }

          // IA-6: la riña real manda sobre cualquier `chat`/`greet` genérico
          // entre estos dos —es un hecho que ya ocurrió esta semana, no dos
          // vecinos que se cruzan— pero no sobre `yield`: cederse el paso
          // sigue siendo primero, un cruce físico no espera a que dos se
          // pongan a discutir. `!quarrelStaged` es lo que impide montarla más
          // de una vez al día una vez que ya se ha vivido.
          if (isNight(phase)) return;
          if (!quarrelStaged && isQuarrelPair(dweller, other)) {
            const scene = proposeQuarrel(dweller, other, seed, steps);
            if (scene !== null) {
              candidates.push({ a: dweller, b: other, tag: 'quarrel', data: scene });
              return;
            }
          }

          const apart = Math.hypot(otherBody.x - dweller.body.x, otherBody.z - dweller.body.z);
          if (apart <= SCENE_EARSHOT && !onDuty(dweller) && !onDuty(other)) {
            // Sólo lectura del motor, y de los dos sentidos: ninguna escena
            // conoce a nadie por nombre, pero el trato entre estos dos sí
            // puede pesar en si se paran o no.
            const opinion = (opinionOf(state, dweller.villager, other.villager)
              + opinionOf(state, other.villager, dweller.villager)) / 2;
            const scene = propose(dweller, other, opinion, seed, steps);
            if (scene !== null) {
              candidates.push({
                a: dweller, b: other, tag: scene.kind === 'chat' ? 'chat' : 'conflict', data: scene,
              });
              return;
            }
          }

          const greeting = onDuty(dweller) || onDuty(other) ? null : proposeGreet(dweller, other, seed, steps);
          if (greeting !== null) candidates.push({ a: dweller, b: other, tag: 'greet', data: greeting });
        });
      }

      candidates.sort((p, q) => {
        const pk = `${Math.min(p.a.body.id, p.b.body.id)}:${Math.max(p.a.body.id, p.b.body.id)}`;
        const qk = `${Math.min(q.a.body.id, q.b.body.id)}:${Math.max(q.a.body.id, q.b.body.id)}`;
        return pk < qk ? -1 : pk > qk ? 1 : 0;
      });

      for (const candidate of candidates) {
        const refA = actorOf(candidate.a);
        const refB = actorOf(candidate.b);
        const spots: readonly [Point, Point] = [
          { x: candidate.a.body.x, z: candidate.a.body.z },
          { x: candidate.b.body.x, z: candidate.b.body.z },
        ];
        const lowId = Math.min(candidate.a.body.id, candidate.b.body.id);
        const highId = Math.max(candidate.a.body.id, candidate.b.body.id);

        if (candidate.tag === 'yield') {
          const y = candidate.data;
          const aIsYielder = y.yielder === candidate.a.body.id;
          const yielderRef = aIsYielder ? refA : refB;
          const passerRef = aIsYielder ? refB : refA;
          const yielderPos = aIsYielder ? spots[0] : spots[1];
          const passerPos = aIsYielder ? spots[1] : spots[0];
          const id = `yield:${lowId}:${highId}:${steps}`;
          const ySpots: readonly [Point, Point] = [y.aside ?? yielderPos, passerPos];
          const lease = commitments.tryReserve({
            id, kind: 'yield', initiator: yielderRef, recipient: passerRef,
            spots: ySpots, expiresAtStep: y.until,
          }, steps);
          if (lease !== null) { yieldings.push({ id, yielding: y }); interactionsStarted += 1; }
          continue;
        }

        if (candidate.tag === 'greet') {
          const g = candidate.data;
          const id = `greet:${lowId}:${highId}:${steps}`;
          const lease = commitments.tryReserve({
            id, kind: 'greet', initiator: refA, recipient: refB, spots, expiresAtStep: g.until,
          }, steps);
          if (lease !== null) { greetings.push({ id, greeting: g }); interactionsStarted += 1; }
          continue;
        }

        if (candidate.tag === 'quarrel') {
          // IA-6 · Aparte de `chat`/`conflict`: `QuarrelScene` no comparte su
          // tipo (`scenes.ts` explica por qué), así que no puede pasar por
          // `sceneCommitmentId`/`scenes.push` sin ensanchar ese tipo para
          // todo el mundo. Mismo mecanismo igualmente — `reserveRaw`, un
          // campo del `Dweller` que lo aparta del `decide()` normal — sólo
          // que es `Dweller.quarrel` y no `Dweller.scene`, y se guarda en
          // `activeQuarrel` en vez de en la lista `scenes`.
          const q = candidate.data;
          const id = `quarrel:${lowId}:${highId}:${steps}`;
          const lease = commitments.reserveRaw('quarrel', [refA, refB], spots, q.until, steps, id);
          if (lease === null) continue;
          if (candidate.a.holding !== null) {
            const held = propsById.get(candidate.a.holding);
            if (held !== undefined) drop(held, candidate.a, land);
          }
          if (candidate.b.holding !== null) {
            const held = propsById.get(candidate.b.holding);
            if (held !== undefined) drop(held, candidate.b, land);
          }
          candidate.a.quarrel = q;
          candidate.b.quarrel = q;
          activeQuarrel = { id, scene: q };
          // No se cuenta en `interactionsStarted`: esa cifra es de las cinco
          // clases de IA-1/IA-2 (chat/shove/brawl/greet/yield), y la riña real
          // tiene su propio recuento aparte, `stories`, para poder demostrar
          // en el informe que sale de un hecho concreto y no de un cruce más.
          storiesStarted += 1;
          quarrelStaged = true;
          continue;
        }

        // `chat` o `conflict`: una escena de dos, mecánica de `scenes.ts` sin
        // tocar. `chat` sí es una interacción del catálogo §8 y pasa por
        // `tryReserve`; `shove`/`brawl` son el conflicto que ya existía antes
        // de esta fase y usan `reserveRaw` — mismo almacén, misma liberación.
        const scene = candidate.data;
        const id = sceneCommitmentId(scene);
        const lease = candidate.tag === 'chat'
          ? commitments.tryReserve(
            { id, kind: 'chat', initiator: refA, recipient: refB, spots, expiresAtStep: scene.until }, steps,
          )
          : commitments.reserveRaw(scene.kind, [refA, refB], spots, scene.until, steps, id);
        if (lease === null) continue;

        // V-09 · Quien empieza una escena suelta lo que llevaba: no se habla,
        // ni se empuja, ni se pelea con las manos ocupadas.
        if (candidate.a.holding !== null) {
          const held = propsById.get(candidate.a.holding);
          if (held !== undefined) drop(held, candidate.a, land);
        }
        if (candidate.b.holding !== null) {
          const held = propsById.get(candidate.b.holding);
          if (held !== undefined) drop(held, candidate.b, land);
        }
        candidate.a.scene = scene;
        candidate.b.scene = scene;
        scenes.push(scene);
        interactionsStarted += 1;
      }

      steps += 1;
    },
  };
}
