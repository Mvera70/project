import { WORLD } from '@engine/balance';
// M-16 · Canvas geometry and the cached background.

import type { GameState, ValleyMap } from '@engine/state';
import type { Palette } from '@derive/palette';
import { paintPaths, paintTerrain } from './layers/terrain';
import { paintBuildings, paintBuildingShadows, paintRuins } from './layers/buildings';

export function cellFor(viewportWidth: number, viewportHeight: number): number {
  return Math.max(1, Math.floor(Math.min(viewportWidth / WORLD.WIDTH, viewportHeight / WORLD.HEIGHT)));
}

export function sizeCanvas(canvas: HTMLCanvasElement, cell: number, pixelRatio: number): void {
  canvas.width = WORLD.WIDTH * cell * pixelRatio;
  canvas.height = WORLD.HEIGHT * cell * pixelRatio;
  canvas.style.width = `${WORLD.WIDTH * cell}px`;
  canvas.style.height = `${WORLD.HEIGHT * cell}px`;
}

function makeBackground(map: ValleyMap, palette: Palette, cell: number): OffscreenCanvas {
  const canvas = new OffscreenCanvas(map.width * cell, map.height * cell);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D is unavailable.');
  paintTerrain(ctx, map, palette, cell);
  paintPaths(ctx, map, palette, cell);
  return canvas;
}

export function paintVillageBackground(
  state: GameState,
  palette: Palette,
  cell: number,
): OffscreenCanvas {
  const canvas = makeBackground(state.map, palette, cell);
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D is unavailable.');
  paintRuins(ctx, state, palette, cell);
  paintBuildingShadows(ctx, state, palette, cell);
  paintBuildings(ctx, state, palette, cell);
  return canvas;
}
