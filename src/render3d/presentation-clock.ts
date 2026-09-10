// G-05 · The presentation clock. design.md D.6.
//
// The single owner of scenic time, outside the engine. §4 stays intact: this
// clock never advances a tick, never touches the simulation's accumulator and
// never reads the wall clock. It is told how much real time passed and answers
// with the `GraphicsFrame` that the renderer paints.
//
// **The scenic day is decoupled from the week, at every speed.** D.6 decides it
// and this round calibrates it. A week is 15 real seconds at ×1 and under a
// second at ×16, so tying the day to the week would make the villagers sprint
// when the player speeds up, and a sprinting village reads as a glitch rather
// than as haste. Scenic time therefore advances at one second per real second
// whenever the game is running, whatever the speed. What speeds up is the
// world: harvests, deaths and decisions still land on their tick. Nobody
// finishes a day's walk in a week, and D.6 says that is fine — a week does not
// owe the player a complete journey.

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

/** Real milliseconds per engine tick at ×1. Mirrors `TIME.REAL_MS_PER_TICK`. */
const REAL_MS_PER_TICK = 15_000;

export interface ClockInput {
  /** Monotonic real milliseconds. `performance.now()` in the app, a number in tests. */
  readonly realMs: number;
  /** The engine's current tick. Read, never written. */
  readonly tick: number;
  /** How far into the current week the engine is, from its own accumulator. */
  readonly tickFraction: number;
  readonly speed: 0 | 1 | 4 | 16;
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
  /** Scenic seconds since the last reset. Monotonic while running. */
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
      const deltaSeconds = running ? Math.min(gapSeconds, MAX_STEP_SECONDS) : 0;
      memory.seconds += deltaSeconds;

      return {
        tickFraction: Math.max(0, Math.min(1, input.tickFraction)),
        presentationSeconds: memory.seconds,
        deltaSeconds,
        speed: input.speed,
        reducedMotion: input.reducedMotion,
        discontinuity,
      };
    },
  };
}

/**
 * Where the scenic day stands, from 0 at dawn to 1 at nightfall.
 *
 * Separate from `tickFraction` on purpose, and D.6 says captures must state the
 * two apart. The tick says what the world is doing this week; this says what
 * time of day the village is living. They never coincide: a scenic day is eight
 * weeks at ×1 and a hundred and twenty-eight at ×16. That is the decision.
 */
export function dayPhase(presentationSeconds: number): number {
  const phase = (presentationSeconds / SCENIC_DAY_SECONDS) % 1;
  return phase < 0 ? phase + 1 : phase;
}

/** Which scenic day we are in. Changes when `dayPhase` wraps. */
export function dayNumber(presentationSeconds: number): number {
  return Math.floor(presentationSeconds / SCENIC_DAY_SECONDS);
}
