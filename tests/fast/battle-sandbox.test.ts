// El banco de batallas (`?sandbox=battle`, `src/ui/sandbox.ts`). 27 sep 2026.
//
// Lo que se guarda: el banco pone los cuerpos que se le piden a cada lado —más
// allá de los topes del juego—, con el arma que se elige; lee la batalla sin
// equivocarse de estado; y nada de eso toca el motor.

import { describe, expect, it } from 'vitest';
import { TERRAIN_CODE, type Building, type GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { garrisonAs, garrisonOf } from '../../src/derive/garrison';
import { battleOutcome, battleSetupFrom, battleUrl } from '../../src/ui/sandbox';
import type { BattleStats } from '../../src/render3d/renderer';

/** Un cerco llano con portón, atalaya y muralla, y un asalto que llega hoy. */
function walled(seed: number): GameState {
  const state = foundTwenty(seed);
  state.map.terrain.fill(TERRAIN_CODE.meadow);
  const piece = (id: number, kind: Building['kind'], x: number, y: number): Building => ({
    id, kind, x, y, w: kind === 'watchtower' ? 2 : 1, h: kind === 'watchtower' ? 2 : 1,
    builtTick: state.tick, lostTick: null, tier: 1, lit: true, blockedUntil: null,
  });
  state.buildings.push(piece(9000, 'gate', 32, 40), piece(9001, 'watchtower', 36, 38));
  for (let n = 0; n < 20; n += 1) state.buildings.push(piece(9100 + n, 'wall', 20 + n, 40));
  state.traits = ['arms', 'bows'];
  state.threat.arrivedTick = state.tick;
  state.threat.lastBand = 12;
  state.flags['assault'] = state.tick + 1;
  return state;
}

describe('el banco de batallas', () => {
  it('lee la dirección con topes y la vuelve a escribir igual', () => {
    const setup = battleSetupFrom('?sandbox=battle&defenders=30&arm=spear&raiders=500&seed=11&year=70');
    expect(setup).toEqual({ seed: 11, year: 70, defenders: 30, arm: 'spear', raiders: 80 });
    expect(battleSetupFrom('?sandbox=battle')).toEqual({ seed: 7, year: 60, defenders: 6, arm: 'bow', raiders: 12 });
    const url = battleUrl(setup, '/project/');
    expect(battleSetupFrom(url.slice(url.indexOf('?')))).toEqual(setup);
  });

  it('sube las manos que se piden, con su arma, y el portón sigue con lanza', () => {
    const state = walled(7);
    const game = garrisonOf(state);
    const chosen = garrisonAs(state, 15, 'bow');
    expect(chosen.hands, 'más allá del tope de §12').toBeGreaterThan(game.hands);
    expect(chosen.hands).toBe(15);
    expect(chosen.posts.filter((post) => post.on === 'gate').every((post) => post.arm === 'spear')).toBe(true);
    expect(chosen.posts.filter((post) => post.on !== 'gate').every((post) => post.arm === 'bow')).toBe(true);
    const spears = garrisonAs(state, 15, 'spear');
    expect(spears.posts.every((post) => post.arm === 'spear')).toBe(true);
  });

  it('la jornada monta los asaltantes y la guarnición pedidos, sin tocar el motor', () => {
    for (const seed of [7, 23]) {
      const state = walled(seed);
      const before = JSON.stringify(state);
      const life = createVillage(state, 0, { battle: { raiders: 30, garrison: garrisonAs(state, 10, 'bow') } });
      expect(life.raiders.length, `semilla ${seed}: más allá de los doce del juego`).toBe(30);
      expect(life.manned.length, `semilla ${seed}`).toBe(10);
      for (let step = 0; step < 20; step += 1) life.step();
      expect(JSON.stringify(state), 'el motor no se entera').toBe(before);
      // Y sin el banco, lo del juego: como mucho doce.
      expect(createVillage(state, 0).raiders.length).toBeLessThanOrEqual(12);
    }
  });

  it('dice en qué va la batalla', () => {
    const stats = (phases: Record<string, number>, entered = false): BattleStats => ({
      garrison: 6, archers: 5, raiders: Object.values(phases).reduce((a, b) => a + b, 0), phases,
      defence: { loosed: 0, hits: 0, fallen: 0, lost: 0, gate: { at: { x: 0, z: 0 }, hitAt: null, hits: 0, broken: entered, entered } },
      physics: null, drawCalls: 0, triangles: 0, actors: 0,
    } as unknown as BattleStats);
    expect(battleOutcome(stats({ coming: 12 }))).toBe('waiting');
    expect(battleOutcome(stats({ coming: 4, breaking: 8 }))).toBe('fighting');
    expect(battleOutcome(stats({ down: 10, gone: 2 }))).toBe('held');
    expect(battleOutcome(stats({ down: 3, inside: 9 }, true))).toBe('stormed');
  });
});
