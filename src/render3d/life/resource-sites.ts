import { visibleBuildings } from '@derive/visible-buildings';
import { BUILDINGS } from '@engine/balance';
import { TERRAIN_CODE, type Building, type ConstructionWork, type GameState, type ValleyMap } from '@engine/state';
import { homeRoutine } from './home';
import { terrainOf } from './terrain';

type ResourceState = { readonly buildings: readonly Building[]; readonly map: ValleyMap };

/** Una obra cuyo coste incluye cantera, no una concesión gratuita de encrucijada. */
export function stoneWork(state: Pick<GameState, 'works'>): ConstructionWork | null {
  const work = state.works[0];
  if (work === undefined) return null;
  const spec = BUILDINGS[work.kind];
  // **M-0 · se pregunta por la piedra que falta, no por el coste de obra.**
  // Hasta el esquema 6 la piedra iba escondida dentro de `bpCost` (`bp + piedra
  // / STONE_PER_BP`), así que «pide piedra» se leía como «su coste es mayor que
  // su base». Ahora la piedra es una existencia y la obra lleva la que ya tiene
  // (`stoneDone`): mientras le falte, está en la cantera. Sin este cambio la
  // cantera desaparecía del valle en silencio —nadie iba a la roca— y eso es
  // justo lo que el dueño del diseño quería **ver**.
  return spec.stone > 0 && work.stoneDone < spec.stone ? work : null;
}

/**
 * Pedregales ordenados por cercanía a la obra real, y después la ladera.
 *
 * IA-anim · **La montaña también es cantera.** En la semilla 7 (semana 1418)
 * las veinte rocas quedaban fuera de la zona a la que la aldea llega andando, y
 * la cantera no aparecía nunca aunque el motor sí producía piedra. La roca
 * suelta va primero; la cara de la montaña, detrás. La alcanzabilidad se
 * comprueba al poner la oferta.
 */
export function quarryCells(state: Pick<GameState, 'map' | 'works'>): number[] {
  const work = stoneWork(state);
  if (work === null) return [];
  const centreX = work.x + work.w / 2;
  const centreZ = work.y + work.h / 2;
  const rocks: number[] = [], faces: number[] = [];
  for (let cell = 0; cell < state.map.terrain.length; cell += 1) {
    if (state.map.terrain[cell] === TERRAIN_CODE.rock) rocks.push(cell);
    else if (state.map.terrain[cell] === TERRAIN_CODE.mountain) faces.push(cell);
  }
  const near = (a: number, b: number): number => {
    const ax = a % state.map.width + 0.5, az = Math.floor(a / state.map.width) + 0.5;
    const bx = b % state.map.width + 0.5, bz = Math.floor(b / state.map.width) + 0.5;
    return Math.hypot(ax - centreX, az - centreZ) - Math.hypot(bx - centreX, bz - centreZ) || a - b;
  };
  return [...rocks.sort(near), ...faces.sort(near)];
}

function ringOf(map: ValleyMap, building: Building): number[] {
  const cells: number[] = [];
  for (let z = building.y - 2; z <= building.y + building.h + 1; z += 1) {
    for (let x = building.x - 2; x <= building.x + building.w + 1; x += 1) {
      const inside = x >= building.x && x < building.x + building.w
        && z >= building.y && z < building.y + building.h;
      if (!inside && x >= 0 && z >= 0 && x < map.width && z < map.height) {
        cells.push(z * map.width + x);
      }
    }
  }
  return cells;
}

/**
 * Sitios estables para la leñera y para descargar en ella.
 *
 * Es presentación derivada: no reserva una celda del motor ni crea inventario.
 * Compartir la selección evita que el haz se descargue junto a una casa y la
 * pila aparezca al otro lado del pueblo.
 */
export function woodStoreCells(state: ResourceState): number[] {
  const buildings = visibleBuildings(state);
  const occupied = new Set<number>();
  for (const building of buildings) for (let z = building.y; z < building.y + building.h; z += 1) {
    for (let x = building.x; x < building.x + building.w; x += 1) {
      occupied.add(z * state.map.width + x);
    }
  }
  const land = terrainOf(state);
  const entrances = buildings
    .filter(building => building.kind === 'house' || building.kind === 'stone_house')
    .map(building => homeRoutine(building, land).approach);
  const homes = buildings.filter(building => building.kind === 'house' || building.kind === 'stone_house');
  const seen = new Set<number>();
  return homes.flatMap(home => ringOf(state.map, home)).filter(cell => {
    if (seen.has(cell)) return false;
    seen.add(cell);
    if (occupied.has(cell) || (state.map.path[cell] ?? 0) > 0) return false;
    const terrain = state.map.terrain[cell];
    if (terrain !== TERRAIN_CODE.meadow && terrain !== TERRAIN_CODE.cleared) return false;
    const x = cell % state.map.width + 0.5;
    const z = Math.floor(cell / state.map.width) + 0.5;
    if (entrances.some(entry => Math.abs(entry.x - x) < 1.5 && Math.abs(entry.z - z) < 1.5)) return false;
    return !buildings.some(building => building.kind !== 'field' && building.kind !== 'grave_yard'
      && x > building.x - 1 && x < building.x + building.w + 1
      && z > building.y - 1 && z < building.y + building.h + 1);
  });
}
