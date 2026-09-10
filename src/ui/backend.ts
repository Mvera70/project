// G-07 · Which renderer paints the valley. design.md D.5, D.7.
//
// Canvas is the default and stays the default: D.5 says the pilot does not
// replace `src/render/` before P3, and G-12 is the round that decides whether it
// ever does. The 3D backend is opt-in, arrives asynchronously, and if anything
// about it fails the valley carries on being painted in 2D.
//
// **Two canvas elements, not one.** A canvas cannot change context type once it
// has one, so asking a 2D canvas for WebGL returns nothing and asking a WebGL
// canvas for 2D returns nothing. The spec says so and it is the kind of thing
// that looks like a blank screen rather than an error.

import type { GameState } from '@engine/state';
import type { InspectTarget } from './inspect';
import { inspectAt } from './inspect';
import { createRenderer, type ValleyRenderer } from '@render/renderer';

export type BackendKind = 'canvas' | 'pilot3d';

export interface ValleyBackend {
  readonly kind: BackendKind;
  /** Whether this backend moves its own camera. Canvas does not. */
  readonly movesCamera: boolean;
  /**
   * `speed` viaja hasta aqui porque el piloto 3D tiene reloj propio y D.6 dice
   * que la pausa congela el desplazamiento y los clips. Canvas lo ignora: su
   * animacion es la fraccion de tick y nada mas.
   */
  paint(state: GameState, tickFraction: number, speed: 0 | 1 | 4 | 16 | 64): void;
  /** What is under a point, in CSS pixels local to the viewport element. */
  pick(state: GameState, xCss: number, yCss: number, tickFraction: number): InspectTarget | null;
  track(id: number | null): void;
  zoom(factor: number, atXCss: number, atYCss: number): void;
  pan(dxCss: number, dyCss: number): void;
  resetView(): void;
  dispose(): void;
}

/**
 * Which backend the player asked for.
 *
 * A development switch, as G-07's brief puts it: `?render=3d` in the address, or
 * a value kept from the last time. Anything unrecognised means Canvas, because
 * a typo must not leave someone with a valley they cannot see.
 */
export function backendFrom(search: string, stored: string | null): BackendKind {
  const asked = new URLSearchParams(search).get('render');
  if (asked === '3d' || asked === 'pilot3d') return 'pilot3d';
  if (asked !== null) return 'canvas';
  return stored === 'pilot3d' ? 'pilot3d' : 'canvas';
}

/** The Canvas backend: what the game has been using all along. */
function canvasBackend(canvas: HTMLCanvasElement, viewport: HTMLElement): ValleyBackend {
  const renderer: ValleyRenderer = createRenderer(canvas, viewport);
  return {
    kind: 'canvas',
    movesCamera: false,
    paint(state, tickFraction) { renderer.paint(state, tickFraction); },
    pick(state, xCss, yCss, tickFraction) {
      const box = canvas.getBoundingClientRect();
      // The 2D valley is drawn as a fixed 36 × 56 grid stretched to the canvas,
      // so a screen point is a proportion of it.
      return inspectAt(
        state,
        (xCss * 36) / Math.max(1, box.width),
        (yCss * 56) / Math.max(1, box.height),
        tickFraction,
      );
    },
    track(id) { renderer.track(id); },
    zoom() { /* Canvas has no camera; app.ts scales the element instead. */ },
    pan() { /* idem */ },
    resetView() { /* idem */ },
    dispose() { /* The 2D renderer owns nothing that outlives its canvas. */ },
  };
}

export interface BackendHandle {
  /** Whatever is painting right now. Starts as Canvas, always. */
  readonly live: ValleyBackend;
  /** What the player asked for, which may still be loading. */
  readonly wanted: BackendKind;
  /** Set when the wanted backend could not start. Canvas carries on. */
  readonly failure: string | null;
  dispose(): void;
}

export interface BackendOptions {
  readonly kind: BackendKind;
  /** Where the GLBs live. `./assets/valley3d/` under the deployed app. */
  readonly assetBaseUrl?: string;
  /** Called when the 3D backend takes over, or fails. Never called for Canvas. */
  readonly onSwap?: (handle: BackendHandle) => void;
}

/**
 * Start painting, and upgrade later if the player asked for 3D.
 *
 * Canvas paints from the first frame. The 3D backend has to fetch a manifest and
 * a GLB before it can draw anything, and D.5 forbids the application stalling on
 * that: the valley is on screen while it loads, and if the load fails the player
 * keeps a valley instead of an error.
 */
export function attachBackend(
  canvas: HTMLCanvasElement, viewport: HTMLElement, options: BackendOptions,
): BackendHandle {
  let live: ValleyBackend = canvasBackend(canvas, viewport);
  let failure: string | null = null;
  let closed = false;
  let solid: HTMLCanvasElement | null = null;

  const handle: BackendHandle = {
    get live() { return live; },
    get wanted() { return options.kind; },
    get failure() { return failure; },
    dispose() {
      closed = true;
      live.dispose();
      solid?.remove();
      solid = null;
    },
  };

  if (options.kind !== 'pilot3d') return handle;

  void (async (): Promise<void> => {
    try {
      // Imported here and not at the top: nobody who plays in 2D should pay for
      // downloading Three.js, and most people play in 2D.
      const [{ createGraphicsRenderer }, { createPresentationClock }] = await Promise.all([
        import('../render3d/renderer'),
        import('../render3d/presentation-clock'),
      ]);
      if (closed) return;
      const clock = createPresentationClock();

      const webgl = document.createElement('canvas');
      webgl.id = 'valley3d';
      webgl.style.display = 'block';
      canvas.after(webgl);

      const renderer = await createGraphicsRenderer({
        canvas: webgl,
        assetBaseUrl: options.assetBaseUrl ?? './assets/valley3d/',
        quality: 'standard',
      });
      if (closed) {
        // The view was closed while this was loading. D.5 asks that such a load
        // be destroyed rather than attached to nothing.
        renderer.dispose();
        webgl.remove();
        return;
      }

      solid = webgl;
      canvas.style.display = 'none';
      const size = (): void => {
        const box = viewport.getBoundingClientRect();
        const width = Math.max(1, Math.round(box.width));
        const height = Math.max(1, Math.round(Math.max(160, box.height - 180)));
        webgl.style.width = `${width}px`;
        webgl.style.height = `${height}px`;
        renderer.resize({ widthCss: width, heightCss: height, pixelRatio: window.devicePixelRatio });
      };
      size();
      window.addEventListener('resize', size);

      live = {
        kind: 'pilot3d',
        movesCamera: true,
        paint(state, tickFraction, speed) {
          // El reloj de presentacion es dueno unico del tiempo escenico y no
          // toca el acumulador del juego: quien avanza los ticks sigue siendo
          // el bucle de la aplicacion.
          renderer.paint(state, clock.frame({
            realMs: performance.now(),
            tick: state.tick,
            tickFraction,
            speed,
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            hidden: document.hidden,
          }));
        },
        pick(_state, xCss, yCss) { return renderer.pick(xCss, yCss); },
        track(id) { renderer.track(id); },
        zoom(factor, atX, atY) { renderer.zoom(factor, atX, atY); },
        pan(dx, dy) { renderer.pan(dx, dy); },
        resetView() { renderer.resetView(); },
        dispose() {
          window.removeEventListener('resize', size);
          renderer.dispose();
        },
      };
      options.onSwap?.(handle);
    } catch (error: unknown) {
      failure = error instanceof Error ? error.message : String(error);
      options.onSwap?.(handle);
    }
  })();

  return handle;
}
