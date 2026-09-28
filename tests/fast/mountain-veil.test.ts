// El velo de la montaña (28 sep 2026): con la vista de siempre no cambia nada,
// a ras de suelo la montaña que tapa se atenúa, y al volver a subir se va.

import { describe, expect, it } from 'vitest';
import { OrthographicCamera, Vector3 } from 'three';
import { mountainVeilStrength, updateMountainVeil } from '../../src/render3d/effects/mountain-veil';

const degrees = (d: number): number => (d * Math.PI) / 180;
const settle = (pitch: number): number => {
  const camera = new OrthographicCamera();
  for (let n = 0; n < 120; n += 1) updateMountainVeil(camera, new Vector3(), pitch, 1 / 30);
  return mountainVeilStrength();
};

describe('el velo de la montaña', () => {
  it('con la vista de partida (30,6°) no hay velo', () => {
    expect(settle(Math.atan2(0.9, Math.hypot(1, 1.15)))).toBe(0);
  });
  it('a ras de suelo el velo está entero, y se va al volver a subir', () => {
    expect(settle(degrees(12))).toBe(1);
    expect(settle(degrees(40))).toBe(0);
  });
  it('entra con un fundido, no de golpe', () => {
    settle(degrees(40));
    updateMountainVeil(new OrthographicCamera(), new Vector3(), degrees(12), 1 / 60);
    const first = mountainVeilStrength();
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(0.2);
  });
});
