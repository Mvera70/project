import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import { TERRAIN_CODE, type Building } from '@engine/state';
import { bastionAccessOf } from '@engine/world/bastion-access';
import { bastionWalkwayOf } from '@engine/world/bastion-walkway';
import { nextUpgrade, upgradeSpot } from '@engine/world/upgrade';

function defence(id: number, kind: 'wall' | 'bastion', x: number, y: number): Building {
  return { id, kind, x, y, w: 1, h: 1, builtTick: 0, lostTick: null,
    blockedUntil: null, tier: 1, lit: false };
}

function closedState() {
  const state = foundTwenty(7);
  state.map.terrain.fill(TERRAIN_CODE.meadow);
  state.map.ruins.fill(0);
  state.plaza = { x: 10, y: 10 };
  state.ring = 4;
  state.flags['wall_closed'] = 0;
  state.works = [];
  return state;
}

describe('E3 · elección de bastión accesible', () => {
  it('prefiere una pasarela recta real cuando otro muro sólo admite escalera', () => {
    const state = closedState();
    const stairOnly = defence(1, 'wall', 6, 10);
    const connected = defence(4, 'wall', 10, 14);
    state.buildings = [stairOnly, connected, defence(5, 'wall', 9, 14), defence(6, 'wall', 8, 14)];
    expect(bastionAccessOf(state, stairOnly)).not.toBeNull();
    expect(bastionWalkwayOf(state, stairOnly)).toBeNull();
    expect(bastionWalkwayOf(state, connected)?.nextWallId).toBe(6);
    expect(nextUpgrade(state)).toEqual({ kind: 'bastion', buildingId: 4 });
  });

  it('prefiere un muro accesible al primero por id y conserva el respaldo si ninguno cabe', () => {
    const preferred = closedState();
    const blocked = defence(1, 'wall', 10, 14);
    const accessible = defence(2, 'wall', 6, 10);
    preferred.map.terrain[13 * preferred.map.width + 10] = TERRAIN_CODE.forest;
    preferred.buildings = [blocked, accessible];
    expect(upgradeSpot(preferred, 'bastion', blocked)).not.toBeNull();
    expect(upgradeSpot(preferred, 'bastion', accessible)).not.toBeNull();
    expect(bastionAccessOf(preferred, blocked)).toBeNull();
    expect(bastionAccessOf(preferred, accessible)).not.toBeNull();
    expect(nextUpgrade(preferred)).toEqual({ kind: 'bastion', buildingId: 2 });

    const fallback = closedState();
    fallback.buildings = [blocked, accessible];
    fallback.map.terrain[13 * fallback.map.width + 10] = TERRAIN_CODE.forest;
    fallback.map.terrain[10 * fallback.map.width + 7] = TERRAIN_CODE.forest;
    expect(bastionAccessOf(fallback, blocked)).toBeNull();
    expect(bastionAccessOf(fallback, accessible)).toBeNull();
    expect(nextUpgrade(fallback)).toEqual({ kind: 'bastion', buildingId: 1 });
  });

  it('para el segundo bastión prefiere el acceso más separado y desempata por id', () => {
    const state = closedState();
    const raised = defence(10, 'bastion', 10, 14);
    const near = defence(1, 'wall', 6, 10);
    const far = defence(2, 'wall', 10, 6);
    state.buildings = [raised, near, far];
    expect(bastionAccessOf(state, near)).not.toBeNull();
    expect(bastionAccessOf(state, far)).not.toBeNull();
    expect(nextUpgrade(state)).toEqual({ kind: 'bastion', buildingId: 2 });

    const tied = closedState();
    tied.buildings = [raised, defence(2, 'wall', 6, 10), defence(1, 'wall', 14, 10)];
    expect(nextUpgrade(tied)).toEqual({ kind: 'bastion', buildingId: 1 });
  });

  it('comparte la huella prospectiva con el bastión terminado sin mutar el estado', () => {
    const state = closedState();
    const wall = defence(4, 'wall', 10, 14);
    state.buildings = [wall];
    const before = JSON.stringify(state);
    const prospect = bastionAccessOf(state, wall);
    const built = bastionAccessOf(state, { ...wall, kind: 'bastion' });
    expect(prospect).toEqual(built);
    expect(JSON.stringify(state)).toBe(before);
  });
});
