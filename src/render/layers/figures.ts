// M-17 · Figure paint functions. M-18 supplies their moving positions.

import type { Palette } from '../palette';
import { NAMED_TONES, namedVillager, villager, type DrawingContext } from '../sprites';

export interface Figure {
  id: number;
  x: number;
  y: number;
  named: boolean;
  namedIndex: number;
}

export function paintFigureShadows(ctx: DrawingContext, figures: readonly Figure[], cell: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  for (const figure of figures) {
    ctx.beginPath();
    ctx.ellipse((figure.x + 0.5 + 0.3) * cell, (figure.y + 1.35 + 0.18) * cell, 0.35 * cell, 0.125 * cell, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintFigures(ctx: DrawingContext, figures: readonly Figure[], palette: Palette, cell: number): void {
  for (const figure of figures) {
    const sprite = figure.named ? namedVillager(NAMED_TONES[figure.namedIndex % NAMED_TONES.length] as string) : villager;
    sprite(ctx, figure.x, figure.y, cell, palette, 0);
  }
}

