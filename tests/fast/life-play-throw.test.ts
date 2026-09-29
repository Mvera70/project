// AN-2a · Lanzar la pelota se fecha con el hecho que viene.
//
// `fling` suelta la pelota cuando la oferta `play` acaba (`doing.until`), así
// que el clip del lanzamiento no va por reloj con desfase: corre hacia su
// final desde ese paso, y antes de su ventana se queda en la pose cero con la
// pelota en las manos. La propiedad: la suelta del gesto cae en el paso de la
// suelta real, pase lo que pase con la duración de la oferta.
import { describe, expect, it } from 'vitest';
import { throwSeconds } from '../../src/render3d/life/cast';
import { LIFE_STEP } from '../../src/render3d/life/clock';
import { VILLAGER_CLIPS } from '../../src/render3d/clips';

describe('AN-2a · el lanzamiento fechado', () => {
  const D = VILLAGER_CLIPS.throw.seconds;

  it('es un gesto de una vez que cabe en la oferta más corta', () => {
    expect(VILLAGER_CLIPS.throw.loop).toBe(false);
    // Y jugar sin pelota sigue siendo un bucle: es el día de un niño.
    expect(VILLAGER_CLIPS.play.loop).toBe(true);
    expect(D).toBeLessThanOrEqual(1);
  });

  it('antes de la ventana está en la pose cero, y en el paso de la suelta al final', () => {
    const until = 500;
    // Lejos del final: la pelota en las manos.
    expect(throwSeconds(until, until - 60)).toBe(0);
    // A un paso de que `fling` actúe (el último paso hecho es `until - 1`): casi al final.
    expect(throwSeconds(until, until)).toBeCloseTo(D - LIFE_STEP, 6);
    // Ya pasado: acotado al final, nunca más allá del clip.
    expect(throwSeconds(until, until + 5)).toBe(D);
  });

  it('corre a la velocidad del reloj de la vida', () => {
    const until = 900;
    const a = throwSeconds(until, until - 12), b = throwSeconds(until, until - 6);
    expect(b - a).toBeCloseTo(6 * LIFE_STEP, 6);
  });
});
