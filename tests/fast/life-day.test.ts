import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AnimationMixer, Bone, SkinnedMesh, Vector3 } from 'three';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { castOf } from '../../src/render3d/life/cast';
import { loadAssets, type AssetManifest } from '../../src/render3d/assets';
import { actionClips } from '../../src/render3d/action-clips';

describe('IA-12 · jornada y acciones', () => {
  it.each([7, 23])('semilla %s: puestos distintos, menores y mayores libres, sin escribir en el motor', seed => {
    const state = foundTwenty(seed), before = JSON.stringify(state), life = createVillage(state, 0);
    const jobs = life.dwellers.flatMap(d => d.dayPlan?.job ? [d.dayPlan.job] : []);
    expect(jobs.length).toBeGreaterThan(0);
    expect(new Set(jobs.map(j => `${j.place}/${j.offer}/${j.seat}`)).size).toBe(jobs.length);
    const leisure = new Set<string>(), workers = new Set<number>();
    for (let step = 0; step < 1800; step++) {
      life.step(0.4);
      for (const d of life.dwellers) {
        if (d.ageGroup !== undefined) {
          expect(d.dayPlan?.job).toBeNull();
          expect(d.doing?.offer.id).not.toBe('work');
          if (d.doing?.there) leisure.add(`${d.ageGroup}:${d.doing.offer.id}`);
        }
        if (d.doing?.there && d.doing.offer.id === 'work') workers.add(d.villager);
      }
      for (const actor of castOf(life, step / 30, new Map(), new Set())) {
        if (actor.talking) expect(actor.clip).toBe('talk');
        if (actor.activity === 'working') expect(['work_hoe', 'hammer', 'chop', 'sort']).toContain(actor.clip);
      }
    }
    expect(workers.size).toBeGreaterThan(0);
    expect(leisure.has('child:play')).toBe(true);
    expect(leisure.has('elder:sit')).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });

  it.each(['villager', 'villager-priest', 'villager-elder'])('%s: clips nuevos compatibles, finitos y sin alterar el idle', async id => {
    const manifest = JSON.parse(readFileSync('public/assets/valley3d/manifest.json', 'utf8')) as AssetManifest;
    const library = await loadAssets({ baseUrl: '/', manifest: { ...manifest, assets: manifest.assets.filter(a => a.id === id) },
      bytes: { [id]: Uint8Array.from(readFileSync(`public/assets/valley3d/${id}.glb`)).buffer } });
    const idle = library.get(id)!.clips.find(c => c.name === 'idle')!;
    const original = JSON.stringify(idle.toJSON()), clips = actionClips(idle), object = library.instance(id)!;
    const mixer = new AnimationMixer(object);
    expect(clips.length).toBe(8);
    for (const clip of clips) {
      expect(clip.tracks.some(track => /^(upperarm|forearm|thigh)/.test(track.name)
        && JSON.stringify(Array.from(track.values)) !== JSON.stringify(Array.from(idle.tracks.find(t => t.name === track.name)!.values))),
      `${clip.name} debe cambiar las extremidades, no sólo renombrar idle`).toBe(true);
      mixer.stopAllAction(); const action = mixer.clipAction(clip).play();
      for (const t of [0, clip.duration / 4, clip.duration / 2, clip.duration - 0.00001]) {
        action.time = t; mixer.update(0); object.updateMatrixWorld(true);
        object.traverse(node => {
          if (node instanceof Bone) expect(node.matrixWorld.elements.every(Number.isFinite)).toBe(true);
          if (node instanceof SkinnedMesh) {
            node.skeleton.update();
            for (let i = 0; i < node.geometry.getAttribute('position').count; i += 29)
              expect(node.getVertexPosition(i, new Vector3()).toArray().every(Number.isFinite)).toBe(true);
          }
        });
      }
    }
    expect(JSON.stringify(idle.toJSON())).toBe(original);
    mixer.stopAllAction(); mixer.uncacheRoot(object); library.dispose();
  });
});
