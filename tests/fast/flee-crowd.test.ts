import { describe, expect, it } from 'vitest';
import { TERRAIN_CODE, type GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';
import { createVillage, type Village } from '../../src/render3d/life/village';
import { castOf } from '../../src/render3d/life/cast';
import { beginFlight, stepFlight } from '../../src/render3d/life/flee';
import { gap, penetration, type Terrain } from '../../src/render3d/life/body';
import { createNeighbourhood } from '../../src/render3d/life/grid';

function assaulted(seed: number): { state: GameState; life: Village; land: Terrain } {
  const state = foundTwenty(seed);
  state.map.terrain.fill(TERRAIN_CODE.meadow);
  state.traits = ['arms'];
  state.buildings.push({ id: 99_999, kind: 'gate', x: 32, y: 48, w: 1, h: 1,
    builtTick: state.tick, lostTick: null, tier: 0, lit: true, blockedUntil: null });
  state.threat.arrivedTick = state.tick;
  state.threat.lastBand = 12;
  state.flags['assault'] = state.tick + 1;
  const land: Terrain = { width: state.map.width, height: state.map.height,
    blocked: new Uint8Array(state.map.width * state.map.height) };
  return { state, life: createVillage(state, 0, { land }), land };
}

function forceEntry(life: Village): void {
  const enemy = life.raiders[0]!;
  for (const other of life.raiders) other.phase = 'gone';
  enemy.phase = 'inside';
  enemy.entered = true;
  enemy.deadline = 1_000_000;
  enemy.body.x = Math.max(1, enemy.inside.x - 6);
  enemy.body.z = enemy.inside.z;
  enemy.route = [];
}

describe('punto 3 · la partida ocupa sitio', () => {
  it.each([7, 23])('separa coincidencias sin empujar dentro del muro, semilla %i', seed => {
    const { life, land } = assaulted(seed);
    const [a, b, fallen] = life.raiders;
    expect(a).toBeDefined(); expect(b).toBeDefined(); expect(fallen).toBeDefined();
    for (const raider of life.raiders) raider.phase = 'gone';
    a!.phase = 'standing'; b!.phase = 'standing'; fallen!.phase = 'down';
    a!.standingUntil = b!.standingUntil = 1_000_000;

    // Dos cuerpos justo contra la cara libre de una pared, y un caído en el
    // mismo punto que no participa en la corrección.
    land.blocked[10 * land.width + 4] = 1;
    for (const raider of [a!, b!, fallen!]) {
      raider.body.x = 5.32; raider.body.z = 10.5;
      raider.body.vx = 0; raider.body.vz = 0;
    }
    const before = [a!, b!].map(r => ({ x: r.body.x, z: r.body.z }));
    const fallenBefore = { x: fallen!.body.x, z: fallen!.body.z };
    life.step(0.9);

    expect(gap(a!.body, b!.body), 'los activos ya no comparten centro').toBeGreaterThan(0);
    for (const [index, raider] of [a!, b!].entries()) {
      expect(gap(before[index]!, raider.body), 'sigue el FIX_CAP existente').toBeLessThanOrEqual(0.060001);
      expect(penetration(land, raider.body.x, raider.body.z, raider.body.radius),
        'la separación no atraviesa el muro').toBeLessThanOrEqual(1e-9);
    }
    expect({ x: fallen!.body.x, z: fallen!.body.z }, 'el caído queda excluido').toEqual(fallenBefore);
  });
});

describe('punto 4 · los civiles huyen', () => {
  it('no nace en paz ni del recuerdo de un atacante desaparecido', () => {
    const calm = createVillage(foundTwenty(7), 0);
    calm.step();
    expect(calm.dwellers.every(d => d.flight === null || d.flight === undefined)).toBe(true);

    const { life } = assaulted(7);
    for (const raider of life.raiders) {
      raider.entered = true;
      raider.phase = 'gone';
    }
    life.step(0.9);
    expect(life.dwellers.every(d => d.flight === null || d.flight === undefined)).toBe(true);
  });

  it.each([7, 23])('corre por una ruta, excluye guardia e interior y conserva el motor, semilla %i', seed => {
    const { state, life } = assaulted(seed);
    const defended = new Set(life.manned.map(post => post.place.id));
    const guard = life.dwellers.find(d => defended.has(d.dayPlan?.job?.place ?? ''));
    const sleeper = life.dwellers.find(d => d !== guard && d.residence !== undefined);
    expect(guard).toBeDefined(); expect(sleeper).toBeDefined();
    sleeper!.residence!.stage = 'sleeping';
    const beforeState = JSON.stringify(state);
    forceEntry(life);

    life.step(0.9);
    expect(guard!.flight ?? null, 'el defensor no abandona su puesto').toBeNull();
    expect(sleeper!.flight ?? null, 'quien ya está dentro no sale a huir').toBeNull();
    const civilian = life.dwellers.find(d => d.flight !== null && d.flight !== undefined);
    expect(civilian, 'al menos un civil tiene refugio alcanzable').toBeDefined();
    const before = { x: civilian!.body.x, z: civilian!.body.z };

    life.step(0.9);
    expect(gap(before, civilian!.body), 'la carrera desplaza el cuerpo').toBeGreaterThan(0);
    expect(castOf(life, 1, new Map(), new Set()).find(a => a.id === civilian!.villager)?.clip)
      .toBe('flee');

    civilian!.flight!.sheltered = true;
    life.step(0.9);
    expect(civilian!.motionSpeed).toBe(0);
    civilian!.motionSpeed = 0.2; // desplazamiento pasivo de `resolve`, no una carrera
    expect(castOf(life, 1, new Map(), new Set()).find(a => a.id === civilian!.villager)?.clip,
      'en refugio no corre en el sitio ni por un empujón ajeno').toBe('idle');

    const enemy = life.raiders.find(r => r.entered)!;
    enemy.phase = 'gone';
    life.step(0.9);
    expect(civilian!.flight ?? null, 'al cesar la entrada recupera su jornada').toBeNull();
    expect(JSON.stringify(state), 'la reacción no escribe en GameState').toBe(beforeState);
  });

  it('elige el lado seguro y rechaza un rodeo que se acerque a la amenaza', () => {
    const land: Terrain = { width: 12, height: 12, blocked: new Uint8Array(144) };
    // Muro al oeste con salida por abajo: obliga a rodear, pero no a volver
    // hacia la amenaza que está al este.
    for (let z = 0; z < 11; z += 1) if (z !== 8) land.blocked[z * land.width + 4] = 1;
    const body = { id: 1, x: 5.5, z: 5.5, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.2 };
    const threat = { x: 8.5, z: 5.5 };
    const flight = beginFlight(body, land, threat, undefined, 7, 0);
    expect(flight).not.toBeNull();
    const first = flight!.route.find(point => gap(point, body) > 0.1)!;
    expect((first.x - body.x) * (threat.x - body.x)
      + (first.z - body.z) * (threat.z - body.z), 'el primer tramo no corre hacia el clan')
      .toBeLessThanOrEqual(0);
    expect(flight!.route.every(point => gap(point, threat) >= gap(body, threat) - 0.25)).toBe(true);
  });

  it('recorre de verdad la ruta y se detiene al alcanzar refugio', () => {
    const land: Terrain = { width: 20, height: 20, blocked: new Uint8Array(400) };
    const body = { id: 1, x: 10.5, z: 10.5, vx: 0, vz: 0, facing: 0, radius: 0.32, pace: 1.2 };
    const flight = beginFlight(body, land, { x: 14.5, z: 10.5 }, undefined, 7, 0);
    expect(flight).not.toBeNull();
    const around = createNeighbourhood(land.width, land.height);
    const start = { x: body.x, z: body.z };
    for (let step = 0; step < 1_200 && flight?.sheltered !== true; step += 1) {
      around.rebuild([body]);
      stepFlight(body, flight!, land, around);
    }
    expect(flight!.sheltered, 'la ruta acaba sin una marca impuesta por la prueba').toBe(true);
    expect(gap(start, body)).toBeGreaterThan(1);
    const atRest = { x: body.x, z: body.z };
    around.rebuild([body]);
    expect(stepFlight(body, flight!, land, around)).toBe(false);
    expect({ x: body.x, z: body.z }).toEqual(atRest);
  });

  it('la alarma suelta carga, pareja y compromiso antes de correr', () => {
    const setup = assaulted(7);
    const life = createVillage(setup.state, 0, { land: setup.land, props: true });
    for (const raider of life.raiders) raider.phase = 'gone';
    const defended = new Set(life.manned.map(post => post.place.id));
    let participant = life.dwellers.find(d => d.scene !== null
      && !defended.has(d.dayPlan?.job?.place ?? ''));
    for (let step = 0; step < 1_800 && participant === undefined; step += 1) {
      life.step();
      participant = life.dwellers.find(d => d.scene !== null
        && !defended.has(d.dayPlan?.job?.place ?? ''));
    }
    expect(participant, 'la pareja nace por el camino real de escenas').toBeDefined();
    const scene = participant!.scene!;
    const partner = life.dwellers.find(d => d.body.id === (scene.a === participant!.body.id ? scene.b : scene.a));
    expect(partner?.scene).toBe(scene);

    const prop = life.props.find(item => item.fixed !== true);
    expect(prop).toBeDefined();
    for (const dweller of life.dwellers) if (dweller.holding === prop!.id) dweller.holding = null;
    prop!.held = participant!.body.id;
    participant!.holding = prop!.id;
    const invalidated = life.interactions.invalidated;
    forceEntry(life);
    life.step();

    expect(participant!.flight).not.toBeNull();
    expect(participant!.holding).toBeNull();
    expect(prop!.held).toBeNull();
    expect(participant!.scene).toBeNull();
    expect(partner!.scene).toBeNull();
    expect(life.interactions.invalidated).toBeGreaterThan(invalidated);

    const enemy = life.raiders.find(raider => raider.entered)!;
    enemy.phase = 'gone';
    while (life.steps <= scene.until + 1) life.step();
    expect(life.interactions.stuck, 'el compromiso interrumpido quedó libre').toBe(0);
  });

  it('reconstruye la misma alarma cuerpo a cuerpo', () => {
    const a = assaulted(23);
    const b = assaulted(23);
    forceEntry(a.life); forceEntry(b.life);
    for (let step = 0; step < 30; step += 1) { a.life.step(); b.life.step(); }
    const trace = (life: Village) => life.dwellers.map(d => ({
      id: d.villager, x: d.body.x, z: d.body.z,
      flight: d.flight === null || d.flight === undefined ? null : {
        target: d.flight.target, sheltered: d.flight.sheltered, route: d.flight.route,
      },
    }));
    expect(trace(a.life)).toEqual(trace(b.life));
  });
});
