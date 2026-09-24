import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { SKIRT } from '../../src/render3d/world/ridge';
import { mountainWolves } from '../../src/render3d/world/mountain-wolves';

describe('lobos escénicos de montaña', () => {
  const state = foundGame(11);
  const { map, terrainSeed } = state;

  it('recorre solo el exterior, con dos animales como máximo y sin consumir el motor', () => {
    const before = structuredClone(state.rng);
    for (let seconds = 0; seconds < 960; seconds += 1) {
      const wolves = mountainWolves(map, terrainSeed, seconds);
      expect(wolves.length).toBeLessThanOrEqual(2);
      for (const wolf of wolves) {
        expect(wolf.kind).toBe('wolf');
        expect(wolf.x < 0 || wolf.x > map.width).toBe(true);
        expect(wolf.y).toBeGreaterThanOrEqual(-SKIRT);
        expect(wolf.y).toBeLessThanOrEqual(map.height + SKIRT);
      }
    }
    expect(state.rng).toEqual(before);
  });

  it('se mueve sin saltos visibles y sale antes del límite del paisaje', () => {
    const first = mountainWolves(map, terrainSeed, 0);
    expect(first).toHaveLength(2);
    expect(mountainWolves(map, terrainSeed, 0)).toEqual(first);
    for (let seconds = 1; seconds <= 200; seconds += 1) {
      const previous = mountainWolves(map, terrainSeed, seconds - 1);
      const current = mountainWolves(map, terrainSeed, seconds);
      for (const wolf of current) {
        const earlier = previous.find(candidate => candidate.id === wolf.id);
        if (earlier !== undefined) {
          expect(Math.hypot(wolf.x - earlier.x, wolf.y - earlier.y)).toBeLessThan(1);
        }
      }
    }
    const edge = mountainWolves(map, terrainSeed, 200)[0]!;
    expect(Math.min(Math.abs(edge.y + SKIRT), Math.abs(edge.y - map.height - SKIRT)))
      .toBeLessThan(4);
    expect(mountainWolves(map, terrainSeed, 208)).toHaveLength(0);
  });
});
