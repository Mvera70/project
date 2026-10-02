// Lo lento de `tests/fast/grass.test.ts`, mudado aquí el 1 oct 2026 (v5.56): estas pruebas
// sumaban 12 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// La hierba del valle (28 sep 2026): propiedades de dónde crece y cuánto
// cuesta, en varias semillas. No congela cifras de colocación: comprueba lo que
// Vera pidió (manchas de prado densas, matas sueltas fuera; que siga la
// estación y la nieve la cubra) y lo que manda el presupuesto (por tramos con
// recorte de cámara, menos matas de lejos, sin sombras).

import { describe, expect, it } from 'vitest';
import { Matrix4, Vector3, type InstancedMesh } from 'three';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { TERRAIN_CODE } from '@engine/state';
import { plazaOf } from '@derive/plaza';
import { foundTwenty } from '../helpers/founding';
import { createGrass } from '../../src/render3d/world/grass';

const SEEDS = [3, 7, 11];

const tuftMeshes = (grass: ReturnType<typeof createGrass>): InstancedMesh[] =>
  grass.group.children.filter((c) => c.name.startsWith('Valley_Grass_Tufts')) as InstancedMesh[];

function positions(mesh: InstancedMesh): Vector3[] {
  const m = new Matrix4();
  return Array.from({ length: mesh.count }, (_, i) => { mesh.getMatrixAt(i, m); return new Vector3().setFromMatrixPosition(m); });
}

describe('la hierba del valle', () => {
  it('crece en el prado y nunca en el camino, el agua, la plaza, una casa o una obra', () => {
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      run(state, TIME.WEEKS_PER_YEAR * 6, 'prudent', CATALOG);
      const grass = createGrass(false);
      const plaza = plazaOf(state);
      grass.plant(state, () => 0, plaza);
      expect(grass.counts.grass, `semilla ${seed}`).toBeGreaterThan(1000);
      const { width } = state.map;
      const standing = state.buildings.filter((b) => b.lostTick === null);
      for (const mesh of tuftMeshes(grass)) for (const at of positions(mesh)) {
        const x = Math.floor(at.x), z = Math.floor(at.z), cell = z * width + x;
        expect(state.map.terrain[cell]).not.toBe(TERRAIN_CODE.water);
        expect(state.map.path[cell] ?? 0).toBeLessThan(2);
        expect(Math.hypot(x + 0.5 - plaza.x, z + 0.5 - plaza.y)).toBeGreaterThanOrEqual(plaza.radius + 0.5);
        const under = standing.find((b) => x >= b.x && x < b.x + b.w && z >= b.y && z < b.y + b.h);
        expect(under, `semilla ${seed}: mata dentro de ${under?.kind}`).toBeUndefined();
      }
    }
  });
});
