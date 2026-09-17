import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { foundTwenty } from '../helpers/founding';
import { TERRAIN_CODE, type Building } from '@engine/state';
import { defenceGates } from '@derive/defence-gates';
import { terrainOf } from '../../src/render3d/life/terrain';
import { fitsCircle, indexSolids, integrate, type Terrain } from '../../src/render3d/life/body';
import { clearBetween, pathTo, routeAroundBodies } from '../../src/render3d/life/navigate';
import { groundFootprints, solidTerrain } from '../../src/render3d/world/obstacles';
import { planFor } from '../../src/render3d/world/plan';
import { buildFromAsset } from '../../src/render3d/world/buildings';
import { steadingOf } from '../../src/render3d/world/steading';
import { createVillage } from '../../src/render3d/life/village';
import { homeRoutine, indoors, stepHome } from '../../src/render3d/life/home';
import { createNeighbourhood } from '../../src/render3d/life/grid';
import { resolve } from '../../src/render3d/life/steering';

const empty = (): Terrain => ({ width: 16, height: 16, blocked: new Uint8Array(256) });
const body = (id = 0, x = 2.5, z = 5.5) => ({ id, x, z, radius: 0.32, pace: 1.3, vx: 0, vz: 0, facing: 0 });

describe('IA-11 · accesos, desvíos y obstáculos finos', () => {
  it('un recinto cerrado tiene un portón visible y cruzable en ambos sentidos', () => {
    const state = foundTwenty(7); state.map.terrain.fill(TERRAIN_CODE.meadow); state.map.ruins.fill(0);
    const template = state.buildings[0]!;
    const walls: Building[] = [];
    for (let z = 5; z <= 10; z++) for (let x = 5; x <= 10; x++) {
      if (x !== 5 && x !== 10 && z !== 5 && z !== 10) continue;
      walls.push({ ...template, id: walls.length, kind: 'wall', x, y: z, w: 1, h: 1, tier: 1 });
    }
    state.buildings = walls;
    const before = JSON.stringify(state), gates = defenceGates(state);
    expect(gates.size).toBe(1);
    expect([...defenceGates({ ...state, buildings: [...walls].reverse() })]).toEqual([...gates]);
    const land = solidTerrain(state, () => undefined);
    for (const [a, b] of [[{ x: 7.5, z: 7.5 }, { x: 3.5, z: 7.5 }], [{ x: 3.5, z: 7.5 }, { x: 7.5, z: 7.5 }]]) {
      const route = pathTo(land, a!, b!); expect(route).not.toBeNull();
      let at = a!;
      for (const point of route!) { expect(clearBetween(land, at, point, 0.4)).toBe(true); at = point; }
    }
    const gate = planFor(state).buildings.find(b => b.gate !== undefined)!;
    const source = new Mesh(new BoxGeometry(1, 0.8, 0.3), new MeshBasicMaterial());
    const model = buildFromAsset(gate, source);
    expect(model.object.getObjectByName('OpenGate')).toBeDefined();
    expect(JSON.stringify(state)).toBe(before);
    model.dispose(); source.geometry.dispose(); source.material.dispose();
  });

  it('un tronco o lápida no cierra la celda completa, pero el disco no lo atraviesa', () => {
    const base = empty();
    const solid = { minX: 5.42, maxX: 5.58, minZ: 5.4, maxZ: 5.6 };
    const land = { ...base, solids: indexSolids(16, 16, [solid]) };
    expect(land.blocked[5 * 16 + 5]).toBe(0);
    const walker = body(); walker.vx = 30; integrate(walker, land, 1);
    expect(walker.x).toBeLessThanOrEqual(solid.minX - walker.radius);
    const route = pathTo(land, body(), { x: 8.5, z: 5.5 }); expect(route).not.toBeNull();
    let at = { x: 2.5, z: 5.5 };
    for (const point of route!) { expect(clearBetween(land, at, point, 0.32)).toBe(true); at = point; }
  });

  it('la banda física incluye troncos y lápidas separadas, no copas ni suelo', () => {
    const group = new Group();
    for (const [x, y, z, w, h, d] of [[0, 1, 0, 0.15, 2, 0.15], [0, 3, 0, 3, 2, 3], [2, 0.3, 0, 0.3, 0.6, 0.2], [1, 0.01, 0, 5, 0.02, 5]]) {
      const mesh = new Mesh(new BoxGeometry(w, h, d), new MeshBasicMaterial()); mesh.position.set(x!, y!, z!); group.add(mesh);
    }
    const boxes = groundFootprints(group);
    expect(boxes).toHaveLength(2);
    expect(boxes.every(box => box.max.x - box.min.x < 0.4)).toBe(true);
    group.traverse(node => { if (node instanceof Mesh) { node.geometry.dispose(); node.material.dispose(); } });
  });

  it('encuentra la salida de un paso fino desalineado con la rejilla de media celda', () => {
    const land = { ...empty(), solids: indexSolids(16, 16, [
      { minX: 0, maxX: 4.9, minZ: 0, maxZ: 10 },
      { minX: 5.6, maxX: 16, minZ: 0, maxZ: 10 },
    ]) };
    let from = { x: 5.25, z: 2.5 };
    const route = pathTo(land, from, { x: 8.5, z: 12.5 }, 0.32);
    expect(route).not.toBeNull();
    for (const to of route!) { expect(clearBetween(land, from, to, 0.32)).toBe(true); from = to; }
  });

  it('el desvío rodea un cuerpo y no altera la máscara compartida', () => {
    const land = empty(), walker = body(), obstacle = body(1, 5.5, 5.5);
    const before = land.blocked.slice();
    const route = routeAroundBodies(land, walker, { x: 8.5, z: 5.5 }, [walker, obstacle]);
    expect(route).not.toBeNull(); expect(route!.some(p => Math.abs(p.z - 5.5) > 0.5)).toBe(true);
    expect(land.blocked).toEqual(before);
  });

  it('los adornos dejan libres caminos y el anillo de paso junto a edificios', () => {
    const state = foundTwenty(11);
    for (const p of steadingOf(state, state.terrainSeed)) {
      expect(state.map.path[p.cell] ?? 0).toBe(0);
      const x = p.cell % state.map.width + 0.5, z = Math.floor(p.cell / state.map.width) + 0.5;
      for (const b of state.buildings.filter(b => b.lostTick === null && b.kind !== 'field' && b.kind !== 'grave_yard')) {
        expect(x > b.x - 1 && x < b.x + b.w + 1 && z > b.y - 1 && z < b.y + b.h + 1).toBe(false);
      }
    }
  });

  it('puede apartarse de un vecino parado dentro de la misma celda', () => {
    const land = empty(), walker = body(0, 2.2, 5.8), neighbour = body(1, 2.7, 5.4);
    const route = routeAroundBodies(land, walker, { x: 8.5, z: 5.5 }, [walker, neighbour]);
    expect(route).not.toBeNull();
    let from = { x: walker.x, z: walker.z };
    for (const to of route!) {
      for (let i = 1; i <= 30; i++) {
        const x = from.x + (to.x - from.x) * i / 30, z = from.z + (to.z - from.z) * i / 30;
        expect(Math.hypot(x - neighbour.x, z - neighbour.z)).toBeGreaterThanOrEqual(walker.radius + neighbour.radius);
      }
      from = to;
    }
  });

  it.each([4, 8])('una familia de %s entra por turnos y deja libre la salida para el siguiente', count => {
    const state = foundTwenty(7), building = { ...state.buildings[0]!, x: 5, y: 5, w: 2, h: 2 };
    state.buildings = [building]; state.map.terrain.fill(TERRAIN_CODE.meadow);
    const land = terrainOf(state), template = createVillage(state, 0).dwellers[0]!;
    const people = Array.from({ length: count }, (_, id) => ({ ...template, villager: id,
      body: body(id, 5.3 + id % 3 * 0.7, 7.65 + Math.floor(id / 3) * 0.75), residence: homeRoutine(building, land) }));
    const around = createNeighbourhood(land.width, land.height);
    for (let step = 0; step < 1500; step++) {
      around.rebuild(people.filter(p => !indoors(p)).map(p => p.body));
      for (const p of people) stepHome(p, step < 900 ? 0.9 : 0.2, step, land, around, people);
      resolve(people.filter(p => !indoors(p)).map(p => p.body), around, land);
      for (const p of people) expect(fitsCircle(land, p.body.x, p.body.z, p.body.radius)).toBe(true);
      if (step === 899) expect(people.every(indoors)).toBe(true);
    }
    expect(people.every(p => p.residence.stage === 'day')).toBe(true);
  });

  it('si un empujón saca al dueño de la puerta, vuelve a buscar el acceso', () => {
    const state = foundTwenty(7), building = { ...state.buildings[0]!, x: 5, y: 5, w: 2, h: 2 };
    state.buildings = [building]; state.map.terrain.fill(TERRAIN_CODE.meadow);
    const land = terrainOf(state);
    const person = { ...createVillage(state, 0).dwellers[0]!, residence: homeRoutine(building, land) };
    person.residence.stage = 'entering';
    person.body.x = 4.6; person.body.z = 5.5;
    const around = createNeighbourhood(land.width, land.height);
    around.rebuild([person.body]);
    stepHome(person, 0.9, 1, land, around, [person]);
    expect(person.residence.stage).toBe('returning');
    for (let step = 2; step < 600; step++) stepHome(person, 0.9, step, land, around, [person]);
    expect(indoors(person)).toBe(true);
  });

  it('quien está lejos sale antes del ocaso y no cancela el regreso al acercarse', () => {
    const state = foundTwenty(7), building = { ...state.buildings[0]!, x: 5, y: 5, w: 2, h: 2 };
    state.buildings = [building]; state.map.terrain.fill(TERRAIN_CODE.meadow);
    const land = terrainOf(state);
    const person = { ...createVillage(state, 0).dwellers[0]!, body: body(0, 2, 2), residence: homeRoutine(building, land) };
    const around = createNeighbourhood(land.width, land.height); around.rebuild([person.body]);
    stepHome(person, 0.74, 1, land, around, [person]);
    expect(person.residence.stage).toBe('returning');
    person.body.x = 6; person.body.z = 7.6;
    stepHome(person, 0.74, 2, land, around, [person]);
    expect(person.residence.stage).not.toBe('day');
  });
});
