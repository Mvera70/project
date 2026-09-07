// M-11: integrated state properties from design.md §14.1.
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { next } from '@engine/rng';
import { run } from '@engine/sim';
import { TERRAIN_CODE } from '@engine/state';

describe('M-11 · integrated invariants', () => {
  it.each([0, 6, 7, 42, 108])('keeps valid state at every tick, seed %i', (seed) => {
    const state = foundGame(seed);
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
  it.todo('preserves pure camera and gesture behavior without a DOM (M-20)');
  it.todo('round-trips complete state through the production save/load API (M-23)');

  it('isolates 1,000 chronicle draws from the complete subsequent simulation', () => {
    const baseline = foundGame(6);
    const noisy = foundGame(6);
    run(baseline, 1000, 'first', CATALOG);
    run(noisy, 1000, 'first', CATALOG);
    for (let i = 0; i < 1000; i += 1) next(noisy.rng, 'chronicle');
    run(baseline, 1000, 'first', CATALOG);
    run(noisy, 1000, 'first', CATALOG);
    expect(baseline.tick).toBe(2000);
    expect(noisy.tick).toBe(2000);
    expect(noisy.rng.chronicle).not.toBe(baseline.rng.chronicle);
    // Exclude only the deliberately advanced stream; compare everything else.
    const normalized = structuredClone(noisy);
    normalized.rng.chronicle = baseline.rng.chronicle;
    expect(normalized).toEqual(baseline);
  });
});
