// Continuación visual del río principal por sus dos salidas del mapa.
import { TERRAIN_CODE, type ValleyMap } from '@engine/state';
import { hash32 } from '@engine/rng';

export interface RiverSection {
  left: number;
  right: number;
}

/** La primera y última fila del generador contienen el cauce conectado. */
function edgeSection(map: ValleyMap, row: number): RiverSection | null {
  let first: number = map.width;
  let last = -1;
  for (let x = 0; x < map.width; x += 1) {
    if (map.terrain[row * map.width + x] !== TERRAIN_CODE.water) continue;
    first = Math.min(first, x);
    last = Math.max(last, x);
  }
  return last < first ? null : { left: first, right: last + 1 };
}

/** Una sección perpendicular al cauce, en coordenadas de mundo. */
export function riverSection(map: ValleyMap, seed: number, z: number): RiverSection | null {
  if (z > 0 && z < map.height) return null;
  const north = z <= 0;
  const edge = edgeSection(map, north ? 0 : map.height - 1);
  if (edge === null) return null;
  const distance = north ? -z : z - map.height;
  const phase = hash32(seed, north ? 'river-extension:north' : 'river-extension:south')
    / 4_294_967_296 * Math.PI * 2;
  // La curva nace exactamente en la salida, sin desplazar el borde compartido.
  const bend = (Math.sin(distance * 0.11 + phase) - Math.sin(phase))
    * Math.min(2.8, distance * 0.1);
  return { left: edge.left + bend, right: edge.right + bend };
}

/** El lecho es un poco más ancho que la lámina para dejar una orilla legible. */
export function riverExtensionAt(
  map: ValleyMap, seed: number, x: number, z: number, bank = 0,
): boolean {
  const section = riverSection(map, seed, z);
  return section !== null && x >= section.left - bank && x <= section.right + bank;
}
