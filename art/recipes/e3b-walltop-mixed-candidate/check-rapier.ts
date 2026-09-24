/** Comprueba las ocho juntas mixtas contra sus pretiles triangulados. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import RAPIER from '@dimforge/rapier3d-compat';

interface Source {
  readonly id: string;
  readonly routeXZ: readonly (readonly [number, number])[];
  readonly parts: readonly { readonly name: string; readonly vertices: number[][]; readonly triangles: number[][] }[];
}
const names = ['mixed-e-nw', 'mixed-e-sw', 'mixed-n-se', 'mixed-n-sw',
  'mixed-s-ne', 'mixed-s-nw', 'mixed-w-ne', 'mixed-w-se'];
await RAPIER.init();
const reports = [];
for (const name of names) {
  const source = JSON.parse(await readFile(new URL(`./${name}.mesh.json`, import.meta.url), 'utf8')) as Source;
  assert.equal(source.id, name);
  const parapets = source.parts.filter(part => part.name.startsWith('Parapet'));
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  for (const part of parapets) {
    world.createCollider(RAPIER.ColliderDesc.trimesh(new Float32Array(part.vertices.flat()),
      new Uint32Array(part.triangles.flat())));
  }
  world.step();
  const body = new RAPIER.Cylinder(0.075, 0.32);
  const rotation = { x: 0, y: 0, z: 0, w: 1 };
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
  reports.push({ name, parapets: parapets.length, samples, hits });
  assert.equal(hits, 0, `${name} bloquea la ruta en Rapier`);
}
console.log(JSON.stringify(reports));
