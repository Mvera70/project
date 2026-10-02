// Lo lento de `tests/fast/crown-will.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 10 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// K-2 · La voluntad del rey. `docs/historico/plan-rey.md` §0.3.
//
// **Es la fase que hace que el rey importe**, y lo que se guarda aquí es la
// frase del dueño del diseño hecha aserto: «dependiendo de quién elijamos —el
// puesto de trabajo, la personalidad— ese rey hará unas cosas u otras».
//
// Una tabla por estilo, y cada estilo **abre algo y cierra algo**: si un rey
// sólo diera ventajas, coronar sería una compra y no una decisión. Y la prueba
// que cierra todas las demás: **sin corona nada cambia**, que es la garantía de
// §13.1 —una partida sin coronar es byte a byte la de antes de esta fase—.
//
// Se compara siempre **el mismo valle con y sin rey**, nunca dos semillas: lo
// que se mide es el efecto de la corona, no la biografía de una aldea.

import { describe, expect, it } from 'vitest';
import { CROWN, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { nextProject } from '@engine/world/works';
import { will } from '@engine/people/crown';
import { crownKing } from '@engine/world/crown';
import { crownCandidates } from '@engine/people/crown';
import type { CrownStyle, GameState, Role, Trait } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

const grown = new Map<string, GameState>();
/** La misma aldea de `crown.test.ts`: la 41 pasa de treinta personas al año 15. */
function village(seed = 41, years = 15): GameState {
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

/**
 * Corona a alguien **con el oficio que se pide**, cambiándoselo a mano si hace
 * falta.
 *
 * Cambiar el oficio es legítimo aquí y no es trampa: lo que se mide es qué hace
 * un rey de ese estilo, no si la semilla 41 tiene herrero al año 15. Es lo mismo
 * que hace `pressure.test.ts` poniendo gallinas en el corral para medir el peso
 * de los lobos.
 */
function crowned(state: GameState, trade: Role | null, traits: Trait[] = []): GameState {
  const who = crownCandidates(state)[0];
  if (who === undefined) throw new Error('la aldea de la prueba no tiene candidatos');
  who.role = trade;
  if (traits.length > 0) who.traits = traits;
  const out = crownKing(state, who.id, 'spring', 3);
  if (!out.crowned) throw new Error(`no se pudo coronar: ${out.refusal ?? 'sin motivo'}`);
  return state;
}
describe('K-2 · el rey herrero mira a la muralla', () => {
  it('la aldea levanta empalizada sin esperar a que haya amenaza', () => {
    // §7.3 punto 8 pide fragua **y** amenaza; con este rey basta la fragua. Es
    // lo que «si eliges al herrero, pues haces más armas» significa en un juego
    // que no tiene armas como montón: la muralla, y el señor que la cuenta.
    // **Y vuelve a los quince años** (19 sep 2026). Estuvo en dieciocho desde
    // que la muralla espera a que haya pueblo que amurallar —§7.3 pide once
    // casas (`PALISADE_HOUSES`) y la 41 no las tenía al año quince—, y el
    // motivo se ha evaporado solo: con el hueco entre decisiones en un tercio
    // de año, este valle llega al año quince con **catorce casas**. Medido,
    // dieciocho ya no sirve para lo que esta prueba mide: para entonces el
    // anillo está lleno, `placeBuilding('palisade')` no encuentra sitio para
    // ninguno de los dos y **los dos valles caen en la misma mejora a piedra**,
    // que es la vía de escape de §7.3 y no la voluntad de nadie. En el quince
    // el contraste es el que la fila describe: el rey pide estaca, el valle sin
    // rey no pide nada. **Y al catorce desde v4.94**: con el camino del valle
    // pisado desde la fundación los aldeanos lo prefieren y la aldea se hace
    // un año antes —dieciséis casas al quince, el anillo lleno, y los dos
    // valles otra vez en la mejora a piedra—; al catorce hay quince casas y el
    // contraste está intacto (medido del año 10 al 18).
    const plain = village(41, 14);
    const forge = crowned(village(41, 14), 'smith');
    for (const state of [plain, forge]) {
      delete state.flags['threatened'];
      state.village.wood = 4_000;
    }
    expect(will(forge).style).toBe<CrownStyle>('forge');
    expect(will(forge).arms).toBe(true);
    expect(will(plain).arms).toBe(false);
    // Con fragua en pie, el rey herrero la pide y el valle sin rey no.
    if (plain.buildings.some((b) => b.kind === 'smithy' && b.lostTick === null)) {
      expect(nextProject(forge)).toBe('palisade');
      expect(nextProject(plain)).not.toBe('palisade');
    }
  });

  it('y la familia de la defensa va delante en la cola', () => {
    const forge = crowned(village(), 'smith');
    expect(will(forge).priority).toBe('defence');
  });
});
