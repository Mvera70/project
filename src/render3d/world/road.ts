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

import { BoxGeometry, type BufferGeometry, Color, Group, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3, type Object3D } from 'three';
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
// TUNE visual. Las piedras de la calzada de la villa, **en grupos como los de
// la orilla de un río** (Vera, 2 oct 2026: «haz grupos más realistas, típicas
// del río, algunas más grandes, otras más pequeñas; cuidado con el
// rendimiento»). En una celda de cada tres o así, un canto grande con tres a
// seis pequeños arrimados; en otras, un guijarro suelto. Cantos rodados,
// anchos y bajos: el peñasco de Astra va de pie y salía una estaca («muy para
// arriba, puntiagudas»). Todo en una malla instanciada: una llamada de dibujo.
//   GROUP / LONE  probabilidad por celda de un grupo y de un guijarro suelto
//   BIG / SMALL   el ancho del canto mayor y de los pequeños, en celdas
//   ARC           el abanico, en radianes, hacia el que se amontonan los demás
//   FLAT          el alto sobre el ancho, de menos a más
//   SUNK          la parte del alto que queda bajo tierra
const STONES = {
  GROUP: 0.34, LONE: 0.28, BIG: [0.2, 0.38], SMALL: [0.06, 0.15], AROUND: [3, 6],
  REACH: [0, 0.22], ARC: 2.4, FLAT: [0.38, 0.6], SUNK: 0.25, TONE: 0.12,
} as const;

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
 * Las piedras de la calzada (Vera: «para la villa, piedras sueltas por la
 * calzada, de cerca»), en grupos de canto rodado (`STONES`). Sólo en la villa,
 * y fuera de `town` (el pueblo: la calle está barrida); una llamada de dibujo.
 */
export function buildRoadStones(
  road: ValleyRoad, map: ValleyMap, seed: number,
  ground: (x: number, z: number) => number, colour: string, town?: ReadonlySet<number>,
): InstancedMesh | null {
  const spots: { x: number; z: number; turn: number; size: number; flat: number; tone: number }[] = [];
  const between = (range: readonly [number, number], key: string): number => range[0] + unit(seed, key) * (range[1] - range[0]);
  const stone = (x: number, z: number, size: number, key: string): void => {
    // Un pequeño que cae fuera del mapa o dentro del pueblo no se pone.
    if (x < 0 || z < 0 || x >= map.width || z >= map.height) return;
    if (town?.has(Math.floor(z) * map.width + Math.floor(x)) === true) return;
    spots.push({
      x, z, size,
      turn: unit(seed, `st:${key}`) * Math.PI * 2,
      flat: between(STONES.FLAT, `sf:${key}`),
      tone: (unit(seed, `sc:${key}`) - 0.5) * 2 * STONES.TONE,
    });
  };
  for (let cell = 0; cell < road.wear.length; cell += 1) {
    if (road.wear[cell] !== 3 || town?.has(cell) === true) continue;
    const cx = cell % map.width + 0.2 + unit(seed, `sx:${cell}`) * 0.6;
    const cz = Math.floor(cell / map.width) + 0.2 + unit(seed, `sz:${cell}`) * 0.6;
    const roll = unit(seed, `stone:${cell}`);
    if (roll < STONES.GROUP) {
      // El canto grande, una mediana y las pequeñas, amontonadas **hacia un
      // lado** y casi tocándose: así deja las piedras el agua. Repartidas en
      // anillo alrededor del grande salía una flor (captura del 2 oct).
      const big = between(STONES.BIG, `sb:${cell}`);
      stone(cx, cz, big, `${cell}`);
      const around = Math.round(between(STONES.AROUND, `sn:${cell}`));
      const lee = unit(seed, `sa:${cell}`) * Math.PI * 2;
      for (let k = 0; k < around; k += 1) {
        // La primera es mediana; las demás, pequeñas.
        const size = k === 0 ? big * (0.45 + unit(seed, `sm:${cell}`) * 0.2) : between(STONES.SMALL, `ss:${cell}:${k}`);
        const angle = lee + (unit(seed, `sj:${cell}:${k}`) - 0.5) * STONES.ARC;
        const reach = (big + size) * 0.42 + between(STONES.REACH, `sr:${cell}:${k}`) * (k === 0 ? 0.2 : 1);
        stone(cx + Math.cos(angle) * reach, cz + Math.sin(angle) * reach, size, `${cell}:${k}`);
      }
    } else if (roll < STONES.GROUP + STONES.LONE) {
      stone(cx, cz, between(STONES.SMALL, `ss:${cell}`) * 1.3, `${cell}:lone`);
    }
  }
  if (spots.length === 0) return null;
  const shape = cobble();
  const material = new MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, metalness: 0 });
  const mesh = new InstancedMesh(shape, material, spots.length);
  mesh.name = 'Valley_Road_Stones';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const base = new Color(colour), tint = new Color();
  const matrix = new Matrix4(), at = new Vector3(), size = new Vector3(), turn = new Quaternion(), up = new Vector3(0, 1, 0);
  spots.forEach((spot, i) => {
    turn.setFromAxisAngle(up, spot.turn);
    // El canto mide 2 de ancho y 2 de alto a escala uno (radio uno).
    const wide = spot.size / 2, high = spot.size * spot.flat / 2;
    // El centro a medio alto sobre el suelo, y hundido una parte de su alto.
    at.set(spot.x, ground(spot.x, spot.z) + spot.size * spot.flat * (0.5 - STONES.SUNK), spot.z);
    size.set(wide, high, wide);
    matrix.compose(at, turn, size);
    mesh.setMatrixAt(i, matrix);
    mesh.setColorAt(i, tint.copy(base).offsetHSL(0, 0, spot.tone));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/**
 * Un canto rodado: un icosaedro de 80 caras con los vértices movidos un poco,
 * siempre lo mismo en el mismo punto para que las caras no se abran. Radio
 * uno, ni más ni menos de ancho: el aplastado lo pone cada piedra.
 */
function cobble(): BufferGeometry {
  const geometry = new IcosahedronGeometry(1, 1);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const key = `${Math.round(x * 1000)}:${Math.round(y * 1000)}:${Math.round(z * 1000)}`;
    const push = 1 + (hash32(7, key) / 4_294_967_296 - 0.5) * 0.16;
    position.setXYZ(i, Math.max(-1, Math.min(1, x * push)), Math.max(-1, Math.min(1, y * push)), Math.max(-1, Math.min(1, z * push)));
  }
  geometry.computeVertexNormals();
  return geometry;
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
export function buildSignposts(signs: readonly Signpost[], ground: (x: number, z: number) => number, model?: Object3D): Group {
  const group = new Group();
  group.name = 'Valley_Signposts';
  if (signs.length === 0) return group;
  const timber = new MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.95, metalness: 0 });
  const board = new MeshStandardMaterial({ color: '#a8845a', roughness: 0.9, metalness: 0 });
  const postShape = new BoxGeometry(0.08, 1.1, 0.08);
  const boardShape = new BoxGeometry(0.56, 0.2, 0.04);
  for (const sign of signs) {
    const y = ground(sign.x, sign.z);
    if (model !== undefined) {
      const instance = model.clone();
      instance.position.set(sign.x, y, sign.z);
      instance.rotation.y = sign.yaw;
      group.add(instance);
      continue;
    }
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
