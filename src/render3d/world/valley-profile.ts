// Eje longitudinal del valle: el río enlaza los extremos abiertos.
import type { ValleyMap } from '@engine/state';

// El eje del río vive en el motor desde el camino del valle (28 sep 2026).
import { valleyAxis } from '@engine/world/valley-road';
export { valleyAxis };

/**
 * Cuánto se levantan los flancos del río en un punto, de 0 (llano) a 1.
 *
 * En medio del valle deja un llano ancho a cada lado del río. **En los dos
 * extremos se cierra en garganta** (Vera, 26 sep 2026: «las dos entradas del
 * valle se sienten muy poco realistas, muy largas, planas»; eligió la garganta
 * de roca frente al paso abierto): en las últimas `GORGE_REACH` celdas del mapa
 * y fuera de él, el llano se estrecha a `GORGE_FLOOR` celdas del eje del río y
 * las paredes suben en `GORGE_WALL`, así que el valle se ve salir entre dos
 * paredes de roca en vez de por un pasillo llano.
 */
export function valleyShoulder(map: ValleyMap, x: number, z: number): number {
  const cross = Math.abs(x - valleyAxis(map, z));
  const gorge = gorgeAt(map, z);
  const floor = map.width * 0.16 + (GORGE_FLOOR - map.width * 0.16) * gorge;
  const wall = map.width * 0.27 + (GORGE_WALL - map.width * 0.27) * gorge;
  const t = Math.max(0, Math.min(1, (cross - floor) / wall));
  return t * t * (3 - 2 * t);
}

/**
 * La garganta de las entradas. TUNE visual, mirado en capturas de las dos
 * entradas (semillas 11 y 23): 18 celdas de transición desde cada extremo, un
 * suelo de 3,2 celdas a cada lado del eje —el río y una orilla con camino— y
 * paredes que suben en 4,5 celdas. Con el llano de siempre (11,5 celdas y 19 de
 * subida en un mapa de 72) las entradas eran pasillos planos.
 */
const GORGE_REACH = 18;

/** Cuánto es garganta a esta altura del valle: 1 en los extremos y fuera, 0 en medio. */
export function gorgeAt(map: ValleyMap, z: number): number {
  const fromEnd = Math.min(z, map.height - z);
  const g = Math.max(0, Math.min(1, 1 - fromEnd / GORGE_REACH));
  return g * g * (3 - 2 * g);
}
const GORGE_FLOOR = 3.2;
const GORGE_WALL = 4.5;
