/** Monta el portón ancho aislado con las transformaciones de una villa real, sin GPU ni archivos de salida. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Box3, type Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { foundGame } from '../../../src/engine/found';
import { run } from '../../../src/engine/sim';
import { CATALOG } from '../../../src/engine/crossroads/catalog';
import { planFor } from '../../../src/render3d/world/plan';
import { buildFromAsset } from '../../../src/render3d/world/buildings';

const root = resolve(import.meta.dirname, '../../..');
const candidate = resolve(root,
  'artifacts/graphics/E3b2-candidates/gate-wide-review-01/e3b-gate-wide-opening-candidate.glb');
const wallAsset = resolve(root, 'public/assets/valley3d/wall.glb');
async function load(path: string): Promise<Object3D> {
  const bytes = await readFile(path);
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  return gltf.scene;
}
function named(model: Object3D, name: string): Box3 {
  const part = model.getObjectByName(name);
  if (part === undefined) throw new Error(`Falta ${name}`);
  return new Box3().setFromObject(part);
}
const [gateSource, wallSource] = await Promise.all([load(candidate), load(wallAsset)]);
const reports = [];
for (const [seed, gateId] of [[91, 71], [23, 41]] as const) {
  const state = foundGame(seed);
  run(state, 3846, 'prudent', CATALOG);
  const plan = planFor(state);
  const gate = plan.buildings.find(item => item.id === gateId && item.kind === 'gate');
  if (gate === undefined) throw new Error(`La muestra seed${seed} ya no coincide`);
  const wall = plan.buildings.find(item => item.kind === 'wall'
    && Math.abs(item.x - gate.x) + Math.abs(item.z - gate.z) === 1);
  if (wall === undefined) throw new Error(`El portón ${gateId} no tiene pared cardinal`);
  const gateModel = buildFromAsset(gate, gateSource.clone(true));
  const wallModel = buildFromAsset(wall, wallSource.clone(true));
  gateModel.object.updateMatrixWorld(true);
  wallModel.object.updateMatrixWorld(true);
  const jambs = [named(gateModel.object, 'Gate_Stone_Jamb_L'),
    named(gateModel.object, 'Gate_Stone_Jamb_R')];
  const door = named(gateModel.object, 'gate_door');
  if (gateModel.object.getObjectByName('DoorHinge') === undefined) {
    throw new Error(`La escena seed${seed} no conserva la bisagra`);
  }
  const axis = gate.gate === 'x' ? 'z' : 'x';
  jambs.sort((a, b) => a.min[axis] - b.min[axis]);
  const opening = jambs[1]!.min[axis] - jambs[0]!.max[axis];
  const center = new Box3().union(jambs[0]!).union(jambs[1]!).getCenter(new Vector3());
  const wallBounds = new Box3().setFromObject(wallModel.object);
  const gateBounds = new Box3().setFromObject(gateModel.object);
  if (Math.abs(opening - 0.84) > 1e-4) throw new Error(`Vano real estrechado: ${opening}`);
  if (Math.hypot(center.x - (gate.x + 0.5), center.z - (gate.z + 0.5)) > 0.04) {
    throw new Error(`Portón seed${seed} desplazado de la parcela: ${center.toArray()}`);
  }
  if (gateBounds.min.x < gate.x - 0.2 || gateBounds.max.x > gate.x + 1.2
    || gateBounds.min.z < gate.z - 0.2 || gateBounds.max.z > gate.z + 1.2) {
    throw new Error(`El marco seed${seed} se sale de la parcela real`);
  }
  reports.push({ seed, tick: state.tick, gate: { id: gate.id, x: gate.x, z: gate.z,
    axis: gate.gate, cornerLinks: gate.gateCornerLinks, stoneOpening: opening,
    center: center.toArray(), bounds: { min: gateBounds.min.toArray(), max: gateBounds.max.toArray() },
    doorBounds: { min: door.min.toArray(), max: door.max.toArray() } },
  wall: { id: wall.id, x: wall.x, z: wall.z, mask: wall.connections,
    bounds: { min: wallBounds.min.toArray(), max: wallBounds.max.toArray() } } });
  gateModel.dispose();
  wallModel.dispose();
}
console.log(JSON.stringify({ reports,
  limit: 'Transformación y vano con modelos reales; no es captura, ni acredita el apoyo del adarve o la costura diagonal.' }, null, 2));
