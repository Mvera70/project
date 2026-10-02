// Lo lento de este fichero vive en `tests/journeys/grass-long.test.ts` (v5.56).
//
// La hierba del valle (28 sep 2026): propiedades de dónde crece y cuánto
// cuesta, en varias semillas. No congela cifras de colocación: comprueba lo que
// Vera pidió (manchas de prado densas, matas sueltas fuera; que siga la
// estación y la nieve la cubra) y lo que manda el presupuesto (por tramos con
// recorte de cámara, menos matas de lejos, sin sombras).

import { describe, expect, it } from 'vitest';
import { Matrix4, Vector3, type InstancedMesh } from 'three';
import { plazaOf } from '@derive/plaza';
import { PALETTES, SNOW_DEEP } from '@derive/palette';
import { foundTwenty } from '../helpers/founding';
import { createGrass, densityAt, meadowWeight } from '../../src/render3d/world/grass';

const SEEDS = [3, 7, 11];

const tuftMeshes = (grass: ReturnType<typeof createGrass>): InstancedMesh[] =>
  grass.group.children.filter((c) => c.name.startsWith('Valley_Grass_Tufts')) as InstancedMesh[];

function positions(mesh: InstancedMesh): Vector3[] {
  const m = new Matrix4();
  return Array.from({ length: mesh.count }, (_, i) => { mesh.getMatrixAt(i, m); return new Vector3().setFromMatrixPosition(m); });
}

describe('la hierba del valle', () => {
  it('se notan zonas de prado: dentro de la mancha hay muchas más matas por celda que fuera', () => {
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      const grass = createGrass(false);
      grass.plant(state, () => 0, plazaOf(state));
      const perCell = new Map<number, number>();
      for (const mesh of tuftMeshes(grass)) for (const at of positions(mesh)) {
        const cell = Math.floor(at.z) * state.map.width + Math.floor(at.x);
        perCell.set(cell, (perCell.get(cell) ?? 0) + 1);
      }
      let lush = 0, lushCells = 0, bare = 0, bareCells = 0;
      for (const [cell, count] of perCell) {
        const w = meadowWeight(state.terrainSeed, cell % state.map.width, Math.floor(cell / state.map.width));
        if (w > 0.9) { lush += count; lushCells += 1; } else if (w < 0.1) { bare += count; bareCells += 1; }
      }
      expect(lushCells, `semilla ${seed}: hay prado`).toBeGreaterThan(50);
      expect(lush / lushCells).toBeGreaterThan(8 * (bare / Math.max(1, bareCells)));
      // Y fuera de la mancha no hay matas altas sueltas: ahí crece el césped bajo.
      expect(bareCells).toBe(0);
      expect(grass.counts.lawn, `semilla ${seed}: hay césped`).toBeGreaterThan(1000);
    }
  });

  it('va por tramos que la cámara puede recortar, sin sombras, y cada tramo es una malla', () => {
    const state = foundTwenty(7);
    const grass = createGrass(true);
    grass.plant(state, () => 0, plazaOf(state));
    const meshes = tuftMeshes(grass);
    expect(meshes.length).toBeGreaterThan(3);
    expect(meshes.length).toBeLessThanOrEqual(15);
    for (const mesh of grass.group.children as InstancedMesh[]) {
      expect(mesh.castShadow).toBe(false);
      expect(mesh.receiveShadow).toBe(false);
      expect(mesh.frustumCulled).toBe(true);
      expect(mesh.boundingSphere).not.toBeNull();
      // La esfera abarca todas las matas del tramo, no sólo las que se dibujan.
      for (const at of positions(mesh)) {
        expect(mesh.boundingSphere!.distanceToPoint(at)).toBeLessThanOrEqual(0.5);
      }
    }
  });

  it('de lejos dibuja menos matas que de cerca, y las que dibuja son una muestra repartida', () => {
    const state = foundTwenty(11);
    const grass = createGrass(false);
    grass.plant(state, () => 0, plazaOf(state));
    grass.zoom(13);
    const near = grass.counts.drawn;
    expect(near).toBe(grass.counts.grass + grass.counts.lawn + grass.counts.stubble);
    grass.zoom(80);
    const far = grass.counts.drawn;
    // De lejos, alrededor de un cuarto de las matas altas y menos del césped;
    // con la banda de crecimiento, que dibuja pequeñas las del umbral.
    expect(far).toBeLessThan(near * 0.3);
    expect(far).toBeGreaterThan(near * 0.12);
    expect(densityAt(36)).toBeGreaterThan(densityAt(60));
    // Repartida: el tramo con más matas de lejos sigue siendo el que más tenía de cerca.
    const meshes = tuftMeshes(grass);
    const fullest = meshes.reduce((best, m) => m.instanceMatrix.count > best.instanceMatrix.count ? m : best, meshes[0]!);
    expect(Math.max(...meshes.map((m) => m.count))).toBe(fullest.count);
  });

  it('sigue la estación en el color y la nieve la cubre', () => {
    const state = foundTwenty(7);
    const grass = createGrass(true);
    grass.plant(state, () => 0, plazaOf(state));
    const mesh = tuftMeshes(grass)[0]!;
    const sample = (): [number, number, number] => [mesh.instanceColor!.getX(0), mesh.instanceColor!.getY(0), mesh.instanceColor!.getZ(0)];
    grass.season(PALETTES.spring, 0);
    const spring = sample();
    grass.season(PALETTES.autumn, 0);
    const autumn = sample();
    // El otoño es paja: más rojo y menos verde que la primavera.
    expect(autumn[0]).toBeGreaterThan(spring[0]);
    expect(autumn[1] / autumn[0]).toBeLessThan(spring[1] / spring[0]);
    expect(grass.group.visible).toBe(true);
    // Con la nieve asentada del invierno, enterrada: ni se dibuja.
    grass.season(PALETTES.winter, SNOW_DEEP);
    expect(grass.group.visible).toBe(false);
    grass.season(PALETTES.spring, 0);
    expect(grass.group.visible).toBe(true);
  });
});
