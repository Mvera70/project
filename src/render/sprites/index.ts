// M-17 · Code-drawn sprites. Coordinates are map cells; `cell` scales them.

import type { BuildingKind } from '@engine/state';
import { outline, type Palette } from '../palette';

export type DrawingContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type Sprite = (
  ctx: DrawingContext,
  x: number,
  y: number,
  cell: number,
  palette: Palette,
  tier: 0 | 1,
) => void;

function rect(ctx: DrawingContext, x: number, y: number, w: number, h: number, fill: string, cell: number): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = outline(fill);
  ctx.lineWidth = Math.max(1, cell * 0.12);
  ctx.beginPath();
  ctx.rect(x * cell, y * cell, w * cell, h * cell);
  ctx.fill();
  ctx.stroke();
}

function polygon(ctx: DrawingContext, points: readonly [number, number][], fill: string, cell: number): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = outline(fill);
  ctx.lineWidth = Math.max(1, cell * 0.12);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const first = points[0] as [number, number];
  ctx.moveTo(first[0] * cell, first[1] * cell);
  for (const point of points.slice(1)) ctx.lineTo(point[0] * cell, point[1] * cell);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export const house: Sprite = (ctx, x, y, cell, palette, tier) => {
  const body = tier === 1 ? palette.rock : palette.wood;
  polygon(ctx, [[x + 0.2, y + 0.85], [x + 1.8, y + 0.85], [x + 1.7, y + 1.95], [x + 0.3, y + 1.95]], body, cell);
  polygon(ctx, [[x + 0.08, y + 0.9], [x + 1, y + 0.07], [x + 1.92, y + 0.9]], palette.roof, cell);
  ctx.fillStyle = outline(body);
  ctx.fillRect((x + 0.85) * cell, (y + 1.45) * cell, 0.3 * cell, 0.5 * cell);
  if (tier === 1) rect(ctx, x + 1.45, y + 0.18, 0.25, 0.55, palette.rock, cell);
};

export const stoneHouse: Sprite = (ctx, x, y, cell, palette) => house(ctx, x, y, cell, palette, 1);

export const field: Sprite = (ctx, x, y, cell, palette) => {
  ctx.fillStyle = palette.field;
  ctx.fillRect(x * cell, y * cell, 3 * cell, 2 * cell);
  ctx.strokeStyle = outline(palette.field);
  ctx.lineWidth = Math.max(1, cell * 0.08);
  for (let row = 1; row <= 5; row += 1) {
    const yy = (y + row / 3) * cell;
    ctx.beginPath(); ctx.moveTo((x + 0.18) * cell, yy); ctx.lineTo((x + 2.82) * cell, yy); ctx.stroke();
  }
};

export const granary: Sprite = (ctx, x, y, cell, palette) => {
  rect(ctx, x + 0.35, y + 0.35, 1.3, 1.15, palette.wood, cell);
  polygon(ctx, [[x + 0.2, y + 0.4], [x + 1, y + 0.05], [x + 1.8, y + 0.4]], palette.roof, cell);
  ctx.strokeStyle = outline(palette.wood); ctx.lineWidth = Math.max(1, cell * 0.12);
  for (const px of [0.45, 0.75, 1.25, 1.55]) {
    ctx.beginPath(); ctx.moveTo((x + px) * cell, (y + 1.45) * cell); ctx.lineTo((x + px) * cell, (y + 1.95) * cell); ctx.stroke();
  }
};

export const chapel: Sprite = (ctx, x, y, cell, palette) => {
  rect(ctx, x + 0.15, y + 0.8, 1.7, 1.1, palette.accent, cell);
  polygon(ctx, [[x + 0.08, y + 0.85], [x + 1, y + 0.42], [x + 1.92, y + 0.85]], palette.roof, cell);
  rect(ctx, x + 0.75, y + 0.05, 0.5, 1.2, palette.wood, cell);
  ctx.strokeStyle = outline(palette.accent); ctx.lineWidth = Math.max(1, cell * 0.12);
  ctx.beginPath(); ctx.moveTo((x + 1) * cell, (y + 0.1) * cell); ctx.lineTo((x + 1) * cell, (y + 0.42) * cell); ctx.moveTo((x + 0.82) * cell, (y + 0.2) * cell); ctx.lineTo((x + 1.18) * cell, (y + 0.2) * cell); ctx.stroke();
};

export const church: Sprite = (ctx, x, y, cell, palette) => {
  rect(ctx, x + 0.1, y + 1.1, 2.8, 1.8, palette.rock, cell);
  polygon(ctx, [[x + 0.08, y + 1.18], [x + 1.55, y + 0.62], [x + 2.92, y + 1.18]], palette.roof, cell);
  rect(ctx, x + 0.3, y + 0.15, 1, 2.3, palette.rock, cell);
  polygon(ctx, [[x + 0.2, y + 0.25], [x + 0.8, y + 0.07], [x + 1.4, y + 0.25]], palette.roof, cell);
};

export const smithy: Sprite = (ctx, x, y, cell, palette) => {
  polygon(ctx, [[x + 0.08, y + 0.55], [x + 1, y + 0.12], [x + 1.92, y + 0.55]], palette.roof, cell);
  ctx.strokeStyle = outline(palette.wood); ctx.lineWidth = Math.max(1, cell * 0.16);
  for (const px of [0.25, 1.75]) { ctx.beginPath(); ctx.moveTo((x + px) * cell, (y + 0.5) * cell); ctx.lineTo((x + px) * cell, (y + 1.95) * cell); ctx.stroke(); }
  ctx.fillStyle = palette.accent; ctx.beginPath(); ctx.arc((x + 1.05) * cell, (y + 1.5) * cell, 0.28 * cell, 0, Math.PI * 2); ctx.fill();
  polygon(ctx, [[x + 0.55, y + 1.35], [x + 1.3, y + 1.35], [x + 1.15, y + 1.6], [x + 0.65, y + 1.6]], outline(palette.rock), cell);
};

export const mill: Sprite = (ctx, x, y, cell, palette) => {
  polygon(ctx, [[x + 0.55, y + 0.55], [x + 1.45, y + 0.55], [x + 1.65, y + 1.95], [x + 0.35, y + 1.95]], palette.wood, cell);
  polygon(ctx, [[x + 0.45, y + 0.6], [x + 1, y + 0.18], [x + 1.55, y + 0.6]], palette.roof, cell);
  ctx.strokeStyle = outline(palette.accent); ctx.lineWidth = Math.max(1, cell * 0.1);
  for (let i = 0; i < 4; i += 1) { const a = Math.PI / 4 + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo((x + 1) * cell, (y + 1.05) * cell); ctx.lineTo((x + 1 + Math.cos(a) * 0.85) * cell, (y + 1.05 + Math.sin(a) * 0.85) * cell); ctx.stroke(); }
};

export const well: Sprite = (ctx, x, y, cell, palette) => {
  ctx.fillStyle = palette.rock; ctx.strokeStyle = outline(palette.rock); ctx.lineWidth = Math.max(1, cell * 0.1);
  ctx.beginPath(); ctx.ellipse((x + 0.5) * cell, (y + 0.67) * cell, 0.42 * cell, 0.22 * cell, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo((x + 0.18) * cell, (y + 0.65) * cell); ctx.lineTo((x + 0.18) * cell, (y + 0.15) * cell); ctx.lineTo((x + 0.82) * cell, (y + 0.15) * cell); ctx.lineTo((x + 0.82) * cell, (y + 0.65) * cell); ctx.stroke();
};

export const palisade: Sprite = (ctx, x, y, cell, palette, tier) => {
  const fill = tier === 1 ? palette.rock : palette.wood;
  ctx.strokeStyle = outline(fill); ctx.fillStyle = fill; ctx.lineWidth = Math.max(1, cell * 0.1);
  for (let i = 0; i < 4; i += 1) polygon(ctx, [[x + 0.07 + i * 0.2, y + 0.9], [x + 0.07 + i * 0.2 + 0.11, y + 0.11], [x + 0.07 + i * 0.2 + 0.22, y + 0.9]], fill, cell);
};

export const wall: Sprite = (ctx, x, y, cell, palette) => {
  rect(ctx, x + 0.07, y + 0.28, 0.86, 0.65, palette.rock, cell);
  for (let i = 0; i < 3; i += 1) ctx.fillRect((x + 0.04 + i * 0.34) * cell, y * cell, 0.2 * cell, 0.35 * cell);
};

export const watchtower: Sprite = (ctx, x, y, cell, palette) => {
  rect(ctx, x + 0.35, y + 0.45, 1.3, 1.5, palette.rock, cell);
  for (let i = 0; i < 4; i += 1) ctx.fillRect((x + 0.28 + i * 0.4) * cell, (y + 0.18) * cell, 0.22 * cell, 0.35 * cell);
};

export const graveYard: Sprite = (ctx, x, y, cell, palette) => {
  ctx.strokeStyle = outline(palette.rock); ctx.lineWidth = Math.max(1, cell * 0.1);
  for (const [px, py] of [[0.5, 0.5], [1.4, 1.15], [2.35, 0.55]] as const) {
    ctx.beginPath(); ctx.moveTo((x + px) * cell, (y + py) * cell); ctx.lineTo((x + px) * cell, (y + py + 0.65) * cell); ctx.moveTo((x + px - 0.2) * cell, (y + py + 0.2) * cell); ctx.lineTo((x + px + 0.2) * cell, (y + py + 0.2) * cell); ctx.stroke();
  }
};

export const BUILDING_SPRITES: Readonly<Record<BuildingKind, Sprite>> = {
  house, stone_house: stoneHouse, field, granary, chapel, church, smithy, mill,
  well, palisade, wall, watchtower, grave_yard: graveYard,
};

export const NAMED_TONES = ['#a34f3f', '#3f6fa3', '#7b5aa6', '#b27636', '#3e8063', '#9a4770', '#65733b', '#776154'] as const;

export const villager: Sprite = (ctx, x, y, cell, palette) => {
  const fill = palette.wood;
  ctx.fillStyle = fill; ctx.strokeStyle = outline(fill); ctx.lineWidth = Math.max(1, cell * 0.1);
  ctx.beginPath(); ctx.ellipse((x + 0.5) * cell, (y + 1.02) * cell, 0.225 * cell, 0.4 * cell, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc((x + 0.5) * cell, (y + 0.34) * cell, 0.16 * cell, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
};

export function namedVillager(tone: string): Sprite {
  return (ctx, x, y, cell, palette) => {
    ctx.fillStyle = tone; ctx.strokeStyle = outline(tone); ctx.lineWidth = Math.max(1, cell * 0.1);
    ctx.beginPath(); ctx.ellipse((x + 0.5) * cell, (y + 1.24) * cell, 0.225 * cell, 0.48 * cell, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc((x + 0.5) * cell, (y + 0.4) * cell, 0.18 * cell, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = palette.accent; ctx.beginPath(); ctx.arc((x + 0.5) * cell, (y + 0.1) * cell, 0.08 * cell, 0, Math.PI * 2); ctx.fill();
  };
}

// --- §7.7 · Livestock -------------------------------------------------------
//
// Deliberately small and plain: they read at 10 px as "there is an animal
// there", which is all this slice claims. The art pass will replace them, and
// nothing else depends on how they look.

/** A body and a head, sized and toned per kind. */
function beast(
  bodyW: number, bodyH: number, headAt: number, tone: (p: Palette) => string, crest?: string,
): Sprite {
  return (ctx, x, y, cell, palette) => {
    const fill = tone(palette);
    ctx.fillStyle = fill;
    ctx.strokeStyle = outline(fill);
    ctx.lineWidth = Math.max(1, cell * 0.08);
    ctx.beginPath();
    ctx.ellipse((x + 0.5) * cell, (y + 0.62) * cell, bodyW * cell, bodyH * cell, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc((x + 0.5 + headAt) * cell, (y + 0.44) * cell, bodyH * 0.62 * cell, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (crest !== undefined) {
      ctx.fillStyle = crest;
      ctx.beginPath();
      ctx.arc((x + 0.5 + headAt) * cell, (y + 0.3) * cell, bodyH * 0.3 * cell, 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

export const hen: Sprite = beast(0.16, 0.11, 0.14, (p) => p.accent, '#c9463c');
export const pig: Sprite = beast(0.21, 0.13, 0.18, () => '#c9948f');
// Cream and not `palette.rock`: that IS the colour of the map's rock patches,
// and a grey cow on green grass read as a stone (looked at, v2.87).
export const cow: Sprite = beast(0.28, 0.17, 0.24, () => '#e2ddcf', '#4a3f33');

export const crow: Sprite = (ctx, x, y, cell, palette) => {
  // A dark wedge with two wings: at ten pixels a bird is a silhouette.
  void palette;
  ctx.fillStyle = '#2b2b28';
  ctx.strokeStyle = '#1a1a18';
  ctx.lineWidth = Math.max(1, cell * 0.06);
  ctx.beginPath();
  ctx.ellipse((x + 0.5) * cell, (y + 0.5) * cell, 0.14 * cell, 0.09 * cell, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo((x + 0.24) * cell, (y + 0.4) * cell);
  ctx.lineTo((x + 0.5) * cell, (y + 0.5) * cell);
  ctx.lineTo((x + 0.76) * cell, (y + 0.4) * cell);
  ctx.stroke();
};

export const wolf: Sprite = beast(0.24, 0.12, 0.22, () => '#6d6a63', '#d9d2c2');

export const fish: Sprite = (ctx, x, y, cell, palette) => {
  // A ripple, not a fish: what you see from a bank is the water moving.
  ctx.strokeStyle = palette.accent;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = Math.max(1, cell * 0.07);
  ctx.beginPath();
  ctx.ellipse((x + 0.5) * cell, (y + 0.5) * cell, 0.24 * cell, 0.1 * cell, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
};

export const ruin: Sprite = (ctx, x, y, cell, palette) => {
  ctx.strokeStyle = outline(palette.wood); ctx.lineWidth = Math.max(1, cell * 0.14); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo((x + 0.1) * cell, (y + 0.85) * cell); ctx.lineTo((x + 0.45) * cell, (y + 0.45) * cell); ctx.lineTo((x + 0.8) * cell, (y + 0.78) * cell); ctx.moveTo((x + 0.22) * cell, (y + 0.9) * cell); ctx.lineTo((x + 0.72) * cell, (y + 0.9) * cell); ctx.stroke();
};
