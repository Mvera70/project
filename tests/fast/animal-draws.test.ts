// Un animal, una llamada de dibujo (revisión del 30 sep 2026, RV-1).
//
// Los animales facetados de la PR #3 eran nodos rígidos con una malla por
// pieza: 16 a 27 llamadas por animal, y la villa 7/60 pasó de 500 a 964 sin
// que nada lo avisara, porque la prueba de las piezas sólo recorría `PIECED`.
// Lo que se guarda aquí, sobre **todo modelo publicado que se anima** y por el
// mismo camino que el juego (`prepareModel`):
//
// - deja **una** malla al cargar;
// - se ve igual: la misma caja en reposo y en mitad de cada clip;
// - y los clips encuentran los mismos nodos que antes.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AnimationMixer, Box3, Mesh, SkinnedMesh, type AnimationClip, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { prepareModel } from '../../src/render3d/assets';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DIR = resolve(ROOT, 'public/assets/valley3d');
const manifest = JSON.parse(readFileSync(resolve(DIR, 'manifest.json'), 'utf8')) as {
  assets: { id: string; file: string; motion: unknown[] }[];
};

/** Las llamadas que un modelo animado puede costar por copia en escena. */
const BUDGET = 1;

async function load(file: string): Promise<{ scene: Object3D; animations: AnimationClip[] }> {
  const bytes = readFileSync(resolve(DIR, file));
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '');
}

const meshesOf = (root: Object3D): number => {
  let n = 0;
  root.traverse((node) => { if (node instanceof Mesh) n += 1; });
  return n;
};

/** Los nombres que un clip o un gesto pueden buscar: todo menos las pieles, que se funden. */
const namesOf = (root: Object3D): string[] => {
  const names: string[] = [];
  root.traverse((node) => { if (node.name !== '' && !(node instanceof SkinnedMesh)) names.push(node.name); });
  return names.sort();
};

function boxAt(scene: Object3D, clip: AnimationClip | null, time: number): Box3 {
  if (clip !== null) {
    const mixer = new AnimationMixer(scene);
    mixer.clipAction(clip).play();
    mixer.setTime(time);
  }
  scene.updateMatrixWorld(true);
  return new Box3().setFromObject(scene, true);
}

const animated = manifest.assets.filter((asset) => asset.motion.length > 0);

describe('todo modelo que se anima cuesta una llamada', () => {
  it('hay modelos animados que medir', () => {
    expect(animated.length).toBeGreaterThan(20);
  });

  it.each(animated.map((asset) => [asset.id, asset.file]))('%s: una malla al cargar, la misma forma y los mismos nodos', async (id, file) => {
    const raw = await load(file);
    const game = await load(file);
    const names = namesOf(raw.scene);
    prepareModel(id, game.scene, game.animations);
    expect(meshesOf(game.scene), id).toBeLessThanOrEqual(BUDGET);
    // Lo que se añade es el cuerpo; ningún nodo con nombre desaparece.
    const after = namesOf(game.scene);
    for (const name of names) expect(after, `${id}: ${name}`).toContain(name);
    for (const clip of game.animations) {
      for (const track of clip.tracks) {
        expect(game.scene.getObjectByName(track.name.split('.')[0]!), `${id}/${clip.name}: ${track.name}`).toBeDefined();
      }
    }
    const size = boxAt(raw.scene, null, 0).getSize(raw.scene.position.clone()).length();
    const poses: [AnimationClip | null, number][] = [[null, 0]];
    for (const clip of game.animations) poses.push([clip, clip.duration * 0.37]);
    for (const [clip, time] of poses) {
      const expected = boxAt(raw.scene, clip === null ? null : raw.animations.find((one) => one.name === clip.name)!, time);
      const got = boxAt(game.scene, clip, time);
      for (const axis of ['x', 'y', 'z'] as const) {
        const label = `${id}/${clip?.name ?? 'reposo'} ${axis}`;
        expect(Math.abs(got.min[axis] - expected.min[axis]), label).toBeLessThan(size * 1e-3);
        expect(Math.abs(got.max[axis] - expected.max[axis]), label).toBeLessThan(size * 1e-3);
      }
    }
  });
});
