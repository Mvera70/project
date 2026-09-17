import { visibleBuildings } from '@derive/visible-buildings';
import { TERRAIN_CODE, type Building, type ValleyMap } from '@engine/state';
import { homeRoutine } from './home';
import { terrainOf } from './terrain';

type ResourceState = { readonly buildings: readonly Building[]; readonly map: ValleyMap };

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
