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

import { BoxGeometry, type BufferGeometry, Color, Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three';
import { stepCost } from '@engine/world/astar';
import { hash32 } from '@engine/rng';
import type { ValleyMap } from '@engine/state';
import { roadMouths, valleyRoadCells } from '@engine/world/valley-road';
import type { Era } from '@derive/era';

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
/** TUNE visual. Las piedras sueltas de la calzada de la villa: cuántas por celda, y su tamaño en celdas. */
const STONES = { PER_CELL: 0.6, SIZE: 0.14, SPREAD: 0.5 } as const;

export interface Signpost { readonly x: number; readonly z: number; readonly yaw: number }

export interface ValleyRoad {
  /** Nivel de senda por celda (0 nada), para pintar el suelo junto a `map.path`. */
  readonly wear: Uint8Array;
  /** Los carteles, uno por entrada; ninguno en el caserío. */
  readonly signposts: readonly Signpost[];
  /** Las bocas: donde la senda del desfiladero entra en el mapa. */
  readonly mouths: readonly { readonly x: number; readonly z: number }[];
}

export function valleyRoad(
  map: ValleyMap, seed: number, plaza: { readonly x: number; readonly y: number }, era: Era,
): ValleyRoad {
  const wear = new Uint8Array(map.width * map.height);
  const level = ROAD_WEAR[era];
  const signposts: Signpost[] = [];
  const mouths = roadMouths(map, seed).map((mouth) => ({ x: mouth.cell % map.width + 0.5, z: Math.floor(mouth.cell / map.width) + 0.5 }));
  // Las mismas rutas que pisa el motor (`valleyRoadCells`).
  for (const cells of valleyRoadCells(map, seed, plaza)) {
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
 * Las piedras sueltas de la calzada (Vera: «para la villa, piedras sueltas por
 * la calzada, de cerca»): una malla instanciada con la forma de un peñasco de
 * Astra, pequeño, repartidas por las celdas del eje con el hash de la celda.
 * Sólo en la villa; una llamada de dibujo.
 */
export function buildRoadStones(
  road: ValleyRoad, map: ValleyMap, seed: number, shape: BufferGeometry | null,
  ground: (x: number, z: number) => number, colour: string,
): InstancedMesh | null {
  if (shape === null) return null;
  const spots: { x: number; z: number; turn: number; size: number }[] = [];
  for (let cell = 0; cell < road.wear.length; cell += 1) {
    if (road.wear[cell] !== 3) continue;
    const x = cell % map.width, z = Math.floor(cell / map.width);
    const n = Math.floor(STONES.PER_CELL + unit(seed, `stone:${cell}`));
    for (let k = 0; k < n; k += 1) {
      spots.push({
        x: x + 0.5 + (unit(seed, `sx:${cell}:${k}`) - 0.5) * STONES.SPREAD,
        z: z + 0.5 + (unit(seed, `sz:${cell}:${k}`) - 0.5) * STONES.SPREAD,
        turn: unit(seed, `st:${cell}:${k}`) * Math.PI * 2,
        size: STONES.SIZE * (0.6 + unit(seed, `ss:${cell}:${k}`) * 0.8),
      });
    }
  }
  if (spots.length === 0) return null;
  const material = new MeshStandardMaterial({ color: new Color(colour), flatShading: true, roughness: 1, metalness: 0 });
  const mesh = new InstancedMesh(shape, material, spots.length);
  mesh.name = 'Valley_Road_Stones';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const matrix = new Matrix4(), at = new Vector3(), size = new Vector3(), turn = new Quaternion(), up = new Vector3(0, 1, 0);
  spots.forEach((spot, i) => {
    turn.setFromAxisAngle(up, spot.turn);
    at.set(spot.x, ground(spot.x, spot.z) + spot.size * 0.3, spot.z);
    size.setScalar(spot.size);
    matrix.compose(at, turn, size);
    mesh.setMatrixAt(i, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

function unit(seed: number, key: string): number {
  return hash32(seed, key) / 4_294_967_296;
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
