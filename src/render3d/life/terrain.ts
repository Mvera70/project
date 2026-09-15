// V-03 · Por dónde se pasa. design.md Anexo E.
//
// **El río parte el valle, y eso no es un fallo: es el valle.**
//
// Apareció midiendo. Con el agua cerrada, el 80 % de los destinos de una prueba
// quedaban sin camino y la gente se quedaba quieta; lo primero que pensé fue
// que se atascaba, y lo segundo que faltaba abrir el vado. Las dos cosas eran
// falsas:
//
// - `ford()` no es un puente: devuelve **tierra junto al agua**, el sitio al que
//   la gente se acerca para que la escena del vado ocurra ahí.
// - El A* del motor (`stepCost`) da `null` para agua y marisma, así que las
//   rutas de trabajo de §7.6 tampoco cruzan.
// - Y medido en tres semillas: **ninguna** celda de agua lleva camino. El vado
//   que iba a abrir no existía en ninguna parte salvo en mi cabeza.
//
// Así que la gente no cruza el río, y sólo el 37 % del suelo libre está
// conectado con el centro del valle. Lo que la capa de vida necesita no es un
// puente inventado: es **saber en qué orilla está cada uno** y no mandar a nadie
// a donde no puede llegar. Eso es `reachableFrom`.
//
// Vive aquí y no en cada sitio que lo necesite porque es la clase de detalle
// que se olvida al copiarlo: una sola máscara, y quien la use la hereda bien.

import { TERRAIN_CODE, type GameState } from '@engine/state';
import type { Point, Terrain } from './body';

/**
 * Lo que tiene paredes y por tanto corta el paso.
 *
 * Los campos no están: por un campo se anda, y de hecho es donde se trabaja. Lo
 * que no se cruza es lo que tiene cuatro paredes y un tejado, más las dos
 * clases de muralla (`palisade`, `wall`): no tienen puerta, pero tampoco se
 * cruzan.
 *
 * **Exportado y comprobado contra `BuildingKind`** (rework.md §3.5.6,
 * `tests/fast/life-terrain.test.ts`): de los trece tipos de edificio que
 * existen hoy, sólo `field`, `well` y `grave_yard` quedan fuera de esta lista
 * — el propio motor los llama «suelo, no interior» en
 * `src/engine/world/placement.ts` y design.md §7.2 lo dice igual: «campo, la
 * empalizada, el pozo y el camposanto son suelo, no interior» (la empalizada
 * se queda aquí de todos modos, porque a diferencia de esos tres sí es un
 * muro que no se cruza, aunque no tenga puerta). No hacía falta añadir ningún
 * tipo — la lista ya estaba completa —, pero sí la prueba que lo dijera, para
 * que el próximo tipo de edificio no se cuele sin que alguien decida de qué
 * lado cae.
 */
export const WALLED: ReadonlySet<string> = new Set([
  'house', 'stone_house', 'granary', 'chapel', 'church',
  'smithy', 'mill', 'watchtower', 'palisade', 'wall',
]);

/**
 * La máscara de por dónde puede andar la gente.
 *
 * Se rehace cuando cambia el valle —una casa nueva cierra un paso— y eso ocurre
 * una vez por jornada escénica, no por fotograma.
 */
export function terrainOf(state: GameState): Terrain {
  const { width, height } = state.map;
  const blocked = new Uint8Array(width * height);

  for (let cell = 0; cell < state.map.terrain.length; cell += 1) {
    const kind = state.map.terrain[cell];
    // Agua y roca, cerradas. La marisma la deja pasar el motor para andar
    // (`stepCost` la niega, pero `routesFor` nunca manda a nadie ahí), así que
    // aquí se deja abierta: cerrarla aislaría trozos de orilla sin motivo.
    if (kind === TERRAIN_CODE.water || kind === TERRAIN_CODE.rock
      || kind === TERRAIN_CODE.mountain || kind === TERRAIN_CODE.lake) blocked[cell] = 1;
  }

  for (const building of state.buildings) {
    if (building.lostTick !== null || !WALLED.has(building.kind)) continue;
    for (let z = building.y; z < building.y + building.h; z += 1) {
      for (let x = building.x; x < building.x + building.w; x += 1) {
        if (x >= 0 && z >= 0 && x < width && z < height) blocked[z * width + x] = 1;
      }
    }
  }

  return { width, height, blocked };
}

/**
 * Las celdas a las que se puede llegar desde una, andando.
 *
 * Una inundación por las cuatro direcciones. Se usa para no mandar a nadie a la
 * otra orilla: con el río cerrado, **el valle son varias islas** y la del centro
 * es sólo el 37 % del suelo libre. Preguntar por una ruta imposible no rompe
 * nada —`pathTo` responde que no hay— pero sí deja a alguien plantado sin nada
 * que hacer, y eso en pantalla se lee como que se ha colgado.
 */
export function reachableFrom(land: Terrain, from: Point): Uint8Array {
  const seen = new Uint8Array(land.width * land.height);
  const start = Math.max(0, Math.min(land.height - 1, Math.floor(from.z))) * land.width
    + Math.max(0, Math.min(land.width - 1, Math.floor(from.x)));
  if (land.blocked[start] === 1) return seen;

  const queue = [start];
  seen[start] = 1;
  for (let head = 0; head < queue.length; head += 1) {
    const cell = queue[head] as number;
    const cx = cell % land.width;
    const cz = Math.floor(cell / land.width);
    for (const [dx, dz] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= land.width || nz >= land.height) continue;
      const next = nz * land.width + nx;
      if (seen[next] === 1 || land.blocked[next] === 1) continue;
      seen[next] = 1;
      queue.push(next);
    }
  }
  return seen;
}

/** Si desde `from` se puede llegar andando a `to`. */
export function canReach(land: Terrain, reach: Uint8Array, to: Point): boolean {
  const cx = Math.floor(to.x);
  const cz = Math.floor(to.z);
  if (cx < 0 || cz < 0 || cx >= land.width || cz >= land.height) return false;
  return reach[cz * land.width + cx] === 1;
}
