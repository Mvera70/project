// E3 · La huella de la escalera pertenece al mundo, no al render: la obra la
// consulta antes de escoger qué muro mejora y la presentación la vuelve a
// comprobar cuando ya existe el bastión. Una sola definición evita que la
// preferencia construya una escalera que el plan luego tenga que retirar.
import { TERRAIN_CODE, type Building, type ConstructionWork, type ValleyMap } from '../state';

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
    || code === TERRAIN_CODE.marsh || code === TERRAIN_CODE.ford
    || code === TERRAIN_CODE.forest;
}

function coveredBy(buildings: readonly Building[], x: number, y: number, except: number): boolean {
  return buildings.some(building => building.id !== except
    && x >= building.x && x < building.x + building.w && y >= building.y && y < building.y + building.h);
}

function coveredByWork(state: BastionAccessState, x: number, y: number): boolean {
  return state.works.some(work => x >= work.x && x < work.x + work.w && y >= work.y && y < work.y + work.h);
}

/**
 * La variante con escalera sólo cabe cuando sus dos celdas y la aproximación
 * inmediata están libres. Sirve tanto al muro prospectivo como al bastión ya
 * construido: `except` deja disponible su propia celda en los dos instantes.
 */
export function bastionAccessOf(state: BastionAccessState, source: Building): BastionAccess | null {
  if ((source.kind !== 'wall' && source.kind !== 'bastion') || source.lostTick !== null || state.ring === null) return null;
  const centre = { x: state.plaza.x + 0.5, y: state.plaza.y + 0.5 };
  const from = { x: source.x + 0.5, y: source.y + 0.5 };
  const inward = DIRECTIONS.filter(direction =>
    (centre.x - from.x) * direction.x + (centre.y - from.y) * direction.z > 0);
  const ordered = inward.sort((a, b) => {
    const score = (centre.x - from.x) * b.x + (centre.y - from.y) * b.z
      - ((centre.x - from.x) * a.x + (centre.y - from.y) * a.z);
    return score;
  });
  for (const direction of ordered) {
    const insideX = source.x + direction.x;
    const insideY = source.y + direction.z;
    const approachX = insideX + direction.x;
    const approachY = insideY + direction.z;
    const valid = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < state.map.width && y < state.map.height
      && !closedTerrain(state.map.terrain[y * state.map.width + x])
      && !coveredBy(state.buildings, x, y, source.id) && !coveredByWork(state, x, y);
    const sideX = direction.z;
    const sideY = -direction.x;
    if (valid(insideX, insideY) && valid(approachX, approachY)
      && valid(approachX + sideX, approachY + sideY)
      && valid(approachX - sideX, approachY - sideY)) return direction;
  }
  return null;
}
