// E4 · Gore contenido (decisión del dueño, 25 sep 2026): un golpe recibido
// salpica, la caída deja una mancha en el suelo, y la mancha se va sola en
// unas horas de juego. Se prueba con el reparto real y el modelo publicado.

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { AnimationClip, Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GORE } from '@engine/balance';
import { Cast } from '../../src/render3d/world/cast';
import { VILLAGER_CLIPS, type ClipName } from '../../src/render3d/clips';
import type { Actor } from '../../src/render3d/contracts';
import { SCENIC_DAY_SECONDS } from '../../src/render3d/presentation-clock';

let model: Object3D, clips: AnimationClip[];
beforeAll(async () => {
  const bytes = readFileSync('public/assets/valley3d/villager.glb');
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  model = gltf.scene; clips = gltf.animations;
});

const actor = (id: number, clip: ClipName, seconds: number): Actor => ({
  id, x: 4, z: 4, facing: 0, activity: 'resting', clip, clipSeconds: seconds,
  travelled: 0, cell: 0, named: false, age: 30, talking: false, arguing: false, occupation: null, role: null,
  poseSeconds: 100 + seconds,
});
const makeCast = (): Cast => new Cast({ id: 'villager', original: model, clips, motion: [] }, () => clone(model));

describe('E4 · gore contenido', () => {
  it('un golpe recibido salpica una vez, no en cada fotograma', () => {
    const cast = makeCast();
    cast.show([actor(1, 'idle', 0)]);
    for (let s = 0; s <= VILLAGER_CLIPS.hit_take.seconds; s += 1 / 30) cast.show([actor(1, 'hit_take', s)]);
    cast.chips.step(0.05, () => 0);
    // Cinco gotas por salpicadura, como las astillas de un hachazo.
    expect(cast.chips.alive).toBe(5);
  });

  it('la caída deja una mancha en el suelo, una por cuerpo', () => {
    const cast = makeCast();
    cast.show([actor(2, 'idle', 0), actor(3, 'idle', 0)]);
    for (let s = 0; s <= VILLAGER_CLIPS.fall.seconds + 0.5; s += 1 / 30) {
      cast.show([actor(2, 'fall', s), actor(3, 'fall', s)]);
    }
    expect(cast.stains.count).toBe(2);
  });

  it('y la mancha se desvanece sola en las horas que dice GORE', () => {
    const cast = makeCast();
    cast.show([actor(4, 'idle', 0)]);
    for (let s = 0; s <= VILLAGER_CLIPS.fall.seconds + 0.5; s += 1 / 30) cast.show([actor(4, 'fall', s)]);
    const hour = SCENIC_DAY_SECONDS / 24;
    cast.stains.step(hour * (GORE.STAIN_HOURS - 1));
    expect(cast.stains.count).toBe(1);
    cast.stains.step(hour * 1.5);
    expect(cast.stains.count).toBe(0);
  });
});
