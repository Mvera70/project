// Lo lento de `tests/fast/sim.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 92 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// M-10 · design.md §4.2, §4.3, §6.2, §12.9.
//
// El orden del tick es normativo: cambiarlo cambia el balance y rompe las
// partidas guardadas. Lo que se protege aquí es ese orden, el determinismo del
// que cuelga todo el proyecto, y que mil ticks no revienten.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { decide, run } from '@engine/sim';

const YEAR = TIME.WEEKS_PER_YEAR;

describe('políticas · §12.9', () => {
  it('first toma la primera y last la última', () => {
    const s = foundTwenty(7);
    run(s, 3000, 'first', CATALOG);
    if (s.crossroad !== null) {
      expect(decide(s, CATALOG, 'first')).toBe(s.crossroad.optionIds[0]);
      expect(decide(s, CATALOG, 'last')).toBe(
        s.crossroad.optionIds[s.crossroad.optionIds.length - 1],
      );
    }
  });

  it('first es acomodaticia: nunca levanta la empalizada', () => {
    // §12.9 v2.10. Ninguna política es neutra, y ésta es la razón: `bandits`
    // tiene por interruptor una obra que `first` no elige jamás.
    const s = foundTwenty(7);
    run(s, 100 * YEAR, 'first', CATALOG);
    const walled = s.history.filter((d) => d.optionId === 'wall_the_village_first');
    expect(walled).toHaveLength(0);
  });
});
