// F3a · El libro de cuentas de una partida. docs/plan-final.md §2.
//
// **Una hoja de estadísticas miente muy fácil y nadie se entera.** Un número
// mal contado en una pantalla de final no rompe nada, no sale en ninguna traza
// y el jugador se lo cree: es la clase de fallo que sobrevive años. Así que la
// prueba es fila a fila, y cada aserto compara la cifra con **la fuente de la
// que dice venir** —la crónica o el estado— y no con un número escrito aquí.
//
// Y una propiedad que las cubre todas: **recontar de la crónica tiene que dar
// lo mismo** que contar al cerrar, salvo en las dos filas que la crónica no
// puede saber. Eso es lo que hace que una partida archivada antes de F3a se
// pueda enseñar.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { archiveGame } from '@engine/save';
import { ledgerFromChronicle, ledgerOf } from '@engine/chronicle/ledger';
import { yearOf } from '@engine/time';
import type { ChronicleEntry, GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

/** Una partida jugada hasta que acaba, o hasta los ochenta años. */
function played(seed: number, years = 80): GameState {
  const state = foundTwenty(seed);
  for (let week = 0; week < TIME.WEEKS_PER_YEAR * years && state.ended === null; week += 1) {
    run(state, 1, 'prudent', CATALOG);
  }
  return state;
}

/** Cuántas cabezas cuenta una entrada, como las cuenta el libro. */
function heads(entry: ChronicleEntry): number {
  const count = entry.params['count'];
  return typeof count === 'number' && count > 0 ? count : 1;
}

/** La suma de cabezas de las entradas de esas clases. */
function headsOf(state: GameState, kinds: readonly string[]): number {
  return state.chronicle
    .filter((e) => kinds.includes(e.kind))
    .reduce((sum, e) => sum + heads(e), 0);
}

const SEEDS = [7, 23, 41];

describe('F3a · el libro de cuentas', () => {
  it('cada fila cuadra con la fuente de la que dice venir, en tres semillas', () => {
    for (const seed of SEEDS) {
      const state = played(seed);
      const ledger = ledgerOf(state);
      const tag = `semilla ${seed}`;

      // Las tres grandes.
      expect(ledger.years, `${tag}: años`)
        .toBe(yearOf(state.ended?.tick ?? state.tick));
      expect(ledger.peak, `${tag}: pico`).toBe(state.peakPeople);

      // La gente, contada por cabezas y no por líneas: una entrada agregada
      // dice «tres nacieron» en una sola línea.
      expect(ledger.born, `${tag}: nacieron`).toBe(headsOf(state, ['birth']));
      expect(ledger.died, `${tag}: murieron`).toBe(headsOf(state, ['death', 'extinction']));
      expect(ledger.arrived, `${tag}: llegaron`).toBe(headsOf(state, ['arrival']));
      expect(ledger.left, `${tag}: se fueron`).toBe(headsOf(state, ['departure']));

      // Las obras, por líneas: cada obra es una entrada.
      expect(ledger.built, `${tag}: obras`)
        .toBe(state.chronicle.filter((e) => e.kind === 'built').length);
      expect(ledger.lostWorks, `${tag}: perdidas`)
        .toBe(state.chronicle.filter((e) => e.kind === 'lost').length);

      // Lo que el jugador hizo.
      expect(ledger.decisions, `${tag}: decisiones`)
        .toBe(state.chronicle.filter((e) => e.kind === 'crossroad_taken').length);
      expect(ledger.given, `${tag}: medios dados`)
        .toBe(state.chronicle.filter((e) => e.kind === 'means').length);

      // Y lo que quedó en pie, que sólo sabe el estado.
      const standing = state.buildings.filter((b) => b.lostTick === null);
      expect(ledger.houses, `${tag}: casas en pie`)
        .toBe(standing.filter((b) => b.kind === 'house' || b.kind === 'stone_house').length);
      expect(ledger.wall, `${tag}: cerco en pie`)
        .toBe(standing.filter((b) => b.kind === 'palisade' || b.kind === 'wall').length);
    }
  });

  it('recontar de la crónica da lo mismo, salvo lo que la crónica no sabe', () => {
    // **La propiedad que hace enseñable una partida archivada antes de F3a.**
    // Las dos filas de «qué quedó en pie» se pierden y salen vacías, que es un
    // dato que falta y no un cero: un cero diría que no quedó nada.
    for (const seed of SEEDS) {
      const state = played(seed);
      const closed = ledgerOf(state);
      const recounted = ledgerFromChronicle(
        state.chronicle, state.ended?.tick ?? state.tick, state.peakPeople,
      );
      expect({ ...recounted, houses: closed.houses, wall: closed.wall },
        `semilla ${seed}`).toEqual(closed);
      expect(recounted.houses, `semilla ${seed}: lo que no se puede saber, vacío`).toBeNull();
      expect(recounted.wall).toBeNull();
    }
  });

  it('el asedio se cuenta como lo cuenta la crónica: los asaltos y lo que costaron', () => {
    // Los asaltos no se pueden contar sumando líneas de `raid`: el aviso, la
    // vuelta y el asalto que llega son líneas de la misma visita. Lo que se
    // cuenta es la visita, y los que aguantaron son los que acabaron en
    // `raid.held`.
    const state = played(7);
    const ledger = ledgerOf(state);
    const held = state.chronicle.filter((e) => e.templateKey === 'raid.held');
    const sacks = state.chronicle.filter((e) => e.templateKey === 'raid.open'
      || e.templateKey === 'raid.walled');
    const stormed = state.chronicle.filter((e) => e.templateKey === 'raid.stormed');

    expect(ledger.raidsHeld, 'asaltos aguantados').toBe(held.length);
    expect(ledger.raids, 'visitas contadas una vez')
      .toBe(held.length + sacks.length + stormed.length);
    // Y lo que costaron sale de los parámetros que esas líneas ya llevan.
    const slain = [...held, ...stormed]
      .reduce((sum, e) => sum + (typeof e.params['slain'] === 'number' ? e.params['slain'] : 0), 0);
    expect(ledger.slain, 'saqueadores abatidos').toBe(slain);
  });

  it('el año de la primera piedra, o nada si nunca llegó', () => {
    // El peldaño de la fase 2, y una de las cifras que un jugador compara. Se
    // mide contra la primera entrada de obra de una clase de piedra, que es de
    // donde el libro dice sacarlo.
    for (const seed of SEEDS) {
      const state = played(seed);
      const ledger = ledgerOf(state);
      const first = state.chronicle.find((e) => e.kind === 'built'
        && (e.params['building'] === 'stone_house' || e.params['building'] === 'wall'
          || e.params['building'] === 'church'));
      if (first === undefined) {
        expect(ledger.stoneYear, `semilla ${seed}: sin piedra`).toBeNull();
      } else {
        expect(ledger.stoneYear, `semilla ${seed}: el año de la primera piedra`)
          .toBe(yearOf(first.tick));
      }
    }
  });

  it('una partida acabada se archiva con sus cuentas dentro', () => {
    // La otra mitad de F3a: el libro viaja en el archivo, porque la crónica de
    // las partidas viejas se poda y entonces recontar dejaría de ser posible.
    const state = played(41);
    if (state.ended === null) {
      state.ended = { tick: state.tick, cause: 'abandoned', lastId: null };
    }
    const game = archiveGame(state);
    expect(game.ledger, 'el archivo lleva el libro').toBeDefined();
    expect(game.ledger, 'y es el mismo que se cuenta al cerrar').toEqual(ledgerOf(state));
  });

  it('un valle recién fundado tiene un libro en blanco y no se rompe', () => {
    // El caso degenerado, que es el que se olvida: la partida más corta posible.
    const ledger = ledgerOf(foundGame(7));
    // Cero años y no uno: `yearOf` cuenta años **cumplidos**, que es la misma
    // cuenta que la línea de resumen del epitafio lleva enseñando («43 years»).
    // Una aldea fundada esta semana no ha durado un año.
    expect(ledger.years, 'no ha durado un año').toBe(0);
    expect(ledger.raids, 'sin asaltos').toBe(0);
    expect(ledger.stoneYear, 'sin piedra').toBeNull();
    expect(ledger.houses, 'pero las casas se saben').not.toBeNull();
  });
});
