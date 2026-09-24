import { describe, expect, it } from 'vitest';
import { launchHuntShot, spearCanHit, stepHuntShots } from '../../src/render3d/life/hunt-shot';

describe('caza física', () => {
  it('el arco alcanza una presa con barrido continuo y se retira tras impactar', () => {
    const shot = launchHuntShot({ x: 2, y: 0.45, z: 2 },
      { x: 7, y: 0.35, z: 2 }, 'bow', 1, 100_001);
    expect(shot).not.toBeNull();
    const shots = [shot!];
    const target = { id: 40_000, x: 7, y: 0.35, z: 2, radius: 0.3, alive: true };
    const hits: number[] = [];
    for (let n = 0; n < 60; n++) hits.push(...stepHuntShots(shots, [target], () => 0));
    expect(hits).toEqual([40_000]);
    expect(shots).toHaveLength(0);
  });

  it('un tiro desviado falla y la lanza necesita proximidad real', () => {
    const shot = launchHuntShot({ x: 2, y: 0.45, z: 2 },
      { x: 7, y: 0.35, z: 2 }, 'sling', 1, 100_002)!;
    const shots = [shot];
    const target = { id: 40_001, x: 7, y: 0.35, z: 4, radius: 0.2, alive: true };
    const hits: number[] = [];
    for (let n = 0; n < 90; n++) hits.push(...stepHuntShots(shots, [target], () => 0));
    expect(hits).toEqual([]);
    expect(spearCanHit({ x: 2, z: 2 }, { x: 4, z: 2 }, 0.3)).toBe(false);
    expect(spearCanHit({ x: 2, z: 2 }, { x: 3, z: 2 }, 0.3)).toBe(true);
  });
});
