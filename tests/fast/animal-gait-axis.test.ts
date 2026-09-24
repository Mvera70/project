import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

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
    const walk = recipe.clips.find(clip => clip.name === 'walk');
    expect(walk?.strideLength).toBeGreaterThanOrEqual(0.4);
  });
});
