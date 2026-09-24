/** Sonda CPU del alma nueva contra el buildDefence real. */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { Box3, DoubleSide, Raycaster, Vector3, type Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildDefence } from '../../../src/render3d/world/defences';
import type { PlannedBuilding } from '../../../src/render3d/world/plan';

const root = resolve(import.meta.dirname, '../../..');
const variantNames = ['e3b-walkway-diagonal-supported-se-candidate',
  'e3b-walkway-diagonal-supported-nw-candidate'] as const;
const variants = await Promise.all(variantNames.map(async name => {
  const bytes = await readFile(resolve(import.meta.dirname, `${name}.json`));
  const raw = JSON.parse(bytes.toString('utf8')) as {
    primitives: { name: string; location: number[]; dimensions: number[] }[];
  };
  const web = raw.primitives.find(p => p.name === 'WallWeb');
  const deck = raw.primitives.find(p => p.name === 'Deck');
  assert(web !== undefined && deck !== undefined);
  assert(Math.abs(web.dimensions[1]! - .20) < 1e-9);
  assert(Math.abs(web.location[2]! - web.dimensions[2]! / 2 - .755) < 1e-9);
  assert(Math.abs(deck.location[2]! + deck.dimensions[2]! / 2 - 1.02) < 1e-9);
  if (name.endsWith('-se-candidate')) {
    const key = raw.primitives.find(p => p.name === 'VertexKeystone');
    assert(key !== undefined);
    assert(Math.abs(key.dimensions[1]! - .20) < 1e-9);
    assert(Math.abs(key.location[0]! - 1) < 1e-9 && Math.abs(key.location[1]! + 1) < 1e-9);
    assert(Math.abs(key.location[2]! - key.dimensions[2]! / 2 - .755) < 1e-9);
  }
  return { name, sha256: createHash('sha256').update(bytes).digest('hex') };
}));
const file = await readFile(resolve(root, 'public/assets/valley3d/wall.glb'));
const gltf = await new GLTFLoader().parseAsync(
  file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '',
);
gltf.scene.traverse(node => {
  const mesh = node as Mesh;
  if (!mesh.isMesh) return;
  for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.side = DoubleSide;
});
function wall(id: number, x: number, z: number, mask: number) {
  const plan = { id, kind: 'wall', x, z, w: 1, h: 1, ruin: false, connections: mask } as PlannedBuilding;
  const model = buildDefence(plan, gltf.scene);
  model.object.updateMatrixWorld(true);
  return model;
}
const models = [wall(1, 0, 0, 32), wall(2, 1, 1, 128)];
const objects = models.map(model => model.object);
const raycaster = new Raycaster();
const misses: { along: number; offset: number; x: number; z: number; top: number | null }[] = [];
let samples = 0;
let minTop = Infinity;
let maxTop = -Infinity;
function probe(along: number, offset: number): number | null {
  const x = along + offset * Math.SQRT1_2;
  const z = along - offset * Math.SQRT1_2;
  raycaster.set(new Vector3(x, 1.5, z), new Vector3(0, -1, 0));
  const hit = raycaster.intersectObjects(objects, true).find(point => point.point.y < .931);
  return hit?.point.y ?? null;
}
// El alma mide 0,20. Se muestrea toda su anchura cada 0,01 y su longitud
// cada 0,01, incluidos los bordes y el vértice de la junta.
for (let ci = 50; ci <= 150; ci += 1) {
  const along = ci / 100;
  for (let oi = -10; oi <= 10; oi += 1) {
    const offset = oi / 100;
    const x = along + offset * Math.SQRT1_2;
    const z = along - offset * Math.SQRT1_2;
    const top = probe(along, offset);
    samples += 1;
    if (top === null || top < .755 - .001) {
      misses.push({ along, offset, x, z, top });
    } else {
      minTop = Math.min(minTop, top);
      maxTop = Math.max(maxTop, top);
    }
  }
}
const seamMisses: { along: number; offset: number }[] = [];
let seamSamples = 0;
for (let ci = 950; ci <= 1050; ci += 1) {
  const along = ci / 1000;
  for (let oi = -10; oi <= 10; oi += 1) {
    const offset = oi / 100;
    const top = probe(along, offset);
    seamSamples += 1;
    if (top === null || top < .755 - .001) seamMisses.push({ along, offset });
  }
}
const seamSpan = seamMisses.length === 0 ? null : [
  Math.min(...seamMisses.map(p => p.along)),
  Math.max(...seamMisses.map(p => p.along)),
];
const keystoneSpan = [.95, 1.05];
const anchored = misses.every(p => p.along >= keystoneSpan[0]! && p.along <= keystoneSpan[1]!)
  && seamMisses.every(p => p.along > keystoneSpan[0]! && p.along < keystoneSpan[1]!);
const report = {
  source: 'public/assets/valley3d/wall.glb',
  wallSha256: createHash('sha256').update(file).digest('hex'),
  variants,
  wallMasks: [32, 128],
  wallBounds: models.map(model => new Box3().setFromObject(model.object).getSize(new Vector3()).toArray()),
  candidateWebWidth: .20,
  candidateWebBottomY: .755,
  grid: { along: [.5, 1.5], offset: [-.1, .1], step: .01 },
  samples, supported: samples - misses.length,
  seamGrid: { along: [.95, 1.05], offset: [-.1, .1], stepAlong: .001, stepOffset: .01,
              samples: seamSamples, misses: seamMisses.length, unsupportedSpan: seamSpan },
  keystone: { along: keystoneSpan, width: .20, anchoredAtBothEndsOnSampledGrid: anchored,
              unsupportedSpanLengthUpperBoundAtGridResolution:
                seamSpan === null ? 0 : seamSpan[1]! - seamSpan[0]! + .002 },
  minSupportedTop: Number.isFinite(minTop) ? minTop : null,
  maxSupportedTop: Number.isFinite(maxTop) ? maxTop : null,
  misses,
  limitation: 'The web is supported at grid points except around the vertex. A keystone spans that measured gap and rests on wall at both ends; this does not certify physical load capacity or exact continuous contact.',
};
const output = resolve(root, 'artifacts/graphics/E3b2-candidates/round-3/support-grid.json');
await mkdir(resolve(root, 'artifacts/graphics/E3b2-candidates/round-3'), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ samples, supported: report.supported, misses: misses.length,
  seamSamples, seamMisses: seamMisses.length, seamSpan, anchored,
  minSupportedTop: report.minSupportedTop, output }));
models.forEach(model => model.dispose());
if (!anchored) process.exitCode = 1;
