import { describe, expect, it } from 'vitest';
import { TERRAIN_CODE, type Building } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { crossing24TreeOnDeck, return66TreeOnDeck, sceneRingOf, sceneWalkwayOf } from '../../src/render3d/world/plan';

function stone(id: number, kind: 'bastion' | 'wall', x: number, y: number): Building {
  return { id, kind, x, y, w: 1, h: 1, builtTick: 0, lostTick: null,
    blockedUntil: null, tier: 1, lit: false };
}

describe('E3b.2c.2 · puerta de escena para la primera junta', () => {
  it('cubre la media celda NE añadida al cruce 24 al buscar troncos', () => {
    const cell = { x: 40, z: 65 };
    expect(crossing24TreeOnDeck(cell, { x: 41.5, z: 64.5, scale: 1 })).toBe(true);
    expect(crossing24TreeOnDeck(cell, { x: 42.2, z: 63.8, scale: 1 })).toBe(false);
  });

  it('cubre el brazo SO y los peldaños desplazados del retorno 66', () => {
    const cell = { x: 34, z: 39 };
    expect(return66TreeOnDeck(cell, { x: 33.5, z: 40.5, scale: 1 })).toBe(true);
    expect(return66TreeOnDeck(cell, { x: 34.5, z: 41.4, scale: 1 })).toBe(true);
    expect(return66TreeOnDeck(cell, { x: 32.5, z: 39.5, scale: 1 })).toBe(false);
  });

  it('retira ambas tablas cuando un tronco adulto invade la franja interior', () => {
    const state = foundTwenty(91);
    state.map.terrain.fill(TERRAIN_CODE.meadow);
    state.map.ruins.fill(0);
    state.plaza = { x: 14, y: 11 };
    state.ring = 4;
    state.works = [];
    const bastion = stone(1, 'bastion', 14, 15);
    state.buildings = [bastion, stone(2, 'wall', 13, 15), stone(3, 'wall', 12, 15)];
    expect(sceneWalkwayOf(state, bastion)).not.toBeNull();

    const treeCell = 14 * state.map.width + 13;
    state.map.terrain[treeCell] = TERRAIN_CODE.forest;
    state.map.forestStock[treeCell] = 1;
    expect(sceneWalkwayOf(state, bastion)).toBeNull();
    state.map.terrain[treeCell] = TERRAIN_CODE.cleared;
    state.map.forestStock[treeCell] = 0;
    expect(sceneWalkwayOf(state, bastion)).not.toBeNull();
  });

  it('no acredita el tablero si un rebrote visible ya alcanza su cota', () => {
    const state = foundTwenty(91);
    state.map.terrain.fill(TERRAIN_CODE.meadow);
    state.map.ruins.fill(0);
    state.plaza = { x: 14, y: 11 };
    state.ring = 4;
    state.works = [];
    const bastion = stone(1, 'bastion', 14, 15);
    state.buildings = [bastion, stone(2, 'wall', 13, 15), stone(3, 'wall', 12, 15),
      stone(4, 'wall', 11, 15), stone(5, 'wall', 10, 15)];
    const cell = 14 * state.map.width + 11;
    state.map.terrain[cell] = TERRAIN_CODE.cleared;
    state.map.forestAge[cell] = 7;
    for (const neighbour of [cell - 1, cell - state.map.width, cell + state.map.width]) {
      state.map.terrain[neighbour] = TERRAIN_CODE.forest;
      state.map.forestStock[neighbour] = 0;
    }
    expect(sceneRingOf(state, bastion).segments.find(segment => segment.buildingId === 4)?.reason).toBe('obstacle');
    state.map.forestAge[cell] = 1;
    expect(sceneRingOf(state, bastion).segments.find(segment => segment.buildingId === 4)?.reason).not.toBe('obstacle');
  });

  it('detecta un tronco junto a un tramo posterior sin aprobar su suelo', () => {
    const state = foundTwenty(91);
    state.map.terrain.fill(TERRAIN_CODE.meadow);
    state.map.ruins.fill(0);
    state.plaza = { x: 14, y: 11 };
    state.ring = 4;
    state.works = [];
    const bastion = stone(1, 'bastion', 14, 15);
    state.buildings = [bastion, stone(2, 'wall', 13, 15), stone(3, 'wall', 12, 15),
      stone(4, 'wall', 11, 15), stone(5, 'wall', 10, 15)];
    const treeCell = 14 * state.map.width + 11;
    state.map.terrain[treeCell] = TERRAIN_CODE.forest;
    state.map.forestStock[treeCell] = 1;
    const ring = sceneRingOf(state, bastion);
    expect(ring.segments.find(segment => segment.buildingId === 4)?.reason).toBe('obstacle');
    expect(ring.geometryReady).toBe(false);
  });

  it('comprueba también la huella saliente de una transición diagonal', () => {
    const state = foundTwenty(91);
    state.map.terrain.fill(TERRAIN_CODE.meadow);
    state.map.ruins.fill(0);
    state.plaza = { x: 14, y: 11 };
    state.ring = 4;
    state.works = [];
    const bastion = stone(1, 'bastion', 14, 15);
    state.buildings = [bastion, stone(2, 'wall', 13, 15), stone(3, 'wall', 12, 15),
      stone(4, 'wall', 11, 15), stone(5, 'wall', 10, 14), stone(6, 'wall', 10, 13)];
    const treeCell = 14 * state.map.width + 11;
    state.map.terrain[treeCell] = TERRAIN_CODE.forest;
    state.map.forestStock[treeCell] = 1;
    const ring = sceneRingOf(state, bastion);
    expect(ring.segments.find(segment => segment.buildingId === 4)?.variant).toBe('mixed');
    expect(ring.segments.find(segment => segment.buildingId === 4)?.reason).toBe('obstacle');
  });
});
