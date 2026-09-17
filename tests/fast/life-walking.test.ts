import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { createVillage } from '../../src/render3d/life/village';
import { createNeighbourhood } from '../../src/render3d/life/grid';
import { resolve, separate } from '../../src/render3d/life/steering';
import { LIFE_STEP } from '../../src/render3d/life/clock';
import type { Body, Terrain } from '../../src/render3d/life/body';

describe('marcha y contacto humano', () => {
  it('no empuja vecinos separados por más de su anchura aunque sus márgenes de ruta coincidan', () => {
    const a: Body = { id: 0, x: 5, z: 5, vx: 0, vz: 0, facing: 0, radius: 0.32, contactRadius: 0.19, pace: 1 };
    const b = { ...a, id: 1, x: 5.5 };
    const land: Terrain = { width: 12, height: 12, blocked: new Uint8Array(144) };
    const grid = createNeighbourhood(12, 12);
    grid.rebuild([a, b]);
    expect(separate(a, grid)).toEqual({ x: 0, z: 0 });
    resolve([a, b], grid, land);
    expect(a.x).toBe(5);
    expect(b.x).toBe(5.5);
    b.x = 5.35;
    resolve([a, b], grid, land);
    expect(b.x - a.x).toBeGreaterThanOrEqual(0.38 - 1e-9);
  });

  it.each([7, 11])('la zancada mide el avance final, incluidos los contactos, semilla %i', seed => {
    const life = createVillage(foundGame(seed), 0);
    for (let step = 0; step < 180; step++) {
      const before = life.dwellers.map(d => ({ x: d.body.x, z: d.body.z, travelled: d.travelled }));
      life.step();
      life.dwellers.forEach((d, i) => {
        const from = before[i]!;
        const distance = Math.hypot(d.body.x - from.x, d.body.z - from.z);
        expect(d.travelled - from.travelled).toBeCloseTo(distance, 10);
        expect(d.motionSpeed).toBeCloseTo(distance / LIFE_STEP, 10);
      });
    }
  });
});
