// La puntería del evento rápido de caza (27 sep 2026): el reflejo se mide con
// los aros; aquí, que la cuenta premia coincidir y no premia fuera de la ventana.
import { describe, expect, it } from 'vitest';
import { HUNT_QTE, qtePrecision } from '../../src/ui/redesign/hunt-event';

describe('la puntería de la caza', () => {
  const exact = 1 - HUNT_QTE.target;
  it('es plena cuando los aros coinciden', () => {
    expect(qtePrecision(exact)).toBeCloseTo(1, 6);
  });
  it('baja al alejarse y es cero fuera de la ventana, antes y después', () => {
    expect(qtePrecision(exact - HUNT_QTE.window / 2)).toBeCloseTo(0.5, 6);
    expect(qtePrecision(exact + HUNT_QTE.window / 2)).toBeCloseTo(0.5, 6);
    expect(qtePrecision(0)).toBe(0);
    expect(qtePrecision(0.999)).toBe(0);
  });
});
