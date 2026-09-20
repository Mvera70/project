import { describe, expect, it } from 'vitest';
import { TERRAIN_CODE } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { castOf } from '../../src/render3d/life/cast';

describe('D4 · la lanza no depende de que alguien haya cargado Rapier', () => {
  it.each([7, 23])('resuelve contacto en la jornada real sin arqueros, semilla %i', seed => {
    const state = foundTwenty(seed);
    state.map.terrain.fill(TERRAIN_CODE.meadow);
    state.traits = ['arms'];
    state.buildings.push({ id: 9999, kind: 'gate', x: 32, y: 48, w: 1, h: 1,
      builtTick: state.tick, lostTick: null, tier: 0, lit: true, blockedUntil: null });
    state.threat.arrivedTick = state.tick;
    state.threat.lastBand = 12;
    state.flags['assault'] = state.tick + 1;
    const before = JSON.stringify(state);
    const land = { width: state.map.width, height: state.map.height,
      blocked: new Uint8Array(state.map.width * state.map.height) };
    // Sin mundo inyectado: es la entrada normal del renderer, no la de las
    // jornadas antiguas que construían Rapier incluso sin arcos.
    const life = createVillage(state, 0, { land });
    expect(life.manned.length).toBeGreaterThan(0);
    expect(life.manned.every(post => post.post.arm !== 'bow')).toBe(true);
    const post = life.manned[0]!;
    const ally = life.dwellers.find(dweller => dweller.dayPlan?.job?.place === post.place.id)!;
    expect(ally).toBeDefined();
    ally.body.x = post.place.at.x; ally.body.z = post.place.at.z;
    ally.body.vx = 0; ally.body.vz = 0;
    // Encuentro controlado para probar el enganche, no el tiempo que tarda
    // la ruta del clan en alcanzar una puerta en una aldea concreta.
    const enemy = life.raiders[0]!;
    expect(enemy).toBeDefined();
    for (const other of life.raiders) other.phase = 'gone';
    enemy.phase = 'breaking';
    enemy.body.x = ally.body.x + 0.6; enemy.body.z = ally.body.z;
    enemy.body.vx = 0; enemy.body.vz = 0;
    life.step();
    expect(enemy.hits).toBe(1);
    expect(enemy.thrustAt).toBe(0);
    expect(ally.combat?.clip).toBe('spear_thrust');
    expect(castOf(life, 10, new Map(), new Set()).find(actor => actor.id === enemy.body.id)?.clip)
      .toBe('spear_thrust');
    for (let step = 1; step <= 30; step += 1) life.step();
    expect(life.defence.lost).toBeGreaterThan(0);
    expect(enemy.phase).toBe('down');
    expect(ally.combat?.clip).toBe('fall');
    expect(life.defence.loosed).toBe(0);
    expect(JSON.stringify(state)).toBe(before);
  });
});
