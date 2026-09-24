/** Sonda CPU de apoyos del codo contra la pared recortada que monta la escena. */
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DoubleSide, Raycaster, Vector3, type Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildDefence } from '../../../src/render3d/world/defences';
import type { PlannedBuilding } from '../../../src/render3d/world/plan';

const root = resolve(import.meta.dirname, '../../..');
const recipeName = process.argv[2] ?? 'e3b-walkway-turn-candidate';
if (!/^e3b-walkway-turn(?:-braced)?-candidate$/.test(recipeName)) throw new Error('Unknown turn variant');
const recipePath = resolve(import.meta.dirname, `${recipeName}.json`);
const wallPath = resolve(root, 'public/assets/valley3d/wall.glb');
const [recipeBytes, wallBytes] = await Promise.all([readFile(recipePath), readFile(wallPath)]);
const recipe = JSON.parse(recipeBytes.toString('utf8')) as {
  primitives: { name: string; location: number[]; dimensions: number[]; rotationDegrees?: number[] }[];
};
const gltf = await new GLTFLoader().parseAsync(
  wallBytes.buffer.slice(wallBytes.byteOffset, wallBytes.byteOffset + wallBytes.byteLength), '',
);
gltf.scene.traverse(node => {
  const mesh = node as Mesh;
  if (!mesh.isMesh) return;
  for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.side = DoubleSide;
});
const ray = new Raycaster();
const supports = recipe.primitives.filter(p => p.name.includes('Bearing') || p.name.includes('Corbel') || p.name.includes('Brace'));
const orientations = [
  { degrees: 0, mask: 9 }, { degrees: 90, mask: 12 },
  { degrees: 180, mask: 6 }, { degrees: 270, mask: 3 },
] as const;
const results = orientations.map(orientation => {
const model = buildDefence(
  { id: 1, kind: 'wall', x: 0, z: 0, w: 1, h: 1, ruin: false,
    connections: orientation.mask } as PlannedBuilding,
  gltf.scene,
);
model.object.updateMatrixWorld(true);
const checks = supports.map(primitive => {
  const [x, negativeZ, y] = primitive.location;
  const [width, depth, height] = primitive.dimensions;
  if ([x, negativeZ, y, width, depth, height].some(v => v === undefined)) throw new Error(primitive.name);
  const bottom = y! - height! / 2;
  const upper = y! + height! / 2;
  const angle = -(primitive.rotationDegrees?.[2] ?? 0) * Math.PI / 180;
  const co = Math.cos(angle), si = Math.sin(angle);
  const samples: { x: number; z: number; top: number | null; gap: number | null }[] = [];
  for (let ix = 0; ix <= 8; ix++) for (let iz = 0; iz <= 8; iz++) {
    const u = width! * (ix / 8 - .5);
    const v = depth! * (iz / 8 - .5);
    const px = x! + u * co - v * si;
    const pz = -negativeZ! + u * si + v * co;
    const turn = orientation.degrees * Math.PI / 180;
    const dx = px - .5, dz = pz - .5;
    const wx = .5 + dx * Math.cos(turn) + dz * Math.sin(turn);
    const wz = .5 - dx * Math.sin(turn) + dz * Math.cos(turn);
    ray.set(new Vector3(wx, 1.5, wz), new Vector3(0, -1, 0));
    const hit = ray.intersectObject(model.object, true)[0];
    const top = hit?.point.y ?? null;
    samples.push({ x: wx, z: wz, top, gap: top === null ? null : bottom - top });
  }
  const contacts = samples.filter(s => s.top !== null && s.top >= bottom - .002 && s.top <= upper + .002).length;
  return {
    name: primitive.name, bottom, samples: samples.length, contacts,
    contactFraction: contacts / samples.length,
    maxGap: Math.max(...samples.map(s => s.gap ?? Infinity)),
    center: samples[40],
    unsupported: samples.filter(s => s.top === null || s.top < bottom - .002 || s.top > upper + .002),
  };
});
model.dispose();
return { ...orientation, checks };
});
const report = {
  sources: {
    recipe: `art/recipes/e3b-walkway-turn-candidate/${recipeName}.json`,
    recipeSha256: createHash('sha256').update(recipeBytes).digest('hex'),
    wall: 'public/assets/valley3d/wall.glb',
    wallSha256: createHash('sha256').update(wallBytes).digest('hex'),
  },
  wallMasks: orientations.map(o => o.mask),
  samplesPerSupport: 81,
  contactTolerance: .002,
  results,
  limitation: 'Samples the underside of proposed bearings against the actual clipped wall. No load analysis, deck sweep, tree check, or GLB export.',
};
const destination = resolve(root, `artifacts/graphics/E3b2-candidates/round-4/${recipeName}-real-wall-support.json`);
await mkdir(resolve(root, 'artifacts/graphics/E3b2-candidates/round-4'), { recursive: true });
await writeFile(destination, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ destination, results: results.map(({ degrees, mask, checks }) =>
  ({ degrees, mask, checks: checks.map(({ name, contacts, samples }) => ({ name, contacts, samples })) })) }));
