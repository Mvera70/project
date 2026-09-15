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

import { WORLD } from '@engine/balance';
import type { GameState } from '@engine/state';
import type { GraphicsStats } from '../render3d/contracts';
import type { InspectTarget } from './inspect';
import { inspectAt } from './inspect';
import { createRenderer, type ValleyRenderer } from '@render/renderer';

export type BackendKind = 'canvas' | 'pilot3d';

export interface ValleyBackend {
  readonly kind: BackendKind;
  /** Whether this backend moves its own camera. Canvas does not. */
  readonly movesCamera: boolean;
  /**
   * El lienzo que el jugador tiene delante.
   *
   * Hace falta porque **el relevo cambia de lienzo**: al entrar el piloto 3D, el
   * de Canvas se oculta y aparece otro encima. Los gestos se enganchan una vez
   * al arrancar, asi que si se enganchan al elemento en vez de preguntar por el
   * vivo, al relevar se quedan colgados de uno oculto — que es lo que pasaba: en
   * 3D no funcionaba ni arrastrar, ni pellizcar, ni tocar para abrir la ficha.
   */
  readonly surface: HTMLCanvasElement;
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
  /** Gira la vista, en radianes. Canvas no puede: no tiene desde dónde mirar. */
  orbit(dYaw: number, dPitch: number): void;
  resetView(): void;
  /** Lo que cuesta la escena, o `null` en Canvas, que no tiene de donde sacarlo. */
  stats(): GraphicsStats | null;
  dispose(): void;
}

/**
 * Which backend the player asked for.
 *
 * A development switch, as G-07's brief puts it: `?render=3d` in the address, or
 * a value kept from the last time. Anything unrecognised means Canvas, because
 * a typo must not leave someone with a valley they cannot see.
 */
/**
 * Los recursos 3D metidos dentro de la pagina, si los hay.
 *
 * Lo declara el empaquetador de la demo (`tools/graphics/bundle-game.ts`) con
 * un `define`. En el juego servido no existe, y entonces los recursos se piden
 * por la red como siempre.
 */
declare const VALLEY_ASSETS: Record<string, string> | undefined;

/**
 * Lo mismo, pero **al lado** de la página en vez de dentro.
 *
 * Una página de cuatro megas no se puede publicar en todas partes: el
 * publicador de artefactos la rechaza por tamaño. Así que el empaquetador sabe
 * partirla en dos —la página, pequeña, y un JSON con los mismos GLB en base64—
 * y define esta ruta relativa para que la página lo pida al arrancar.
 *
 * Sigue siendo **un solo sitio de donde vienen los recursos**: el mismo mapa de
 * `id` a base64 que `VALLEY_ASSETS`, sólo que traído por la red. Un JSON y no
 * los GLB sueltos porque `model/gltf-binary` no es un tipo que el publicador
 * sirva, y porque así el juego servido de siempre (`/assets/valley3d/`) no se
 * toca.
 */
declare const VALLEY_ASSETS_URL: string | undefined;

/**
 * Qué pinta el valle. **Desde G-12, el 3D: ya no es el piloto, es el juego.**
 *
 * Lo decidió el dueño del diseño el 14 sep 2026 con el riesgo escrito delante
 * (`docs/roadmap.md`, «Decisiones tomadas»): todo lo medido de rendimiento es
 * de un portátil, porque G-09 quedó parcial por no haber un móvil de verdad.
 *
 * **La puerta de vuelta se queda puesta, y a propósito.** `?render=canvas`
 * sigue devolviendo el Canvas de `src/render/`, que es lo que este juego ha
 * usado desde M-16 y sigue entero. Quitarla es el paso irreversible y no se da
 * hasta que alguien lo abra en un teléfono: si en un móvil real no va, se
 * necesita algo a lo que volver esa misma tarde.
 */
export function backendFrom(search: string, stored: string | null): BackendKind {
  const asked = new URLSearchParams(search).get('render');
  if (asked === 'canvas' || asked === '2d') return 'canvas';
  if (asked !== null) return 'pilot3d';
  return stored === 'canvas' ? 'canvas' : 'pilot3d';
}

/** The Canvas backend: what the game has been using all along. */
function canvasBackend(canvas: HTMLCanvasElement, viewport: HTMLElement): ValleyBackend {
  const renderer: ValleyRenderer = createRenderer(canvas, viewport);
  return {
    kind: 'canvas',
    movesCamera: false,
    surface: canvas,
    paint(state, tickFraction) { renderer.paint(state, tickFraction); },
    pick(state, xCss, yCss, tickFraction) {
      const box = canvas.getBoundingClientRect();
      // The 2D valley is drawn as the whole map grid stretched to the canvas,
      // so a screen point is a proportion of it.
      return inspectAt(
        state,
        (xCss * WORLD.WIDTH) / Math.max(1, box.width),
        (yCss * WORLD.HEIGHT) / Math.max(1, box.height),
        tickFraction,
      );
    },
    track(id) { renderer.track(id); },
    zoom() { /* Canvas has no camera; app.ts scales the element instead. */ },
    pan() { /* idem */ },
    // El 2D es una proyección fija del mapa entero dibujada a mano: no hay ángulo
    // que girar, y por eso `movesCamera` es `false` y quien llama no lo intenta.
    orbit() { /* idem */ },
    resetView() { /* idem */ },
    stats() { return null; },
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
      // Encima del hueco y por debajo de los controles.
      webgl.style.position = 'absolute';
      webgl.style.inset = '0';
      webgl.style.zIndex = '0';
      canvas.after(webgl);

      // Los recursos pueden venir **dentro de la pagina**.
      //
      // El juego los pide por la red desde `/assets/valley3d/`, que es lo
      // correcto cuando hay servidor. Para la demo que el jugador abre en el
      // movil no lo hay: la pagina es un fichero suelto, y los GLB viajan
      // dentro en base64. Si estan, se monta la biblioteca con ellos y el
      // renderer la toma prestada; si no, todo sigue igual.
      const { loadAssets } = await import('../render3d/assets');
      const bytesOf = (base64: string): ArrayBuffer => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        return bytes.buffer;
      };
      // Se lee por el **nombre a secas** y no como propiedad de `globalThis`:
      // quien lo sustituye al empaquetar es el `define` de Vite, y ese cambia
      // identificadores, no accesos a propiedad. Leyendolo del objeto global la
      // pagina se construia sin un solo recurso dentro y pedia los GLB por una
      // red que no existe.
      let embedded: Record<string, string> | undefined = typeof VALLEY_ASSETS === 'undefined'
        ? undefined
        : VALLEY_ASSETS;
      // Y si no viajan dentro, puede que viajen al lado. Si esa petición falla
      // no se cae nada: se sigue al camino de siempre, que pide los GLB uno a
      // uno desde `assetBaseUrl`.
      if (embedded === undefined && typeof VALLEY_ASSETS_URL !== 'undefined') {
        try {
          const response = await fetch(VALLEY_ASSETS_URL);
          if (response.ok) embedded = (await response.json()) as Record<string, string>;
        } catch {
          embedded = undefined;
        }
      }
      let library: Awaited<ReturnType<typeof loadAssets>> | undefined;
      if (embedded !== undefined) {
        const ids = Object.keys(embedded);
        library = await loadAssets({
          baseUrl: '',
          manifest: {
            schemaVersion: 1,
            assets: ids.map((id) => ({ id, file: `${id}.glb`, sha256: 'embedded', motion: [] })),
          },
          bytes: Object.fromEntries(ids.map((id) => [id, bytesOf(embedded[id] ?? '')])),
        });
      }

      const renderer = await createGraphicsRenderer({
        ...(library === undefined ? {} : { library }),
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
      // **El valle 3D ocupa la pantalla entera.**
      //
      // Aqui habia un `box.height - 180` heredado del render 2D, que dibuja el
      // mapa entero con una proporcion fija de 36 por 56 y deja el resto en
      // hueco. El piloto tiene camara: no necesita reservar nada, y reservando
      // dejaba un tercio de la pantalla de gris muerto debajo del valle. Los
      // controles de velocidad y el año van en posicion absoluta y flotan por
      // encima, que es donde §11.2 los pone.
      const size = (): void => {
        const box = viewport.getBoundingClientRect();
        const width = Math.max(1, Math.round(box.width));
        const height = Math.max(1, Math.round(box.height));
        webgl.style.width = `${width}px`;
        webgl.style.height = `${height}px`;
        renderer.resize({ widthCss: width, heightCss: height, pixelRatio: window.devicePixelRatio });
      };
      size();
      window.addEventListener('resize', size);

      live = {
        kind: 'pilot3d',
        movesCamera: true,
        surface: webgl,
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
        orbit(dYaw, dPitch) { renderer.orbit(dYaw, dPitch); },
        resetView() { renderer.resetView(); },
        stats() { return renderer.stats(); },
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
