// M-13: shared cardinal topology, design.md §7.1.
import { WORLD } from '../balance';

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
