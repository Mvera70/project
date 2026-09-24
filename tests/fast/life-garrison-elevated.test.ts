import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import { TERRAIN_CODE, type Building } from '@engine/state';
import { terrainOf } from '../../src/render3d/life/terrain';
import { garrisonPlaces, mannedPlatformCells, postSpot } from '../../src/render3d/life/garrison';
import { reachableFrom } from '../../src/render3d/life/terrain';
import { elevatedWallRoute } from '../../src/render3d/life/elevated-post';
import { elevatedRingOf, type ElevatedRingVariant } from '../../src/derive/elevated-ring';
import { bastionWalkwayOf } from '../../src/derive/bastion-walkway';
import { createPhysics } from '../../src/render3d/life/physics';

function building(id: number, kind: Building['kind'], x: number, y: number): Building {
  return { id, kind, x, y, w: 1, h: 1, builtTick: 0, lostTick: null, blockedUntil: null, tier: 1, lit: false };
}

function defendedBastion() {
  const state = foundTwenty(7);
  state.map.terrain.fill(TERRAIN_CODE.meadow);
  state.map.ruins.fill(0);
  state.plaza = { x: 10, y: 10 };
  state.ring = 4;
  state.works = [];
  state.buildings = [building(1, 'bastion', 10, 14)];
  state.threat.comingTick = state.tick;
  state.threat.arrivedTick = null;
  return state;
}

function defendedWalkway(x: number, y: number, access: { x: number; z: number }) {
  const state = defendedBastion();
  state.buildings[0] = building(1, 'bastion', x, y);
  state.plaza = { x: x + access.x * 4, y: y + access.z * 4 };
  const side = { x: access.z, z: -access.x };
  state.buildings.push(
    building(2, 'wall', x + side.x, y + side.z),
    building(3, 'wall', x + side.x * 2, y + side.z * 2),
  );
  return state;
}

describe('E3a · puesto elevado en la guarnición', () => {
  it('asocia la ruta sólo al bastión accesible y reparte desde la aproximación de suelo', () => {
    const state = defendedBastion(), land = terrainOf(state);
    const reach = reachableFrom(land, { x: 10.5, z: 12.5 });
    const manned = garrisonPlaces(state, land, { x: 10.5, z: 10.5 }, reach);
    const post = manned[0]!;
    expect(post.elevated).toBeDefined();
    expect(post.place.at).toEqual({ x: post.elevated!.approach.x, z: post.elevated!.approach.z });
    expect('y' in post.place.at).toBe(false);
    expect(post.elevated!.post.y).toBe(1.02);
    // La torre y la celda de la escalera continúan fuera de `pathTo`.
    expect(land.blocked[14 * land.width + 10]).toBe(1);
    expect(land.blocked[13 * land.width + 10]).toBe(1);
  });

  it('conserva el puesto de suelo cuando la aproximación no cabe o no pertenece a la orilla', () => {
    const state = defendedBastion(), land = terrainOf(state);
    const reach = reachableFrom(land, { x: 10.5, z: 12.5 });
    // La aproximación del acceso norte está en (10,12); negar esa orilla no
    // abre la escalera ni elimina la defensa que ya existía en el suelo.
    reach[12 * land.width + 10] = 0;
    const post = garrisonPlaces(state, land, { x: 10.5, z: 10.5 }, reach)[0]!;
    expect(post.elevated).toBeUndefined();
    expect(post.place.at).toEqual(postSpot(land, post.post, { x: 10.5, z: 10.5 }, reach));
  });

  it('no confunde una atalaya con bastión ni cambia sus puestos de suelo', () => {
    const state = defendedBastion();
    state.buildings.push(building(2, 'watchtower', 20, 20));
    (state.traits as string[]).push('arms', 'bows');
    const land = terrainOf(state), reach = reachableFrom(land, { x: 10.5, z: 12.5 });
    const manned = garrisonPlaces(state, land, { x: 10.5, z: 10.5 }, reach);
    const tower = manned.find(post => post.post.x === 20 && post.post.y === 20)!;
    expect(tower.elevated).toBeUndefined();
    expect(tower.place.at).toEqual(postSpot(land, tower.post, { x: 10.5, z: 10.5 }, reach));
  });

  it.each([
    [10, 14, { x: 0, z: -1 }], [6, 10, { x: 1, z: 0 }],
    [10, 6, { x: 0, z: 1 }], [14, 10, { x: -1, z: 0 }],
  ] as const)('lleva al mismo guardia hasta el primer muro y conserva su regreso para %i,%i', (x, y, access) => {
    const state = defendedWalkway(x, y, access), land = terrainOf(state);
    const post = garrisonPlaces(state, land, { x: state.plaza.x + 0.5, z: state.plaza.y + 0.5 })
      .find(candidate => candidate.post.x === x && candidate.post.y === y)!;
    const side = { x: access.z, z: -access.x };
    expect(post.elevatedVariant).toBe('wall');
      expect(post.walkway?.firstWall).toEqual({ x: x + side.x, z: y + side.z });
      expect(post.walkway?.nextWall).toEqual({ x: x + side.x * 2, z: y + side.z * 2 });
    expect(post.elevated?.post).toEqual(elevatedWallRoute({ x, z: y }, access).post);
    expect(post.facing).toEqual({ x: post.elevated!.post.x - access.x, z: post.elevated!.post.z - access.z });
    expect(post.elevated?.descent).toEqual([...post.elevated!.climb].reverse());
    // La ruta privada no cambia la máscara pública de las dos celdas altas.
    expect(land.blocked[y * land.width + x]).toBe(1);
    expect(land.blocked[(y + side.z) * land.width + x + side.x]).toBe(1);
  });

  it('vuelve a E3a o al suelo cuando se pierde la junta o la entrada', () => {
    const state = defendedWalkway(10, 14, { x: 0, z: -1 }), land = terrainOf(state);
    expect(garrisonPlaces(state, land, { x: 10.5, z: 10.5 })[0]?.elevatedVariant).toBe('wall');
    state.buildings.pop();
    expect(garrisonPlaces(state, land, { x: 10.5, z: 10.5 })[0]?.elevatedVariant).toBe('bastion');
    const reach = reachableFrom(land, { x: 10.5, z: 12.5 });
    reach[12 * land.width + 10] = 0;
    expect(garrisonPlaces(state, land, { x: 10.5, z: 10.5 }, reach)[0]?.elevated).toBeUndefined();
  });

  it('asigna el circuito entero solo cuando el selector de escena acredita todas las piezas', async () => {
    const state = defendedWalkway(10, 14, { x: 0, z: -1 });
    const cells = [[7, 14], [7, 13], [7, 12], [7, 11], [8, 11], [9, 11],
      [10, 11], [11, 11], [12, 11], [13, 11], [13, 12], [13, 13],
      [13, 14], [12, 14], [11, 14]];
    state.buildings.push(...cells.map(([x, y], index) => building(index + 4, 'wall', x!, y!)));
    const land = terrainOf(state);
    const all: ElevatedRingVariant[] = ['straight', 'turn', 'diagonal', 'mixed',
      'gate-cardinal', 'gate-diagonal', 'gate-mixed', 'bastion-crossing', 'bastion-return'];
    const ring = elevatedRingOf(state, state.buildings[0]!, { approvedVariants: all });
    expect(ring.geometryReady).toBe(true);
    const selected = garrisonPlaces(state, land, { x: 10.5, z: 10.5 }, undefined,
      undefined, bastionWalkwayOf, () => ring)[0]!;
    expect(selected.elevatedVariant).toBe('ring');
    expect(selected.ring).toBe(ring);
    expect(mannedPlatformCells([selected])).toEqual(ring.segments
      .filter(segment => segment.kind !== 'gate').map(segment => segment.cell));
    const physics = await createPhysics(land, { platformCells: mannedPlatformCells([selected]) });
    expect(physics).not.toBeNull();
    if (physics !== null) {
      // Entre estos dos muros del circuito la piedra soporta el paso a 1,02;
      // antes de rebajar todas sus celdas el proyectil nacía dentro de un muro de 2.
      const along = physics.launch({ x: 7.5, y: 1.35, z: 14.5 }, { x: 0, y: 0, z: -5 });
      for (let step = 0; step < 20; step += 1) physics.step();
      expect(along.at.z, 'el tablero no conserva una almena invisible').toBeLessThan(13.4);
      const below = physics.launch({ x: 7.5, y: 0.7, z: 16.5 }, { x: 0, y: 0, z: -8 });
      for (let step = 0; step < 20; step += 1) physics.step();
      expect(below.at.z, 'la fábrica bajo el tablero sigue siendo piedra').toBeGreaterThan(14.8);
      physics.dispose();
    }
    expect(selected.elevated!.climb.slice(-ring.route.length)).toEqual(ring.route);
    expect(selected.elevated!.descent).toEqual([...selected.elevated!.climb].reverse());
    const pending = elevatedRingOf(state, state.buildings[0]!);
    const withheld = garrisonPlaces(state, land, { x: 10.5, z: 10.5 }, undefined,
      undefined, bastionWalkwayOf, () => pending)[0]!;
    expect(withheld.elevatedVariant).not.toBe('ring');
    expect(withheld.ring).toBeUndefined();
    expect(withheld.elevated).toBeDefined();
  });
});
