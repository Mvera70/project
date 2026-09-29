// AN-5d · La visita del oso, con el valle entero: la jornada con su gente y
// los troncos puestos, como en el juego. Vive en las jornadas porque monta la
// aldea y la avanza medio minuto largo (varios segundos de prueba); la suite
// rápida guarda las reglas de `stepBear` con un prado de 24 × 24.

import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { terrainOf } from '../../src/render3d/life/terrain';
import { indexSolids, type Solid, type Terrain } from '../../src/render3d/life/body';
import { scatterTransform } from '../../src/render3d/world/forest';
import { TERRAIN_CODE } from '@engine/state';
import { elevationAt } from '../../src/render3d/world/ground';

describe('AN-5d · la visita del oso, más larga', () => {
  it('con el valle entero, la visita dura mucho más que un aviso (AN-5d)', () => {
    // La jornada con su gente y los troncos puestos, como en el juego: antes, el
    // leñador del claro lo espantaba en el primer momento y la visita duraba el
    // aviso (3 s) y la vuelta a la cueva.
    const state = foundTwenty(7);
    state.flags['bear'] = state.tick + 2;
    state.flags['hunt:boar'] = 0;
    const bare = terrainOf(state);
    const trunks: Solid[] = [];
    for (let cell = 0; cell < state.map.terrain.length; cell += 1) {
      if (state.map.terrain[cell] !== TERRAIN_CODE.forest) continue;
      const { x, z } = scatterTransform(bare.width, cell);
      trunks.push({ minX: x - 0.15, minZ: z - 0.15, maxX: x + 0.15, maxZ: z + 0.15 });
    }
    const land: Terrain = { ...bare, solids: indexSolids(bare.width, bare.height, trunks) };
    const village = createVillage(state, 0, { land, ground: (x, z) => elevationAt(state.map, x, z) });
    let out = 0;
    for (let step = 0; step < 1500; step++) {
      village.step();
      if (village.wildlife.some(animal => animal.kind === 'bear')) out += 1;
    }
    expect(out * (1 / 30), 'segundos fuera de la cueva').toBeGreaterThan(20);
    village.dispose();
  });

});
