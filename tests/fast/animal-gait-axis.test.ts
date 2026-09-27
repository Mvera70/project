import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AnimationMixer, Quaternion, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

interface Bone { name: string; head: number[]; tail: number[] }
interface Key { rotation: number[] }
interface Track { bone: string; keys: Key[] }
interface Clip { name: string; strideLength?: number; tracks: Track[] }
interface Recipe { rig: { bones: Bone[] }; clips: Clip[] }

const leg = /^(fore|hind)[LR](Lower|Foot)?$/;

describe.each(['deer', 'bear'])('%s gait axes', kind => {
  const recipe = JSON.parse(readFileSync(resolve(`art/recipes/${kind}/${kind}.json`), 'utf8')) as Recipe;

  it('bends the leg chains across the direction of travel, without twisting their shafts', () => {
    const bones = recipe.rig.bones.filter(bone => leg.test(bone.name));
    expect(bones).toHaveLength(12);
    for (const bone of bones) {
      expect(bone.tail[0]).toBeCloseTo(bone.head[0]!);
      expect(bone.tail[1]).toBeCloseTo(bone.head[1]!);
      expect(bone.tail[2]).toBeLessThan(bone.head[2]!);
    }
    const legTracks = recipe.clips.flatMap(clip => clip.tracks.filter(track => leg.test(track.bone)));
    expect(legTracks.length).toBeGreaterThanOrEqual(12);
    expect(legTracks.some(track => track.keys.some(key => Math.abs(key.rotation[2] ?? 0) > 1))).toBe(true);
    for (const track of legTracks) {
      for (const key of track.keys) expect(key.rotation[1]).toBe(0);
    }
    // La zancada la dice el paso, no un mínimo: el de 0,4 obligaba al ciervo
    // a declarar más de lo que su pata podía dar, y el casco patinaba.
    const walk = recipe.clips.find(clip => clip.name === 'walk');
    expect(walk?.strideLength).toBeGreaterThan(0);
  });
});

// **Y sobre el GLB publicado, que es lo que se juega** (27 sep 2026). La
// prueba de arriba mira la receta; la receta estaba arreglada y el GLB no se
// había reconstruido, y las patas del ciervo seguían girando sobre sí mismas
// en el juego sin que nada lo dijera.
describe('the published deer walks', () => {
  const load = async () => {
    const bytes = readFileSync(resolve('public/assets/valley3d/deer.glb'));
    return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  };
  const catalog = JSON.parse(readFileSync(resolve('art/catalog.json'), 'utf8')) as {
    assets: { id: string; motion?: { name: string; strideLength: number | null }[] }[];
  };
  const stride = catalog.assets.find(asset => asset.id === 'deer')?.motion?.find(clip => clip.name === 'walk')?.strideLength ?? 0;

  it('swings its legs across their shafts, never around them', async () => {
    const gltf = await load();
    const walk = gltf.animations.find(clip => clip.name === 'walk')!;
    const legTracks = walk.tracks.filter(track => /^(fore|hind)[LR](Lower)?\.quaternion$/.test(track.name));
    expect(legTracks.length).toBe(8);
    for (const track of legTracks) {
      const rest = new Quaternion().fromArray(track.values, 0).invert();
      let twist = 0, swing = 0;
      for (let k = 0; k < track.times.length; k += 1) {
        const delta = rest.clone().multiply(new Quaternion().fromArray(track.values, k * 4));
        // El eje Y local del hueso va a lo largo de la pata: girar ahí es girarla sobre sí misma.
        twist = Math.max(twist, Math.abs(delta.y));
        swing = Math.max(swing, Math.hypot(delta.x, delta.z));
      }
      expect(twist, `${track.name} gira sobre su eje`).toBeLessThan(0.02);
      expect(swing, `${track.name} no se mueve`).toBeGreaterThan(0.02);
    }
  });

  it('plants each hoof: on the ground it moves back as fast as the body moves on', async () => {
    const gltf = await load();
    const walk = gltf.animations.find(clip => clip.name === 'walk')!;
    const mixer = new AnimationMixer(gltf.scene);
    mixer.clipAction(walk).play();
    const samples = 96, dt = walk.duration / samples;
    const bodySpeed = stride / walk.duration;
    expect(stride).toBeGreaterThan(0);
    for (const hoof of ['foreLFoot', 'foreRFoot', 'hindLFoot', 'hindRFoot']) {
      const track: Vector3[] = [];
      for (let k = 0; k <= samples; k += 1) {
        mixer.setTime(k * dt);
        gltf.scene.updateMatrixWorld(true);
        track.push(gltf.scene.getObjectByName(hoof)!.getWorldPosition(new Vector3()));
      }
      const ground = Math.min(...track.map(p => p.y));
      const planted: number[] = [];
      for (let k = 1; k < track.length; k += 1) {
        if (track[k]!.y < ground + 0.004 && track[k - 1]!.y < ground + 0.004) planted.push((track[k]!.x - track[k - 1]!.x) / dt);
      }
      expect(planted.length, `${hoof} pisa`).toBeGreaterThan(samples * 0.3);
      const mean = planted.reduce((sum, v) => sum + v, 0) / planted.length;
      // La cabeza mira a -X: apoyado, el casco va hacia +X a la velocidad del cuerpo.
      expect(mean / bodySpeed, `${hoof} patina`).toBeGreaterThan(0.85);
      expect(mean / bodySpeed, `${hoof} patina`).toBeLessThan(1.15);
    }
  });
});
