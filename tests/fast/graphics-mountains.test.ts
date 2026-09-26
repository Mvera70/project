// Las montañas y las entradas del valle. 26 sep 2026.
//
// Vera eligió la sierra facetada y la garganta de roca: «darle vida y estilo a
// las montañas y alrededores del valle». Lo que estas pruebas guardan son esas
// dos decisiones y lo que no se puede romper al decorar: las entradas se
// cierran, las caras tienen un color cada una, y ni una piedra cae al agua.

import { describe, expect, it } from 'vitest';
import { foundGame } from '@engine/found';
import { PALETTES } from '@derive/palette';
import { Color, type Mesh, type MeshStandardMaterial } from 'three';
import { buildRidge, exteriorWaterAt, ridgeAt } from '../../src/render3d/world/ridge';
import { gorgeAt, valleyAxis, valleyShoulder } from '../../src/render3d/world/valley-profile';
import { buildCairns, buildGorgeRoads, faceColour, MOUNTAIN_PEAK, placeCrags } from '../../src/render3d/world/mountains';
import { TERRAIN_CODE } from '@engine/state';

const SEEDS = [7, 11, 23];

describe('las montañas y las entradas', () => {
  it('las dos entradas son garganta y el centro sigue siendo llano', () => {
    for (const seed of SEEDS) {
      const { map } = foundGame(seed);
      expect(gorgeAt(map, 0)).toBe(1);
      expect(gorgeAt(map, map.height)).toBe(1);
      expect(gorgeAt(map, map.height / 2)).toBe(0);
      // A seis celdas del río: pared en las entradas, llano en medio.
      for (const z of [0, map.height]) {
        const axis = valleyAxis(map, Math.min(z, map.height - 1));
        expect(valleyShoulder(map, axis + 6, z), `semilla ${seed}, z ${z}`).toBeGreaterThan(0.5);
      }
      const middle = map.height / 2;
      expect(valleyShoulder(map, valleyAxis(map, middle) + 6, middle)).toBe(0);
    }
  });

  it('la sierra es facetada: cada cara tiene un solo color', () => {
    const { map, terrainSeed } = foundGame(11);
    const ridge = buildRidge(map, terrainSeed, PALETTES.spring) as Mesh;
    const geometry = ridge.geometry;
    expect(geometry.index).toBeNull();
    expect((ridge.material as MeshStandardMaterial).flatShading).toBe(true);
    const colour = geometry.getAttribute('color');
    let mixed = 0;
    for (let i = 0; i < colour.count; i += 3) {
      for (let k = 1; k < 3; k += 1) {
        if (Math.abs(colour.getX(i) - colour.getX(i + k)) > 1e-6) { mixed += 1; break; }
      }
    }
    // Sólo la franja del borde, que funde su color con el suelo, puede mezclar.
    expect(mixed / (colour.count / 3)).toBeLessThan(0.1);
  });

  it('la nieve cubre las cumbres en invierno y no en verano', () => {
    const peak = new Color();
    faceColour(peak, PALETTES.spring, MOUNTAIN_PEAK * 1.2, 0.9, 3, 4, 0.72);
    const bare = new Color();
    faceColour(bare, PALETTES.spring, MOUNTAIN_PEAK * 0.6, 0.9, 3, 4, 0);
    expect(peak.getHSL({ h: 0, s: 0, l: 0 }).l).toBeGreaterThan(bare.getHSL({ h: 0, s: 0, l: 0 }).l + 0.2);
  });

  it('ni un peñasco ni un mojón caen al agua', () => {
    for (const seed of SEEDS) {
      const { map, terrainSeed } = foundGame(seed);
      const wet = (x: number, z: number): boolean => exteriorWaterAt(map, terrainSeed, x, z, 2.2);
      const crags = placeCrags(terrainSeed + 1, { x0: -40, x1: map.width + 40, z0: -40, z1: map.height + 40 }, 1.6,
        (x, z) => ridgeAt(map, terrainSeed, x, z),
        (x, z) => (x > 0 && x < map.width && z > 0 && z < map.height) || wet(x, z), 700);
      expect(crags.length).toBeGreaterThan(100);
      // La tolerancia es el temblor de la colocación (0,8 del paso de 1,6).
      for (const crag of crags) expect(exteriorWaterAt(map, terrainSeed, crag.x, crag.z, 1.4)).toBe(false);
      const cairns = buildCairns(map, PALETTES.spring, (x, z) => ridgeAt(map, terrainSeed, x, z),
        (x, z) => exteriorWaterAt(map, terrainSeed, x, z, 1.8),
        (z) => valleyAxis(map, Math.max(0, Math.min(map.height - 1, z))));
      expect(cairns.children.length, `semilla ${seed}`).toBe(2);
      for (const cairn of cairns.children) {
        expect(cairn.position.z < 0 || cairn.position.z > map.height).toBe(true);
        expect(exteriorWaterAt(map, terrainSeed, cairn.position.x, cairn.position.z, 1.8)).toBe(false);
      }
      (cairns.userData.dispose as () => void)();
    }
  });
});

describe('el camino que sale por la garganta', () => {
  it('sale del valle por las dos entradas, por tierra y sin mojarse', () => {
    for (const seed of SEEDS) {
      const { map, terrainSeed } = foundGame(seed);
      const roads = buildGorgeRoads(map, terrainSeed, PALETTES.spring, (x, z) => ridgeAt(map, terrainSeed, x, z),
        (x, z) => exteriorWaterAt(map, terrainSeed, x, z, 1.4),
        (z) => valleyAxis(map, Math.max(0, Math.min(map.height - 1, z))));
      const position = roads.mesh.geometry.getAttribute('position');
      let north = false, south = false, inside = 0;
      for (let i = 0; i < position.count; i += 1) {
        const x = position.getX(i), z = position.getZ(i);
        if (z < -20) north = true;
        if (z > map.height + 20) south = true;
        if (z > 0 && z < map.height) {
          inside += 1;
          // Dentro del mapa, sólo la ribera: nunca el cauce.
          const cell = map.terrain[Math.floor(z) * map.width + Math.floor(x)];
          expect(cell, `semilla ${seed}: la senda pisa el río en ${x.toFixed(1)}, ${z.toFixed(1)}`).not.toBe(TERRAIN_CODE.water);
        }
      }
      expect(north && south, `semilla ${seed}: sale por las dos entradas`).toBe(true);
      expect(inside, 'y empieza dentro del valle').toBeGreaterThan(0);
      roads.dispose();
    }
  });
});
