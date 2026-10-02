// Lo lento de `tests/fast/ui-redesign-people.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 10 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// UI-R4 · Propiedades puras de `redesign/people-panel.ts` y
// `redesign/inspect-panel.ts`. `docs/ui-redesign/implementation-plan.md`
// §2.5, §4; `docs/ui-redesign/acceptance-scenarios.md` AC-9, AC-10, AC-11,
// AC-12.
//
// Este proyecto no trae jsdom (`docs/ui-redesign/rounds/UI-R1.md` §4), así
// que lo que se comprueba aquí es exactamente lo que los dos módulos dejan
// puro a propósito: qué villagers entran en la lista, qué id habría que
// seguir dado el estado real, y qué enseña la ficha de alguien que ya no
// está. La integración real —clic real sobre una fila, cierre real
// cancelando el seguimiento— se acredita con capturas (`docs/ui-redesign/
// rounds/UI-R4.md`), no aquí.

import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { isHere } from '@engine/people/demography';
import { run } from '@engine/sim';
import { namedPresent } from '@ui/redesign/people-panel';

describe('namedPresent · filtro nombrados/presentes (U-08, AC-9)', () => {
  it('coincide exactamente con nombrados && isHere, en el orden del motor', () => {
    const state = foundTwenty(7);
    run(state, 20 * TIME.WEEKS_PER_YEAR, 'first', CATALOG);
    const expected = state.people.villagers.filter((v) => v.named && isHere(v));
    expect(expected.length).toBeGreaterThan(0);
    expect(namedPresent(state)).toEqual(expected);
  });

  it('a los veinte años hay nombrados muertos o marchados que la lista no enseña', () => {
    // La propia lista de U-08 ya lo comprobaba (`tests/fast/ui.test.ts`): esto
    // repite la misma propiedad contra la función pura que ahora usa el panel.
    const state = foundTwenty(7);
    run(state, 20 * TIME.WEEKS_PER_YEAR, 'first', CATALOG);
    const gone = state.people.villagers.filter((v) => v.named && !isHere(v));
    expect(gone.length).toBeGreaterThan(0);
    const shown = namedPresent(state);
    for (const v of gone) expect(shown).not.toContain(v);
  });
});
