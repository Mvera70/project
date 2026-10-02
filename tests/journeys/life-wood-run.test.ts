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

/**
 * Doce aldeas y tres jornadas cada una, y no cuatro y dos (2 oct 2026, v5.74).
 * Con cuatro semillas y dos días se debían 14 haces, y una sola jornada mal
 * alineada movía la cuenta un 7 %: en `main` salían 11 de 14 y con la cantera
 * al pie de la montaña 10 de 14 —el albañil carga la piedra durante el
 * mediodía, deja libre un sitio en la comida de la plaza, el leñador de la
 * semilla 3 lo coge y se le pasa la hora del haz—. En esta muestra, 42 de 51
 * en `main` y 43 de 51 con la cantera nueva: la propiedad no se movió, se
 * movía la muestra. El umbral sigue en el 75 %.
 */
const SEEDS = [3, 7, 11, 23, 31, 41, 53, 61, 67, 73, 89, 97];

describe('los porteadores van con el reloj de las entregas · esquema 12', () => {
  it('nadie descarga un haz antes de su hora, y casi todas llegan con alguien delante', () => {
    let delivered = 0;
    let owed = 0;
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      run(state, TIME.WEEKS_PER_YEAR * 3, 'prudent', CATALOG);
      const at = state.woodRun?.at ?? [];
      // El segundo y el tercer día de la semana: la jornada entera con sus horas.
      for (const weekDay of [1, 2, 3]) {
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
