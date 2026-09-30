// RD-2 · Ninguna derrota irreversible mientras la aldea descansa.
//
// Invariante del rework de ritmo (goal del 30 sep 2026). Con el letargo de
// §13.2 tal cual, una ausencia en el tope acababa 4 valles de 24 (3 tomados) y
// resolvía 66 asaltos sin nadie delante (`tools/reports/rest-report.ts`,
// `docs/medidas/rd2-descanso-2026-09-30.md`). La ausencia larga se prueba en
// las jornadas; aquí, que las dos puertas del letargo (`catchUp` y `runBatch`)
// paran en el aviso y deshacen la semana del final.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { catchUp, restTick } from '@engine/save';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { runBatch } from '@ui/lethargy';

const RESOLVED = ['raid.held', 'raid.stormed', 'raid.turned_back', 'raid.walled', 'raid.open'];

describe('RD-2 · la ausencia no acaba la partida ni resuelve un asalto', () => {
  it('se para en el aviso del asalto, con las semanas para prepararse por delante', () => {
    let warned = 0;
    for (const seed of [3, 5, 8]) {
      const state = foundGame(seed);
      run(state, 48, 'prudent', CATALOG);
      const from = state.chronicle.length;
      const report = catchUp(state, TIME.LETHARGY_CAP_MS);
      const lived = state.chronicle.slice(from);
      expect(state.ended, `semilla ${seed}`).toBeNull();
      expect(lived.some((entry) => RESOLVED.includes(entry.templateKey)), `semilla ${seed}`).toBe(false);
      if (report.halted === 'raid') {
        warned += 1;
        expect(lived.at(-1)?.templateKey === 'raid.coming'
          || lived.some((entry) => entry.templateKey === 'raid.coming')).toBe(true);
        expect(state.threat.comingTick).not.toBeNull();
      }
    }
    // Las tres semillas llegan a un aviso dentro de una generación (medido).
    expect(warned).toBeGreaterThan(0);
  });

  it('la semana que acabaría la partida se deshace entera, por las dos puertas', () => {
    for (const door of ['catchUp', 'runBatch'] as const) {
      const state = foundGame(11);
      run(state, 10, 'prudent', CATALOG);
      for (const v of state.people.villagers) v.diedTick = state.tick;
      const before = structuredClone(state);
      const halted = door === 'catchUp'
        ? catchUp(state, TIME.LETHARGY_CAP_MS).halted
        : runBatch(state, 0, 960).halted;
      expect(halted, door).toBe('ending');
      expect(state, door).toEqual(before);
    }
    // Y restTick a solas dice lo mismo.
    const alone = foundGame(11);
    for (const v of alone.people.villagers) v.diedTick = alone.tick;
    expect(restTick(alone)).toBe('ending');
    expect(alone.ended).toBeNull();
  });
});
