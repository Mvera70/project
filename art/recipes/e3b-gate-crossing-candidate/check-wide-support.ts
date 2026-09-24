/** Compara apoyos de los cruces 65/24 con portón amplio y muro montados por el juego. */
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Box3, DoubleSide, Raycaster, Vector3, type Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildDefence } from '../../../src/render3d/world/defences';
import { buildFromAsset } from '../../../src/render3d/world/buildings';
import type { PlannedBuilding } from '../../../src/render3d/world/plan';

const root = resolve(import.meta.dirname, '../../..');
const widePath = resolve(root, 'artifacts/graphics/E3b2-candidates/gate-wide-review-01/e3b-gate-wide-opening-candidate.glb');
const wallPath = resolve(root, 'public/assets/valley3d/wall.glb');
const [wideBytes, wallBytes] = await Promise.all([readFile(widePath), readFile(wallPath)]);
async function scene(bytes: Buffer) {
  const loaded = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength), '');
  loaded.scene.traverse(node => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.side = DoubleSide;
  });
  return loaded.scene;
}
const [gateScene, wallScene] = await Promise.all([scene(wideBytes), scene(wallBytes)]);
const cases = [
  { mask: 65, axis: 'x' as const, adjacent: { x: -1, z: 1, mask: 16 } },
  { mask: 24, axis: 'z' as const, adjacent: { x: 1, z: -1, mask: 64 } },
];
const narrow = process.argv.includes('--narrow-web');
const corbel = process.argv.includes('--corbel');
if (corbel && !narrow) throw new Error('--corbel requires --narrow-web');
const ray = new Raycaster();
const reports = [];
for (const testCase of cases) {
  const recipeName = `e3b-gate-crossing-${testCase.mask}${corbel && testCase.mask === 65 ? '-corbel' : narrow ? '-narrow-web' : ''}-candidate`;
  const recipeBytes = await readFile(resolve(import.meta.dirname, `${recipeName}.json`));
  const recipe = JSON.parse(recipeBytes.toString('utf8')) as {
    primitives: { name: string; location: number[]; dimensions: number[]; rotationDegrees?: number[] }[];
  };
  const gate = buildFromAsset({ id: 1, kind: 'gate', asset: 'gate', x: 0, z: 0,
    w: 1, h: 1, ruin: false, gate: testCase.axis } as PlannedBuilding, gateScene.clone(true));
  const neighbour = buildDefence({ id: 2, kind: 'wall', x: testCase.adjacent.x,
    z: testCase.adjacent.z, w: 1, h: 1, ruin: false,
    connections: testCase.adjacent.mask } as PlannedBuilding, wallScene);
  const objects = [gate.object, neighbour.object];
  objects.forEach(o => o.updateMatrixWorld(true));
  const frame = ['Gate_Stone_Jamb_L', 'Gate_Stone_Jamb_R', 'Gate_Stone_Lintel', 'Gate_Stone_Coping']
    .map(name => {
      const part = gate.object.getObjectByName(name);
      if (part === undefined) throw new Error(name);
      const bounds = new Box3().setFromObject(part);
      return { name, min: bounds.min.toArray(), max: bounds.max.toArray() };
    });
  const supports = recipe.primitives.filter(p => p.name.startsWith('JambPier') || p.name.endsWith('WallWeb') || p.name.endsWith('Corbel'));
  const checks = supports.map(p => {
    const [cx, negativeZ, cy] = p.location;
    const [width, depth, height] = p.dimensions;
    if ([cx, negativeZ, cy, width, depth, height].some(v => v === undefined)) throw new Error(p.name);
    const bottom = cy! - height! / 2;
    const upper = cy! + height! / 2;
    const angle = -(p.rotationDegrees?.[2] ?? 0) * Math.PI / 180;
    const samples = [];
    for (let ix = 0; ix <= 8; ix++) for (let iz = 0; iz <= 8; iz++) {
      const u = width! * (ix / 8 - .5), v = depth! * (iz / 8 - .5);
      const x = cx! + u * Math.cos(angle) - v * Math.sin(angle);
      const z = -negativeZ! + u * Math.sin(angle) + v * Math.cos(angle);
      ray.set(new Vector3(x, 1.5, z), new Vector3(0, -1, 0));
      const hit = ray.intersectObjects(objects, true).find(h => h.point.y <= upper + .002);
      const top = hit?.point.y ?? null;
      samples.push({ x, z, top, contact: top !== null && top >= bottom - .002 });
    }
    return { name: p.name, bottom, upper, samples: samples.length,
      contacts: samples.filter(s => s.contact).length,
      unsupported: samples.filter(s => !s.contact) };
  });
  const corbelPart = recipe.primitives.find(p => p.name === 'GateSouthCornerCorbel');
  const webCheck = checks.find(c => c.name === 'SouthWestWallWeb');
  const corbelCheck = checks.find(c => c.name === 'GateSouthCornerCorbel');
  const bridge = corbelPart === undefined || webCheck === undefined || corbelCheck === undefined
    ? null : {
      footprint: {
        x: [corbelPart.location[0]! - corbelPart.dimensions[0]! / 2,
          corbelPart.location[0]! + corbelPart.dimensions[0]! / 2],
        z: [-corbelPart.location[1]! - corbelPart.dimensions[1]! / 2,
          -corbelPart.location[1]! + corbelPart.dimensions[1]! / 2],
      },
      allWebMissesOverlapCorbel: webCheck.unsupported.every(s =>
        s.x >= corbelPart.location[0]! - corbelPart.dimensions[0]! / 2 - 1e-8
        && s.x <= corbelPart.location[0]! + corbelPart.dimensions[0]! / 2 + 1e-8
        && s.z >= -corbelPart.location[1]! - corbelPart.dimensions[1]! / 2 - 1e-8
        && s.z <= -corbelPart.location[1]! + corbelPart.dimensions[1]! / 2 + 1e-8),
      corbelAnchoredOnGateSamples: corbelCheck.contacts,
      publicOpeningZ: [.08, .92],
      corbelMinZ: -corbelPart.location[1]! - corbelPart.dimensions[1]! / 2,
      corbelBottomY: corbelCheck.bottom,
      doorMaxY: .5933333613475167,
    };
  reports.push({ mask: testCase.mask, axis: testCase.axis, wallCell: testCase.adjacent,
    frame, recipe: recipeName, recipeSha256: createHash('sha256').update(recipeBytes).digest('hex'), checks, bridge });
  gate.dispose(); neighbour.dispose();
}
const destination = resolve(root, `artifacts/graphics/E3b2-candidates/round-4/gate-wide-${corbel ? 'corbel-' : narrow ? 'narrow-web-' : ''}support.json`);
await mkdir(resolve(root, 'artifacts/graphics/E3b2-candidates/round-4'), { recursive: true });
await writeFile(destination, `${JSON.stringify({ wideSha256: createHash('sha256').update(wideBytes).digest('hex'),
  wallSha256: createHash('sha256').update(wallBytes).digest('hex'), reports,
  limit: 'Samples underside against gate and one diagonal neighbour. Does not certify path sweep, parapets, door collision, load capacity or scene rendering.' }, null, 2)}\n`);
console.log(JSON.stringify({ destination, cases: reports.map(r => ({ mask: r.mask,
  supports: r.checks.map(({ name, contacts, samples }) => ({ name, contacts, samples })) })) }));
