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

/**
 * Si toca dibujar este fotograma o se deja pasar (29 sep 2026). Con un tope
 * de 60 en una pantalla de 120 Hz se dibuja uno de cada dos; con 30, uno de
 * cada dos en una de 60. El margen de un cuarto de fotograma evita que un
 * `requestAnimationFrame` que llega unas décimas antes de tiempo se salte y
 * el siguiente se dibuje tarde: sin él, a 60 en una pantalla de 60 Hz se
 * perdía uno de cada tres. Puro, para probarse sin pantalla.
 */
export function frameDue(now: number, lastPainted: number | null, minFrameMs: number): boolean {
  if (lastPainted === null || !(minFrameMs > 0)) return true;
  return now - lastPainted >= minFrameMs * 0.75;
}

export function startLoop(
  speed: () => Speed,
  step: () => void,
  paint: (fraction: number) => void,
  // El banco de batallas frena el tiempo real que entra en el bucle: a 0,25
  // todo va a un cuarto —cuerpos, animaciones, hora—, porque todo cuelga del
  // tick y su fracción. El juego no lo toca: vale 1.
  scale: () => number = () => 1,
  // Esquema 12 · dónde de la semana empieza el bucle. El juego abre al empezar
  // la semana; la demo de la madera (`&demo=wood`) abre a media semana.
  startFraction = 0,
  // El tope de fotogramas por segundo que eligió el jugador («Graphics»), en
  // milisegundos por fotograma; 0 es dibujar cada uno. Los fotogramas que se
  // dejan pasar no pierden tiempo: se acumula en el siguiente.
  minFrameMs: () => number = () => 0,
): Loop {
  let frameId = 0;
  let previous: number | null = null;
  let lastPainted: number | null = null;
  let remainder = Math.max(0, Math.min(0.999, startFraction)) * TIME.REAL_MS_PER_TICK;
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
    if (!frameDue(now, lastPainted, minFrameMs())) {
      frameId = requestAnimationFrame(frame);
      return;
    }
    lastPainted = now;
    const advanced = advanceAccumulator(remainder, (now - previous) * scale(), speed());
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
