import { BUILDINGS, BUILDING_RULES } from '../balance';
import { TERRAIN_CODE } from '../state';
import type { BuildingKind, GameState } from '../state';

interface Rect { x: number; y: number; w: number; h: number }
interface Point { x: number; y: number }
export const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Existing works reserve their entire future footprint, including church growth. */
export function canPlace(state: GameState, kind: BuildingKind, x: number, y: number, upgradeOf: number | null = null): boolean {
  const { w, h } = BUILDINGS[kind];
  const rect = { x, y, w, h };
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x + w > state.map.width || y + h > state.map.height) return false;
  for (let row = y; row < y + h; row += 1) for (let col = x; col < x + w; col += 1) {
    const tile = state.map.terrain[row * state.map.width + col];
    if (tile === TERRAIN_CODE.water || tile === TERRAIN_CODE.marsh) return false;
    if (kind === 'field' && tile !== TERRAIN_CODE.meadow && tile !== TERRAIN_CODE.cleared) return false;
  }
  if (state.buildings.some((b) => b.id !== upgradeOf && (b.lostTick === null || b.tier === 1) && overlaps(rect, b))) return false;
  return !state.works.some((work) => overlaps(rect, work));
}

function distance(a: Point, b: Point): number { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2; }
function center(rect: Rect): Point { return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 }; }
function cross(o: Point, a: Point, b: Point): number { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }

function convexHull(points: Point[]): Point[] {
  const sorted = points.sort((a, b) => a.x - b.x || a.y - b.y);
  const half = (input: Point[]): Point[] => {
    const out: Point[] = [];
    for (const point of input) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, point) <= 0) out.pop();
      out.push(point);
    }
    return out.slice(0, -1);
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

function edgeDistance(point: Point, a: Point, b: Point): number {
  const length = distance(a, b);
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * (b.x - a.x) + (point.y - a.y) * (b.y - a.y)) / length));
  return Math.sqrt(distance(point, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }));
}

/** Cell centres in the outermost one-cell band of the dilated convex hull. */
function onEnvelope(point: Point, hull: Point[]): boolean {
  if (hull.length < 3) return false;
  let inside = true;
  let d = Number.POSITIVE_INFINITY;
  for (let i = 0; i < hull.length; i += 1) {
    const a = hull[i]!;
    const b = hull[(i + 1) % hull.length]!;
    if (cross(a, b, point) < 0) inside = false;
    d = Math.min(d, edgeDistance(point, a, b));
  }
  if (inside) return false;
  return d > BUILDING_RULES.PALISADE_DILATION - 1 && d <= BUILDING_RULES.PALISADE_DILATION;
}

function occupiedCells(state: GameState): Uint8Array {
  const occupied = new Uint8Array(state.map.terrain.length);
  const mark = (rect: Rect): void => {
    for (let y = rect.y; y < rect.y + rect.h; y += 1) {
      for (let x = rect.x; x < rect.x + rect.w; x += 1) occupied[y * state.map.width + x] = 1;
    }
  };
  for (const building of state.buildings) {
    if (building.lostTick === null || building.tier === 1) mark(building);
  }
  for (const work of state.works) mark(work);
  return occupied;
}

function fitsEmptyGround(
  state: GameState,
  kind: BuildingKind,
  x: number,
  y: number,
  occupied: Uint8Array,
): boolean {
  const { w, h } = BUILDINGS[kind];
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      const cell = row * state.map.width + col;
      const tile = state.map.terrain[cell];
      if (occupied[cell] !== 0 || tile === TERRAIN_CODE.water || tile === TERRAIN_CODE.marsh) return false;
      if (kind === 'field' && tile !== TERRAIN_CODE.meadow && tile !== TERRAIN_CODE.cleared) return false;
    }
  }
  return true;
}

function lowerScore(candidate: number[], incumbent: number[]): boolean {
  for (let i = 0; i < candidate.length; i += 1) {
    if (candidate[i]! < incumbent[i]!) return true;
    if (candidate[i]! > incumbent[i]!) return false;
  }
  return false;
}

/**
 * §7.4 has no weights or elevation layer. Rank the stated preferences in their
 * written order, lexicographically; rock is the high-ground proxy, meadow by
 * water the prime-land proxy. Exact ties go to the lower row-major cell index.
 */
export function placeBuilding(state: GameState, kind: BuildingKind): Point | null {
  const live = state.buildings.filter((b) => b.lostTick === null);
  const houses = live.filter((b) => b.kind === 'house' || b.kind === 'stone_house');
  const fields = live.filter((b) => b.kind === 'field');
  const occupied = occupiedCells(state);
  const fieldCells = new Uint8Array(state.map.terrain.length);
  for (const field of fields) {
    for (let y = field.y; y < field.y + field.h; y += 1) {
      for (let x = field.x; x < field.x + field.w; x += 1) fieldCells[y * state.map.width + x] = 1;
    }
  }
  const centre = houses.length === 0 ? { x: state.map.width / 2, y: state.map.height / 2 }
    : { x: houses.reduce((n, b) => n + center(b).x, 0) / houses.length, y: houses.reduce((n, b) => n + center(b).y, 0) / houses.length };
  const hull = convexHull(houses.flatMap((b) => [{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y },
    { x: b.x + b.w, y: b.y + b.h }, { x: b.x, y: b.y + b.h }]));
  // How far a point sits from the edge of the built core, in cells. Zero is on
  // the rim; `set` pushes it that many cells beyond. This is the one shape §7.4
  // asks for twice — "en el borde del núcleo" and "algo apartada" — and it is a
  // distance, not a weight, so nothing has to be tuned against anything else.
  const coreRadius = Math.sqrt(Math.max(...houses.map((h) => distance(center(h), centre)), 0));
  const rimOffset = (p: Point, set: number): number =>
    Math.abs(Math.sqrt(distance(p, centre)) - (coreRadius + set));
  let best: Point | null = null;
  let bestScore: number[] | null = null;
  const spec = BUILDINGS[kind];
  for (let y = 0; y <= state.map.height - spec.h; y += 1) for (let x = 0; x <= state.map.width - spec.w; x += 1) {
    if (!fitsEmptyGround(state, kind, x, y, occupied)) continue;
    const rect = { x, y, w: spec.w, h: spec.h };
    const p = center(rect);
    if (kind === 'palisade' && !onEnvelope(p, hull)) continue;
    let river = false;
    let touchesForest = false;
    let path = false;
    let touchesField = false;
    for (let row = y - 1; row <= y + spec.h; row += 1) for (let col = x - 1; col <= x + spec.w; col += 1) {
      if (row < 0 || col < 0 || row >= state.map.height || col >= state.map.width) continue;
      if ((row === y - 1 || row === y + spec.h) && col >= x && col < x + spec.w ||
        (col === x - 1 || col === x + spec.w) && row >= y && row < y + spec.h) {
        const cell = row * state.map.width + col;
        river ||= state.map.terrain[cell] === TERRAIN_CODE.water;
        touchesForest ||= state.map.terrain[cell] === TERRAIN_CODE.forest;
        path ||= (state.map.path[cell] ?? 0) > 0;
        touchesField ||= fieldCells[cell] !== 0;
      }
    }
    const houseDistance = houses.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...houses.map((h) => distance(p, center(h))));
    const fieldDistance = fields.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...fields.map((f) => distance(p, center(f))));
    const rock = state.map.terrain[y * state.map.width + x] === TERRAIN_CODE.rock;
    let score: number[];
    switch (kind) {
      case 'house': case 'stone_house': score = [distance(p, centre), Number(!path), Number(river)]; break;
      // "Lejos del bosque" es *no pegado* al bosque, no lo más lejos posible.
      // Maximizar esa distancia manda los campos al borde del mapa y deja la
      // aldea desperdigada por el valle, que es justo lo contrario de §7.4.
      case 'field': score = [Number(!touchesField && !river), Number(touchesForest), distance(p, centre)]; break;
      case 'granary':
        if (houseDistance >= BUILDING_RULES.GRANARY_HOUSE_DISTANCE ** 2) continue;
        score = [Number(!touchesField), fieldDistance, houseDistance]; break;
      // "Algo apartada" es al otro lado del borde del núcleo, no en la esquina
      // opuesta del mapa: maximizar la distancia a las casas deja la capilla
      // contra el borde, donde una iglesia de 3×3 ya no cabe.
      // Set-back first, rounded to whole cells, and "alta y visible" as the
      // tie-break within that ring. The other way round, a rock outcrop
      // fifteen cells away outranks every sensible spot and the chapel ends up
      // in a corner of the map — where a 3×3 church can no longer replace it.
      case 'chapel': case 'church': score = [Math.round(rimOffset(p, BUILDING_RULES.CHAPEL_SET_BACK)), Number(!rock), distance(p, centre)]; break;
      case 'smithy': score = [rimOffset(p, 0), -houseDistance]; break;
      default: score = [distance(p, centre)];
    }
    if (bestScore === null || lowerScore(score, bestScore)) {
      best = { x, y }; bestScore = score;
    }
  }
  return best;
}
