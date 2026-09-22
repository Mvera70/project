import { describe, expect, it } from 'vitest';
import {
  advanceElevated, elevatedPostOf, elevatedPostRoute,
  ELEVATED_POST_HEIGHT, ELEVATED_POST_RADIUS, ELEVATED_POST_STEPS,
} from '../../src/render3d/life/elevated-post';
import type { BastionAccess } from '../../src/derive/bastion-access';
import type { Terrain } from '../../src/render3d/life/body';

const origin = { x: 10, z: 10 };
const land = (): Terrain => ({ width: 32, height: 32, blocked: new Uint8Array(32 * 32) });
const allReachable = (terrain: Terrain) => new Uint8Array(terrain.width * terrain.height).fill(1);

describe('E3a · ruta privada del puesto elevado', () => {
  it.each([
    [{ x: 0, z: 1 }, { x: 10.5, z: 12.4 }],
    [{ x: 1, z: 0 }, { x: 12.4, z: 10.5 }],
    [{ x: 0, z: -1 }, { x: 10.5, z: 8.6 }],
    [{ x: -1, z: 0 }, { x: 8.6, z: 10.5 }],
  ] as const)('rota cardinalmente la entrada y conserva la cota para %o', (access, expected) => {
    const route = elevatedPostRoute(origin, access as BastionAccess);
    expect(route.approach.x).toBeCloseTo(expected.x);
    expect(route.approach.z).toBeCloseTo(expected.z);
    expect(route.supports).toHaveLength(ELEVATED_POST_STEPS);
    expect(route.post.y).toBe(ELEVATED_POST_HEIGHT);
    expect(Math.hypot(route.post.x - route.exit.x, route.post.z - route.exit.z)).toBeCloseTo(0.42);
  });

  it('sube y baja por contrahuellas y huellas continuas, con cota 0 → 1,02', () => {
    const route = elevatedPostRoute(origin, { x: 0, z: 1 });
    expect(route.climb[0]).toEqual(route.approach);
    expect(route.climb.at(-1)).toEqual(route.post);
    expect(route.descent[0]).toEqual(route.post);
    expect(route.descent.at(-1)).toEqual(route.approach);
    for (let i = 1; i < route.climb.length; i += 1) {
      const before = route.climb[i - 1]!, after = route.climb[i]!;
      expect(after.y).toBeGreaterThanOrEqual(before.y);
      expect(Math.abs(after.x - before.x) + Math.abs(after.z - before.z) === 0 || after.y === before.y).toBe(true);
    }
    expect(route.supports.map(point => point.y)).toEqual(
      Array.from({ length: ELEVATED_POST_STEPS }, (_, index) => (index + 1) * ELEVATED_POST_HEIGHT / ELEVATED_POST_STEPS),
    );
  });

  it('avanza acotado por velocidad y llega sin salto al puesto y de vuelta', () => {
    const route = elevatedPostRoute(origin, { x: 1, z: 0 });
    let at = route.climb[0]!, next = 1;
    const max = 0.03;
    while (next < route.climb.length) {
      const result = advanceElevated(at, route.climb, next, 0.9, 1 / 30);
      expect(Math.hypot(result.at.x - at.x, result.at.z - at.z, result.at.y - at.y)).toBeLessThanOrEqual(max + 1e-9);
      at = result.at; next = result.next;
    }
    expect(at).toEqual(route.post);
    const down = advanceElevated(route.post, route.descent, 1, 999, 1);
    expect(down.arrived).toBe(true);
    expect(down.at).toEqual(route.approach);
  });

  it('niega el puesto si el disco de 0,32 no cabe o la entrada no está en la orilla alcanzable', () => {
    const blocked = land();
    const route = elevatedPostRoute(origin, { x: 0, z: 1 });
    blocked.blocked[Math.floor(route.approach.z) * blocked.width + Math.floor(route.approach.x)] = 1;
    expect(elevatedPostOf(blocked, allReachable(blocked), origin, { x: 0, z: 1 })).toBeNull();

    const open = land(), unreachable = allReachable(open);
    unreachable[Math.floor(route.approach.z) * open.width + Math.floor(route.approach.x)] = 0;
    expect(elevatedPostOf(open, unreachable, origin, { x: 0, z: 1 })).toBeNull();
    expect(ELEVATED_POST_RADIUS).toBe(0.32);
  });

  it('sólo admite un empalme de suelo casi plano y conserva su cota al entrar', () => {
    const open = land(), reach = allReachable(open);
    expect(elevatedPostOf(open, reach, origin, { x: 0, z: 1 }, () => 0.05)).toBeNull();
    const route = elevatedPostOf(open, reach, origin, { x: 0, z: 1 }, () => 0.03);
    expect(route?.approach.y).toBe(0.03);
    expect(route?.foot.y).toBe(0);
    expect(elevatedPostOf(open, reach, origin, { x: 0, z: 1 }, (_x, z) => z >= 12 && z < 12.2 ? 0.05 : 0)).toBeNull();
  });
});
