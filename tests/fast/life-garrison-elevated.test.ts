import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import { TERRAIN_CODE, type Building } from '@engine/state';
import { terrainOf } from '../../src/render3d/life/terrain';
import { garrisonPlaces, postSpot } from '../../src/render3d/life/garrison';
import { reachableFrom } from '../../src/render3d/life/terrain';

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
});
