// M-20 · Real-time accumulation without DOM or engine dependencies.

import { TIME } from '@engine/balance';
import type { Speed } from './speed';

export interface Advance {
  ticks: number;
  remainderMs: number;
  fraction: number;
}

export function advanceAccumulator(remainderMs: number, elapsedMs: number, speed: Speed): Advance {
  const total = remainderMs + Math.max(0, elapsedMs) * speed;
  // Repeated RAF fractions can finish an exact interval a few billionths below
  // its boundary. Compare in ticks so that numerical drift cannot lose a week.
  const ticks = Math.min(8, Math.floor(total / TIME.REAL_MS_PER_TICK + 1e-9));
  const next = Math.max(0, total - ticks * TIME.REAL_MS_PER_TICK);
  return {
    ticks,
    remainderMs: next,
    fraction: Math.max(0, Math.min(1, next / TIME.REAL_MS_PER_TICK)),
  };
}

export interface Loop {
  stop(): void;
}

export function startLoop(
  speed: () => Speed,
  step: () => void,
  paint: (fraction: number) => void,
): Loop {
  let frameId = 0;
  let previous: number | null = null;
  let remainder = 0;
  let stopped = false;

  const visibility = (): void => { previous = null; };
  document.addEventListener('visibilitychange', visibility);

  const frame = (now: number): void => {
    if (stopped) return;
    if (previous === null || document.hidden) {
      previous = now;
      paint(remainder / TIME.REAL_MS_PER_TICK);
      frameId = requestAnimationFrame(frame);
      return;
    }
    const advanced = advanceAccumulator(remainder, now - previous, speed());
    previous = now;
    remainder = advanced.remainderMs;
    for (let i = 0; i < advanced.ticks; i += 1) step();
    paint(advanced.fraction);
    frameId = requestAnimationFrame(frame);
  };

  frameId = requestAnimationFrame(frame);
  return {
    stop(): void {
      stopped = true;
      cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}
