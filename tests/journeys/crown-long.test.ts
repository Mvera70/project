// Lo lento de `tests/fast/crown.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 21 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// K-1 · La corona. `docs/historico/plan-rey.md`.
//
// **Lo que se guarda aquí es que dar la corona sea un acto del jugador como dar
// un arado**: se paga con lo del valle, se apunta, se cuenta, y **no mueve una
// sola tirada**. Lo que el rey hace con ella lo mide `crown-will.test.ts`.
//
// El encargo del dueño del diseño, con sus palabras (18 sep 2026): «el rey se
// podrá elegir en algún momento de la partida; sustituirá a lo que tenemos
// actualmente como líder».

import { describe, expect, it } from 'vitest';
import { CROWN, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { crownCandidates, kingOf, RESTING_WILL, will } from '@engine/people/crown';
import { crownKing } from '@engine/world/crown';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

/**
 * Una aldea con gente y plata de sobra: coronar no es lo que se está midiendo.
 *
 * **Semilla 41 y quince años**, y el número está medido: la corona pide treinta
 * personas (`CROWN.MIN_PEOPLE`, el umbral de la capilla) y la semilla 7 —la de
 * costumbre en estas pruebas— sólo tiene 19 al año 15 y 25 al 35. La 41 llega a
 * 40 al año 15. Medido en seis semillas antes de elegirla.
 */
const grown = new Map<string, GameState>();
function rich(seed = 41, years = 15): GameState {
  // **Se juega una vez y se clona**, que es lo que hace `graphics-effects`:
  // quince años cuestan medio segundo y doce pruebas los pagaban doce veces
  // (6,7 s de los veinte que tiene la suite rápida entera). Clonar cuesta
  // milisegundos y cada prueba sigue teniendo su copia para destrozarla.
  const key = `${seed}:${years}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundTwenty(seed);
    run(base, TIME.WEEKS_PER_YEAR * years, 'prudent', CATALOG);
    base.village.silver = CROWN.SILVER * 3;
    grown.set(key, base);
  }
  return structuredClone(base);
}

describe('K-1 · la corona se da, y se paga', () => {
  it('cuesta exactamente su plata y nada más', () => {
    const state = rich();
    const before = { ...state.village };
    const who = crownCandidates(state)[0];
    expect(who, 'hay a quién coronar').toBeDefined();
    if (who === undefined) return;
    const out = crownKing(state, who.id, 'spring', 3);
    expect(out.crowned).toBe(true);
    expect(state.village.silver).toBe(before.silver - CROWN.SILVER);
    expect(state.village.grain).toBe(before.grain);
    expect(state.village.wood).toBe(before.wood);
    expect(state.village.stone).toBe(before.stone);
  });
});

describe('K-1 · coronar no mueve el azar', () => {
  it('y una partida coronada en el mismo tick es la misma partida', () => {
    const play = (): GameState => {
      const state = rich(11, 15);
      const who = crownCandidates(state)[0];
      if (who !== undefined) crownKing(state, who.id, 'spring', 3);
      run(state, TIME.WEEKS_PER_YEAR * 20, 'prudent', CATALOG);
      return state;
    };
    expect(JSON.stringify(play())).toBe(JSON.stringify(play()));
  });
});

describe('K-1 · sin corona, el valle es el de siempre', () => {
  it('la voluntad de un valle sin rey es la de reposo', () => {
    // **Es la garantía de §13.1 hecha aserto**: una partida sin coronar tiene
    // que ser byte a byte la de antes de esta fase, y lo que lo asegura es que
    // `will()` devuelva exactamente lo que el motor leía de la postura retirada.
    const state = foundTwenty(7);
    expect(state.crown).toBeNull();
    expect(will(state)).toEqual(RESTING_WILL);
    run(state, TIME.WEEKS_PER_YEAR * 20, 'prudent', CATALOG);
    expect(will(state)).toEqual(RESTING_WILL);
    expect(kingOf(state)).toBeNull();
  });
});
