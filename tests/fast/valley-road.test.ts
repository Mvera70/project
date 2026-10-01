// El camino del valle (28 sep 2026): propiedades de lo que Vera pidió. De cada
// boca de desfiladero sale un camino que llega a la plaza por celdas que se
// pueden pisar; en el caserío es tierra y no hay cartel; desde la aldea hay un
// cartel por entrada, sobre el camino, a unas celdas de la plaza; y la senda
// del desfiladero ya no se pinta como un muro. Varias semillas.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { stepCost } from '@engine/world/astar';
import { run } from '@engine/sim';
import { PALETTES } from '@derive/palette';
import { plazaOf } from '@derive/plaza';
import { foundGame } from '@engine/found';
import { foundTwenty } from '../helpers/founding';
import { buildRoadStones, townCells, valleyRoad } from '../../src/render3d/world/road';
import { BoxGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import { buildGorgeRoads } from '../../src/render3d/world/mountains';
import { elevationAt } from '../../src/render3d/world/ground';
import { ridgeAt } from '../../src/render3d/world/ridge';
import { mountainSurfaceAt } from '../../src/render3d/world/mountains';

const SEEDS = [3, 7, 11];

describe('el camino del valle', () => {
  it('de cada boca sale un camino pisable que llega a la plaza', () => {
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      run(state, TIME.WEEKS_PER_YEAR * 3, 'prudent', CATALOG);
      const plaza = plazaOf(state);
      const road = valleyRoad(state.map, state.terrainSeed, plaza, 'hamlet');
      expect(road.mouths).toHaveLength(2);
      const cells = [...road.wear].map((w, i) => (w > 0 ? i : -1)).filter((i) => i >= 0);
      expect(cells.length, `semilla ${seed}`).toBeGreaterThan(20);
      for (const cell of cells) expect(stepCost(state.map, cell), `semilla ${seed}: celda cerrada`).not.toBeNull();
      // El eje del camino, al nivel de la era; los hombros, un nivel menos.
      expect(cells.filter((c) => road.wear[c] === 2).length).toBeGreaterThan(20);
      const near = (x: number, z: number): boolean => cells.some((c) =>
        Math.hypot(c % state.map.width + 0.5 - x, Math.floor(c / state.map.width) + 0.5 - z) < 2);
      expect(near(plaza.x, plaza.y), `semilla ${seed}: llega a la plaza`).toBe(true);
      const nearMouth = (x: number, z: number): boolean => cells.some((c) =>
        Math.hypot(c % state.map.width + 0.5 - x, Math.floor(c / state.map.width) + 0.5 - z) < 3);
      for (const mouth of road.mouths) expect(nearMouth(mouth.x, mouth.z), `semilla ${seed}: sale de la boca`).toBe(true);
    }
  });

  it('en el caserío es tierra y no hay cartel; desde la aldea, senda y un cartel por entrada sobre el camino', () => {
    for (const seed of SEEDS) {
      const state = foundGame(seed);
      const plaza = plazaOf(state);
      const hamlet = valleyRoad(state.map, state.terrainSeed, plaza, 'hamlet');
      const village = valleyRoad(state.map, state.terrainSeed, plaza, 'village');
      const town = valleyRoad(state.map, state.terrainSeed, plaza, 'town');
      expect(Math.max(...hamlet.wear)).toBe(2);
      expect(Math.max(...village.wear)).toBeGreaterThan(Math.max(...hamlet.wear));
      expect(Math.max(...town.wear)).toBe(3);
      expect(hamlet.signposts).toHaveLength(0);
      expect(village.signposts.length, `semilla ${seed}`).toBe(2);
      for (const sign of village.signposts) {
        const gap = Math.hypot(sign.x - plaza.x, sign.z - plaza.y);
        expect(gap).toBeGreaterThan(6);
        expect(gap).toBeLessThan(16);
        // Sobre el camino, o a un paso de él.
        const onRoad = [...village.wear].some((w, c) => w > 0
          && Math.hypot(c % state.map.width + 0.5 - sign.x, Math.floor(c / state.map.width) + 0.5 - sign.z) < 1.2);
        expect(onRoad, `semilla ${seed}: cartel junto al camino`).toBe(true);
      }
    }
  });

  it('la senda del desfiladero no tiene muros: ningún triángulo sube más de media celda', () => {
    for (const seed of SEEDS) {
      const { map, terrainSeed } = foundGame(seed);
      const floor = (x: number, z: number): number => {
        const inside = x >= 0 && z >= 0 && x <= map.width && z <= map.height;
        return inside ? Math.max(ridgeAt(map, terrainSeed, x, z), mountainSurfaceAt(map, x, z)) : ridgeAt(map, terrainSeed, x, z);
      };
      const roads = buildGorgeRoads(map, terrainSeed, PALETTES.spring, floor, () => false,
        () => map.width / 2);
      const position = roads.mesh.geometry.getAttribute('position');
      let steepest = 0;
      for (let tri = 0; tri + 2 < position.count; tri += 3) {
        const ys = [position.getY(tri), position.getY(tri + 1), position.getY(tri + 2)];
        steepest = Math.max(steepest, Math.max(...ys) - Math.min(...ys));
      }
      expect(steepest, `semilla ${seed}`).toBeLessThan(0.5);
      void elevationAt;
    }
  });
});

describe('las piedras de la calzada', () => {
  it('son cantos bajos, aunque el modelo sea alto, y no hay ninguna en el pueblo', () => {
    // Vera, 2 oct 2026: «las piedras pequeñas están muy para arriba,
    // puntiagudas, muy feas» y «hay también que quitarlas del pueblo». El
    // peñasco de Astra va de pie; aquí, una caja tres veces más alta que ancha.
    const tall = new BoxGeometry(1, 3, 1);
    let stones = 0;
    for (const seed of SEEDS) {
      const state = foundTwenty(seed);
      const plaza = plazaOf(state);
      const road = valleyRoad(state.map, state.terrainSeed, plaza, 'town');
      const town = townCells(state, plaza);
      const mesh = buildRoadStones(road, state.map, state.terrainSeed, tall, () => 0, '#888888', town);
      expect(mesh, `semilla ${seed}: la villa tiene calzada fuera del pueblo`).not.toBeNull();
      const matrix = new Matrix4(), at = new Vector3(), size = new Vector3();
      for (let i = 0; i < mesh!.count; i += 1) {
        mesh!.getMatrixAt(i, matrix);
        matrix.decompose(at, new Quaternion(), size);
        const wide = size.x, high = size.y * 3;
        expect(high / wide, `semilla ${seed}: canto ${i}`).toBeLessThan(0.6);
        const cell = Math.floor(at.z) * state.map.width + Math.floor(at.x);
        expect(town.has(cell), `semilla ${seed}: piedra en el pueblo, celda ${cell}`).toBe(false);
        stones += 1;
      }
    }
    expect(stones).toBeGreaterThan(10);
  });
});
