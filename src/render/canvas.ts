// M-16 · Canvas geometry and the cached background.

import type { ValleyMap } from '@engine/state';
import type { Palette } from './palette';
import { paintPaths, paintTerrain } from './layers/terrain';

export function cellFor(viewportWidth: number, viewportHeight: number): number {
  return Math.max(1, Math.floor(Math.min(viewportWidth / 36, viewportHeight / 56)));
}

export function sizeCanvas(canvas: HTMLCanvasElement, cell: number, pixelRatio: number): void {
  canvas.width = 36 * cell * pixelRatio;
  canvas.height = 56 * cell * pixelRatio;
  canvas.style.width = `${36 * cell}px`;
  canvas.style.height = `${56 * cell}px`;
}

export function makeBackground(map: ValleyMap, palette: Palette, cell: number): OffscreenCanvas {
  const canvas = new OffscreenCanvas(map.width * cell, map.height * cell);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D is unavailable.');
  paintTerrain(ctx, map, palette, cell);
  paintPaths(ctx, map, palette, cell);
  return canvas;
}

