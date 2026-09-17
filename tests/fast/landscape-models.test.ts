import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { type InstancedMesh, Matrix4, Vector3 } from 'three';
import { foundTwenty } from '../helpers/founding';
import { TERRAIN_CODE } from '../../src/engine/state';
import { scatterOn, scrubCells } from '../../src/render3d/world/forest';
import { loadRecipe } from '../../tools/art/recipe';
import { parseRecipe } from '../../tools/art/schema';

describe('G-25 · piedras confinadas y formas achatadas', () => {
  it.each(['rock', 'reed', 'scrub'])('conserva todo %s dentro de su celda aunque cambien giro, escala y desplazamiento', async (asset) => {
    const bytes = readFileSync(resolve(`public/assets/valley3d/${asset}.glb`));
    const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const state = foundTwenty(7);
    const map = structuredClone(state.map);
    map.terrain.fill(TERRAIN_CODE.rock);
    map.path.fill(0);
    map.path[3] = 1;
    const taken = new Set([4]);
    const cells = Array.from(map.terrain, (_, i) => i).filter(i => i !== 3 && i !== 4);
    const forest = scatterOn(map, scene, TERRAIN_CODE.rock, undefined, taken);
    expect(forest.count).toBe(cells.length);
    const matrix = new Matrix4(), point = new Vector3();
    let maxOutside = 0;
    const heights: number[] = [];
    for (const node of forest.group.children) {
      const mesh = node as InstancedMesh;
      const positions = mesh.geometry.getAttribute('position');
      for (let instance = 0; instance < mesh.count; instance++) {
        mesh.getMatrixAt(instance, matrix);
        if (node === forest.group.children[0]) heights.push(new Vector3().setFromMatrixScale(matrix).y);
        const cell = cells[instance]!;
        const left = cell % map.width, top = Math.floor(cell / map.width);
        for (let vertex = 0; vertex < positions.count; vertex++) {
          point.fromBufferAttribute(positions, vertex).applyMatrix4(matrix);
          maxOutside = Math.max(maxOutside, left - point.x, point.x - left - 1, top - point.z, point.z - top - 1);
        }
      }
    }
    // Matrices de instancia Float32: tolerancia numérica, no margen de invasión.
    expect(maxOutside).toBeLessThan(0.00002);
    if (asset === 'rock') {
      // Diferencia perceptible entre guijarros y bloques, no ruido de escala.
      expect(Math.max(...heights) / Math.min(...heights)).toBeGreaterThan(4);
      expect(heights.filter(h => h > 1.4).length).toBeGreaterThan(cells.length * 0.1);
    }
    forest.dispose();
  });

  it('coloca monte bajo estable solo en bordes y deja espacio junto a construcciones, agua y caminos', () => {
    const map = structuredClone(foundTwenty(7).map);
    map.path.fill(0);
    map.terrain.fill(TERRAIN_CODE.meadow);
    for (let z = 0; z < map.height; z++) {
      for (let x = 0; x < map.width; x++) {
        if (x % 8 === 0) map.terrain[z * map.width + x] = TERRAIN_CODE.forest;
      }
    }
    const taken = new Set<number>();
    for (let x = 0; x < map.width; x++) {
      map.path[5 * map.width + x] = 1;
      taken.add(12 * map.width + x);
      map.terrain[20 * map.width + x] = TERRAIN_CODE.water;
    }
    const before = structuredClone(map);
    const cells = scrubCells(map, taken);
    expect(cells.length).toBeGreaterThan(0);
    expect(scrubCells(map, taken)).toEqual(cells);
    expect(map).toEqual(before);
    const selected = new Set(cells);
    for (const cell of cells) {
      expect(map.terrain[cell]).toBe(TERRAIN_CODE.meadow);
      expect([cell - 1, cell + 1, cell - map.width, cell + map.width]
        .some(n => map.terrain[n] === TERRAIN_CODE.forest || map.terrain[n] === TERRAIN_CODE.rock)).toBe(true);
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const n = cell + dz * map.width + dx;
        expect(taken.has(n) || map.path[n]! > 0 || map.terrain[n] === TERRAIN_CODE.water).toBe(false);
        if (n !== cell) expect(selected.has(n)).toBe(false);
      }
    }
    map.terrain.fill(TERRAIN_CODE.meadow);
    expect(scrubCells(map, new Set())).toEqual([]);
  });

  it('admite dimensiones positivas de elipsoide y rechaza escalas degeneradas', async () => {
    const recipe = await loadRecipe(resolve('art/recipes/rock/rock.json'));
    const sphere = recipe.primitives.find(p => p.type === 'sphere');
    expect(sphere?.type === 'sphere' && sphere.dimensions).toEqual([1.55, 1.45, 1.55]);
    expect(() => parseRecipe({ ...recipe, primitives: recipe.primitives.map(p => p === sphere ? { ...p, dimensions: [1, 0, 1] } : p) })).toThrow('must be greater than zero');
  });
});
