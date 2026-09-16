import { visibleBuildings } from '@derive/visible-buildings';
// IA-10 · La navegación recibe los mismos objetos y transformaciones que se pintan.
import { Box3, Matrix4, Quaternion, Vector3, type Object3D } from 'three';
import type { GameState } from '@engine/state';
import { terrainOf } from '../life/terrain';
import type { Terrain } from '../life/body';
import { steadingOf } from './steading';

/** Rejilla conservadora: se reserva toda celda que toca un sólido grande.
 * No incluye tejados ni copas de árboles. Se calcula una vez por cambio de mapa. */
export function solidTerrain(state: GameState, source: (id: string) => Object3D | undefined): Terrain {
  const land = terrainOf(state);
  const block = (box: Box3): void => {
    for (let z = Math.max(0, Math.floor(box.min.z)); z < Math.min(land.height, Math.ceil(box.max.z)); z += 1) {
      for (let x = Math.max(0, Math.floor(box.min.x)); x < Math.min(land.width, Math.ceil(box.max.x)); x += 1) {
        land.blocked[z * land.width + x] = 1;
      }
    }
  };
  for (const object of steadingOf(state, state.terrainSeed)) {
    const model = source(object.asset);
    if (model === undefined) continue;
    const matrix = new Matrix4().compose(
      new Vector3(object.cell % land.width + 0.5, 0, Math.floor(object.cell / land.width) + 0.5),
      new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), object.facing), new Vector3(1, 1, 1));
    block(new Box3().setFromObject(model).applyMatrix4(matrix));
  }
  for (const building of visibleBuildings(state)) {
    if (building.kind !== 'well' && building.lostTick === null) continue;
    if (building.kind === 'field') continue;
    block(new Box3(new Vector3(building.x, 0, building.y),
      new Vector3(building.x + building.w, 1, building.y + building.h)));
  }
  return land;
}
