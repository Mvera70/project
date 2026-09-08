// M-23 · The batched catch-up. design.md §13.2, §11.4.

import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { ticksOwed } from '@engine/save';
import { tick } from '@engine/sim';
import type { GameState } from '@engine/state';

export interface LethargyProgress {
  done: number;
  total: number;
  /** The village ran out before `done` reached `total` — a batch stops early, it never keeps going. */
  ended: boolean;
}

function finished(p: LethargyProgress): boolean {
  return p.done >= p.total || p.ended;
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
  while (ran < owed && state.ended === null) {
    tick(state, CATALOG);
    ran += 1;
  }
  return { done: done + ran, total, ended: state.ended !== null };
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
 * answered.
 */
export function runLethargy(
  state: GameState,
  elapsedMs: number,
  onProgress: (progress: LethargyProgress) => void,
): Lethargy {
  const total = ticksOwed(elapsedMs);
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
