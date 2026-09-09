// M-17 · Standing buildings over the cached terrain.

import type { Building, GameState } from '@engine/state';
import { outline, type Palette } from '../palette';
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
  // The byte mask has no building records in a successor game. Paint it as one
  // low foundation: repeating the one-cell rubble sprite over a mature village
  // turned the old settlement into a field of identical triangles at 10 px.
  ctx.save();
  ctx.globalAlpha = 0.58;
  ctx.fillStyle = palette.rock;
  for (let at = 0; at < state.map.ruins.length; at += 1) {
    if (state.map.ruins[at] !== 1) continue;
    const x = at % state.map.width;
    const y = Math.floor(at / state.map.width);
    ctx.fillRect(x * cell, y * cell, cell, cell);
  }
  ctx.restore();

  ctx.strokeStyle = outline(palette.wood);
  ctx.lineWidth = Math.max(1, cell * 0.1);
  ctx.beginPath();
  const masked = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < state.map.width && y < state.map.height
    && state.map.ruins[y * state.map.width + x] === 1;
  for (let y = 0; y < state.map.height; y += 1) {
    for (let x = 0; x < state.map.width; x += 1) {
      if (!masked(x, y)) continue;
      if (!masked(x, y - 1)) { ctx.moveTo(x * cell, y * cell); ctx.lineTo((x + 1) * cell, y * cell); }
      if (!masked(x + 1, y)) { ctx.moveTo((x + 1) * cell, y * cell); ctx.lineTo((x + 1) * cell, (y + 1) * cell); }
      if (!masked(x, y + 1)) { ctx.moveTo((x + 1) * cell, (y + 1) * cell); ctx.lineTo(x * cell, (y + 1) * cell); }
      if (!masked(x - 1, y)) { ctx.moveTo(x * cell, (y + 1) * cell); ctx.lineTo(x * cell, y * cell); }
    }
  }
  ctx.stroke();

  // Current-game ruins retain their individual rubble. A successor has no old
  // Building records, so it gets the quieter footprint above and nothing else.
  for (const building of ordered(state)) {
    if (building.lostTick === null) continue;
    for (let y = building.y; y < building.y + building.h; y += 1) {
      for (let x = building.x; x < building.x + building.w; x += 1) {
        ruin(ctx, x, y, cell, palette, building.tier);
      }
    }
  }
}
