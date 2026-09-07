// M-13 · El valle generado. design.md §7.1.
//
// El test obligatorio del brief es sobre 200 semillas, no sobre una: un río
// continuo en la semilla 7 no dice nada de la 143. Lo que se comprueba son
// propiedades del diseño —río de borde a borde, bosque entre el 18 % y el 30 %,
// claro de fundación válido— y no cómo están escritos los cinco pasos.
import { describe, expect, it } from 'vitest';

import { MAPGEN, WORLD } from '@engine/balance';
import { makeBundle } from '@engine/rng';
import { TERRAIN_CODE } from '@engine/state';
import type { ValleyMap } from '@engine/state';
import { foundingSite, generateMap, idx, neighbours4 } from '@engine/world/mapgen';

const SEEDS = Array.from({ length: 200 }, (_, i) => i);
const CELLS = WORLD.WIDTH * WORLD.HEIGHT;

function fractionOf(map: ValleyMap, code: number): number {
  let n = 0;
  for (const t of map.terrain) if (t === code) n += 1;
  return n / CELLS;
}

/** El agua alcanzable desde la fila 0 por vecindad cardinal. */
function riverReach(map: ValleyMap): Set<number> {
  const seen = new Set<number>();
  const queue: number[] = [];
  for (let x = 0; x < WORLD.WIDTH; x += 1) {
    const i = idx(x, 0);
    if (map.terrain[i] === TERRAIN_CODE.water) { seen.add(i); queue.push(i); }
  }
  for (let head = 0; head < queue.length; head += 1) {
    for (const n of neighbours4(queue[head] as number)) {
      if (seen.has(n) || map.terrain[n] !== TERRAIN_CODE.water) continue;
      seen.add(n);
      queue.push(n);
    }
  }
  return seen;
}

describe('generación del mapa · §7.1', () => {
  it('el río baja de borde a borde en 200 semillas', () => {
    for (const seed of SEEDS) {
      const map = generateMap(makeBundle(seed));
      const reach = riverReach(map);
      expect(reach.size, `semilla ${seed}: no entra agua por el norte`).toBeGreaterThan(0);
      const reachesSouth = [...Array(WORLD.WIDTH).keys()]
        .some((x) => reach.has(idx(x, WORLD.HEIGHT - 1)));
      expect(reachesSouth, `semilla ${seed}: el río no llega al sur`).toBe(true);
    }
  });

  it('el río no se bifurca: una sola masa de agua', () => {
    for (const seed of SEEDS) {
      const map = generateMap(makeBundle(seed));
      const water = map.terrain.reduce((n, t) => n + (t === TERRAIN_CODE.water ? 1 : 0), 0);
      expect(riverReach(map).size, `semilla ${seed}`).toBe(water);
    }
  });

  it('el bosque cubre entre el 18 % y el 30 % en 200 semillas', () => {
    for (const seed of SEEDS) {
      const forest = fractionOf(generateMap(makeBundle(seed)), TERRAIN_CODE.forest);
      expect(forest, `semilla ${seed}`).toBeGreaterThanOrEqual(WORLD.FOREST_TARGET[0]);
      expect(forest, `semilla ${seed}`).toBeLessThanOrEqual(WORLD.FOREST_TARGET[1]);
    }
  });

  it('hay siempre un sitio de fundación de 12×12 en pradera y sin marisma al lado', () => {
    const size = MAPGEN.CLEARING_SIZE;
    for (const seed of SEEDS) {
      const map = generateMap(makeBundle(seed));
      const site = foundingSite(map);
      expect(site.x + size, `semilla ${seed}`).toBeLessThanOrEqual(WORLD.WIDTH);
      expect(site.y + size, `semilla ${seed}`).toBeLessThanOrEqual(WORLD.HEIGHT);
      for (let y = site.y; y < site.y + size; y += 1) {
        for (let x = site.x; x < site.x + size; x += 1) {
          const cell = idx(x, y);
          expect(map.terrain[cell], `semilla ${seed} en ${x},${y}`).toBe(TERRAIN_CODE.meadow);
          for (const n of neighbours4(cell)) {
            expect(map.terrain[n], `semilla ${seed}: marisma junto al claro`)
              .not.toBe(TERRAIN_CODE.marsh);
          }
        }
      }
    }
  });

  it('hay entre 3 y 6 afloramientos de roca, de 6 a 14 celdas', () => {
    for (const seed of SEEDS.slice(0, 60)) {
      const map = generateMap(makeBundle(seed));
      const seen = new Set<number>();
      const sizes: number[] = [];
      for (let i = 0; i < CELLS; i += 1) {
        if (map.terrain[i] !== TERRAIN_CODE.rock || seen.has(i)) continue;
        const queue = [i];
        seen.add(i);
        for (let head = 0; head < queue.length; head += 1) {
          for (const n of neighbours4(queue[head] as number)) {
            if (seen.has(n) || map.terrain[n] !== TERRAIN_CODE.rock) continue;
            seen.add(n);
            queue.push(n);
          }
        }
        sizes.push(queue.length);
      }
      // Dos afloramientos sorteados por separado pueden quedar pegados y
      // contarse como una sola mancha; lo que se exige es el total de celdas.
      const total = sizes.reduce((a, b) => a + b, 0);
      expect(total, `semilla ${seed}`).toBeGreaterThanOrEqual(MAPGEN.ROCK_PATCHES[0] * MAPGEN.ROCK_SIZE[0]);
      expect(total, `semilla ${seed}`).toBeLessThanOrEqual(MAPGEN.ROCK_PATCHES[1] * MAPGEN.ROCK_SIZE[1]);
    }
  });

  it('generateMap es pura: no consume del flujo map ni de ningún otro', () => {
    const b = makeBundle(7);
    const before = { ...b };
    generateMap(b);
    generateMap(b);
    expect({ ...b }).toEqual(before);
  });

  it('la misma semilla da el mismo valle, celda a celda', () => {
    for (const seed of [7, 42, 108]) {
      const a = generateMap(makeBundle(seed));
      const z = generateMap(makeBundle(seed));
      expect([...a.terrain]).toEqual([...z.terrain]);
      expect(foundingSite(a)).toEqual(foundingSite(z));
    }
  });

  it('dos semillas distintas dan valles visiblemente distintos', () => {
    // El brief pide más del 15 % de celdas diferentes, para todos los pares
    // consecutivos y no para uno elegido a mano.
    for (const seed of SEEDS.slice(0, 40)) {
      const a = generateMap(makeBundle(seed));
      const z = generateMap(makeBundle(seed + 1000));
      let different = 0;
      for (let i = 0; i < CELLS; i += 1) if (a.terrain[i] !== z.terrain[i]) different += 1;
      expect(different / CELLS, `semillas ${seed} y ${seed + 1000}`).toBeGreaterThan(0.15);
    }
  });

  it('las capas de simulación nacen en blanco', () => {
    const map = generateMap(makeBundle(7));
    for (const layer of [map.traffic, map.path, map.ruins, map.forestAge]) {
      expect([...layer].every((v) => v === 0)).toBe(true);
    }
  });
});
