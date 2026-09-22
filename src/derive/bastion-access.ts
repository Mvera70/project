// E3 · La escalera es una decisión de escena pura: no abre navegación elevada.
import { TERRAIN_CODE, type Building, type ConstructionWork, type ValleyMap } from '@engine/state';

export interface BastionAccess {
  /** Dirección cardinal desde el bastión hacia el interior de la villa. */
  readonly x: -1 | 0 | 1;
  readonly z: -1 | 0 | 1;
}

export interface BastionAccessState {
  readonly map: ValleyMap;
  readonly buildings: readonly Building[];
  readonly works: readonly ConstructionWork[];
  readonly plaza: { readonly x: number; readonly y: number };
  readonly ring: number | null;
}

const DIRECTIONS: readonly BastionAccess[] = [
  { x: 0, z: -1 }, { x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 },
];

function closedTerrain(code: number | undefined): boolean {
  return code === TERRAIN_CODE.water || code === TERRAIN_CODE.rock
    || code === TERRAIN_CODE.mountain || code === TERRAIN_CODE.lake
    // El cuerpo puede cruzar el vado, pero una escalera maciza ahí se leería
    // enterrada o en el agua. La selección visual es deliberadamente más dura.
    || code === TERRAIN_CODE.marsh || code === TERRAIN_CODE.ford
    // Un árbol sigue siendo transitable para la vida, pero su tronco/copa no
    // puede atravesar una escalera maciza sin que ésta parezca enterrada.
    || code === TERRAIN_CODE.forest;
}

function coveredBy(buildings: readonly Building[], x: number, y: number, except: number): boolean {
  // Las ruinas siguen siendo volumen visible; ocultarlas del criterio dejaría
  // que los peldaños se solapen con su cascote aunque ya no cierren rutas.
  return buildings.some(building => building.id !== except
    && x >= building.x && x < building.x + building.w && y >= building.y && y < building.y + building.h);
}

function coveredByWork(state: BastionAccessState, x: number, y: number): boolean {
  return state.works.some(work => x >= work.x && x < work.x + work.w && y >= work.y && y < work.y + work.h);
}

/**
 * La variante con escalera sólo cabe cuando sus dos celdas y la aproximación
 * inmediata están libres. La plaza y el anillo dan el lado interior estable;
 * el empate cardinal se resuelve en el orden N, E, S, O.
 */
export function bastionAccessOf(state: BastionAccessState, bastion: Building): BastionAccess | null {
  if (bastion.kind !== 'bastion' || bastion.lostTick !== null || state.ring === null) return null;
  const centre = { x: state.plaza.x + 0.5, y: state.plaza.y + 0.5 };
  const from = { x: bastion.x + 0.5, y: bastion.y + 0.5 };
  const inward = DIRECTIONS.filter(direction =>
    (centre.x - from.x) * direction.x + (centre.y - from.y) * direction.z > 0);
  const ordered = inward.sort((a, b) => {
    const score = (centre.x - from.x) * b.x + (centre.y - from.y) * b.z
      - ((centre.x - from.x) * a.x + (centre.y - from.y) * a.z);
    return score;
  });
  for (const direction of ordered) {
    const insideX = bastion.x + direction.x;
    const insideY = bastion.y + direction.z;
    const approachX = insideX + direction.x;
    const approachY = insideY + direction.z;
    const valid = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < state.map.width && y < state.map.height
      && !closedTerrain(state.map.terrain[y * state.map.width + x])
      && !coveredBy(state.buildings, x, y, bastion.id) && !coveredByWork(state, x, y);
    // La tercera celda y sus esquinas evitan que la aproximación se cuele por
    // un codo diagonal de la muralla: una escalera visual no abre ese paso.
    const sideX = direction.z;
    const sideY = -direction.x;
    if (valid(insideX, insideY) && valid(approachX, approachY)
      && valid(approachX + sideX, approachY + sideY)
      && valid(approachX - sideX, approachY - sideY)) return direction;
  }
  return null;
}
