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
  const edge = edgeSection(map, z <= 0 ? 0 : map.height - 1);
  if (edge === null) return null;
  const bend = riverBend(map, seed, z);
  return { left: edge.left + bend, right: edge.right + bend };
}

/**
 * Lo que el río se aparta, fuera del mapa, de donde salía por el borde, en
 * celdas: cero dentro del mapa y en el borde mismo.
 *
 * **Y el cañón entero lo sigue** desde el 2 oct 2026 (`ridge.ts`, `canyonX`):
 * con el suelo del cañón recto y el río curvándose hasta 2,8 celdas, la senda,
 * que va en seco junto al río, no cabía en el fondo y subía por la pared (Vera:
 * «el camino sigue flotando»).
 */
export function riverBend(map: ValleyMap, seed: number, z: number): number {
  if (z > 0 && z < map.height) return 0;
  const north = z <= 0;
  const distance = north ? -z : z - map.height;
  const phase = hash32(seed, north ? 'river-extension:north' : 'river-extension:south')
    / 4_294_967_296 * Math.PI * 2;
  // La curva nace exactamente en la salida, sin desplazar el borde compartido.
  return (Math.sin(distance * 0.11 + phase) - Math.sin(phase)) * Math.min(2.8, distance * 0.1);
}

/** El centro del cauce donde sale por el borde (`0` el norte, `1` el sur), o `null` si por ahí no sale. */
export function riverMouthCentre(map: ValleyMap, end: 0 | 1): number | null {
  const edge = edgeSection(map, end === 0 ? 0 : map.height - 1);
  return edge === null ? null : (edge.left + edge.right) / 2;
}

/** El lecho es un poco más ancho que la lámina para dejar una orilla legible. */
export function riverExtensionAt(
  map: ValleyMap, seed: number, x: number, z: number, bank = 0,
): boolean {
  const section = riverSection(map, seed, z);
  return section !== null && x >= section.left - bank && x <= section.right + bank;
}
