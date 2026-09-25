// Los modelos de Vera hechos pieza a pieza (`deliverables/marked-models-trial/`):
// al cargarlos se funden las piezas que se mueven juntas (`fuseRigidPieces`), y
// los animales traen `idle` y `walk` sobre sus nodos (`tools/art/rigid-clips.mjs`).
// Lo que se vigila: menos llamadas de dibujo, la misma forma, y los clips siguen
// teniendo a quién mover.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Box3, Mesh, type AnimationClip, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { fuseRigidPieces, PIECED } from '../../src/render3d/assets';

const ROOT = resolve(import.meta.dirname, '..', '..');
const ANIMALS = new Set(['wolf', 'bear', 'partridge', 'boar', 'dog', 'mule']);

async function load(id: string): Promise<{ scene: Object3D; animations: AnimationClip[] }> {
  const bytes = readFileSync(resolve(ROOT, 'public/assets/valley3d', `${id}.glb`));
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '');
}

const meshesOf = (root: Object3D): number => {
  let n = 0;
  root.traverse((node) => { if (node instanceof Mesh) n += 1; });
  return n;
};

describe('Los modelos pieza a pieza, en el juego', () => {
  it.each([...PIECED])('%s: se funde sin cambiar de forma, y sus clips siguen moviendo algo', async (id) => {
    const gltf = await load(id);
    const before = meshesOf(gltf.scene);
    const box = new Box3().setFromObject(gltf.scene);
    fuseRigidPieces(gltf.scene, gltf.animations);
    const after = meshesOf(gltf.scene);
    expect(after).toBeLessThanOrEqual(before);
    // Medido al escribirlo: los animales pasan de 40–68 mallas a 22–40, y las
    // herramientas de 6–25 a 4–6. Lo que queda son materiales distintos en cada
    // articulación, que no se pueden fundir sin cambiar el modelo.
    if (before > 8) expect(after, `${id}: ${before} → ${after}`).toBeLessThan(before * 0.75);
    const fusedBox = new Box3().setFromObject(gltf.scene);
    for (const axis of ['x', 'y', 'z'] as const) {
      expect(fusedBox.min[axis]).toBeCloseTo(box.min[axis], 3);
      expect(fusedBox.max[axis]).toBeCloseTo(box.max[axis], 3);
    }
    for (const clip of gltf.animations) {
      for (const track of clip.tracks) {
        expect(gltf.scene.getObjectByName(track.name.split('.')[0]!), `${id}/${clip.name}: ${track.name}`).toBeDefined();
      }
    }
    if (ANIMALS.has(id)) {
      expect(gltf.animations.map((clip) => clip.name)).toEqual(expect.arrayContaining(['idle', 'walk']));
    }
  });
});
