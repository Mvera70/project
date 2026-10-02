// Lo lento de este fichero vive en `tests/journeys/ui-milestones-long.test.ts` (v5.56).
//
// design.md §11.6, §9.2 — `src/ui/milestones.ts`.
//
// What is protected here is the same thing `notice.test.ts` protects for the
// chronicle band: that the derivation is pure, that it never repeats an event
// it has already told, and that a real sixty-year village produces a handful
// of these, not zero and not a teletype.
//
// The sixty-year games are built once, at module scope, and shared across the
// properties below — `run` and `foundGame` are the expensive part, and
// `milestonesAt` is read-only, so five games played once cost the same as
// five games played five times over.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { renderEntry } from '@engine/chronicle/render';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { yearOf } from '@engine/time';
import type { Policy } from '@engine/sim';
import { milestonesAt } from '@ui/milestones';
const POLICY: Policy = 'prudent';describe('el año que dice un hito es el año que dice la cabecera', () => {
  it('no suma uno dos veces', () => {
    // El fallo que esto cierra, medido y no supuesto. E4 movió el «+1» de los
    // años absolutos a la **presentación** (`chronicle/render.ts`), que es lo
    // correcto: así una partida guardada de antes se lee bien sin migrarla. Lo
    // que no se revisó entonces es que este módulo ya lo sumaba por su cuenta
    // antes de entregar los parámetros, así que desde E4 la cartela de hito
    // decía **dos años más** que la cabecera: ANNO IV arriba y «in year 5»
    // debajo, en la misma pantalla y en el mismo instante.
    //
    // Es exactamente la clase de fallo que hacía que los mensajes se leyeran
    // raros, y la razón de que se pruebe con los dos rendidos a la vez: por
    // separado los dos números están bien.
    const state = foundTwenty(7);
    run(state, TIME.WEEKS_PER_YEAR * 3, POLICY, CATALOG);
    const passed = milestonesAt(state, 0);
    const dated = passed.filter((m) => typeof m.params['year'] === 'number');
    expect(dated.length, 'hay hitos con fecha que comprobar').toBeGreaterThan(0);
    for (const milestone of dated) {
      // Lo que el motor sabe: el año en base cero del tick del hito.
      const engineYear = yearOf(milestone.tick);
      expect(milestone.params['year'], `${milestone.key} lleva el año del motor`)
        .toBe(engineYear);
      // Y lo que el jugador lee, por el mismo camino que lo pinta `app.ts`.
      const line = renderEntry({
        tick: milestone.tick, kind: 'season', templateKey: milestone.key,
        params: milestone.params, weight: milestone.weight,
      }, state.rng);
      const said = /year (\d+)/u.exec(line);
      if (said === null) continue;
      expect(Number(said[1]), `«${line}» contra la cabecera`).toBe(engineYear + 1);
    }
  });
});
