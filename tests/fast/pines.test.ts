// Los pinos de la ladera. `src/render3d/world/forest.ts`.
//
// **Tres condiciones, y las tres son palabras del dueño del diseño** (18 sep
// 2026), que revisó la primera versión mirando el valle rodado:
//
//   · «los pinos deben salir en la loma de la montaña, están mal puestos» —la
//     primera versión los ponía dentro del bosque cercano a la falda, o sea un
//     pinar metido en el robledal—;
//   · «en grupos de 3, 2 y 1»;
//   · «de diferentes tamaños».
//
// Lo que se guarda aquí es eso, y nada más: dónde, en qué corros y con qué
// alturas. Cómo se ve lo dice una captura (`docs/historico/graphics-rounds/`), que es lo
// único que puede decirlo.

import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { TERRAIN_CODE } from '@engine/state';
import type { ValleyMap } from '@engine/state';
import { pineCells, pineScaleAt } from '../../src/render3d/world/forest';
import { elevationAt } from '../../src/render3d/world/ground';

const SEEDS = [7, 11, 23, 41];

/** Los corros: celdas de pino conectadas en las ocho direcciones. */
function groupsOf(map: ValleyMap, cells: ReadonlySet<number>): number[] {
  const left = new Set(cells);
  const sizes: number[] = [];
  while (left.size > 0) {
    const first = left.values().next().value as number;
    const group = [first];
    left.delete(first);
    for (let n = 0; n < group.length; n += 1) {
      const cell = group[n];
      if (cell === undefined) continue;
      const x = cell % map.width;
      const z = Math.floor(cell / map.width);
      for (let dz = -1; dz <= 1; dz += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const near = (z + dz) * map.width + x + dx;
          if (left.has(near)) { left.delete(near); group.push(near); }
        }
      }
    }
    sizes.push(group.length);
  }
  return sizes;
}

describe('los pinos suben la loma', () => {
  it('todos en la ladera de la montaña, y ninguno en el llano ni en el pico', () => {
    // La banda está medida: la montaña ocupa media hoja y sube de cota 0,15 a
    // 6,00, así que la loma es lo bajo. Medido en las cuatro semillas, los
    // pinos caen entre 0,22 y 1,58.
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      const cells = pineCells(state.map);
      expect(cells.size, `semilla ${seed}: hay pinos`).toBeGreaterThan(0);
      for (const cell of cells) {
        const x = cell % state.map.width;
        const z = Math.floor(cell / state.map.width);
        expect(state.map.terrain[cell], `semilla ${seed}: pino en ${x},${z} fuera de la montaña`)
          .toBe(TERRAIN_CODE.mountain);
        const height = elevationAt(state.map, x + 0.5, z + 0.5);
        expect(height, `semilla ${seed}: pino en ${x},${z} demasiado arriba`).toBeLessThan(2);
      }
    }
  });

  it('en corros de uno, dos y tres, y nunca en manchas', () => {
    // Las tres medidas existen en las cuatro semillas, con el dos como el más
    // común: un corro de tres necesita dos vecinas libres y la reserva de la
    // vecindad se las lleva a menudo. Lo que **no** puede pasar es una mancha:
    // un corro de cuatro o más sería un pinar, y eso es otra cosa.
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      const sizes = groupsOf(state.map, pineCells(state.map));
      expect(Math.max(...sizes), `semilla ${seed}: ${JSON.stringify(sizes)}`).toBeLessThanOrEqual(3);
      for (const size of [1, 2, 3]) {
        expect(sizes.includes(size), `semilla ${seed}: falta el corro de ${size}`).toBe(true);
      }
    }
  });

  it('y de tres alturas, para que la ladera no sea un patrón', () => {
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      const scales = new Set([...pineCells(state.map)].map((cell) => pineScaleAt(cell)));
      expect(scales.size, `semilla ${seed}: alturas ${[...scales].join(', ')}`).toBe(3);
    }
  });

  it('y el mismo valle da los mismos pinos', () => {
    // Sin azar del motor: el sitio sale de la celda (§4.3). Si esto se rompiera,
    // la ladera cambiaría de pinos entre dos aperturas de la misma partida.
    const a = pineCells(foundGame(11).map);
    const b = pineCells(foundGame(11).map);
    expect([...a].sort((x, y) => x - y)).toEqual([...b].sort((x, y) => x - y));
  });
});
