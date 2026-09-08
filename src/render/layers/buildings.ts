// M-17 · Standing buildings over the cached terrain.

import type { Building, GameState } from '@engine/state';
import type { Palette } from '../palette';
import { BUILDING_SPRITES, ruin, type DrawingContext } from '../sprites';

function ordered(state: Readonly<GameState>): Building[] {
  return [...state.buildings].sort((a, b) => (a.y + a.h) - (b.y + b.h) || a.x - b.x || a.id - b.id);
}

export function paintBuildingShadows(ctx: DrawingContext, state: Readonly<GameState>, palette: Palette, cell: number): void {
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.filter = 'brightness(0)';
  for (const building of ordered(state)) {
    if (building.lostTick !== null || building.kind === 'field' || building.kind === 'grave_yard') continue;
    BUILDING_SPRITES[building.kind](ctx, building.x + 0.3, building.y + 0.18, cell, palette, building.tier);
  }
  ctx.restore();
}

export function paintBuildings(ctx: DrawingContext, state: Readonly<GameState>, palette: Palette, cell: number): void {
  for (const building of ordered(state)) {
    if (building.lostTick !== null) continue;
    const sprite = BUILDING_SPRITES[building.kind];
    if (building.kind === 'smithy') {
      const forge = { ...palette, accent: building.lit ? '#e47f36' : palette.rock };
      sprite(ctx, building.x, building.y, cell, forge, building.tier);
    } else {
      sprite(ctx, building.x, building.y, cell, palette, building.tier);
    }
  }
}

export function paintRuins(ctx: DrawingContext, state: Readonly<GameState>, palette: Palette, cell: number): void {
  for (const building of ordered(state)) {
    if (building.lostTick === null) continue;
    for (let y = building.y; y < building.y + building.h; y += 1) {
      for (let x = building.x; x < building.x + building.w; x += 1) ruin(ctx, x, y, cell, palette, building.tier);
    }
  }
}
