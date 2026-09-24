import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import { foundGame } from '../../src/engine/found';
import { createVillage } from '../../src/render3d/life/village';
import { createDeer, stepDeer, type Deer } from '../../src/render3d/life/deer';
import { terrainOf } from '../../src/render3d/life/terrain';
import { fitsCircle, type Terrain } from '../../src/render3d/life/body';

describe('ciervo en la vida del valle', () => {
  it('no aparece junto a la primera casa de una aldea recién fundada', () => {
    const state = foundGame(7);
    const village = createVillage(state, 0);
    const house = state.buildings.find(building => building.kind === 'house')!;
    const distance = (animal: { x: number; y: number }): number => Math.hypot(
      Math.max(house.x - animal.x, 0, animal.x - house.x - house.w),
      Math.max(house.y - animal.y, 0, animal.y - house.y - house.h),
    );
    const deer = village.wildlife.filter(animal => animal.kind === 'deer');
    expect(deer).toHaveLength(2);
    expect(deer.every(animal => distance(animal) >= 8)).toBe(true);
    village.dispose();
  });

  it('nace de forma estable en suelo pisable sin alterar el estado de la partida', () => {
    const state = foundTwenty(7), before = JSON.stringify(state);
    const first = createVillage(state, 0), second = createVillage(state, 0);
    const animals = first.wildlife.filter(animal => animal.kind === 'deer');
    expect(animals).toHaveLength(2);
    expect(animals).toEqual(second.wildlife.filter(animal => animal.kind === 'deer'));
    const land = terrainOf(state);
    for (const animal of animals) {
      expect(fitsCircle(land, animal.x, animal.y, 0.34)).toBe(true);
      for (const building of state.buildings.filter(item => item.lostTick === null)) {
        const dx = Math.max(building.x - animal.x, 0, animal.x - building.x - building.w);
        const dz = Math.max(building.y - animal.y, 0, animal.y - building.y - building.h);
        expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(8);
      }
    }
    expect(JSON.stringify(state)).toBe(before);
    first.dispose(); second.dispose();
  });

  it('huye de cualquier persona cercana y detecta al cazador desde más lejos', () => {
    const land: Terrain = { width: 24, height: 24, blocked: new Uint8Array(24 * 24) };
    const deer = (): Deer => ({
      body: { id: 40_000, x: 12, z: 12, vx: 0, vz: 0, facing: 0, radius: 0.34, pace: 0.72 },
      home: { x: 12, z: 12 }, pasture: [], target: { x: 12, z: 12 },
      nextChoice: 300, nextAlarm: 0, fleeingUntil: 0, choices: 0,
    });
    const hunter = deer(), passer = deer(), distant = deer();
    for (let step = 0; step < 45; step += 1) {
      stepDeer([hunter], land, 7, step, [{ body: { x: 7, z: 12 }, dayPlan: { job: { place: 'hunt:7' } } }], null);
      stepDeer([passer], land, 7, step, [{ body: { x: 7, z: 12 }, dayPlan: { job: null } }], null);
      stepDeer([distant], land, 7, step, [{ body: { x: 3, z: 12 }, dayPlan: { job: null } }], null);
    }
    expect(hunter.body.x).toBeGreaterThan(13);
    expect(passer.body.x).toBeGreaterThan(13);
    expect(distant.body.x).toBe(12);
    expect(fitsCircle(land, hunter.body.x, hunter.body.z, 0.34)).toBe(true);
  });

  it('mantiene los ciervos lejos de la aldea en una jornada completa', () => {
    const state = foundTwenty(7), before = JSON.stringify(state);
    const village = createVillage(state, 0);
    for (let step = 0; step < 900; step += 1) village.step();
    const animals = village.wildlife.filter(animal => animal.kind === 'deer');
    expect(animals).toHaveLength(2);
    for (const animal of animals) {
      for (const building of state.buildings.filter(item => item.lostTick === null)) {
        const dx = Math.max(building.x - animal.x, 0, animal.x - building.x - building.w);
        const dz = Math.max(building.y - animal.y, 0, animal.y - building.y - building.h);
        expect(Math.hypot(dx, dz)).toBeGreaterThan(5);
      }
    }
    expect(JSON.stringify(state)).toBe(before);
    village.dispose();
  });

  it('apaga el animal si ya no queda bosque de caza', () => {
    const state = foundTwenty(7);
    // El motor conserva la cuenta de árboles; aquí se usa su propio límite de caza.
    state.map.terrain.fill(0);
    expect(createDeer(state, terrainOf(state), 7, { x: 20.5, z: 20.5 })).toEqual([]);
  });
});
