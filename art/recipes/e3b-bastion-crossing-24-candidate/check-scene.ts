/** Comprueba la huella de la candidata contra la villa reproducible de semilla 91. */
import assert from 'node:assert/strict';
import { foundGame } from '../../../src/engine/found';
import { run } from '../../../src/engine/sim';
import { CATALOG } from '../../../src/engine/crossroads/catalog';
import { forestLooks } from '../../../src/render3d/world/forest-state';
import { scatterTransform } from '../../../src/render3d/world/forest';
import { generate, inside, type Point } from './generate';

const state = foundGame(91);
run(state, 3846, 'prudent', CATALOG);
const source = generate();
const [cellX, cellZ] = source.fixture.cell;
assert.ok(cellX !== undefined && cellZ !== undefined);
const footprint = source.floorPolygonXZ.map(([x, z]) => [x + cellX, z + cellZ] as Point);
const building = state.buildings.find(item => item.id === 296);
assert.ok(building?.kind === 'bastion' && building.x === cellX && building.y === cellZ);
const expectedNeighbor = state.buildings.find(item => item.x === cellX + 1 && item.y === cellZ - 1
  && item.lostTick === null);
assert.ok(expectedNeighbor);
const expectedWestNeighbor = state.buildings.find(item => item.x === cellX - 1 && item.y === cellZ
  && item.lostTick === null);
assert.ok(expectedWestNeighbor);

function intersectsBox(x: number, z: number, width: number, depth: number): boolean {
  const corners: Point[] = [[x, z], [x + width, z], [x + width, z + depth], [x, z + depth]];
  return corners.some(point => inside(point, footprint))
    || footprint.some(([px, pz]) => px >= x && px <= x + width && pz >= z && pz <= z + depth);
}
function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}
const buildingConflicts = state.buildings.filter(item => item.lostTick === null
  && item.id !== building.id && item.id !== expectedNeighbor.id && item.id !== expectedWestNeighbor.id
  && intersectsBox(item.x, item.y, item.w, item.h))
  .map(item => ({ id: item.id, kind: item.kind, x: item.x, z: item.y }));
const workConflicts = state.works.filter(item => intersectsBox(item.x, item.y, item.w, item.h))
  .map(item => ({ x: item.x, z: item.y, w: item.w, h: item.h }));
const treeConflicts = forestLooks(state).filter(item => item.stage === 'standing')
  .map(item => scatterTransform(state.map.width, item.cell))
  .filter(tree => {
    const center: Point = [tree.x, tree.z];
    return inside(center, footprint) || footprint.some((point, i) =>
      pointToSegmentDistance(center, point, footprint[(i + 1) % footprint.length]!) <= .34 / 3 * tree.scale);
  }).map(tree => ({ x: tree.x, z: tree.z, scale: tree.scale }));
const report = { fixture: source.fixture, expectedNeighbor: { id: expectedNeighbor.id,
  kind: expectedNeighbor.kind }, expectedWestNeighbor: { id: expectedWestNeighbor.id,
  kind: expectedWestNeighbor.kind }, footprint, buildingConflicts, workConflicts, treeConflicts,
  limit: 'XY footprint only; no GPU, GLB, collisions or material review.' };
console.log(JSON.stringify(report, null, 2));
assert.deepEqual(buildingConflicts, []);
assert.deepEqual(workConflicts, []);
assert.deepEqual(treeConflicts, []);
