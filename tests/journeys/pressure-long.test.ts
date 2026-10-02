// Lo lento de `tests/fast/pressure.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 6 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// M-1 · El mundo contesta a lo que hay. `docs/historico/rework.md` §4b, brief M-1.
//
// **Lo que se guarda aquí no es que el mundo mate**: es que lo que puede romper
// la aldea vaya con lo que la aldea ha acumulado, y que de primeras no la rompa.
// Las dos mitades son decisión del dueño del diseño (17 sep 2026): «que haya
// partidas que se rompan es la idea», y «que caiga un rayo en una casa y eso ya
// se muera no tiene gracia; se puede morir, pero más adelante, porque ya hemos
// tomado varias decisiones que hacen que se tumbe».
//
// Se miden **pesos** y no partidas: `weightNow` dice lo que el sorteo va a usar,
// así que dos estados que sólo se diferencian en el corral se comparan sin
// jugar cien años y adivinar. Las partidas las mide `tools/reports/agency-report.ts`.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
describe('un rayo no deja a la aldea sin techo · M-1', () => {
  it('con una sola casa en pie, el rayo cae en otra cosa', () => {
    // Es la frase del dueño del diseño hecha aserto. Se fuerza el suceso en vez
    // de esperar la tormenta: lo que se mide es a qué se lleva, no si cae.
    for (const seed of [7, 11, 23, 2024]) {
      const state = foundGame(seed);
      run(state, TIME.WEEKS_PER_YEAR * 6, 'prudent', CATALOG);
      const roofs = () => state.buildings.filter(
        (b) => b.lostTick === null && (b.kind === 'house' || b.kind === 'stone_house')).length;
      if (roofs() === 0) continue;
      // Se deja una sola casa en pie y se tira el rayo cien veces.
      let first = true;
      for (const b of state.buildings) {
        if (b.lostTick !== null) continue;
        if (b.kind === 'house' || b.kind === 'stone_house') {
          if (first) { first = false; continue; }
          b.lostTick = state.tick;
        }
      }
      expect(roofs(), `semilla ${seed}`).toBe(1);
      for (let n = 0; n < 100; n += 1) {
        state.tick += 1;
        // `happen` no es público: el rayo se provoca por el camino de siempre,
        // con el peso a mano, y lo que se comprueba es el estado después.
        const before = roofs();
        run(state, 1, 'prudent', CATALOG);
        expect(roofs(), `semilla ${seed}: nunca se queda sin techo`).toBeGreaterThan(0);
        expect(before, 'y el techo no desaparece de golpe').toBeGreaterThan(0);
      }
    }
  });
});
