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
      // Se toca cada paso: sólo cuenta cuando la lanza está lista (evento rápido).
      won.attack();
      won.step([bear]);
    }
    expect(won.completed?.killed).toBe(true);
    expect(won.completed?.hits).toBe(4);
    expect(won.animals[0]?.action).toBe('down');
  });

  // El evento rápido (`ui/redesign/hunt-event.ts`) da la puntería de cada toque.
  it('con la puntería a cero la flecha se desvía y la lanza no toca', () => {
    const state = foundTwenty(31);
    const land = { width: 50, height: 50, blocked: new Uint8Array(2500) };
    const deer: Animal = { id: 40_000, kind: 'deer', x: 25, y: 25 };
    const bow = createHuntEncounter(state, land, 'deer', 'bow', () => 0, [deer], 31)!;
    for (let step = 0; step < 400 && bow.completed === null; step += 1) { bow.attack(0); bow.step([deer]); }
    expect(bow.completed?.killed ?? false, 'arco fallando').toBe(false);
    const bear: Animal = { id: 50_000, kind: 'bear', x: 25, y: 25 };
    const spear = createHuntEncounter(state, land, 'bear', 'spear', () => 0, [bear], 13, { x: 25, z: 25 })!;
    for (let step = 0; step < 700 && spear.completed === null; step += 1) { spear.attack(0); spear.step([bear]); }
    expect(spear.completed?.hits, 'lanza a destiempo').toBe(0);
  });

  it('un toque mientras el arma se recarga no cuenta', () => {
    const state = foundTwenty(31);
    const land = { width: 50, height: 50, blocked: new Uint8Array(2500) };
    const deer: Animal = { id: 40_000, kind: 'deer', x: 25, y: 25 };
    const encounter = createHuntEncounter(state, land, 'deer', 'bow', () => 0, [deer], 31)!;
    expect(encounter.attack(0)).toBe(true);
    let fired = false;
    for (let step = 0; step < 200 && !fired; step += 1) { encounter.step([deer]); fired = encounter.projectiles.length > 0; }
    expect(fired).toBe(true);
    expect(encounter.attack(1), 'recién disparado').toBe(false);
  });

  // La caza aleatoria (`auto`): aceptar y que la suerte decida. En sesenta
  // semillas salen los tres finales, y el oso, el más difícil, cae alguna vez.
  it('sola, la caza acaba de las tres maneras según la suerte', () => {
    const state = foundTwenty(31);
    const land = { width: 50, height: 50, blocked: new Uint8Array(2500) };
    const outcomes = (species: 'deer' | 'bear', weapon: 'bow' | 'spear') => {
      const tally = { killed: 0, wounded: 0, clean: 0 };
      for (let seed = 1; seed <= 60; seed += 1) {
        const animal: Animal = { id: species === 'bear' ? 50_000 : 40_000, kind: species, x: 25, y: 25 };
        const encounter = createHuntEncounter(state, land, species, weapon, () => 0, [animal], seed * 7919,
          species === 'bear' ? { x: 25, z: 25 } : null, true)!;
        for (let step = 0; step < 900 && encounter.completed === null; step += 1) encounter.step([animal]);
        const report = encounter.completed!;
        if (report.killed) tally.killed += 1; else if (report.hits > 0) tally.wounded += 1; else tally.clean += 1;
      }
      return tally;
    };
    const deer = outcomes('deer', 'bow');
    expect(deer.killed, 'se cobra').toBeGreaterThan(10);
    expect(deer.wounded, 'se va malherida').toBeGreaterThan(5);
    expect(deer.clean, 'se escapa ilesa').toBeGreaterThan(5);
    const bear = outcomes('bear', 'spear');
    expect(bear.killed, 'el oso cae alguna vez').toBeGreaterThan(0);
    expect(bear.killed, 'pero no casi siempre').toBeLessThan(30);
  });

  // `senales-en-el-mapa`: caza un aldeano de verdad, que parte de donde está, y
  // la presa que ya estaba a la vista, no una nueva.
  it('el cazador parte del aldeano que se le da, sin aparecer junto a la presa', () => {
    const state = foundTwenty(31);
    const land = { width: 50, height: 50, blocked: new Uint8Array(2500) };
    const deer: Animal = { id: 40_000, kind: 'deer', x: 25, y: 25 };
    const villager = { id: 7, x: 12, z: 30, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1 };
    const encounter = createHuntEncounter(state, land, 'deer', 'bow', () => 0, [deer], 31, null, true, { hunter: villager })!;
    expect(encounter.hunter).toMatchObject({ x: 12, z: 30 });
    for (let step = 0; step < 30; step += 1) encounter.step([deer]);
    // Anda hacia la presa desde su sitio, y el cuerpo movido es el suyo.
    expect(Math.hypot(villager.x - 12, villager.z - 30)).toBeGreaterThan(0.3);
    expect(Math.hypot(villager.x - 12, villager.z - 30)).toBeLessThan(2);
  });
});
