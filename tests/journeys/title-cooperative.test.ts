// P-1b.1 · La pausa de la interfaz no puede alterar ni una decisión del motor.
import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { openAtYear, openAtYearCooperative } from '../../src/ui/debug';

describe('avance cooperativo del menú', () => {
  it('produce el mismo estado completo en el preset y en un final anterior al año pedido', async () => {
    for (const [seed, year] of [[11, 21], [31, 41]] as const) {
      const reference = foundGame(seed);
      const cooperative = foundGame(seed);
      openAtYear(reference, year);
      let yields = 0;
      await openAtYearCooperative(cooperative, year, async () => { yields += 1; });
      expect(yields, `semilla ${seed}: hubo pausas`).toBeGreaterThan(0);
      expect(JSON.stringify(cooperative), `semilla ${seed}: mismo estado byte a byte`)
        .toBe(JSON.stringify(reference));
      if (seed === 31) expect(cooperative.ended, 'el final anterior sigue igual').not.toBeNull();
    }
  });
});
