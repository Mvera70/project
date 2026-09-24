/** Barrido CPU de la junta bastión66 + muro24; no escribe ni exporta recursos. */
import assert from 'node:assert/strict';
import { combinedWall } from './wall-combined-source';
import { cross, inside, sub, type P } from './combined-source';

const source = combinedWall();
const area = (poly: P[]): number => Math.abs(poly.reduce((sum, point, i) =>
  sum + cross(point, poly[(i + 1) % poly.length]!), 0)) / 2;
function edgeDistance(p: P, a: P, b: P): number {
  const d = sub(b, a), length2 = d[0] ** 2 + d[1] ** 2;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1,
    (sub(p, a)[0] * d[0] + sub(p, a)[1] * d[1]) / length2));
  return Math.hypot(p[0] - a[0] - d[0] * t, p[1] - a[1] - d[1] * t);
}
function distance(p: P, poly: P[]): number {
  return inside(p, poly) ? 0 : Math.min(...poly.map((a, i) =>
    edgeDistance(p, a, poly[(i + 1) % poly.length]!)));
}
let samples = 0, missingFloor = 0, missingSourceFloor = 0, railHits = 0;
const failures: P[] = [];
for (let i = 1; i < source.routeXZ.length; i++) {
  const a = source.routeXZ[i - 1]!, b = source.routeXZ[i]!;
  const n = Math.ceil(Math.hypot(...sub(b, a)) / .005);
  for (let step = 0; step <= n; step++) {
    const p: P = [a[0] + (b[0] - a[0]) * step / n,
      a[1] + (b[1] - a[1]) * step / n];
    for (const radius of [0, .16, .32, .35]) {
      for (let angle = 0; angle < (radius === 0 ? 1 : 32); angle++) {
        const q: P = [p[0] + radius * Math.cos(angle * Math.PI / 16),
          p[1] + radius * Math.sin(angle * Math.PI / 16)];
        if (q[0] > 1 + 1e-8 || q[0] < -1 - 1e-8) continue;
        samples++;
        if (!source.deckPolys.some(poly => distance(q, poly) < 1e-8)) {
          missingFloor++;
          if (!source.floors.some(poly => distance(q, poly) < 1e-8)) missingSourceFloor++;
          if (failures.length < 8) failures.push(q);
        }
        if (radius <= .32 && source.railPolys.some(poly => distance(q, poly) < 1e-8)) railHits++;
      }
    }
  }
}
const triangles = source.parts.reduce((sum, part) => sum + part.triangles.length, 0);
const deckArea = source.deckPolys.reduce((sum, poly) => sum + area(poly), 0);
const railArea = source.railPolys.reduce((sum, poly) => sum + area(poly), 0);
const report = { triangles, parts: source.parts.length, samples, missingFloor,
  missingSourceFloor, railHits, failures, deckArea, railArea, stairCount: source.parts.filter(part =>
    part.name.startsWith('Stair_')).length,
  limits: 'Fuente CPU: no acredita exportación GLB, contacto físico ni aspecto en la app.' };
console.log(JSON.stringify(report));
assert.ok(triangles <= source.budget.maxStaticTriangles, 'Triangle budget');
assert.equal(report.stairCount, 14);
assert.equal(missingFloor, 0, 'Continuous deck for the guard disk');
assert.equal(railHits, 0, 'Parapets cannot cross the guard body');
