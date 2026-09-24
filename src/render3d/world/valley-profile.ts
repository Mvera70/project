// Eje longitudinal del valle: el río enlaza los extremos abiertos.
import { TERRAIN_CODE, type ValleyMap } from '@engine/state';

const axes = new WeakMap<ValleyMap, Float32Array>();

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

/** Abre pasos anchos a ambos extremos; sólo se elevan los flancos del río. */
export function valleyShoulder(map: ValleyMap, x: number, z: number): number {
  const cross = Math.abs(x - valleyAxis(map, z));
  const t = Math.max(0, Math.min(1, (cross - map.width * 0.16) / (map.width * 0.27)));
  return t * t * (3 - 2 * t);
}
