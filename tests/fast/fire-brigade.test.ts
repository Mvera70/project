// E4 · La brigada de cubos: una casa que arde llama a la gente, que acude con
// cubos y los vacía contra ella. Es escena: no cambia lo que el motor decidió
// (si se salvó o no lo dice `THREAT.SAVE_REACH`), sólo se ve. Dos semillas.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';

function alight(seed: number): { state: GameState; id: number } {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 8, 'prudent', CATALOG);
  const house = state.buildings.find((b) => b.kind === 'house' && b.lostTick === null)!;
  // Una casa que la aldea está salvando de las flechas (`fireArrows`).
  state.flags[`doused:${house.id}`] = state.tick + 1;
  return { state, id: house.id };
}

describe('E4 · la brigada de cubos', () => {
  it('la gente acude a la casa que arde y vacía cubos contra ella', () => {
    for (const seed of [7, 23]) {
      const { state, id } = alight(seed);
      const before = JSON.stringify(state);
      const life = createVillage(state, 0);
      const douser = new Set<number>();
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        life.step();
        for (const d of life.dwellers) {
          if (d.doing?.place.id === `fire:${id}` && d.doing.there) douser.add(d.villager);
        }
      }
      // Varias manos: una sola persona con un cubo no es una brigada.
      expect(douser.size, `semilla ${seed}`).toBeGreaterThanOrEqual(3);
      expect(JSON.stringify(state), 'la escena no escribe en el motor').toBe(before);
    }
  });

  it('sin fuego no hay brigada', () => {
    const state = foundTwenty(7);
    run(state, TIME.WEEKS_PER_YEAR * 8, 'prudent', CATALOG);
    const life = createVillage(state, 0);
    for (let n = 0; n < 200; n += 1) {
      life.step();
      expect(life.dwellers.some((d) => d.doing?.place.id.startsWith('fire:') === true)).toBe(false);
    }
  });
});
