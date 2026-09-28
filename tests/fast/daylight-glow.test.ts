// El alba y el ocaso tiñen el valle (28 sep 2026). Vera: «al atardecer y al
// amanecer el color del cielo cambie un poco, como que se tiña un poco la
// escena, pero muy suave». Propiedad: a esas horas el cielo —que es la luz de
// ambiente y la niebla— es más cálido que a mediodía, y poco; a mediodía, no.

import { describe, expect, it } from 'vitest';
import { daylightAt } from '../../src/render3d/effects/daylight';
import { DAWN, DUSK, NOON } from '../../src/render3d/effects/day-phases';

/**
 * Lo cálido de un color como lo ve el ojo: cuánto rojo hay frente al verde, en
 * el hexadecimal tal cual. Con `Color` de Three no: convierte a espacio lineal
 * y ahí un rosa suave sale como un naranja (0,43 de exceso donde el ojo ve 0,18).
 */
const warmth = (hex: string): number => {
  const c = parseInt(hex.slice(1), 16);
  return ((c >> 16) & 255) / Math.max(1, (c >> 8) & 255);
};

describe('el alba y el ocaso tiñen el cielo', () => {
  it('al salir y al ponerse el sol el cielo es más cálido que a mediodía, y sólo un poco', () => {
    const noon = daylightAt(NOON, 1);
    const dawn = daylightAt(DAWN + 0.08, 1);
    const dusk = daylightAt(DUSK - 0.03, 1);
    expect(warmth(dawn.background)).toBeGreaterThan(warmth(noon.background) + 0.03);
    expect(warmth(dusk.background)).toBeGreaterThan(warmth(noon.background) + 0.03);
    // Suave: ninguno se va a más de un cuarto de distancia del cielo del día.
    expect(warmth(dawn.background) - warmth(noon.background)).toBeLessThan(0.25);
    expect(warmth(dusk.background) - warmth(noon.background)).toBeLessThan(0.25);
    // Y el rebote del suelo se calienta con ellos, para que la sombra no sea gris.
    expect(warmth(dawn.groundBounce)).toBeGreaterThan(warmth(noon.groundBounce));
    expect(warmth(dusk.groundBounce)).toBeGreaterThan(warmth(noon.groundBounce));
  });

  it('a media mañana el tinte ya se ha ido', () => {
    const noon = daylightAt(NOON, 1);
    const midMorning = daylightAt(0.3, 1);
    expect(Math.abs(warmth(midMorning.background) - warmth(noon.background))).toBeLessThan(0.02);
  });
});
