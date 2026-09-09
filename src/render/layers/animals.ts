// M-29 · Painting the livestock. design.md §7.7, §10.2.

import type { Animal } from '../animals';
import type { Palette } from '../palette';
import { cow, hen, pig, type DrawingContext } from '../sprites';

const SPRITES = { hen, pig, cow } as const;

export function paintAnimalShadows(ctx: DrawingContext, animals: readonly Animal[], cell: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (const animal of animals) {
    const size = animal.kind === 'cow' ? 0.26 : animal.kind === 'pig' ? 0.2 : 0.15;
    ctx.beginPath();
    ctx.ellipse((animal.x + 0.5) * cell, (animal.y + 0.76) * cell, size * cell, size * 0.4 * cell, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintAnimals(
  ctx: DrawingContext, animals: readonly Animal[], palette: Palette, cell: number,
): void {
  // Painted under the villagers (§10.2): a person walking past a hen hides it,
  // never the other way round.
  for (const animal of animals) SPRITES[animal.kind](ctx, animal.x, animal.y, cell, palette, 0);
}
