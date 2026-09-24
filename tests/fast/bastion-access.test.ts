import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Box3, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { foundTwenty } from '../helpers/founding';
import type { Building } from '@engine/state';
import { TERRAIN_CODE } from '@engine/state';
import { bastionAccessOf } from '@derive/bastion-access';
import { bastionWalkwayOf } from '@derive/bastion-walkway';
import { terrainOf } from '../../src/render3d/life/terrain';
import { buildFromAsset, Village } from '../../src/render3d/world/buildings';
import { planChange, planFor } from '../../src/render3d/world/plan';
import { WANTED } from '../../src/render3d/renderer';

const ROOT = resolve(import.meta.dirname, '..', '..');

function publishedCandidate(id = 'bastion-access-candidate'): ArrayBuffer {
  const bytes = readFileSync(resolve(ROOT, `public/assets/valley3d/${id}.glb`));
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

function stateWithWalkway(x: number, y: number, access: { x: number; z: number }) {
  const state = stateAt(x, y);
  const side = { x: access.z, z: -access.x };
  state.buildings.push(
    { ...bastion(2, x + side.x, y + side.z), kind: 'wall' },
    { ...bastion(3, x + side.x * 2, y + side.z * 2), kind: 'wall' },
  );
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
    expect(WANTED).toContain(planned.asset);
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

  // E3b.3 · La junta GLB de E3b.1 queda superada por el adarve generado: una
  // torre con dos muros de piedra ya abre tablero, y estas pruebas se mudan a
  // ese camino, que es el que el juego pinta.
  it.each([
    [10, 14, { x: 0, z: -1 }], [6, 10, { x: 1, z: 0 }],
    [10, 6, { x: 0, z: 1 }], [14, 10, { x: -1, z: 0 }],
  ] as const)('monta el adarve generado sobre los dos muros para %i,%i', async (x, y, access) => {
    const state = stateWithWalkway(x, y, access);
    const plan = planFor(state);
    const planned = plan.buildings[0]!;
    expect(bastionWalkwayOf(state, state.buildings[0]!)).not.toBeNull();
    expect(planned.asset).toBe('bastion-access-candidate');
    expect(planned.bastionWalkway).toBeUndefined();
    expect(planned.rampartShift).toBe(0);
    const side = { x: access.z, z: -access.x };
    // En una cadena abierta el último muro no sabe hacia dónde sigue: el
    // selector acredita la torre y el primer tramo, no un extremo a ciegas.
    const covered = plan.rampart!.edges.flat().map(cell => `${cell.x},${cell.z}`);
    expect(covered).toEqual(expect.arrayContaining([`${x},${y}`, `${x + side.x},${y + side.z}`]));
    const [tower, wall] = await Promise.all([
      new GLTFLoader().parseAsync(publishedCandidate('bastion-access-candidate'), ''),
      new GLTFLoader().parseAsync(publishedCandidate('wall'), ''),
    ]);
    const model = buildFromAsset(planned, tower.scene);
    const village = new Village(id => id === 'wall' ? wall.scene.clone(true) : undefined);
    try {
      model.object.updateMatrixWorld(true);
      const bounds = new Box3().setFromObject(model.object);
      // Sin almenas propias: la torre llega al suelo de 1,02 y no más.
      expect(bounds.max.y).toBeLessThan(1.021);
      expect(model.object.userData.buildingId).toBe(1);
      village.rampart(plan.rampart);
      const deck = village.group.getObjectByName('Rampart_Deck')!;
      deck.updateMatrixWorld(true);
      const deckBounds = new Box3().setFromObject(deck);
      for (const distance of [1]) {
        expect(deckBounds.containsPoint(new Vector3(x + side.x * distance + 0.5, 0.95, y + side.z * distance + 0.5)))
          .toBe(true);
      }
    } finally { model.dispose(); village.dispose(); }
  });

  it('vuelve a la variante E3a al perder el muro o al poner un muro en obra', () => {
    const state = stateWithWalkway(10, 14, { x: 0, z: -1 });
    const ready = planFor(state);
    expect(ready.buildings[0]?.rampartShift).toBe(0);
    state.buildings.splice(1, 1);
    const lost = planFor(state);
    expect(lost.rampart).toBeNull();
    expect(lost.buildings[0]?.asset).toBe('bastion-access-candidate');
    expect(lost.buildings[0]?.rampartShift).toBeUndefined();
    expect(planChange(ready, lost).changed.map(building => building.id)).toContain(1);
    expect(planChange(ready, lost).rampart).toBe(true);
    state.buildings.push({ ...bastion(2, 9, 14), kind: 'wall' });
    state.works = [{ id: 9, kind: 'wall', x: 9, y: 14, w: 1, h: 1, bpCost: 1, bpDone: 0,
      stoneDone: 0, materialsPaid: false, startedTick: 0, upgradeOf: 2 }];
    const building = planFor(state);
    expect(building.rampart).toBeNull();
    expect(building.buildings[0]?.asset).toBe('bastion-access-candidate');
    expect(planChange(ready, building).changed.map(item => item.id)).toContain(1);
  });

  it('no pinta adarve sin la piedra del muro publicado', () => {
    const plan = planFor(stateWithWalkway(10, 14, { x: 0, z: -1 }));
    const village = new Village(() => undefined);
    try {
      village.rampart(plan.rampart);
      expect(village.group.getObjectByName('Valley_Rampart')).toBeUndefined();
    } finally { village.dispose(); }
  });
});
