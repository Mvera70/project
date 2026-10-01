// RD-5 (Vera, 1 oct 2026) · **Los sucesos pequeños del caserío** (`fate.ts`,
// `rollHamlet`). Sólo mientras el valle tiene menos de `FATE.HAMLET_PEOPLE`,
// sólo si el sorteo de la semana no trajo nada, ninguno destruye nada, y la
// tirada no consume azar del motor.

import { describe, expect, it } from 'vitest';
import { FATE, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { population } from '@engine/people/demography';
import { tick } from '@engine/sim';
import { foundGame } from '@engine/found';
import type { HappeningId } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

const SEEDS = [1, 2, 3, 5, 7, 11, 13, 23];
const HAMLET = Object.keys(FATE.HAMLET_WEIGHT) as HappeningId[];

describe('RD-5 · los sucesos pequeños del caserío', () => {
  it('salen en el primer año de casi todos los caseríos, sólo con menos de diez, y sin romper nada', () => {
    let valleys = 0;
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      let seen = 0;
      for (let week = 0; week < TIME.WEEKS_PER_YEAR; week += 1) {
        const people = population(state);
        const buildings = state.buildings.filter((b) => b.lostTick === null).length;
        tick(state, CATALOG, state.crossroad === null ? undefined
          : { templateId: state.crossroad.templateId, optionId: 'take_him_in' });
        const fresh = state.happenings.filter((h) => h.tick === state.tick && HAMLET.includes(h.id));
        if (fresh.length === 0) continue;
        seen += 1;
        expect(people, `semilla ${seed}, semana ${week}`).toBeLessThan(FATE.HAMLET_PEOPLE);
        expect(state.buildings.filter((b) => b.lostTick === null).length, `semilla ${seed}`).toBeGreaterThanOrEqual(buildings);
      }
      if (seen > 0) valleys += 1;
    }
    expect(valleys).toBeGreaterThanOrEqual(SEEDS.length - 2);
  });

  it('en una aldea de veinte no salen', () => {
    for (const seed of [7, 23]) {
      const state = foundTwenty(seed);
      for (let week = 0; week < TIME.WEEKS_PER_YEAR; week += 1) tick(state, CATALOG);
      expect(state.happenings.some((h) => HAMLET.includes(h.id)), `semilla ${seed}`).toBe(false);
    }
  });

  it('una miel por verano y el zorro no vuelve antes de su plazo', () => {
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      for (let week = 0; week < TIME.WEEKS_PER_YEAR * 2; week += 1) {
        tick(state, CATALOG, state.crossroad === null ? undefined
          : { templateId: state.crossroad.templateId, optionId: 'turn_him_away' });
      }
      const honey = state.happenings.filter((h) => h.id === 'wild_honey').map((h) => Math.floor(h.tick / TIME.WEEKS_PER_YEAR));
      expect(new Set(honey).size, `semilla ${seed}`).toBe(honey.length);
      const fox = state.happenings.filter((h) => h.id === 'fox_at_the_hens').map((h) => h.tick);
      for (let n = 1; n < fox.length; n += 1) expect(fox[n]! - fox[n - 1]!).toBeGreaterThanOrEqual(FATE.FOX_AGAIN_WEEKS);
    }
  });
});
