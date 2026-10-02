// Lo lento de `tests/fast/means.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 53 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// M-2 · Los medios: lo que el jugador mete en el valle.
// `docs/historico/plan-medios.md` §3, brief en `docs/historico/rework.md` §4b.
//
// **Lo que se guarda no es que un medio sea bueno.** Es que dar algo cueste lo
// del valle, que no se pueda dar lo que no se puede pagar, que dar no mueva una
// sola tirada del mundo, y que cada medio abra algo **y** cierre algo. Si un día
// alguien hace que los medios sólo traigan cosas buenas, esto se rompe, y eso
// es lo que tiene que pasar: la mitad mala es la mitad que hace que elegir sea
// una decisión (`docs/historico/plan-medios.md` §3.2).

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { MEANS_IDS, type GameState, type MeansId } from '@engine/state';
import { MEANS_SPEC, giveMeans, refusalFor } from '@engine/world/means';
import { foundTwenty } from '../helpers/founding';
/**
 * Una aldea hecha con de todo en la despensa, para que el precio no estorbe.
 *
 * **Y con camas de sobra desde B-1**, por la misma razón: el par de manos pide
 * un sitio donde dormir, y con el ritmo nuevo esta aldea de cuatro años llega
 * con las camas llenas —la gente llega todos los meses mientras el valle es
 * pequeño—, así que la negativa que salía era `room` y esta prueba, que mide el
 * **precio**, no llegaba a mirarlo. Dos casas más y el sitio deja de estorbar,
 * igual que la despensa.
 */
function rich(seed = 7): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 4, 'prudent', CATALOG);
  state.village.grain = 5000;
  state.village.wood = 5000;
  state.village.silver = 500;
  for (let n = 0; n < 2; n += 1) {
    state.buildings.push({
      id: 9500 + n, kind: 'house', x: 10 + n * 3, y: 10, w: 2, h: 2,
      builtTick: state.tick, lostTick: null, tier: 0, lit: true, blockedUntil: null,
    });
  }
  return state;
}

/**
 * A2c · **Y una aldea con muralla y puerta, para el portón.**
 *
 * El portón es el único medio que necesita algo que no está en la despensa: un
 * cerco que atravesar. La aldea de cuatro años de `rich()` no lo tiene, así que
 * la negativa que salía era `room` y estas dos pruebas —que miden el
 * **precio**— no llegaban a mirarlo. Es el mismo remedio que las dos casas de
 * más: se le da al valle lo que el medio necesita y el precio deja de quedar
 * tapado.
 *
 * Treinta y dos años en la semilla 47 es lo primero que hay, medido en diez
 * semillas: antes de eso la aldea ni siquiera ha cerrado un tramo de muralla
 * donde quepa una segunda puerta. Se guarda hecha y se clona, que es lo que
 * hace `crown-will.test.ts` por lo mismo.
 */
let walledBase: GameState | undefined;
function walled(): GameState {
  if (walledBase === undefined) {
    walledBase = foundTwenty(47);
    run(walledBase, TIME.WEEKS_PER_YEAR * 32, 'prudent', CATALOG);
  }
  const state = structuredClone(walledBase);
  state.village.grain = 5000;
  state.village.wood = 5000;
  state.village.silver = 500;
  state.village.stone = 5000;
  return state;
}

/** La aldea que cada medio necesita para que lo único que estorbe sea el precio. */
function payer(id: MeansId): GameState {
  return id === 'gate' ? walled() : rich();
}

describe('dar un medio', () => {
  it('cuesta exactamente lo que dice, y nada más', () => {
    for (const id of MEANS_IDS) {
      const state = payer(id);
      const before = { ...state.village };
      const outcome = giveMeans(state, id, 'spring', 4);
      expect(outcome.given, id).toBe(true);
      for (const stat of ['grain', 'wood', 'stone', 'silver'] as const) {
        const cost = MEANS_SPEC[id].cost[stat] ?? 0;
        expect(state.village[stat], `${id}: ${stat}`).toBe(before[stat] - cost);
      }
    }
  });

  it('no se puede dar lo que no se puede pagar, y no se cobra a medias', () => {
    for (const id of MEANS_IDS) {
      const state = payer(id);
      state.village.silver = 0;
      const before = { ...state.village };
      expect(refusalFor(state, id), id).toBe('cost');
      const outcome = giveMeans(state, id, 'spring', 4);
      expect(outcome.given, id).toBe(false);
      expect(state.village, id).toEqual(before);
    }
  });
});
