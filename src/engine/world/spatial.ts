import { TERRAIN_CODE, type BuildingKind, type GameState, type ValleyMap } from '../state';

export interface Plot { x: number; y: number; w: number; h: number }

/** La geometría física: el bosque y el vado dejan pasar; la roca no. */
export function walkableTerrain(tile: number | undefined): boolean {
  return tile !== undefined && tile !== TERRAIN_CODE.water && tile !== TERRAIN_CODE.rock
    && tile !== TERRAIN_CODE.mountain && tile !== TERRAIN_CODE.lake;
}

export function solidKind(kind: BuildingKind): boolean {
  return kind !== 'field' && kind !== 'grave_yard' && kind !== 'well' && kind !== 'gate';
}

export function markPlot(mask: Uint8Array, width: number, height: number, plot: Plot): void {
  for (let y = Math.max(0, plot.y); y < Math.min(height, plot.y + plot.h); y++) {
    for (let x = Math.max(0, plot.x); x < Math.min(width, plot.x + plot.w); x++) mask[y * width + x] = 1;
  }
}

/** Sólo datos derivados. Las obras reservan su volumen futuro; nunca se guardan máscaras. */
export function walkingBlocked(state: GameState): Uint8Array {
  const { width, height, terrain } = state.map;
  const blocked = Uint8Array.from(terrain, tile => Number(!walkableTerrain(tile)));
  for (const b of state.buildings) {
    if (b.lostTick === null && solidKind(b.kind)) markPlot(blocked, width, height, b);
  }
  for (const w of state.works) {
    if (solidKind(w.kind)) markPlot(blocked, width, height, w);
  }
  // Durante la migración 7→8 todavía no existe la plaza que choosePlaza está buscando.
  const plaza = state.plaza;
  if (plaza !== undefined && plaza.x >= 0 && plaza.y >= 0 && plaza.x < width && plaza.y < height) {
    blocked[plaza.y * width + plaza.x] = 1;
  }
  return blocked;
}

/** Fachadas accesibles, sin diagonales ni celdas del interior. */
export function plotAccess(map: ValleyMap, blocked: Uint8Array, plot: Plot): number[] {
  const cells: number[] = [];
  const add = (x: number, y: number): void => {
    if (x >= 0 && y >= 0 && x < map.width && y < map.height && blocked[y * map.width + x] === 0) {
      cells.push(y * map.width + x);
    }
  };
  for (let x = plot.x; x < plot.x + plot.w; x++) { add(x, plot.y - 1); add(x, plot.y + plot.h); }
  for (let y = plot.y; y < plot.y + plot.h; y++) { add(plot.x - 1, y); add(plot.x + plot.w, y); }
  return cells;
}

export function floodCells(map: ValleyMap, blocked: Uint8Array, starts: readonly number[]): Uint8Array {
  const seen = new Uint8Array(blocked.length);
  const queue: number[] = [];
  for (const cell of starts) if (blocked[cell] === 0 && seen[cell] === 0) { seen[cell] = 1; queue.push(cell); }
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head]!;
    const x = cell % map.width, y = Math.floor(cell / map.width);
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      const next = ny * map.width + nx;
      if (seen[next] !== 0 || blocked[next] !== 0) continue;
      seen[next] = 1; queue.push(next);
    }
  }
  return seen;
}

/** Reutiliza los costes de A* sobre la misma transitabilidad que los cuerpos. */
export function walkingMap(state: GameState, blocked = walkingBlocked(state)): ValleyMap {
  const terrain = Uint8Array.from(state.map.terrain, (tile, cell) => blocked[cell] === 1
    ? TERRAIN_CODE.water : tile === TERRAIN_CODE.marsh ? TERRAIN_CODE.meadow : tile);
  return { ...state.map, terrain };
}
