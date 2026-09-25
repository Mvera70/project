// El valle más vivo (25 sep 2026) · la plaza se engalana en las fiestas.
// `festivityOf` sale de los sucesos del motor: una boda, la cosecha o el barril
// cuelgan banderines la semana en que ocurren, y se descuelgan después.

import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { tick } from '@engine/sim';
import { foundTwenty } from '../helpers/founding';
import { FESTIVE, festivityOf } from '@derive/festivity';

describe('la plaza de fiesta', () => {
  it('se engalana la semana de una boda o de una fiesta, y no otra', () => {
    let festive = 0;
    let plain = 0;
    for (const seed of [7, 23]) {
      const state = foundTwenty(seed);
      while (state.tick < 48 * 3) {
        tick(state, CATALOG);
        const party = state.happenings.some((h) => h.tick === state.tick && FESTIVE.includes(h.id));
        const now = festivityOf(state);
        if (party) { festive += 1; expect(now, `semilla ${seed}, tick ${state.tick}`).not.toBeNull(); }
        const recent = state.happenings.some((h) => FESTIVE.includes(h.id) && state.tick - h.tick < 1);
        if (!recent) { plain += 1; expect(now, `semilla ${seed}, tick ${state.tick}`).toBeNull(); }
      }
    }
    expect(festive, 'hubo fiestas que mirar').toBeGreaterThan(0);
    expect(plain).toBeGreaterThan(festive);
  });
});
