/** Rapier sobre la fuente en memoria: el guardia pasa arriba y la fábrica bloquea abajo. */
import assert from 'node:assert/strict';
import RAPIER from '@dimforge/rapier3d-compat';
import { combinedWall } from './wall-combined-source';

const source = combinedWall();
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
const rails = source.parts.filter(part => part.name.startsWith('Parapet_'));
const bearing = source.parts.filter(part => part.name.startsWith('StoneCourse')
  || part.name.startsWith('MortarBed'));
for (const parts of [rails, bearing]) {
  const vertices: number[] = [], indices: number[] = [];
  for (const part of parts) {
    const offset = vertices.length / 3;
    vertices.push(...part.vertices.flat());
    indices.push(...part.triangles.flatMap(triangle => triangle.map(index => index + offset)));
  }
  world.createCollider(RAPIER.ColliderDesc.trimesh(new Float32Array(vertices), new Uint32Array(indices)));
}
world.step();
const rotation = { x: 0, y: 0, z: 0, w: 1 };
const body = new RAPIER.Cylinder(.075, .32);
let routeSamples = 0, routeHits = 0;
for (let segment = 1; segment < source.routeXZ.length; segment++) {
  const from = source.routeXZ[segment - 1]!, to = source.routeXZ[segment]!;
  const steps = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / .005);
  for (let step = 1; step < steps; step++) {
    const t = step / steps, x = from[0] + (to[0] - from[0]) * t;
    const z = from[1] + (to[1] - from[1]) * t;
    routeSamples++;
    world.intersectionsWithShape({ x, y: 1.115, z }, rotation, body,
      () => { routeHits++; return true; });
  }
}
let lowerWallHits = 0;
world.intersectionsWithShape({ x: -.5, y: .45, z: 1.5 }, rotation,
  new RAPIER.Cylinder(.2, .2), () => { lowerWallHits++; return true; });
const outerRailHit = world.castRay(new RAPIER.Ray(
  { x: .5, y: 1.115, z: -.1 }, { x: 0, y: 0, z: 1 }), .5, true);
world.free();
console.log(JSON.stringify({ railSourceParts: rails.length, bearingSourceParts: bearing.length,
  staticColliders: 2,
  routeSamples, routeHits, lowerWallHits, outerRailHit: outerRailHit !== null,
  limit: 'Rapier sobre fuente CPU; falta collider del GLB final y prueba de movimiento en escena.' }));
assert.equal(routeHits, 0);
assert.ok(lowerWallHits > 0);
assert.ok(outerRailHit !== null);
