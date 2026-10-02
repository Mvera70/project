// v5.100 · Los animales rehechos: la cigüeña, su nido, el polluelo, la grulla,
// la mariposa y el caballo, con el camino de los animales del valle
// (`build-models.py` + `rigid-clips.mjs`) en vez de los candidatos de Astra.
//
// Lo que se guarda: que cada uno cabe en el presupuesto del encargo; que el
// caballo planta el casco como el ciervo; que la cigüeña del juego pica hasta
// el suelo, da el paso con las patas sin meterlas en él y lo da por el suelo
// recorrido y no por el reloj; y que la grulla del cielo es la grulla, con su
// envergadura, y no la golondrina teñida.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AnimationMixer, Box3, Camera, InstancedMesh, Matrix4, Vector3, type BufferAttribute, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TIME } from '@engine/balance';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { loadAssets } from '../../src/render3d/assets';
import { createSeasonalFauna } from '../../src/render3d/effects/seasonal-fauna';
import { createAmbience } from '../../src/render3d/effects/ambience';

interface CatalogAsset { id: string; statistics: { triangles: number } | null; approved: { directory: string } | null;
  motion: { name: string; strideLength: number | null }[] }
const catalog = JSON.parse(readFileSync('art/catalog.json', 'utf8')) as { assets: CatalogAsset[] };
const manifest = JSON.parse(readFileSync('public/assets/valley3d/manifest.json', 'utf8')) as { schemaVersion: 1; generatedAt: string;
  assets: { id: string; file: string; sha256: string; motion: { name: string; seconds: number; loop: boolean; strideLength: number | null }[] }[] };

/**
 * Los presupuestos del encargo (`encargo-astra-tanda-larga-2026-10-02.md`,
 * bloques 6 y 7). El polluelo es la excepción declarada: con 80 triángulos
 * salía lleno de picos y Vera no lo aceptó («muchos vértices»); con esferas de
 * diez husos, como las de la gallina, son 460, en una llamada de dibujo igual.
 */
const BUDGET: Record<string, number> = { stork: 250, 'stork-nest': 200, chick: 480, crane: 150, butterfly: 16, horse: 900 };

async function library(...ids: string[]) {
  const bytes = Object.fromEntries(ids.map((id) => [id, Uint8Array.from(readFileSync(`public/assets/valley3d/${id}.glb`)).buffer]));
  return loadAssets({ baseUrl: '/', manifest: { ...manifest, assets: manifest.assets.filter((a) => ids.includes(a.id)) }, bytes });
}

/** La aldea a mitad del verano o del otoño del primer año, a mediodía. */
function inSeason(state: GameState, season: 'summer' | 'autumn'): GameState {
  return { ...state, tick: (season === 'summer' ? 1 : 2) * TIME.WEEKS_PER_SEASON + 6 };
}

/** Los puntos de una malla instanciada, en el mundo, para la instancia `n`. */
function worldPoints(mesh: InstancedMesh, n: number): Vector3[] {
  const matrix = new Matrix4();
  mesh.getMatrixAt(n, matrix);
  const position = mesh.geometry.getAttribute('position');
  return Array.from({ length: position.count }, (_, v) => new Vector3().fromBufferAttribute(position, v).applyMatrix4(matrix));
}

describe('v5.100 · los animales rehechos', () => {
  it.each(Object.keys(BUDGET))('%s cabe en el presupuesto del encargo', (id) => {
    const asset = catalog.assets.find((a) => a.id === id);
    expect(asset?.statistics?.triangles).toBeGreaterThan(0);
    expect(asset!.statistics!.triangles).toBeLessThanOrEqual(BUDGET[id]!);
  });

  it('el caballo planta el casco: apoyado, va hacia atrás a la velocidad del cuerpo', async () => {
    const asset = catalog.assets.find((a) => a.id === 'horse')!;
    const bytes = readFileSync(resolve(asset.approved!.directory, 'horse.glb'));
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const walk = gltf.animations.find((clip) => clip.name === 'walk')!;
    const stride = asset.motion.find((clip) => clip.name === 'walk')!.strideLength!;
    const mixer = new AnimationMixer(gltf.scene);
    mixer.clipAction(walk).play();
    const samples = 96, dt = walk.duration / samples, bodySpeed = stride / walk.duration;
    for (const hoof of ['foreLFoot', 'foreRFoot', 'hindLFoot', 'hindRFoot']) {
      const track: Vector3[] = [];
      for (let k = 0; k <= samples; k += 1) {
        mixer.setTime(k * dt);
        gltf.scene.updateMatrixWorld(true);
        track.push(gltf.scene.getObjectByName(hoof)!.getWorldPosition(new Vector3()));
      }
      const ground = Math.min(...track.map((p) => p.y));
      const planted: number[] = [];
      for (let k = 1; k < track.length; k += 1) {
        if (track[k]!.y < ground + 0.004 && track[k - 1]!.y < ground + 0.004) planted.push((track[k]!.x - track[k - 1]!.x) / dt);
      }
      expect(planted.length, `${hoof} pisa`).toBeGreaterThan(samples * 0.3);
      const mean = planted.reduce((sum, v) => sum + v, 0) / planted.length;
      expect(mean / bodySpeed, `${hoof} patina`).toBeGreaterThan(0.85);
      expect(mean / bodySpeed, `${hoof} patina`).toBeLessThan(1.15);
    }
  });

  it('la cigüeña pica hasta el suelo y da el paso sin meter las patas en él', async () => {
    const lib = await library('stork');
    let pecked = 0, stepped = 0;
    for (const seed of [7, 11, 23, 41]) {
      const effect = createSeasonalFauna({ stork: lib.get('stork') });
      const state = inSeason(foundTwenty(seed), 'summer');
      const meshes = effect.group.children.filter((child): child is InstancedMesh => child instanceof InstancedMesh);
      // Cuerpo, cuello, las dos patas, las alas de las mariposas y las abejas.
      expect(meshes).toHaveLength(6);
      const [, neck, legL, legR] = meshes as [InstancedMesh, InstancedMesh, InstancedMesh, InstancedMesh];
      let lowestBill = Infinity;
      const legAngles: number[] = [];
      for (let seconds = 0; seconds < 12; seconds += 0.1) {
        effect.update(state, 0.5, 'clear', seconds, () => 0);
        if (effect.visible.storks === 0) continue;
        lowestBill = Math.min(lowestBill, ...worldPoints(neck, 0).map((p) => p.y));
        for (const leg of [legL, legR]) {
          // Las patas nunca se meten en el suelo.
          expect(Math.min(...worldPoints(leg, 0).map((p) => p.y))).toBeGreaterThan(-0.02);
        }
        const matrix = new Matrix4();
        legL.getMatrixAt(0, matrix);
        legAngles.push(new Vector3(0, -1, 0).transformDirection(matrix).y);
      }
      if (legAngles.length === 0) continue;
      if (lowestBill < 0.04) pecked += 1;
      if (Math.max(...legAngles) - Math.min(...legAngles) > 0.001) stepped += 1;
      effect.dispose();
    }
    expect(pecked).toBeGreaterThanOrEqual(3);
    expect(stepped).toBeGreaterThanOrEqual(3);
  });

  it('la cigüeña da el paso por el suelo recorrido: el mismo trecho, la misma pose a cualquier ritmo de dibujo', async () => {
    const lib = await library('stork');
    const state = inSeason(foundTwenty(11), 'summer');
    const pose = (frames: number): number[] => {
      const effect = createSeasonalFauna({ stork: lib.get('stork') });
      for (let k = 0; k <= frames; k += 1) effect.update(state, 0.5, 'clear', (6 * k) / frames, () => 0);
      const leg = effect.group.children[2] as InstancedMesh;
      const matrix = new Matrix4();
      leg.getMatrixAt(0, matrix);
      effect.dispose();
      return matrix.elements;
    };
    const slow = pose(30), fast = pose(360);
    slow.forEach((value, k) => expect(value).toBeCloseTo(fast[k]!, 6));
  });

  it('la grulla del cielo es la grulla, con su envergadura, y bate sobre el hombro', async () => {
    const lib = await library('bird', 'crane');
    const crane = lib.get('crane')!.original;
    const state = inSeason(foundTwenty(11), 'autumn');
    const ambience = createAmbience(state.map, lib.get('bird')!.original, crane);
    const flock = ambience.group.getObjectByName('Valley_Cranes')!;
    const pieces = flock.children as InstancedMesh[];
    expect(pieces).toHaveLength(3);
    // Las piezas son las de la grulla (color en el vértice), no las de la golondrina.
    for (const piece of pieces) expect(piece.geometry.getAttribute('color')).toBeDefined();
    let seen = false;
    for (let s = 0; s < 120 && !seen; s += 1) {
      ambience.step(0.45, 'autumn', 'clear', s, new Camera());
      if (ambience.visible.cranes === 0) continue;
      seen = true;
      // De punta a punta de las alas, en el mundo: lo que ocupaba la uve (1,8 celdas).
      const box = new Box3();
      for (const piece of pieces) for (const p of worldPoints(piece, 0)) box.expandByPoint(p);
      const across = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
      expect(across).toBeGreaterThan(1.2);
      expect(across).toBeLessThan(2.4);
    }
    expect(seen).toBe(true);
    // El ala tiene el origen en el hombro: su punto más cercano al cuerpo está a menos de un palmo de él.
    const wing = new Box3().setFromBufferAttribute(pieces[1]!.geometry.getAttribute('position') as BufferAttribute);
    expect(Math.min(Math.abs(wing.min.x), Math.abs(wing.max.x))).toBeLessThan(0.02);
    ambience.dispose();
  });

  it('el polluelo es su modelo y anda con los clips de la gallina', async () => {
    const lib = await library('chick');
    const chick = lib.get('chick')!;
    expect(chick.clips.map((clip) => clip.name).sort()).toEqual(['idle', 'walk']);
    const object: Object3D = lib.instance('chick')!;
    expect(object.getObjectByName('legL')).toBeDefined();
    expect(object.getObjectByName('neck')).toBeDefined();
  });
});
