// D6 · El valle tomado sigue visible un instante antes de convertirse en lápida.
//
// Este reloj es de interfaz, no del motor: la partida ya está cerrada, guardada
// y archivada. Sólo pide nuevos fotogramas de la escena efímera y, por tanto,
// nunca puede cobrar otra vez la batalla ni el saqueo.

export interface EndingScene {
  readonly active: boolean;
  readonly ready: boolean;
  readonly phase: 'entering' | 'looting' | 'escaping' | 'complete';
  readonly loads: number;
  readonly traces: number;
}

export interface StormedTransitionOptions {
  readonly reducedMotion: boolean;
  readonly ending: () => EndingScene | null;
  readonly paint: () => void;
  readonly complete: () => void;
  readonly now?: () => number;
  readonly requestFrame?: (callback: FrameRequestCallback) => number;
  readonly cancelFrame?: (id: number) => void;
}

/**
 * TUNE de presentación, no de balance: ocho segundos para leer la escena y
 * doce como fusible. Nunca se alarga a una secuencia que secuestre el final.
 */
export const STORMED_MIN_MS = 8_000;
export const STORMED_MAX_MS = 12_000;

export interface StormedTransition {
  cancel(): void;
}

export function startStormedTransition(options: StormedTransitionOptions): StormedTransition {
  const first = options.ending();
  let cancelled = false;
  let frame = 0;
  const now = options.now ?? (() => performance.now());
  const requestFrame = options.requestFrame ?? ((callback) => requestAnimationFrame(callback));
  const cancelFrame = options.cancelFrame ?? ((id) => cancelAnimationFrame(id));

  // Recarga, Canvas, hook sintético o movimiento reducido: no hay una escena
  // viva que justificar delante del epitafio.
  if (options.reducedMotion || first === null) {
    options.complete();
    return { cancel(): void { cancelled = true; } };
  }

  const started = now();
  const tick = (): void => {
    if (cancelled) return;
    options.paint();
    const elapsed = now() - started;
    const ending = options.ending();
    const naturallyReady = ending === null || ending.ready || ending.phase === 'complete';
    if (elapsed >= STORMED_MAX_MS || (elapsed >= STORMED_MIN_MS && naturallyReady)) {
      cancelled = true;
      options.complete();
      return;
    }
    frame = requestFrame(tick);
  };
  frame = requestFrame(tick);

  return {
    cancel(): void {
      if (cancelled) return;
      cancelled = true;
      cancelFrame(frame);
    },
  };
}
