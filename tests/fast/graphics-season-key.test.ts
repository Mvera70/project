import { describe, expect, it } from 'vitest';
import { paletteFor, TURN_WEEKS } from '@derive/palette';
import { clockOf } from '@engine/time';
import type { ValleyMap } from '@engine/state';
import { groundSignature, seasonColourStep } from '../../src/render3d/world/plan';

describe('season appearance key', () => {
  it('changes at every visible palette step near the end of each season', () => {
    const cells = 72 * 112;
    const map: ValleyMap = {
      width: 72, height: 112,
      terrain: new Uint8Array(cells), traffic: new Uint16Array(cells),
      path: new Uint8Array(cells), ruins: new Uint8Array(cells),
      forestAge: new Uint8Array(cells), forestStock: new Uint16Array(cells),
    };
    let previousPalette = '';
    let previousKey = 0;
    for (let tick = 0; tick <= 48; tick += 1) {
      const clock = clockOf(tick);
      const palette = JSON.stringify(paletteFor(clock.season, clock.seasonWeek));
      const key = groundSignature(map, tick);
      if (tick > 0 && palette !== previousPalette) expect(key).not.toBe(previousKey);
      // Un paso por semana en las `TURN_WEEKS` últimas de la estación (cuatro
      // desde el 25 sep 2026: con dos, el cambio se veía de golpe).
      expect(seasonColourStep(clock.seasonWeek)).toBe(Math.max(0, clock.seasonWeek - (11 - TURN_WEEKS)));
      previousPalette = palette;
      previousKey = key;
    }
  });
});

// La nieve cuaja y se funde poco a poco (Vera, 25 sep 2026: «entre cambio y
// cambio de estación el mapa pega un cambio brusco, por ejemplo a la nieve»).
import { snowCover, SNOW_DEEP } from '@derive/palette';

describe('la nieve llega y se va poco a poco', () => {
  it('ningún salto de una semana a la siguiente pasa de un tercio de la nevada', () => {
    let previous = snowCover('spring', 0);
    for (let tick = 1; tick <= 96; tick += 1) {
      const clock = clockOf(tick);
      const now = snowCover(clock.season, clock.seasonWeek);
      expect(Math.abs(now - previous), `semana ${tick}`).toBeLessThanOrEqual(SNOW_DEEP / 3 + 1e-9);
      previous = now;
    }
  });

  it('sin nieve en verano, espolvoreada al final del otoño, honda a mitad del invierno', () => {
    expect(snowCover('summer', 6)).toBe(0);
    expect(snowCover('autumn', 11)).toBeGreaterThan(0);
    expect(snowCover('winter', 5)).toBe(SNOW_DEEP);
    expect(snowCover('spring', 0)).toBe(0);
  });
});
