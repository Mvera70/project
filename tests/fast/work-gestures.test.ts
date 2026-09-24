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
import { STRIKE_AT, VILLAGER_CLIPS } from '../../src/render3d/clips';
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
