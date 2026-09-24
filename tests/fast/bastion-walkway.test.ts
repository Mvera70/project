import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import { TERRAIN_CODE, type Building, type ConstructionWork } from '@engine/state';
import { bastionWalkwayOf } from '../../src/derive/bastion-walkway';

function defence(id: number, kind: Building['kind'], x: number, y: number, tier: 0 | 1 = 1, lostTick: number | null = null): Building {
  return { id, kind, x, y, w: 1, h: 1, builtTick: 0, lostTick, blockedUntil: null, tier, lit: false };
}

function stateAt(x: number, y: number, access: { x: number; z: number }) {
  const state = foundTwenty(7);
  state.map.terrain.fill(TERRAIN_CODE.meadow); state.map.ruins.fill(0);
  state.plaza = { x: x + access.x * 4, y: y + access.z * 4 };
  state.ring = 4; state.works = [];
  const tower = defence(1, 'bastion', x, y);
  const side = { x: access.z, z: -access.x };
  state.buildings = [tower,
    defence(2, 'wall', x + side.x, y + side.z),
    defence(3, 'wall', x + side.x * 2, y + side.z * 2),
  ];
  return { state, tower, side };
}

describe('E3b.1a · selector puro de pasarela de bastión', () => {
  it.each([
    [10, 14, { x: 0, z: -1 }], [6, 10, { x: 1, z: 0 }],
    [10, 6, { x: 0, z: 1 }], [14, 10, { x: -1, z: 0 }],
  ] as const)('mantiene la escalera E3a y encuentra sus dos muros para %i,%i', (x, y, access) => {
    const { state, tower, side } = stateAt(x, y, access);
    const before = JSON.stringify(state);
    expect(bastionWalkwayOf(state, tower)).toEqual({ access, firstWallId: 2, nextWallId: 3, side });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('niega un tramo ausente, de madera o en ruinas', () => {
    const { state, tower } = stateAt(10, 14, { x: 0, z: -1 });
    state.buildings.pop();
    expect(bastionWalkwayOf(state, tower)).toBeNull();
    state.buildings.push(defence(3, 'wall', 8, 14, 0));
    expect(bastionWalkwayOf(state, tower)).toBeNull();
    state.buildings[2] = defence(3, 'wall', 8, 14, 1, 1);
    expect(bastionWalkwayOf(state, tower)).toBeNull();
  });

  it('niega obras, esquinas y cruces junto al primer tramo', () => {
    const { state, tower } = stateAt(10, 14, { x: 0, z: -1 });
    const work: ConstructionWork = { id: 9, kind: 'wall', x: 9, y: 14, w: 1, h: 1, bpCost: 1, bpDone: 0,
      stoneDone: 0, materialsPaid: false, startedTick: 0, upgradeOf: 2 };
    state.works = [work];
    expect(bastionWalkwayOf(state, tower)).toBeNull();
    state.works = [];
    state.buildings.push(defence(4, 'wall', 9, 13));
    expect(bastionWalkwayOf(state, tower)).toBeNull();
  });

  it.each([
    [8, 13], [8, 15], [10, 13], [10, 15],
  ])('niega la defensa diagonal %i,%i del primer tramo', (x, y) => {
    const { state, tower } = stateAt(10, 14, { x: 0, z: -1 });
    state.buildings.push(defence(4, 'wall', x, y));
    expect(bastionWalkwayOf(state, tower)).toBeNull();
  });

  it('reserva la celda interior del primer muro para el tablero y su pretil', () => {
    const { state, tower } = stateAt(10, 14, { x: 0, z: -1 });
    expect(bastionWalkwayOf(state, tower)).not.toBeNull();
    state.buildings.push(defence(4, 'house', 9, 13));
    expect(bastionWalkwayOf(state, tower)).toBeNull();
    state.buildings[3] = defence(4, 'house', 9, 13, 1, 1);
    expect(bastionWalkwayOf(state, tower)).toBeNull();
    state.buildings.pop();
    state.works = [{ id: 9, kind: 'house', x: 9, y: 13, w: 1, h: 1, bpCost: 1, bpDone: 0,
      stoneDone: 0, materialsPaid: false, startedTick: 0, upgradeOf: null }];
    expect(bastionWalkwayOf(state, tower)).toBeNull();
  });

  it('reserva también la celda interior del segundo módulo publicado', () => {
    const { state, tower } = stateAt(10, 14, { x: 0, z: -1 });
    expect(bastionWalkwayOf(state, tower)).not.toBeNull();
    state.buildings.push(defence(4, 'house', 8, 13));
    expect(bastionWalkwayOf(state, tower)).toBeNull();
    state.buildings.pop();
    state.works = [{ id: 9, kind: 'house', x: 8, y: 13, w: 1, h: 1, bpCost: 1, bpDone: 0,
      stoneDone: 0, materialsPaid: false, startedTick: 0, upgradeOf: null }];
    expect(bastionWalkwayOf(state, tower)).toBeNull();
  });

  it('no sustituye un acceso E3a imposible por otra orientación', () => {
    const { state, tower } = stateAt(10, 14, { x: 0, z: -1 });
    state.map.terrain[13 * state.map.width + 10] = TERRAIN_CODE.forest;
    expect(bastionWalkwayOf(state, tower)).toBeNull();
  });
});
