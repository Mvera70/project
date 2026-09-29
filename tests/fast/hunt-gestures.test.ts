// AN-5a/b · La caza decide con el cuerpo que se pinta: la punta de cada
// estocada en su contacto (t = 0) y la mano de la que sale el tiro al soltar,
// medidas sobre el GLB publicado con el montaje del juego (`world/cast.ts`, el
// arma colgada de la mano por su `grip`). Si el gesto o el arma cambian, esta
// prueba falla y `THRUST` y `RELEASE` se vuelven a medir. Es la gemela de
// `work-gestures.test.ts`, que vigila la cabeza del hacha.

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { Vector3, type AnimationClip, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Cast } from '../../src/render3d/world/cast';
import type { Actor } from '../../src/render3d/contracts';
import { RELEASE, THRUST } from '../../src/render3d/life/hunt-shot';

async function load(id: string): Promise<{ scene: Object3D; clips: AnimationClip[] }> {
  const bytes = readFileSync(`public/assets/valley3d/${id}.glb`);
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  return { scene: gltf.scene, clips: gltf.animations };
}

let villager: { scene: Object3D; clips: AnimationClip[] };
const weapons = new Map<string, Object3D>();
beforeAll(async () => {
  villager = await load('villager');
  for (const id of ['spear', 'bow', 'sling']) weapons.set(id, (await load(id)).scene);
});

/** Posa al aldeano en ese instante del clip con el arma en la mano, mirando a +z desde el origen. */
function posed(clip: Actor['clip'], weapon: 'spear' | 'bow' | 'sling'): Cast {
  const cast = new Cast({ id: 'villager', original: villager.scene, clips: villager.clips, motion: [] },
    () => clone(villager.scene), id => weapons.get(id)?.clone());
  cast.show([{ id: 7, x: 0, z: 0, facing: 0, activity: 'resting', clip, clipSeconds: 0, travelled: 0, cell: 0,
    named: false, age: 30, talking: false, arguing: false, occupation: null, role: null, weapon } as Actor]);
  cast.group.updateMatrixWorld(true);
  return cast;
}

/** El vértice más adelantado (+z) del arma que lleva en la mano. */
function tipOf(cast: Cast, weapon: string): Vector3 {
  let tip: Vector3 | null = null;
  cast.group.getObjectByName(`Held_weapon_${weapon}`)!.traverse((node) => {
    const mesh = node as Object3D & { isMesh?: boolean; geometry?: { getAttribute(name: string): { count: number; getX(i: number): number; getY(i: number): number; getZ(i: number): number } } };
    if (mesh.isMesh !== true || mesh.geometry === undefined) return;
    const position = mesh.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i += 1) {
      const at = new Vector3(position.getX(i), position.getY(i), position.getZ(i)).applyMatrix4(node.matrixWorld);
      if (tip === null || at.z > tip.z) tip = at;
    }
  });
  return tip!;
}

const close = (at: Vector3, expected: { x: number; y: number; z: number }, label: string): void => {
  expect(at.x, `${label} x`).toBeCloseTo(expected.x, 2);
  expect(at.y, `${label} y`).toBeCloseTo(expected.y, 2);
  expect(at.z, `${label} z`).toBeCloseTo(expected.z, 2);
};

describe('AN-5 · los gestos que deciden la caza, medidos sobre lo que se pinta', () => {
  it.each(Object.keys(THRUST) as (keyof typeof THRUST)[])('la estocada %s: la mano y la punta en el contacto', (variant) => {
    const { clip, hand, tip } = THRUST[variant];
    const cast = posed(clip, 'spear');
    close(cast.group.getObjectByName('hand_r')!.getWorldPosition(new Vector3()), hand, 'mano');
    close(tipOf(cast, 'spear'), tip, 'punta');
  });

  it('las tres estocadas clavan a tres alturas, y la baja entra hacia abajo', () => {
    expect(THRUST.low.tip.y).toBeLessThan(THRUST.chest.tip.y);
    expect(THRUST.chest.tip.y).toBeLessThan(THRUST.high.tip.y);
    expect(THRUST.low.tip.y, 'la baja baja').toBeLessThan(THRUST.low.hand.y - 0.1);
  });

  it('el tiro sale de la mano que suelta: la del arco con el arco, la de la honda con la honda', () => {
    close(posed('bow_loose', 'bow').group.getObjectByName('hand_l')!.getWorldPosition(new Vector3()), RELEASE.bow, 'arco');
    close(tipOf(posed('bow_loose', 'sling'), 'sling'), RELEASE.sling, 'honda');
    // Y a la altura del pecho de quien tira, no a los 1,2 de antes (tres metros y medio).
    expect(RELEASE.bow.y).toBeLessThan(0.65);
  });
});
