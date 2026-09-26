// El valle más vivo · Charcos después de la lluvia (`effects/puddles.ts`).

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { foundTwenty } from '../helpers/founding';
import { createPuddles, wetnessAt } from '../../src/render3d/effects/puddles';

describe('El valle más vivo · los charcos', () => {
  it('lloviendo, el suelo está mojado; al día siguiente se seca antes de la tarde', () => {
    expect(wetnessAt('rain', 'clear', 0.5)).toBe(1);
    expect(wetnessAt('storm', 'clear', 0.1)).toBe(1);
    expect(wetnessAt('clear', 'rain', 0.2)).toBeGreaterThan(0.5);
    expect(wetnessAt('clear', 'rain', 0.65)).toBe(0);
    expect(wetnessAt('clear', 'clear', 0.2)).toBe(0);
    expect(wetnessAt('snow', 'overcast', 0.2)).toBe(0);
  });

  it('salen en los caminos pisados, y sólo con el suelo mojado', () => {
    for (const seed of [7, 23]) {
      const state = foundTwenty(seed);
      run(state, TIME.WEEKS_PER_YEAR * 10, 'prudent', CATALOG);
      const puddles = createPuddles(state.map, state.plaza);
      puddles.step(0, () => 0);
      expect(puddles.shown).toBe(0);
      puddles.step(1, () => 0);
      expect(puddles.shown, `semilla ${seed}`).toBeGreaterThan(10);
      puddles.dispose();
    }
  });

  it('crecen mientras llueve: pocos al empezar, todos al rato, y se van al secarse', () => {
    // Vera, 26 sep 2026: «que los charcos crezcan mientras llueve, en lugar de
    // aparecer ya hechos».
    for (const seed of [7, 23]) {
      const state = foundTwenty(seed);
      run(state, TIME.WEEKS_PER_YEAR * 10, 'prudent', CATALOG);
      const puddles = createPuddles(state.map, state.plaza);
      puddles.step(0, () => 0, 1);
      puddles.step(1, () => 0, 3);
      const early = puddles.shown;
      for (let s = 0; s < 60; s += 1) puddles.step(1, () => 0, 1);
      const full = puddles.shown;
      expect(early, `semilla ${seed}: al empezar, pocos`).toBeLessThan(full / 2);
      expect(full, `semilla ${seed}: al rato, muchos`).toBeGreaterThan(10);
      puddles.step(0, () => 0, 1);
      expect(puddles.shown).toBe(0);
      puddles.dispose();
    }
  });
});
