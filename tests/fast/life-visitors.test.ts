// El valle más vivo · Los que vienen por el camino (`life/visitors.ts`).
//
// La semana que el motor trae al buhonero o al forastero, alguien entra desde
// fuera del pueblo, llega a la plaza, se queda y se va por donde vino. Sólo
// enseña: no escribe en el motor. Tres semillas.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import type { GameState, HappeningId } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';

function visited(seed: number, id: HappeningId): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 6, 'prudent', CATALOG);
  state.happenings = state.happenings.filter((h) => h.tick !== state.tick);
  state.happenings.push({ tick: state.tick, id, visible: [], who: [] });
  return state;
}

describe('El valle más vivo · los visitantes del camino', () => {
  it('el buhonero llega a la plaza desde fuera, se queda y se va', () => {
    let reached = 0;
    for (const seed of [7, 23, 41]) {
      const state = visited(seed, 'pedlar');
      const before = JSON.stringify(state);
      const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK);
      expect(life.visitors.length, `semilla ${seed}`).toBeGreaterThan(0);
      const plaza = { x: state.plaza.x + 0.5, z: state.plaza.y + 0.5 };
      const start = life.visitors[0]!.body;
      const startGap = Math.hypot(start.x - plaza.x, start.z - plaza.z);
      // Nace fuera del pueblo, no en medio de la plaza.
      expect(startGap, `semilla ${seed}`).toBeGreaterThan(8);
      let closest = Infinity;
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        const phase = n / STEPS_PER_DAY;
        life.step(phase);
        const body = life.visitors[0]!.body;
        if (life.visitors[0]!.phase === 'staying') {
          closest = Math.min(closest, Math.hypot(body.x - plaza.x, body.z - plaza.z));
        }
      }
      // El que monta puesto se pone a tres celdas del centro (`STALL_RADIUS`),
      // fuera de la fuente: llegar es quedar a menos de cuatro y media.
      if (closest < 4.5) reached += 1;
      // Al acabar el día se ha ido.
      expect(life.visitors.every((v) => v.phase === 'gone'), `semilla ${seed}`).toBe(true);
      expect(JSON.stringify(state), 'la visita no escribe en el motor').toBe(before);
    }
    expect(reached).toBe(3);
  });

  it('el forastero viene un día; el buhonero, tres', () => {
    const stranger = visited(7, 'stranger_passes');
    expect(createVillage(stranger, stranger.tick * TIME.DAYS_PER_WEEK + 1).visitors).toHaveLength(0);
    const pedlar = visited(7, 'pedlar');
    expect(createVillage(pedlar, pedlar.tick * TIME.DAYS_PER_WEEK + 2).visitors.length).toBeGreaterThan(0);
    expect(createVillage(pedlar, pedlar.tick * TIME.DAYS_PER_WEEK + 3).visitors).toHaveLength(0);
  });

  it('sin visita no viene nadie', () => {
    const state = foundTwenty(7);
    run(state, TIME.WEEKS_PER_YEAR * 6, 'prudent', CATALOG);
    state.happenings = [];
    expect(createVillage(state, state.tick * TIME.DAYS_PER_WEEK).visitors).toHaveLength(0);
  });
});
