// Los visitantes entran por el camino y lo siguen (28 sep 2026). Vera: «así
// pueden ir mercaderes y el buhonero por un sendero como tal». Propiedad: el
// buhonero nace sobre una celda del camino y la mayor parte de su ruta hasta
// el puesto va por celdas del camino. Varias semillas.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { valleyRoadCells } from '@engine/world/valley-road';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';

describe('los visitantes, por el camino', () => {
  it('el buhonero nace en el camino y lo sigue casi hasta la plaza', () => {
    for (const seed of [7, 23, 41]) {
      const state = foundTwenty(seed);
      run(state, TIME.WEEKS_PER_YEAR * 8, 'prudent', CATALOG);
      state.happenings = state.happenings.filter((h) => h.tick !== state.tick);
      state.happenings.push({ tick: state.tick, id: 'pedlar', visible: [], who: [] });
      const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
      const pedlar = life.visitors[0];
      expect(pedlar, `semilla ${seed}: hay buhonero`).toBeDefined();
      const road = new Set(valleyRoadCells(state.map, state.terrainSeed, state.plaza).flat());
      const cellOf = (p: { x: number; z: number }): number => Math.floor(p.z) * state.map.width + Math.floor(p.x);
      expect(road.has(cellOf(pedlar!.road)), `semilla ${seed}: nace en el camino`).toBe(true);
      const onRoad = pedlar!.route.filter((p) => road.has(cellOf(p))).length;
      expect(onRoad / Math.max(1, pedlar!.route.length), `semilla ${seed}: sigue el camino`).toBeGreaterThan(0.6);
    }
  });
});
