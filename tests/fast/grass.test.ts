// La hierba del valle (28 sep 2026): propiedades de dónde crece y cuánto
// cuesta, en varias semillas. No congela cifras de colocación: comprueba lo que
// Vera pidió (manchas de prado densas, matas sueltas fuera) y lo que manda el
// presupuesto (dos llamadas de dibujo, sin sombras).

import { describe, expect, it } from 'vitest';
import { Matrix4, Vector3, type InstancedMesh } from 'three';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { TERRAIN_CODE } from '@engine/state';
import { plazaOf } from '@derive/plaza';
import { PALETTES } from '@derive/palette';
import { foundTwenty } from '../helpers/founding';
import { createGrass, meadowWeight } from '../../src/render3d/world/grass';

const SEEDS = [3, 7, 11];

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
      const mesh = grass.group.children.find((c) => c.name === 'Valley_Grass_Tufts') as InstancedMesh;
      expect(mesh.count, `semilla ${seed}`).toBeGreaterThan(1000);
      const { width } = state.map;
      const standing = state.buildings.filter((b) => b.lostTick === null);
      for (const at of positions(mesh)) {
        const x = Math.floor(at.x), z = Math.floor(at.z), cell = z * width + x;
        expect(state.map.terrain[cell]).not.toBe(TERRAIN_CODE.water);
        expect(state.map.path[cell] ?? 0).toBeLessThan(2);
        expect(Math.hypot(x + 0.5 - plaza.x, z + 0.5 - plaza.y)).toBeGreaterThanOrEqual(plaza.radius + 0.5);
        const under = standing.find((b) => x >= b.x && x < b.x + b.w && z >= b.y && z < b.y + b.h);
        expect(under, `semilla ${seed}: mata dentro de ${under?.kind}`).toBeUndefined();
      }
    }
  });

  it('se notan zonas de prado: dentro de la mancha hay muchas más matas por celda que fuera', () => {
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      const grass = createGrass(false);
      grass.plant(state, () => 0, plazaOf(state));
      const mesh = grass.group.children.find((c) => c.name === 'Valley_Grass_Tufts') as InstancedMesh;
      const perCell = new Map<number, number>();
      for (const at of positions(mesh)) {
        const cell = Math.floor(at.z) * state.map.width + Math.floor(at.x);
        perCell.set(cell, (perCell.get(cell) ?? 0) + 1);
      }
      let lush = 0, lushCells = 0, bare = 0, bareCells = 0;
      for (const [cell, count] of perCell) {
        const w = meadowWeight(state.terrainSeed, cell % state.map.width, Math.floor(cell / state.map.width));
        if (w > 0.9) { lush += count; lushCells += 1; } else if (w < 0.1) { bare += count; bareCells += 1; }
      }
      expect(lushCells, `semilla ${seed}: hay prado`).toBeGreaterThan(50);
      expect(lush / lushCells).toBeGreaterThan(4 * (bare / Math.max(1, bareCells)));
    }
  });

  it('cuesta dos llamadas como mucho, sin sombras, y la nieve la esconde', () => {
    const state = foundTwenty(7);
    const grass = createGrass(true);
    grass.plant(state, () => 0, plazaOf(state));
    expect(grass.group.children.length).toBeLessThanOrEqual(2);
    for (const mesh of grass.group.children) {
      expect(mesh.castShadow).toBe(false);
      expect(mesh.receiveShadow).toBe(false);
    }
    grass.season(PALETTES.winter, 1);
    expect(grass.group.visible).toBe(false);
    grass.season(PALETTES.spring, 0);
    expect(grass.group.visible).toBe(true);
  });
});
