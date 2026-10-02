// Lo lento de `tests/fast/save.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 183 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// M-23 · design.md §13.
//
// The save format's whole reason to exist is that it survives things: a
// round trip through storage, a corrupt blob nobody asked for, and a balance
// change that would otherwise sink every game in progress. Each test protects
// one of those, not the code that happens to implement them.
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';

import { run } from '@engine/sim';
import type { DecisionRecord } from '@engine/state';
import type { Policy } from '@engine/sim';
import { fingerprint } from '../helpers/fingerprint';

describe('reproducir el registro de decisiones · §13.1', () => {
  it('desde la semilla, con el mismo registro, da el mismo estado que la instantánea', () => {
    const seed = 7;
    const ticks = 3_000; // suficiente para que el catálogo real pregunte varias veces

    // Los veinte de §12.2: el rejugado compara dos partidas con el mismo
    // registro de decisiones, y hace falta que haya decisiones. Desde R-1 §2.6
    // la pareja puede romperse antes de que el catálogo pregunte.
    const original = foundTwenty(seed);
    run(original, ticks, 'prudent', CATALOG);
    expect(original.history.length).toBeGreaterThan(0); // si esto falla, la prueba no prueba nada

    const replay = foundTwenty(seed);
    run(replay, ticks, replayPolicy(original.history), CATALOG);

    expect(fingerprint(replay)).toBe(fingerprint(original));
  });
});

/**
 * A policy that answers exactly as `decisions` recorded, in order — the
 * debugging use §13.1 promises: a saved game replays from its seed without
 * needing the policy that produced it, only the record of what it chose.
 */
function replayPolicy(decisions: readonly DecisionRecord[]): Policy {
  let next = 0;
  return (_state, options) => {
    const decision = decisions[next];
    next += 1;
    if (decision === undefined) throw new Error('replay: ran out of recorded decisions');
    if (!options.includes(decision.optionId)) {
      throw new Error(`replay: recorded '${decision.optionId}' is not among ${options.join(', ')}`);
    }
    return decision.optionId;
  };
}
