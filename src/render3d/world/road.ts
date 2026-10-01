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
import type { Building, ValleyMap } from '@engine/state';
import { visibleBuildings } from '@derive/visible-buildings';
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
// TUNE visual: `FLAT` es el alto de una piedra sobre su ancho. El peñasco de
// Astra (`crag-2`) está hecho para ir de pie; escalado igual en los tres ejes
// salía una estaca oscura clavada en la calzada (Vera, 2 oct 2026: «las
// piedras pequeñas están muy para arriba, puntiagudas, muy feas»). Una piedra
// de camino es un canto: ancha, baja y medio hundida.
const STONES = { PER_CELL: 0.6, SIZE: 0.14, SPREAD: 0.5, FLAT: 0.38, FLAT_SPREAD: 0.17, SUNK: 0.25 } as const;

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
 * Sólo en la villa, y fuera de `town` (el pueblo: la calle está barrida); una
 * llamada de dibujo.
 */
export function buildRoadStones(
  road: ValleyRoad, map: ValleyMap, seed: number, shape: BufferGeometry | null,
  ground: (x: number, z: number) => number, colour: string, town?: ReadonlySet<number>,
): InstancedMesh | null {
  if (shape === null) return null;
  const spots: { x: number; z: number; turn: number; size: number; flat: number }[] = [];
  for (let cell = 0; cell < road.wear.length; cell += 1) {
    if (road.wear[cell] !== 3 || town?.has(cell) === true) continue;
    const x = cell % map.width, z = Math.floor(cell / map.width);
    const n = Math.floor(STONES.PER_CELL + unit(seed, `stone:${cell}`));
    for (let k = 0; k < n; k += 1) {
      spots.push({
        x: x + 0.5 + (unit(seed, `sx:${cell}:${k}`) - 0.5) * STONES.SPREAD,
        z: z + 0.5 + (unit(seed, `sz:${cell}:${k}`) - 0.5) * STONES.SPREAD,
        turn: unit(seed, `st:${cell}:${k}`) * Math.PI * 2,
        size: STONES.SIZE * (0.6 + unit(seed, `ss:${cell}:${k}`) * 0.8),
        flat: STONES.FLAT + unit(seed, `sf:${cell}:${k}`) * STONES.FLAT_SPREAD,
      });
    }
  }
  if (spots.length === 0) return null;
  const material = new MeshStandardMaterial({ color: new Color(colour), flatShading: true, roughness: 1, metalness: 0 });
  const mesh = new InstancedMesh(shape, material, spots.length);
  mesh.name = 'Valley_Road_Stones';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  // La forma se mide una vez: la planta da el ancho y el alto se pone aparte,
  // así que el canto sale igual de bajo lo alto que sea el modelo.
  shape.computeBoundingBox();
  const box = shape.boundingBox!;
  const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) || 1;
  const tall = box.max.y - box.min.y || 1;
  const matrix = new Matrix4(), at = new Vector3(), size = new Vector3(), turn = new Quaternion(), up = new Vector3(0, 1, 0);
  spots.forEach((spot, i) => {
    turn.setFromAxisAngle(up, spot.turn);
    const wide = spot.size / span, high = spot.size * spot.flat / tall;
    // El pie del modelo a ras de suelo, y hundido una parte de su alto.
    at.set(spot.x, ground(spot.x, spot.z) - box.min.y * high - spot.size * spot.flat * STONES.SUNK, spot.z);
    size.set(wide, high, wide);
    matrix.compose(at, turn, size);
    mesh.setMatrixAt(i, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/** Cuánto se aparta del pueblo la calzada con piedras, en celdas. TUNE visual. */
const TOWN_MARGIN = 3;

/**
 * El pueblo, para la calzada: las celdas a `TOWN_MARGIN` o menos de algo
 * construido, y la plaza con ese mismo margen.
 */
export function townCells(
  state: { readonly buildings: readonly Building[]; readonly map: ValleyMap },
  plaza: { readonly x: number; readonly y: number; readonly radius: number },
): Set<number> {
  const { map } = state;
  const town = new Set<number>();
  const mark = (cx: number, cz: number): void => {
    for (let z = Math.max(0, cz - TOWN_MARGIN); z <= Math.min(map.height - 1, cz + TOWN_MARGIN); z += 1) {
      for (let x = Math.max(0, cx - TOWN_MARGIN); x <= Math.min(map.width - 1, cx + TOWN_MARGIN); x += 1) town.add(z * map.width + x);
    }
  };
  for (const building of visibleBuildings(state)) {
    for (let row = 0; row < building.h; row += 1) {
      for (let column = 0; column < building.w; column += 1) mark(building.x + column, building.y + row);
    }
  }
  const reach = plaza.radius + TOWN_MARGIN;
  for (let z = Math.max(0, Math.floor(plaza.y - reach)); z <= Math.min(map.height - 1, Math.ceil(plaza.y + reach)); z += 1) {
    for (let x = Math.max(0, Math.floor(plaza.x - reach)); x <= Math.min(map.width - 1, Math.ceil(plaza.x + reach)); x += 1) {
      if (Math.hypot(x + 0.5 - plaza.x, z + 0.5 - plaza.y) <= reach) town.add(z * map.width + x);
    }
  }
  return town;
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
