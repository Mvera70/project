import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ShapeUtils, Vector2 } from 'three';

export type Point = [number, number];
export type Part = { name: string; polygonXZ: Point[]; bottom: number; top: number; vertices: number[][]; triangles: number[][]; material: string };
export const directory = fileURLToPath(new URL('.', import.meta.url));
export const sourcePath = directory + 'e3b-bastion-crossing-24-candidate.mesh.json';
export const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0];
export const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
export function inside(p: Point, poly: Point[], tolerance = 1e-9) {
  let result = false;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!, b = poly[(i + 1) % poly.length]!, e = sub(b, a), d = sub(p, a);
    if (Math.abs(cross(e, d)) < 1e-9 && d[0] * e[0] + d[1] * e[1] >= -1e-9 && d[0] * e[0] + d[1] * e[1] <= e[0] ** 2 + e[1] ** 2 + 1e-9) return tolerance >= 0;
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
export function prism(name: string, polygonXZ: Point[], bottom: number, top: number, material = 'stone'): Part {
  const n = polygonXZ.length;
  const vertices = [...polygonXZ.map(([x, z]) => [x, bottom, z]), ...polygonXZ.map(([x, z]) => [x, top, z])];
  const triangles: number[][] = [];
  for (const [a, b, c] of ShapeUtils.triangulateShape(polygonXZ.map(p => new Vector2(...p)), [])) triangles.push([a!, b!, c!], [c! + n, b! + n, a! + n]);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; triangles.push([i, i + n, j + n], [i, j + n, j]); }
  return { name, polygonXZ, bottom, top, vertices, triangles, material };
}
export function generate() {
  const r = .5 / Math.SQRT2;
  // Polígono convexo: dos extremos abiertos y tres flancos cerrados.
  const floor: Point[] = [[0, -.2], [1.5 - r, -.5 - r], [1.5 + r, -.5 + r], [1, 1], [0, 1]];
  const s = .35 / Math.SQRT2;
  // Corredor de 0,70 con unión en inglete: conserva el disco en todo el giro.
  const clear: Point[] = [[0, .15], [1 - .35 * Math.SQRT2 - .15, .15], [1.5 - s, -.5 - s], [1.5 + s, -.5 + s], [1 + .35 * Math.SQRT2 - .85, .85], [0, .85]];
  const rails: Point[][] = [[floor[0]!, floor[1]!, clear[2]!, clear[1]!, clear[0]!], [clear[5]!, clear[4]!, clear[3]!, floor[2]!, floor[3]!, floor[4]!]];
  const parts: Part[] = [];
  // Juntas horizontales rellenas, sin huecos y sin capas coplanares solapadas.
  for (let row = 0; row < 6; row++) {
    const lo = row * .94 / 6, hi = (row + 1) * .94 / 6;
    parts.push(prism(`Masonry_${row}`, floor, lo, hi - .008));
    parts.push(prism(`Mortar_${row}`, floor, hi - .008, hi, 'mortar'));
  }
  parts.push(prism('Deck', floor, .94, 1.02));
  rails.forEach((p, i) => parts.push(prism(`Parapet_${i}`, p, 1.02, 1.26)));
  return {
    format: 'valley-candidate-explicit-mesh-v1', id: 'e3b-bastion-crossing-24-candidate', status: 'source_geometry_only',
    coordinateSystem: 'world XYZ local to northwest corner of bastion cell; Y up; north = -Z',
    fixture: { seed: 91, tick: 3846, id: 296, cell: [40, 65], mask: 24 },
    floorY: 1.02, requiredClearWidth: .7, bodyRadius: .35,
    ports: [{ face: 'west', center: [0, .5], normal: [-1, 0] }, { face: 'northeast', center: [1.5, -.5], normal: [Math.SQRT1_2, -Math.SQRT1_2] }],
    routeXZ: [[1.5, -.5], [.5, .5], [0, .5]] as Point[],
    ownership: 'Replaces bastion296 and northeast neighbor half up to neighbor center. No staircase. Adjacent deck/parapets in this owned region must be removed at integration.',
    budget: { maxTriangles: 600, maxMaterials: 2, textures: 0 },
    materials: [{ name: 'stone', colorLinear: [155 / 255, 149 / 255, 138 / 255], roughness: .95 }, { name: 'mortar', colorLinear: [.39, .37, .33], roughness: 1 }],
    floorPolygonXZ: floor, clearPolygonXZ: clear, parts,
    limits: ['Source only; not the primitive recipe loader format.', 'No export, runtime, scene occupancy, physics or visual acceptance.', 'Ground support is geometric contact, not load capacity.'],
  };
}
if (process.argv.includes('--write')) await writeFile(sourcePath, JSON.stringify(generate(), null, 2) + '\n');
