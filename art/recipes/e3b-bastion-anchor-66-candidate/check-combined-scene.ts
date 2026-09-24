/** Montaje CPU en las coordenadas reales de seed91; no instala ni abre GPU. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh,
  MeshStandardMaterial, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { foundGame } from '../../../src/engine/found';
import { run } from '../../../src/engine/sim';
import { CATALOG } from '../../../src/engine/crossroads/catalog';
import { buildFromAsset, gateLeafOnly } from '../../../src/render3d/world/buildings';
import { planFor } from '../../../src/render3d/world/plan';
import { directory } from './generate';
import type { P } from './combined-source';

const state = foundGame(91);
run(state, 3846, 'prudent', CATALOG);
const plan = planFor(state);
const bastion = plan.buildings.find(building => building.id === 295);
const gate = plan.buildings.find(building => building.id === 71);
assert.ok(bastion?.kind === 'bastion' && gate?.kind === 'gate');
assert.deepEqual(bastion.bastionAccess, { x: 0, z: 1 });
assert.equal(gate.gate, 'z');
assert.deepEqual([gate.x, gate.z], [bastion.x - 1, bastion.z + 1]);

const source = JSON.parse(await readFile(
  `${directory}e3b-anchor66-gate24-combined-candidate.mesh.json`, 'utf8',
)) as { parts: { vertices: number[][]; triangles: number[][] }[]; routeXZ: P[] };
const positions: number[] = [];
for (const part of source.parts) for (const face of part.triangles) {
  for (const index of face) positions.push(...part.vertices[index]!);
}
const geometry = new BufferGeometry();
geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
geometry.computeVertexNormals();
const factory = new Mesh(geometry, new MeshStandardMaterial({ side: DoubleSide }));
factory.position.set(bastion.x, 0, bastion.z);
factory.updateMatrixWorld(true);

const widePath = new URL('../../../artifacts/graphics/E3b2-candidates/gate-wide-review-01/e3b-gate-wide-opening-candidate.glb', import.meta.url);
const bytes = await readFile(widePath);
const wide = (await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
)).scene;
const leaf = buildFromAsset(gate, gateLeafOnly(wide));
leaf.object.updateMatrixWorld(true);
assert.ok(leaf.object.getObjectByName('DoorHinge'));
const world = new Group();
world.add(factory, leaf.object);
world.updateMatrixWorld(true);

const caster = new Raycaster();
let samples = 0;
let misses = 0;
let wrongHeight = 0;
for (let i = 1; i < source.routeXZ.length; i++) {
  const a = source.routeXZ[i - 1]!;
  const b = source.routeXZ[i]!;
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .02);
  for (let j = 1; j < steps; j++) {
    const t = j / steps;
    const x = bastion.x + a[0] + (b[0] - a[0]) * t;
    const z = bastion.z + a[1] + (b[1] - a[1]) * t;
    caster.set(new Vector3(x, 1.5, z), new Vector3(0, -1, 0));
    const hits = caster.intersectObject(factory, false);
    samples++;
    if (hits.length === 0) misses++;
    else if (Math.abs(hits[0]!.point.y - 1.02) > 1e-5) wrongHeight++;
  }
}
assert.equal(misses, 0);
assert.equal(wrongHeight, 0);
console.log(JSON.stringify({ seed: 91, bastionId: bastion.id, gateId: gate.id,
  routeSamples: samples, misses, wrongHeight, triangles: positions.length / 9 }));
