// El valle más vivo · Tendederos y huertos (`derive/yards.ts`). Tres semillas.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { yardsOf } from '../../src/derive/yards';
import { yardSolids } from '../../src/render3d/world/obstacles';
import { fitsCircle, indexSolids } from '../../src/render3d/life/body';
import { terrainOf } from '../../src/render3d/life/terrain';

function grown(seed: number): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 10, 'prudent', CATALOG);
  return state;
}

describe('El valle más vivo · tendederos y huertos', () => {
  it('muchas casas tienen algo, y nunca encima de un edificio ni en la plaza', () => {
    let houses = 0;
    let dressed = 0;
    for (const seed of [7, 23, 41]) {
      const state = grown(seed);
      const yards = yardsOf(state);
      houses += state.buildings.filter((b) => b.kind === 'house' && b.lostTick === null).length;
      dressed += new Set(yards.map((y) => y.house)).size;
      for (const yard of yards) {
        const inside = state.buildings.some((b) => b.lostTick === null
          && yard.x > b.x && yard.x < b.x + b.w && yard.z > b.y && yard.z < b.y + b.h);
        expect(inside, `semilla ${seed}, casa ${yard.house}`).toBe(false);
        expect(Math.hypot(yard.x - state.plaza.x - 0.5, yard.z - state.plaza.y - 0.5)).toBeGreaterThan(3);
      }
      // Lo mismo dos veces: sin azar.
      expect(yardsOf(state)).toEqual(yards);
    }
    // Una de cada tres casas como poco, o el pueblo sigue pareciendo una maqueta.
    expect(dressed / Math.max(1, houses)).toBeGreaterThan(1 / 3);
  });

  it('la fachada queda libre: por ahí se entra', () => {
    const state = grown(7);
    const houses = state.buildings.filter((b) => b.kind === 'house' && b.lostTick === null);
    // Todas las puertas a +Z (fachada 0, `homeRoutine`).
    const doors = new Map(houses.map((b) => [b.id, 0]));
    for (const yard of yardsOf(state, doors)) {
      const house = houses.find((b) => b.id === yard.house)!;
      expect(yard.z < house.y + house.h, `casa ${house.id}`).toBe(true);
    }
  });

  it('los postes y el bancal no se atraviesan: son sólidos para la gente', () => {
    for (const seed of [7, 23, 41]) {
      const state = grown(seed);
      const yards = yardsOf(state);
      const base = terrainOf(state);
      const land = { ...base, solids: indexSolids(base.width, base.height, yardSolids(yards)) };
      for (const yard of yards) {
        const alongX = yard.along === 'x';
        const probe = yard.kind === 'line'
          ? { x: yard.x + (alongX ? 0.8 : 0), z: yard.z + (alongX ? 0 : 0.8) }
          : { x: yard.x, z: yard.z };
        expect(fitsCircle(land, probe.x, probe.z, 0.32), `semilla ${seed}, casa ${yard.house}`).toBe(false);
        // Y bajo la cuerda, entre los postes, sí se pasa: sólo estorban los postes.
        if (yard.kind === 'line') expect(fitsCircle(land, yard.x, yard.z, 0.2)).toBe(fitsCircle(base, yard.x, yard.z, 0.2));
      }
    }
  });
});
