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

// Y las sombras de las nubes sobre el prado (25 sep 2026).
import { cloudCover, cloudShadows, cloudsFor, stepClouds } from '../../src/render3d/effects/clouds';

describe('las nubes', () => {
  it('se ponen una vez en el suelo, y la tormenta tapa más que el cielo claro', () => {
    const ground = new MeshStandardMaterial({ vertexColors: true });
    cloudShadows(ground);
    const once = ground.onBeforeCompile;
    cloudShadows(ground);
    expect(ground.onBeforeCompile).toBe(once);
    expect(ground.customProgramCacheKey()).toContain('clouds');
    cloudsFor('clear');
    for (let n = 0; n < 300; n += 1) stepClouds(0.1);
    const clear = cloudCover();
    cloudsFor('storm');
    for (let n = 0; n < 300; n += 1) stepClouds(0.1);
    expect(cloudCover()).toBeGreaterThan(clear * 2);
  });
});

// Niebla del alba, pájaros de día, luciérnagas de las noches de verano.
import { birdsAt, fliesAt, mistAt } from '../../src/render3d/effects/ambience';

describe('el ambiente sigue a la hora y a la estación', () => {
  it('la niebla es de la madrugada y se va con la mañana', () => {
    expect(mistAt(6.5)).toBeGreaterThan(0.5);
    expect(mistAt(12)).toBe(0);
    expect(mistAt(22)).toBe(0);
  });
  it('los pájaros vuelan de día y no con tormenta', () => {
    expect(birdsAt(11, 'clear')).toBe(1);
    expect(birdsAt(11, 'storm')).toBe(0);
    expect(birdsAt(2, 'clear')).toBe(0);
  });
  it('las luciérnagas, noches de primavera y verano sin lluvia', () => {
    expect(fliesAt(23, 'summer', 'clear')).toBe(1);
    expect(fliesAt(23, 'winter', 'clear')).toBe(0);
    expect(fliesAt(23, 'summer', 'rain')).toBe(0);
    expect(fliesAt(12, 'summer', 'clear')).toBe(0);
  });
});
