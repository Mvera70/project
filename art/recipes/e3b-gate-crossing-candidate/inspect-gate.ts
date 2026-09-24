/** Inspección CPU del GLB público. No usa renderer, app, Blender ni GPU. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { Box3 } from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const root = resolve(import.meta.dirname, '../../..');
const source = resolve(root, 'public/assets/valley3d/gate.glb');
const output = resolve(root, 'artifacts/graphics/E3b2-candidates/round-2/gate-glb-inspection.json');
const bytes = readFileSync(source);
const gltf = await new Promise<{ scene: Object3D }>((done, fail) => {
  new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', done, fail);
});
gltf.scene.updateMatrixWorld(true);
function box(name: string): { min: number[]; max: number[] } {
  const object = gltf.scene.getObjectByName(name);
  if (object === undefined) throw new Error(`Missing gate GLB object: ${name}`);
  const b = new Box3().setFromObject(object);
  return { min: b.min.toArray(), max: b.max.toArray() };
}
const left = box('Gate_Stone_Jamb_L');
const right = box('Gate_Stone_Jamb_R');
const lintel = box('Gate_Stone_Lintel');
const door = box('gate_door');
const report = {
  source: 'public/assets/valley3d/gate.glb',
  sha256: createHash('sha256').update(bytes).digest('hex'),
  localGeometry: { leftJamb: left, rightJamb: right, lintel, mobileDoor: door },
  stoneOpeningX: [left.max[0], right.min[0]],
  stoneOpeningWidth: right.min[0]! - left.max[0]!,
  logicalPublicOpening: 0.84,
  note: 'GLB local coordinates before the buildFromAsset x-axis rotation. The stone opening is inherited from the published gate; no candidate changes it.',
};
mkdirSync(resolve(root, 'artifacts/graphics/E3b2-candidates/round-2'), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ stoneOpeningWidth: report.stoneOpeningWidth, output }));
