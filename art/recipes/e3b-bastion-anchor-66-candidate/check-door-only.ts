/** Compara la hoja aislada con el GLB ancho original sin abrir la escena GPU. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Box3, Mesh, Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildFromAsset, gateLeafOnly } from '../../../src/render3d/world/buildings';
import type { PlannedBuilding } from '../../../src/render3d/world/plan';

const path = new URL('../../../artifacts/graphics/E3b2-candidates/gate-wide-review-01/e3b-gate-wide-opening-candidate.glb', import.meta.url);
const bytes = await readFile(path);
const source = (await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
)).scene;
const countMeshes = (root: Object3D): number => {
  let count = 0;
  root.traverse(node => { if (node instanceof Mesh) count++; });
  return count;
};
const leaf = gateLeafOnly(source);
const originalMeshes = countMeshes(source);
const leafMeshes = countMeshes(leaf);
assert.ok(leafMeshes > 0 && leafMeshes < originalMeshes);
assert.ok(leaf.getObjectByName('Gate_Stone_Jamb_L') === undefined);
assert.ok(source.getObjectByName('Gate_Stone_Jamb_L') !== undefined);

const planned = { id: 71, kind: 'gate', asset: 'gate', x: 33, z: 40, w: 1, h: 1,
  ruin: false, gate: 'z' } as PlannedBuilding;
const full = buildFromAsset(planned, source.clone(true));
const trimmed = buildFromAsset(planned, leaf);
const fullHinge = full.object.getObjectByName('DoorHinge');
const trimmedHinge = trimmed.object.getObjectByName('DoorHinge');
assert.ok(fullHinge !== undefined && trimmedHinge !== undefined);
const hingeDifference = fullHinge.getWorldPosition(new Vector3()).distanceTo(
  trimmedHinge.getWorldPosition(new Vector3()));
assert.ok(hingeDifference < 1e-6);
const positions: { angle: number; boundDifference: number }[] = [];
for (const angle of [0, 45, 90]) {
  fullHinge.rotation.y = -angle * Math.PI / 180;
  trimmedHinge.rotation.y = -angle * Math.PI / 180;
  full.object.updateMatrixWorld(true);
  trimmed.object.updateMatrixWorld(true);
  const a = new Box3().setFromObject(fullHinge);
  const b = new Box3().setFromObject(trimmedHinge);
  const boundDifference = Math.max(
    a.min.distanceTo(b.min), a.max.distanceTo(b.max),
  );
  assert.ok(boundDifference < 1e-6, `Door moved after trimming at ${angle}°`);
  positions.push({ angle, boundDifference });
}
console.log(JSON.stringify({ originalMeshes, leafMeshes,
  hingeDifference, positions }));
