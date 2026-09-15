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

/** Si una celda cae dentro del corazón. */
export function inHeart(x: number, y: number): boolean {
  return x >= HEART.x0 && x < HEART.x1 && y >= HEART.y0 && y < HEART.y1;
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
