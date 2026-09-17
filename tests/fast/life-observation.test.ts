import { visibleBuildings } from '../../src/derive/visible-buildings';
import { readFileSync } from 'node:fs';
import { loadAssets } from '../../src/render3d/assets';
import { buildFromAsset } from '../../src/render3d/world/buildings';
import { planFor } from '../../src/render3d/world/plan';
import { describe, expect, it } from 'vitest';
import { Box3, Vector3, Group, Mesh, BoxGeometry, MeshBasicMaterial } from 'three';
import { foundTwenty } from '../helpers/founding';
import { createVillage } from '../../src/render3d/life/village';
import { createNeighbourhood } from '../../src/render3d/life/grid';
import { homeRoutine, stepHome } from '../../src/render3d/life/home';
import { fitsCircle, integrate, type Terrain } from '../../src/render3d/life/body';
import { Fauna } from '../../src/render3d/effects/fauna';
import { solidTerrain } from '../../src/render3d/world/obstacles';
import { Steading, steadingOf } from '../../src/render3d/world/steading';

describe('IA-10 · cuerpo, malla y casa', () => {
  it('los adornos respetan la escala y el origen del GLB al instanciarse', () => {
    const source = new Group(); source.scale.setScalar(1 / 3);
    const mesh = new Mesh(new BoxGeometry(3, 3, 3), new MeshBasicMaterial());
    mesh.position.set(3, 1.5, 0); source.add(mesh);
    const expected = new Box3().setFromObject(source).translate(new Vector3(2.5, 0, 1.5));
    const steading = new Steading();
    steading.build([{ asset: 'handcart', cell: 10, facing: 0 }], () => source, () => 0, 8);
    const actual = new Box3().setFromObject(steading.group);
    expect(actual.min.distanceTo(expected.min)).toBeLessThan(1e-6);
    expect(actual.max.distanceTo(expected.max)).toBeLessThan(1e-6);
    steading.dispose(); mesh.geometry.dispose(); mesh.material.dispose();
  });

  it('una ruina reconstruida o duplicada no vuelve a dibujarse ni a bloquear', () => {
    const state = foundTwenty(7);
    const house = state.buildings[0]!;
    state.buildings = [house, { ...house, id: 999, lostTick: 1 }];
    for (let z = house.y; z < house.y + house.h; z += 1) {
      for (let x = house.x; x < house.x + house.w; x += 1) state.map.ruins[z * state.map.width + x] = 1;
    }
    expect(visibleBuildings(state).map(building => building.id)).toEqual([house.id]);
    house.lostTick = 2;
    expect(visibleBuildings(state).map(building => building.id)).toEqual([house.id]);
    state.map.ruins.fill(0);
    expect(visibleBuildings(state)).toEqual([]);
    const land = solidTerrain(state, () => undefined);
    expect(land.blocked[house.y * land.width + house.x]).toBe(0);
  });

  it.each(['house', 'stone-house'])('%s: la hoja publicada gira sin mover la fachada', async id => {
    const manifest = JSON.parse(readFileSync('public/assets/valley3d/manifest.json', 'utf8'));
    const bytes = Uint8Array.from(readFileSync(`public/assets/valley3d/${id}.glb`)).buffer;
    const library = await loadAssets({ baseUrl: '/', manifest: { ...manifest, assets: manifest.assets.filter((a: { id: string }) => a.id === id) }, bytes: { [id]: bytes } });
    const state = foundTwenty(7);
    const planned = { ...planFor(state).buildings[0]!, asset: id, ruin: false };
    const model = buildFromAsset(planned, library.instance(id)!);
    const hinge = model.object.getObjectByName('DoorHinge')!;
    expect(hinge.children.length).toBe(1);
    const before = model.object.position.clone();
    model.door!(true, 1);
    expect(hinge.rotation.y).toBeCloseTo(-Math.PI / 2);
    expect(model.object.position.equals(before)).toBe(true);
    model.door!(false, 1);
    expect(hinge.rotation.y).toBe(0);
    model.dispose(); library.dispose();
  });

  it('el ganado dibujado coincide con la vida, sin duplicados derivados', () => {
    const state = foundTwenty(7);
    state.herd = { hens: 3, pigs: 1, cows: 1 };
    const village = createVillage(state, 0);
    expect(village.beasts).toHaveLength(5);
    const fauna = new Fauna(() => { const group = new Group();
      group.add(new Mesh(new BoxGeometry(), new MeshBasicMaterial())); return group; });
    const live = village.beasts.map(beast => ({ id: beast.dweller.body.id,
      kind: beast.kind, x: beast.dweller.body.x, y: beast.dweller.body.z }));
    fauna.update(state, 0.5, live);
    const drawn = fauna.snapshot();
    for (const beast of live) expect(drawn.find(item => item.id === beast.id)).toMatchObject({ x: beast.x, z: beast.y });
    const ids = new Set(live.map(beast => beast.id));
    expect(drawn.filter(item => ids.has(item.id))).toHaveLength(live.length);
    fauna.dispose();
  });

  it('el disco no recorta una esquina ni atraviesa un muro a velocidad alta', () => {
    const land: Terrain = { width: 8, height: 8, blocked: new Uint8Array(64) };
    land.blocked[3 * 8 + 3] = 1;
    expect(fitsCircle(land, 2.8, 2.8, 0.32)).toBe(false);
    const body = { id: 0, x: 1.5, z: 3.5, vx: 20, vz: 0, radius: 0.32, pace: 1, facing: 0 };
    integrate(body, land, 1);
    expect(body.x).toBeLessThanOrEqual(3 - body.radius);
    expect(fitsCircle(land, body.x, body.z, body.radius)).toBe(true);
  });

  it('carros y leña reservan las celdas de los mismos objetos que se pintan', () => {
    const state = foundTwenty(7);
    const placements = steadingOf(state, state.terrainSeed);
    expect(placements.length).toBeGreaterThan(0);
    const land = solidTerrain(state, () => new Mesh(new BoxGeometry(0.7, 0.7, 0.7), new MeshBasicMaterial()));
    for (const placement of placements) expect(land.blocked[placement.cell]).toBe(1);
  });

  it('llega andando al umbral, duerme y sale al alba; una puerta bloqueada no teletransporta', () => {
    const state = foundTwenty(7);
    const village = createVillage(state, 0);
    const person = village.dwellers[0]!;
    const building = state.buildings.find(item => item.kind === 'house')!;
    const home = homeRoutine({ ...building, x: 5, y: 5, w: 2, h: 2 });
    const resident = { ...person, residence: home, body: { ...person.body, x: 6, z: 10 } };
    const land: Terrain = { width: 16, height: 16, blocked: new Uint8Array(256) };
    for (const z of [5, 6]) for (const x of [5, 6]) land.blocked[z * 16 + x] = 1;
    const around = createNeighbourhood(16, 16);
    const stages = new Set<string>();
    for (let step = 0; step < 600; step += 1) {
      around.rebuild([resident.body]);
      const before = { x: resident.body.x, z: resident.body.z };
      stepHome(resident, 0.9, step, land, around, [resident]);
      expect(Math.hypot(resident.body.x - before.x, resident.body.z - before.z)).toBeLessThan(0.12);
      expect(fitsCircle(land, resident.body.x, resident.body.z, resident.body.radius)).toBe(true);
      stages.add(home.stage);
    }
    expect(stages.has('opening')).toBe(true);
    expect(home.stage).toBe('sleeping');
    for (let step = 600; step < 900; step += 1) stepHome(resident, 0.2, step, land, around, [resident]);
    expect(home.stage).toBe('day');
    home.stage = 'day'; land.blocked[7 * 16 + 6] = 1;
    stepHome(resident, 0.9, 1000, land, around, [resident]);
    expect(home.stage).toBe('unreachable');
  });
});
