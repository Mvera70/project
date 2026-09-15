// La pareja se hace aldea. design.md §5.7, §12.2, v3.69.
//
// Desde el 15 sep 2026 el valle lo fundan un hombre y una mujer, por decisión
// del dueño del diseño, y la aldea crece con los que llegan. Esto es lo que esa
// decisión promete y lo que `tools/founding-report.ts` midió antes de fijarla:
// en seis semillas y cuarenta años, ninguna pareja se extingue, todas reciben
// gente y tienen hijos, y la mayoría son una aldea de verdad a los diez años.
//
// Jugado con `run` y la política prudente, no con `tick`: un bucle de `tick`
// deja la primera encrucijada sin contestar para siempre y no mide este juego
// (CLAUDE.md, «la trampa que esa ronda dejó escrita»).
//
// Medido el 15 sep 2026, población por décadas: 14/28/34/56, 20/30/56/70,
// 11/25/37/53, 11/12/21/25, 20/48/61/56 y 5/13/18/28 (semilla 97, la lenta).

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { population } from '@engine/people/demography';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';

const SEEDS = [7, 11, 23, 31, 41, 97];
const YEARS = 40;

interface Outcome {
  readonly seed: number;
  readonly atTen: number;
  readonly atEnd: number;
  readonly born: number;
  readonly arrived: number;
  readonly state: GameState;
}

function played(seed: number): Outcome {
  const state = foundGame(seed);
  let atTen = 0;
  for (let year = 0; year < YEARS && state.ended === null; year += 1) {
    run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    if (year === 9) atTen = population(state);
  }
  return {
    seed,
    atTen,
    atEnd: population(state),
    born: state.people.villagers.filter((v) => v.bornTick > 0).length,
    // Los que no nacieron aquí y no son los dos primeros: llegaron.
    arrived: state.people.villagers.filter((v) => v.bornTick <= 0 && v.id >= 2).length,
    state,
  };
}

describe('una pareja se hace aldea · v3.69', () => {
  const outcomes = SEEDS.map(played);

  it('empieza con dos, un hombre y una mujer', () => {
    for (const seed of SEEDS) {
      const s = foundGame(seed);
      expect(population(s), `semilla ${seed}`).toBe(2);
      expect(s.people.villagers.filter((v) => v.female).length, `semilla ${seed}`).toBe(1);
    }
  });

  it('ninguna pareja se extingue en cuarenta años', () => {
    for (const o of outcomes) {
      expect(o.state.ended, `semilla ${o.seed}`).toBeNull();
      expect(o.atEnd, `semilla ${o.seed}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('crece por los que llegan y por los que nacen, en todas las semillas', () => {
    for (const o of outcomes) {
      expect(o.arrived, `semilla ${o.seed}: nadie llegó`).toBeGreaterThan(0);
      expect(o.born, `semilla ${o.seed}: nadie nació`).toBeGreaterThan(0);
    }
  });

  it('a los diez años es una aldea en la mayoría de los valles', () => {
    // Lo medido va de 5 a 20 a los diez años. La cota —diez o más en cuatro de
    // seis— deja sitio a la semilla lenta sin dejar de exigir que la pareja sea
    // el principio de algo, que es lo que el dueño del diseño pidió.
    const grown = outcomes.filter((o) => o.atTen >= 10).length;
    const tens = outcomes.map((o) => `${o.seed}: ${o.atTen}`).join(', ');
    expect(grown, `a los diez años: ${tens}`).toBeGreaterThanOrEqual(4);
    for (const o of outcomes) expect(o.atTen, `semilla ${o.seed}`).toBeGreaterThanOrEqual(4);
  });

  it('y dos valles no salen iguales', () => {
    // La esencia del juego según su dueño: que las aldeas se puedan comparar
    // porque salen muy distintas. A los cuarenta años, seis semillas tienen
    // que dar más de tres poblaciones distintas.
    const ends = new Set(outcomes.map((o) => o.atEnd));
    expect(ends.size, [...ends].join(', ')).toBeGreaterThan(3);
  });
});
