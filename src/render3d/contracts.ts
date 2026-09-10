// G-01 · Public boundary between the simulation, presentation owner and 3D renderer.

import type { GameState } from '../engine/state';

export type GraphicsTarget =
  | { kind: 'building'; id: number }
  | { kind: 'villager'; id: number }
  | { kind: 'terrain'; x: number; y: number };

export interface GraphicsFrame {
  readonly tickFraction: number;
  readonly presentationSeconds: number;
  readonly deltaSeconds: number;
  /**
   * G-07 · El juego tiene ×64 y este contrato llegaba a ×16.
   *
   * Lo añadió §11 cuando el jugador dijo que ×16 se le quedaba corto para
   * probar, y el Anexo D se escribió antes. No es un caso raro: es el que más
   * exige al reloj de presentación, porque es donde más se separan el ritmo del
   * mundo y el de la gente.
   */
  readonly speed: 0 | 1 | 4 | 16 | 64;
  readonly reducedMotion: boolean;
  readonly discontinuity: boolean;
}

export interface GraphicsViewport {
  readonly widthCss: number;
  readonly heightCss: number;
  readonly pixelRatio: number;
}

export interface GraphicsRenderer {
  resize(viewport: GraphicsViewport): void;
  paint(state: Readonly<GameState>, frame: GraphicsFrame): void;
  pick(localXCss: number, localYCss: number): GraphicsTarget | null;
  track(id: number | null): void;
  dispose(): void;

  /**
   * G-07 · La cámara. design.md D.7.
   *
   * Acercarse y moverse no son decisiones del juego: no gastan tiempo, no tocan
   * el estado y no entran en el guardado. Por eso viven en el renderer y no en
   * la API de juego.
   *
   * `zoom` multiplica lo que se ve por `factor` —por debajo de uno acerca—
   * manteniendo bajo el dedo el punto que estaba en `(atX, atY)`, en píxeles CSS
   * locales al lienzo. `pan` arrastra el valle. `resetView` vuelve al encuadre
   * de partida, que es la aldea con su entorno (D.6.3).
   */
  zoom(factor: number, atXCss: number, atYCss: number): void;
  pan(dxCss: number, dyCss: number): void;
  resetView(): void;
}

export interface GraphicsRendererOptions {
  readonly canvas: HTMLCanvasElement;
  readonly assetBaseUrl: string;
  readonly quality: 'low' | 'standard';
  /**
   * G-06 · Una biblioteca de recursos ya cargada, si el llamante la trae.
   *
   * Por defecto el renderer carga la suya desde `assetBaseUrl` y la suelta al
   * disponerse. Con esto, el llamante la trae y **el llamante la posee**: el
   * renderer no la suelta, porque no es suya. D.5 pide que los recursos
   * compartidos tengan dueño explícito y éste es el caso en que el dueño está
   * fuera.
   *
   * Existe por dos sitios que no tienen servidor del que pedir: una página
   * publicada de una sola pieza, y una prueba.
   */
  readonly library?: AssetLibrary;
}

/** Lo que el renderer necesita de una biblioteca de recursos. Ver `assets.ts`. */
export interface AssetLibrary {
  get(id: string): { readonly id: string; readonly clips: readonly unknown[] } | undefined;
  instance(id: string): unknown;
  dispose(): void;
}

export declare function createGraphicsRenderer(
  options: GraphicsRendererOptions,
): Promise<GraphicsRenderer>;
