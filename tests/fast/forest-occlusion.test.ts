import { describe, expect, it } from 'vitest';
import {
  BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, OrthographicCamera, Vector3,
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

  it('GV-2 · contra la copa sola, el vecino del tronco no atenúa el árbol; quien pasa detrás de la copa, sí', () => {
    const camera = cameraAt();
    // El roble medido: esfera entera de 1,76 alrededor de su media altura, copa de 0,85 arriba.
    const oak: ForestOccluder = { x: 0, y: 1.33, z: 3, radius: 1.76, canopy: { y: 1.9, radius: 0.85 } };
    const besideTrunk = { x: 0.9, y: 0.33, z: 3, radius: 0.33 };
    const behindCrown = { x: 0, y: 0.33, z: 1, radius: 0.33 };
    // Un encuentro sigue midiéndose contra el árbol entero, como antes de GV-2.
    expect(forestOccluders([oak], camera, [{ ...besideTrunk, radius: 0.65 }])).toEqual([0]);
    expect(forestOccluders([oak], camera, [{ ...besideTrunk, canopyOnly: true }])).toEqual([]);
    expect(forestOccluders([oak], camera, [{ ...behindCrown, canopyOnly: true }])).toEqual([0]);
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

describe('GV-2 · quien se sigue, sin romper el encuentro ni el hachazo', () => {
  /** Un robledal de tres árboles en fila, delante de la cámara. */
  function grove() {
    const state = foundTwenty(7);
    state.map.terrain.fill(TERRAIN_CODE.meadow);
    state.map.forestStock.fill(0);
    const cells = [8, 12, 16].map((x) => 5 * state.map.width + x);
    for (const cell of cells) {
      state.map.terrain[cell] = TERRAIN_CODE.forest;
      state.map.forestStock[cell] = WORLD.WOOD_PER_FOREST_TILE;
    }
    const material = new MeshStandardMaterial({ color: '#385b2c' });
    material.name = 'leaf';
    const geometry = new BoxGeometry(1, 2, 1);
    geometry.translate(0, 1, 0);
    const source = new Group();
    source.add(new Mesh(geometry, material));
    const forest = buildForest(state, source);
    const spots = cells.map((cell) => scatterTransform(state.map.width, cell));
    const middle = spots[1]!;
    const camera = new OrthographicCamera(-12, 12, 12, -12, 0.1, 100);
    camera.position.set(middle.x, 6, middle.z + 10);
    camera.lookAt(new Vector3(middle.x, 0.5, middle.z - 2));
    camera.updateMatrixWorld(true);
    /** Alguien justo detrás de un árbol, visto desde esta cámara. */
    const behind = (tree: number): ForestRevealTarget => ({ x: spots[tree]!.x, y: 0.5, z: spots[tree]!.z - 2, radius: 0.5 });
    const dispose = (): void => { forest.dispose(); geometry.dispose(); material.dispose(); };
    return { forest, cells, camera, behind, dispose };
  }

  it('seguir a alguien suma sus copas a las del encuentro, y al dejar de seguir vuelven sólo las suyas', () => {
    const { forest, camera, behind, dispose } = grove();
    const assault = behind(0);
    const followed = behind(2);
    expect(forest.reveal(camera, [assault])).toBe(1);
    expect(forest.reveal(camera, [assault, followed])).toBe(2);
    // Deja de seguir: el asalto conserva su copa atenuada.
    expect(forest.reveal(camera, [assault])).toBe(1);
    expect(forest.reveal(camera, [])).toBe(0);
    dispose();
  });

  it('la copa se funde en vez de saltar: baja por pasos, se queda tenue y vuelve entera antes de salir de la malla atenuada', () => {
    const { forest, camera, behind, dispose } = grove();
    const peaceful = forest.group.children.length;
    const fadeOf = (): number => {
      const faded = forest.group.children.find((child) => child.name.endsWith('_revealed')) as InstancedMesh | undefined;
      return faded === undefined ? 1 : (faded.geometry.getAttribute('instanceFade').array as Float32Array)[0]!;
    };
    expect(forest.reveal(camera, [behind(1)])).toBe(1);
    expect(fadeOf()).toBe(1);
    forest.stepReveal(0.1);
    const halfway = fadeOf();
    expect(halfway).toBeLessThan(1);
    expect(halfway).toBeGreaterThan(0.06);
    forest.stepReveal(1);
    expect(fadeOf()).toBeCloseTo(0.06);
    // Deja de tapar: sigue en la malla atenuada mientras vuelve, y sale al llegar.
    expect(forest.reveal(camera, [])).toBe(0);
    expect(forest.group.children.length).toBe(peaceful + 1);
    forest.stepReveal(0.1);
    expect(fadeOf()).toBeGreaterThan(0.06);
    forest.stepReveal(1);
    expect(forest.group.children.length).toBe(peaceful);
    dispose();
  });

  it('el árbol que recibe el hachazo se mueve también con copas atenuadas, esté o no atenuado él', () => {
    const { forest, cells, camera, behind, dispose } = grove();
    const meshes = (): InstancedMesh[] => forest.group.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh);
    const snapshot = (): number[][] => meshes().flatMap((mesh) => Array.from({ length: mesh.count }, (_, i) => {
      const m = new Matrix4(); mesh.getMatrixAt(i, m); return Array.from(m.elements);
    }));
    // El seguido está detrás del árbol del medio: ése se atenúa.
    expect(forest.reveal(camera, [behind(1)])).toBe(1);
    const rest = snapshot();
    const moved = (): number => snapshot().filter((m, i) => m.some((v, k) => Math.abs(v - rest[i]![k]!) > 1e-6)).length;
    // El golpe al atenuado mueve una instancia (la suya, en la malla atenuada)…
    expect(forest.sway(cells[1]!, 1, 0, 0.05)).toBe(true);
    expect(moved()).toBe(1);
    forest.sway(cells[1]!, 1, 0, 0);
    expect(moved()).toBe(0);
    // …y el golpe a uno opaco mueve el suyo, no el que ocupa su antigua ranura.
    expect(forest.sway(cells[2]!, 1, 0, 0.05)).toBe(true);
    expect(moved()).toBe(1);
    forest.sway(cells[2]!, 1, 0, 0);
    expect(moved()).toBe(0);
    dispose();
  });
});
