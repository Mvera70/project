import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Group, Matrix4, Quaternion, Vector3, type InstancedMesh, type Object3D } from 'three';
import { foundGame } from '@engine/found';
import { pineCells, buildForest } from '../../src/render3d/world/forest';
import { gorgeRoadPaths, mountainSurfaceAt } from '../../src/render3d/world/mountains';

const SEEDS = [7, 11, 23, 41];
const ROOT = resolve(import.meta.dirname, '..', '..');

async function pineModel(): Promise<Object3D> {
  const bytes = readFileSync(resolve(ROOT, 'public/assets/valley3d/tree-pine.glb'));
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return (await new GLTFLoader().parseAsync(data, '')).scene;
}

function indices(mesh: InstancedMesh): number[] {
  const index = mesh.geometry.getIndex();
  return index === null
    ? Array.from({ length: mesh.geometry.getAttribute('position').count }, (_, i) => i)
    : Array.from({ length: index.count }, (_, i) => index.getX(i));
}

function samples(mesh: InstancedMesh, instance: Matrix4): Vector3[] {
  const position = mesh.geometry.getAttribute('position');
  const order = indices(mesh);
  const point = (i: number): Vector3 => new Vector3(
    position.getX(i), position.getY(i), position.getZ(i),
  ).applyMatrix4(instance);
  const out: Vector3[] = [];
  for (let i = 0; i + 2 < order.length; i += 3) {
    const [a, b, c] = [point(order[i]!), point(order[i + 1]!), point(order[i + 2]!)];
    out.push(a, b, c,
      a.clone().add(b).multiplyScalar(0.5),
      b.clone().add(c).multiplyScalar(0.5),
      c.clone().add(a).multiplyScalar(0.5),
      a.clone().add(b).add(c).multiplyScalar(1 / 3));
  }
  return out;
}

function crownRadius(model: Object3D): number {
  let radius = 0;
  model.updateMatrixWorld(true);
  model.traverse(object => {
    const mesh = object as Object3D & { isMesh?: boolean; geometry?: InstancedMesh['geometry']; material?: InstancedMesh['material'] };
    if (mesh.isMesh !== true || mesh.geometry === undefined || mesh.material === undefined) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (!materials.some(material => material.name.includes('leaf'))) return;
    const position = mesh.geometry.getAttribute('position');
    const point = new Vector3();
    for (let i = 0; i < position.count; i += 1) {
      point.set(position.getX(i), position.getY(i), position.getZ(i)).applyMatrix4(mesh.matrixWorld);
      radius = Math.max(radius, Math.hypot(point.x, point.z));
    }
  });
  return radius;
}

function distanceToSegment(x: number, z: number, a: { x: number; z: number }, b: { x: number; z: number }): number {
  const dx = b.x - a.x, dz = b.z - a.z;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSq));
  return Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
}

describe('coníferas de la garganta', () => {
  it('mantiene base y follaje sobre roca y deja libre el corredor de senda', async () => {
    const pine = await pineModel();
    const radius = crownRadius(pine);
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      const candidates = pineCells(state.map);
      const forest = buildForest(state, new Group(), undefined, new Set(), pine);
      const instances: InstancedMesh[] = [];
      forest.group.traverse(object => { if ((object as InstancedMesh).isInstancedMesh) instances.push(object as InstancedMesh); });
      expect(instances.length, `semilla ${seed}: hay piezas instanciadas`).toBeGreaterThan(0);
      expect(instances.every(mesh => mesh.count === instances[0]!.count), 'todas las piezas comparten el mismo conjunto').toBe(true);
      const leaves = instances.filter(mesh => (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
        .some(material => material.name.includes('leaf')));
      expect(leaves.length, 'el modelo publicado aporta piezas de follaje').toBeGreaterThan(0);
      const paths = gorgeRoadPaths(state.map, state.terrainSeed);

      for (let slot = 0; slot < instances[0]!.count; slot += 1) {
        const transform = new Matrix4();
        instances[0]!.getMatrixAt(slot, transform);
        const origin = new Vector3().setFromMatrixPosition(transform);
        expect(origin.y, `semilla ${seed}, pino ${slot}: base apoyada`)
          .toBeCloseTo(mountainSurfaceAt(state.map, origin.x, origin.z), 5);
        const scale = new Vector3();
        transform.decompose(new Vector3(), new Quaternion(), scale);
        const roadRadius = radius * scale.x + 0.36;
        for (const path of paths) {
          for (let i = 0; i + 1 < path.length; i += 1) {
            expect(distanceToSegment(origin.x, origin.z, path[i]!, path[i + 1]!))
              .toBeGreaterThan(roadRadius);
          }
        }
        for (const leaf of leaves) {
          const leafTransform = new Matrix4();
          leaf.getMatrixAt(slot, leafTransform);
          for (const sample of samples(leaf, leafTransform)) {
            expect(sample.y + 1e-4, `semilla ${seed}, pino ${slot}: follaje enterrado`)
              .toBeGreaterThanOrEqual(mountainSurfaceAt(state.map, sample.x, sample.z));
          }
        }
      }
      if (seed === 23) expect(instances[0]!.count).toBeLessThan(candidates.size);
      forest.dispose();
    }
  });
});
