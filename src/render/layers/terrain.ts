// M-16 · Terrain regions and paths. The map is read, never mutated.

import { TERRAIN_CODE, type ValleyMap } from '@engine/state';
import type { Palette } from '../palette';

interface Point { x: number; y: number }
interface Edge { from: Point; to: Point }

function key(point: Point): string { return `${point.x},${point.y}`; }

function jitter(point: Point, width: number, height: number): Point {
  if (point.x === 0 || point.y === 0 || point.x === width || point.y === height) return point;
  const hash = Math.imul(point.x + 17, 73856093) ^ Math.imul(point.y + 31, 19349663);
  const dx = (((hash >>> 1) & 255) / 255 - 0.5) * 0.3;
  const dy = (((hash >>> 9) & 255) / 255 - 0.5) * 0.3;
  return { x: point.x + dx, y: point.y + dy };
}

function boundary(map: ValleyMap, terrain: number): Edge[] {
  const edges: Edge[] = [];
  const same = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < map.width && y < map.height
    && map.terrain[y * map.width + x] === terrain;
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (!same(x, y)) continue;
      if (!same(x, y - 1)) edges.push({ from: { x, y }, to: { x: x + 1, y } });
      if (!same(x + 1, y)) edges.push({ from: { x: x + 1, y }, to: { x: x + 1, y: y + 1 } });
      if (!same(x, y + 1)) edges.push({ from: { x: x + 1, y: y + 1 }, to: { x, y: y + 1 } });
      if (!same(x - 1, y)) edges.push({ from: { x, y: y + 1 }, to: { x, y } });
    }
  }
  return edges;
}

function turnRank(previous: Edge, candidate: Edge): number {
  const ax = previous.to.x - previous.from.x;
  const ay = previous.to.y - previous.from.y;
  const bx = candidate.to.x - candidate.from.x;
  const by = candidate.to.y - candidate.from.y;
  const cross = ax * by - ay * bx;
  const dot = ax * bx + ay * by;
  if (cross > 0) return 0;
  if (dot > 0) return 1;
  if (cross < 0) return 2;
  return 3;
}

/** Closed outlines for all cardinal regions of one terrain code. */
export function regionContours(map: ValleyMap, terrain: number): Point[][] {
  const edges = boundary(map, terrain);
  const outgoing = new Map<string, number[]>();
  edges.forEach((edge, index) => outgoing.set(key(edge.from), [...(outgoing.get(key(edge.from)) ?? []), index]));
  const used = new Set<number>();
  const contours: Point[][] = [];
  for (let start = 0; start < edges.length; start += 1) {
    if (used.has(start)) continue;
    const points: Point[] = [];
    let current = start;
    while (!used.has(current)) {
      used.add(current);
      const edge = edges[current] as Edge;
      points.push(jitter(edge.from, map.width, map.height));
      const choices = (outgoing.get(key(edge.to)) ?? []).filter((index) => !used.has(index));
      if (choices.length === 0) break;
      choices.sort((a, b) => turnRank(edge, edges[a] as Edge) - turnRank(edge, edges[b] as Edge));
      current = choices[0] as number;
    }
    if (points.length >= 3) contours.push(points);
  }
  return contours;
}

function colourFor(code: number, palette: Palette): string {
  if (code === TERRAIN_CODE.forest) return palette.forest;
  if (code === TERRAIN_CODE.water) return palette.water;
  if (code === TERRAIN_CODE.rock) return palette.rock;
  if (code === TERRAIN_CODE.marsh || code === TERRAIN_CODE.cleared) return palette.meadowAlt;
  return palette.meadow;
}

export function paintTerrain(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  map: ValleyMap,
  palette: Palette,
  cell: number,
): void {
  ctx.fillStyle = palette.meadow;
  ctx.fillRect(0, 0, map.width * cell, map.height * cell);
  for (const code of Object.values(TERRAIN_CODE)) {
    const contours = regionContours(map, code);
    if (contours.length === 0) continue;
    ctx.beginPath();
    for (const contour of contours) {
      ctx.moveTo((contour[0] as Point).x * cell, (contour[0] as Point).y * cell);
      for (const point of contour.slice(1)) ctx.lineTo(point.x * cell, point.y * cell);
      ctx.closePath();
    }
    ctx.fillStyle = colourFor(code, palette);
    ctx.fill('evenodd');
  }
}

export function paintPaths(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  map: ValleyMap,
  palette: Palette,
  cell: number,
): void {
  ctx.strokeStyle = palette.path;
  ctx.fillStyle = palette.path;
  ctx.lineCap = 'round';
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const at = y * map.width + x;
      const level = map.path[at] as number;
      if (level === 0) continue;
      const width = [0, 0.14, 0.24, 0.36][level] as number;
      ctx.lineWidth = width * cell;
      ctx.beginPath();
      ctx.arc((x + 0.5) * cell, (y + 0.5) * cell, width * cell / 2, 0, Math.PI * 2);
      ctx.fill();
      for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= map.width || ny >= map.height || map.path[ny * map.width + nx] === 0) continue;
        ctx.beginPath();
        ctx.moveTo((x + 0.5) * cell, (y + 0.5) * cell);
        ctx.lineTo((nx + 0.5) * cell, (ny + 0.5) * cell);
        ctx.stroke();
      }
    }
  }
}

