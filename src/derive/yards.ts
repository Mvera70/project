// El valle más vivo (25 sep 2026) · Tendederos y huertos junto a las casas.
//
// Pedido por Vera («tendederos y huertos»). Una casa sola en el prado parece
// una maqueta; con la ropa tendida al lado y un bancal de coles detrás, parece
// que alguien vive en ella. Esto dice **qué casa tiene qué y en qué lado**, sin
// azar ni estado: sale del `id` de la casa y del suelo que la rodea, así que la
// misma casa tiene siempre el mismo huerto. Lo dibuja `effects/yards.ts`.

import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type Building, type GameState } from '@engine/state';

export type YardKind = 'line' | 'garden';

export interface Yard {
  readonly house: number;
  readonly kind: YardKind;
  /** Centro de la pieza, en celdas. */
  readonly x: number;
  readonly z: number;
  /** Hacia dónde corre a lo largo de la pared: `x` o `z`. */
  readonly along: 'x' | 'z';
}

/**
 * TUNE: cuántas casas **querrían** cada cosa, en partes de mil. Lo que manda
 * de verdad es el sitio: medido en las semillas 7, 11, 23 y 41 al año 20, sólo
 * tienen un lado libre de prado limpio entre un tercio y dos tercios de las
 * casas (de 3 a 6 piezas por aldea de 9 a 12 casas), porque los campos, los
 * caminos y la leña del corral les llegan a la pared. Con todas iguales el
 * pueblo parece hecho en serie; con menos, no se ve ninguna.
 */
const LINE_SHARE = 700;
const GARDEN_SHARE = 550;
/**
 * Lo que se aparta la pieza de la pared, en celdas. Y se piden **dos** celdas
 * libres de fondo, no una: la primera toma de la semilla 11 puso un bancal en
 * el callejón de una celda entre dos casas, metido tres décimas en la de al
 * lado y tapando el paso.
 */
const OFF = 0.85;
const DEPTH = 2;
/** Radio de la plaza que se deja libre: ni huertos ni ropa en la plaza. */
const PLAZA_CLEAR = 4;

/** Los cuatro lados, como `homeRoutine` (`life/home.ts`): 0 es la fachada a +Z. */
const SIDES = [0, -Math.PI / 2, Math.PI / 2, Math.PI] as const;

function sideCells(house: Building, facing: number): [number, number, number][] {
  const dx = Math.round(Math.sin(facing));
  const dz = Math.round(Math.cos(facing));
  const cells: [number, number, number][] = [];
  for (let depth = 0; depth < DEPTH; depth += 1) {
    if (dz !== 0) {
      const z = dz > 0 ? house.y + house.h + depth : house.y - 1 - depth;
      for (let x = house.x; x < house.x + house.w; x += 1) cells.push([x, z, depth]);
    } else {
      const x = dx > 0 ? house.x + house.w + depth : house.x - 1 - depth;
      for (let z = house.y; z < house.y + house.h; z += 1) cells.push([x, z, depth]);
    }
  }
  return cells;
}

/**
 * Los tendederos y huertos de hoy. `doors` es la fachada de cada casa, si quien
 * llama la sabe (`homeRoutine`): ese lado se deja libre, que por ahí se entra.
 * `occupied` son celdas que el render ya llenó —las piedras y pilas de leña del
 * corral (`steadingOf`)—, que el estado no sabe.
 */
export function yardsOf(
  state: Readonly<GameState>, doors: ReadonlyMap<number, number> = new Map(),
  occupied: ReadonlySet<number> = new Set(),
): Yard[] {
  const { width, height, terrain } = state.map;
  const standing = state.buildings.filter((b) => b.lostTick === null);
  const taken = new Uint8Array(width * height);
  for (const b of standing) {
    for (let z = b.y; z < b.y + b.h; z += 1) {
      for (let x = b.x; x < b.x + b.w; x += 1) {
        if (x >= 0 && z >= 0 && x < width && z < height) taken[z * width + x] = 1;
      }
    }
  }
  const plaza = { x: state.plaza.x + 0.5, z: state.plaza.y + 0.5 };
  // La franja pegada a la pared tiene que ser prado limpio; la de detrás sólo
  // tiene que no ser una casa, porque la pieza apenas entra en ella.
  const free = (x: number, z: number, depth: number): boolean => {
    if (x < 0 || z < 0 || x >= width || z >= height) return false;
    const cell = z * width + x;
    if (taken[cell] === 1) return false;
    if (depth > 0) return true;
    return !occupied.has(cell) && terrain[cell] === TERRAIN_CODE.meadow && (state.map.path[cell] ?? 0) === 0
      && Math.hypot(x + 0.5 - plaza.x, z + 0.5 - plaza.z) > PLAZA_CLEAR;
  };
  const yards: Yard[] = [];
  for (const house of standing) {
    if (house.kind !== 'house') continue;
    const door = doors.get(house.id) ?? 0;
    const open = SIDES.filter((facing) => Math.abs(Math.sin(facing - door)) > 0.5 || Math.cos(facing - door) < -0.5)
      .filter((facing) => sideCells(house, facing).every(([x, z, depth]) => free(x, z, depth)));
    const wants: YardKind[] = [];
    if (hash32(house.id, 'yard:line') % 1000 < LINE_SHARE) wants.push('line');
    if (hash32(house.id, 'yard:garden') % 1000 < GARDEN_SHARE) wants.push('garden');
    const start = hash32(house.id, 'yard:side') % Math.max(1, open.length);
    wants.forEach((kind, n) => {
      const facing = open[(start + n) % Math.max(1, open.length)];
      if (facing === undefined || n >= open.length) return;
      const dx = Math.round(Math.sin(facing));
      const dz = Math.round(Math.cos(facing));
      const cx = house.x + house.w / 2;
      const cz = house.y + house.h / 2;
      yards.push({
        house: house.id, kind,
        x: cx + dx * (house.w / 2 + OFF),
        z: cz + dz * (house.h / 2 + OFF),
        along: dz !== 0 ? 'x' : 'z',
      });
    });
  }
  return yards;
}
