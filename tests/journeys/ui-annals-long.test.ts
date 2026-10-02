// Lo lento de `tests/fast/ui-annals.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 8 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// F3d · El cronicón, en lo que se puede probar sin DOM.
//
// **El proyecto no trae `jsdom`** (`docs/ui-redesign/rounds/UI-R1.md` §4), así
// que de una pantalla se prueba aquí lo que no toca el DOM y lo demás se
// acredita con captura — el mismo criterio que `ui-epitaph.test.ts` y
// `ui-chronicle.test.ts`.
//
// Y lo que no toca el DOM resulta ser, otra vez, su fallo más probable: **una
// clave que no está en el banco**. `renderUiText` devuelve `[la.clave]` cuando
// falta, o sea un corchete en mitad de la pantalla, y es la clase de cosa que
// nadie ve hasta que la ve un jugador. Pasó en este mismo menú: las tres claves
// del selector de idioma faltaban y lo cazó una captura del paquete de prensa,
// no una prueba.

import { describe, expect, it } from 'vitest';
import { ledgerFromChronicle } from '@engine/chronicle/ledger';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { archiveGame } from '@engine/save';
import { run } from '@engine/sim';
describe('F3d · y lee el archivo como lo lee el epitafio', () => {
  it('una partida sin libro de cuentas se recuenta de su crónica', () => {
    // Un valle archivado **antes** de F3a no lleva `ledger`, y el índice usa el
    // mismo respaldo que el epitafio (`ledgerFromChronicle`). Dos maneras de
    // leer un archivo viejo serían dos respuestas a la misma pregunta.
    const state = foundGame(31);
    for (let week = 0; week < 60 * TIME.WEEKS_PER_YEAR && state.ended === null; week += 1) {
      run(state, 1, 'prudent', CATALOG);
    }
    if (state.ended === null) state.ended = { tick: state.tick, cause: 'abandoned', lastId: null };
    const game = archiveGame(state);
    expect(game.ledger, 'una partida archivada hoy sí lo trae').toBeDefined();

    const recounted = ledgerFromChronicle(game.chronicle, game.endedTick, game.peakPeople);
    // Lo que la crónica sabe recontar tiene que coincidir con lo que se guardó.
    // Lo que **no** sabe —qué quedó en pie el último día— viene `null`, y una
    // fila nula no se enseña: decir «0 casas» de un valle que tenía dieciséis
    // sería mentir.
    expect(recounted.years).toBe(game.ledger!.years);
    expect(recounted.peak).toBe(game.ledger!.peak);
    expect(recounted.built).toBe(game.ledger!.built);
  });
});
