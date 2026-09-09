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
  readonly speed: 0 | 1 | 4 | 16;
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
}

export interface GraphicsRendererOptions {
  readonly canvas: HTMLCanvasElement;
  readonly assetBaseUrl: string;
  readonly quality: 'low' | 'standard';
}

export declare function createGraphicsRenderer(
  options: GraphicsRendererOptions,
): Promise<GraphicsRenderer>;
