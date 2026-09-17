import { describe, expect, it } from 'vitest';
import { Group } from 'three';
import { WORLD } from '../../src/engine/balance';
import { foundGame } from '../../src/engine/found';
import { TERRAIN_CODE } from '../../src/engine/state';
import { TreeFalls } from '../../src/render3d/effects/tree-falls';
import { forestLooks, forestSignature } from '../../src/render3d/world/forest-state';
import { planChange, planFor } from '../../src/render3d/world/plan';

function cleanState() {
  const state = foundGame(7);
  state.buildings.length = 0;
  state.works.length = 0;
  state.map.terrain.fill(TERRAIN_CODE.meadow);
  state.map.forestStock.fill(0);
  state.map.forestAge.fill(0);
  return state;
}

describe('IA-16 · bosque visible', () => {
  it('adelgaza sólo la copa al cruzar cuartos de existencias y no escribe en el estado', () => {
    const state = cleanState(), cell = state.map.width * 5 + 5;
    state.map.terrain[cell] = TERRAIN_CODE.forest;
    state.map.forestStock[cell] = WORLD.WOOD_PER_FOREST_TILE;
    const before = JSON.stringify(state);
    expect(forestLooks(state).find(look => look.cell === cell)?.crown).toBe(1);
    const fullSignature = forestSignature(state);
    state.map.forestStock[cell] = 226;
    expect(forestSignature(state)).toBe(fullSignature);
    state.map.forestStock[cell] = 225;
    expect(forestLooks(state).find(look => look.cell === cell)?.crown).toBe(0.88);
    expect(forestSignature(state)).not.toBe(fullSignature);
    state.map.forestStock[cell] = WORLD.WOOD_PER_FOREST_TILE;
    expect(JSON.stringify(state)).toBe(before);
  });

  it('dibuja tocón el primer año y luego sólo rebrote con tres vecinas y solar libre', () => {
    const state = cleanState(), width = state.map.width, cell = width * 5 + 5;
    const neighbours = [cell - 1, cell + 1, cell - width];
    for (const neighbour of neighbours) {
      state.map.terrain[neighbour] = TERRAIN_CODE.forest;
      state.map.forestStock[neighbour] = WORLD.WOOD_PER_FOREST_TILE;
    }
    state.map.terrain[cell] = TERRAIN_CODE.cleared;
    expect(forestLooks(state).find(look => look.cell === cell)?.stage).toBe('stump');
    state.map.forestAge[cell] = 4;
    const sprout = forestLooks(state).find(look => look.cell === cell);
    expect(sprout?.stage).toBe('regrowth');
    expect(sprout?.size).toBeGreaterThan(0.5);
    expect(sprout?.size).toBeLessThan(1);

    state.map.terrain[neighbours[2]!] = TERRAIN_CODE.meadow;
    expect(forestLooks(state).some(look => look.cell === cell)).toBe(false);
    state.map.terrain[neighbours[2]!] = TERRAIN_CODE.forest;
    state.works.push({
      id: 999, kind: 'house', x: 5, y: 5, w: 1, h: 1,
      bpCost: 10, bpDone: 0, stoneDone: 0, materialsPaid: true, startedTick: 0, upgradeOf: null,
    });
    expect(forestLooks(state).some(look => look.cell === cell)).toBe(false);
    state.works.length = 0;
    state.map.forestAge[cell] = WORLD.BARREN_CLEARING;
    expect(forestLooks(state).some(look => look.cell === cell)).toBe(false);
  });

  it('el plan reinstancia sólo el bosque al cambiar de tramo de tala', () => {
    const state = cleanState(), cell = state.map.width * 5 + 5;
    state.map.terrain[cell] = TERRAIN_CODE.forest;
    state.map.forestStock[cell] = WORLD.WOOD_PER_FOREST_TILE;
    const before = planFor(state);
    state.map.forestStock[cell] = Math.floor(WORLD.WOOD_PER_FOREST_TILE * 0.7);
    const change = planChange(before, planFor(state));
    expect(change.forest).toBe(true);
    expect(change.ground).toBe(false);
    expect(change.cleared).toBe(false);
  });

  it('anima sólo una transición real a claro, respeta pausa y no repite al cargar', () => {
    const state = cleanState(), cell = state.map.width * 5 + 5;
    state.map.terrain[cell] = TERRAIN_CODE.forest;
    state.map.forestStock[cell] = 1;
    const falls = new TreeFalls(() => new Group());
    expect(falls.observe(state.map)).toBe(false);
    state.map.terrain[cell] = TERRAIN_CODE.cleared;
    state.map.forestStock[cell] = 0;
    expect(falls.observe(state.map)).toBe(true);
    expect(falls.suppressed.has(cell)).toBe(true);
    falls.step(0);
    expect(falls.snapshot()[0]?.progress).toBe(0);
    falls.step(0.75);
    expect(falls.snapshot()[0]?.progress).toBeCloseTo(0.5);
    falls.step(0.75);
    expect(falls.snapshot()[0]?.fallen).toBe(true);
    expect(falls.acceptShown(state.map)).toBe(true);
    expect(falls.suppressed.has(cell)).toBe(false);
    falls.observe(state.map, true);
    expect(falls.snapshot()).toEqual([]);
    falls.dispose();
  });
});
