// M-23 · design.md §13.
//
// The save format's whole reason to exist is that it survives things: a
// round trip through storage, a corrupt blob nobody asked for, and a balance
// change that would otherwise sink every game in progress. Each test protects
// one of those, not the code that happens to implement them.
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { catchUp, deserialize, serialize, ticksOwed } from '@engine/save';
import { run } from '@engine/sim';
import type { DecisionRecord } from '@engine/state';
import type { Policy } from '@engine/sim';
import { fingerprint } from '../helpers/fingerprint';

describe('serialize / deserialize · §13.1', () => {
  it('la ida y vuelta por un almacén real (clonado estructurado) es idéntica', () => {
    const state = foundGame(7);
    run(state, 300, 'prudent', CATALOG);
    const saved = serialize(state, state.history, [], 1_726_000_000_000);

    // structuredClone es lo que hace IndexedDB al guardar: sin esto la
    // prueba compararía las mismas referencias consigo mismas y no probaría
    // nada del almacén.
    const stored = structuredClone(saved) as unknown;
    const loaded = deserialize(stored);

    expect(loaded).toEqual(saved);
    expect(fingerprint(loaded.state)).toBe(fingerprint(state));
  });

  it('un guardado corrupto se rechaza, no se cuela como partida válida', () => {
    for (const garbage of [
      null,
      42,
      'not a save',
      {},
      { schema: 1 },
      { schema: 99, savedAtMs: 0, state: foundGame(1), decisions: [], archive: [] },
      { schema: 1, savedAtMs: 0, state: { tick: 'seis' }, decisions: [], archive: [] },
      { schema: 1, savedAtMs: 0, state: foundGame(1), decisions: 'no', archive: [] },
    ]) {
      expect(() => deserialize(garbage)).toThrow();
    }
  });

  it('un guardado válido nunca se rechaza', () => {
    const state = foundGame(3);
    const saved = serialize(state, state.history, [], Date.now());
    expect(() => deserialize(structuredClone(saved))).not.toThrow();
  });
});

describe('catchUp · §13.2', () => {
  it('cuatro horas ejecutan exactamente 960 ticks en menos de 2 s', () => {
    const state = foundGame(7);
    const start = performance.now();
    const report = catchUp(state, TIME.LETHARGY_CAP_MS);
    const elapsedMs = performance.now() - start;

    expect(report.ticks).toBe(960);
    expect(state.tick).toBe(960);
    expect(report.capped).toBe(false); // justo en el tope, no por encima
    expect(elapsedMs).toBeLessThan(2_000);
  });

  it('una ausencia más larga que el tope se recorta a los mismos 960 ticks', () => {
    const state = foundGame(7);
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const report = catchUp(state, oneWeek);
    expect(report.ticks).toBe(960);
    expect(report.capped).toBe(true);
    expect(ticksOwed(oneWeek)).toBe(960);
  });

  it('una encrucijada pendiente sigue pendiente al volver: no se resuelve, no caduca, no mata', () => {
    const state = foundGame(7);
    // Se fuerza una encrucijada con las plantillas reales, sin decisión.
    const template = CATALOG.find((t) => t.options.length >= 2)!;
    state.crossroad = {
      templateId: template.id,
      posedTick: state.tick,
      cast: {},
      optionIds: template.options.map((o) => o.id),
    };
    const before = state.crossroad;

    catchUp(state, TIME.LETHARGY_CAP_MS);

    // La misma referencia: nada la ha resuelto ni la ha sustituido por una
    // nueva. §15 del tick no elige otra mientras haya una pendiente, y
    // ninguna decisión llegó para resolver ésta.
    expect(state.crossroad).toBe(before);
  });

  it('nunca corre más ticks de los que debe (§12: ningún número inventado)', () => {
    expect(ticksOwed(0)).toBe(0);
    expect(ticksOwed(-1000)).toBe(0);
    expect(ticksOwed(TIME.REAL_MS_PER_TICK - 1)).toBe(0);
    expect(ticksOwed(TIME.REAL_MS_PER_TICK)).toBe(1);
  });
});

describe('reproducir el registro de decisiones · §13.1', () => {
  it('desde la semilla, con el mismo registro, da el mismo estado que la instantánea', () => {
    const seed = 7;
    const ticks = 3_000; // suficiente para que el catálogo real pregunte varias veces

    const original = foundGame(seed);
    run(original, ticks, 'prudent', CATALOG);
    expect(original.history.length).toBeGreaterThan(0); // si esto falla, la prueba no prueba nada

    const replay = foundGame(seed);
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
