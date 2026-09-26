import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import { terrainOf } from '../../src/render3d/life/terrain';
import { fitsCircle } from '../../src/render3d/life/body';
import { createWildPrey, stepWildPrey, wildPreyPosition, type WildKind, type WildPrey } from '../../src/render3d/life/wild-prey';
import { valleyCore } from '../../src/derive/anchors';
import { createDeer } from '../../src/render3d/life/deer';
import { createBear } from '../../src/render3d/life/bear';
import { foundGame } from '../../src/engine/found';

describe('presas silvestres', () => {
  it('encuentra presas y entrada de guarida en valles de distintas semillas', () => {
    for (const seed of [0, 3, 7, 11, 23]) for (const state of [foundGame(seed), foundTwenty(seed)]) {
      const land = terrainOf(state);
      const core = valleyCore(state);
      const heart = { x: core.x, z: core.y };
      for (const species of ['partridge', 'rabbit', 'boar'] as const) {
        expect(createWildPrey(state, land, seed, heart, species), `${seed}:${species}`).not.toBeNull();
      }
      expect(createDeer(state, land, seed, heart).length, `${seed}:deer`).toBeGreaterThan(0);
      state.flags['hunt:boar'] = 0;
      state.flags['bear'] = state.tick + 2;
      expect(createBear(state, land, heart), `${seed}:bear`).not.toBeNull();
    }
  });
  it('elige de forma estable un claro transitable en la zona de caza', () => {
    const state = foundTwenty(7), before = JSON.stringify(state);
    const land = terrainOf(state), heart = { x: 36, z: 56 };
    for (const kind of ['partridge', 'rabbit', 'boar'] as const) {
      const a = createWildPrey(state, land, 7, heart, kind);
      const b = createWildPrey(state, land, 7, heart, kind);
      expect(a).toEqual(b);
      if (a !== null) expect(fitsCircle(land, a.body.x, a.body.z, a.body.radius)).toBe(true);
    }
    expect(JSON.stringify(state)).toBe(before);
  });

  it('mueve conejo y perdiz al huir y deja que el jabalí cargue sin efectos de combate', () => {
    const land = { width: 30, height: 30, blocked: new Uint8Array(900) };
    const make = (kind: WildKind): WildPrey => ({
      kind, body: { id: 42_000, x: 15, z: 15, vx: 0, vz: 0, facing: 0, radius: 0.2, pace: 1 },
      home: { x: 15, z: 15 }, target: { x: 15, z: 15 }, phase: 'roam', health: 1,
      altitude: 0, start: 0, expiresAt: 450,
    });
    const hunter = { body: { x: 12, z: 15 } };
    for (const kind of ['partridge', 'rabbit'] as const) {
      const prey = make(kind);
      for (let step = 0; step < 30; step += 1) stepWildPrey(prey, land, 9, step, [hunter]);
      expect(prey.phase).toBe('flee');
      expect(prey.body.x).toBeGreaterThan(15);
      expect(fitsCircle(land, prey.body.x, prey.body.z, prey.body.radius)).toBe(true);
    }
    const boar = make('boar');
    stepWildPrey(boar, land, 9, 0, [hunter]);
    expect(boar.phase).toBe('charge');
    expect(boar.health).toBe(1);
  });

  it('la perdiz despega antes de aletear, y sube poco a poco', () => {
    const land = { width: 30, height: 30, blocked: new Uint8Array(900) };
    const prey: WildPrey = {
      kind: 'partridge', body: { id: 42_000, x: 15, z: 15, vx: 0, vz: 0, facing: 0, radius: 0.2, pace: 1 },
      home: { x: 15, z: 15 }, target: { x: 15, z: 15 }, phase: 'roam', health: 1,
      altitude: 0, start: 0, expiresAt: 450,
    };
    const hunter = { body: { x: 13, z: 15 } };
    const actions: string[] = [];
    const heights: number[] = [];
    for (let step = 0; step < 90; step += 1) {
      stepWildPrey(prey, land, 9, step, [hunter]);
      actions.push(String(wildPreyPosition(prey)[0]?.action));
      heights.push(prey.altitude);
    }
    // Primero el despegue (el clip de una vez del modelo de Vera), luego el vuelo.
    expect(actions[0]).toBe('takeoff');
    expect(actions.at(-1)).toBe('flight');
    expect(actions.indexOf('flight')).toBeGreaterThan(actions.lastIndexOf('takeoff'));
    // Sin salto: el primer paso no está ya a altura de vuelo.
    expect(heights[0]).toBeLessThan(0.05);
    expect(Math.max(...heights)).toBeGreaterThan(0.15);
  });

  it('mantiene brevemente visible una presa abatida y oculta las desaparecidas', () => {
    const land = { width: 10, height: 10, blocked: new Uint8Array(100) };
    const prey: WildPrey = {
      kind: 'rabbit', body: { id: 42_001, x: 4, z: 4, vx: 0, vz: 0, facing: 0, radius: 0.25, pace: 1 },
      home: { x: 4, z: 4 }, target: { x: 4, z: 4 }, phase: 'down', health: 0,
      altitude: 0, start: 0, expiresAt: 400,
    };
    stepWildPrey(prey, land, 1, 50, []);
    expect(prey.phase).toBe('down');
    expect(wildPreyPosition(prey)[0]?.action).toBe('down');
    prey.phase = 'gone';
    expect(wildPreyPosition(prey)).toEqual([]);
    expect(wildPreyPosition(null)).toEqual([]);
  });
});
