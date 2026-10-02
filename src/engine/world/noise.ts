// Ruido de valor del generador del mapa, design.md §7.1.
//
// Vivía dentro de `mapgen.ts`; sale aquí porque el contorno del valle
// (`valley-shape.ts`) lo necesita y `mapgen.ts` importa ese módulo. Mismo
// código y mismas tiradas: moverlo no cambia un solo mapa.
import { WORLD } from '../balance';
import { next } from '../rng';
import type { RngBundle } from '../rng';

/** Una rejilla de nudos aleatorios cada `scale` celdas, interpolada con suavidad. */
export function noiseGrid(b: RngBundle, scale: number): (x: number, y: number) => number {
  const width = Math.ceil(WORLD.WIDTH / scale) + 1;
  const height = Math.ceil(WORLD.HEIGHT / scale) + 1;
  const values = Array.from({ length: width * height }, () => next(b, 'map'));
  return (x, y) => {
    const gx = Math.floor(x / scale);
    const gy = Math.floor(y / scale);
    const ease = (t: number): number => t * t * (3 - 2 * t);
    const fx = ease(x / scale - gx);
    const fy = ease(y / scale - gy);
    const upper = values[gy * width + gx]! * (1 - fx) + values[gy * width + gx + 1]! * fx;
    const lower = values[(gy + 1) * width + gx]! * (1 - fx) + values[(gy + 1) * width + gx + 1]! * fx;
    return upper * (1 - fy) + lower * fy;
  };
}
