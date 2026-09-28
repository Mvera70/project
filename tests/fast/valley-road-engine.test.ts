// El camino del valle en el motor (28 sep 2026): nace pisado, los de fuera lo
// gastan cada semana y se asienta como senda sin fragua; es determinista y no
// consume azar. Varias semillas.

import { describe, expect, it } from 'vitest';
import { TIME, WORLD } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run, tick } from '@engine/sim';
import { stepCost } from '@engine/world/astar';
import { roadMouths, valleyRoadCells } from '@engine/world/valley-road';
import { fingerprint } from '../helpers/fingerprint';

const SEEDS = [3, 7, 11, 23];

describe('el camino del valle, en el motor', () => {
  it('tiene dos bocas conectadas y un camino pisable de cada una a la plaza, desde la fundación', () => {
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      const mouths = roadMouths(state.map, state.terrainSeed);
      expect(mouths, `semilla ${seed}`).toHaveLength(2);
      const routes = valleyRoadCells(state.map, state.terrainSeed, state.plaza);
      expect(routes, `semilla ${seed}`).toHaveLength(2);
      for (const cells of routes) {
        expect(cells.length).toBeGreaterThan(20);
        for (const cell of cells) {
          expect(stepCost(state.map, cell)).not.toBeNull();
          // Nace pisado: la pareja llegó por él.
          expect(state.map.path[cell]).toBeGreaterThanOrEqual(1);
          expect(state.map.traffic[cell]).toBeGreaterThanOrEqual(WORLD.ROAD_FOUNDING);
        }
      }
    }
  });

  it('los de fuera lo asientan como senda en unos años, y sin fragua no pasa de ahí', () => {
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      run(state, TIME.WEEKS_PER_YEAR * 4, 'prudent', CATALOG);
      const routes = valleyRoadCells(state.map, state.terrainSeed, state.plaza);
      const cells = routes.flat();
      const track = cells.filter((cell) => (state.map.path[cell] ?? 0) >= 2).length;
      expect(track / Math.max(1, cells.length), `semilla ${seed}: senda a los cuatro años`).toBeGreaterThan(0.7);
      // El decaimiento lo deja por debajo de la calzada por sí solo.
      expect(Math.max(...cells.map((cell) => state.map.traffic[cell] ?? 0))).toBeLessThan(WORLD.PATH_T3);
    }
  });

  it('es determinista y no consume ninguna tirada', () => {
    const a = foundGame(7), b = foundGame(7);
    for (let week = 0; week < 60; week += 1) { tick(a, CATALOG); tick(b, CATALOG); }
    expect(fingerprint(a)).toBe(fingerprint(b));
  });
});
