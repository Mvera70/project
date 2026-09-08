// M-20 · design.md §2.60, §17 M-20.
//
// `App.decide`'s four rules, checked as pure logic (`attemptDecision`) rather
// than through `boot`, which needs a real DOM this suite does not open. The
// split mirrors `loop.ts`'s own `advanceAccumulator` versus `startLoop`.
import { describe, expect, it } from 'vitest';
import { attemptDecision } from '@ui/app';

describe('attemptDecision · §2.60', () => {
  it('sin encrucijada pendiente, no se acepta a ninguna velocidad', () => {
    for (const speed of [0, 1, 4, 16] as const) {
      expect(attemptDecision(false, false, speed)).toEqual({ accepted: false, forceTick: false });
    }
  });

  it('con una decisión ya encolada, no sustituye a la anterior', () => {
    // Regla 1: decidido es decidido. Un doble toque no puede cambiar algo que
    // ya va camino de `history`.
    expect(attemptDecision(true, true, 1)).toEqual({ accepted: false, forceTick: false });
  });

  it('encolar fuerza el tick siguiente a cualquier velocidad en marcha', () => {
    // Regla 2, sea cual sea la velocidad — 1×, 4× o 16×.
    for (const speed of [1, 4, 16] as const) {
      expect(attemptDecision(true, false, speed)).toEqual({ accepted: true, forceTick: true });
    }
  });

  it('en pausa la decisión se conserva pero no fuerza nada', () => {
    // Regla 3: §8.7 dice que la simulación no se detiene por una encrucijada
    // pendiente, no que el jugador no pueda pausarla él mismo.
    expect(attemptDecision(true, false, 0)).toEqual({ accepted: true, forceTick: false });
  });
});
