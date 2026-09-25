// El valle más vivo · el viento (25 sep 2026). Las copas, los juncos y los
// cultivos se mecen en el sombreador; la fuerza sigue al cielo y llega poco a
// poco, sin saltos, y en pausa no sopla.

import { describe, expect, it } from 'vitest';
import { MeshStandardMaterial } from 'three';
import { stepWind, sway, swayFoliage, windFor, windStrength } from '../../src/render3d/effects/wind';

describe('el viento', () => {
  it('marca los materiales de hoja y de junco, una sola vez, y no la corteza', () => {
    const leaf = new MeshStandardMaterial({ name: 'leaf-light' });
    const reed = new MeshStandardMaterial({ name: 'reed' });
    const bark = new MeshStandardMaterial({ name: 'bark' });
    for (const one of [leaf, reed, bark]) swayFoliage(one);
    const before = leaf.onBeforeCompile;
    sway(leaf);
    expect(leaf.onBeforeCompile, 'marcarlo dos veces no suma').toBe(before);
    expect(leaf.customProgramCacheKey()).toContain('wind');
    expect(reed.customProgramCacheKey()).toContain('wind');
    expect(bark.userData.windy).toBeUndefined();
  });

  it('la tormenta sopla más que el cielo claro, y la fuerza llega sin saltos', () => {
    windFor('clear');
    for (let n = 0; n < 200; n += 1) stepWind(0.1);
    const calm = windStrength();
    windFor('storm');
    stepWind(0.1);
    const firstStep = windStrength();
    expect(firstStep - calm, 'no salta de golpe').toBeLessThan(0.1);
    for (let n = 0; n < 200; n += 1) stepWind(0.1);
    expect(windStrength()).toBeGreaterThan(calm * 2);
  });

  it('en pausa no sopla', () => {
    const at = windStrength();
    stepWind(0);
    expect(windStrength()).toBe(at);
  });
});
