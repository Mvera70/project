// Mudada entera de `tests/fast/life-wood-run.test.ts` el 1 oct 2026 (v5.56): tardaba 43 s en el
// trabajo `fast` de CI. Mismo cuerpo y mismo umbral; sólo cambia cuándo se paga.
//
// Esquema 12 · los porteadores van con el reloj de las entregas (28 sep 2026).
//
// Lo que Vera pidió es que el «+1» sea una unidad real y que quien la trae se
// vea traerla: el haz no se descarga antes de la hora a la que el motor la
// apunta. Propiedad, varias semillas: en ningún momento de la jornada hay más
// haces descargados en la leñera que entregas cuya hora ya ha llegado.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { LIFE_STEP, STEPS_PER_DAY } from '../../src/render3d/life/clock';

const WEEK_SECONDS = TIME.REAL_MS_PER_TICK / 1000;

describe('los porteadores van con el reloj de las entregas · esquema 12', () => {
  it('nadie descarga un haz antes de su hora, y casi todas llegan con alguien delante', () => {
    let delivered = 0;
    let owed = 0;
    for (const seed of [3, 7, 11, 23]) {
      const state = foundTwenty(seed);
      run(state, TIME.WEEKS_PER_YEAR * 3, 'prudent', CATALOG);
      const at = state.woodRun?.at ?? [];
      // El segundo y el tercer día de la semana: la jornada entera con sus horas.
      for (const weekDay of [1, 2]) {
        const life = createVillage(state, state.tick * TIME.DAYS_PER_WEEK + weekDay);
        // La jornada de vida empieza a medianoche (fase 0) y la semana del motor a
        // media mañana (`DAY_START_PHASE`): la hora de la semana de cada paso es
        // la de esa fase del sol en ese día, la misma cuenta que `derive/clock`.
        const start = (weekDay - TIME.DAY_START_PHASE) / TIME.DAYS_PER_WEEK;
        for (let n = 0; n < STEPS_PER_DAY; n += 1) {
          const fraction = start + (n * LIFE_STEP) / WEEK_SECONDS;
          life.setWoodClock(at, fraction);
          life.step(n / STEPS_PER_DAY);
          // Las de antes de abrir la jornada ya no se reparten: sólo cuentan las de hoy.
          const due = at.filter((t) => t > start && t <= fraction).length;
          expect(life.timberDeliveries, `semilla ${seed}, día ${weekDay}`).toBeLessThanOrEqual(due);
        }
        delivered += life.timberDeliveries;
        const end = start + (STEPS_PER_DAY * LIFE_STEP) / WEEK_SECONDS;
        owed += at.filter((t) => t > start && t <= end).length;
      }
    }
    // Medido al fijar la ventana de `WOOD_RUN` (28 sep 2026): 35 de 38 con tres
    // jornadas por aldea; las que faltan son días sin leñadores, en los que la
    // unidad entra igual y el «+1» sale sin nadie delante.
    expect(owed).toBeGreaterThan(0);
    expect(delivered / owed).toBeGreaterThanOrEqual(0.75);
  });
});
