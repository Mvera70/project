/** Barrido de colisión sobre la fuente del bastión pasante W+NE, sin exportar. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import RAPIER from '@dimforge/rapier3d-compat';

const source = JSON.parse(await readFile(new URL('./e3b-bastion-crossing-24-candidate.mesh.json', import.meta.url), 'utf8')) as {
  routeXZ: [number, number][];
  parts: { name: string; vertices: number[][]; triangles: number[][] }[];
};
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
const parapets = source.parts.filter(part => part.name.startsWith('Parapet_'));
for (const part of parapets) {
  // Estos pretiles doblan una esquina: su convex hull rellena el hueco del
  // pasillo y bloquearía al guardia. La malla cerrada conserva la concavidad.
  const desc = RAPIER.ColliderDesc.trimesh(new Float32Array(part.vertices.flat()),
    new Uint32Array(part.triangles.flat()));
  world.createCollider(desc);
}
world.step();
const body = new RAPIER.Cylinder(0.075, 0.32);
const rotation = { x: 0, y: 0, z: 0, w: 1 };
let outerHits = 0;
world.intersectionsWithShape({ x: 0.1, y: 1.14, z: 0.15 }, rotation,
  new RAPIER.Cylinder(0.05, 0.03), () => { outerHits += 1; return true; });
let samples = 0, hits = 0;
for (let segment = 1; segment < source.routeXZ.length; segment += 1) {
  const start = source.routeXZ[segment - 1]!;
  const end = source.routeXZ[segment]!;
  const steps = Math.ceil(Math.hypot(end[0] - start[0], end[1] - start[1]) / 0.002);
  for (let step = 1; step < steps; step += 1) {
    const t = step / steps;
    const x = start[0] + (end[0] - start[0]) * t;
    const z = start[1] + (end[1] - start[1]) * t;
    samples += 1;
    world.intersectionsWithShape({ x, y: 1.115, z }, rotation, body,
      () => { hits += 1; return true; });
  }
}
world.free();
console.log(JSON.stringify({ parapets: parapets.length, samples, hits, outerHits }));
assert.equal(hits, 0, 'El corredor W+NE toca un pretil físico');
assert.ok(outerHits > 0, 'El pretil exterior no intercepta el volumen de prueba');
