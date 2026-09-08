// M-20 · Compose cached landscape and dynamic figures into the visible canvas.

import type { GameState } from '@engine/state';
import { clockOf } from '@engine/time';
import { cellFor, paintVillageBackground, sizeCanvas } from './canvas';
import { crowdPositions } from './crowd';
import { paintFigures, paintFigureShadows } from './layers/figures';
import { paintTells, tellsFor } from './layers/tells';
import { paletteFor, type Palette } from './palette';

function hashBytes(seed: number, bytes: ArrayLike<number>): number {
  let hash = seed;
  for (let i = 0; i < bytes.length; i += 1) hash = Math.imul(hash ^ (bytes[i] as number), 16777619);
  return hash >>> 0;
}

function backgroundKey(state: Readonly<GameState>, palette: Palette, cell: number): string {
  let hash = hashBytes(2166136261, state.map.terrain);
  hash = hashBytes(hash, state.map.path);
  hash = hashBytes(hash, state.map.ruins);
  const buildings = state.buildings.map((building) => [
    building.id, building.kind, building.x, building.y, building.w, building.h,
    building.lostTick, building.tier, building.lit,
  ].join(':')).join('|');
  return `${cell};${Object.values(palette).join(';')};${hash};${buildings}`;
}

export interface ValleyRenderer {
  paint(state: GameState, tickFraction: number): void;
  track(id: number | null): void;
}

export function createRenderer(canvas: HTMLCanvasElement, viewport: HTMLElement): ValleyRenderer {
  let cachedKey = '';
  let background: OffscreenCanvas | null = null;
  let trackedId: number | null = null;
  return {
    track(id: number | null): void { trackedId = id; },
    paint(state: GameState, tickFraction: number): void {
      const availableHeight = Math.max(56, viewport.clientHeight - 180);
      const cell = cellFor(Math.max(36, viewport.clientWidth), availableHeight);
      const ratio = Math.max(1, window.devicePixelRatio || 1);
      if (canvas.width !== 36 * cell * ratio || canvas.height !== 56 * cell * ratio) {
        sizeCanvas(canvas, cell, ratio);
        cachedKey = '';
      }
      const clock = clockOf(state.tick);
      const palette = paletteFor(clock.season, clock.seasonWeek);
      const key = backgroundKey(state, palette, cell);
      if (background === null || key !== cachedKey) {
        background = paintVillageBackground(state, palette, cell);
        cachedKey = key;
      }
      viewport.style.setProperty('--valley-void', palette.void);
      canvas.style.borderColor = palette.forestDark;
      const ctx = canvas.getContext('2d');
      if (ctx === null) throw new Error('Canvas 2D is unavailable.');
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, 36 * cell, 56 * cell);
      ctx.drawImage(background, 0, 0);
      paintTells(ctx, tellsFor(state), palette, cell, tickFraction);
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const figures = crowdPositions(state, reduced ? 0.45 : tickFraction);
      paintFigureShadows(ctx, figures, cell);
      const tracked = figures.find((figure) => figure.id === trackedId);
      if (tracked !== undefined) {
        ctx.strokeStyle = palette.accent; ctx.lineWidth = Math.max(2, cell * 0.18);
        ctx.beginPath(); ctx.arc((tracked.x + 0.5) * cell, (tracked.y + 0.8) * cell, 0.8 * cell, 0, Math.PI * 2); ctx.stroke();
      }
      paintFigures(ctx, figures, palette, cell);
    },
  };
}
