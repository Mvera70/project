import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { bearPosition, createBear, stepBear, type Bear } from '../../src/render3d/life/bear';
import { stepDeer, type Deer } from '../../src/render3d/life/deer';
import { terrainOf } from '../../src/render3d/life/terrain';
import { fitsCircle, type Terrain } from '../../src/render3d/life/body';

describe('visita del oso', () => {
  it('sólo aparece durante el suceso real, estable y sobre suelo transitable', () => {
    const state = foundTwenty(7);
    const land = terrainOf(state);
    const heart = { x: state.map.width / 2, z: state.map.height / 2 };
    expect(createBear(state, land, heart)).toBeNull();
    state.flags['bear'] = state.tick + 2;
    expect(createBear(state, land, heart)).toBeNull();
    state.flags['hunt:boar'] = 0;
    const before = JSON.stringify(state);
    const first = createVillage(state, 0), second = createVillage(state, 0);
    const bear = first.wildlife.filter(animal => animal.kind === 'bear');
    expect(bear).toHaveLength(1);
    expect(bear).toEqual(second.wildlife.filter(animal => animal.kind === 'bear'));
    expect(fitsCircle(land, bear[0]!.x, bear[0]!.y, 0.52)).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
    first.dispose(); second.dispose();
    state.tick += 2;
    expect(createBear(state, land, heart)).toBeNull();
  });

  it('se detiene y enseña el zarpazo ante una persona; después se retira', () => {
    const land: Terrain = { width: 24, height: 24, blocked: new Uint8Array(24 * 24) };
    const bear: Bear = {
      body: { id: 50_000, x: 10, z: 10, vx: 0, vz: 0, facing: 0, radius: 0.52, pace: 0.56 },
      den: { x: 10, z: 10 }, clearing: { x: 13, z: 10 }, pasture: [],
      phase: 'approach', target: { x: 13, z: 10 }, nextChoice: 0,
      warningUntil: 0, choices: 0,
    };
    stepBear(bear, land, 7, 0, [{ body: { x: 12, z: 10 } }]);
    expect(bear.phase).toBe('warning');
    expect(bearPosition(bear)[0]?.action).toBe('attack');
    for (let step = 1; step < 60; step++) stepBear(bear, land, 7, step, []);
    expect(bear.phase).toBe('gone');
    expect(bearPosition(bear)).toEqual([]);
  });

  it('espanta al ciervo y la visita no altera GameState', () => {
    const land: Terrain = { width: 24, height: 24, blocked: new Uint8Array(24 * 24) };
    const deer: Deer = {
      body: { id: 40_000, x: 14, z: 12, vx: 0, vz: 0, facing: 0, radius: 0.34, pace: 0.72 },
      home: { x: 14, z: 12 }, pasture: [], target: { x: 14, z: 12 },
      nextChoice: 300, nextAlarm: 0, fleeingUntil: 0, choices: 0,
    };
    for (let step = 0; step < 45; step++) {
      stepDeer([deer], land, 7, step, [], null, { x: 10, z: 12 });
    }
    expect(deer.body.x).toBeGreaterThan(15);
    const state = foundTwenty(7);
    state.flags['bear'] = state.tick + 2;
    state.flags['hunt:boar'] = 0;
    const before = JSON.stringify(state);
    const village = createVillage(state, 0);
    expect(village.wildlife.some(animal => animal.kind === 'bear')).toBe(true);
    for (let step = 0; step < 240; step++) village.step();
    expect(JSON.stringify(state)).toBe(before);
    village.dispose();
  });
});
