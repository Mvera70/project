// El camino del valle, en el motor (28 sep 2026).
//
// Vera, al cerrar v4.93: que el camino de los desfiladeros a la plaza exista
// también en el mapa del motor (`map.path`), no sólo pintado. Es lo que hace
// que los aldeanos lo prefieran —el A* descuenta las celdas pisadas— y que el
// buhonero y los tratantes puedan entrar por él y seguirlo.
//
// El camino no es una capa nueva del mapa: es **tráfico**, como todo lo demás
// (§7.6). Cada semana los de fuera pisan las celdas del camino
// (`wearValleyRoad`, `WORLD.ROAD_TRAFFIC`) y el mismo mecanismo que asienta
// las sendas de la aldea lo asienta a él: pisada, senda, y calzada cuando hay
// fragua. Al fundar, la senda ya está pisada (`seedValleyRoad`): la pareja
// llegó por algún sitio. Ni un campo nuevo en el esquema, ni una tirada.
//
// De dónde a dónde: de la **boca** de cada desfiladero —la primera fila desde
// el borde en la que el suelo junto al río conecta a pie con el corazón del
// valle, por la orilla que conecta— hasta la plaza, con el A* de los aldeanos
// (`route`). Todo sale del mapa y de la semilla del terreno: determinista, y
// lo mismo para el motor, para la cinta de la sierra y para el suelo pintado,
// que leen de aquí.

import { WORLD } from '../balance';
import { hash32 } from '../rng';
import { TERRAIN_CODE, type GameState, type ValleyMap } from '../state';
import { route, stepCost } from './astar';

/**
 * Desde cuántas celdas del borde empieza a buscarse la boca, y hasta cuántas.
 * Catorce es lo que entra la cinta de la sierra como mínimo (`mountains.ts`).
 */
const MOUTH_FROM = 14;
const MOUTH_TO = 34;
/** Lo lejos del eje del río que se mira si una orilla conecta, en celdas. */
const BANK_FROM = 1.9;
const BANK_TO = 11;

const axes = new WeakMap<ValleyMap, Float32Array>();

/** El eje del río en una fila: el centro de sus celdas de agua, o el del mapa. */
export function valleyAxis(map: ValleyMap, z: number): number {
  let rows = axes.get(map);
  if (rows === undefined) {
    rows = new Float32Array(map.height);
    for (let row = 0; row < map.height; row += 1) {
      let sum = 0, count = 0;
      for (let x = 0; x < map.width; x += 1) {
        const terrain = map.terrain[row * map.width + x];
        if (terrain === TERRAIN_CODE.water || terrain === TERRAIN_CODE.ford) {
          sum += x + 0.5; count += 1;
        }
      }
      rows[row] = count > 0 ? sum / count : map.width / 2;
    }
    axes.set(map, rows);
  }
  const row = Math.max(0, Math.min(map.height - 1, z));
  const low = Math.floor(row), high = Math.min(map.height - 1, low + 1);
  return rows[low]! * (1 - row + low) + rows[high]! * (row - low);
}

const reaches = new WeakMap<ValleyMap, Uint8Array>();

/**
 * Qué celdas conectan a pie con el corazón del valle: una inundación por las
 * celdas que el A* pisa, desde el prado del rectángulo central. Dentro del
 * cinturón de montaña hay roca suelta pisable pero aislada —islas—, y sin
 * esto la boca caía en una (semillas 7 y 11: ruta de longitud cero). Una vez
 * por mapa; el terreno no cambia.
 */
export function valleyReach(map: ValleyMap): Uint8Array {
  let reach = reaches.get(map);
  if (reach !== undefined) return reach;
  reach = new Uint8Array(map.width * map.height);
  const queue: number[] = [];
  const x0 = Math.floor(map.width / 4), x1 = Math.ceil(map.width * 3 / 4);
  const z0 = Math.floor(map.height / 4), z1 = Math.ceil(map.height * 3 / 4);
  for (let z = z0; z < z1; z += 1) for (let x = x0; x < x1; x += 1) {
    const cell = z * map.width + x;
    if (map.terrain[cell] === TERRAIN_CODE.meadow && stepCost(map, cell) !== null) { reach[cell] = 1; queue.push(cell); }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const cell = queue[head]!;
    const x = cell % map.width, z = Math.floor(cell / map.width);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= map.width || nz >= map.height) continue;
      const next = nz * map.width + nx;
      if (reach[next] === 1 || stepCost(map, next) === null) continue;
      reach[next] = 1;
      queue.push(next);
    }
  }
  reaches.set(map, reach);
  return reach;
}

export interface RoadMouth {
  /** 0 el extremo norte (z pequeña), 1 el sur. */
  readonly end: 0 | 1;
  /** Cuántas filas entra desde el borde del mapa. */
  readonly depth: number;
  /** Por qué orilla del río: 1 hacia x mayor, −1 hacia x menor. */
  readonly side: 1 | -1;
  /** La celda del suelo, conectada con el valle, donde empieza el camino. */
  readonly cell: number;
}

function bankCell(map: ValleyMap, z: number, side: 1 | -1): number | null {
  const reach = valleyReach(map);
  const centre = valleyAxis(map, z);
  for (let d = BANK_FROM; d <= BANK_TO; d += 1) {
    const x = Math.floor(centre + side * d);
    if (x < 0 || x >= map.width) continue;
    const cell = z * map.width + x;
    if (reach[cell] === 1) return cell;
  }
  return null;
}

/**
 * La boca de cada desfiladero. La orilla la decide quién conecta; si las dos,
 * el hash de la semilla del terreno (es lo que decidía antes la cinta).
 */
export function roadMouths(map: ValleyMap, seed: number): readonly RoadMouth[] {
  const mouths: RoadMouth[] = [];
  for (const end of [0, 1] as const) {
    const wanted: 1 | -1 = hash32(seed, `road:${end}`) / 4_294_967_296 > 0.5 ? 1 : -1;
    let found: RoadMouth | null = null;
    for (let depth = MOUTH_FROM; depth <= MOUTH_TO && found === null; depth += 1) {
      const z = end === 0 ? depth : map.height - 1 - depth;
      const here = bankCell(map, z, wanted);
      const other = bankCell(map, z, wanted === 1 ? -1 : 1);
      const cell = here ?? other;
      if (cell === null) continue;
      found = { end, depth: depth + 1, side: here !== null ? wanted : (wanted === 1 ? -1 : 1), cell };
    }
    if (found !== null) mouths.push(found);
  }
  return mouths;
}

/** Las celdas del camino, de cada boca a la plaza (una ruta por boca). Vacío si la plaza no está puesta. */
export function valleyRoadCells(map: ValleyMap, seed: number, plaza: { readonly x: number; readonly y: number }): readonly number[][] {
  if (plaza.x < 0 || plaza.y < 0 || plaza.x >= map.width || plaza.y >= map.height) return [];
  const goal = Math.floor(plaza.y) * map.width + Math.floor(plaza.x);
  if (stepCost(map, goal) === null) return [];
  return roadMouths(map, seed).map((mouth) => route(map, mouth.cell, goal)).filter((cells) => cells.length > 0);
}

/**
 * Paso 14 · los de fuera pisan el camino esta semana. Va con el desgaste de la
 * aldea: el mismo decaimiento y los mismos umbrales lo asientan.
 */
export function wearValleyRoad(state: GameState): Set<number> {
  const worn = new Set<number>();
  for (const cells of valleyRoadCells(state.map, state.terrainSeed, state.plaza)) {
    for (const cell of cells) {
      const t = state.map.traffic[cell] as number;
      state.map.traffic[cell] = Math.min(65535, t + WORLD.ROAD_TRAFFIC);
      worn.add(cell);
    }
  }
  return worn;
}

/** Al fundar: la senda por la que llegaron ya está pisada. */
export function seedValleyRoad(state: GameState): void {
  for (const cells of valleyRoadCells(state.map, state.terrainSeed, state.plaza)) {
    for (const cell of cells) {
      state.map.traffic[cell] = Math.max(state.map.traffic[cell] as number, WORLD.ROAD_FOUNDING);
      state.map.path[cell] = Math.max(state.map.path[cell] as number, 1);
    }
  }
}
