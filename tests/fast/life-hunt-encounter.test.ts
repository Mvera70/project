import { afterEach, describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import type { Animal } from '../../src/derive/animals';
import { createHuntEncounter, type HuntEncounter } from '../../src/render3d/life/hunt-encounter';
import { terrainOf } from '../../src/render3d/life/terrain';
import { createContactWorld, type ContactWorld } from '../../src/render3d/life/physics';
import { standingOf } from '../../src/render3d/life/hunt-bodies';
import { indexSolids, type Terrain } from '../../src/render3d/life/body';
import { foundGame } from '../../src/engine/found';
import type { GameState } from '../../src/engine/state';

// AN-5b · la caza decide con el contacto, así que cada encuentro lleva su mundo
// de Rapier: el suelo, lo que está de pie y el cuerpo que se pinta de la presa.
const worlds: ContactWorld[] = [];
afterEach(() => { for (const world of worlds.splice(0)) world.dispose(); });
async function contactOf(land: Terrain, state?: GameState): Promise<ContactWorld> {
  const world = (await createContactWorld(land, { ground: () => 0,
    ...(state === undefined ? {} : { standing: standingOf(state) }) }))!;
  worlds.push(world);
  return world;
}
const open = (): Terrain => ({ width: 50, height: 50, blocked: new Uint8Array(2500) });
/** El cazador que llega de lejos, como en el juego: a doce celdas, en una dirección sembrada. */
function hunterFrom(seed: number): { id: number; x: number; z: number; vx: number; vz: number; facing: number; radius: number; pace: number } {
  const angle = (seed % 360) * Math.PI / 180;
  return { id: 80_001, x: 25 + Math.cos(angle) * 12, z: 25 + Math.sin(angle) * 12, vx: 0, vz: 0, facing: 0, radius: 0.3, pace: 1.15 };
}
function run(encounter: HuntEncounter, steps: number, wildlife: readonly Animal[] = [], every = 0): void {
  for (let step = 0; step < steps && encounter.completed === null; step += 1) {
    if (every > 0 && step % every === 0) encounter.attack();
    encounter.step(wildlife);
  }
}

describe('encuentro físico de caza', () => {
  it('la perdiz se puede alcanzar en varios valles de fundación', async () => {
    for (const seed of [0, 3, 7, 11, 23]) {
      const state = foundGame(seed);
      const land = terrainOf(state);
      const world = await contactOf(land, state);
      const encounter = createHuntEncounter(state, land, 'partridge', 'sling', () => 0, [], seed, null, false, { world });
      expect(encounter, `semilla ${seed}`).not.toBeNull();
      if (encounter === null) continue;
      run(encounter, 900, [], 40);
      expect(encounter.completed?.killed, `semilla ${seed}`).toBe(true);
    }
  });

  it('permite resolver cada presa común con su arma y exige dos impactos al jabalí', async () => {
    const state = foundTwenty(7);
    const land = terrainOf(state);
    const world = await contactOf(land, state);
    for (const [species, weapon, wounds] of [
      ['partridge', 'sling', 1],
      ['rabbit', 'sling', 1],
      ['boar', 'bow', 2],
    ] as const) {
      const encounter = createHuntEncounter(state, land, species, weapon, () => 0, [], 7, null, false, { world });
      expect(encounter, species).not.toBeNull();
      if (encounter === null) continue;
      run(encounter, 900, [], 40);
      expect(encounter.completed?.killed, species).toBe(true);
      // Hacen falta tantos golpes en lo vital como vida tiene la presa; los del
      // cuarto trasero hieren y cuentan como golpes, pero no matan (AN-5b).
      expect(encounter.strokes.filter(stroke => stroke.outcome === 'hit'), species).toHaveLength(wounds);
      expect(encounter.completed!.hits, species).toBeGreaterThanOrEqual(wounds);
    }
  });

  it('mantiene el ciervo visible, usa proyectiles y completa la caza con una flecha', async () => {
    // El ciervo es arisco (AN-5b): cuál se deja cobrar de un flechazo lo
    // deciden su alerta y el pulso del cazador. Se busca el primero que sí.
    const state = foundTwenty(31);
    const land = open();
    const world = await contactOf(land);
    const before = JSON.stringify(state);
    let found = false;
    for (let seed = 1; seed <= 30 && !found; seed += 1) {
      const deer: Animal = { id: 40_000, kind: 'deer', x: 25, y: 25 };
      const encounter = createHuntEncounter(state, land, 'deer', 'bow', () => 0, [deer], seed * 7919, null, true,
        { hunter: hunterFrom(seed * 7919), world })!;
      expect(encounter.animals[0]?.id).toBe(deer.id);
      let flew = false;
      for (let step = 0; step < 2400 && encounter.completed === null; step += 1) {
        encounter.step([deer]);
        flew ||= encounter.projectiles.some(shot => shot.stuck !== true);
      }
      if (!(encounter.completed?.killed === true && encounter.completed.hits === 1)) continue;
      found = true;
      expect(flew, 'la flecha vuela antes de tocar').toBe(true);
      expect(encounter.completed).toEqual({ sourceTick: state.tick, species: 'deer', weapon: 'bow', hits: 1, killed: true });
      expect(encounter.animals[0]?.action).toBe('down');
    }
    expect(found, 'algún ciervo cae de un flechazo').toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('rechaza especies de snapshot cuando el animal no existe y limita encuentros huidos', async () => {
    const state = foundTwenty(13);
    const land = open();
    expect(createHuntEncounter(state, land, 'bear', 'spear', () => 0, [], 13)).toBeNull();
    const deer: Animal = { id: 40_000, kind: 'deer', x: 25, y: 25 };
    const encounter = createHuntEncounter(state, land, 'deer', 'spear', () => 0, [deer], 13, null, false,
      { world: await contactOf(land) })!;
    for (let step = 0; step < 700 && encounter.completed === null; step += 1) encounter.step([]);
    expect(encounter.completed?.killed).toBe(false);
    expect(encounter.completed?.sourceTick).toBe(state.tick);
  });

  it('el oso exige cuatro golpes; sin atacar hiere al cazador y vuelve a la entrada', async () => {
    const state = foundTwenty(13);
    const land = open();
    const world = await contactOf(land);
    const bear: Animal = { id: 50_000, kind: 'bear', x: 25, y: 25 };
    const den = { x: 25, z: 25 };
    const lost = createHuntEncounter(state, land, 'bear', 'spear', () => 0, [bear], 13, den, false, { world })!;
    for (let step = 0; step < 700 && lost.completed === null; step += 1) lost.step([bear]);
    expect(lost.completed).toEqual({ sourceTick: state.tick, species: 'bear',
      weapon: 'spear', hits: 0, killed: false });
    expect(lost.animals).toEqual([]);
    expect(lost.hunter.clip).toBe('fall');

    // Tocando cada paso (sólo cuenta cuando la lanza está lista), el oso cae
    // alguna vez, y nunca con menos de cuatro estocadas en lo vital. Cuál cae lo
    // decide su ritmo de zarpazo (AN-5b): uno rápido deja al cazador sin la cuarta.
    let fell = 0;
    for (let seed = 13; seed < 25; seed += 1) {
      const won = createHuntEncounter(state, land, 'bear', 'spear', () => 0, [bear], seed, den, false, { world })!;
      for (let step = 0; step < 700 && won.completed === null; step += 1) { won.attack(); won.step([bear]); }
      if (won.completed?.killed !== true) continue;
      fell += 1;
      expect(won.strokes.filter(stroke => stroke.outcome === 'hit').length).toBeGreaterThanOrEqual(4);
      expect(won.animals[0]?.action).toBe('down');
    }
    expect(fell, 'el oso cae alguna vez').toBeGreaterThan(0);
  });

  // El evento rápido (`ui/redesign/hunt-event.ts`) da la puntería de cada toque.
  it('con la puntería a cero la flecha se desvía y la lanza no toca', async () => {
    const state = foundTwenty(31);
    const land = open();
    const world = await contactOf(land);
    const deer: Animal = { id: 40_000, kind: 'deer', x: 25, y: 25 };
    const bow = createHuntEncounter(state, land, 'deer', 'bow', () => 0, [deer], 31, null, false, { world })!;
    for (let step = 0; step < 400 && bow.completed === null; step += 1) { bow.attack(0); bow.step([deer]); }
    expect(bow.completed?.killed ?? false, 'arco fallando').toBe(false);
    const bear: Animal = { id: 50_000, kind: 'bear', x: 25, y: 25 };
    const spear = createHuntEncounter(state, land, 'bear', 'spear', () => 0, [bear], 13, { x: 25, z: 25 }, false, { world })!;
    for (let step = 0; step < 700 && spear.completed === null; step += 1) { spear.attack(0); spear.step([bear]); }
    expect(spear.completed?.hits, 'lanza a destiempo').toBe(0);
  });

  it('un toque mientras el arma se recarga no cuenta', async () => {
    const state = foundTwenty(31);
    const land = open();
    const deer: Animal = { id: 40_000, kind: 'deer', x: 25, y: 25 };
    const encounter = createHuntEncounter(state, land, 'deer', 'bow', () => 0, [deer], 31, null, false,
      { world: await contactOf(land) })!;
    expect(encounter.attack(0)).toBe(true);
    let fired = false;
    for (let step = 0; step < 200 && !fired; step += 1) { encounter.step([deer]); fired = encounter.projectiles.length > 0; }
    expect(fired).toBe(true);
    expect(encounter.attack(1), 'recién disparado').toBe(false);
  });

  // La caza sola (`auto`): aceptar y que el pulso, la presa y el terreno
  // decidan. En sesenta semillas salen los tres finales, y el oso, el más
  // difícil, cae alguna vez.
  it('sola, la caza acaba de las tres maneras', async () => {
    const state = foundTwenty(31);
    const land = open();
    const world = await contactOf(land);
    const outcomes = (species: 'deer' | 'bear', weapon: 'bow' | 'spear') => {
      const tally = { killed: 0, wounded: 0, clean: 0 };
      for (let seed = 1; seed <= 60; seed += 1) {
        const animal: Animal = { id: species === 'bear' ? 50_000 : 40_000, kind: species, x: 25, y: 25 };
        const encounter = createHuntEncounter(state, land, species, weapon, () => 0, [animal], seed * 7919,
          species === 'bear' ? { x: 25, z: 25 } : null, true, { hunter: hunterFrom(seed * 7919), world })!;
        for (let step = 0; step < 2400 && encounter.completed === null; step += 1) encounter.step([animal]);
        const report = encounter.completed!;
        if (report.killed) tally.killed += 1; else if (report.hits > 0) tally.wounded += 1; else tally.clean += 1;
      }
      return tally;
    };
    // Lo físico (AN-5b): el ciervo, del arco o de la lanza, cae, se va herido
    // por el cuarto trasero o se va ileso por un tiro al suelo o una carrera.
    const deer = outcomes('deer', 'bow');
    const speared = outcomes('deer', 'spear');
    expect(deer.killed + speared.killed, 'se cobra').toBeGreaterThan(20);
    expect(deer.wounded + speared.wounded, 'se va malherida').toBeGreaterThan(10);
    expect(deer.clean + speared.clean, 'se escapa ilesa').toBeGreaterThan(10);
    const bear = outcomes('bear', 'spear');
    expect(bear.killed, 'el oso cae alguna vez').toBeGreaterThan(0);
    expect(bear.killed, 'pero no casi siempre').toBeLessThan(40);
  });

  // `senales-en-el-mapa`: caza un aldeano de verdad, que parte de donde está, y
  // la presa que ya estaba a la vista, no una nueva.
  it('el cazador parte del aldeano que se le da, sin aparecer junto a la presa', async () => {
    const state = foundTwenty(31);
    const land = open();
    const deer: Animal = { id: 40_000, kind: 'deer', x: 25, y: 25 };
    const villager = { id: 7, x: 12, z: 30, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1 };
    const encounter = createHuntEncounter(state, land, 'deer', 'bow', () => 0, [deer], 31, null, true,
      { hunter: villager, world: await contactOf(land) })!;
    expect(encounter.hunter).toMatchObject({ x: 12, z: 30 });
    for (let step = 0; step < 30; step += 1) encounter.step([deer]);
    // Anda hacia la presa desde su sitio, y el cuerpo movido es el suyo.
    expect(Math.hypot(villager.x - 12, villager.z - 30)).toBeGreaterThan(0.3);
    expect(Math.hypot(villager.x - 12, villager.z - 30)).toBeLessThan(2);
  });
});

describe('AN-5 · la caza física, fechada y a la vista', () => {
  /** Una empalizada entera en la columna x = 24: nada la cruza. */
  function walled(): Terrain {
    const land = open();
    for (let z = 0; z < 50; z += 1) land.blocked[z * 50 + 24] = 1;
    return land;
  }

  it('la lanza no atraviesa la empalizada: con la presa al otro lado no la toca nunca', async () => {
    const state = foundTwenty(13);
    const land = walled();
    const world = (await createContactWorld(land, { ground: () => 0, standing: () => 0.87 }))!;
    worlds.push(world);
    // El cazador pegado a la empalizada y el jabalí pegado al otro lado: con la
    // regla vieja (distancia 1,1 + radio) lo alcanzaba a través de la madera.
    const bear: Animal = { id: 50_000, kind: 'bear', x: 25.6, y: 25 };
    const villager = { id: 7, x: 23.6, z: 25, vx: 0, vz: 0, facing: Math.PI / 2, radius: 0.3, pace: 1.15 };
    const encounter = createHuntEncounter(state, land, 'bear', 'spear', () => 0, [bear], 13, { x: 30, z: 25 }, false,
      { hunter: villager, world })!;
    for (let step = 0; step < 400 && encounter.completed === null; step += 1) { encounter.attack(); encounter.step([bear]); }
    expect(encounter.strokes.filter(stroke => stroke.outcome === 'hit' || stroke.outcome === 'graze')).toEqual([]);
    expect(encounter.completed?.hits ?? 0).toBe(0);
  });

  it('la estocada que se tuerce contra un tronco se clava, y el gesto se queda en el contacto hasta sacarla', async () => {
    const state = foundTwenty(13);
    const land = open();
    // Un tronco justo a la izquierda de donde entra la lanza.
    const withTrunk: Terrain = { ...land, solids: indexSolids(50, 50, [{ minX: 25.2, maxX: 25.45, minZ: 24.1, maxZ: 24.35 }]) };
    const world = (await createContactWorld(withTrunk, { ground: () => 0 }))!;
    worlds.push(world);
    const bear: Animal = { id: 50_000, kind: 'bear', x: 25, y: 25 };
    const encounter = createHuntEncounter(state, withTrunk, 'bear', 'spear', () => 0, [bear], 13, { x: 30, z: 30 }, false, { world })!;
    let stuckAt = -1;
    const held: number[] = [];
    for (let step = 0; step < 400 && encounter.completed === null; step += 1) {
      // Con la puntería a cero la estocada entra torcida a propósito, hacia el tronco o hacia fuera.
      encounter.attack(0);
      encounter.step([bear]);
      const last = encounter.strokes.at(-1);
      if (stuckAt < 0 && last?.outcome === 'standing') stuckAt = step;
      if (stuckAt >= 0 && step - stuckAt < 20) held.push(encounter.hunter.clipSeconds ?? -1);
    }
    if (stuckAt < 0) return; // la desviación salió hacia el otro lado en esta semilla
    expect(held.every(seconds => seconds === 0), 'la lanza sigue clavada: el gesto, en su contacto').toBe(true);
  });

  it('el golpe va fechado: la estocada empieza en el paso que decide', async () => {
    const state = foundTwenty(13);
    const land = open();
    const bear: Animal = { id: 50_000, kind: 'bear', x: 25, y: 25 };
    const encounter = createHuntEncounter(state, land, 'bear', 'spear', () => 0, [bear], 13, { x: 30, z: 30 }, false,
      { world: await contactOf(land) })!;
    let checked = 0;
    for (let step = 0; step < 400 && encounter.completed === null; step += 1) {
      const before = encounter.strokes.length;
      encounter.attack();
      encounter.step([bear]);
      if (encounter.strokes.length > before && encounter.strokes.at(-1)!.kind === 'thrust') {
        const pose = encounter.hunter;
        expect(['spear_thrust', 'spear_thrust_high', 'spear_thrust_low']).toContain(pose.clip);
        expect(pose.clipSeconds, 'el contacto es t = 0 del gesto').toBe(0);
        expect(pose.weapon).toBe('spear');
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('la pieza cobrada se queda en el suelo con la flecha clavada antes del parte, y el parte espera', async () => {
    const state = foundTwenty(31);
    const land = open();
    const world = await contactOf(land);
    const deer: Animal = { id: 40_000, kind: 'deer', x: 25, y: 25 };
    // La primera caza sola que se cobra.
    let encounter: HuntEncounter | null = null;
    for (let seed = 1; seed <= 30 && encounter === null; seed += 1) {
      const tried = createHuntEncounter(state, land, 'deer', 'bow', () => 0, [deer], seed * 7919, null, true,
        { hunter: hunterFrom(seed * 7919), world })!;
      run(tried, 2400, [deer]);
      if (tried.completed?.killed === true) encounter = tried;
    }
    expect(encounter?.completed?.killed).toBe(true);
    if (encounter === null) return;
    expect(encounter.settled, 'recién cobrada, la escena sigue').toBe(false);
    let steps = 0;
    for (; steps < 300 && !encounter.settled; steps += 1) {
      encounter.step([deer]);
      expect(encounter.animals[0]?.action).toBe('down');
      const stuck = encounter.projectiles.filter(shot => shot.stuck === true);
      expect(stuck.length, 'la flecha sigue en la pieza').toBeGreaterThan(0);
    }
    expect(steps * (1 / 30), 'se ve caída unos segundos').toBeGreaterThanOrEqual(2.5);
    expect(encounter.settled).toBe(true);
  });
});
