import { describe, expect, it } from 'vitest';
import { advanceElevated, elevatedPostRoute, elevatedWallRoute, ELEVATED_POST_HEIGHT } from '../../src/render3d/life/elevated-post';
import type { BastionAccess } from '../../src/derive/bastion-access';

const origin = { x: 10, z: 10 };

describe('E3b · ruta privada hasta el segundo tramo de muralla', () => {
  it.each([
    [{ x: 0, z: -1 }, { x: 8.5, z: 10.21 }], [{ x: 1, z: 0 }, { x: 10.79, z: 8.5 }],
    [{ x: 0, z: 1 }, { x: 12.5, z: 10.79 }], [{ x: -1, z: 0 }, { x: 10.21, z: 12.5 }],
  ] as const)('rota hasta el centro del segundo tramo para %o', (access, expected) => {
    const route = elevatedWallRoute(origin, access as BastionAccess);
    expect(route.post.x).toBeCloseTo(expected.x);
    expect(route.post.z).toBeCloseTo(expected.z);
    expect(route.post.y).toBe(ELEVATED_POST_HEIGHT);
  });

  it('conserva literalmente la subida E3a, gira a cota constante y desciende al revés', () => {
    const base = elevatedPostRoute(origin, { x: 0, z: 1 });
    const route = elevatedWallRoute(origin, { x: 0, z: 1 });
    expect(route.climb.slice(0, -5)).toEqual(base.climb.slice(0, -1));
    expect(route.climb.slice(-5).every(point => point.y === ELEVATED_POST_HEIGHT)).toBe(true);
    expect(route.descent).toEqual([...route.climb].reverse());
  });

  it('avanza sin rebasar la distancia presupuestada hasta el adarve y vuelve', () => {
    const route = elevatedWallRoute(origin, { x: 1, z: 0 });
    let at = route.climb[0]!, next = 1;
    while (next < route.climb.length) {
      const result = advanceElevated(at, route.climb, next, 0.9, 1 / 30);
      expect(Math.hypot(result.at.x - at.x, result.at.y - at.y, result.at.z - at.z)).toBeLessThanOrEqual(0.03 + 1e-9);
      at = result.at; next = result.next;
    }
    expect(at).toEqual(route.post);
    expect(advanceElevated(route.post, route.descent, 1, 999, 1).at).toEqual(route.approach);
  });
});
