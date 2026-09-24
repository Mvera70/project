import { describe, expect, it } from 'vitest';
import { TERRAIN_CODE, type Building } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { scatterTransform } from '../../src/render3d/world/forest';
import { RAMPART } from '../../src/render3d/world/rampart';
import { crossing24TreeOnDeck, return66TreeOnDeck, sceneRampartOf, sceneRingOf, sceneWalkwayOf } from '../../src/render3d/world/plan';

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

  it('el adarve centrado sólo lo corta un tronco que alcanza su tablero', () => {
    const state = foundTwenty(91);
    state.map.terrain.fill(TERRAIN_CODE.meadow);
    state.map.ruins.fill(0);
    state.plaza = { x: 14, y: 11 };
    state.ring = 4;
    state.works = [];
    const bastion = stone(1, 'bastion', 14, 15);
    state.buildings = [bastion, stone(2, 'wall', 13, 15), stone(3, 'wall', 12, 15)];
    // E3b.3 · El adarve generado sustituye a la junta: la misma puerta de troncos, en el camino vivo.
    const covers = (): boolean => sceneRampartOf(state)?.layout.edges.flat()
      .some(cell => cell.x === 13 && cell.z === 15) === true;
    expect(sceneWalkwayOf(state, bastion)).toBeNull();
    expect(covers()).toBe(true);

    // El tablero de E3b.1 volaba 1,27 hacia dentro y un tronco de la celda
    // interior lo cortaba. El generado va centrado en el muro (±0,45): ese
    // mismo tronco queda fuera y no corta nada; uno que lo toque, sí.
    const treeCell = 14 * state.map.width + 13;
    state.map.terrain[treeCell] = TERRAIN_CODE.forest;
    state.map.forestStock[treeCell] = 1;
    state.tick += 1;
    const tree = scatterTransform(state.map.width, treeCell);
    const reach = RAMPART.halfWidth + 0.34 / 3 * tree.scale;
    expect(covers()).toBe(15.5 - tree.z > reach);
    state.map.terrain[treeCell] = TERRAIN_CODE.cleared;
    state.map.forestStock[treeCell] = 0;
    state.tick += 1;
    expect(covers()).toBe(true);
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
