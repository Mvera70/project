import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { type InstancedMesh, Matrix4, Vector3 } from 'three';
import { foundTwenty } from '../helpers/founding';
import { TERRAIN_CODE } from '../../src/engine/state';
import { scatterOn } from '../../src/render3d/world/forest';
import { loadRecipe } from '../../tools/art/recipe';
import { parseRecipe } from '../../tools/art/schema';

describe('G-25 · piedras confinadas y formas achatadas', () => {
  it('conserva todo el GLB dentro de su celda aunque cambien giro, escala y desplazamiento', async () => {
    const bytes = readFileSync(resolve('public/assets/valley3d/rock.glb'));
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
    for (const node of forest.group.children) {
      const mesh = node as InstancedMesh;
      const positions = mesh.geometry.getAttribute('position');
      for (let instance = 0; instance < mesh.count; instance++) {
        mesh.getMatrixAt(instance, matrix);
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
    forest.dispose();
  });

  it('admite dimensiones positivas de elipsoide y rechaza escalas degeneradas', async () => {
    const recipe = await loadRecipe(resolve('art/recipes/rock/rock.json'));
    const sphere = recipe.primitives.find(p => p.type === 'sphere');
    expect(sphere?.type === 'sphere' && sphere.dimensions).toEqual([1.55, 1.45, 1.55]);
    expect(() => parseRecipe({ ...recipe, primitives: recipe.primitives.map(p => p === sphere ? { ...p, dimensions: [1, 0, 1] } : p) })).toThrow('must be greater than zero');
  });
});
