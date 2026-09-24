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
import { scatterTransform } from '../world/forest';
import { VILLAGER_CLIPS } from '../clips';
import { TERRAIN_CODE, type GameState, type Trait, type VillagerId } from '@engine/state';
import { DAY, FOOD, TIME } from '@engine/balance';
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
import { doorOf, OFFERS, placesOf, seatAt, seatKey, strikeTurn, type Offer, type Place } from './offers';
import { garrisonPlaces, isPost, mannedPlatformCells, type Manned, type RampartSelector, type RingSelector, type WalkwaySelector } from './garrison';
import { advanceElevated, type ElevatedPoint, type ElevatedPost } from './elevated-post';
import { archersOf, stepArchery, type Archer, type Arrow } from './archery';
import { fallenDefenders, meleePose, stepMelee, type Defender } from './melee';
import { bastionParapetObstacles, bastionWalkwayParapetObstacles, createPhysics, type Physics, type PhysicsOptions, type PhysicsSnapshot } from './physics';
import type { RagdollSeed } from '../contracts';
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
import {
  anyEntered, assaultToday, createRaiders, gateNow, raidToday, raidersHere, stepRaider,
  approachOf, type Gate, type Raider,
} from './raiders';
import { beginWarning, stepWarning, warningActive, type SiegeWarning } from './siege-warning';
import { beginPayoff, payoffActive, payoffRoute, stepPayoff, type PayoffTrip } from './payoff';
import { createWolf, stepWolf, WOLF_START_STEP, type Wolf } from './wildlife';
import { createDeer, deerPositions, stepDeer } from './deer';
import { bearPosition, createBear, stepBear } from './bear';
import { beginFlight, stepFlight, type Flight } from './flee';
import { createSackScene, sackSnapshot, type SackScene, type SackSnapshot } from './sack';
import { aftermathProps } from './aftermath';
import type { Animal } from '@derive/animals';
import {
  carryAt, drop, findMate, fling, given, LOFT, PLAYED_OUT, propPlaces, PROP_PLACE_PREFIX,
  REST_AFTER_THROW, scatter, settle, take, THROW, THROW_AHEAD, type Prop,
} from './props';
import {
  planPreparation, preparationActive, preparationSites,
  type PreparationTrip,
} from './preparation';

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
  /** E0 · Porte efímero de la plata que hace volver al clan. */
  payoff?: PayoffTrip;
  /** E0b · aviso físico exclusivo de esta jornada; nunca sale al motor. */
  warning?: SiegeWarning;
  /** Pose fechada por la vida, no por el mixer; `since` son pasos de jornada. */
  combat?: { clip: 'bow_draw' | 'bow_loose' | 'spear_thrust' | 'hit_take' | 'fall'; since: number; facing: number };
  /** E1: huida efímera de esta jornada; no es combate ni estado del motor. */
  flight?: Flight | null;
  readonly residence?: HomeRoutine;
  readonly body: Body;
  /** E3a · Estado privado de la escalera; nunca sale al motor ni al router. */
  elevated?: { readonly post: ElevatedPost; phase: 'climb' | 'occupied' | 'descent' | 'patrol'; next: number;
    route?: readonly ElevatedPoint[];
    /** E3b.3 · De vuelta al puesto por lo andado de la ronda. */
    returning?: boolean;
    /** E3b.3 · Paso de vida hasta el que se descansa en el puesto entre rondas. */
    restUntil?: number };
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
   * cuerpo. docs/historico/rework.md §3.5.3.
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
  /** D6 · la única escena de saqueo de este asalto, o nada en una jornada normal. */
  readonly sack: SackSnapshot | null;
  /** D6 · pose física para el render y la sonda; null antes de cargar Rapier. */
  readonly physics: PhysicsSnapshot | null;
  /** Puente estrecho para los escombros Three que comparten este mismo mundo. */
  battleWorld(): Physics | null;
  /** Tick del asalto que creó esta jornada; permite conservarla entre días escénicos. */
  readonly raidTick: number | null;
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
  /** E0a · La decisión de prepararse, reconstruida para esta jornada. */
  readonly preparation: {
    readonly active: boolean;
    readonly porters: readonly PreparationTrip[];
    readonly deliveries: number;
  };
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
  /** Entrada exterior de la guarida; no existe interior navegable. */
  readonly bearDen: { readonly x: number; readonly z: number;
    readonly clearingX: number; readonly clearingZ: number; readonly facing: number } | null;
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
   * D2 · Las flechas de la jornada, las que vuelan y las clavadas (§1b).
   *
   * Vacía siempre menos el día de un asalto con arqueros en el cerco. Quien
   * dibuja lee `body.at` y `body.velocity`: la posición es la del mundo físico y
   * la velocidad es hacia dónde apunta el astil.
   */
  readonly arrows: readonly Arrow[];
  /**
   * D2 · Lo que la defensa hizo hoy: cuántas se soltaron, cuántas dieron y
   * cuántos del clan quedaron en el suelo.
   *
   * **No es una cifra del motor y no lo será hasta B4**, que es la fase que mete
   * el resultado del asalto en la partida como datos. Está aquí porque es aquí
   * donde pasó, y porque sin contarlo no hay manera de medir si la muralla
   * sirve de algo.
   */
  readonly defence: {
    readonly loosed: number;
    readonly hits: number;
    readonly fallen: number;
    /** D4 · Los de la aldea que han caído defendiendo su puesto. */
    readonly lost: number;
    /**
     * D5 · Los golpes que lleva el portón y si ha cedido, cuando hay asalto.
     *
     * `broken` es lo que el parte de B4 llama `breached`, y es la única cosa de
     * esta capa que puede acabar una partida. Que pase aquí y no en el motor es
     * §1b: «la pelea decide».
     */
    readonly gate: {
      readonly at: { readonly x: number; readonly z: number };
      readonly hitAt: number | null;
      readonly hits: number;
      readonly broken: boolean;
      readonly entered: boolean;
    } | null;
  };
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
  /** Libera el mundo físico de esta jornada. Idempotente. */
  dispose(): void;
  /** Congela la pelea ya informada y deja acabar sólo el saqueo/las físicas. */
  endBattle(): void;
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
  /**
   * D2 · **El mundo físico, si quien llama ya lo tiene.**
   *
   * Rapier se carga con `import()` dinámico y eso es una promesa; `createVillage`
   * es síncrona porque la llama el bucle de fotogramas (`renderer.ts`). Así que
   * la jornada **se lo pide a sí misma** el primer paso en que hay algo que
   * simular —una partida en el valle y alguien con un arco— y lo enchufa cuando
   * llega, unos fotogramas después: la banda tarda segundos en ponerse a tiro,
   * así que no se pierde ni una flecha. Quien quiera medir sin esperar lo pasa
   * hecho por aquí, que es lo que hacen las pruebas.
   *
   * Un valle en paz nunca lo pide, que es la promesa de D1: **cero bytes**.
   */
  readonly physics?: Physics | null;
  /** La misma cota que usa Three para apoyar actores y que Rapier usa de suelo. */
  readonly ground?: (x: number, z: number) => number;
  /** Mismo selector visual de junta: un árbol adulto corta también la ruta. */
  readonly walkwayOf?: WalkwaySelector;
  /** El circuito completo sólo aparece cuando todas sus mallas están aprobadas. */
  readonly ringOf?: RingSelector;
  /** E3b.3 · El adarve generado: prevalece sobre el anillo de piezas aprobadas. */
  readonly rampartOf?: RampartSelector;
  /** Captura síncrona de `fall(0)` en la posición exacta del fixed-step. */
  readonly ragdollSeed?: (id: number, bornAt: number,
    placement: { readonly x: number; readonly y?: number; readonly z: number; readonly facing: number }) => RagdollSeed | null;
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

/**
 * IA-pasture · Dónde empieza el suelo del ganado: el mayor trozo de pasto
 * alrededor del corazón, no la primera celda libre.
 *
 * Con los campos cerrados, la celda libre más cercana al corazón podía ser un
 * bolsillo de pocas celdas entre dos parcelas. Todo lo que el ganado alcanza se
 * medía desde ahí, así que casi ninguna casa quedaba a su alcance y la mitad de
 * la cabaña caía en el propio corazón: treinta gallinas en una celda en la
 * semilla 7 (Vera, 24 sep 2026: «mira cómo se concentran las gallinas»). Se
 * miran los trozos que tocan los primeros anillos y se queda el más grande.
 */
function pastureOrigin(pasture: Terrain, at: Point, people: Uint8Array): { heart: Point; shore: Uint8Array } {
  let best: { heart: Point; shore: Uint8Array; size: number } | null = null;
  const seen = new Uint8Array(pasture.width * pasture.height);
  const cx = Math.floor(at.x), cz = Math.floor(at.z);
  for (let ring = 0; ring < 12; ring += 1) {
    for (let dz = -ring; dz <= ring; dz += 1) for (let dx = -ring; dx <= ring; dx += 1) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
      const x = cx + dx, z = cz + dz;
      if (x < 1 || z < 1 || x >= pasture.width - 1 || z >= pasture.height - 1) continue;
      const cell = z * pasture.width + x;
      // Sólo trozos de la orilla de la gente: el ganado no nace al otro lado del río.
      if (seen[cell] === 1 || pasture.blocked[cell] === 1 || people[cell] !== 1) continue;
      const heart = { x: x + 0.5, z: z + 0.5 };
      const shore = reachableFrom(pasture, heart);
      let size = 0;
      for (let n = 0; n < shore.length; n += 1) if (shore[n] === 1) { size += 1; seen[n] = 1; }
      if (best === null || size > best.size) best = { heart, shore, size };
    }
  }
  return best ?? { heart: at, shore: reachableFrom(pasture, at) };
}

/** IA-pasture · El terreno del ganado: el de la gente con los campos cerrados. */
function fencedFields(land: Terrain, state: GameState): Terrain {
  const blocked = Uint8Array.from(land.blocked);
  for (const field of state.buildings) {
    if (field.kind !== 'field' || field.lostTick !== null) continue;
    for (let z = field.y; z < field.y + field.h; z += 1) for (let x = field.x; x < field.x + field.w; x += 1) {
      if (x >= 0 && z >= 0 && x < land.width && z < land.height) blocked[z * land.width + x] = 1;
    }
  }
  return { ...land, blocked };
}

/** IA-anim · El tronco en pie más cercano a un cuerpo, en su celda o las vecinas. */
function nearestTrunk(state: GameState, at: { readonly x: number; readonly z: number }): { x: number; z: number } | null {
  let best: { x: number; z: number } | null = null, gap = 1.2;
  for (let dz = -1; dz <= 1; dz += 1) for (let dx = -1; dx <= 1; dx += 1) {
    const x = Math.floor(at.x) + dx, z = Math.floor(at.z) + dz;
    if (x < 0 || z < 0 || x >= state.map.width || z >= state.map.height) continue;
    const cell = z * state.map.width + x;
    if (state.map.terrain[cell] !== TERRAIN_CODE.forest || (state.map.forestStock[cell] ?? 0) <= 0) continue;
    const trunk = scatterTransform(state.map.width, cell);
    const d = Math.hypot(trunk.x - at.x, trunk.z - at.z);
    if (d < gap) { gap = d; best = trunk; }
  }
  return best;
}

/**
 * E3b.3 · Cuánto se queda el guardia en su puesto entre dos rondas por el
 * adarve: veinte segundos de jornada. Es tinta de la vida, no del juego —el
 * motor no sabe que hay ronda—, y la ronda nunca le quita a nadie el puesto.
 */
const PATROL_REST_STEPS = Math.round(20 / LIFE_STEP);

/**
 * D2 · A qué distancia de su puesto se considera que alguien **está** en él.
 *
 * TUNE escénico: 1,2 celdas. El alcance de la propia oferta es 0,8 (`offers.ts`)
 * y un cuerpo mide 0,64 de ancho: con el umbral justo, un arquero que se
 * remueve en su sitio dejaría de disparar a mitad de una salva. Un tercio de
 * celda de margen es lo que hace que «estar de guardia» no parpadee.
 */
const POST_REACH = 1.2;

export function createVillage(state: GameState, day: number, options: DayOptions = {}): Village {
  const land = options.land ?? terrainOf(state);
  const seed = seedOfDay(state.seed, day);
  // IA-6 · La riña de la plaza (§7.10, `docs/historico/rework.md` §4 R-2 punto 1): si el
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
  const manned = garrisonPlaces(state, land, heart, shore, options.ground, options.walkwayOf, options.ringOf, options.rampartOf);
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
  const preparing = preparationActive(state);
  // IA-pasture · **El ganado no pisa los sembrados.** La gente trabaja dentro
  // del campo y por eso el campo es suelo para ella; para vacas, cerdos y
  // gallinas es una cerca. Mismo terreno, con las parcelas cerradas (Vera,
  // 24 sep 2026: «el ganado no debe pisar el campo de cultivo»).
  const pasture = fencedFields(land, state);
  // El corazón de la aldea puede caer dentro de un campo, que para el ganado
  // está cerrado: desde ahí no se alcanzaría nada y no nacería ningún animal.
  const { heart: pastureHeart, shore: pastureShore } = pastureOrigin(pasture, heart, shore);
  const beasts = createBeasts(state, pasture, pastureHeart, seed, pastureShore, preparing);
  const deer = createDeer(state, land, seed, heart);
  const bear = createBear(state, land, heart);
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
  const summons = ordersOf(state, day)
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
    // Y el agua: la sed sí es urgente, y sin pozo ni vado en la lista el
    // sediento se quedaba parado toda la jornada en vez de ir a beber y volver.
    ? [...summons, ...manned.map((post) => post.place),
      ...places.flatMap((place) => {
        const drink = place.offers.filter((offer) => offer.id === 'drink');
        return drink.length === 0 ? [] : [{ ...place, offers: drink }];
      })]
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
  // E0c · La pérdida de la semana anterior es un trasto fijo: no entra en el
  // reparto ni en la física, sólo queda donde el motor ya dijo que se perdió.
  const aftermath = aftermathProps(state, land);
  const props: Prop[] = [...loose, ...given(state, land, loose.length), ...aftermath];
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
      flight: null,
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
  // E0a · El cerco ya se ha repartido arriba. Sólo entonces se buscan de dos
  // a cuatro manos entre los adultos restantes, y una convocatoria del motor
  // conserva su prioridad como hasta ahora.
  const prepSites = preparationSites(state, land, places);
  const preparationTrips = summoned ? [] : planPreparation(state, land, dwellers.map(dweller => ({
    villager: dweller.villager,
    at: dweller.body,
    radius: dweller.body.radius,
    guarding: isPost(dweller.dayPlan?.job?.place ?? ''),
  })), prepSites, seed);
  const preparationByVillager = new Map(preparationTrips.map(trip => [trip.villager, trip]));
  for (const dweller of dwellers) {
    const trip = preparationByVillager.get(dweller.villager);
    if (trip === undefined) continue;
    dweller.doing = {
      place: trip.source,
      offer: trip.source.offers[0]!,
      route: [...trip.toSource],
      seat: trip.sourceSeat,
      since: 0,
      until: 0,
      there: false,
    };
    dweller.rethinkAt = GIVE_UP;
  }
  // E0b · La modal tapa el tramo de salida. El primer fotograma honesto es el
  // de después de decidir: sólo el último registro B2 de este tick abre la
  // vuelta, nunca una modal pendiente ni un aviso viejo.
  const lastDecision = state.history.at(-1);
  const warningWindow = warningActive(lastDecision?.templateId, state.tick, state.threat.comingTick)
    && lastDecision?.tick === state.tick
    // Un tick contiene siete jornadas escénicas. Sin esta puerta, reconstruir
    // el martes volvía a mandar al mismo mensajero porque el historial seguía
    // diciendo «esta semana». El aviso sólo pertenece al primer día visible.
    && day === state.tick * TIME.DAYS_PER_WEEK;
  const approach = warningWindow
    ? approachOf(state, land, heart)
    : null;
  const warningPorters = new Set(preparationTrips.map((trip) => trip.villager));
  if (approach !== null) {
    const messenger = dwellers
      .filter((dweller) => dweller.ageGroup !== 'child'
        && !indoors(dweller)
        && !isPost(dweller.dayPlan?.job?.place ?? '')
        && !warningPorters.has(dweller.villager)
        && dweller.holding === null
        && dweller.flight === null
        && dweller.scene === null
        && dweller.quarrel === null
        && dweller.needs.rest < 0.9
        && dweller.needs.thirst < 0.9)
      .sort((a, b) => a.villager - b.villager)[0];
    if (messenger !== undefined) {
      const warning = beginWarning(messenger.body, land, approach, heart, 0);
      if (warning !== null) {
        messenger.warning = warning;
        messenger.doing = null;
        messenger.faceAnchor = { x: messenger.body.x, z: messenger.body.z };
        messenger.rethinkAt = GIVE_UP;
      }
    }
  }
  // E0 · Al llegar la semana que el motor ya resolvió como `turned_back`, dos
  // o tres adultos existentes sacan la paga por el portón real. No se repite:
  // `payoffActive` sólo abre el primer día de esa semana.
  const payoffWindow = payoffActive(state, day);
  const gateBuilding = payoffWindow
    ? state.buildings.find((building) => building.kind === 'gate' && building.lostTick === null)
    : undefined;
  const payoffApproach = gateBuilding === undefined ? null : approachOf(state, land, heart);
  if (gateBuilding !== undefined && payoffApproach !== null) {
    const gate = { x: gateBuilding.x + gateBuilding.w / 2, z: gateBuilding.y + gateBuilding.h / 2 };
    const candidates = dwellers
      .filter((dweller) => dweller.ageGroup !== 'child'
        && !indoors(dweller)
        && !isPost(dweller.dayPlan?.job?.place ?? '')
        && !warningPorters.has(dweller.villager)
        && dweller.holding === null
        && dweller.flight === null
        && dweller.scene === null
        && dweller.quarrel === null)
      .sort((a, b) => a.villager - b.villager);
    const wanted = 2 + (seed % 2);
    for (const porter of candidates.slice(0, wanted)) {
      const trip = payoffRoute(land, porter.body, gate, payoffApproach, porter.body.radius);
      if (trip === null) continue;
      beginPayoff(porter.body);
      porter.payoff = trip;
      porter.holding = -5_000_000 - porter.body.id;
      porter.doing = null;
      porter.faceAnchor = { x: porter.body.x, z: porter.body.z };
      porter.rethinkAt = GIVE_UP;
    }
  }
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
  // D3b · y si lo de hoy es un **asalto** —el motor lo marca cuando la partida
  // da para tomar el valle (B3)— vienen a por la puerta y no a mirarla.
  const assault = assaultToday(state);
  const raiders: Raider[] = bandSize === 0
    ? []
    : createRaiders(state, land, heart, seed, 0, bandSize, assault);
  // D5 · el portón, como cosa que se rompe. Sólo existe en un asalto: en un
  // saqueo nadie lo toca.
  const gate: Gate | null = assault ? gateNow(state, heart) : null;
  // D6 · un solo reparto de objetivos para toda la jornada. El renderer
  // conserva esta Village durante el tick del asalto, así que el amanecer no
  // vuelve a hacer aparecer a la partida ni duplica sus huellas.
  const sackScene: SackScene | null = assault ? createSackScene(state, land, raiders) : null;
  // D2 · los arqueros de los puestos de C2, sus flechas, y el mundo físico en el
  // que vuelan. La lista de arqueros se saca una vez: los puestos son de la
  // jornada y no cambian a media jornada.
  const archers: Archer[] = archersOf(manned);
  const elevatedPosts = new Map(manned
    .filter((post): post is Manned & { readonly elevated: ElevatedPost } => post.elevated !== undefined)
    .map(post => [post.place.id, post.elevated]));
  const arrows: Arrow[] = [];
  // D4 · los que defienden cada puesto, para que el cuerpo a cuerpo tenga a
  // quién golpear. Se llena al empezar la jornada con quien el reparto haya
  // puesto en cada puesto, y se queda vacío los días de paz.
  const defenders: Defender[] = [];
  /**
   * Los golpes que lleva cada defensor, por persona y para toda la jornada.
   *
   * Hace falta porque la lista de arriba se rehace cada paso —quien se aparta
   * de su puesto deja de pelear— y los golpes no se curan al moverse: sin esto,
   * bastaba con dar un paso atrás para volver a estar entero.
   */
  const wounded = new Map<VillagerId, Defender>();
  const defendedPosts = new Set(manned.map((post) => post.place.id));
  let flightStarted = false;
  const bearFleeing = new Set<number>();
  let physics: Physics | null = options.physics ?? null;
  let physicsAsked = physics !== null;
  let disposed = false;
  let battleEnded = false;
  const ragdollKeys = new Set<string>();
  const pendingRagdolls: RagdollSeed[] = [];

  const flushRagdolls = (): void => {
    if (physics === null) return;
    while (pendingRagdolls.length > 0) {
      const seed = pendingRagdolls.shift();
      if (seed !== undefined) physics.articulate(seed);
    }
  };
  const queueRagdoll = (id: number, bornAt: number, body: Body, facing = body.facing): void => {
    const key = `${id}:${bornAt}`;
    if (ragdollKeys.has(key)) return;
    const seed = options.ragdollSeed?.(id, bornAt, {
      x: body.x, z: body.z, facing, ...(body.y === undefined ? {} : { y: body.y }),
    }) ?? null;
    if (seed === null) return;
    // Un primer fotograma puede no tener todavía el clon del actor. Sólo una
    // semilla capturada ocupa la clave: el siguiente paso podrá reintentarla.
    ragdollKeys.add(key);
    pendingRagdolls.push(seed);
    flushRagdolls();
  };
  let wolf: Wolf | null = null;
  let wolfSpawned = false;
  let wolfNoticedThisVisit = false;
  let wildlifeThreats = 0;
  let wildlifeNoticed = 0;
  let wildlifeRecovered = 0;
  let wildlifeStuck = 0;
  let steps = 0;

  /** E3a · Avanza una escalera privada fuera del router y de la rejilla de suelo. */
  const stepElevatedPost = (dweller: Dweller, phase: number): boolean => {
    const placeId = dweller.dayPlan?.job?.place;
    const assigned = placeId === undefined || placeId === null ? undefined : elevatedPosts.get(placeId);
    const onAssignedPost = assigned !== undefined && dweller.doing?.place.id === placeId;
    let elevated = dweller.elevated;
    const { body } = dweller;

    // El router llega al punto de aproximación de suelo; no se acepta una
    // llegada por alcance antes de estar realmente en su extremo.
    const closeToEntry = assigned !== undefined
      && Math.hypot(body.x - assigned.approach.x, body.z - assigned.approach.z) <= body.radius / 4;
    // De noche no se sube: la guardia bajaría al llegar arriba y la jornada la
    // volvería a mandar al puesto, escalera arriba y abajo hasta el alba.
    if (elevated === undefined && assigned !== undefined && onAssignedPost
      && !dweller.doing!.there
      && !isNight(phase)
      && closeToEntry
      && pathTo(land, body, assigned.approach, body.radius) !== null) {
      // Se toma la cota que Three ya estaba mostrando sobre el suelo antes de
      // entregar el cuerpo a la ruta; el primer segmento llega a `approach`.
      body.y = options.ground?.(body.x, body.z) ?? 0;
      elevated = { post: assigned, phase: 'climb', next: 0 };
      dweller.elevated = elevated;
    }
    if (elevated === undefined) return false;

    // Una caída conserva la cota donde ocurrió; no se usa la escalera como un
    // teletransporte de vuelta al suelo antes de que el combate la resuelva.
    if (wounded.get(dweller.villager)?.down === true) {
      body.vx = 0; body.vz = 0; dweller.motionSpeed = 0;
      return true;
    }

    // Si la intención cambia a media subida se vuelve por los apoyos ya
    // recorridos. Jamás se toma el descenso completo desde la plataforma: eso
    // convertiría un abandono en un salto hasta arriba y abajo.
    if (elevated.phase === 'climb' && !onAssignedPost) {
      elevated.phase = 'descent';
      elevated.route = [...elevated.post.climb.slice(0, elevated.next)].reverse();
      elevated.next = 0;
    }

    const leaving = !onAssignedPost || isNight(phase) || (dweller.doing?.until ?? Number.POSITIVE_INFINITY) <= steps;
    // E3b.3 · A media ronda, la partida a la vista o el fin de la guardia
    // devuelven al puesto por lo ya andado: desde allí se tira, y desde allí
    // se baja por la escalera, nunca dando la vuelta entera.
    if (elevated.phase === 'patrol' && elevated.returning !== true && (leaving || raidersHere(raiders))) {
      // Por el lado más corto: en una vuelta cerrada, lo que queda por delante
      // también acaba en el puesto. Medido en la villa 91: al anochecer iba al
      // 70 % de la vuelta y desandaba ese 70 %.
      const route = elevated.route ?? [];
      const length = (points: readonly ElevatedPoint[]): number => points.reduce((sum, point, index) => {
        const from = index === 0 ? body : points[index - 1]!;
        return sum + Math.hypot(point.x - from.x, point.z - from.z);
      }, 0);
      const back = [...route.slice(0, elevated.next)].reverse();
      const ahead = route.slice(elevated.next);
      if (ahead.length === 0 || length(back) < length(ahead)) { elevated.route = back; elevated.next = 0; }
      elevated.returning = true;
    }

    if (elevated.phase === 'occupied') {
      const leave = leaving;
      if (!leave && elevated.post.patrol !== undefined && !raidersHere(raiders)
        && steps >= (elevated.restUntil ?? 0)) {
        elevated.phase = 'patrol'; elevated.route = elevated.post.patrol; elevated.next = 1;
        delete elevated.returning;
      } else if (!leave) {
        body.x = elevated.post.post.x; body.z = elevated.post.post.z; body.y = elevated.post.post.y;
        body.vx = 0; body.vz = 0; dweller.motionSpeed = 0;
        drift(dweller.needs, dweller.traits, { moving: false, withOthers: false, working: false, hunger }, LIFE_STEP);
        if (dweller.doing !== null) satisfy(dweller.needs, dweller.doing.offer, LIFE_STEP);
        return true;
      }
      if (leave) {
        // Una guardia termina su turno antes de que cualquier nueva rutina o la
        // casa pueda recuperar el cuerpo de suelo.
        dweller.doing = null;
        elevated.phase = 'descent'; elevated.route = elevated.post.descent; elevated.next = 1;
      }
    }

    const route = elevated.route ?? (elevated.phase === 'climb' ? elevated.post.climb : elevated.post.descent);
    const before = { x: body.x, y: body.y ?? elevated.post.approach.y, z: body.z };
    const moved = advanceElevated(before, route, elevated.next, body.pace, LIFE_STEP);
    body.x = moved.at.x; body.z = moved.at.z; body.y = moved.at.y; elevated.next = moved.next;
    const distance = Math.hypot(body.x - before.x, body.y - before.y, body.z - before.z);
    dweller.travelled += distance;
    dweller.motionSpeed = distance / LIFE_STEP;
    if (Math.hypot(body.x - before.x, body.z - before.z) > 1e-9) {
      turnTo(body, Math.atan2(body.x - before.x, body.z - before.z), LIFE_STEP);
    }
    dweller.faceAnchor = { x: body.x, z: body.z };
    drift(dweller.needs, dweller.traits, { moving: distance > 0, withOthers: false, working: false, hunger }, LIFE_STEP);
    if (!moved.arrived) return true;

    if (elevated.phase === 'patrol') {
      // Fin de la ronda, o de la vuelta atrás: al puesto, a descansar.
      elevated.phase = 'occupied'; elevated.next = 0;
      delete elevated.route; delete elevated.returning;
      elevated.restUntil = steps + PATROL_REST_STEPS;
      return true;
    }

    if (elevated.phase === 'climb') {
      elevated.phase = 'occupied'; elevated.next = 0;
      if (dweller.doing !== null) {
        dweller.doing.there = true;
        dweller.doing.until = steps + (dweller.doing.durationSteps ?? Math.round(dweller.doing.offer.seconds[0] * 30));
        dweller.doing.route.length = 0;
      }
      return true;
    }
    // `approach.y` fue la cota que validó la entrada; sólo al coincidir se
    // vuelve a delegar la altura en el suelo normal.
    const groundAtApproach = options.ground?.(body.x, body.z) ?? 0;
    if (Math.abs(body.y - groundAtApproach) > 1e-9) return true;
    delete dweller.elevated;
    delete body.y;
    body.vx = 0; body.vz = 0; dweller.motionSpeed = 0; dweller.rethinkAt = steps;
    return true;
  };
  // V-09: pases de pelota dados en la jornada. Contados igual que en
  // `spike/life.ts` (`world.passes += 1`): cualquier tirada de una pelota a
  // alguien cuenta, aunque no haya nadie a quien apuntar y se tire hacia
  // delante por gusto (`finishHolding`, más abajo).
  let passes = 0;
  let timberDeliveries = 0;
  let stoneDeliveries = 0;
  let harvestDeliveries = 0;
  let preparationDeliveries = 0;
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

  /**
   * Reserva materialmente una plaza de descarga, no sólo un hueco de aforo.
   *
   * La tala llega aquí fuera de `decide()`: contar `taken` bastaba para las
   * ofertas normales, pero no decía qué plaza concreta tenía cada porteador.
   * Mirar las intenciones vivas permite entregar sólo a una plaza que nadie
   * está usando ni persiguiendo todavía. Quien no la encuentre espera donde
   * terminó el tajo; nunca frente a la puerta de la leñera.
   */
  function woodDelivery(body: Body): Intent | null {
    const store = mine.find((place) => place.id.startsWith('wood-store:'));
    const offer = store?.offers.find((item) => item.id === 'deliver');
    if (store === undefined || offer === undefined) return null;
    // Una carga que ya espera tiene prioridad sobre el siguiente talador que
    // acaba justo ahora. Sin este orden estable una espera podría volver a
    // perder la plaza cada vez que otro tajo terminase en el mismo paso.
    const queue = dwellers.filter((dweller) => dweller.holding === -1 - dweller.body.id
      && dweller.doing?.offer.id === 'pause')
      .sort((a, b) => (a.doing!.since - b.doing!.since) || (a.body.id - b.body.id));
    if (queue[0] !== undefined && queue[0].body.id !== body.id) return null;
    const used = new Set(dwellers.flatMap((dweller) => {
      const doing = dweller.doing;
      return doing?.place.id === store.id && doing.offer.id === offer.id ? [doing.seat] : [];
    }));
    for (let seat = 0; seat < offer.seats; seat += 1) {
      if (used.has(seat)) continue;
      const route = pathTo(land, body, seatAt(offer, seat), body.radius);
      if (route === null) continue;
      const durationSteps = Math.round(3 / LIFE_STEP);
      return {
        place: store, offer, seat, route: [...route], since: steps,
        until: steps + durationSteps, durationSteps, there: false,
      };
    }
    return null;
  }

  return {
    land,
    places: mine,
    dwellers,
    beasts,
    props,
    get sack(): SackSnapshot | null { return sackScene === null ? null : sackSnapshot(sackScene); },
    get physics(): PhysicsSnapshot | null { return physics?.snapshot() ?? null; },
    battleWorld(): Physics | null { return physics; },
    raidTick: bandSize === 0 ? null : state.threat.arrivedTick,
    get steps(): number { return steps; },
    get passes(): number { return passes; },
    get timberDeliveries(): number { return timberDeliveries; },
    get stoneDeliveries(): number { return stoneDeliveries; },
    get harvestDeliveries(): number { return harvestDeliveries; },
    get preparation() {
      return { active: preparing, porters: preparationTrips, deliveries: preparationDeliveries };
    },
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

    get arrows(): readonly Arrow[] { return arrows; },

    get defence() {
      return {
        loosed: archers.reduce((sum, archer) => sum + archer.loosed, 0),
        hits: raiders.reduce((sum, raider) => sum + raider.hits, 0),
        fallen: raiders.filter((raider) => raider.phase === 'down').length,
        // D4 · los nuestros que han caído defendiendo. Es el `lost` del parte
        // de B4, y es la primera vez que este número no es cero.
        lost: fallenDefenders([...wounded.values()]),
        gate: gate === null ? null : {
          at: { ...gate.at },
          hitAt: gate.hitAt ?? null,
          hits: gate.hits,
          broken: gate.brokeAt !== null,
          // **Y si alguien pasó por él**, que es otra cosa: una puerta rota con
          // los doce en el suelo no es un valle tomado.
          entered: anyEntered(raiders),
        },
      };
    },

    get wildlife(): readonly Animal[] {
      return [...deerPositions(deer), ...bearPosition(bear), ...(wolf !== null && wolf.phase !== 'gone'
        ? [{ id: wolf.body.id, kind: 'wolf' as const, x: wolf.body.x, y: wolf.body.z }]
        : [])];
    },
    get bearDen() {
      if (bear === null) return null;
      return { x: bear.den.x, z: bear.den.z,
        clearingX: bear.clearing.x, clearingZ: bear.clearing.z,
        facing: Math.atan2(bear.clearing.x - bear.den.x,
          bear.clearing.z - bear.den.z) };
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

    dispose(): void {
      if (disposed) return;
      disposed = true;
      physics?.dispose();
      physics = null;
    },

    endBattle(): void { battleEnded = true; },

    step(phase = 0.45): void {
      const now = steps * LIFE_STEP;
      const starts = dwellers.map(d => ({ x: d.body.x, z: d.body.z, travelled: d.travelled }));
      const raiderStarts = new Map<number, Point>();
      // D6 · el parte ya entró al motor. Desde aquí no se vuelve a disparar,
      // pegar ni decidir nada: sólo acaban rutas/cargas y cuerpos físicos con
      // el mismo paso fijo. Los civiles se quedan donde buscaron refugio (o en
      // reposo) durante los ocho segundos de desenlace.
      if (battleEnded) {
        for (const raider of raiders) {
          raiderStarts.set(raider.body.id, { x: raider.body.x, z: raider.body.z });
          stepRaider(raider, land, seed, steps, gate ?? undefined);
        }
        if (sackScene !== null) props.push(...sackScene.step(raiders, land, seed, steps));
        physics?.step();
        for (const raider of raiders) {
          const start = raiderStarts.get(raider.body.id);
          if (start !== undefined) raider.travelled = (raider.travelled ?? 0) + gap(start, raider.body);
        }
        steps += 1;
        return;
      }
      const liveInvaders = (): Raider[] => raiders.filter((raider) => raider.entered
        && raider.phase !== 'gone' && raider.phase !== 'down');
      // Una vez que el último que entró deja de estar vivo dentro, la reacción
      // termina. No se inicia otra vez con el recuerdo `entered` de un `gone`.
      if (flightStarted && liveInvaders().length === 0) {
        for (const dweller of dwellers) {
          if (dweller.flight === null || dweller.flight === undefined) continue;
          dweller.flight = null;
          dweller.rethinkAt = steps;
          dweller.body.vx = 0;
          dweller.body.vz = 0;
          dweller.motionSpeed = 0;
        }
      }
      const outside = (): Body[] => [...bodies.filter(body => {
        const person = byId.get(body.id);
        return person === undefined || (!indoors(person) && person.elevated === undefined
          && wounded.get(person.villager)?.down !== true);
      }), ...raiders
        .filter((raider) => raider.phase !== 'gone' && raider.phase !== 'down')
        .map((raider) => raider.body)];
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
      // Los restos del saqueo no son recursos ni ofertas. El barril fijo sí
      // conserva su bebida; el arado no tiene oferta propia.
      const propOptions = props.length === 0 ? []
        : propPlaces(props.filter((prop) => prop.fixed !== true || prop.kind === 'barrel'), now, land);

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

        // D4 · **al que cayó defendiendo se le acabó la jornada.** Sin esto un
        // muerto seguía su día —iba a beber, volvía a casa— y el motor lo
        // enterraba la semana siguiente: una mentira de las que se ven. Se
        // queda donde cayó; que **se vea** caído es otra cosa y falta el clip
        // (E1, `fall`), anotado en `encargos-3d.md`.
        if (wounded.get(dweller.villager)?.down === true) {
          body.vx = 0;
          body.vz = 0;
          dweller.doing = null;
          dweller.flight = null;
          continue;
        }

        // La escalera posee el cuerpo antes de avisos, escenas, regreso y
        // movimiento ordinario: ninguna rutina de suelo puede recuperar su X/Z
        // mientras atraviesa una celda que la máscara mantiene cerrada.
        if (stepElevatedPost(dweller, phase)) continue;

        // E0 · La carga llega primero a la ladera. Cuando acaba, el vecino
        // recupera su jornada normal; la plata no deja una orden colgada.
        if (dweller.payoff !== undefined) {
          const before = { x: body.x, z: body.z };
          const active = stepPayoff(body, dweller.payoff, land, around);
          const distance = gap(before, body);
          dweller.travelled += distance;
          dweller.motionSpeed = distance / LIFE_STEP;
          dweller.faceAnchor = { x: body.x, z: body.z };
          if (active) continue;
          delete dweller.payoff;
          dweller.holding = null;
          dweller.rethinkAt = steps;
        }

        // E0b · El aviso se mueve antes de que el día normal elija oferta. Al
        // terminar limpia su propio estado y vuelve al reparto sin tocar el
        // estado congelado del motor.
        if (dweller.warning !== undefined) {
          if (!warningWindow) {
            delete dweller.warning;
            dweller.rethinkAt = steps;
            continue;
          }
          const before = { x: body.x, z: body.z };
          const active = stepWarning(body, dweller.warning, land, around);
          const distance = gap(before, body);
          dweller.travelled += distance;
          dweller.motionSpeed = distance / LIFE_STEP;
          dweller.faceAnchor = { x: body.x, z: body.z };
          if (active) continue;
          delete dweller.warning;
          dweller.rethinkAt = steps;
        }

        // E1 · Una huida ya empezada manda sobre la rutina, la casa nocturna y
        // las ofertas. Al llegar se queda quieto hasta que cese la entrada; no
        // vuelve a trabajar ni reproduce carrera sin avanzar.
        if (dweller.flight !== null && dweller.flight !== undefined) {
          const before = { x: body.x, z: body.z };
          const moving = stepFlight(body, dweller.flight, land, around);
          const distance = gap(before, body);
          if (moving) dweller.travelled += distance;
          dweller.motionSpeed = distance / LIFE_STEP;
          dweller.faceAnchor = { x: body.x, z: body.z };
          drift(dweller.needs, dweller.traits, {
            moving, withOthers: false, working: false, hunger,
          }, LIFE_STEP);
          continue;
        }

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
        // impulso al máximo, `docs/historico/life-rounds/IA-6.md` §4.3).
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
          // medida que docs/historico/rework.md §3.6 dejó sin mover, parados con un impulso
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
        // impulso al máximo de 0,06 % a 0,20 % (`docs/historico/life-rounds/IA-6.md` §4.3),
        // porque se volvía a elegir la misma plaza inalcanzable. Con ella:
        // parados 0,08 %, y los giros suben de 0,37 % a 0,54 % porque quien
        // abandona ahora **se da la vuelta y va a otro sitio**, que es lo que
        // debe pasar — antes se quedaba clavado mirando a la plaza fallida.
        // Aquí queda sólo el final normal de una ocupación cumplida.
        if (dweller.doing !== null && dweller.doing.there && steps >= dweller.doing.until) {
          // E0a · La ida exterior acaba al coger una carga visible; la vuelta
          // usa otra ruta real hasta el almacén. No hay inventario aquí: el
          // coste y la protección ya los resolvió el motor al elegir `brace`.
          const preparation = preparationByVillager.get(dweller.villager);
          if (preparation !== undefined && dweller.doing.offer.id === 'prepare-load') {
            const targetOffer = preparation.target.offers[0];
            const target = targetOffer === undefined ? null : seatAt(targetOffer, preparation.targetSeat);
            const route = target === null ? null : pathTo(land, body, target, body.radius);
            if (targetOffer !== undefined && route !== null) {
              dweller.holding = preparation.load === 'grain'
                ? -4_000_000 - body.id
                : -100_000 - body.id;
              dweller.doing = {
                place: preparation.target,
                offer: targetOffer,
                seat: preparation.targetSeat,
                route: [...route],
                since: steps,
                until: steps,
                there: false,
              };
              dweller.rethinkAt = steps + GIVE_UP;
              continue;
            }
          }
          if (preparation !== undefined && dweller.doing.offer.id === 'prepare-store') {
            preparationDeliveries += 1;
            // Hasta cuatro cargas quedan bajo techo durante la jornada. Son
            // huella visual, no existencias, y no se vuelven a ofrecer.
            const load: Prop = {
              id: -40_000_000 - preparationDeliveries,
              kind: preparation.load,
              x: body.x, z: body.z, y: 0,
              vx: 0, vz: 0, vy: 0, held: null,
              restUntil: Number.POSITIVE_INFINITY, for: null,
            };
            props.push(load);
            propsById.set(load.id, load);
            dweller.holding = null;
          }
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
          // Una tanda de hachazos toma un haz visible. La descarga se intenta
          // justo debajo: si los dos puestos están ocupados, el porteador
          // espera lejos de la puerta conservando la carga, y vuelve a probar.
          const felling = dweller.doing.place.id.startsWith('felling:')
            && dweller.dayPlan?.job?.place.startsWith('felling:') === true;
          if (felling) dweller.holding = -1 - body.id;
          if (dweller.holding === -1 - body.id && dweller.doing.offer.id !== 'deliver') {
            const before = dweller.doing;
            const delivery = woodDelivery(body);
            dweller.doing = delivery ?? pauseHere(body, land, router, seed, body.id, steps, dweller.traits, body.pace);
            // La transición manual no pasa por `decide()`: debe liberar el
            // tajo y ocupar exactamente la descarga o la espera que acaba de
            // elegir, igual que cualquier otra intención.
            moveSeat(taken, before, dweller.doing);
            prog.at = steps + PROGRESS_CHECK;
            prog.gap = Number.POSITIVE_INFINITY;
            prog.stalls = 0;
            // El viaje y la descarga son una sola tarea. La espera conserva
            // el haz y sólo termina para volver a pedir una plaza libre.
            dweller.rethinkAt = steps + GIVE_UP;
            continue;
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
            // IA-piles · La carga se guarda: entra en el leñero y no se deja al
            // lado. Hasta el 24 sep quedaban hasta tres haces sueltos junto a la
            // descarga toda la jornada, y Vera los vio como material olvidado.
            // Lo que se ve crecer es el leñero, que sale de `village.wood`.
          }
          if (dweller.doing.offer.id === 'deliver-stone'
            && dweller.holding !== null && dweller.holding <= -1_000_000) {
            stoneDeliveries += 1;
            // La piedra la consume la obra: no queda un canto suelto al lado.
          }
          if (dweller.doing.offer.id === 'deliver-grain'
            && dweller.holding !== null && dweller.holding <= -2_000_000) {
            harvestDeliveries += 1;
            // Y el grano entra en el granero.
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
          if (!elevatedPosts.has(dweller.doing.place.id)
            && Math.hypot(spot.x - body.x, spot.z - body.z) <= dweller.doing.offer.reach * 0.6) {
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
        // **La intención cumplida frena de verdad** (docs/historico/rework.md §3.5.3):
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

        // IA-anim · Quien tala mira al árbol y quien pica, a la roca: la plaza
        // está en suelo pisable junto a la celda, y llegar andando dejaba la
        // cara hacia donde venía, hachazos al aire de espaldas al tronco.
        if (speed <= 0.05 && dweller.doing?.there === true && dweller.doing.offer.id === 'work') {
          const [kind, cell] = dweller.doing.place.id.split(':');
          if ((kind === 'felling' || kind === 'quarry') && cell !== undefined) {
            const index = Number(cell);
            // Al tronco de verdad que tiene delante: su plaza puede ser la de
            // otro árbol del borde (`offers.ts`, `nearTrees`).
            const trunk = kind === 'felling' ? nearestTrunk(state, body) ?? scatterTransform(land.width, index) : null;
            const tx = trunk?.x ?? index % land.width + 0.5, tz = trunk?.z ?? Math.floor(index / land.width) + 0.5;
            // Y se gira lo justo para que la cabeza de la herramienta, que no
            // cae recta delante del cuerpo (`STRIKE_HEAD`), dé en el blanco.
            if (Math.hypot(tx - body.x, tz - body.z) > 0.05) {
              turnTo(body, Math.atan2(tx - body.x, tz - body.z) - strikeTurn(kind === 'felling' ? 'chop' : 'mine'), LIFE_STEP);
            }
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
      //      «siguen andando» (docs/historico/life-ai-proposal.md §7) — así que va
      //      después del bucle principal y no dentro, sin ganarle la mano a
      //      nada de lo que ya ha decidido este paso.
      for (const active of greetings) {
        const a = byId.get(active.greeting.a);
        const b = byId.get(active.greeting.b);
        if (a === undefined || b === undefined) continue;
        // **El mismo umbral contra la vuelta sobre sí mismo que el resto del
        // valle** (docs/historico/rework.md §3.5.3, `TURN_MIN_SPEED`): un saludo es un gesto
        // de quien anda, y sobrescribir la cara de quien está casi parado
        // —por ejemplo, a un paso de que `decide()` le mande a otra cosa— es
        // justo el defecto que esa regla existe para evitar. Medido: sin este
        // umbral, `tools/reports/life-report.ts` subía los giros de 0,34 % a 0,43 %;
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
      //    primer pase (medido, `docs/historico/life-rounds/V-09.md`).
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
      for (const raider of raiders) {
        raiderStarts.set(raider.body.id, { x: raider.body.x, z: raider.body.z });
        stepRaider(raider, land, seed, steps, gate ?? undefined);
      }
      if (sackScene !== null) props.push(...sackScene.step(raiders, land, seed, steps));

      // E1 · La entrada que dispara la huida es un cuerpo hostil vivo con
      // `entered`, no la puerta rota ni el recuerdo de uno que ya se fue. Hoy
      // `stepRaider` marca `inside` justo antes del cruce visual de la hoja; no
      // se redefine aquí ese contrato de B4.
      const inside = liveInvaders();
      if (!flightStarted && inside.length > 0) {
        flightStarted = true;
        const threat = inside.reduce((at, raider) => ({
          x: at.x + raider.body.x / inside.length,
          z: at.z + raider.body.z / inside.length,
        }), { x: 0, z: 0 });
        const fleeing = new Set<number>();
        for (const dweller of dwellers) {
          if (indoors(dweller) || wounded.get(dweller.villager)?.down === true
            || defendedPosts.has(dweller.dayPlan?.job?.place ?? '')) continue;
          const flight = beginFlight(dweller.body, land, threat, dweller.home, seed, steps);
          if (flight === null) continue;
          dweller.flight = flight;
          fleeing.add(dweller.body.id);
        }

        // La alarma corta lo que estuvieran haciendo: una conversación o un
        // pase no puede volver a imponer velocidad en el paso siguiente.
        const interruptedScenes = scenes.filter((scene) => fleeing.has(scene.a) || fleeing.has(scene.b));
        for (const scene of interruptedScenes) {
          closeScene(byId.get(scene.a), scene, steps);
          closeScene(byId.get(scene.b), scene, steps);
          commitments.release(sceneCommitmentId(scene));
          interactionsInvalidated += 1;
        }
        if (interruptedScenes.length > 0) scenes = scenes.filter((scene) => !interruptedScenes.includes(scene));

        const interruptedYields = yieldings.filter((active) => fleeing.has(active.yielding.yielder)
          || fleeing.has(active.yielding.passer));
        for (const active of interruptedYields) {
          commitments.release(active.id);
          interactionsInvalidated += 1;
        }
        if (interruptedYields.length > 0) yieldings = yieldings.filter((active) => !interruptedYields.includes(active));

        const interruptedGreets = greetings.filter((active) => fleeing.has(active.greeting.a)
          || fleeing.has(active.greeting.b));
        for (const active of interruptedGreets) {
          commitments.release(active.id);
          interactionsInvalidated += 1;
        }
        if (interruptedGreets.length > 0) greetings = greetings.filter((active) => !interruptedGreets.includes(active));

        if (activeQuarrel !== null && (fleeing.has(activeQuarrel.scene.a)
          || fleeing.has(activeQuarrel.scene.b))) {
          const a = byId.get(activeQuarrel.scene.a);
          const b = byId.get(activeQuarrel.scene.b);
          if (a?.quarrel === activeQuarrel.scene) a.quarrel = null;
          if (b?.quarrel === activeQuarrel.scene) b.quarrel = null;
          commitments.release(activeQuarrel.id);
          storiesInvalidated += 1;
          activeQuarrel = null;
        }

        for (const dweller of dwellers) {
          if (!fleeing.has(dweller.body.id)) continue;
          const commitment = commitments.of(actorOf(dweller));
          if (commitment !== undefined) commitments.release(commitment.id);
          if (dweller.holding !== null) {
            const held = propsById.get(dweller.holding);
            if (held !== undefined) drop(held, dweller, land);
          }
          dweller.holding = null;
          dweller.aimAt = null;
          dweller.doing = null;
          dweller.scene = null;
          dweller.quarrel = null;
          dweller.body.vx = 0;
          dweller.body.vz = 0;
          dweller.motionSpeed = 0;
        }
      }

      // D2 · **y la muralla contesta.** Un paso de física por paso de vida, que
      // es el matrimonio que D1 dejó montado; las flechas salen de los puestos
      // de C2 y lo que le pasa a quien la recibe lo decide el vuelo (§1b).
      if (physics === null && !physicsAsked && raidersHere(raiders)) {
        physicsAsked = true;
        const platformCells = mannedPlatformCells(manned);
        const rampartObstacles = new Set(manned.flatMap(post => post.rampart === undefined ? [] : [post.rampart.obstacles]));
        const obstacles = [...[...rampartObstacles].flat(), ...manned.flatMap(post => post.elevated === undefined || post.rampart !== undefined ? []
          : post.elevatedVariant === 'wall'
            ? bastionWalkwayParapetObstacles({ x: post.post.x, z: post.post.y }, post.elevated.access)
            : bastionParapetObstacles({ x: post.post.x, z: post.post.y }, post.elevated.access))];
        const physicsOptions: PhysicsOptions = {
          ...(options.ground === undefined ? {} : { ground: options.ground }),
          ...(platformCells.length === 0 ? {} : { platformCells }),
          ...(obstacles.length === 0 ? {} : { obstacles }),
        };
        void createPhysics(land, physicsOptions).then((world) => {
          if (disposed) world?.dispose();
          else { physics = world; flushRagdolls(); }
        });
      }
      if (physics !== null && (physics.count > 0 || arrows.length > 0 || raidersHere(raiders))) {
        physics.step();
        // **Y sólo dispara el puesto que tiene a alguien dentro.** Se recalcula
        // cada paso porque el arquero llega, se va a beber y vuelve: lo que
        // decide si la muralla contesta es quién está en ella **ahora**.
        const held = new Set<string>();
        const occupants = new Map<string, { x: number; y?: number; z: number }>();
        for (const post of manned) {
          const there = dwellers.find((dweller) =>
            wounded.get(dweller.villager)?.down !== true
            && dweller.dayPlan?.job?.place === post.place.id
            && (post.elevated === undefined
              ? Math.hypot(dweller.body.x - post.place.at.x, dweller.body.z - post.place.at.z) < POST_REACH
              : dweller.elevated?.phase === 'occupied' && dweller.elevated.post === post.elevated
                && Math.hypot(dweller.body.x - post.elevated.post.x,
                  (dweller.body.y ?? 0) - post.elevated.post.y,
                  dweller.body.z - post.elevated.post.z) < 1e-6));
          if (there !== undefined) {
            held.add(post.place.id);
            occupants.set(post.place.id, there.body);
          }
        }
        stepArchery(archers, raiders, arrows, physics, steps, held, occupants);
      }

      // D4 no usa Rapier: distancia y reloj de golpes bastan. Encerrarlo en
      // la rama de arquería dejaba invulnerables a ambos bandos sin arcos,
      // porque el renderer sólo pide física cuando hay quien dispare.
      if (raidersHere(raiders)) {
        // La lista se rehace con quien esté de verdad en su puesto:
        // el que va de camino no pelea, y el que ha caído tampoco.
        defenders.length = 0;
        for (const post of manned) {
          const there = dwellers.find((dweller) =>
            wounded.get(dweller.villager)?.down !== true
            &&
            dweller.dayPlan?.job?.place === post.place.id
            && (post.elevated === undefined
              ? Math.hypot(dweller.body.x - post.place.at.x, dweller.body.z - post.place.at.z) < POST_REACH
              : dweller.elevated?.phase === 'occupied' && dweller.elevated.post === post.elevated
                && Math.hypot(dweller.body.x - post.elevated.post.x,
                  (dweller.body.y ?? 0) - post.elevated.post.y,
                  dweller.body.z - post.elevated.post.z) < 1e-6));
          if (there === undefined) continue;
          const already = wounded.get(there.villager);
          const defender: Defender = already ?? {
            at: there.body, post, hits: 0, down: false,
          };
          wounded.set(there.villager, defender);
          defenders.push(defender);
        }
        stepMelee(raiders, defenders, steps);
      }

      // Física nacida en la transición exacta a `down`, no al FPS al que el
      // renderer alcance a pintar el clip. Si Rapier sigue cargando, se guarda
      // la semilla ya posada y se articula cuando llegue el mundo.
      for (const raider of raiders) {
        if (raider.phase === 'down') queueRagdoll(raider.body.id, raider.downAt ?? steps, raider.body,
          raider.meleeFacing ?? raider.body.facing);
      }
      for (const [id, defender] of wounded) {
        if (!defender.down) continue;
        // `wounded` se indexa por el id persistente del aldeano; `byId` por
        // diseño usa el id del cuerpo. Coinciden por casualidad al fundar y
        // divergen en cuanto se recoloca la jornada: buscar el campo correcto
        // evita sembrar el ragdoll del defensor sobre otro vecino.
        const dweller = dwellers.find((candidate) => candidate.villager === id);
        if (dweller !== undefined) queueRagdoll(id, defender.downAt ?? steps, dweller.body,
          defender.meleeFacing ?? dweller.body.facing);
      }

      // El hecho manda sobre el gesto. La caída gana a todo, también en el
      // paso del impacto; ninguna ausencia de fotogramas reinicia estos relojes.
      for (const dweller of dwellers) {
        const hurt = wounded.get(dweller.villager);
        if (hurt?.down === true) {
          dweller.combat = { clip: 'fall', since: hurt.downAt ?? steps,
            facing: dweller.combat?.facing ?? dweller.body.facing };
          dweller.body.vx = 0; dweller.body.vz = 0; dweller.motionSpeed = 0;
          continue;
        }
        const melee = hurt === undefined ? null : meleePose(hurt, steps);
        if (melee !== null) {
          dweller.combat = melee;
          continue;
        }
        const archer = archers.find(a => a.post.place.id === dweller.dayPlan?.job?.place);
        const elevatedReady = archer?.post.elevated !== undefined
          && dweller.elevated?.phase === 'occupied' && dweller.elevated.post === archer.post.elevated
          && Math.hypot(dweller.body.x - archer.post.elevated.post.x,
            (dweller.body.y ?? 0) - archer.post.elevated.post.y,
            dweller.body.z - archer.post.elevated.post.z) < 1e-6;
        const groundReady = archer?.post.elevated === undefined && archer !== undefined
          && Math.hypot(dweller.body.x - archer.post.place.at.x,
            dweller.body.z - archer.post.place.at.z) < POST_REACH;
        if (!elevatedReady && !groundReady) {
          delete dweller.combat;
          continue;
        }
        const looseSteps = Math.round(VILLAGER_CLIPS.bow_loose.seconds / LIFE_STEP);
        const releasing = archer.lastShot !== undefined && steps - archer.lastShot < looseSteps;
        const since = releasing ? archer.lastShot!
          : archer.lastShot !== undefined ? archer.lastShot + looseSteps
            : dweller.combat?.since ?? steps;
        dweller.combat = { clip: releasing ? 'bow_loose' : 'bow_draw', since,
          facing: archer.facing ?? dweller.body.facing };
      }

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

      if (bear !== null) {
        stepBear(bear, land, seed, steps, dwellers);
        if (bear.phase === 'warning' && raiders.length === 0) {
          for (const dweller of dwellers) {
            if (indoors(dweller) || dweller.flight !== null || dweller.scene !== null
              || dweller.quarrel !== null || dweller.holding !== null
              || dweller.elevated !== undefined || dweller.combat !== undefined
              || Math.hypot(dweller.body.x - bear.body.x, dweller.body.z - bear.body.z) > 6) continue;
            const flight = beginFlight(dweller.body, land, bear.body, dweller.home, seed, steps);
            if (flight === null) continue;
            dweller.flight = flight;
            dweller.doing = null;
            bearFleeing.add(dweller.body.id);
          }
        } else if (bear.phase === 'gone' && bearFleeing.size > 0) {
          for (const dweller of dwellers) {
            if (!bearFleeing.has(dweller.body.id)) continue;
            dweller.flight = null;
            dweller.rethinkAt = steps;
          }
          bearFleeing.clear();
        }
      }
      stepDeer(deer, land, seed, steps, dwellers,
        wolf !== null && wolf.phase !== 'gone' ? wolf.body : null,
        bear !== null && bear.phase !== 'gone' ? bear.body : null);

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
      stepBeasts(beasts, pasture, around, router, seed, steps, taken, commitments,
        (bodyId) => {
          const person = byId.get(bodyId);
          return person?.doing?.there === true ? person.doing.offer.id : null;
        },
        wolf !== null && wolf.phase !== 'gone' ? { x: wolf.body.x, z: wolf.body.z } : null);

      resolve(outside(), around, land);
      // La zancada del clan sigue el suelo final, incluida la corrección física
      // del gentío. Contarla antes de `resolve` haría patinar justo al separarse.
      for (const raider of raiders) {
        const start = raiderStarts.get(raider.body.id);
        if (start === undefined) continue;
        raider.travelled = (raider.travelled ?? 0) + gap(start, raider.body);
      }
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
        && (d.flight === null || d.flight === undefined)
        && (steps >= d.sceneCooldownUntil || isNight(phase) || (!quarrelStaged && quarrelPair?.includes(d.villager) === true))
        && !commitments.busy(actorOf(d));
      const onDuty = (d: Dweller): boolean => d.holding !== null && d.holding < 0
        || d.doing?.offer.id === 'deliver' || d.doing?.offer.id === 'deliver-stone'
        || d.doing?.offer.id === 'deliver-grain'
        || d.doing?.offer.id.startsWith('prepare') === true
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

          // Orden de prioridad, docs/historico/life-ai-proposal.md §3.2: primero el
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
