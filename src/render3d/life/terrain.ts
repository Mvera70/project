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

import { TERRAIN_CODE, type Building, type ConstructionWork, type ValleyMap } from '@engine/state';
import { defenceGates } from '@derive/defence-gates';
import { bastionAccessOf } from '@derive/bastion-access';
import { fitsCircle, type Point, type Terrain } from './body';

/**
 * Lo que tiene paredes y por tanto corta el paso.
 *
 * Los campos no están: por un campo se anda, y de hecho es donde se trabaja. Lo
 * que no se cruza es lo que tiene cuatro paredes y un tejado, más las dos
 * clases de muralla (`palisade`, `wall`): no tienen puerta, pero tampoco se
 * cruzan.
 *
 * **Exportado y comprobado contra `BuildingKind`** (docs/historico/rework.md §3.5.6,
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
  // K-4 · la sala del rey es una casa: se rodea, no se atraviesa.
  'hall',
  // A3 · el bastión es una pieza de muralla mejorada, no una puerta: se queda
  // con `palisade`/`wall` y no se cruza.
  'bastion',
]);

/**
 * La máscara de por dónde puede andar la gente.
 *
 * Se rehace cuando cambia el valle —una casa nueva cierra un paso— y eso ocurre
 * una vez por jornada escénica, no por fotograma.
 */
export function terrainOf(state: {
  readonly map: ValleyMap;
  readonly buildings: readonly Building[];
  readonly works?: readonly ConstructionWork[];
  /** P-2 · la celda de la fuente, si este valle ya tiene plaza (esquema 8). */
  readonly plaza?: { readonly x: number; readonly y: number };
  readonly ring?: number | null;
}): Terrain {
  const { width, height } = state.map;
  const blocked = new Uint8Array(width * height);
  const gates = defenceGates(state);

  for (let cell = 0; cell < state.map.terrain.length; cell += 1) {
    const kind = state.map.terrain[cell];
    // Agua y roca, cerradas. La marisma la deja pasar el motor para andar
    // (`stepCost` la niega, pero `routesFor` nunca manda a nadie ahí), así que
    // aquí se deja abierta: cerrarla aislaría trozos de orilla sin motivo.
    if (kind === TERRAIN_CODE.water || kind === TERRAIN_CODE.rock
      || kind === TERRAIN_CODE.mountain || kind === TERRAIN_CODE.lake) blocked[cell] = 1;
  }

  for (const building of state.buildings) {
    if (building.lostTick !== null || !WALLED.has(building.kind) || gates.has(building.id)) continue;
    for (let z = building.y; z < building.y + building.h; z += 1) {
      for (let x = building.x; x < building.x + building.w; x += 1) {
        if (x >= 0 && z >= 0 && x < width && z < height) blocked[z * width + x] = 1;
      }
    }
  }

  // E3 · La segunda celda de la malla es piedra maciza hasta que exista la
  // navegación por niveles. Se toma de la misma elección pura que el plan.
  for (const building of state.buildings) {
    const access = building.kind === 'bastion' && state.plaza !== undefined && state.ring !== undefined
      && state.works !== undefined ? bastionAccessOf({ ...state, plaza: state.plaza, ring: state.ring, works: state.works }, building) : null;
    if (access === null) continue;
    const x = building.x + access.x;
    const z = building.y + access.z;
    if (x >= 0 && z >= 0 && x < width && z < height) blocked[z * width + x] = 1;
  }

  // P-2 · **la fuente de la plaza se rodea, no se atraviesa.** Es una celda y
  // sólo una: la plaza mide siete de lado a lado, así que cerrar su centro no
  // encierra a nadie, y sin cerrarlo la gente cruzaría el pilón por dentro —que
  // es el defecto que el dueño del diseño lleva señalando desde el principio,
  // «atraviesan paredes»—.
  const plaza = state.plaza;
  if (plaza !== undefined && plaza.x >= 0 && plaza.y >= 0 && plaza.x < width && plaza.y < height) {
    blocked[plaza.y * width + plaza.x] = 1;
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

/**
 * La celda libre y alcanzable más cercana a un punto, o nada si el valle
 * entero está cerrado.
 *
 * docs/historico/rework.md §3.5.2: un ancla que cae en celda cerrada, o en un patio sin
 * salida hacia el resto de la aldea, es tan inútil como una dentro del muro
 * — `avoid` la empuja sin descanso en el primer caso, y en el segundo nadie
 * llega nunca a hacerle compañía. `reach` es la marca de `reachableFrom`
 * desde el corazón de la aldea (`village.ts`): sólo cuenta estar libre y en
 * esa misma orilla, no cualquier celda libre.
 *
 * Barrido en anillos cuadrados crecientes alrededor de la celda de partida,
 * comprobando sólo el perímetro de cada anillo y no todo su interior — el
 * valle cabe en unos pocos miles de celdas y esto corre una vez por cuerpo al
 * amanecer, no por paso—, con desempate determinista por fila y luego columna:
 * dos animales que partan de la misma celda cerrada encuentran la misma
 * celda de rescate, que es lo que exige §4.3.
 */
export function nearestReachable(land: Terrain, reach: Uint8Array, from: Point, radius = 0): Point | null {
  const startX = Math.max(0, Math.min(land.width - 1, Math.floor(from.x)));
  const startZ = Math.max(0, Math.min(land.height - 1, Math.floor(from.z)));
  if (fitsCircle(land, startX + 0.5, startZ + 0.5, radius) && reach[startZ * land.width + startX] === 1) {
    return { x: startX + 0.5, z: startZ + 0.5 };
  }

  const maxRing = Math.max(land.width, land.height);
  for (let ring = 1; ring <= maxRing; ring += 1) {
    for (let dz = -ring; dz <= ring; dz += 1) {
      const z = startZ + dz;
      if (z < 0 || z >= land.height) continue;
      const onEdgeRow = dz === -ring || dz === ring;
      for (let dx = -ring; dx <= ring; dx += 1) {
        if (!onEdgeRow && dx !== -ring && dx !== ring) continue;
        const x = startX + dx;
        if (x < 0 || x >= land.width) continue;
        const cell = z * land.width + x;
        if (reach[cell] === 1 && fitsCircle(land, x + 0.5, z + 0.5, radius)) return { x: x + 0.5, z: z + 0.5 };
      }
    }
  }
  return null;
}
