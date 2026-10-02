import { afterEach, describe, expect, it } from 'vitest';
import { foundTwenty } from '../helpers/founding';
import type { Animal } from '../../src/derive/animals';
import { createHuntEncounter, releaseHunter, type HuntEncounter } from '../../src/render3d/life/hunt-encounter';
import { terrainOf } from '../../src/render3d/life/terrain';
import { createContactWorld, type ContactWorld } from '../../src/render3d/life/physics';
import { standingOf } from '../../src/render3d/life/hunt-bodies';
import { fitsCircle, indexSolids, type Body, type Solid, type Terrain } from '../../src/render3d/life/body';
import { foundGame } from '../../src/engine/found';
import type { GameState } from '../../src/engine/state';
import { pathTo } from '../../src/render3d/life/navigate';

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
    // Lo que se guarda son las armas y las heridas, así que se mira en un valle
    // donde el cazador de la prueba —que se pone a cuatro celdas de la presa,
    // sin mirar si en medio pasa el río— llega andando: un camino que no pase
    // de vez y media la línea recta. Con el valle de forma natural (v5.73) el
    // jabalí de la semilla 7 —la única que miraba esta prueba— nacía junto al
    // río con el cazador en la otra orilla: rodeaba por el vado y el jabalí se
    // iba, que es la caza y no un fallo de las armas. En el juego el cazador
    // es un aldeano que sale de donde está (`renderer.ts`, `nearestHunter`).
    let chosen: { state: GameState; land: Terrain; seed: number } | undefined;
    for (const seed of [7, 3, 19, 23, 31]) {
      const candidate = foundTwenty(seed);
      const ground = terrainOf(candidate);
      const near = (['partridge', 'rabbit', 'boar'] as const).every((kind) => {
        const probe = createHuntEncounter(candidate, ground, kind, 'bow', () => 0, [], seed, null, false, {});
        const prey = probe?.animals[0];
        if (probe === null || prey === undefined) return false;
        const from = { x: probe.hunter.x, z: probe.hunter.z };
        const to = { x: prey.x, z: prey.y };
        const path = pathTo(ground, from, to);
        if (path === null) return false;
        let walked = 0;
        let at = from;
        for (const step of path) { walked += Math.hypot(step.x - at.x, step.z - at.z); at = step; }
        return walked <= 1.5 * Math.hypot(to.x - from.x, to.z - from.z) + 2;
      });
      if (near) { chosen = { state: candidate, land: ground, seed }; break; }
    }
    expect(chosen, 'algún valle donde el cazador llega andando a las tres presas').toBeDefined();
    if (chosen === undefined) return;
    const { state, land, seed } = chosen;
    const world = await contactOf(land, state);
    for (const [species, weapon, wounds] of [
      ['partridge', 'sling', 1],
      ['rabbit', 'sling', 1],
      ['boar', 'bow', 2],
    ] as const) {
      const encounter = createHuntEncounter(state, land, species, weapon, () => 0, [], seed, null, false, { world });
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

  it('la estocada que se tuerce contra un tronco se clava: el gesto se queda en el contacto hasta sacarla, o hasta que el zarpazo se la arranca', async () => {
    const state = foundTwenty(13);
    // Un tronco justo a la izquierda de donde entra la lanza.
    const withTrunk: Terrain = { ...open(), solids: indexSolids(50, 50, [{ minX: 25.2, maxX: 25.45, minZ: 24.1, maxZ: 24.35 }]) };
    let stuck = 0;
    // Dónde se planta el cazador depende del ritmo sembrado de cada oso: en unas
    // semillas la lanza torcida da en el tronco y en otras sale al aire.
    for (let seed = 1; seed <= 20; seed += 1) {
      const world = (await createContactWorld(withTrunk, { ground: () => 0 }))!;
      worlds.push(world);
      const bear: Animal = { id: 50_000, kind: 'bear', x: 25, y: 25 };
      const encounter = createHuntEncounter(state, withTrunk, 'bear', 'spear', () => 0, [bear], seed, { x: 30, z: 30 }, false, { world })!;
      let stuckAt = -1;
      let strokesThen = 0;
      let torn = false;
      for (let step = 0; step < 400 && encounter.completed === null; step += 1) {
        // Con la puntería a cero la estocada entra torcida a propósito, hacia el tronco o hacia fuera.
        encounter.attack(0);
        encounter.step([bear]);
        if (stuckAt < 0 && encounter.strokes.at(-1)?.outcome === 'standing') { stuckAt = step; strokesThen = encounter.strokes.length; }
        // Hasta la estocada siguiente: 0,8 s clavada, y el zarpazo y su medio segundo.
        const since = step - stuckAt;
        if (stuckAt < 0 || since >= 45 || encounter.strokes.length !== strokesThen) continue;
        const { clip, clipSeconds } = encounter.hunter;
        if (clip === 'hit_take') { torn = true; continue; }
        const thrusting = clip === 'spear_thrust' || clip === 'spear_thrust_high' || clip === 'spear_thrust_low';
        if (torn) {
          expect(thrusting, `semilla ${seed}: arrancada la lanza, la estocada no se retoma a medias`).toBe(false);
        } else if (since < 20) {
          expect(thrusting, `semilla ${seed}: clavada, el gesto sigue en la estocada`).toBe(true);
          expect(clipSeconds, `semilla ${seed}: clavada, el gesto sigue en su contacto`).toBe(0);
        }
      }
      if (stuckAt >= 0) stuck += 1;
    }
    expect(stuck, 'en alguna semilla la lanza torcida da en el tronco').toBeGreaterThan(0);
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

  it('la presa acusa el golpe: se sacude hacia donde va la lanza y vuelve a su sitio en dos décimas', async () => {
    const state = foundTwenty(13);
    const land = open();
    let shaken = 0;
    let back = 0;
    for (const seed of [13, 17, 23]) {
      const bear: Animal = { id: 50_000, kind: 'bear', x: 25, y: 25 };
      const encounter = createHuntEncounter(state, land, 'bear', 'spear', () => 0, [bear], seed, { x: 30, z: 30 }, false,
        { world: await contactOf(land) })!;
      for (let step = 0; step < 600 && encounter.completed === null; step += 1) {
        const rest = encounter.animals[0]!;
        const before = encounter.strokes.length;
        encounter.attack();
        encounter.step([bear]);
        if (encounter.strokes.length === before || encounter.strokes.at(-1)!.kind !== 'thrust') continue;
        // Al alcance de la lanza el oso no se mueve: lo que se aparta es la sacudida.
        const struck = encounter.animals[0]!;
        const push = { x: struck.x - rest.x, z: struck.y - rest.y };
        const along = { x: rest.x - encounter.hunter.x, z: rest.y - encounter.hunter.z };
        expect(Math.hypot(push.x, push.z), `semilla ${seed}: se sacude`).toBeGreaterThan(0.01);
        expect(push.x * along.x + push.z * along.z, `semilla ${seed}: hacia donde va la lanza`).toBeGreaterThan(0);
        shaken += 1;
        // Si en esas dos décimas el cazador sigue a su lado (el oso sólo embiste
        // a quien está a más de 1,2) y no acaba la caza, vuelve justo adonde estaba.
        let moved = false;
        for (let n = 0; n < Math.round(0.2 * 30); n += 1) {
          moved ||= Math.hypot(encounter.hunter.x - rest.x, encounter.hunter.z - rest.y) > 1.1;
          encounter.step([bear]);
          moved ||= encounter.completed !== null || encounter.animals.length === 0;
        }
        if (!moved) {
          const after = encounter.animals[0]!;
          expect(Math.hypot(after.x - rest.x, after.y - rest.y), `semilla ${seed}: y vuelve a su sitio`).toBeLessThan(1e-9);
          back += 1;
        }
        break;
      }
    }
    expect(shaken, 'las tres cazas dan una estocada').toBe(3);
    expect(back, 'y en alguna se ve volver').toBeGreaterThan(0);
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

describe('Revisión del 30 sep 2026 · el cazador vuelve a su vida donde cabe', () => {
  // Se mueve con 0,22 para colarse entre troncos y vuelve a su vida con la
  // holgura del aldeano (0,32): acabada la caza puede estar donde ésta no cabe,
  // y ahí `integrate` no le deja moverse (32 de 184 cazas en la revisión).
  /** Un pasillo de 0,55 entre dos muros, lejos de la caza: cabe 0,22 y no cabe 0,32. */
  const corridor = (): Terrain => ({ ...open(), solids: indexSolids(50, 50, [
    { minX: 44.2, maxX: 44.8, minZ: 44, maxZ: 46 },
    { minX: 45.35, maxX: 45.95, minZ: 44, maxZ: 46 },
  ]) });

  it('acabada la caza, sale andando a donde cabe antes de dar la escena por vista', async () => {
    const state = foundTwenty(31);
    const land = corridor();
    const world = await contactOf(land);
    const deer: Animal = { id: 40_000, kind: 'deer', x: 25, y: 25 };
    let checked = 0;
    for (let seed = 1; seed <= 30 && checked < 2; seed += 1) {
      const hunter: Body = { ...hunterFrom(seed * 7919), radius: 0.32 };
      const encounter = createHuntEncounter(state, land, 'deer', 'bow', () => 0, [deer], seed * 7919, null, true,
        { hunter, world })!;
      run(encounter, 2400, [deer]);
      if (encounter.completed === null) continue;
      // Donde acabe, se le lleva al pasillo: ahí se cuela un cazador y no cabe un aldeano.
      hunter.x = 45.075; hunter.z = 45;
      expect(fitsCircle(land, hunter.x, hunter.z, 0.22) && !fitsCircle(land, hunter.x, hunter.z, 0.32)).toBe(true);
      let before = { x: hunter.x, z: hunter.z };
      let steps = 0;
      for (; steps < 900 && !encounter.settled; steps += 1) {
        encounter.step([deer]);
        const moved = Math.hypot(hunter.x - before.x, hunter.z - before.z);
        expect(moved, `semilla ${seed}: sale andando, sin saltos`).toBeLessThanOrEqual(1.15 / 30 + 1e-6);
        before = { x: hunter.x, z: hunter.z };
      }
      expect(encounter.settled, `semilla ${seed}: la escena acaba`).toBe(true);
      expect(fitsCircle(land, hunter.x, hunter.z, 0.32), `semilla ${seed}: acaba donde cabe un aldeano`).toBe(true);
      expect(Math.hypot(hunter.x - 45.075, hunter.z - 45), `semilla ${seed}: al sitio libre más cercano`).toBeLessThan(2);
      checked += 1;
    }
    expect(checked, 'dos cazas acabadas').toBe(2);
  });

  it('al soltarlo, si aún no cabe, se le pone al lado; si cabe, no se le toca', () => {
    const land = corridor();
    const stuck: Body = { id: 1, x: 45.075, z: 45, vx: 0.3, vz: 0, facing: 0, radius: 0.32, pace: 1 };
    releaseHunter(land, stuck);
    expect(fitsCircle(land, stuck.x, stuck.z, 0.32)).toBe(true);
    expect(Math.hypot(stuck.x - 45.075, stuck.z - 45)).toBeLessThan(2);
    expect(stuck.vx).toBe(0);
    const free: Body = { id: 2, x: 20, z: 20, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1 };
    releaseHunter(land, free);
    expect({ x: free.x, z: free.z }).toEqual({ x: 20, z: 20 });
  });
});

describe('Revisión del 30 sep 2026 · la caza sin picos, y la escena que se pierde', () => {
  it('con la presa donde no se llega, ningún paso de caza recorre el valle entero', async () => {
    // Un bosque de troncos y la presa dentro de un cercado de tablas cerrado: por
    // celdas se llega, y a paso de cazador no. Cada replanteo probaba hasta cinco
    // caminos y cada uno recorría la región entera dos veces: pasos de 1,4 a 2,6 s
    // en esta máquina. Se cuenta el trabajo y no el tiempo, para que no dependa
    // de la máquina: las consultas a los sólidos de cada paso.
    const solids: Solid[] = [];
    for (let z = 5; z < 55; z += 1) for (let x = 5; x < 55; x += 1) solids.push({ minX: x + 0.4, maxX: x + 0.6, minZ: z + 0.4, maxZ: z + 0.6 });
    solids.push({ minX: 30, maxX: 37, minZ: 30, maxZ: 30.6 }, { minX: 30, maxX: 37, minZ: 36.4, maxZ: 37 },
      { minX: 30, maxX: 30.6, minZ: 30, maxZ: 37 }, { minX: 36.4, maxX: 37, minZ: 30, maxZ: 37 });
    const index = indexSolids(60, 60, solids) as Map<number, readonly Solid[]>;
    let lookups = 0;
    const counted = new Proxy(index, { get(target, key) {
      if (key === 'get') return (cell: number) => { lookups += 1; return target.get(cell); };
      const value = Reflect.get(target, key) as unknown;
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    } });
    const land: Terrain = { width: 60, height: 60, blocked: new Uint8Array(3600), solids: counted };
    const world = (await createContactWorld(land, { ground: () => 0 }))!;
    worlds.push(world);
    const deer: Animal = { id: 40_000, kind: 'deer', x: 33, y: 33 };
    const hunter: Body = { id: 80_001, x: 12, z: 12, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.15 };
    const encounter = createHuntEncounter(foundTwenty(7), land, 'deer', 'spear', () => 0, [deer], 11, null, true, { hunter, world })!;
    let worst = 0;
    for (let step = 0; step < 300 && encounter.completed === null; step += 1) {
      lookups = 0;
      encounter.step([deer]);
      worst = Math.max(worst, lookups);
    }
    // Medido: 518 590 consultas el peor paso con el tope; 9 767 039 sin él.
    expect(worst).toBeLessThan(1_500_000);
  });

  it('una escena que ya no se puede ver se acaba con su parte, sin pieza, para que la semana no espere', async () => {
    const state = foundTwenty(31);
    const land = open();
    const deer: Animal = { id: 40_000, kind: 'deer', x: 25, y: 25 };
    const encounter = createHuntEncounter(state, land, 'deer', 'bow', () => 0, [deer], 7919, null, true,
      { hunter: hunterFrom(7919), world: await contactOf(land) })!;
    for (let step = 0; step < 20; step += 1) encounter.step([deer]);
    expect(encounter.completed, 'la caza sigue en marcha').toBeNull();
    const report = encounter.abandon();
    expect(report).toMatchObject({ sourceTick: state.tick, species: 'deer', weapon: 'bow', killed: false });
    expect(encounter.completed, 'y ya tiene parte').toEqual(report);
    expect(encounter.abandon(), 'la segunda vez, el mismo').toEqual(report);
  });
});

describe('Revisión del 30 sep 2026 · el zarpazo del oso se ve entero', () => {
  it('tras cada zarpazo el oso sigue alzado lo que dura su clip, sin que la embestida lo corte', async () => {
    const state = foundTwenty(13);
    const land = open();
    let seen = 0;
    for (const seed of [13, 17, 23]) {
      const bear: Animal = { id: 50_000, kind: 'bear', x: 25, y: 25 };
      const encounter = createHuntEncounter(state, land, 'bear', 'spear', () => 0, [bear], seed, { x: 30, z: 30 }, false,
        { world: await contactOf(land) })!;
      let swipeAt = -1;
      for (let step = 0; step < 600 && encounter.completed === null; step += 1) {
        const before = encounter.animals[0]?.action;
        encounter.attack();
        encounter.step([bear]);
        const action = encounter.animals[0]?.action;
        if (swipeAt < 0 && action === 'attack' && before !== 'attack') { swipeAt = step; continue; }
        if (swipeAt < 0) continue;
        // Los tres segundos del clip `attack` (el aviso de la visita): alzado todo el rato.
        if (step - swipeAt >= 90 || encounter.completed !== null) break;
        expect(action, `semilla ${seed}, ${step - swipeAt} pasos tras el zarpazo`).toBe('attack');
      }
      if (swipeAt >= 0) seen += 1;
    }
    expect(seen, 'hubo zarpazos que mirar').toBeGreaterThan(0);
  });
});
