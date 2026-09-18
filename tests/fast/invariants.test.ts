// M-11: integrated state properties from design.md §14.1.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { next } from '@engine/rng';
import { run } from '@engine/sim';
import { renderYear } from '@engine/chronicle/render';
import { TERRAIN_CODE } from '@engine/state';

describe('M-11 · integrated invariants', () => {
  it.each([0, 6, 7, 42, 108])('keeps valid state at every tick, seed %i', (seed) => {
    const state = foundTwenty(seed);
    for (let week = 1; week <= 200; week += 1) {
      run(state, 1, 'first', CATALOG);
      expect(state.tick).toBe(week);
      expect(Number.isFinite(state.village.grain)).toBe(true);
      expect(state.village.grain).toBeGreaterThanOrEqual(0);
      for (const stat of [state.village.morale, state.village.faith]) {
        expect(stat).toBeGreaterThanOrEqual(0);
        expect(stat).toBeLessThanOrEqual(100);
      }
      for (const villager of state.people.villagers) {
        expect(villager.bornTick).toBeLessThanOrEqual(state.tick);
      }
      const occupied = new Set<number>();
      for (const building of state.buildings.filter((b) => b.lostTick === null)) {
        expect(building.x).toBeGreaterThanOrEqual(0);
        expect(building.y).toBeGreaterThanOrEqual(0);
        expect(building.x + building.w).toBeLessThanOrEqual(state.map.width);
        expect(building.y + building.h).toBeLessThanOrEqual(state.map.height);
        for (let y = building.y; y < building.y + building.h; y += 1) {
          for (let x = building.x; x < building.x + building.w; x += 1) {
            const index = y * state.map.width + x;
            expect(occupied.has(index), `overlap at ${x},${y}, week ${week}`).toBe(false);
            expect(state.map.terrain[index]).not.toBe(TERRAIN_CODE.water);
            expect(state.map.terrain[index]).not.toBe(TERRAIN_CODE.marsh);
            occupied.add(index);
          }
        }
      }
    }
  });

  // M-13's mapgen tests cover the river, forest and site across 200 seeds.
  // The two contracts that used to wait here now have their production owners:
  // ui.test.ts covers pure gesture/hit-test behavior and save.test.ts covers a
  // full structured-clone round trip with a fingerprint of every state field.

  it('isolates 1,000 chronicle draws from the complete subsequent simulation', () => {
    const baseline = foundTwenty(6);
    const noisy = foundTwenty(6);
    run(baseline, 1000, 'first', CATALOG);
    run(noisy, 1000, 'first', CATALOG);
    for (let i = 0; i < 1000; i += 1) next(noisy.rng, 'chronicle');
    run(baseline, 1000, 'first', CATALOG);
    run(noisy, 1000, 'first', CATALOG);
    // **Lo que esta prueba mide es el aislamiento del flujo, no cuántos ticks
    // caben.** Pedía 2 000 y desde B3 (18 sep 2026) el valle de la semilla 6 no
    // llega: el clan vecino lo toma en el tick 1 304 y `run` se para ahí, que es
    // lo que hace un final. Que las dos partidas paren **en el mismo tick** es
    // además la mitad de la propiedad: si mil tiradas de crónica movieran la
    // simulación, una de las dos caería en otra semana.
    expect(baseline.tick, 'la partida avanzó más allá del primer tramo').toBeGreaterThan(1000);
    expect(noisy.tick, 'y las dos acaban en el mismo tick').toBe(baseline.tick);
    expect(noisy.rng.chronicle).not.toBe(baseline.rng.chronicle);
    // Exclude only the deliberately advanced stream; compare everything else.
    const normalized = structuredClone(noisy);
    normalized.rng.chronicle = baseline.rng.chronicle;
    expect(normalized).toEqual(baseline);
  });
});

describe('la crónica de una partida entera · §9.2', () => {
  // Estas dos viven aquí y no en chronicle.test.ts porque necesitan el motor
  // corriendo, y meter sim.ts en el worker del banco de textos duplicaba el
  // coste de arranque de toda la suite.
  const YEAR_TICKS = 48;


  it('ningún volcado de año deja una clave sin resolver', () => {
    for (const seed of [7, 108]) {
      const s = foundTwenty(seed);
      run(s, 40 * YEAR_TICKS, 'prudent', CATALOG);
      for (let y = 0; y <= 40; y += 1) {
        for (const weight of [1, 2, 3] as const) {
          for (const line of renderYear(s, y, weight)) {
            expect(line, `semilla ${seed}, año ${y}`).not.toMatch(/\[[a-z]/);
          }
        }
      }
    }
  });
});
