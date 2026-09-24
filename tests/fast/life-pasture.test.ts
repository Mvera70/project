// IA-pasture · El ganado no pisa los sembrados (Vera, 24 sep 2026).
//
// La gente trabaja dentro del campo, así que el campo es suelo para ella; para
// las vacas, los cerdos y las gallinas es una cerca. Se mira una jornada
// entera en dos aldeas, muestreando cada segundo de vida.
import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';

describe('IA-pasture · el ganado no entra en los campos', () => {
  it.each([11, 23])('ningún animal pisa una parcela de cultivo en la semilla %i', (seed) => {
    const state = foundTwenty(seed);
    const fields = state.buildings.filter(b => b.kind === 'field' && b.lostTick === null);
    expect(fields.length).toBeGreaterThan(0);
    const life = createVillage(state, state.tick * 7 + 2);
    expect(life.beasts.length).toBeGreaterThan(0);
    let inside = 0, samples = 0;
    while (life.steps < 3000) {
      life.step();
      if (life.steps % 30 !== 0) continue;
      for (const beast of life.beasts) {
        const { x, z } = beast.dweller.body;
        samples += 1;
        if (fields.some(f => x >= f.x && x < f.x + f.w && z >= f.y && z < f.y + f.h)) inside += 1;
      }
    }
    expect(samples).toBeGreaterThan(0);
    expect(inside, `${inside} de ${samples} muestras dentro de un campo`).toBe(0);
  });
});
