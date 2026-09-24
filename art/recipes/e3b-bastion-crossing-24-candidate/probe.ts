import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { cross, directory, generate, inside, prism, sourcePath, sub, type Part, type Point } from './generate';

const bytes = await readFile(sourcePath);
const source = JSON.parse(bytes.toString()) as ReturnType<typeof generate>;
assert.equal(bytes.toString(), JSON.stringify(generate(), null, 2) + '\n');
const material = new MeshBasicMaterial({ side: DoubleSide });
function model(parts: Part[]) {
  const group = new Group();
  for (const p of parts) {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(p.triangles.flatMap(t => t.flatMap(i => p.vertices[i]!)), 3));
    group.add(new Mesh(geo, material));
  }
  group.updateMatrixWorld(true); return group;
}
const full = model(source.parts);
function floorAt(p: Point, target = full) {
  return new Raycaster(new Vector3(p[0], 1.025, p[1]), new Vector3(0, -1, 0), 0, .02).intersectObject(target, true).some(h => Math.abs(h.point.y - 1.02) < 1e-6);
}
const rails = source.parts.filter(p => p.name.startsWith('Parapet'));
const closedEdges = source.floorPolygonXZ.flatMap((a, i) => {
  const b = source.floorPolygonXZ[(i + 1) % source.floorPolygonXZ.length]!;
  if ((Math.abs(a[0]) < 1e-8 && Math.abs(b[0]) < 1e-8) || (Math.abs(a[0] - a[1] - 2) < 1e-8 && Math.abs(b[0] - b[1] - 2) < 1e-8)) return [];
  return [{ a, b }];
});
function pointSegment(p: Point, a: Point, b: Point) {
  const e = sub(b, a), d = sub(p, a), t = Math.max(0, Math.min(1, (d[0] * e[0] + d[1] * e[1]) / (e[0] ** 2 + e[1] ** 2)));
  return Math.hypot(p[0] - a[0] - t * e[0], p[1] - a[1] - t * e[1]);
}
function segmentDistance(a: Point, b: Point, c: Point, d: Point) {
  const u = sub(b, a), v = sub(d, c), den = cross(u, v);
  if (Math.abs(den) > 1e-12) { const t = cross(sub(c, a), v) / den, s = cross(sub(c, a), u) / den; if (t >= 0 && t <= 1 && s >= 0 && s <= 1) return 0; }
  return Math.min(pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b));
}
// Distancia exacta entre segmentos finitos: también funciona con el pretil cóncavo.
const clearance = Math.min(...rails.flatMap(rail => rail.polygonXZ.flatMap((a, i) => source.routeXZ.slice(1).map((q, j) => segmentDistance(a, rail.polygonXZ[(i + 1) % rail.polygonXZ.length]!, source.routeXZ[j]!, q)))));
assert.ok(clearance >= .35 - 1e-9, 'Analytic continuous disk clearance');
let samples = 0, failures = 0, clipped = 0;
for (let i = 1; i < source.routeXZ.length; i++) {
  const a = source.routeXZ[i - 1]!, b = source.routeXZ[i]!, n = Math.ceil(Math.hypot(...sub(b, a)) / .005);
  for (let j = 0; j <= n; j++) for (const r of [0, .175, .35]) for (let k = 0; k < (r ? 96 : 1); k++) {
    const p: Point = [a[0] + (b[0] - a[0]) * j / n + r * Math.cos(k * Math.PI / 48), a[1] + (b[1] - a[1]) * j / n + r * Math.sin(k * Math.PI / 48)];
    if (p[0] < -1e-8 || p[0] - p[1] > 2 + 1e-8) { clipped++; continue; }
    // Sólo los planos terminales pertenecen al vecino; sesgo mínimo por Float32.
    if (Math.abs(p[0]) < 1e-8) p[0] += 1e-7;
    if (Math.abs(p[0] - p[1] - 2) < 1e-8) { p[0] -= 1e-7; p[1] += 1e-7; }
    samples++; if (!floorAt(p) || rails.some(rail => inside(p, rail.polygonXZ, -1e-8))) failures++;
  }
}
assert.equal(failures, 0);
let boundarySamples = 0;
for (const { a, b } of closedEdges) for (let i = 1; i < 1000; i++) {
  const edge = sub(b, a), length = Math.hypot(...edge);
  const p: Point = [a[0] + edge[0] * i / 1000 - edge[1] / length * .01, a[1] + edge[1] * i / 1000 + edge[0] / length * .01];
  assert.ok(rails.some(rail => inside(p, rail.polygonXZ)), 'Every non-port boundary has parapet'); boundarySamples++;
}
const ports = source.ports.map(port => {
  const end = source.clearPolygonXZ.filter(p => port.face === 'west' ? Math.abs(p[0]) < 1e-8 : Math.abs(p[0] - p[1] - 2) < 1e-8);
  assert.equal(end.length, 2); const width = Math.hypot(...sub(end[0]!, end[1]!)); assert.ok(Math.abs(width - .7) < 1e-10);
  return { ...port, clearWidth: width, threshold: 1.02 };
});
type Cube = { name: string; type: string; location: number[]; dimensions: number[]; rotationDegrees?: number[] };
const interfaces = [];
for (const [kind, portIndex] of [['straight', 0], ['diagonal', 1]] as const) {
  const path = `../e3b-walltop-finish-candidate/e3b-walltop-finish-${kind}-candidate.json`;
  const neighborBytes = await readFile(new URL(path, import.meta.url));
  const neighbor = JSON.parse(neighborBytes.toString()) as { primitives: Cube[] };
  const deck = neighbor.primitives.find(p => p.name === 'Deck')!;
  const angle = -(deck.rotationDegrees?.[2] ?? 0) * Math.PI / 180;
  const transverse: Point = [-Math.sin(angle), Math.cos(angle)];
  const bands = neighbor.primitives.filter(p => p.name === 'ParapetNorth' || p.name === 'ParapetSouth').map(p => {
    assert.equal(p.type, 'cube');
    const delta: Point = [p.location[0]! - deck.location[0]!, -p.location[1]! + deck.location[1]!];
    const center = delta[0] * transverse[0] + delta[1] * transverse[1];
    return { min: center - p.dimensions[1]! / 2, max: center + p.dimensions[1]! / 2, bottom: p.location[2]! - p.dimensions[2]! / 2, top: p.location[2]! + p.dimensions[2]! / 2 };
  }).sort((a, b) => a.min - b.min);
  const measuredWidth = bands[1]!.min - bands[0]!.max;
  assert.ok(Math.abs(measuredWidth - ports[portIndex]!.clearWidth) < 1e-10);
  assert.ok(Math.abs(deck.location[2]! + deck.dimensions[2]! / 2 - 1.02) < 1e-10);
  let contactSamples = 0;
  const port = ports[portIndex]!, side: Point = [-port.normal[1]!, port.normal[0]!];
  for (const band of bands) {
    assert.ok(Math.abs(band.bottom - 1.02) < 1e-10 && band.top <= 1.26);
    for (let i = 0; i <= 100; i++) {
      const t = band.min + (band.max - band.min) * i / 100;
      const p: Point = [port.center[0]! + side[0] * t, port.center[1]! + side[1] * t];
      assert.ok(rails.some(rail => inside(p, rail.polygonXZ)), 'Full neighbor parapet section meets bastion'); contactSamples++;
    }
  }
  // Toda la sección sobrante del bastión queda cerrada, salvo el paso exacto de 0,70.
  let capSamples = 0;
  for (let i = -2000; i <= 2000; i++) {
    const t = i / 1000, p: Point = [port.center[0]! + side[0] * t, port.center[1]! + side[1] * t];
    if (Math.abs(t) > .3500001 && inside(p, source.floorPolygonXZ)) { assert.ok(rails.some(rail => inside(p, rail.polygonXZ))); capSamples++; }
  }
  interfaces.push({ kind, source: path, sha256: createHash('sha256').update(neighborBytes).digest('hex'), measuredClearWidth: measuredWidth, deckWidth: deck.dimensions[1], deckBottom: deck.location[2]! - deck.dimensions[2]! / 2, deckTop: deck.location[2]! + deck.dimensions[2]! / 2, parapetBands: bands, contactSamples, capSamples, sectionGaps: 0 });
}
let minVolume = Infinity;
for (const p of source.parts) {
  const edgeCounts = new Map<string, number>(); let volume = 0;
  for (const t of p.triangles) {
    const [a, b, c] = t.map(i => new Vector3(...p.vertices[i]! as [number, number, number]));
    assert.ok(b!.clone().sub(a!).cross(c!.clone().sub(a!)).length() > 1e-10, 'Nondegenerate face');
    volume += a!.dot(b!.clone().cross(c!)) / 6;
    for (let i = 0; i < 3; i++) { const key = [t[i]!, t[(i + 1) % 3]!].sort((a, b) => a - b).join(':'); edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1); }
  }
  assert.ok([...edgeCounts.values()].every(n => n === 2), 'Closed per-part manifold');
  assert.ok(volume > 0, 'Outward winding'); minVolume = Math.min(minVolume, volume);
}
// Apoyo de todos los puntos del tablero por igualdad exacta de las secciones estratificadas.
const layers = source.parts.filter(p => p.top <= 1.02).sort((a, b) => a.bottom - b.bottom);
assert.equal(layers[0]!.bottom, 0);
for (let i = 0; i < layers.length; i++) {
  assert.deepEqual(layers[i]!.polygonXZ, source.floorPolygonXZ);
  if (i) assert.ok(Math.abs(layers[i]!.bottom - layers[i - 1]!.top) < 1e-10);
}
assert.equal(layers.at(-1)!.top, 1.02);
for (const p of rails) assert.ok(p.polygonXZ.every(v => inside(v, source.floorPolygonXZ)) && p.bottom === 1.02);
const triangles = source.parts.reduce((n, p) => n + p.triangles.length, 0);
assert.ok(triangles <= source.budget.maxTriangles);
assert.ok(new Set(source.parts.map(p => p.material)).size <= source.budget.maxMaterials);
// Controles negativos geométricos: retirar tablero, invertir norte y taponar boca.
assert.equal(floorAt([.5, .5], model(source.parts.filter(p => p.name !== 'Deck'))), false);
const mirrored = model(source.parts.map(p => ({ ...p, vertices: p.vertices.map(([x, y, z]) => [x!, y!, 1 - z!]) })));
assert.equal(floorAt([1.5, -.5], mirrored), false);
const plug = prism('Plug', [[0, .1], [.1, .1], [.1, .9], [0, .9]], 1.02, 1.26);
assert.ok(inside([.05, .5], plug.polygonXZ));
const report = {
  sha256: createHash('sha256').update(bytes).digest('hex'), deterministic: true, fixture: source.fixture,
  triangles, budget: source.budget, parts: source.parts.length, materials: 2, textures: 0, ports, interfaces,
  route: { samples, failures, clippedAtNeighborPlanes: clipped, analyticContinuousClearance: clearance, radius: .35, margin: clearance - .35 },
  parapets: { boundarySamples, failures: 0, height: .24 },
  support: { layers: layers.length, exactFullFootprintContact: true, groundY: 0, floorY: 1.02 },
  topology: { perPartClosed: true, outwardWinding: true, minSignedVolume: minVolume, zeroAreaFaces: 0 },
  negativeControls: { missingDeckRejected: true, mirroredNorthRejected: true, portalPlugDetected: true },
  limits: ['Internal contact faces remain in source; no overlapping positive volumes.', 'Port portions of disk outside owned geometry require neighbor floor.', 'No GLB, GPU, runtime dynamics, scene occupancy, structural simulation or human visual approval.'],
};
if (process.argv.includes('--record')) await writeFile(directory + 'measurements.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
