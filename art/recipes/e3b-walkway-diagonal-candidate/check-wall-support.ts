// Sonda CPU de apoyo de la junta diagonal sobre buildDefence real; sin GPU.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Box3, DoubleSide, Raycaster, Vector3, type Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildDefence } from '../../../src/render3d/world/defences';
import type { PlannedBuilding } from '../../../src/render3d/world/plan';

const file = await readFile(resolve('public/assets/valley3d/wall.glb'));
const gltf = await new GLTFLoader().parseAsync(
  file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '',
);
gltf.scene.traverse(node => {
  const mesh = node as Mesh;
  if (!mesh.isMesh) return;
  for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.side = DoubleSide;
});

function wall(id: number, x: number, z: number, mask: number) {
  const planned = { id, kind: 'wall', x, z, w: 1, h: 1, ruin: false, connections: mask } as PlannedBuilding;
  const model = buildDefence(planned, gltf.scene);
  model.object.updateMatrixWorld(true);
  return model;
}

const models = [wall(1, 0, 0, 32), wall(2, 1, 1, 128)];
const raycaster = new Raycaster();
const misses: { x: number; z: number; top: number | null }[] = [];
let hits = 0;
let minTop = Infinity;
const byOffset: Record<string, { supported: number; total: number }> = {};
for (let step = 1; step <= 19; step += 1) {
  const c = .5 + step * .05;
  for (const offset of [-.17, -.12, 0, .12, .17]) {
    const bucket = byOffset[String(offset)] ??= { supported: 0, total: 0 };
    bucket.total += 1;
    const x = c + offset * Math.SQRT1_2;
    const z = c - offset * Math.SQRT1_2;
    raycaster.set(new Vector3(x, 1.5, z), new Vector3(0, -1, 0));
    const crossed = raycaster.intersectObjects(models.map(model => model.object), true)
      .filter(hit => hit.point.y < .931);
    const top = crossed.length === 0 ? null : crossed[0]!.point.y;
    if (top === null || top < .755 - 1e-3) misses.push({ x, z, top });
    else { hits += 1; bucket.supported += 1; minTop = Math.min(minTop, top); }
  }
}
console.log(JSON.stringify({ wallBounds: models.map(model => new Box3().setFromObject(model.object)
  .getSize(new Vector3()).toArray()), samples: 95, supported: hits,
  byOffset, minSupportedTop: Number.isFinite(minTop) ? minTop : null, misses }, null, 2));
models.forEach(model => model.dispose());
if (misses.length > 0) process.exitCode = 1;
