// AN-1 · Al pararse, la pierna que iba en el aire baja y planta.
//
// El fundido de 0,22 s desde `walk` congelaba la zancada donde el suelo
// recorrido la había dejado y la derretía hacia el reposo: un pie colgado a
// media altura que bajaba en diagonal hasta debajo de la cadera. Lo que se
// guarda aquí es la propiedad y no los ángulos: mientras se funde, el clip de
// marcha que se apaga sigue su ciclo a su ritmo natural, así que el pie que
// estaba en vuelo **adelanta y baja** antes de recogerse; y el fundido sigue
// acabando donde acababa, en la pose de `idle`.
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { Quaternion, Vector3, type AnimationClip, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Cast } from '../../src/render3d/world/cast';
import { VILLAGER_CLIPS } from '../../src/render3d/clips';
import type { Actor } from '../../src/render3d/contracts';

let model: Object3D, clips: AnimationClip[];
beforeAll(async () => {
  const bytes = readFileSync('public/assets/valley3d/villager.glb');
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  model = gltf.scene; clips = gltf.animations;
});

const walker = (travelled: number, now: number): Actor => ({
  id: 1, x: 0, z: 0, facing: 0, activity: 'walking', clip: 'walk', clipSeconds: now, poseSeconds: now,
  travelled, cell: 0, named: false, age: 30, talking: false, arguing: false, occupation: null, role: null,
});
const stander = (travelled: number, now: number): Actor => ({ ...walker(travelled, now), clip: 'idle', activity: 'resting' });
const makeCast = (): Cast => new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model));

function feet(cast: Cast): Record<'L' | 'R', Vector3> {
  cast.group.updateMatrixWorld(true);
  return {
    L: cast.group.getObjectByName('footL')!.getWorldPosition(new Vector3()),
    R: cast.group.getObjectByName('footR')!.getWorldPosition(new Vector3()),
  };
}

/** La pose en el mundo: dónde está cada hueso y hacia dónde apunta (un cuaternión y su opuesto son la misma pose). */
function bones(cast: Cast): number[] {
  const values: number[] = [];
  cast.group.updateMatrixWorld(true);
  cast.group.traverse(node => {
    if (node.type !== 'Bone') return;
    values.push(...node.getWorldPosition(new Vector3()).toArray());
    values.push(...new Vector3(0, 1, 0).applyQuaternion(node.getWorldQuaternion(new Quaternion())).toArray());
  });
  return values;
}

describe('AN-1 · la parada del aldeano', () => {
  /** La fase de la zancada con un pie más alto que el otro: ése es el que vuela. */
  function midSwing(cast: Cast): { travelled: number; foot: 'L' | 'R' } {
    const stride = VILLAGER_CLIPS.walk.strideLength!;
    let best = { travelled: 0, lift: -1, foot: 'L' as 'L' | 'R' };
    for (let n = 0; n < 24; n += 1) {
      const travelled = stride * n / 24;
      cast.show([walker(travelled, 100)]);
      const f = feet(cast);
      const lift = Math.abs(f.L.y - f.R.y);
      if (lift > best.lift) best = { travelled, lift, foot: f.L.y > f.R.y ? 'L' : 'R' };
    }
    return best;
  }

  it('al parar, el pie que iba en el aire adelanta y baja en vez de quedarse colgado', () => {
    const cast = makeCast();
    const { travelled, foot } = midSwing(cast);
    cast.show([walker(travelled, 100)]);
    const flying = feet(cast)[foot];
    // El mismo instante, ya parado: sin salto en el fotograma del cambio.
    cast.show([stander(travelled, 100)]);
    const atStop = feet(cast)[foot];
    expect(atStop.distanceTo(flying)).toBeLessThan(0.01);
    // Ocho centésimas después: el pie ha seguido su zancada hacia delante y
    // hacia el suelo, no se ha quedado donde estaba.
    cast.show([stander(travelled, 100.08)]);
    const later = feet(cast)[foot];
    expect(later.z - atStop.z, 'adelanta').toBeGreaterThan(0.02);
    expect(later.y, 'baja').toBeLessThan(atStop.y);
  });

  it('el fundido sigue acabando en el reposo: pasados los 0,22 s la pose es la de idle', () => {
    const cast = makeCast();
    const { travelled } = midSwing(cast);
    cast.show([walker(travelled, 100)]);
    // Se para en 100 (ahí empieza el fundido) y se mira pasado el fundido.
    cast.show([stander(travelled, 100)]);
    cast.show([stander(travelled, 100.3)]);
    const fresh = makeCast();
    fresh.show([stander(travelled, 100.3)]);
    const a = bones(cast), b = bones(fresh);
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i += 1) expect(Math.abs(a[i]! - b[i]!)).toBeLessThan(1e-5);
  });
});
