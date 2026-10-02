// Lo lento de este fichero vive en `tests/journeys/fate-long.test.ts` (v5.56).
//
// R-1 · Los sucesos del valle. design.md §4.2 (paso 2b), §7.10, §12.10.
//
// Lo que se vigila: que el mundo pase cosas por su cuenta a un ritmo que se
// pueda contar, que ninguna se cuele fuera de su estación o de su cielo, que
// todo lo que pasa se cuente y se vea, y —lo que el dueño del diseño pidió— que
// dos valles no tengan la misma historia. Medido jugando con `run` y la
// política prudente, nunca con `tick` a secas (CLAUDE.md).

import { describe, expect, it } from 'vitest';
import { FATE, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { RNG_STREAMS } from '@engine/rng';
import { run } from '@engine/sim';
import { type GameState } from '@engine/state';
import { rollFate } from '@engine/world/fate';
import { foundTwenty } from '../helpers/founding';const YEARS = 30;

/** Una aldea jugada `years` años, con lo que le pasó. */
function played(seed: number, years = YEARS): GameState {
  const state = foundGame(seed);
  for (let y = 0; y < years && state.ended === null; y += 1) {
    run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
  }
  return state;
}

describe('los sucesos del valle · R-1', () => {
  it('la cadencia va con el tamaño de la aldea, no es la misma para dos que para cuarenta', () => {
    // **La propiedad cambió a propósito** (16 sep 2026, decisión del dueño del
    // diseño: «que una partida salga mal por casualidad está bien, que casi
    // todas se vayan a romper no es la idea; no hay que poner límites, hay que
    // equilibrar»). Con la tirada plana, una pareja y una aldea de cuarenta
    // recibían los mismos doce sucesos al año, o sea que la pareja se comía una
    // catástrofe por trimestre: medido, ocho valles de doce se rompían.
    //
    // Ahora la densidad va con la gente (`FATE.FATED_FULL_PEOPLE`,
    // `FATED_LEAST_SHARE`), y eso es lo que se mide aquí: una aldea hecha tiene
    // un noticiario y un caserío una vida callada. No es un techo — ningún
    // suceso está prohibido — es una proporción.
    const made = foundTwenty(7);
    run(made, 10 * TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    const madeRate = made.happenings.length / 10;

    const young = foundGame(7);
    run(young, 4 * TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    // RD-5 (1 oct 2026) · los sucesos pequeños del caserío (`FATE.HAMLET_WEIGHT`)
    // no cuentan aquí: tienen su propia tirada, ninguno destruye nada, y esta
    // propiedad guarda que una pareja no reciba **el sorteo** de una aldea de
    // cuarenta —la catástrofe por trimestre—, no que su vida sea muda.
    const smallOnes = Object.keys(FATE.HAMLET_WEIGHT);
    const youngRate = young.happenings.filter((h) => !smallOnes.includes(h.id)).length / 4;

    expect(madeRate, `aldea hecha: ${madeRate.toFixed(1)} al año`).toBeGreaterThan(6);
    expect(madeRate, `aldea hecha: ${madeRate.toFixed(1)} al año`).toBeLessThan(24);
    expect(youngRate, `caserío: ${youngRate.toFixed(1)} contra ${madeRate.toFixed(1)}`)
      .toBeLessThan(madeRate);
  });

  it('sólo consume azar del flujo `fate`', () => {
    // El innegociable: un suceso que tocara `births` o `weather` movería quién
    // nace y qué año hace, y dos partidas con la misma semilla divergirían por
    // culpa del decorado.
    const state = foundTwenty(7);
    run(state, 5 * TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    const before = { ...state.rng };
    let rolled = 0;
    for (let n = 0; n < 200; n += 1) {
      state.tick += 1;
      if (rollFate(state) !== null) rolled += 1;
    }
    expect(rolled).toBeGreaterThan(0);
    for (const stream of RNG_STREAMS) {
      if (stream === 'fate') continue;
      expect(state.rng[stream], stream).toBe(before[stream]);
    }
    expect(state.rng.fate).not.toBe(before.fate);
  });

  it('la misma semilla vive los mismos sucesos', () => {
    const a = played(7, 10);
    const b = played(7, 10);
    expect(a.happenings).toEqual(b.happenings);
  });
});
