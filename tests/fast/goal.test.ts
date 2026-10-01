// RD-5 (Vera, 1 oct 2026) · **La meta a la vista** (`derive/goal.ts`): una
// línea que dice hacia dónde va el valle, que nace del estado y se acerca sola.

import { describe, expect, it } from 'vitest';
import { FATE, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { renderUiText } from '@engine/chronicle/render';
import { run } from '@engine/sim';
import { foundGame } from '@engine/found';
import { goalOf } from '@derive/goal';
import { foundTwenty } from '../helpers/founding';

const SEEDS = [1, 2, 3, 5, 7, 11, 13, 23];

describe('RD-5 · la meta a la vista', () => {
  it('al fundar, la primera cosecha, y la cuenta baja una semana cada semana', () => {
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      expect(goalOf(state)).toEqual({ key: 'goal.first_harvest', params: { weeks: TIME.HARVEST_WEEK } });
      run(state, 3, 'prudent', CATALOG);
      expect(goalOf(state)?.params['weeks'], `semilla ${seed}`).toBe(TIME.HARVEST_WEEK - 3);
    }
  });

  it('pasada la cosecha la meta cambia, y siempre se puede leer', () => {
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      const seen = new Set<string>();
      for (let week = 0; week < TIME.WEEKS_PER_YEAR * 2; week += 4) {
        const goal = goalOf(state);
        if (goal !== null) {
          seen.add(goal.key);
          const what = goal.params['what'];
          const text = renderUiText(goal.key, typeof what === 'string' ? { ...goal.params, what: renderUiText(what) } : goal.params);
          expect(text, `semilla ${seed}, ${goal.key}`).not.toMatch(/[[\]{}]/u);
        }
        run(state, 4, 'prudent', CATALOG);
      }
      expect(seen.has('goal.first_harvest'), `semilla ${seed}`).toBe(true);
      expect(seen.size, `semilla ${seed}: la meta no cambia nunca`).toBeGreaterThan(1);
    }
  });

  it('una aldea hecha no persigue «diez almas»', () => {
    const state = foundTwenty(7);
    run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    const goal = goalOf(state);
    expect(goal?.key).not.toBe('goal.souls');
    expect(goal?.key).not.toMatch(/first_harvest/u);
    expect(FATE.HAMLET_PEOPLE).toBeGreaterThan(2);
  });
});
