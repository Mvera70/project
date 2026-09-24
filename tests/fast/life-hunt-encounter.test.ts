import { describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import type { Animal } from '../../src/derive/animals';
import { createHuntEncounter } from '../../src/render3d/life/hunt-encounter';
import { terrainOf } from '../../src/render3d/life/terrain';
import { foundGame } from '../../src/engine/found';

describe('encuentro físico de caza', () => {
  it('la perdiz se puede alcanzar en varios valles de fundación', () => {
    for (const seed of [0, 3, 7, 11, 23]) {
      const state = foundGame(seed);
      const encounter = createHuntEncounter(state, terrainOf(state), 'partridge', 'sling',
        () => 0, [], seed);
      expect(encounter, `semilla ${seed}`).not.toBeNull();
      if (encounter === null) continue;
      for (let step = 0; step < 600 && encounter.completed === null; step += 1) {
        if (step % 40 === 0) encounter.attack();
        encounter.step([]);
      }
      expect(encounter.completed?.killed, `semilla ${seed}`).toBe(true);
    }
  });
  it('permite resolver cada presa común con su arma y exige dos impactos al jabalí', () => {
    const state = foundTwenty(7);
    const land = terrainOf(state);
    for (const [species, weapon, wounds] of [
      ['partridge', 'sling', 1],
      ['rabbit', 'sling', 1],
      ['boar', 'bow', 2],
    ] as const) {
      const encounter = createHuntEncounter(state, land, species, weapon,
        () => 0, [], 7);
      expect(encounter, species).not.toBeNull();
      if (encounter === null) continue;
      for (let step = 0; step < 600 && encounter.completed === null; step += 1) {
        if (step % 40 === 0) encounter.attack();
        encounter.step([]);
      }
      expect(encounter.completed?.killed, species).toBe(true);
      expect(encounter.completed?.hits, species).toBe(wounds);
    }
  });
  it('mantiene el ciervo visible, usa proyectiles y completa la caza con una flecha', () => {
    const state = foundTwenty(31);
    const land = { width: 50, height: 50, blocked: new Uint8Array(2500) };
    const deer: Animal = { id: 40_000, kind: 'deer', x: 25, y: 25 };
    const before = JSON.stringify(state);
    const encounter = createHuntEncounter(state, land, 'deer', 'bow', () => 0, [deer], 31);
    expect(encounter).not.toBeNull();
    if (encounter === null) return;
    expect(encounter.animals[0]?.id).toBe(deer.id);
    expect(encounter.attack()).toBe(true);
    for (let step = 0; step < 100 && encounter.completed === null; step += 1) {
      encounter.step([deer]);
      if (step < 90) expect(encounter.projectiles.length).toBeGreaterThanOrEqual(0);
    }
    expect(encounter.completed).toEqual({ sourceTick: state.tick, species: 'deer', weapon: 'bow', hits: 1, killed: true });
    expect(encounter.animals[0]?.action).toBe('down');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('rechaza especies de snapshot cuando el animal no existe y limita encuentros huidos', () => {
    const state = foundTwenty(13);
    const land = { width: 50, height: 50, blocked: new Uint8Array(2500) };
    expect(createHuntEncounter(state, land, 'bear', 'spear', () => 0, [], 13)).toBeNull();

    const deer: Animal = { id: 40_000, kind: 'deer', x: 25, y: 25 };
    const encounter = createHuntEncounter(state, land, 'deer', 'spear', () => 0, [deer], 13);
    expect(encounter).not.toBeNull();
    if (encounter === null) return;
    for (let step = 0; step < 700 && encounter.completed === null; step += 1) encounter.step([]);
    expect(encounter.completed?.killed).toBe(false);
    expect(encounter.completed?.sourceTick).toBe(state.tick);
  });

  it('el oso exige cuatro golpes; sin atacar hiere al cazador y vuelve a la entrada', () => {
    const state = foundTwenty(13);
    const land = { width: 50, height: 50, blocked: new Uint8Array(2500) };
    const bear: Animal = { id: 50_000, kind: 'bear', x: 25, y: 25 };
    const den = { x: 25, z: 25 };
    const lost = createHuntEncounter(state, land, 'bear', 'spear', () => 0, [bear], 13, den)!;
    for (let step = 0; step < 700 && lost.completed === null; step += 1) lost.step([bear]);
    expect(lost.completed).toEqual({ sourceTick: state.tick, species: 'bear',
      weapon: 'spear', hits: 0, killed: false });
    expect(lost.animals).toEqual([]);
    expect(lost.hunter.clip).toBe('fall');

    const won = createHuntEncounter(state, land, 'bear', 'spear', () => 0, [bear], 13, den)!;
    for (let step = 0; step < 700 && won.completed === null; step += 1) {
      if (step % 25 === 0) won.attack();
      won.step([bear]);
    }
    expect(won.completed?.killed).toBe(true);
    expect(won.completed?.hits).toBe(4);
    expect(won.animals[0]?.action).toBe('down');
  });
});
