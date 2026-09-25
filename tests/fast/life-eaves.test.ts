// El valle más vivo · con lluvia, bajo el alero (`shelterUnder`, `village.ts`).
//
// Medido antes del cambio, un día de lluvia o tormenta en las semillas 7, 23 y
// 41: del 12 al 18 % de quien estaba fuera se quedaba parado en mitad de la
// calle (`pause`). Después: del 0,4 al 2 %, y del 11 al 14 % espera bajo un
// alero.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { STEPS_PER_DAY } from '../../src/render3d/life/clock';
import { indoors } from '../../src/render3d/life/home';
import { skyAt } from '../../src/derive/weather';
describe('El valle más vivo · con lluvia, bajo el alero', () => {
  it('quien no tiene nada que hacer con lluvia espera junto a una pared, no en la calle', () => {
    let street = 0;
    let eaves = 0;
    let total = 0;
    for (const seed of [7, 23, 41]) {
      const state = foundTwenty(seed);
      run(state, TIME.WEEKS_PER_YEAR * 8, 'prudent', CATALOG);
      let day = state.tick * TIME.DAYS_PER_WEEK;
      for (let d = 0; d < 400; d += 1) {
        const kind = skyAt(state, day + d).kind;
        if (kind === 'rain' || kind === 'storm') { day += d; break; }
      }
      const life = createVillage(state, day);
      let out = 0;
      let pause = 0;
      let shelter = 0;
      for (let n = 0; n < STEPS_PER_DAY; n += 1) {
        const phase = n / STEPS_PER_DAY;
        life.step(phase);
        if (phase < 0.25 || phase > 0.72 || n % 10) continue;
        for (const d of life.dwellers) {
          if (indoors(d)) continue;
          out += 1;
          if (d.doing?.offer.id === 'pause') pause += 1;
          if (d.doing?.offer.id === 'shelter') shelter += 1;
        }
      }
      street += pause;
      eaves += shelter;
      total += out;
    }
    expect(street / total).toBeLessThan(0.05);
    expect(eaves / total).toBeGreaterThan(0.05);
  });
});
