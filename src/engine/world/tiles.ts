// M-13: shared cardinal topology, design.md §7.1.
import { WORLD } from '../balance';

/**
 * El corazón del valle: el rectángulo productivo, centrado en el mapa.
 *
 * Aquí y no en `mapgen.ts` porque **no es sólo cosa del generador**: es dónde
 * se puede construir (`placement.ts`) y contra qué mide la economía
 * (`conditions.ts`). Tres módulos con su propia copia del mismo rectángulo son
 * tres rectángulos distintos en cuanto alguien toque `WORLD.HEART_WIDTH`.
 */
export const HEART = {
  x0: Math.floor((WORLD.WIDTH - WORLD.HEART_WIDTH) / 2),
  y0: Math.floor((WORLD.HEIGHT - WORLD.HEART_HEIGHT) / 2),
  x1: Math.floor((WORLD.WIDTH - WORLD.HEART_WIDTH) / 2) + WORLD.HEART_WIDTH,
  y1: Math.floor((WORLD.HEIGHT - WORLD.HEART_HEIGHT) / 2) + WORLD.HEART_HEIGHT,
} as const;

/**
 * Si una celda cae dentro del valle productivo.
 *
 * Era el rectángulo de arriba; desde el 2 oct 2026 es el contorno que cada mapa
 * guarda (`ValleyMap.heart`, `valley-shape.ts`), con la misma superficie. El
 * rectángulo se queda como lo que era al generar —por dónde entra el río y
 * dónde puede caer el claro— y como el contorno de las partidas de antes.
 */
export function inHeart(map: HeartMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height && map.heart[y * map.width + x] === 1;
}

type HeartMap = { readonly width: number; readonly height: number; readonly heart: Uint8Array };

const BOXES = new WeakMap<Uint8Array, { x0: number; y0: number; x1: number; y1: number }>();

/**
 * La caja que contiene el valle, `[x0, x1) × [y0, y1)`. Es lo que recorre quien
 * busca solar: medido cuando el bucle de `placement.ts` dejó de recorrer el
 * mapa entero, recorrer de más cuesta segundos de la suite. Se recuerda por
 * contorno, que no cambia en toda la partida.
 */
export function heartBox(map: HeartMap): { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number } {
  const known = BOXES.get(map.heart);
  if (known !== undefined) return known;
  const box = { x0: map.width, y0: map.height, x1: 0, y1: 0 };
  for (let cell = 0; cell < map.heart.length; cell += 1) {
    if (map.heart[cell] !== 1) continue;
    const x = cell % map.width;
    const y = Math.floor(cell / map.width);
    box.x0 = Math.min(box.x0, x);
    box.y0 = Math.min(box.y0, y);
    box.x1 = Math.max(box.x1, x + 1);
    box.y1 = Math.max(box.y1, y + 1);
  }
  BOXES.set(map.heart, box);
  return box;
}

/** Si un rectángulo de celdas cae entero dentro del valle. */
export function footprintInHeart(map: HeartMap, x: number, y: number, w: number, h: number): boolean {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) if (!inHeart(map, col, row)) return false;
  }
  return true;
}

/** El rectángulo de siempre, como contorno: el de las partidas de antes y el de los mapas hechos a mano. */
export function rectangleHeart(): Uint8Array {
  const heart = new Uint8Array(WORLD.WIDTH * WORLD.HEIGHT);
  for (let y = HEART.y0; y < HEART.y1; y += 1) {
    for (let x = HEART.x0; x < HEART.x1; x += 1) heart[y * WORLD.WIDTH + x] = 1;
  }
  return heart;
}

export function idx(x: number, y: number): number {
  return y * WORLD.WIDTH + x;
}

export function neighbours4(i: number): number[] {
  const x = i % WORLD.WIDTH;
  const y = Math.floor(i / WORLD.WIDTH);
  const result: number[] = [];
  if (y > 0) result.push(idx(x, y - 1));
  if (x > 0) result.push(idx(x - 1, y));
  if (x + 1 < WORLD.WIDTH) result.push(idx(x + 1, y));
  if (y + 1 < WORLD.HEIGHT) result.push(idx(x, y + 1));
  return result;
}
