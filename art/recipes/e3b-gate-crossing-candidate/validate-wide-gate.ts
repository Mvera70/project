import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Box3, Group, type Mesh, type Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { validateGlb } from '../../../tools/art/glb';
import { loadRecipe } from '../../../tools/art/recipe';

// Inspección estática del candidato; no publica el recurso ni usa GPU.
const root = resolve(import.meta.dirname, '../../..');
const output = resolve(root, 'artifacts/graphics/E3b2-candidates/gate-wide-review-01');
const source = resolve(root, 'art/recipes/e3b-gate-crossing-candidate/e3b-gate-wide-opening-candidate.json');
const candidateBytes = await readFile(resolve(output, 'e3b-gate-wide-opening-candidate.glb'));
const publishedBytes = await readFile(resolve(root, 'public/assets/valley3d/gate.glb'));
const recipe = await loadRecipe(source);
const inspection = validateGlb(recipe, candidateBytes);

async function scene(bytes: Buffer): Promise<Object3D> {
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
  );
  gltf.scene.updateMatrixWorld(true);
  return gltf.scene;
}
const candidate = await scene(candidateBytes);
const published = await scene(publishedBytes);
function named(model: Object3D, name: string): Object3D {
  const value = model.getObjectByName(name);
  if (value === undefined) throw new Error(`Falta el nodo ${name}`);
  return value;
}
function bounds(object: Object3D): { min: number[]; max: number[] } {
  const box = new Box3().setFromObject(object);
  return { min: box.min.toArray(), max: box.max.toArray() };
}
function digest(object: Object3D): string {
  const hash = createHash('sha256');
  object.traverse(node => {
    hash.update(node.name);
    hash.update(JSON.stringify(node.position.toArray()));
    hash.update(JSON.stringify(node.quaternion.toArray()));
    hash.update(JSON.stringify(node.scale.toArray()));
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    for (const key of Object.keys(mesh.geometry.attributes).sort()) {
      const attribute = mesh.geometry.getAttribute(key);
      hash.update(key);
      hash.update(Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength));
    }
    const indices = mesh.geometry.index;
    if (indices !== null) hash.update(Buffer.from(indices.array.buffer, indices.array.byteOffset, indices.array.byteLength));
  });
  return hash.digest('hex');
}
const oldDoor = named(published, 'gate_door');
const newDoor = named(candidate, 'gate_door');
const oldDigest = digest(oldDoor);
const newDigest = digest(newDoor);
if (oldDigest !== newDigest) throw new Error('La hoja y el gozne del GLB difieren del portón publicado');

const left = bounds(named(candidate, 'Gate_Stone_Jamb_L'));
const right = bounds(named(candidate, 'Gate_Stone_Jamb_R'));
const opening = right.min[0]! - left.max[0]!;
if (Math.abs(opening - .84) > 1e-5) throw new Error(`Hueco de piedra inesperado: ${opening}`);

// Reproduce la jerarquía de bisagra del juego, sin cambiar la puerta original.
const hinge = new Group();
hinge.position.copy(candidate.worldToLocal(newDoor.getWorldPosition(new Vector3())));
candidate.add(hinge);
hinge.attach(newDoor);
const poses = [];
const jambBoxes = [
  new Box3().setFromObject(named(candidate, 'Gate_Stone_Jamb_L')),
  new Box3().setFromObject(named(candidate, 'Gate_Stone_Jamb_R')),
];
const woodNames = [
  ...Array.from({ length: 8 }, (_, index) => `Gate_Plank_${index}`),
  'Gate_Rail_Lower', 'Gate_Rail_Upper', 'Gate_Brace',
];
for (let degrees = 0; degrees <= 90; degrees += 5) {
  const angle = -degrees * Math.PI / 180;
  hinge.rotation.y = angle;
  candidate.updateMatrixWorld(true);
  const woodJambOverlaps = woodNames.filter(name => {
    const woodBox = new Box3().setFromObject(named(newDoor, name));
    return jambBoxes.some(jamb => jamb.intersectsBox(woodBox));
  });
  poses.push({ angleRadians: angle, mobileDoorBounds: bounds(newDoor), woodJambOverlaps });
}
if (poses.some(pose => pose.woodJambOverlaps.length > 0)) {
  throw new Error('La hoja de madera cruza las jambas en alguna posición del barrido');
}

const report = {
  status: 'static-pass',
  source: 'art/recipes/e3b-gate-crossing-candidate/e3b-gate-wide-opening-candidate.json',
  candidateGlb: 'artifacts/graphics/E3b2-candidates/gate-wide-review-01/e3b-gate-wide-opening-candidate.glb',
  candidateSha256: createHash('sha256').update(candidateBytes).digest('hex'),
  publishedSha256: createHash('sha256').update(publishedBytes).digest('hex'),
  bytes: candidateBytes.length,
  inspection,
  stoneOpeningWidth: opening,
  doorGeometryAndPivotUnchanged: true,
  doorDigest: newDigest,
  hingePoses: poses,
  note: 'Carga real de GLTFLoader y giro CPU. Solapamientos por cajas conservadoras; requieren revisión de malla. No certifica visión en la app, colisión ni continuidad del adarve.',
};
await writeFile(resolve(output, 'three-validation.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, stoneOpeningWidth: opening,
  doorGeometryAndPivotUnchanged: true, sweepSamples: poses.length,
  woodJambOverlaps: poses.flatMap(pose => pose.woodJambOverlaps) }));
