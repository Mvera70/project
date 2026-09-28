// El camino del valle (28 sep 2026).
//
// Vera, con tres capturas: «el camino que entra por ambos desfiladeros no se
// pinta correctamente: se corta por las montañas y no se conecta con el
// pueblo, así no pueden ir mercaderes ni el buhonero por un sendero como tal.
// Se puede ir cambiando según las fases: al principio tierra, luego sendero
// (alguna señal, cartel anunciando la aldea). El camino que construye el
// pueblo no entra por el desfiladero: llega hasta la puerta, y ahí iría el
// cartel».
//
// Lo que había: la senda del desfiladero (`mountains.ts`) entra catorce celdas
// en el mapa y muere en el prado, y las sendas que gasta el motor
// (`map.path`) salen de ir al trabajo, no de ir al desfiladero: nada unía las
// dos. Esto traza **el camino de fuera a la plaza** por el mapa, con el mismo
// A* del motor que usan los aldeanos (`route`), desde la boca de cada
// desfiladero —el extremo interior de la senda— hasta la plaza. No es una
// malla: dentro del mapa el camino **se pinta en el suelo** como las sendas
// gastadas, con el mismo color por nivel (`cellColour`), así que no hay muro
// ni plataforma que se corte contra nada; y como el A* prefiere las celdas
// pisadas, el camino entra en la aldea por sus propias sendas y se une a
// ellas. Por eras: en el caserío, tierra pisada; en la aldea, senda; en la
// villa, calzada. Y desde la aldea, un **cartel** en cada entrada, a unas
// celdas de la plaza, mirando a quien llega. Puro salvo `buildSignposts`.

import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { route, stepCost } from '@engine/world/astar';
import type { ValleyMap } from '@engine/state';
import type { Era } from '@derive/era';
import { gorgeRoadPaths, valleyReach } from './mountains';

/**
 * TUNE visual. El nivel de senda que pinta el camino en cada era (los mismos
 * de `map.path`: 1 pisada, 2 senda, 3 calzada). Con «pisada» en el caserío el
 * camino no se distinguía del prado desde la vista de siempre (captura, 28
 * sep): tierra es el 2, y el sendero de la aldea el 3. Y a cuántas celdas de
 * la plaza, camino afuera, va el cartel.
 */
const ROAD_WEAR: Readonly<Record<Era, number>> = { hamlet: 2, village: 3, town: 3 };
const SIGN_DISTANCE = 10;
/** Cuánto se aparta el cartel del eje del camino, en celdas. */
const SIGN_ASIDE = 0.55;
/** Si la boca de la senda cae en celda cerrada, se busca una abierta hasta aquí. */
const MOUTH_SEARCH = 4;

export interface Signpost { readonly x: number; readonly z: number; readonly yaw: number }

export interface ValleyRoad {
  /** Nivel de senda por celda (0 nada), para pintar el suelo junto a `map.path`. */
  readonly wear: Uint8Array;
  /** Los carteles, uno por entrada; ninguno en el caserío. */
  readonly signposts: readonly Signpost[];
  /** Las bocas: donde la senda del desfiladero entra en el mapa. */
  readonly mouths: readonly { readonly x: number; readonly z: number }[];
}

/** La celda más cercana que conecta a pie con el corazón del valle (no una isla de roca). */
function passableNear(map: ValleyMap, x: number, z: number): number | null {
  const reach = valleyReach(map);
  const cx = Math.max(0, Math.min(map.width - 1, Math.floor(x)));
  const cz = Math.max(0, Math.min(map.height - 1, Math.floor(z)));
  let best: number | null = null;
  let bestGap = Infinity;
  for (let dz = -MOUTH_SEARCH; dz <= MOUTH_SEARCH; dz += 1) {
    for (let dx = -MOUTH_SEARCH; dx <= MOUTH_SEARCH; dx += 1) {
      const tx = cx + dx, tz = cz + dz;
      if (tx < 0 || tz < 0 || tx >= map.width || tz >= map.height) continue;
      const cell = tz * map.width + tx;
      if (reach[cell] !== 1) continue;
      const gap = Math.hypot(dx, dz);
      if (gap < bestGap) { bestGap = gap; best = cell; }
    }
  }
  return best;
}

export function valleyRoad(
  map: ValleyMap, seed: number, plaza: { readonly x: number; readonly y: number }, era: Era,
): ValleyRoad {
  const wear = new Uint8Array(map.width * map.height);
  const level = ROAD_WEAR[era];
  const signposts: Signpost[] = [];
  const mouths = gorgeRoadPaths(map, seed).map((path) => ({ x: path[0]!.x, z: path[0]!.z }));
  const goal = passableNear(map, plaza.x, plaza.y);
  if (goal === null) return { wear, signposts, mouths };
  for (const mouth of mouths) {
    const from = passableNear(map, mouth.x, mouth.z);
    if (from === null) continue;
    const cells = route(map, from, goal);
    // Con hombros: las celdas vecinas, un nivel menos. El suelo promedia el
    // color en cada esquina, y una línea de una celda sola salía a medio
    // contraste y no se leía desde la vista de siempre (captura, 28 sep).
    for (const cell of cells) {
      wear[cell] = Math.max(wear[cell]!, level);
      const x = cell % map.width, z = Math.floor(cell / map.width);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= map.width || nz >= map.height) continue;
        const side = nz * map.width + nx;
        if (stepCost(map, side) === null) continue;
        wear[side] = Math.max(wear[side]!, level - 1);
      }
    }
    if (era === 'hamlet' || cells.length < SIGN_DISTANCE + 2) continue;
    // El cartel, camino afuera desde la plaza, mirando a quien llega: la
    // tablilla cruza el camino y el poste se aparta a un lado.
    const at = cells.length - 1 - SIGN_DISTANCE;
    const here = cells[at]!, next = cells[at + 1]!;
    const hx = here % map.width + 0.5, hz = Math.floor(here / map.width) + 0.5;
    const nx = next % map.width + 0.5, nz = Math.floor(next / map.width) + 0.5;
    const yaw = Math.atan2(nx - hx, nz - hz);
    signposts.push({ x: hx + Math.cos(yaw) * SIGN_ASIDE, z: hz - Math.sin(yaw) * SIGN_ASIDE, yaw });
  }
  return { wear, signposts, mouths };
}

/**
 * Los carteles, provisionales: un poste y una tablilla de madera. El modelo de
 * verdad está pedido a Astra (`docs/encargos/cartel-del-camino.md`); cuando
 * llegue se instancia aquí con el mismo `yaw`.
 */
export function buildSignposts(signs: readonly Signpost[], ground: (x: number, z: number) => number): Group {
  const group = new Group();
  group.name = 'Valley_Signposts';
  if (signs.length === 0) return group;
  const timber = new MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.95, metalness: 0 });
  const board = new MeshStandardMaterial({ color: '#a8845a', roughness: 0.9, metalness: 0 });
  const postShape = new BoxGeometry(0.08, 1.1, 0.08);
  const boardShape = new BoxGeometry(0.56, 0.2, 0.04);
  for (const sign of signs) {
    const y = ground(sign.x, sign.z);
    const post = new Mesh(postShape, timber);
    post.position.set(sign.x, y + 0.55, sign.z);
    post.castShadow = true;
    const plank = new Mesh(boardShape, board);
    plank.position.set(sign.x, y + 0.92, sign.z);
    // La tablilla cruza el camino: quien viene por él la lee de frente.
    plank.rotation.y = sign.yaw;
    plank.castShadow = true;
    group.add(post, plank);
  }
  return group;
}
