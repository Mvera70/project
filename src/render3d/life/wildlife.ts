// IA-5 · El lobo del corral, con cuerpo. docs/life-ai-implementation-prompt.md,
// design.md §7.7, §7.10, Anexo E.
//
// **El hecho real ya existe en el motor.** `wolves_at_the_coop` (§7.10) se
// lleva una o dos gallinas en invierno y lo deja escrito en
// `state.happenings`, sin decir a quién: no hay una gallina con nombre, sólo
// una cuenta que `world/fate.ts` ya restó de `state.herd.hens` antes de que la
// vida vea el estado de hoy. Antes de esta fase el lobo era decorado puro
// (`derive/animals.ts`, `wildlifePositions`): un círculo alrededor de un árbol
// cualquiera cada noche de invierno, sin relación con si el suceso había
// pasado esa semana o no — trece sucesos al año y un lobo pintado casi cada
// noche fría, la mayoría sin nada detrás.
//
// **Ahora hay uno solo, y sólo la semana del suceso de verdad**
// (`staging.wolfRaidToday`): sale del bosque más cercano al corral, se planta
// junto a las gallinas un rato y vuelve al bosque. No come ninguna — el motor
// ya decidió cuántas se llevó antes de que empiece el día, y esto sólo lo
// enseña (E.8: «no conviertas una conducta visual en consecuencia mecánica»).
// La única consecuencia de verdad es que las gallinas huyen mientras está
// cerca, y eso vive en `life/beasts.ts` reutilizando el mismo reflejo que ya
// tenían con una persona (`flee()`), no un mecanismo nuevo: huir de un lobo no
// reserva a nadie, igual que huir de una visita — no es un compromiso y no
// hace falta el registro de IA-2 para ello.
//
// **Navegado, no sólo guionizado.** La primera versión de esta fase iba en
// línea recta con `seek`/`avoid`, sin `Router`: medido con `foundTwenty`
// contra cuarenta años de historia real, se quedaba corta —un lobo que nace a
// varias celdas del corral, detrás de una casa, se atascaba contra la pared
// buscando una recta que no existía y la visita se daba por «plantada donde
// haya llegado» sin haber llegado a ver una sola gallina—. `Router`/`pathTo`
// (`navigate.ts`) es el mismo A* con el que ya anda cualquier persona o
// bestia de esta capa: reutilizarlo, y no inventar una segunda navegación
// aparte, es lo que garantiza que el lobo llega de verdad y nunca atraviesa
// una pared para conseguirlo.
//
// Los tres topes de pasos (`approachDeadline`, `lingerUntil`,
// `retreatDeadline`) siguen aquí como red de seguridad, no como plan: con
// ruta de verdad casi nunca deberían saltar, y si saltan es la señal de que
// algo se ha atascado de verdad (`Wolf.forced`, contado en `village.ts`).

import { ANIMALS } from '@engine/balance';
import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import { avoid, drive, seek } from './steering';
import {
  integrate, turnTo, type Body, type Point, type Terrain,
} from './body';
import { follow, type Router, type Waypoint } from './navigate';
import { canReach } from './terrain';
import { LIFE_STEP, stepOfPhase } from './clock';

/**
 * El id de cuerpo del lobo. Su propio rango, aparte del de las personas
 * (0..) y de la cabaña (`BEAST_ID_BASE = 10_000`, `beasts.ts`): un lobo nunca
 * comparte identificador con nadie más de esta capa. A lo sumo hay un lobo a
 * la vez (una visita por jornada), así que basta un único valor fijo.
 */
const WOLF_ID = 20_000;

/**
 * El paso de la jornada en el que puede aparecer el lobo.
 *
 * TUNE: mitad de la jornada (fase 0,5), no la noche cerrada de §10.6
 * (`NIGHT`, `derive/animals.ts`, 0,8). Con la ruta de verdad (ver la nota de
 * arriba) el trayecto puede ser de hasta `SPAWN_RANGE` celdas de bosque más
 * el rodeo de un edificio de por medio, y confinar la visita entera a los
 * 720 pasos que quedan tras `NIGHT` la dejaba corta en las aldeas donde el
 * corral no está a un paso del borde del mapa — medido: forzada en la
 * semilla 11 de `docs/historico/life-rounds/evidencia-capturas.md`. A mitad de jornada
 * quedan 1800 pasos, el doble largo, y sigue siendo la tarde cayendo — no el
 * mediodía —, que es lo bastante tarde para que se lea como una visita fuera
 * de horas.
 */
export const WOLF_START_STEP = stepOfPhase(0.5);

/**
 * Radio del cuerpo del lobo, en celdas.
 *
 * TUNE: 0,28. No hay una medida propia —ningún brief ni captura ha puesto un
 * lobo en pantalla todavía— así que se parte de la comparación menos mala:
 * más que una gallina (0,14) y menos que un cerdo (0,24) o una vaca (0,4),
 * `RADIUS` en `beasts.ts`. Queda para revisar con la primera captura real.
 */
const RADIUS = 0.28;

/**
 * Lo que anda el lobo sin que nada le retenga, en celdas por segundo.
 *
 * TUNE: 0,75. Más rápido que cualquier bicho del corral —la gallina, la más
 * rápida de las tres, anda a 0,55 (`PACE.hen`, `beasts.ts`)— porque un lobo
 * cazando no pasea. No es una medida, es la comparación disponible.
 */
const PACE = 0.75;

/** A qué distancia de su objetivo se da el lobo por llegado, en celdas.
 *
 * TUNE: 1,4. El mismo orden que el empujón lateral de `anchorOf` en
 * `beasts.ts` (1,4): de sobra para plantarse junto a las gallinas sin exigir
 * el metro exacto, que además no tendría sentido para un cuerpo que amenaza
 * y no que se sienta.
 */
const ARRIVE_RADIUS = 1.4;

/**
 * Margen sobre el tiempo que la propia ruta calculada dice que cuesta, antes
 * de dar la visita por plantada donde haya llegado.
 *
 * TUNE: el doble, más dos segundos fijos. La ruta (`Router.to`) ya sortea
 * paredes y esquinas, así que lo que queda por cubrir es el frenado de
 * `seek` al final de cada tramo y el forcejeo de `avoid` si el camino roza
 * algo — nunca un rodeo entero más—, y el doble de margen es coherente con
 * lo que ya usa `GIVE_UP`/`noProgress` en el resto de esta capa (`village.ts`,
 * `decide.ts`) para lo mismo: esperar más de lo que cuesta en teoría antes de
 * llamarlo un atasco.
 */
const ROUTE_MARGIN_FACTOR = 2;
const ROUTE_MARGIN_SECONDS = 2;

/**
 * Tope absoluto de un tramo (ida o vuelta) si ni siquiera hay ruta —el
 * corral y el bosque en orillas distintas, rarísimo pero no imposible— para
 * que la visita no dependa de una división por un camino vacío.
 *
 * TUNE: 900 pasos (30 s escénicos): a paso de lobo (0,75 cel/s) son 22,5
 * celdas en línea recta, más que `SPAWN_RANGE` (14): de sobra para cualquier
 * trayecto real y corto comparado con los 1800 pasos que quedan desde
 * `WOLF_START_STEP`.
 */
const NO_ROUTE_DEADLINE_STEPS = 900;

/** Cuánto ronda el lobo junto al corral, en segundos escénicos.
 *
 * TUNE: 4 a 6. Ni un parpadeo que nadie llegue a ver, ni tanto que la
 * jornada entera sea el lobo.
 */
const LINGER_SPAN: readonly [number, number] = [4, 6];

/** Hasta dónde se busca bosque alrededor del corral, en celdas.
 *
 * Reutiliza `ANIMALS.WOLF_RANGE` (`balance.ts`), la misma que ya usa el lobo
 * decorativo para buscar árbol cerca del centro de la aldea
 * (`derive/animals.ts`, `nearbyCells`): no hay una medida propia mejor, y
 * partir de la ya calibrada evita una segunda cifra para lo mismo.
 */
const SPAWN_RANGE = ANIMALS.WOLF_RANGE;

function stepsOf(seconds: number): number {
  return Math.max(1, Math.round(seconds / LIFE_STEP));
}

/**
 * Cada cuánto se comprueba que el tramo avanza de verdad, en pasos, y cuánto
 * tiene que haberse acercado al objetivo final en ese tiempo.
 *
 * TUNE: 2 s y 0,15 celdas. Medido con `foundTwenty` contra cuarenta años
 * reales (semilla 11, tick 43): el lobo se quedaba **ochocientos pasos**
 * clavado a 3,94 celdas del corral, justo delante de un punto de paso donde
 * `seek()` y `avoid()` (`steering.ts`) se cancelaban casi del todo — el mismo
 * mínimo local que el resto de esta capa evita con `noProgress()`
 * (`decide.ts`), sólo que aquí no hay una `Offer`/`Intent` de la que
 * colgarse—. Igual que `noProgress()`, se mide contra el **objetivo final**
 * y no contra el punto de paso de turno: un primer intento que sólo
 * abandonaba el punto de paso y seguía con el siguiente resolvía el síntoma a
 * medias —el lobo volvía a clavarse buscando el mismo punto por el mismo
 * camino en cuanto `avoid()` lo devolvía al mismo sitio— y la regla séptima
 * de E.3 («a la tercera sin cuadrar, para y mira el modelo, no el número»)
 * es la que hizo mirar qué mide `noProgress()` de verdad.
 *
 * **Y espera creciente, no fija**, por el mismo motivo que allí: la primera
 * vez sin avance da sólo dos segundos más de margen, y si vuelve a
 * atascarse la espera se dobla, hasta `PROGRESS_MAX_STALLS` veces.
 */
const PROGRESS_CHECK_STEPS = stepsOf(2);
const PROGRESS_MIN_GAIN = 0.15;
const PROGRESS_MAX_STALLS = 4;

/** En qué compás va la visita: acercarse, rondar, volver, o ya se ha ido. */
type WolfPhase = 'approach' | 'linger' | 'retreat' | 'gone';

/** El lobo de una visita, entero. */
export interface Wolf {
  readonly body: Body;
  /** De dónde salió — y a donde vuelve. */
  readonly spawn: Point;
  /** El corral que visita. */
  readonly target: Point;
  phase: WolfPhase;
  /** La ruta que le queda por andar en el tramo actual (ida o vuelta). */
  route: Waypoint[];
  /** Paso a partir del cual el tramo actual se da por plantado si no ha
   *  llegado — calculado de la propia ruta, no un número fijo. Red de
   *  seguridad última: con el aviso de progreso de abajo, casi nunca salta. */
  deadline: number;
  /** Lo que quedaba al objetivo final, la última vez que se comprobó el
   *  avance (`PROGRESS_CHECK_STEPS`). */
  progressGap: number;
  /** Paso en el que toca la próxima comprobación de avance. */
  progressAt: number;
  /** Cuántas comprobaciones seguidas no han mejorado, hasta
   *  `PROGRESS_MAX_STALLS` — la espera creciente de `noProgress()`. */
  progressStalls: number;
  /** Paso hasta el que dura `linger`, sorteado una vez al entrar en él. */
  lingerUntil: number;
  /**
   * Si algún tope de pasos ha tenido que cortar la visita en vez de que
   * terminara sola —llegar de verdad, o volver de verdad—. Por construcción
   * la visita siempre acaba (nunca es una intención que se repite para
   * siempre, E.7), pero esto distingue un final limpio de uno forzado, que
   * es justo la cuenta que pide el brief de la fase («cuántas se quedan
   * colgadas»): con ruta de verdad y el margen de arriba, tiene que quedarse
   * en `false` casi siempre.
   */
  forced: boolean;
}

/**
 * El punto de bosque más cercano a `from` **en la misma orilla**, o `from`
 * mismo si no hay ninguno a `SPAWN_RANGE` — un valle sin un solo árbol cerca
 * del corral no es lo corriente (el suceso pesa más con `old_forest`,
 * `world/fate.ts`), pero dejar caer la visita entera por eso sería peor que
 * dejar salir al lobo del borde del propio corral.
 *
 * **La orilla importa** (E.7, «una plaza que ya falló»): el vado es la única
 * costura del río (§13.2), y buscar sólo por distancia recta podía elegir un
 * bosque más cercano en línea recta pero al otro lado del agua — medido con
 * `foundTwenty` contra cuarenta años reales, la semilla 11 hacía justo eso:
 * `Router.to` no encontraba camino, y el lobo se quedaba forcejeando contra
 * la orilla el resto de la visita, sin llegar a verse ni una gallina.
 * `shore` es la misma máscara que ya usa `beasts.ts` (`anchorOf`) para lo
 * mismo: sólo cuenta lo que se puede alcanzar andando desde el corazón de la
 * aldea.
 *
 * Determinista: se recorre en orden de fila y luego columna, así que un
 * empate en distancia lo desempata siempre la misma celda (§4.3).
 */
function forestNear(state: GameState, land: Terrain, shore: Uint8Array, from: Point): Point {
  const { width, height, terrain } = state.map;
  const x0 = Math.max(0, Math.floor(from.x - SPAWN_RANGE));
  const x1 = Math.min(width - 1, Math.floor(from.x + SPAWN_RANGE));
  const z0 = Math.max(0, Math.floor(from.z - SPAWN_RANGE));
  const z1 = Math.min(height - 1, Math.floor(from.z + SPAWN_RANGE));
  let best: Point | null = null;
  let bestD2 = Infinity;
  for (let z = z0; z <= z1; z += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (terrain[z * width + x] !== TERRAIN_CODE.forest) continue;
      if (!canReach(land, shore, { x: x + 0.5, z: z + 0.5 })) continue;
      const cx = x + 0.5;
      const cz = z + 0.5;
      const d2 = (cx - from.x) ** 2 + (cz - from.z) ** 2;
      if (d2 > SPAWN_RANGE * SPAWN_RANGE || d2 >= bestD2) continue;
      bestD2 = d2;
      best = { x: cx, z: cz };
    }
  }
  return best ?? from;
}

/** Cuánto mide una ruta ya trazada, sumando sus tramos. */
function routeLength(from: Point, route: readonly Waypoint[]): number {
  let total = 0;
  let at = from;
  for (const point of route) {
    total += Math.hypot(point.x - at.x, point.z - at.z);
    at = point;
  }
  return total;
}

/**
 * Traza el tramo hacia `to` y calcula su plazo: lo que tarda la ruta a paso
 * de lobo, con margen, o el tope fijo si no hay ruta.
 */
function legTo(land: Terrain, router: Router, from: Point, to: Point, step: number): {
  route: Waypoint[]; deadline: number;
} {
  const found = router.to(land, from, to);
  const route = found === null ? [] : [...found];
  const deadline = found === null
    ? step + NO_ROUTE_DEADLINE_STEPS
    : step + stepsOf((routeLength(from, found) / PACE) * ROUTE_MARGIN_FACTOR + ROUTE_MARGIN_SECONDS);
  return { route, deadline };
}

/**
 * Si el tramo actual ha dejado de acercarse al objetivo final de verdad.
 * Misma forma que `noProgress()` (`decide.ts`), pero contra `Wolf` y no
 * contra una `Offer`.
 */
function noRouteProgress(wolf: Wolf, goal: Point, step: number): boolean {
  if (step < wolf.progressAt) return false;
  const gap = Math.hypot(goal.x - wolf.body.x, goal.z - wolf.body.z);
  const improved = gap < wolf.progressGap - PROGRESS_MIN_GAIN;
  wolf.progressStalls = improved ? 0 : Math.min(wolf.progressStalls + 1, PROGRESS_MAX_STALLS);
  wolf.progressGap = gap;
  wolf.progressAt = step + PROGRESS_CHECK_STEPS * 2 ** wolf.progressStalls;
  return !improved;
}

/**
 * Crea la visita de esta jornada, ya en marcha hacia el corral.
 *
 * Sólo se llama cuando `staging.wolfRaidToday(state)` ha dicho que sí — nunca
 * por su cuenta —, así que no repite aquí esa comprobación.
 */
export function createWolf(
  state: GameState, land: Terrain, shore: Uint8Array, router: Router, henAnchor: Point, step: number,
): Wolf {
  const spawn = forestNear(state, land, shore, henAnchor);
  const body: Body = {
    id: WOLF_ID, x: spawn.x, z: spawn.z, vx: 0, vz: 0, facing: 0, radius: RADIUS, pace: PACE,
  };
  const leg = legTo(land, router, spawn, henAnchor, step);
  return {
    body, spawn, target: henAnchor, phase: 'approach', route: leg.route, deadline: leg.deadline,
    progressGap: Math.hypot(henAnchor.x - spawn.x, henAnchor.z - spawn.z),
    progressAt: step + PROGRESS_CHECK_STEPS, progressStalls: 0, lingerUntil: 0, forced: false,
  };
}

/**
 * Un paso de la visita: acercarse, rondar el tiempo que le toque, volver, y
 * quedar `'gone'` para que `village.ts` la retire de la escena.
 *
 * No entra en el registro de compromisos de IA-2 ni en `decide()`: no es una
 * interacción de dos actores por unas plazas, es una amenaza sobre el corral
 * entero, y guionizarla aparte es más simple y más fiel que forzarla en un
 * molde que no es el suyo. Nunca escribe en `GameState` y no consume azar del
 * motor — `hash32(seed, ...)` es lo único que decide cuánto dura el rondar.
 */
export function stepWolf(wolf: Wolf, land: Terrain, router: Router, seed: number, step: number): void {
  const { body } = wolf;
  if (wolf.phase === 'gone') return;

  if (wolf.phase === 'approach' || wolf.phase === 'retreat') {
    const goal = wolf.phase === 'retreat' ? wolf.spawn : wolf.target;
    const next = follow(body, wolf.route);
    const closeEnough = Math.hypot(goal.x - body.x, goal.z - body.z) <= ARRIVE_RADIUS;
    // **Sin avance de verdad, se da la visita por plantada donde haya
    // llegado.** Ver el comentario de `PROGRESS_CHECK_STEPS`: sin esto,
    // `seek()` y `avoid()` (`steering.ts`) pueden cancelarse casi del todo
    // justo delante de un punto de paso, y el lobo se queda clavado ahí hasta
    // que salta el plazo entero de la ruta, comiéndose el tiempo que le
    // queda para volver — un final tan válido como llegar de verdad: un lobo
    // que se queda a cuatro celdas porque no encuentra el último hueco sigue
    // siendo una amenaza visible, no un error.
    const stalled = noRouteProgress(wolf, goal, step);
    // El plazo entero de la ruta es la red última, no la que hace el trabajo
    // — si llega a saltar es que ni siquiera el aviso de progreso lo cazó, y
    // eso sí cuenta como forzado de verdad (`village.ts`, `threats.stuck`).
    const tooLong = step >= wolf.deadline;
    if (tooLong) wolf.forced = true;
    if (closeEnough || stalled || tooLong) {
      if (wolf.phase === 'approach') {
        const span = LINGER_SPAN[0]
          + (hash32(seed, `wolf:linger:${step}`) / 4_294_967_296) * (LINGER_SPAN[1] - LINGER_SPAN[0]);
        wolf.phase = 'linger';
        wolf.lingerUntil = step + stepsOf(span);
      } else {
        wolf.phase = 'gone';
        drive(body, { x: 0, z: 0 });
        return;
      }
    } else {
      const want = seek(body, next ?? goal);
      const wall = avoid(body, land);
      drive(body, { x: want.x + wall.x, z: want.z + wall.z });
    }
  } else if (wolf.phase === 'linger') {
    if (step >= wolf.lingerUntil) {
      const leg = legTo(land, router, { x: body.x, z: body.z }, wolf.spawn, step);
      wolf.phase = 'retreat';
      wolf.route = leg.route;
      wolf.deadline = leg.deadline;
      wolf.progressGap = Math.hypot(wolf.spawn.x - body.x, wolf.spawn.z - body.z);
      wolf.progressAt = step + PROGRESS_CHECK_STEPS;
      wolf.progressStalls = 0;
    } else {
      drive(body, { x: 0, z: 0 });
    }
  }

  // No hay `separate()` contra personas o cabaña a propósito: un lobo no cede
  // el paso, y añadirlo sólo complicaría un cuerpo que casi nunca se cruza
  // con nadie —ronda el borde del corral, no el centro de la aldea—.
  integrate(body, land, LIFE_STEP);

  if (wolf.phase === 'linger') {
    // Quieto y mirando al corral: es lo que se está rondando, no un paseo.
    turnTo(body, Math.atan2(wolf.target.x - body.x, wolf.target.z - body.z), LIFE_STEP);
    return;
  }
  const speed = Math.hypot(body.vx, body.vz);
  if (speed > 0.05) turnTo(body, Math.atan2(body.vx, body.vz), LIFE_STEP);
}
