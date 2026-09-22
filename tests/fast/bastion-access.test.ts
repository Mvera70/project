import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Box3, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { foundTwenty } from '../helpers/founding';
import type { Building } from '@engine/state';
import { TERRAIN_CODE } from '@engine/state';
import { bastionAccessOf } from '@derive/bastion-access';
import { terrainOf } from '../../src/render3d/life/terrain';
import { buildFromAsset } from '../../src/render3d/world/buildings';
import { planChange, planFor } from '../../src/render3d/world/plan';

const ROOT = resolve(import.meta.dirname, '..', '..');

function publishedCandidate(): ArrayBuffer {
  const bytes = readFileSync(resolve(ROOT, 'public/assets/valley3d/bastion-access-candidate.glb'));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function bastion(id: number, x: number, y: number): Building {
  return { id, x, y, kind: 'bastion', w: 1, h: 1, builtTick: 0, lostTick: null,
    blockedUntil: null, tier: 1, lit: false };
}

function stateAt(x: number, y: number) {
  const state = foundTwenty(7);
  state.map.terrain.fill(TERRAIN_CODE.meadow);
  state.map.ruins.fill(0);
  state.plaza = { x: 10, y: 10 };
  state.ring = 4;
  state.buildings = [bastion(1, x, y)];
  state.works = [];
  return state;
}

describe('E3 · acceso visual del bastión', () => {
  it.each([
    [10, 14, { x: 0, z: -1 }], [6, 10, { x: 1, z: 0 }],
    [10, 6, { x: 0, z: 1 }], [14, 10, { x: -1, z: 0 }],
  ] as const)('elige la cara interior cardinal %i,%i', (x, y, direction) => {
    const state = stateAt(x, y), tower = state.buildings[0]!;
    const before = JSON.stringify(state);
    expect(bastionAccessOf(state, tower)).toEqual(direction);
    const planned = planFor(state).buildings[0]!;
    expect(planned.asset).toBe('bastion-access-candidate');
    expect(planned.bastionAccess).toEqual(direction);
    expect(terrainOf(state).blocked[(y + direction.z) * state.map.width + x + direction.x]).toBe(1);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('cae a G-26 si la huella, la aproximación o el borde no caben', () => {
    const occupied = stateAt(10, 14);
    occupied.buildings.push({ ...occupied.buildings[0]!, id: 2, kind: 'house', x: 10, y: 13 });
    expect(bastionAccessOf(occupied, occupied.buildings[0]!)).toBeNull();
    expect(planFor(occupied).buildings.find(b => b.id === 1)?.asset).toBe('bastion');

    const water = stateAt(10, 14);
    water.map.terrain[13 * water.map.width + 10] = TERRAIN_CODE.water;
    expect(bastionAccessOf(water, water.buildings[0]!)).toBeNull();

    const ford = stateAt(10, 14);
    ford.map.terrain[13 * ford.map.width + 10] = TERRAIN_CODE.ford;
    expect(bastionAccessOf(ford, ford.buildings[0]!)).toBeNull();

    const forest = stateAt(10, 14);
    forest.map.terrain[13 * forest.map.width + 10] = TERRAIN_CODE.forest;
    expect(bastionAccessOf(forest, forest.buildings[0]!)).toBeNull();

    const ruin = stateAt(10, 14);
    ruin.buildings.push({ ...ruin.buildings[0]!, id: 2, kind: 'house', x: 10, y: 13, lostTick: 1 });
    expect(bastionAccessOf(ruin, ruin.buildings[0]!)).toBeNull();

    const edge = stateAt(10, 1);
    edge.plaza = { x: 10, y: -3 };
    expect(bastionAccessOf(edge, edge.buildings[0]!)).toBeNull();
  });

  it('en un codo diagonal elige otra cara libre o conserva G-26', () => {
    const state = stateAt(14, 14);
    state.buildings.push({ ...state.buildings[0]!, id: 2, kind: 'wall', x: 13, y: 12 });
    expect(bastionAccessOf(state, state.buildings[0]!)).toEqual({ x: -1, z: 0 });
    state.buildings.push({ ...state.buildings[0]!, id: 3, kind: 'wall', x: 12, y: 13 });
    expect(bastionAccessOf(state, state.buildings[0]!)).toBeNull();
  });

  it('no convierte la escalera en paso: torre y segunda celda quedan cerradas', () => {
    const state = stateAt(10, 14), land = terrainOf(state);
    expect(land.blocked[14 * state.map.width + 10]).toBe(1);
    expect(land.blocked[13 * state.map.width + 10]).toBe(1);
  });

  it('reconstruye sólo el bastión al bloquear y volver a liberar la variante', () => {
    const state = stateAt(10, 14);
    const accessible = planFor(state);
    state.works.push({ id: 9, kind: 'house', x: 10, y: 13, w: 1, h: 1, bpCost: 1, bpDone: 0,
      stoneDone: 0, materialsPaid: false, startedTick: 0, upgradeOf: null });
    const fallback = planFor(state);
    expect(fallback.buildings[0]?.asset).toBe('bastion');
    expect(planChange(accessible, fallback).changed.map(building => building.id)).toEqual([1]);
    state.works = [];
    const restored = planFor(state);
    expect(restored.buildings[0]?.asset).toBe('bastion-access-candidate');
    expect(planChange(fallback, restored).changed.map(building => building.id)).toEqual([1]);
  });

  it('rota la malla alrededor de la celda: torre fija y escalera en su cardinal', async () => {
    const gltf = await new GLTFLoader().parseAsync(publishedCandidate(), '');
    const expected = [
      [{ x: 0, z: -1 }, [10, 11, 9, 11]], [{ x: 1, z: 0 }, [10, 12, 10, 11]],
      [{ x: 0, z: 1 }, [10, 11, 10, 12]], [{ x: -1, z: 0 }, [9, 11, 10, 11]],
    ] as const;
    for (const [direction, footprint] of expected) {
      const model = buildFromAsset({ ...planFor(stateAt(10, 10)).buildings[0]!, asset: 'bastion-access-candidate',
        bastionAccess: direction }, gltf.scene.clone(true));
      try {
        model.object.updateMatrixWorld(true);
        const bounds = new Box3().setFromObject(model.object);
        expect([bounds.min.x, bounds.max.x, bounds.min.z, bounds.max.z].map(value => Math.round(value * 1e6) / 1e6))
          .toEqual(footprint);
        const anchor = model.object.children[0] as Group;
        const tower = [-0.5, 0.5].flatMap(x => [-0.5, 0.5].map(z => anchor.localToWorld(new Vector3(x, 0, z))));
        expect(Math.min(...tower.map(point => point.x))).toBeCloseTo(10);
        expect(Math.max(...tower.map(point => point.x))).toBeCloseTo(11);
        expect(Math.min(...tower.map(point => point.z))).toBeCloseTo(10);
        expect(Math.max(...tower.map(point => point.z))).toBeCloseTo(11);
      } finally { model.dispose(); }
    }
  });
});
