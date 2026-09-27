// P5 · El contrato entre clips exportados y acciones generadas.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Bone, type AnimationClip } from 'three';
import { describe, expect, it } from 'vitest';
import { actionClips } from '../../src/render3d/action-clips';
import { loadAssets, type AssetManifest, type LoadedAsset } from '../../src/render3d/assets';
import { VILLAGER_CLIPS } from '../../src/render3d/clips';

const ROOT = resolve(import.meta.dirname, '..', '..');

async function villager(): Promise<{ asset: LoadedAsset; bones: ReadonlySet<string>; dispose(): void }> {
  const manifest = JSON.parse(readFileSync(resolve(ROOT, 'public', 'assets', 'valley3d', 'manifest.json'), 'utf8')) as AssetManifest;
  const bytes = readFileSync(resolve(ROOT, 'public', 'assets', 'valley3d', 'villager.glb'));
  const library = await loadAssets({
    baseUrl: '/', manifest: { ...manifest, assets: manifest.assets.filter(asset => asset.id === 'villager') },
    bytes: { villager: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) },
  });
  const asset = library.get('villager');
  if (asset === undefined) throw new Error('falta el aldeano publicado');
  const bones = new Set<string>();
  asset.original.traverse(node => { if (node instanceof Bone) bones.add(node.name); });
  return { asset, bones, dispose: () => library.dispose() };
}

const backs = (name: string, exported: readonly AnimationClip[], generated: readonly AnimationClip[]): boolean =>
  [...exported, ...generated].some(clip => clip.name === name);

describe('P5 · clips procedurales', () => {
  it('todo clip de runtime tiene respaldo exportado o generado', async () => {
    const loaded = await villager();
    try {
      const idle = loaded.asset.clips.find(clip => clip.name === 'idle');
      expect(idle).toBeDefined();
      const generated = actionClips(idle!);
      const runtime = Object.keys(VILLAGER_CLIPS);
      expect(runtime.every(name => backs(name, loaded.asset.clips, generated))).toBe(true);
      expect(backs('no-backed-clip', loaded.asset.clips, generated)).toBe(false);
    } finally { loaded.dispose(); }
  });

  it('las acciones generadas usan el rig publicado y no mutan idle', async () => {
    const loaded = await villager();
    try {
      const idle = loaded.asset.clips.find(clip => clip.name === 'idle');
      expect(idle).toBeDefined();
      const before = JSON.stringify(idle!.toJSON());
      const generated = actionClips(idle!);
      expect(new Set(generated.map(clip => clip.name)).size).toBe(generated.length);
      for (const clip of generated) {
        expect(clip.duration, clip.name).toBeGreaterThan(0);
        for (const track of clip.tracks) {
          const target = track.name.slice(0, track.name.lastIndexOf('.'));
          expect(loaded.bones.has(target), `${clip.name} apunta a '${target}'`).toBe(true);
          expect([...track.times].every(Number.isFinite), `${clip.name}:${track.name} tiempos`).toBe(true);
          expect([...track.values].every(Number.isFinite), `${clip.name}:${track.name} valores`).toBe(true);
        }
      }
      expect(JSON.stringify(idle!.toJSON())).toBe(before);
    } finally { loaded.dispose(); }
  });
});
