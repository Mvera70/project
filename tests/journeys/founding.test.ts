// La pareja se hace aldea. design.md §5.7, §12.2, v3.69.
//
// Desde el 15 sep 2026 el valle lo fundan un hombre y una mujer, por decisión
// del dueño del diseño, y la aldea crece con los que llegan. Esto es lo que esa
// decisión prometía en su primera medida (`tools/founding-report.ts`, seis
// semillas): ninguna pareja se extinguía, todas recibían gente y tenían hijos,
// y la mayoría eran una aldea de verdad a los diez años.
//
// Jugado con `run` y la política prudente, no con `tick`: un bucle de `tick`
// deja la primera encrucijada sin contestar para siempre y no mide este juego
// (CLAUDE.md, «la trampa que esa ronda dejó escrita»).
//
// Medido el 15 sep 2026, población por décadas: 14/28/34/56, 20/30/56/70,
// 11/25/37/53, 11/12/21/25, 20/48/61/56 y 5/13/18/28 (semilla 97, la lenta).
//
// **Y remedido tras R-1 (v3.76), con las dos puertas del rayo fuera.** El
// dueño del diseño pidió después de R-1, con estas palabras, lo contrario de
// lo que esta promesa daba por hecho: «que haya caos y que haya partidas que
// se rompan y no se pueda seguir jugando es la idea del juego»
// (`docs/rework.md` §2.6). Sin las puertas, el rayo puede quemar la única casa
// de la pareja en la primera semana, y una aldea de dos no siempre se
// recupera a tiempo. Las pruebas de abajo que daban por hecho que la pareja
// siempre llega a los cuarenta años se han vuelto a medir con **doce
// semillas** (una cota no se fija con seis muestras cuando la varianza es el
// objetivo del diseño) y sus cotas son las nuevas, con el número medido y el
// motivo escritos en cada una. Lo que no cambió es el motor: sigue siendo
// `foundGame` + `run` con la política prudente.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { population } from '@engine/people/demography';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';

// Doce semillas (v3.76, R-1 §2.6): las seis de siempre más 3, 53, 67, 79, 83 y
// 89, las mismas que `tools/fate-report.ts` usa para medir el caos con más
// señal que seis semillas.
const SEEDS = [3, 7, 11, 23, 31, 41, 53, 67, 79, 83, 89, 97];
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

  it('las que aguantan crecen; las que se rompen, lo cuentan', () => {
    // Hasta v3.75 esta prueba pedía que ninguna pareja se extinguiera en
    // cuarenta años. Sin las puertas del rayo (§2.6 de `docs/rework.md`, «que
    // haya partidas que se rompan y no se pueda seguir jugando es la idea del
    // juego») eso ya no es lo que se mide: el rayo puede quemar la única casa
    // de la pareja en la primera semana y una aldea de dos no siempre se
    // recupera. Medido en doce semillas a cuarenta años: **8 de 12 acaban**
    // (`abandoned` en 3, 23, 31, 41, 83, 97; `extinction` en 7 y 89) y **4
    // siguen** (11, 53, 67, 79), y no todas rehechas: la 67 llega a los
    // cuarenta años con una sola persona, técnicamente viva y no obstante al
    // borde. Lo que se sigue exigiendo, porque es la otra mitad de la misma
    // decisión, no protección: que al menos una aguante con alguien dentro
    // (`state.ended === null` ya implica población > 0), y que las que se
    // rompen lo cuenten con una causa reconocible, nunca en silencio.
    const survivors = outcomes.filter((o) => o.state.ended === null);
    const finished = outcomes.filter((o) => o.state.ended !== null);
    const summary = outcomes.map((o) => `${o.seed}: ${o.state.ended === null ? 'sigue' : o.state.ended.cause}`).join(', ');
    expect(survivors.length, summary).toBeGreaterThan(0);
    expect(finished.length, summary).toBeLessThanOrEqual(11);
    for (const o of survivors) expect(o.atEnd, `semilla ${o.seed}`).toBeGreaterThan(0);
    for (const o of finished) {
      // B3 · **y `stormed` desde el 18 sep 2026**: un valle puede acabar tomado
      // por el clan vecino, que es el primer final que causa alguien de fuera
      // (§1b). Los otros tres son una aldea que se agota; éste es una aldea
      // perdida, y por eso está en la lista aunque no se parezca a los demás.
      expect(['abandoned', 'extinction', 'dispersed', 'stormed'], `semilla ${o.seed}`)
        .toContain(o.state.ended?.cause);
    }
  });

  it('crece por los que llegan y por los que nacen, en la mayoría de las que aguantan', () => {
    // La versión anterior pedía las dos vías de crecimiento en las seis
    // semillas, cuando todas llegaban a los cuarenta años. Ahora ocho de doce
    // no llegan (arriba), y una pareja que se rompe en unos meses no tiene
    // tiempo de recibir a nadie ni de tener hijos: eso no es un fallo del
    // motor, es la misma decisión del dueño. Se mide sólo sobre las que
    // aguantan (11, 53, 67, 79): medido, tres de cuatro reciben gente
    // (11, 67, 79) y tres de cuatro tienen hijos (11, 53, 79); la cota pide la
    // mayoría de cada una, no las cuatro.
    const survivors = outcomes.filter((o) => o.state.ended === null);
    expect(survivors.length).toBeGreaterThan(0);
    const majority = Math.ceil(survivors.length / 2);
    const arrivedCount = survivors.filter((o) => o.arrived > 0).length;
    const bornCount = survivors.filter((o) => o.born > 0).length;
    const summary = survivors.map((o) => `${o.seed}: llegados ${o.arrived}, nacidos ${o.born}`).join(', ');
    expect(arrivedCount, summary).toBeGreaterThanOrEqual(majority);
    expect(bornCount, summary).toBeGreaterThanOrEqual(majority);
  });

  it('a los diez años, alguna ya es aldea y muchas siguen rompiéndose', () => {
    // Antes de quitar las puertas del rayo, lo medido en seis semillas iba de
    // 4 a 13 a los diez años y la cota pedía diez o más en cuatro de seis. Sin
    // las puertas el rayo entra en juego desde la primera semana, y a los diez
    // años casi todas las semillas o bien ya perdieron gente por el camino, o
    // bien todavía son poco más que la pareja: medido en doce semillas, 3: 1,
    // 7: 0, 11: 11, 23: 2, 31: 0, 41: 2, 53: 2, 67: 3, 79: 5, 83: 0, 89: 0,
    // 97: 2. Sólo la semilla 11 llega a ser aldea (≥ 10) a los diez años. La
    // cota baja de «la mayoría» a que **exista** al menos una, que es lo que
    // queda de la promesa de fundación bajo el caos: no todo valle lo
    // consigue, pero alguno sí. El suelo por semilla desaparece: bajo esta
    // decisión, 0 a los diez años es un resultado válido, no un fallo.
    const grown = outcomes.filter((o) => o.atTen >= 10).length;
    const tens = outcomes.map((o) => `${o.seed}: ${o.atTen}`).join(', ');
    expect(grown, `a los diez años: ${tens}`).toBeGreaterThanOrEqual(1);
  });

  it('y dos valles no salen iguales', () => {
    // La esencia del juego según su dueño: que las aldeas se puedan comparar
    // porque salen muy distintas. A los cuarenta años, doce semillas tienen
    // que dar más de tres poblaciones distintas; medido tras quitar las
    // puertas del rayo: 0, 22, 9, 1, 4 (cinco valores, y el 0 lo comparten las
    // ocho que se rompieron antes de los cuarenta años).
    const ends = new Set(outcomes.map((o) => o.atEnd));
    expect(ends.size, [...ends].join(', ')).toBeGreaterThan(3);
  });
});
