/** Sonda Rapier sin exportación: volumen real de los pretiles de la fuente combinada. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import RAPIER from '@dimforge/rapier3d-compat';
import { directory } from './generate';

type Part = { name: string; vertices: number[][] };
type Source = { parts: Part[]; routeXZ: [number, number][] };
const source = JSON.parse(await readFile(
  `${directory}e3b-anchor66-gate24-combined-candidate.mesh.json`, 'utf8',
)) as Source;
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
const parapets = source.parts.filter(part => part.name.startsWith('Parapet_'));
const names = new Map<number, string>();
for (const part of parapets) {
  const points = new Float32Array(part.vertices.flat());
  const desc = RAPIER.ColliderDesc.convexHull(points);
  assert.ok(desc, `Rapier no admite ${part.name}`);
  const collider = world.createCollider(desc);
  names.set(collider.handle, part.name);
}
world.step();

// Un cilindro fino comprueba el disco horizontal del cuerpo entre Y1,04 y1,19.
// El suelo superior acaba en1,02 y queda fuera de esta sonda de pretiles.
const body = new RAPIER.Cylinder(0.075, 0.32);
const rotation = { x: 0, y: 0, z: 0, w: 1 };
let outerHits = 0;
world.intersectionsWithShape({ x: 0.5, y: 1.115, z: 0.05 }, rotation,
  new RAPIER.Cylinder(0.075, 0.03), () => { outerHits += 1; return true; });
assert.ok(outerHits > 0, 'El parapeto exterior debe detener un proyectil');
let samples = 0;
let hits = 0;
const firstHits: { x: number; z: number; part: string }[] = [];
for (let segment = 1; segment < source.routeXZ.length; segment += 1) {
  const start = source.routeXZ[segment - 1]!;
  const end = source.routeXZ[segment]!;
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  const steps = Math.ceil(length / 0.002);
  for (let step = 1; step < steps; step += 1) {
    const t = step / steps;
    const x = start[0] + (end[0] - start[0]) * t;
    const z = start[1] + (end[1] - start[1]) * t;
    samples += 1;
    world.intersectionsWithShape({ x, y: 1.115, z }, rotation, body, collider => {
      hits += 1;
      if (firstHits.length < 8) firstHits.push({ x, z,
        part: names.get(collider.handle) ?? String(collider.handle) });
      return true;
    });
  }
}
world.free();
console.log(JSON.stringify({ parapets: parapets.length, samples, hits, outerHits, firstHits }));
assert.equal(hits, 0, 'La ruta superior toca un pretil en Rapier');

// El suelo del adarve no puede convertir el portón en un muro físico. Con la
// hoja abierta, el cuerpo conserva el vano público bajo las jambas y dintel.
const frame = new RAPIER.World({ x: 0, y: 0, z: 0 });
const frameParts = source.parts.filter(part => part.name.startsWith('FrameUnion_')
  || part.name.startsWith('UpperLintel_') || part.name.startsWith('Stair_')
  || part.name.startsWith('Deck_'));
for (const part of frameParts) {
  const desc = RAPIER.ColliderDesc.convexHull(new Float32Array(part.vertices.flat()));
  assert.ok(desc, `Rapier no admite ${part.name}`);
  frame.createCollider(desc);
}
frame.step();
let passageHits = 0;
const passageBody = new RAPIER.Cylinder(0.20, 0.32);
for (let step = 0; step <= 160; step += 1) {
  const z = 1.1 + step * 0.005;
  frame.intersectionsWithShape({ x: -0.5, y: 0.32, z }, rotation, passageBody,
    () => { passageHits += 1; return true; });
}
let jambHits = 0;
for (const x of [-0.98, -0.02]) {
  frame.intersectionsWithShape({ x, y: 0.32, z: 1.5 }, rotation,
    new RAPIER.Cylinder(0.20, 0.03), () => { jambHits += 1; return true; });
}
frame.free();
console.log(JSON.stringify({ frameParts: frameParts.length, passageSamples: 161, passageHits, jambHits }));
assert.equal(passageHits, 0, 'La fábrica nueva obstruye el portón abierto');
assert.ok(jambHits >= 2, 'Las jambas deben seguir interceptando los laterales');
