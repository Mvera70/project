// G-05 · The presentation clock. design.md D.6.
//
// The single owner of scenic time, outside the engine. §4 stays intact: this
// clock never advances a tick, never touches the simulation's accumulator and
// never reads the wall clock. It is told how much real time passed and answers
// with the `GraphicsFrame` that the renderer paints.
//
// **Y desde v3.72 la jornada vuelve a cuadrar con la semana: son siete.** Lo
// pidió el dueño del diseño —«debe ser real el paso del tiempo, como si fuese
// la vida real»— y lo que lo hace posible es que la semana dure lo que duran
// siete jornadas (`TIME.REAL_MS_PER_TICK = DAYS_PER_WEEK · SCENIC_DAY_SECONDS`,
// §12.1). La jornada no se ha tocado: sigue durando 120 s escénicos, la gente
// sigue andando a su paso y `scenicRate` sigue siendo la velocidad entera. Lo
// que se movió fue la semana, que antes duraba quince segundos y metía ocho
// amaneceres dentro de una.
//
// Lo que había aquí escrito, y por qué ya no vale: «the scenic day is decoupled
// from the week … a week does not owe the player a complete journey». Era
// cierto mientras la semana durase quince segundos: atarlas obligaba a que la
// jornada durase eso y la aldea entera esprintara. La salida no era atar la
// jornada a la semana, era **alargar la semana**, y eso es lo que v3.72 hizo.
//
// El acuerdo se mantiene con dos piezas, y las dos están abajo: los dos relojes
// corren al mismo ritmo por construcción, y este se **pone en hora** con el del
// motor en cada discontinuidad (partida nueva, carga, letargo), que es lo único
// que podría separarlos.

import { TIME } from '@engine/balance';
import { scenicSecondsAt } from '../derive/clock';
import type { GraphicsFrame } from './contracts';

/**
 * How long a full scenic day lasts, in real seconds.
 *
 * TUNE, calibrated in G-05 and recorded in D.9. Sixty seconds, and the number
 * is not a taste: it is what the walk cycle costs.
 *
 * A villager's own gait covers 0.238 cells per second — that is the walk clip's
 * measured stride over its measured duration, from G-04, once the villager is
 * scaled to the size of a person against a three-metre cell (D.6.2). Journeys in
 * this valley run 3 to 13 cells with a median of 6, and D.6's day spends 15 % of
 * itself travelling. Six cells at that gait is 25 seconds, which would want a day
 * of 168. A hundred and twenty is the compromise: the median walk plays at 1,4
 * times the clip's own cadence, a brisk walk rather than a stroll, and the day
 * stays short enough that a player sees a whole one.
 *
 * The first attempt tied the day to the week, at 15 seconds. It made every
 * villager cross the valley in two and a quarter seconds, which the clip would
 * have to play at nearly five leg cycles a second: sprinting to the field and
 * back, all day, for ever.
 *
 * The cost of the decision, stated plainly: at ×1 eight weeks pass per scenic
 * day, so the day no longer maps to the week. D.6 allows exactly that and says a
 * sped-up week owes the player no complete journey. The alternative was a village
 * of sprinters.
 */
export const SCENIC_DAY_SECONDS = 120;

/**
 * The longest scenic step a single frame may take, in seconds.
 *
 * A dropped frame or a busy device must not teleport everyone half a day. The
 * clock keeps running, it just refuses to take the whole gap in one bite.
 */
const MAX_STEP_SECONDS = 0.1;

/**
 * A real gap longer than this is treated as suspension, not as a slow frame.
 *
 * Hiding the tab suspends presentation (D.6), and coming back must rebuild from
 * the final state instead of playing the missing minutes. One second is well
 * past any frame a device can produce and well under any absence a person would
 * notice, so it separates the two cases without needing to be told.
 */
const SUSPEND_GAP_SECONDS = 1;

/**
 * Ticks a frame may advance beyond what its own speed explains before it counts
 * as lethargy.
 *
 * Coming back from the background, the engine catches up in one go. Nothing
 * should replay that interval, so the frame is marked discontinuous and every
 * route and transition in flight is dropped. Two ticks of slack absorb an
 * ordinary slow frame at ×16 without absorbing a real jump.
 */
const LETHARGY_SLACK_TICKS = 2;

/**
 * Cuanto se acelera el dia escenico con la velocidad del juego. D.6.1.
 *
 * **La velocidad entera.** Lo decidio el dueño del diseño el 15 sep 2026, con
 * las tres opciones delante y esta pregunta por medio: «hay muchas cosas del
 * reloj que estan mal... los personajes no van al ritmo que deberian ir».
 *
 * Lo que arregla es la unica incoherencia que el jugador puede ver sin contar
 * nada: **cuantas semanas cabe en una jornada ya no depende del boton**. Con la
 * raiz cuadrada que habia antes, a x1 pasaban ocho semanas por jornada y a x16
 * pasaban treinta y dos, asi que el calendario y el sol contaban dos historias
 * distintas y la segunda cambiaba cada vez que se tocaba la velocidad. Ahora son
 * una proporcion fija a cualquier velocidad. Eran ocho semanas por jornada
 * hasta v3.72, y desde v3.72 son **siete jornadas por semana**: lo que cambio
 * no fue esta funcion, que sigue siendo la velocidad entera, sino lo que dura
 * la semana (§12.1). Una estacion son ochenta y cuatro jornadas de sol.
 *
 * Y las dos puntas que ya se habian probado, para que no se vuelvan a probar:
 *
 * - **Sin atar** (rate = 1), apretar x16 no cambiaba nada visible salvo el
 *   marcador: el mundo corria y la gente andaba igual. El boton parecia roto, y
 *   asi lo describio quien lo probo.
 * - **Con la raiz**, el termino medio que esta ronda retira: se veia correr el
 *   tiempo pero la jornada seguia sin cuadrar con el calendario.
 *
 * El coste, escrito: a x64 la gente cruza el valle en dos segundos y medio y el
 * sol sale y se pone cada dos segundos. Lo primero es lo que es —una grabacion
 * a sesenta y cuatro aumentos—; lo segundo se sostiene con el suelo de luz de
 * `sky.ts`, que a velocidades altas no deja que la noche cierre del todo.
 */
function scenicRate(speed: 0 | 1 | 4 | 16 | 64): number {
  return speed;
}

/**
 * Real milliseconds per engine tick at ×1.
 *
 * Se lee de `TIME` y no se copia. Estuvo copiado aquí —quince mil, a mano— y es
 * la clase de duplicado que no falla: si el tick cambia y esta copia no, la
 * detección de letargo de abajo llama salto a cada fotograma o no lo llama
 * nunca, y en los dos casos el juego sigue pintando.
 */
const REAL_MS_PER_TICK = TIME.REAL_MS_PER_TICK;

interface ClockInput {
  /** Monotonic real milliseconds. `performance.now()` in the app, a number in tests. */
  readonly realMs: number;
  /** The engine's current tick. Read, never written. */
  readonly tick: number;
  /** How far into the current week the engine is, from its own accumulator. */
  readonly tickFraction: number;
  readonly speed: 0 | 1 | 4 | 16 | 64;
  readonly reducedMotion: boolean;
  /** Whether the document is hidden. Presentation suspends while it is. */
  readonly hidden: boolean;
}

export interface PresentationClock {
  /** The frame for this instant. Pure with respect to everything but its own time. */
  frame(input: ClockInput): GraphicsFrame;
  /**
   * Forget the past. A new game, a load, or any change of identity in the state
   * the caller is painting. The next frame is discontinuous and scenic time
   * starts again, because clip phases from another game mean nothing here.
   */
  reset(): void;
  /**
   * Scenic seconds: los del motor, no una cuenta propia (v3.72). Suben con el
   * tick y su fracción, así que sólo saltan cuando salta el mundo —una carga,
   * el letargo, otro valle— y ese fotograma viene marcado `discontinuity`.
   */
  readonly seconds: number;
}

interface Memory {
  realMs: number;
  tick: number;
  seconds: number;
  started: boolean;
}

export function createPresentationClock(): PresentationClock {
  const memory: Memory = { realMs: 0, tick: 0, seconds: 0, started: false };

  return {
    get seconds(): number {
      return memory.seconds;
    },

    reset(): void {
      memory.started = false;
      memory.seconds = 0;
      memory.tick = 0;
      memory.realMs = 0;
    },

    frame(input: ClockInput): GraphicsFrame {
      const previousMs = memory.realMs;
      const previousTick = memory.tick;
      const first = !memory.started;
      memory.started = true;
      memory.realMs = input.realMs;
      memory.tick = input.tick;

      const gapSeconds = first ? 0 : Math.max(0, (input.realMs - previousMs) / 1000);

      // How many ticks this frame's own elapsed time can explain. Anything
      // beyond that came from somewhere else: lethargy, a load, a background
      // catch-up. Comparing against the speed rather than a flat number is what
      // lets ×16 advance several ticks a frame without being called a jump.
      const explained = (input.speed * gapSeconds * 1000) / REAL_MS_PER_TICK;
      const jumped = first ? 0 : input.tick - previousTick;
      const lethargy = jumped < 0 || jumped > explained + LETHARGY_SLACK_TICKS;

      const suspended = input.hidden || gapSeconds > SUSPEND_GAP_SECONDS;
      const discontinuity = first || lethargy || suspended;

      // Pause freezes movement and clips; the camera and the cards keep
      // working, which is the caller's business, not the clock's. Suspension
      // freezes them too, and so does a gap long enough to be an absence.
      const running = input.speed !== 0 && !suspended;
      // **El tiempo escénico ES el del motor** (v3.72). No se acumula por su
      // cuenta: se lee del tick y su fracción, que el bucle ya lleva. Los dos
      // relojes corrían al mismo ritmo en teoría y se separaban en la práctica,
      // y está medido: con el tope de `MAX_STEP_SECONDS` y esta máquina a diez
      // fotogramas por segundo, el sol perdía **casi la mitad** del día contra
      // el calendario. En una secuencia de capturas se veía sin contar nada —la
      // cabecera decía la 01:00 y el cielo iba por las seis de la tarde—, que
      // es exactamente la incoherencia que v3.72 vino a cerrar.
      const scenicNow = scenicSecondsAt(input.tick, input.tickFraction, SCENIC_DAY_SECONDS);
      // Y el paso de la animación sigue acotado, porque un fotograma perdido no
      // puede teletransportar a nadie media jornada: lo que se recorta es
      // **cuánto avanzan los cuerpos**, no qué hora es. El tope sube con la
      // velocidad porque a ×64 un fotograma vale de verdad muchos segundos
      // escénicos.
      const step = first || discontinuity ? 0 : Math.max(0, scenicNow - memory.seconds);
      const deltaSeconds = running
        ? Math.min(step, MAX_STEP_SECONDS * scenicRate(input.speed))
        : 0;
      memory.seconds = scenicNow;

      return {
        tickFraction: Math.max(0, Math.min(1, input.tickFraction)),
        presentationSeconds: memory.seconds,
        deltaSeconds,
        realDeltaSeconds: Math.min(gapSeconds, MAX_STEP_SECONDS),
        speed: input.speed,
        reducedMotion: input.reducedMotion,
        discontinuity,
      };
    },
  };
}

/**
 * A que hora del dia empieza la partida.
 *
 * TUNE: 0,28, media manana. El reloj escenico empezaba en cero, que con la luz
 * de v3.34 es **antes del amanecer**: abrir el juego y encontrarse el valle a
 * oscuras, con todo el mundo dentro de casa y nada que mirar, es la peor
 * primera impresion posible de un sitio que se vende por estar vivo.
 *
 * Media manana es cuando la aldea esta entera en la calle. Desplaza el origen y
 * nada mas: el dia sigue durando lo mismo y sigue siendo funcion del reloj, asi
 * que la misma partida da la misma imagen.
 */
const DAY_START = TIME.DAY_START_PHASE;

/**
 * Where the scenic day stands, from 0 at dawn to 1 at nightfall.
 *
 * El tick dice qué está haciendo el mundo esta semana y esto qué hora del día
 * vive la aldea. **Desde v3.72 las dos cuentas cuadran**: siete jornadas por
 * semana a cualquier velocidad, así que esta fase es la misma que devuelve
 * `valleyClock(tick, fraction).sunPhase` y hay una prueba que lo ata
 * (`tests/fast/clock.test.ts`). Antes no cuadraban —ocho semanas por jornada— y
 * D.6 pedía que las capturas dijeran las dos por separado.
 */
export function dayPhase(presentationSeconds: number): number {
  const phase = (presentationSeconds / SCENIC_DAY_SECONDS + DAY_START) % 1;
  return phase < 0 ? phase + 1 : phase;
}

/** Which scenic day we are in. Changes when `dayPhase` wraps. */
export function dayNumber(presentationSeconds: number): number {
  return Math.floor(presentationSeconds / SCENIC_DAY_SECONDS + DAY_START);
}
