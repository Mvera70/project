// IA-anim · Talar y picar: gestos con carga, golpe y herramienta que se ve.
//
// Hasta esta ronda `chop` era el martillo con el otro brazo encima —un vaivén
// delante del pecho— y la cantera usaba el martillo pequeño de la fragua. Lo
// que se guarda aquí es la forma del gesto sobre el GLB publicado, no sus
// ángulos: si la carga no sube por encima de la cabeza o el golpe no baja,
// el aldeano vuelve a parecer que se frota las manos.

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { Mesh, Vector3, type AnimationClip, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Cast } from '../../src/render3d/world/cast';
import { STRIKE_AT, STRIKE_HEAD, VILLAGER_CLIPS } from '../../src/render3d/clips';
import { handTool } from '../../src/render3d/hand-tools';
import type { Actor } from '../../src/render3d/contracts';

let model: Object3D, clips: AnimationClip[];
beforeAll(async () => {
  const bytes = readFileSync('public/assets/valley3d/villager.glb');
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  model = gltf.scene; clips = gltf.animations;
});

const actor = (clip: 'chop' | 'mine', seconds: number): Actor => ({
  id: 7, x: 0, z: 0, facing: 0, activity: 'working', clip, clipSeconds: seconds,
  travelled: 0, cell: 0, named: false, age: 30, talking: false, arguing: false, occupation: null, role: null,
});

function handAt(clip: 'chop' | 'mine', fraction: number): Vector3 {
  const cast = new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model));
  cast.show([actor(clip, fraction * VILLAGER_CLIPS[clip].seconds)]);
  cast.group.updateMatrixWorld(true);
  return cast.group.getObjectByName('hand_r')!.getWorldPosition(new Vector3());
}

/** La coronilla en reposo, para medir «por encima de la cabeza». */
function headTop(): number {
  const cast = new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model));
  cast.show([{ ...actor('chop', 0), clip: 'idle', activity: 'resting' }]);
  cast.group.updateMatrixWorld(true);
  return cast.group.getObjectByName('head')!.getWorldPosition(new Vector3()).y;
}

describe('IA-anim · gestos de talar y picar', () => {
  it.each(['chop', 'mine'] as const)('%s carga por encima de la cabeza y golpea abajo', (clip) => {
    const at = STRIKE_AT[clip];
    const up = handAt(clip, at - 0.12), hit = handAt(clip, at);
    const head = headTop();
    // La carga: la mano, a la altura de la cabeza o más.
    expect(up.y, 'carga').toBeGreaterThan(head * 0.95);
    // El golpe baja al menos media altura de cabeza respecto a la carga.
    expect(up.y - hit.y, 'recorrido del golpe').toBeGreaterThan(head * 0.45);
    // Y el pico baja más que el hacha: uno clava al suelo, el otro barre el tronco.
    if (clip === 'mine') expect(hit.y).toBeLessThan(handAt('chop', STRIKE_AT.chop).y);
  });

  it('el golpe es rápido y la carga lenta', () => {
    for (const clip of ['chop', 'mine'] as const) {
      const at = STRIKE_AT[clip];
      const fall = handAt(clip, at - 0.12).y - handAt(clip, at).y;
      const rise = handAt(clip, at - 0.12).y - handAt(clip, 0).y;
      // Baja en 0,12 del ciclo lo que sube en el resto hasta la carga.
      expect(fall, clip).toBeGreaterThan(0);
      expect(fall / 0.12, clip).toBeGreaterThan(rise / (at - 0.12));
    }
  });

  it('hacha y pico existen como herramienta y miden como una, no como un palillo', () => {
    for (const clip of ['chop', 'mine'] as const) {
      const tool = handTool(clip);
      expect(tool, clip).toBeDefined();
      let tallest = 0;
      tool!.traverse(node => { if (node instanceof Mesh) { node.geometry.computeBoundingBox(); tallest = Math.max(tallest, node.geometry.boundingBox!.max.y - node.geometry.boundingBox!.min.y); } });
      // En metros, como el resto de respaldos: un mango de un metro.
      expect(tallest, clip).toBeGreaterThanOrEqual(0.9);
    }
  });
});

describe('IA-anim · el árbol acusa el hachazo y el leñador pega al tronco', () => {
  it('sway inclina sólo el árbol golpeado y lo devuelve a su sitio', async () => {
    const { Group, Matrix4, Mesh, MeshStandardMaterial, BoxGeometry, InstancedMesh } = await import('three');
    const { buildForest } = await import('../../src/render3d/world/forest');
    const { foundTwenty } = await import('../helpers/founding');
    const { TERRAIN_CODE } = await import('@engine/state');
    const state = foundTwenty(7);
    const cells = Array.from(state.map.terrain).flatMap((kind, cell) => kind === TERRAIN_CODE.forest ? [cell] : []).slice(0, 5);
    expect(cells.length).toBeGreaterThan(1);
    const tree = new Group(); tree.add(new Mesh(new BoxGeometry(0.2, 2, 0.2), new MeshStandardMaterial({ name: 'bark' })));
    const forest = buildForest(state, tree);
    const meshes: InstanceType<typeof InstancedMesh>[] = [];
    forest.group.traverse(node => { if (node instanceof InstancedMesh) meshes.push(node); });
    const read = (): number[][] => meshes.flatMap(mesh => Array.from({ length: mesh.count }, (_, i) => {
      const m = new Matrix4(); mesh.getMatrixAt(i, m); return Array.from(m.elements);
    }));
    const before = read();
    expect(forest.sway(cells[1]!, 1, 0, 0.05)).toBe(true);
    const tilted = read();
    const moved = tilted.filter((m, i) => m.some((v, k) => Math.abs(v - before[i]![k]!) > 1e-6)).length;
    expect(moved, 'sólo el árbol de esa celda').toBe(1);
    forest.sway(cells[1]!, 1, 0, 0);
    expect(read().every((m, i) => m.every((v, k) => Math.abs(v - before[i]![k]!) < 1e-6))).toBe(true);
    forest.dispose();
  });

  it('las plazas del tajo rodean el tronco de verdad, a un hachazo', async () => {
    const { foundGame } = await import('../../src/engine/found');
    const { run } = await import('../../src/engine/sim');
    const { CATALOG } = await import('../../src/engine/crossroads/catalog');
    const { placesOf } = await import('../../src/render3d/life/offers');
    const { terrainOf } = await import('../../src/render3d/life/terrain');
    const { scatterTransform } = await import('../../src/render3d/world/forest');
    // Medido el 24 sep 2026: la 11 deja las cuatro primeras a 0,50; la 23, a 0,70 y 0,80.
    let near = 0, total = 0;
    for (const [seed, years] of [[11, 21], [23, 30]] as const) {
      const state = foundGame(seed); run(state, years * 48, 'prudent', CATALOG);
      const felling = placesOf(state, terrainOf(state)).find(place => place.id.startsWith('felling:'));
      if (felling === undefined) continue;
      const trunk = scatterTransform(state.map.width, Number(felling.id.split(':')[1]));
      const first = felling.offers[0]!.spots![0]!;
      total += 1;
      if (Math.hypot(first.x - trunk.x, first.z - trunk.z) <= 0.81) near += 1;
    }
    expect(total).toBeGreaterThan(0);
    expect(near).toBe(total);
  });
});

describe('IA-anim · el hacha corta con el filo', () => {
  it('en el golpe, el filo va por delante del movimiento de la cabeza', async () => {
    const { Quaternion } = await import('three');
    // El filo mira hacia −X de la cabeza (`hand-tools.ts`). Vera vio el primer
    // hacha pegando con el lomo: esta prueba lo habría cazado.
    const cast = new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model));
    const headAt = (fraction: number): { at: Vector3; edge: Vector3 } => {
      cast.show([actor('chop', fraction * VILLAGER_CLIPS.chop.seconds)]);
      cast.group.updateMatrixWorld(true);
      const hand = cast.group.getObjectByName('hand_r')!;
      let tool = hand.children.find(child => child.name === 'IA_test_axe');
      if (tool === undefined) { tool = handTool('chop')!; tool.name = 'IA_test_axe'; hand.add(tool); cast.group.updateMatrixWorld(true); }
      const inner = tool.children[0]!;
      return { at: inner.children[1]!.getWorldPosition(new Vector3()),
        edge: new Vector3(-1, 0, 0).applyQuaternion(inner.getWorldQuaternion(new Quaternion())) };
    };
    const before = headAt(STRIKE_AT.chop - 0.03), hit = headAt(STRIKE_AT.chop);
    const motion = hit.at.clone().sub(before.at).normalize();
    expect(hit.edge.dot(motion)).toBeGreaterThan(0.3);
  });
});

describe('IA-anim · STRIKE_HEAD es lo que el GLB hace', () => {
  it.each(['chop', 'mine'] as const)('la cabeza de %s cae donde dice la tabla', (clip) => {
    const cast = new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model));
    cast.show([actor(clip, STRIKE_AT[clip] * VILLAGER_CLIPS[clip].seconds)]);
    cast.group.updateMatrixWorld(true);
    const hand = cast.group.getObjectByName('hand_r')!;
    const tool = handTool(clip)!; hand.add(tool); cast.group.updateMatrixWorld(true);
    const far = tool.children[0]!.children.map(child => child.getWorldPosition(new Vector3()))
      .reduce((a, b) => (Math.hypot(b.x, b.z) > Math.hypot(a.x, a.z) ? b : a));
    // La vida coloca al trabajador con estos números: si el gesto cambia, se vuelven a medir.
    expect(Math.abs(far.x - STRIKE_HEAD[clip].x)).toBeLessThan(0.03);
    expect(Math.abs(far.z - STRIKE_HEAD[clip].z)).toBeLessThan(0.03);
  });
});
