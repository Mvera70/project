// M-23 · The batched catch-up. design.md §13.2, §11.4.

import { TIME } from '@engine/balance';
import { restTick, ticksOwed, type RestHalt } from '@engine/save';
import type { GameState } from '@engine/state';

export interface LethargyProgress {
  done: number;
  total: number;
  /** The village ran out before `done` reached `total` — a batch stops early, it never keeps going. */
  ended: boolean;
  /**
   * RD-2 · The absence stopped before `total`: a raid warning, or the week that
   * would have ended the game (undone). The weeks still owed are forgiven —
   * the clock, the sun and the calendar stop together.
   */
  halted?: RestHalt | null;
}

function finished(p: LethargyProgress): boolean {
  return p.done >= p.total || p.ended || (p.halted ?? null) !== null;
}

/**
 * Wall-clock timestamp for a save taken between catch-up batches.
 *
 * The state already contains `done` newly simulated ticks. Dating that partial
 * snapshot as "now" would forgive the ticks still owed on the next load. Date
 * it by the remaining debt instead; once the run is complete (or the village
 * ends), the snapshot is current.
 */
export function checkpointSavedAtMs(nowMs: number, progress: LethargyProgress): number {
  if (finished(progress)) return nowMs;
  return nowMs - (progress.total - progress.done) * TIME.REAL_MS_PER_TICK;
}

/**
 * Up to `TIME.LETHARGY_BATCH` ticks, never more. Pure state mutation and a
 * progress value that is an integer fraction of a tick count — never a
 * real-clock animation — which is §11.4's rule applied to its own test case:
 * nothing here can be caught mid-flight, because nothing here has a flight,
 * only a count. Kept apart from `runLethargy` the way `loop.ts` keeps
 * `advanceAccumulator` apart from `startLoop`, so the four hours can be
 * driven and checked without booting a DOM.
 */
export function runBatch(state: GameState, done: number, total: number): LethargyProgress {
  const owed = Math.min(TIME.LETHARGY_BATCH, Math.max(0, total - done));
  let ran = 0;
  let halted: RestHalt | null = null;
  while (ran < owed && state.ended === null && halted === null) {
    halted = restTick(state);
    if (halted !== 'ending') ran += 1;
  }
  return { done: done + ran, total, ended: state.ended !== null, halted };
}

export interface Lethargy {
  stop(): void;
}

/**
 * §13.2: the four hours (960 ticks at most, §12) run in batches of 64 inside
 * `requestAnimationFrame`, so the tab never blocks in one long synchronous
 * stretch and the valley can be seen filling in rather than freezing then
 * jumping. `onProgress` fires after every batch, including the last —
 * `progress.done >= progress.total || progress.ended` is how the caller knows
 * it is over.
 *
 * No decision is ever made here. A pending crossroad stays exactly as it was
 * (§1, §13.2): `tick` is called with none, the same as any tick nobody
 * answered. And no defeat either (RD-2): `restTick` stops at a raid warning
 * and undoes the week that would end the game.
 */
export function runLethargy(
  state: GameState,
  elapsedMs: number,
  onProgress: (progress: LethargyProgress) => void,
  speed = 1,
): Lethargy {
  const total = ticksOwed(elapsedMs, speed);
  let done = 0;
  let stopped = false;
  let frameId = 0;

  const step = (): void => {
    if (stopped) return;
    const progress = runBatch(state, done, total);
    done = progress.done;
    onProgress(progress);
    if (!finished(progress)) frameId = requestAnimationFrame(step);
  };

  const start: LethargyProgress = { done: 0, total, ended: state.ended !== null };
  if (finished(start)) onProgress(start);
  else frameId = requestAnimationFrame(step);

  return {
    stop(): void {
      stopped = true;
      cancelAnimationFrame(frameId);
    },
  };
}
