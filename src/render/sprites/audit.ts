// Browser-side pixel audit used by the M-17 Playwright gate.

import { BUILDINGS } from '@engine/balance';
import { PALETTES } from '../palette';
import { BUILDING_SPRITES } from './index';

export interface SpriteAudit {
  cases: number;
  empty: string[];
  spills: string[];
  principalShapes: number;
}

export function auditSprites(): SpriteAudit {
  const empty: string[] = [];
  const spills: string[] = [];
  const principal = new Set<string>();
  let cases = 0;
  for (const [kind, sprite] of Object.entries(BUILDING_SPRITES)) {
    const spec = BUILDINGS[kind as keyof typeof BUILDINGS];
    for (const cell of [9, 10]) {
      for (const background of ['#ffffff', '#000000']) {
        cases += 1;
        const canvas = document.createElement('canvas');
        canvas.width = (spec.w + 2) * cell;
        canvas.height = (spec.h + 2) * cell;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx === null) throw new Error('Canvas 2D is unavailable.');
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        sprite(ctx, 1, 1, cell, PALETTES.summer, spec.tier);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const base = background === '#ffffff' ? 255 : 0;
        let changed = 0;
        let outside = 0;
        let signature = '';
        for (let y = 0; y < canvas.height; y += 1) {
          for (let x = 0; x < canvas.width; x += 1) {
            const at = (y * canvas.width + x) * 4;
            if (data[at] === base && data[at + 1] === base && data[at + 2] === base) continue;
            changed += 1;
            if (cell === 10 && background === '#ffffff') signature += `${x},${y};`;
            if (x < cell || y < cell || x >= (spec.w + 1) * cell || y >= (spec.h + 1) * cell) outside += 1;
          }
        }
        const label = `${kind}@${cell}:${background}`;
        if (changed === 0) empty.push(label);
        if (outside > 0) spills.push(`${label} (${outside})`);
        if (['house', 'chapel', 'granary', 'mill'].includes(kind) && cell === 10 && background === '#ffffff') {
          principal.add(signature);
        }
      }
    }
  }
  return { cases, empty, spills, principalShapes: principal.size };
}
