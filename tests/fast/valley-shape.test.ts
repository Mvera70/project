// El valle con forma natural (2 oct 2026, v5.73).
//
// Vera: «el valle es muy cuadrado, debería tener una forma más natural, y hay
// zonas muy desaprovechadas» (marcó las dos laderas grandes del norte, a los
// lados de la garganta). Con la propuesta delante decidió la misma superficie
// que el rectángulo y la falda de prado alrededor. Lo que se guarda aquí son
// esas propiedades, en muchos valles y sin ninguno elegido a mano.
//
// Medido al escribirlo, en 200 valles: siempre de una pieza y sin agujeros; de
// 2016 a 2038 celdas (los agujeros que se rellenan); el borde, de 308 a 406
// aristas, cuando el rectángulo tiene 184; la anchura por fila varía entre un
// 32 y un 53 % (la del rectángulo, nada); las dos laderas del norte entran en
// el valle en 161 de 200, una sola en 8; y nunca hay bosque o piedra fuera, ni
// montaña o lago dentro.

import { describe, expect, it } from 'vitest';
import { MAPGEN, WORLD } from '@engine/balance';
import { makeBundle } from '@engine/rng';
import { TERRAIN_CODE } from '@engine/state';
import type { ValleyMap } from '@engine/state';
import { foundingSite, generateMap } from '@engine/world/mapgen';
import { distanceOutside } from '@engine/world/valley-shape';
import { HEART, idx, neighbours4 } from '@engine/world/tiles';

/** Cuarenta valles: las propiedades son de todos, no de uno. */
const SEEDS = Array.from({ length: 40 }, (_, i) => i);
const CELLS = WORLD.WIDTH * WORLD.HEIGHT;
const RECTANGLE = (HEART.x1 - HEART.x0) * (HEART.y1 - HEART.y0);

const maps = new Map<number, ValleyMap>();
/** Cada valle se genera una vez para todas las pruebas del fichero. */
function valley(seed: number): ValleyMap {
  let map = maps.get(seed);
  if (map === undefined) { map = generateMap(makeBundle(seed)); maps.set(seed, map); }
  return map;
}

function areaOf(map: ValleyMap): number {
  let area = 0;
  for (const cell of map.heart) area += cell;
  return area;
}

describe('el valle con forma natural', () => {
  it('es de una pieza, sin agujeros, con la superficie del rectángulo y el claro de fundación dentro', () => {
    for (const seed of SEEDS) {
      const map = valley(seed);
      // La superficie del rectángulo, más los agujeros que se rellenan: medido,
      // como mucho 22 celdas más en 200 valles.
      expect(areaOf(map), `semilla ${seed}`).toBeGreaterThanOrEqual(RECTANGLE);
      expect(areaOf(map), `semilla ${seed}`).toBeLessThanOrEqual(RECTANGLE * 1.02);
      // Una pieza: desde una celda del valle se llega a todas sin salir de él.
      const first = map.heart.indexOf(1);
      const reached = new Uint8Array(CELLS);
      const queue = [first];
      reached[first] = 1;
      for (let head = 0; head < queue.length; head += 1) {
        for (const n of neighbours4(queue[head]!)) {
          if (map.heart[n] !== 1 || reached[n] === 1) continue;
          reached[n] = 1;
          queue.push(n);
        }
      }
      expect(queue.length, `semilla ${seed}: el valle está partido`).toBe(areaOf(map));
      // Sin agujeros: todo lo de fuera se alcanza desde el borde del mapa.
      const outside = new Uint8Array(CELLS);
      const around: number[] = [];
      for (let cell = 0; cell < CELLS; cell += 1) {
        const x = cell % WORLD.WIDTH;
        const y = Math.floor(cell / WORLD.WIDTH);
        const edge = x === 0 || y === 0 || x === WORLD.WIDTH - 1 || y === WORLD.HEIGHT - 1;
        if (map.heart[cell] === 0 && edge) { outside[cell] = 1; around.push(cell); }
      }
      for (let head = 0; head < around.length; head += 1) {
        for (const n of neighbours4(around[head]!)) {
          if (map.heart[n] === 1 || outside[n] === 1) continue;
          outside[n] = 1;
          around.push(n);
        }
      }
      expect(around.length + areaOf(map), `semilla ${seed}: un prado cercado de valle`).toBe(CELLS);
      // Y el claro donde se funda la aldea, entero dentro.
      const site = foundingSite(map);
      let off = 0;
      for (let y = site.y; y < site.y + MAPGEN.CLEARING_SIZE; y += 1) {
        for (let x = site.x; x < site.x + MAPGEN.CLEARING_SIZE; x += 1) off += map.heart[idx(x, y)] === 1 ? 0 : 1;
      }
      expect(off, `semilla ${seed}: celdas del claro fuera del valle`).toBe(0);
    }
  });

  it('el bosque y la piedra nacen dentro; la montaña y el lago, fuera', () => {
    for (const seed of SEEDS) {
      const map = valley(seed);
      let misplaced = 0;
      for (let cell = 0; cell < CELLS; cell += 1) {
        const terrain = map.terrain[cell];
        const inside = map.heart[cell] === 1;
        if (inside && (terrain === TERRAIN_CODE.mountain || terrain === TERRAIN_CODE.lake)) misplaced += 1;
        if (!inside && (terrain === TERRAIN_CODE.forest || terrain === TERRAIN_CODE.rock)) misplaced += 1;
      }
      expect(misplaced, `semilla ${seed}`).toBe(0);
    }
  });

  it('no es un rectángulo: sigue al río de garganta a garganta y su borde se tuerce', () => {
    for (const seed of SEEDS) {
      const map = valley(seed);
      const widths: number[] = [];
      let top: number = WORLD.HEIGHT;
      let bottom = -1;
      let border = 0;
      for (let y = 0; y < WORLD.HEIGHT; y += 1) {
        let width = 0;
        for (let x = 0; x < WORLD.WIDTH; x += 1) {
          const cell = idx(x, y);
          if (map.heart[cell] !== 1) continue;
          width += 1;
          for (const n of [x > 0 ? cell - 1 : -1, x + 1 < WORLD.WIDTH ? cell + 1 : -1, y > 0 ? cell - WORLD.WIDTH : -1,
            y + 1 < WORLD.HEIGHT ? cell + WORLD.WIDTH : -1]) {
            if (n < 0 || map.heart[n] === 0) border += 1;
          }
        }
        if (width === 0) continue;
        widths.push(width);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
      // Más largo que el rectángulo: llega hacia las dos gargantas.
      expect(bottom - top + 1, `semilla ${seed}`).toBeGreaterThan(HEART.y1 - HEART.y0);
      // Un borde que entra y sale: el del rectángulo son 184 aristas, y el
      // contorno más recto de 200 valles tenía 308.
      expect(border, `semilla ${seed}`).toBeGreaterThan(1.5 * 2 * (HEART.x1 - HEART.x0 + HEART.y1 - HEART.y0));
      // Y ancho donde se abre y estrecho donde se cierra: la anchura por fila
      // cambia, y la del rectángulo era la misma en las 56 filas.
      const mean = widths.reduce((a, b) => a + b, 0) / widths.length;
      const spread = Math.sqrt(widths.reduce((a, b) => a + (b - mean) ** 2, 0) / widths.length) / mean;
      expect(spread, `semilla ${seed}`).toBeGreaterThan(0.25);
    }
  });

  it('las dos laderas del norte, a los lados de la garganta, son valle en la mayoría de los valles', () => {
    // Las que Vera marcó: por encima de donde acababa el rectángulo y a cada
    // lado del río. No en todos —cada valle sale distinto—, pero sí en la
    // mayoría: medido, en 161 de 200 entran las dos con veinte celdas o más.
    let both = 0;
    for (const seed of SEEDS) {
      const map = valley(seed);
      let west = 0;
      let east = 0;
      for (let y = 0; y < HEART.y0; y += 1) {
        let river = -1;
        for (let x = 0; x < WORLD.WIDTH && river < 0; x += 1) {
          const terrain = map.terrain[idx(x, y)];
          if (terrain === TERRAIN_CODE.water || terrain === TERRAIN_CODE.ford) river = x;
        }
        if (river < 0) continue;
        for (let x = 0; x < WORLD.WIDTH; x += 1) {
          if (map.heart[idx(x, y)] !== 1) continue;
          if (x < river - 4) west += 1;
          else if (x > river + 6) east += 1;
        }
      }
      if (west >= 20 && east >= 20) both += 1;
    }
    expect(both, 'valles con las dos laderas del norte dentro').toBeGreaterThanOrEqual(Math.ceil(SEEDS.length * 0.7));
  });

  it('alrededor queda la falda de prado y la montaña empieza después', () => {
    // La segunda decisión de Vera: el borde con falda de prado, no la ladera
    // pegada al contorno. Lo que había alrededor del rectángulo, ahora
    // alrededor del contorno: en la primera celda de fuera, casi todo es prado
    // (medido en 200 valles: un 0,7 % de montaña).
    let ring = 0;
    let rock = 0;
    for (const seed of SEEDS) {
      const map = valley(seed);
      const away = distanceOutside(map.heart);
      for (let cell = 0; cell < CELLS; cell += 1) {
        if (away[cell] !== 1) continue;
        ring += 1;
        if (map.terrain[cell] === TERRAIN_CODE.mountain) rock += 1;
      }
    }
    expect(rock / ring).toBeLessThan(0.05);
  });

  it('el mismo valle sale siempre igual, celda a celda', () => {
    for (const seed of SEEDS.slice(0, 6)) {
      expect([...generateMap(makeBundle(seed)).heart]).toEqual([...valley(seed).heart]);
    }
  });
});
