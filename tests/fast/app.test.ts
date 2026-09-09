// M-20 · design.md §2.60, §17 M-20.
//
// `App.decide`'s four rules, checked as pure logic (`attemptDecision`) rather
// than through `boot`, which needs a real DOM this suite does not open. The
// split mirrors `loop.ts`'s own `advanceAccumulator` versus `startLoop`.
import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { attemptDecision, nextUnusedSeed, resumeAfterHidden } from '@ui/app';

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

describe('resumeAfterHidden · §13.2, v2.84', () => {
  const MINUTE = 60_000;

  it('volver de una pestaña oculta debe los ticks de esa ausencia', () => {
    // El fallo medido en un Android real: catorce minutos de reloj de pared
    // daban siete años en vez de dieciocho, porque el letargo solo corría en
    // `boot` y una pestaña que solo duerme nunca vuelve a arrancar.
    expect(resumeAfterHidden(14 * MINUTE, 16).ticks).toBe(56); // 14 min / 15 s
    expect(resumeAfterHidden(4 * 60 * MINUTE, 1).ticks).toBe(960); // el tope de §13.2
  });

  it('una ausencia de al menos una estación abre el parte; una ojeada no', () => {
    expect(resumeAfterHidden(TIME.WEEKS_PER_SEASON * TIME.REAL_MS_PER_TICK, 1).welcome).toBe(true);
    expect(resumeAfterHidden(30_000, 1)).toEqual({ ticks: 2, welcome: false });
  });

  it('en pausa no se debe nada: el jugador paró el reloj a propósito', () => {
    expect(resumeAfterHidden(4 * 60 * MINUTE, 0)).toEqual({ ticks: 0, welcome: false });
  });
});

describe('semilla sucesora · §13.3', () => {
  it('no reutiliza ninguna semilla archivada y atraviesa el borde uint32', () => {
    expect(nextUnusedSeed(7, new Set([7, 8, 9]))).toBe(10);
    expect(nextUnusedSeed(0xffff_ffff, new Set([0xffff_ffff, 0]))).toBe(1);
  });
});
