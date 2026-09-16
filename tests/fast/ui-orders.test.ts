// UI-R2 · Propiedades puras de `src/ui/redesign/orders.ts`.
//
// El proyecto no trae `jsdom` (`docs/ui-redesign/rounds/UI-R1.md` §4), así
// que lo único de un panel que una prueba rápida puede examinar es la parte
// que no toca el DOM: `nextIntentForLever`/`nextIntentForPriority`, aisladas
// del botón que las dispara por el mismo motivo que separó `attemptDecision`
// de `boot()` en M-20. La integración real (los tres botones, el resaltado,
// la migración a `shell.content`) se acredita con capturas, como hace
// `ui-redesign-shell.test.ts` con `shell.ts`.
//
// Las propiedades que importan de verdad, del brief de UI-R2: las tres
// órdenes usan exactamente `INTENT_STOPS`/`PRIORITY_STOPS`/`stopOf` —nunca un
// valor reconstruido a mano— y aplicar una posición nunca mueve las otras dos
// palancas.

import { describe, expect, it } from 'vitest';
import { INTENT_STOPS, PRIORITY_STOPS, stopOf } from '@engine/state';
import type { Intent } from '@engine/state';
import { nextIntentForLever, nextIntentForPriority } from '@ui/redesign/orders';

/** Una intención de referencia, sin fundar ninguna partida: los tres campos
 * bastan para las propiedades de aquí, y así la prueba no paga el coste de
 * `foundGame`. */
const BASE: Intent = { fields: 1, timber: 0.4, priority: 'none' };

describe('nextIntentForLever · docs/design.md §12, INTENT_STOPS', () => {
  for (const lever of ['fields', 'timber'] as const) {
    describe(`palanca ${lever}`, () => {
      for (const stop of INTENT_STOPS[lever]) {
        it(`«${stop.key}» pone ${lever} en su valor de \`INTENT_STOPS\` y no otro`, () => {
          const next = nextIntentForLever(BASE, lever, stop.key);
          expect(next[lever]).toBe(stop.value);
        });

        it(`«${stop.key}» va y vuelve por \`stopOf\`: las dos direcciones no pueden divergir`, () => {
          const next = nextIntentForLever(BASE, lever, stop.key);
          expect(stopOf(lever, next[lever])).toBe(stop.key);
        });
      }

      it('mover esta palanca conserva la otra y la prioridad — abrir la hoja no reordena nada', () => {
        const other = lever === 'fields' ? 'timber' : 'fields';
        const [firstStop] = INTENT_STOPS[lever];
        if (firstStop === undefined) throw new Error('INTENT_STOPS sin posiciones: brief roto');
        const next = nextIntentForLever(BASE, lever, firstStop.key);
        expect(next[other]).toBe(BASE[other]);
        expect(next.priority).toBe(BASE.priority);
      });

      it('una clave que no está en INTENT_STOPS no toca la intención (robustez del contrato público)', () => {
        expect(nextIntentForLever(BASE, lever, 'nonexistent')).toEqual(BASE);
      });
    });
  }
});

describe('nextIntentForPriority · docs/design.md §12, PRIORITY_STOPS', () => {
  for (const key of PRIORITY_STOPS) {
    it(`«${key}» pone la prioridad en esa posición y conserva siembra y manos`, () => {
      const next = nextIntentForPriority(BASE, key);
      expect(next.priority).toBe(key);
      expect(next.fields).toBe(BASE.fields);
      expect(next.timber).toBe(BASE.timber);
    });
  }

  it('una clave fuera de PRIORITY_STOPS no toca la intención', () => {
    expect(nextIntentForPriority(BASE, 'nonexistent')).toEqual(BASE);
  });
});
