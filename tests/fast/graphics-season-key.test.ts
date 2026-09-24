import { describe, expect, it } from 'vitest';
import { paletteFor } from '@derive/palette';
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
      if (clock.seasonWeek < 10) expect(seasonColourStep(clock.seasonWeek)).toBe(0);
      if (clock.seasonWeek === 10) expect(seasonColourStep(clock.seasonWeek)).toBe(1);
      if (clock.seasonWeek === 11) expect(seasonColourStep(clock.seasonWeek)).toBe(2);
      previousPalette = palette;
      previousKey = key;
    }
  });
});
