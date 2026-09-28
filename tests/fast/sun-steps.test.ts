// El sol de las sombras por pasos (28 sep 2026): la propiedad que quita el
// parpadeo es que la cámara de sombra cambie pocas veces por segundo y nunca se
// quede más de un paso atrás del sol.

import { describe, expect, it } from 'vitest';
import { angleBetween, quantizeReach, stepSun } from '../../src/render3d/effects/sun-steps';

/** El sol de una jornada de 120 s: 180° de arco en los 86 s de luz, a 60 fotogramas. */
function sunAt(seconds: number): { x: number; y: number; z: number } {
  const a = (seconds / 86) * Math.PI;
  return { x: Math.cos(a), y: 0.35 + 0.6 * Math.sin(a), z: 0.4 };
}

describe('el sol de las sombras por pasos', () => {
  it('a dos grados por segundo, con paso de un grado la cámara cambia unas dos veces por segundo, no sesenta', () => {
    const stepped = { x: 0, y: 0, z: 0 };
    let changes = 0;
    for (let frame = 0; frame < 60 * 10; frame += 1) {
      if (stepSun(stepped, sunAt(frame / 60), 1)) changes += 1;
      // Y nunca se queda más de un paso atrás.
      expect(angleBetween(stepped, sunAt(frame / 60))).toBeLessThan(1);
    }
    expect(changes).toBeGreaterThan(10);
    expect(changes).toBeLessThan(30);
  });

  it('sin paso (0°) cambia en cada fotograma, que es lo que había', () => {
    const stepped = { x: 0, y: 0, z: 0 };
    let changes = 0;
    for (let frame = 0; frame < 120; frame += 1) if (stepSun(stepped, sunAt(frame / 60), 0)) changes += 1;
    expect(changes).toBe(120);
  });

  it('el alcance sube a escalones y nunca queda corto', () => {
    for (const reach of [1, 3.9, 4, 4.01, 37.2, 64]) {
      const q = quantizeReach(reach, 4);
      expect(q).toBeGreaterThanOrEqual(reach);
      expect(q % 4).toBe(0);
      expect(q - reach).toBeLessThan(4);
    }
  });
});
