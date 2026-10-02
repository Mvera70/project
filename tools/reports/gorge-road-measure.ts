// La senda de la garganta, medida contra lo que se dibuja (2 oct 2026).
//
// Vera: «el camino sigue flotando… no sé cómo llegan las visitas al valle».
// Las pruebas de la senda la medían contra fórmulas —`ridgeAt`, la cota del
// relieve— y la sierra que se ve no es la fórmula: lleva un vértice cada dos o
// cuatro celdas, movidos de su nudo, y entre vértices es un plano. Esto mide
// contra **las mallas tal y como se construyen** —el suelo del mapa, la piel
// de la montaña y la sierra de fuera—, con un rayo vertical por cada vértice
// de la cinta. Lo usa el informe (`gorge-road-report.ts`); la prueba
// (`tests/journeys/gorge-road-ground.test.ts`) mide lo mismo con la consulta por
// cubos de la malla (`meshSurface`), que da lo mismo que el rayo y es cien
// veces más rápida.

import { DoubleSide, Raycaster, Vector3, type Material, type Mesh } from 'three';
import type { GameState } from '../../src/engine/state';
import { PALETTES } from '../../src/derive/palette';
import { plazaOf } from '../../src/derive/plaza';
import { buildBackdrop } from '../../src/render3d/world/backdrop';
import { gorgeRoadPaths } from '../../src/render3d/world/mountains';
import { buildGround } from '../../src/render3d/world/ground';
import { valleyRoad } from '../../src/render3d/world/road';
import { GROUND_BIAS } from '../../src/render3d/visual-config';

/** Lo que la cinta puede ir por encima del suelo dibujado sin leerse como flotando, en celdas. */
export const FLOATS = 0.35;

export interface RoadVertex {
  readonly x: number;
  readonly z: number;
  /** Altura de la cinta sobre la malla dibujada, en celdas (negativa: enterrada). */
  readonly gap: number;
  /** Si cae dentro del rectángulo jugable. */
  readonly inside: boolean;
}

export interface GorgeRoadMeasure {
  readonly vertices: readonly RoadVertex[];
  /** Puntos dentro de los triángulos de la cinta donde el suelo dibujado la tapa. */
  readonly buried: number;
  readonly sampled: number;
  /** Lo lejos que queda, en planta, el extremo de dentro de cada senda de la celda de camino pintado más cercana. */
  readonly joins: readonly number[];
}

/** La cota más alta de las mallas dadas en (x, z), o −∞ si ninguna está debajo. */
function surfaceProbe(meshes: readonly Mesh[]): (x: number, z: number) => number {
  const ray = new Raycaster();
  const from = new Vector3();
  const down = new Vector3(0, -1, 0);
  return (x, z) => {
    from.set(x, 500, z);
    ray.set(from, down);
    const hits = ray.intersectObjects(meshes as Mesh[], false);
    return hits.length === 0 ? Number.NEGATIVE_INFINITY : hits[0]!.point.y;
  };
}

/** Mide las dos cintas de un valle tal como el juego las monta al fundarlo. */
export function measureGorgeRoads(state: GameState): GorgeRoadMeasure {
  const { map, terrainSeed } = state;
  const palette = PALETTES.spring;
  const plaza = plazaOf(state);
  const road = valleyRoad(map, terrainSeed, plaza, 'hamlet');
  const ground = buildGround(map, palette, plaza, 'hamlet', undefined, road.wear);
  const backdrop = buildBackdrop(map, terrainSeed, palette);
  const skin = backdrop.group.getObjectByName('Valley_Mountain_Skin') as Mesh | undefined;
  const ribbon = backdrop.group.getObjectByName('Valley_Gorge_Roads') as Mesh;
  const terrain = [ground.mesh, backdrop.ridge, ...(skin === undefined ? [] : [skin])];
  // El rayo baja: que choque con la cara de arriba aunque el material sea de una sola cara.
  for (const mesh of terrain) (mesh.material as Material).side = DoubleSide;
  for (const mesh of terrain) mesh.updateMatrixWorld(true);
  const surface = surfaceProbe(terrain);

  const position = ribbon.geometry.getAttribute('position');
  const seen = new Set<string>();
  const vertices: RoadVertex[] = [];
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const key = `${Math.round(x * 1000)}:${Math.round(z * 1000)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const floor = surface(x, z);
    vertices.push({ x, z, gap: y - floor, inside: x >= 0 && z >= 0 && x <= map.width && z <= map.height });
  }

  // Y dentro de cada triángulo: una arista de la ladera puede asomar por el
  // centro de un tramo aunque sus esquinas estén libres («los caminos se cortan»).
  let buried = 0, sampled = 0;
  for (let face = 0; face + 2 < position.count; face += 3) {
    for (const [a, b, c] of [[0.5, 0.5, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [1 / 3, 1 / 3, 1 / 3]] as const) {
      const x = position.getX(face) * a + position.getX(face + 1) * b + position.getX(face + 2) * c;
      const y = position.getY(face) * a + position.getY(face + 1) * b + position.getY(face + 2) * c;
      const z = position.getZ(face) * a + position.getZ(face + 1) * b + position.getZ(face + 2) * c;
      sampled += 1;
      if (y < surface(x, z) - 0.005) buried += 1;
    }
  }

  // El empalme: el extremo de dentro de cada senda —su primer punto— y la
  // celda de camino pintado más cercana.
  const joins: number[] = [];
  const painted: { x: number; z: number }[] = [];
  for (let cell = 0; cell < road.wear.length; cell += 1) {
    if (road.wear[cell]! >= 2) painted.push({ x: cell % map.width + 0.5, z: Math.floor(cell / map.width) + 0.5 });
  }
  for (const path of gorgeRoadPaths(map, terrainSeed)) {
    const end = path[0]!;
    let best = Number.POSITIVE_INFINITY;
    for (const cell of painted) best = Math.min(best, Math.hypot(cell.x - end.x, cell.z - end.z));
    joins.push(best);
  }

  ground.dispose();
  backdrop.dispose();
  return { vertices, buried, sampled, joins };
}

/** Resumen de una medida: cuántos vértices flotan, el peor, y cuántos van enterrados. */
export function summarise(measure: GorgeRoadMeasure): {
  count: number; floating: number; worst: number; worstAt: { x: number; z: number } | null; under: number; buriedShare: number; joins: readonly number[];
} {
  let floating = 0, under = 0, worst = Number.NEGATIVE_INFINITY;
  let worstAt: { x: number; z: number } | null = null;
  for (const v of measure.vertices) {
    if (v.gap > FLOATS) floating += 1;
    if (v.gap < -0.005) under += 1;
    if (v.gap > worst) { worst = v.gap; worstAt = { x: v.x, z: v.z }; }
  }
  return {
    count: measure.vertices.length, floating, worst, worstAt, under,
    buriedShare: measure.sampled === 0 ? 0 : measure.buried / measure.sampled, joins: measure.joins,
  };
}

export { GROUND_BIAS };
