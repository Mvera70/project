// La senda de la garganta, pegada a lo que se dibuja (2 oct 2026).
//
// Vera: «el camino sigue flotando… no sé cómo llegan las visitas al valle».
// Medido en `main` antes del arreglo (`tools/reports/gorge-road-report.ts`,
// ocho semillas): el 76 % de los vértices de la cinta iba más de 0,35 celdas
// por encima de la malla que se ve, el peor a 30, y el extremo de dentro
// quedaba hasta a siete celdas del camino pintado. Después, en dieciséis
// semillas: ninguno por encima de 0,35, el peor a 0,24, y los dos extremos de
// cada valle en la boca.
//
// Estas pruebas miden contra **las mallas tal como se construyen** —el suelo,
// la piel de la montaña y la sierra—, no contra sus fórmulas: entre vértices
// la sierra no es `ridgeAt`, y medir contra la fórmula es lo que dejó pasar
// la cinta flotando.

import { afterAll, describe, expect, it } from 'vitest';
import type { Mesh } from 'three';
import { foundGame } from '@engine/found';
import { roadMouths } from '@engine/world/valley-road';
import { PALETTES } from '@derive/palette';
import { plazaOf } from '@derive/plaza';
import { buildBackdrop } from '../../src/render3d/world/backdrop';
import { buildGround } from '../../src/render3d/world/ground';
import { gorgeRoadPaths } from '../../src/render3d/world/mountains';
import { meshSurface } from '../../src/render3d/world/mesh-surface';
import { valleyRoad } from '../../src/render3d/world/road';
import { GROUND_BIAS } from '../../src/render3d/visual-config';

/** Varias semillas: dos de ellas con la boca lejos de la orilla (en 31 de 80 gargantas lo está). */
const SEEDS = [7, 11, 19, 23];
/** Lo que la cinta puede ir por encima del suelo dibujado sin leerse como flotando, en celdas. */
const FLOATS = 0.35;

type Drawn = ReturnType<typeof build>;
const built = new Map<number, Drawn>();
/** Cada valle se monta una vez para las dos pruebas que miran sus mallas. */
function drawn(seed: number): Drawn {
  let one = built.get(seed);
  if (one === undefined) { one = build(seed); built.set(seed, one); }
  return one;
}
afterAll(() => { for (const one of built.values()) one.dispose(); });

function build(seed: number) {
  const state = foundGame(seed);
  const plaza = plazaOf(state);
  const road = valleyRoad(state.map, state.terrainSeed, plaza, 'hamlet');
  const ground = buildGround(state.map, PALETTES.spring, plaza, 'hamlet', undefined, road.wear);
  const backdrop = buildBackdrop(state.map, state.terrainSeed, PALETTES.spring);
  const skin = backdrop.group.getObjectByName('Valley_Mountain_Skin') as Mesh | undefined;
  const ribbon = backdrop.group.getObjectByName('Valley_Gorge_Roads') as Mesh;
  // Lo más alto de lo dibujado en cada punto: el suelo, la piel y la sierra.
  const surfaces = [ground.mesh, backdrop.ridge, ...(skin === undefined ? [] : [skin])].map((mesh) => meshSurface(mesh.geometry));
  const surface = (x: number, z: number): number => Math.max(...surfaces.map((at) => at(x, z)));
  return {
    state, road, ribbon, surface, backdrop,
    dispose(): void { ground.dispose(); backdrop.dispose(); },
  };
}

describe('la senda de la garganta, pegada al suelo', () => {
  it('ningún vértice de la cinta flota sobre lo que se dibuja, y ninguno se entierra', () => {
    for (const seed of SEEDS) {
      const { ribbon, surface } = drawn(seed);
      const position = ribbon.geometry.getAttribute('position');
      let floating = 0, worst = 0, buried = 0;
      for (let i = 0; i < position.count; i += 1) {
        const gap = position.getY(i) - surface(position.getX(i), position.getZ(i));
        if (gap > FLOATS) floating += 1;
        if (gap < -0.005) buried += 1;
        worst = Math.max(worst, gap);
      }
      expect(floating, `semilla ${seed}: ${floating} vértices flotan, el peor a ${worst.toFixed(2)}`).toBe(0);
      expect(buried, `semilla ${seed}: vértices bajo el suelo`).toBe(0);
    }
  });

  it('fuera del mapa va por el fondo del cañón y no trepa por la pared', () => {
    for (const seed of SEEDS) {
      const { state, ribbon } = drawn(seed);
      const position = ribbon.geometry.getAttribute('position');
      let highest = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < position.count; i += 1) {
        const z = position.getZ(i);
        if (z > 0 && z < state.map.height) continue;
        highest = Math.max(highest, position.getY(i) - GROUND_BIAS);
      }
      // El fondo del cañón está entre −0,16 (lejos) y la orilla del borde del
      // mapa; antes la cinta subía por la pared hasta veinte celdas.
      expect(highest, `semilla ${seed}`).toBeLessThan(1);
    }
  });

  it('el puente salva la cascada en arco: sube y baja una sola vez, siempre por encima', () => {
    // Vera, 2 oct 2026: «se ve roto el puente». Con la senda apoyada en el
    // suelo, cada tabla copiaba el bache de debajo y el tablero subía, bajaba
    // y volvía a subir en tres palmos.
    let bridges = 0;
    for (const seed of SEEDS) {
      const { backdrop, surface } = drawn(seed);
      for (const bridge of backdrop.group.getObjectByName('Valley_Gorge_Bridges')!.children) {
        // Y de una pieza: con una caja por tramo, donde el puente dobla y sube
        // las tablas se montaban en escalón («baldosas mal puestas»).
        const decks = bridge.children.filter((piece) => piece.name === 'Valley_Gorge_Bridge_Deck');
        expect(decks, `semilla ${seed}: el tablero no es de una pieza`).toHaveLength(1);
        const centre = decks[0]!.userData.centre as { x: number; y: number; z: number }[];
        expect(centre.length, `semilla ${seed}: un puente sin tablero`).toBeGreaterThan(2);
        bridges += 1;
        // Sube y baja una vez: después de bajar, no vuelve a subir.
        let fell = false, valleys = 0;
        for (let k = 1; k < centre.length; k += 1) {
          const rise = centre[k]!.y - centre[k - 1]!.y;
          if (rise < -1e-4) fell = true;
          else if (rise > 1e-4 && fell) valleys += 1;
        }
        expect(valleys, `semilla ${seed}: el tablero hace dientes`).toBe(0);
        for (const point of centre) {
          expect(point.y, `semilla ${seed}: tablero bajo el suelo`).toBeGreaterThan(surface(point.x, point.z));
        }
      }
    }
    expect(bridges, 'alguna senda cruza una cascada').toBeGreaterThan(0);
  });

  it('empieza en la boca, donde empieza el camino pintado, y se pierde en la sierra', () => {
    for (const seed of SEEDS) {
      const { state, road } = drawn(seed);
      const { map, terrainSeed } = state;
      const mouths = roadMouths(map, terrainSeed);
      const paths = gorgeRoadPaths(map, terrainSeed);
      expect(paths, `semilla ${seed}`).toHaveLength(2);
      paths.forEach((path, end) => {
        const mouth = mouths.find((one) => one.end === end)!;
        const first = path[0]!;
        expect(Math.hypot(first.x - (mouth.cell % map.width + 0.5), first.z - (Math.floor(mouth.cell / map.width) + 0.5)),
          `semilla ${seed}, extremo ${end}: la senda no sale de la boca`).toBeLessThan(0.01);
        expect(road.wear[mouth.cell], `semilla ${seed}: la boca no está pintada`).toBeGreaterThanOrEqual(2);
        const last = path[path.length - 1]!;
        const out = end === 0 ? -last.z : last.z - map.height;
        expect(out, `semilla ${seed}, extremo ${end}: no sale del mapa`).toBeGreaterThan(30);
        // Sin saltos: de muestra a muestra, como mucho una celda.
        for (let i = 1; i < path.length; i += 1) {
          expect(Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.z - path[i - 1]!.z)).toBeLessThan(1);
        }
      });
    }
  });
});
