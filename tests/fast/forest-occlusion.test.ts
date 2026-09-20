import { describe, expect, it } from 'vitest';
import {
  BoxGeometry, Group, Mesh, MeshStandardMaterial, OrthographicCamera, Vector3,
} from 'three';
import { TERRAIN_CODE } from '@engine/state';
import { WORLD } from '@engine/balance';
import { foundTwenty } from '../helpers/founding';
import { fingerprint } from '../helpers/fingerprint';
import { buildForest, scatterTransform } from '../../src/render3d/world/forest';
import {
  forestOccluders, type ForestOccluder, type ForestRevealTarget,
} from '../../src/render3d/world/forest-occlusion';

function cameraAt(x = 0): OrthographicCamera {
  const camera = new OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
  camera.position.set(x, 5, 10);
  camera.lookAt(x, 0.5, 0);
  camera.updateMatrixWorld(true);
  return camera;
}

describe('oclusión selectiva del bosque', () => {
  it('elige sólo copas interpuestas y responde al ángulo de cámara', () => {
    const camera = cameraAt();
    const target: ForestRevealTarget = { x: 0, y: 0.5, z: 0, radius: 0.5 };
    // La primera está sobre la línea de visión; las otras quedan detrás y a un lado.
    const trees: ForestOccluder[] = [
      { x: 0, y: 1.85, z: 3, radius: 0.5 },
      { x: 0, y: 0, z: -2, radius: 0.5 },
      { x: 4, y: 1.85, z: 3, radius: 0.5 },
    ];
    expect(forestOccluders(trees, camera, [target])).toEqual([0]);
    const side = new OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
    side.position.set(10, 5, 0);
    side.lookAt(0, 0.5, 0);
    side.updateMatrixWorld(true);
    expect(forestOccluders(trees, side, [target])).not.toContain(0);
    expect(forestOccluders(trees, camera, [])).toEqual([]);
  });

  it('acepta varios objetivos sin revelar árboles detrás de ellos', () => {
    const camera = cameraAt();
    const trees: ForestOccluder[] = [
      { x: 0, y: 1.85, z: 3, radius: 0.3 },
      { x: 3, y: 1.85, z: 3, radius: 0.3 },
      { x: 3, y: 0, z: -3, radius: 0.3 },
    ];
    expect(forestOccluders(trees, camera, [
      { x: 0, y: 0.5, z: 0, radius: 0.4 },
      { x: 3, y: 0.5, z: 0, radius: 0.4 },
    ])).toEqual([0, 1]);
  });

  it('reparte instancias de forma reversible sin tocar estado ni material compartido', () => {
    const state = foundTwenty(7);
    state.map.terrain.fill(TERRAIN_CODE.meadow);
    state.map.forestStock.fill(0);
    const cells = [5 * state.map.width + 5, 5 * state.map.width + 12];
    for (const cell of cells) {
      state.map.terrain[cell] = TERRAIN_CODE.forest;
      state.map.forestStock[cell] = WORLD.WOOD_PER_FOREST_TILE;
    }
    const before = fingerprint(state);
    const material = new MeshStandardMaterial({ color: '#385b2c' });
    material.name = 'leaf';
    const geometry = new BoxGeometry(1, 2, 1);
    geometry.translate(0, 1, 0);
    const source = new Group();
    source.add(new Mesh(geometry, material));
    const forest = buildForest(state, source);
    const at = scatterTransform(state.map.width, cells[0]!);
    const camera = new OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
    camera.position.set(at.x, 6, at.z + 10);
    camera.lookAt(new Vector3(at.x, 0.5, at.z - 2));
    camera.updateMatrixWorld(true);
    const target = [{ x: at.x, y: 0.5, z: at.z - 2, radius: 0.7 }];
    const peacefulDrawBatches = forest.group.children.length;

    expect(forest.reveal(camera, target)).toBe(1);
    expect(forest.revealedCount).toBe(1);
    expect(forest.group.children.length).toBe(peacefulDrawBatches + 1);
    const matrixVersions = forest.group.children.map(child => (
      child as unknown as { instanceMatrix: { version: number } }
    ).instanceMatrix.version);
    expect(forest.reveal(camera, target)).toBe(1);
    expect(forest.group.children.map(child => (
      child as unknown as { instanceMatrix: { version: number } }
    ).instanceMatrix.version)).toEqual(matrixVersions);
    expect(forest.reveal(camera, [])).toBe(0);
    expect(forest.revealedCount).toBe(0);
    expect(forest.group.children.length).toBe(peacefulDrawBatches);
    expect(fingerprint(state)).toBe(before);
    expect(material.transparent).toBe(false);
    expect(material.opacity).toBe(1);

    forest.dispose();
    geometry.dispose();
    material.dispose();
  });
});
