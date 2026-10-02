// La montaña facetada. 26 sep 2026.
//
// Vera: «rellenar con estilo lo vacío que se ve el valle en cuanto nos salimos
// del centro; las montañas tienen una textura muy mejorable, no hay rocas ni
// nada que aporte profundidad». Eligió el aspecto **facetado low-poly** —caras
// planas con luz dura, como los árboles, las casas y los animales— frente a
// suavizar lo que había.
//
// Aquí vive lo que comparten la sierra de fuera (`ridge.ts`) y el cinturón de
// montaña de dentro del mapa (la piel de `buildMountainSkin`):
//
//   · **el color**, por la altura y la pendiente de cada punto, fundido de
//     vértice a vértice (la forma es facetada, el color no): prado en lo bajo
//     y suave, pedrera al pie, roca en franjas a media ladera, acantilado oscuro
//     en lo empinado y nieve en las cumbres, que baja con el invierno;
//   · **la piel facetada** de las celdas de montaña del mapa, a la cota del
//     suelo y un pelo por encima, para que el cinturón no sea la mancha gris
//     lisa que era: el suelo es una sola malla suave con el pueblo encima, y
//     facetarla entera habría tocado el prado;
//   · **los peñascos**: rocas facetadas de un puñado de formas, instanciadas.
//
// Decorado puro: no toca el motor, ni una celda, ni un byte del guardado. Todo
// sale del mapa y de un hash, así que el mismo valle da siempre la misma sierra.

import {
  BoxGeometry, BufferAttribute, BufferGeometry, Color, DodecahedronGeometry, DoubleSide, DynamicDrawUsage, Euler, Group, InstancedMesh,
  Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3, type Object3D,
} from 'three';
import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type ValleyMap } from '@engine/state';
import { roadMouths } from '@engine/world/valley-road';
import type { Palette } from '@derive/palette';
import { GROUND_BIAS } from '../visual-config';
import { elevationAt, groundColourAt, groundSurfaceAt, skinnedCell, underSkin } from './ground';
import { riverBend, riverMouthCentre } from './river-extension';
import { valleyAxis } from './valley-profile';

/** Lo alto que llega la sierra de fuera, en celdas (`ridge.ts`): la escala de las franjas. */
export const MOUNTAIN_PEAK = 19;

const unit = (seed: number, what: string): number => hash32(seed, what) / 4_294_967_296;

/**
 * El color de una cara de montaña.
 *
 * `rise` es su altura sobre el prado, en celdas; `up`, cuánto mira al cielo (la
 * componente vertical de su normal: 1 es llano, 0 es pared); `snow`, de 0 a 1,
 * lo que el invierno ha cubierto. TUNE: los cortes están elegidos mirando la
 * sierra en capturas panorámicas del valle (semillas 11 y 23), no medidos.
 */
export function faceColour(out: Color, palette: Palette, rise: number, up: number, x: number, z: number, snow: number): Color {
  // Un ruido suave, no uno por cara: el color se funde de vértice a vértice
  // (Vera, 26 sep 2026: «que un color se degrade con el otro», como el resto
  // del terreno) y un salto por punto lo habría vuelto moteado.
  const jitter = 0.5 * Math.sin(x * 0.37 + z * 0.21) * Math.cos(z * 0.29 - x * 0.13)
    + 0.25 * Math.sin(x * 1.1 - z * 0.8);
  // La nieve: arriba y en lo que no es pared. La cota baja con el invierno.
  // Proporcional a lo que llega la cresta (hasta 1,8 veces `MOUNTAIN_PEAK`):
  // con 0,74 veces la primera captura salió la sierra entera blanca en verano.
  const snowline = MOUNTAIN_PEAK * (1.35 - 0.6 * snow) + jitter * 1.6;
  if (rise > snowline && up > 0.45) {
    out.set('#eef1f0').offsetHSL(0, 0, jitter * 0.04);
    return out;
  }
  if (up < 0.6) {
    // Acantilado: la piedra de la montaña, algo más oscura. TUNE: −0,05; con
    // −0,12 las paredes de la garganta, que además miran lejos del sol, salían
    // casi negras (captura del 26 sep).
    out.set(palette.stone).offsetHSL(0, -0.04, -0.05 + jitter * 0.05);
    return out;
  }
  if (rise < 0.9 && up > 0.92) {
    // El pie verde: el prado del suelo, oscureciéndose al subir. Con dos tonos
    // alternos por cara el cinturón parecía confeti, y con el listón en 1,6 y
    // 0,8 salían dientes verdes clavados en la roca (capturas del 26 sep): sólo
    // lo bajo **y** llano es prado.
    // Y apagado hacia la pedrera: el verde del prado, suelto entre la roca,
    // se leía como motas chillonas al pie de las laderas.
    out.set(palette.meadowAlt).lerp(new Color(palette.rock), 0.2 + Math.min(1, rise / 0.9) * 0.25).offsetHSL(0, 0, jitter * 0.025);
    return out;
  }
  if (rise < 4 && up < 0.85) {
    // La pedrera del pie: la roca suelta, más clara.
    out.set(palette.rock).offsetHSL(0, -0.02, 0.03 + jitter * 0.05);
    return out;
  }
  // La roca en franjas: tres tonos que se turnan con la altura, con la frontera
  // movida por el ruido para que no sean rayas de regla.
  // Ondulan con la altura en vez de saltar, para que se fundan entre sí.
  const band = Math.sin((rise + jitter * 1.4) * 1.1);
  out.set(palette.stone).offsetHSL(0, -0.02, 0.04 + band * 0.05 + jitter * 0.04);
  // Y en las repisas suaves de media ladera, un poco de hierba.
  if (up > 0.95 && rise < MOUNTAIN_PEAK * 0.45) out.lerp(new Color(palette.meadowAlt), 0.3);
  return out;
}

/**
 * Pinta una malla sin índices **fundiendo** el color de vértice a vértice.
 *
 * La forma sigue facetada —la luz dura la da `flatShading`—, pero el color no:
 * cada punto toma el de su altura y de su pendiente **media**, la de todas las
 * caras que lo comparten, así que dos caras vecinas llevan el mismo color en
 * su arista y el tono pasa de una a otra en degradado. Con un color por cara
 * cada arista era un corte (Vera, 26 sep 2026: «no hacemos triángulos que
 * cambien de color en cada borde; lo texturizamos y un color se degrada con
 * el otro»). `riseOf` dice la altura de un punto sobre el prado; `keep` deja
 * un punto como está.
 */
export function paintFacets(
  geometry: BufferGeometry, palette: Palette, snow: number,
  riseOf: (y: number) => number, keep?: (x: number, z: number, rise: number, up: number) => boolean,
): void {
  const position = geometry.getAttribute('position') as BufferAttribute;
  const colour = geometry.getAttribute('color') as BufferAttribute;
  const ups = sharedUps(geometry);
  const tint = new Color();
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i), z = position.getZ(i);
    const rise = riseOf(position.getY(i));
    if (keep?.(x, z, rise, ups[i]!) === true) continue;
    faceColour(tint, palette, rise, ups[i]!, x, z, snow);
    colour.setXYZ(i, tint.r, tint.g, tint.b);
  }
  colour.needsUpdate = true;
}

/**
 * Cuánto mira al cielo cada vértice, promediado entre todas las caras que lo
 * comparten. En una malla sin índices el mismo punto está repetido una vez por
 * cara; se juntan por su posición.
 */
export function sharedUps(geometry: BufferGeometry): Float32Array {
  const position = geometry.getAttribute('position') as BufferAttribute;
  const normal = geometry.getAttribute('normal') as BufferAttribute;
  const key = (i: number): string => `${Math.round(position.getX(i) * 256)}:${Math.round(position.getZ(i) * 256)}`;
  const sums = new Map<string, [number, number]>();
  for (let i = 0; i < position.count; i += 1) {
    const k = key(i);
    const sum = sums.get(k) ?? [0, 0];
    sum[0] += normal.getY(i);
    sum[1] += 1;
    sums.set(k, sum);
  }
  const ups = new Float32Array(position.count);
  for (let i = 0; i < position.count; i += 1) {
    const [total, n] = sums.get(key(i))!;
    ups[i] = total / n;
  }
  return ups;
}

/** Cuánto por encima del suelo va la piel, para no pelearse con él. */
const SKIN_LIFT = 0.012;
/** Hasta qué altura la piel lleva el color del suelo que tapa, en celdas. */
const SKIN_OWN = 1.6;

/** Envolvente visible: suelo desplazado y piel con sus diagonales alternas.
 * El agua debe apoyarse sobre ambas mallas, no sólo sobre la altura bilineal.
 */
export function mountainSurfaceAt(map: ValleyMap, x: number, z: number): number {
  const floor = groundSurfaceAt(map, x, z);
  const col = Math.floor(x), row = Math.floor(z);
  if (col < 0 || row < 0 || col >= map.width || row >= map.height
    || map.terrain[row * map.width + col] !== TERRAIN_CODE.mountain) return floor;
  if (!skinnedCell(map, col, row)) return floor;
  const a = elevationAt(map, col, row), b = elevationAt(map, col + 1, row);
  const c = elevationAt(map, col, row + 1), d = elevationAt(map, col + 1, row + 1);
  const u = x - col, v = z - row;
  const skin = (col + row) % 2 === 0
    ? (u + v <= 1 ? a + (b - a) * u + (c - a) * v
      : d + (c - d) * (1 - u) + (b - d) * (1 - v))
    : (u >= v ? a + (b - a) * u + (d - b) * v
      : a + (d - c) * u + (c - a) * v);
  // Con las cuatro esquinas hundidas (`underSkin`) el suelo no se ve: lo que
  // se pisa es la piel, aunque el suelo sin hundir quedara por encima.
  const buried = underSkin(map, col, row) && underSkin(map, col + 1, row)
    && underSkin(map, col, row + 1) && underSkin(map, col + 1, row + 1);
  return buried ? skin + SKIN_LIFT : Math.max(floor, skin + SKIN_LIFT);
}

export interface MountainSkin {
  readonly mesh: Mesh;
  season(palette: Palette, snow: number): void;
  dispose(): void;
}

/** La piel facetada de las celdas de montaña del mapa, a la cota del suelo. */
export function buildMountainSkin(map: ValleyMap, palette: Palette, snow = 0): MountainSkin | null {
  const points: number[] = [];
  for (let z = 0; z < map.height; z += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (!skinnedCell(map, x, z)) continue;
      const a = elevationAt(map, x, z), b = elevationAt(map, x + 1, z);
      const c = elevationAt(map, x, z + 1), d = elevationAt(map, x + 1, z + 1);
      const lift = GROUND_BIAS + SKIN_LIFT;
      // La diagonal alterna por celda, que es lo que da el facetado irregular.
      if ((x + z) % 2 === 0) {
        points.push(x, a + lift, z, x, c + lift, z + 1, x + 1, b + lift, z, x + 1, b + lift, z, x, c + lift, z + 1, x + 1, d + lift, z + 1);
      } else {
        points.push(x, a + lift, z, x + 1, d + lift, z + 1, x + 1, b + lift, z, x, a + lift, z, x, c + lift, z + 1, x + 1, d + lift, z + 1);
      }
    }
  }
  if (points.length === 0) return null;
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(points), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(points.length), 3));
  geometry.computeVertexNormals();
  const material = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1, metalness: 0 });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'Valley_Mountain_Skin';
  mesh.receiveShadow = true;
  const paint = (next: Palette, cover: number): void => {
    paintFacets(geometry, next, cover, (y) => y - GROUND_BIAS);
    // El pie de la piel toma el color del suelo que tapa: con el prado de
    // `faceColour` salían triángulos verdes sueltos sobre la piedra del
    // cinturón (captura del flanco oeste, semilla 11).
    // Fundido, como el resto: cuanto más bajo y más llano el punto, más color
    // del suelo, y en la arista con el prado, todo.
    const position = geometry.getAttribute('position') as BufferAttribute;
    const colour = geometry.getAttribute('color') as BufferAttribute;
    const ups = sharedUps(geometry);
    const tint = new Color();
    const ground = new Color();
    for (let i = 0; i < position.count; i += 1) {
      const y = position.getY(i) - GROUND_BIAS;
      const low = Math.max(0, Math.min(1, (SKIN_OWN - y) / SKIN_OWN));
      const flat = Math.max(0, Math.min(1, (ups[i]! - 0.7) / 0.25));
      const weight = low * low * (0.35 + 0.65 * flat);
      if (weight <= 0) continue;
      tint.setRGB(colour.getX(i), colour.getY(i), colour.getZ(i));
      ground.copy(groundColourAt(map, position.getX(i), position.getZ(i), next));
      tint.lerp(ground, weight);
      colour.setXYZ(i, tint.r, tint.g, tint.b);
    }
    colour.needsUpdate = true;
  };
  paint(palette, snow);
  return {
    mesh,
    season: paint,
    dispose(): void { geometry.dispose(); material.dispose(); },
  };
}

// --- los peñascos ------------------------------------------------------------

/** Cuántas formas de roca distintas: bastan para que no se repita la misma a la vista. */
const SHAPES = 5;

/** Una roca facetada: un icosaedro con los vértices movidos, aplastado. */
/** Desde qué altura (de 1) se aplasta la cima de una roca. */
const ROCK_CROWN = 0.5;

function rockShape(seed: number): BufferGeometry {
  // Un dodecaedro y no un icosaedro: más redondo y sin un vértice solo en lo
  // alto, que con el empuje salía en punta (Vera, 26 sep 2026: «algunas son
  // demasiado puntiagudas»). Treinta y seis triángulos, contra veinte.
  const base = new DodecahedronGeometry(1, 0);
  const position = base.getAttribute('position') as BufferAttribute;
  // Los vértices del icosaedro vienen repetidos por cara: se mueven igual los
  // que están en el mismo sitio, o la roca se abre.
  const moved = new Map<string, Vector3>();
  for (let i = 0; i < position.count; i += 1) {
    const key = `${position.getX(i).toFixed(4)},${position.getY(i).toFixed(4)},${position.getZ(i).toFixed(4)}`;
    let to = moved.get(key);
    if (to === undefined) {
      const k = moved.size;
      // TUNE visual: de 0,88 a 1,08. Con 0,72 a 1,22 un vértice podía salir
      // casi el doble que su vecino, y eso es una aguja.
      const push = 0.88 + unit(seed * 97 + k, 'rock:push') * 0.2;
      to = new Vector3(position.getX(i), position.getY(i), position.getZ(i)).multiplyScalar(push);
      moved.set(key, to);
    }
    // Y la cima rebajada: lo que pasa de 0,5 se aplasta, como una roca gastada.
    const y = to.y > ROCK_CROWN ? ROCK_CROWN + (to.y - ROCK_CROWN) * 0.35 : to.y;
    position.setXYZ(i, to.x, y * 0.62, to.z);
  }
  base.translate(0, 0.25, 0);
  base.computeVertexNormals();
  return base;
}

export interface Crag { x: number; y: number; z: number; size: number; turn: number; tilt: number; shade: number }

export interface Crags {
  readonly group: Group;
  readonly count: number;
  season(palette: Palette): void;
  dispose(): void;
}

/**
 * Los modelos de roca de Astra (27 sep 2026): cinco peñascos y el mojón. Sin
 * ellos, las formas de aquí (`rockShape`) hacen de respaldo.
 */
export interface RockModels {
  /** Las geometrías de los peñascos, ya en el sistema de su raíz. Son nuestras: se liberan con los peñascos. */
  readonly crags: readonly BufferGeometry[];
  readonly cairn?: Object3D | undefined;
}

/** La geometría de la primera malla de un modelo, llevada al sistema de su raíz. */
export function rockGeometry(model: Object3D | undefined): BufferGeometry | null {
  if (model === undefined) return null;
  model.updateMatrixWorld(true);
  const root = new Matrix4().copy(model.matrixWorld).invert();
  let found: BufferGeometry | null = null;
  model.traverse((object) => {
    const mesh = object as Mesh;
    if (found !== null || mesh.isMesh !== true) return;
    found = mesh.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(root, mesh.matrixWorld));
  });
  return found;
}

/**
 * Lo que se escala un peñasco de Astra para que ocupe lo mismo que la forma de
 * respaldo: aquélla mide dos de ancho a escala uno (radio uno), el modelo, una.
 */
const MODEL_CRAG = 2;

/** Los peñascos, instanciados por forma: unos pocos objetos para cientos de rocas. */
export function buildCrags(crags: readonly Crag[], palette: Palette, models: readonly BufferGeometry[] = []): Crags {
  const group = new Group();
  group.name = 'Valley_Crags';
  const material = new MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, metalness: 0 });
  const modelled = models.length > 0;
  const shapes = modelled ? [...models] : Array.from({ length: SHAPES }, (_, n) => rockShape(n + 1));
  const grow = modelled ? MODEL_CRAG : 1;
  const matrix = new Matrix4();
  const at = new Vector3();
  const turn = new Quaternion();
  const size = new Vector3();
  const meshes: InstancedMesh[] = [];
  const tint = new Color();
  const buckets = shapes.map(() => [] as Crag[]);
  crags.forEach((crag, n) => buckets[n % shapes.length]!.push(crag));
  shapes.forEach((shape, n) => {
    const list = buckets[n]!;
    if (list.length === 0) return;
    const mesh = new InstancedMesh(shape, material, list.length);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    list.forEach((crag, k) => {
      at.set(crag.x, crag.y, crag.z);
      turn.setFromEuler(new Euler(crag.tilt, crag.turn, crag.tilt * 0.5));
      size.set(crag.size * grow, crag.size * grow, crag.size * grow * (0.8 + (k % 3) * 0.15));
      matrix.compose(at, turn, size);
      mesh.setMatrixAt(k, matrix);
    });
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    meshes.push(mesh);
    group.add(mesh);
  });
  const paint = (next: Palette): void => {
    meshes.forEach((mesh, n) => {
      buckets[n]!.forEach((crag, k) => {
        tint.set(next.stone).lerp(new Color(next.rock), 0.35).offsetHSL(0, -0.02, crag.shade);
        mesh.setColorAt(k, tint);
      });
      if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
    });
  };
  paint(palette);
  return {
    group,
    count: crags.length,
    season: paint,
    dispose(): void {
      for (const mesh of meshes) mesh.dispose();
      for (const shape of shapes) shape.dispose();
      material.dispose();
    },
  };
}

/**
 * Dónde van los peñascos: en grupos, más en lo empinado y a media ladera, nunca
 * en el agua ni en la nieve. `heightAt` da la cota del suelo en un punto, y
 * `inside` descarta lo que no se puede tapar (celdas jugables que no son montaña).
 */
export function placeCrags(
  seed: number, from: { x0: number; x1: number; z0: number; z1: number }, step: number,
  heightAt: (x: number, z: number) => number, skip: (x: number, z: number) => boolean, most: number,
): Crag[] {
  const out: Crag[] = [];
  for (let z = from.z0; z < from.z1; z += step) {
    for (let x = from.x0; x < from.x1; x += step) {
      if (skip(x, z)) continue;
      const h = heightAt(x, z);
      const dx = heightAt(x + 0.5, z) - heightAt(x - 0.5, z);
      const dz = heightAt(x, z + 0.5) - heightAt(x, z - 0.5);
      const steep = Math.hypot(dx, dz);
      if (h < 0.4 || h > MOUNTAIN_PEAK * 0.7) continue;
      // Grupos: una rejilla gruesa decide si esta zona tiene pedregal.
      const group = unit(seed, `crag:g:${Math.floor(x / 9)}:${Math.floor(z / 9)}`);
      const chance = (group > 0.45 ? 0.5 : 0.08) * Math.min(1, 0.35 + steep * 0.8);
      if (unit(seed, `crag:${x}:${z}`) > chance) continue;
      const big = steep > 0.9 && unit(seed, `crag:b:${x}:${z}`) > 0.7;
      const px = x + (unit(seed, `crag:x:${x}:${z}`) - 0.5) * step * 0.8;
      const pz = z + (unit(seed, `crag:z:${x}:${z}`) - 0.5) * step * 0.8;
      out.push({
        x: px, z: pz, y: heightAt(px, pz) - 0.08,
        // TUNE: los grandes, de 0,6 a 1,3 celdas; con hasta 2,3 tapaban la ladera.
        size: big ? 0.6 + unit(seed, `crag:s:${x}:${z}`) * 0.7 : 0.15 + unit(seed, `crag:s:${x}:${z}`) * 0.4,
        turn: unit(seed, `crag:t:${x}:${z}`) * Math.PI * 2,
        tilt: (unit(seed, `crag:l:${x}:${z}`) - 0.5) * 0.5,
        shade: (unit(seed, `crag:c:${x}:${z}`) - 0.5) * 0.12,
      });
      if (out.length >= most) return out;
    }
  }
  return out;
}

// --- los mojones de las entradas ------------------------------------------

/**
 * Un mojón de piedra en cada entrada del valle (Vera eligió la garganta «con un
 * mojón a la entrada»): cuatro piedras apiladas, de mayor a menor, en la orilla
 * del río **justo fuera del mapa**, en el suelo de la garganta. Fuera, porque
 * el decorado se arma sólo con el mapa y dentro una casa podría acabar
 * levantándose encima; la garganta no se construye nunca.
 */
export function buildCairns(
  map: ValleyMap, palette: Palette, heightAt: (x: number, z: number) => number,
  wet: (x: number, z: number) => boolean, axis: (z: number) => number, model?: Object3D,
): Group {
  const group = new Group();
  group.name = 'Valley_Cairns';
  const stone = new MeshStandardMaterial({ color: palette.stone, flatShading: true, roughness: 1 });
  const shape = rockShape(7);
  for (const z of [-1.5, map.height + 1.5]) {
    let spot: { x: number; z: number } | null = null;
    // Más lejos del eje si la orilla está mojada: con sólo hasta tres celdas,
    // la semilla 7 se quedaba sin mojón en una entrada.
    for (const off of [2.2, -2.2, 3, -3, 1.6, -1.6, 4, -4, 5, -5]) {
      const x = axis(z) + off;
      if (!wet(x, z)) { spot = { x, z }; break; }
    }
    if (spot === null) continue;
    const cairn = new Group();
    let y = heightAt(spot.x, spot.z) + GROUND_BIAS;
    if (model !== undefined) {
      // El mojón de Astra: cuatro piedras de 0,7 celdas de alto.
      const piece = model.clone();
      piece.position.set(0, y, 0);
      piece.rotation.y = spot.z < 0 ? 0.4 : 2.2;
      cairn.add(piece);
      cairn.position.set(spot.x, 0, spot.z);
      group.add(cairn);
      continue;
    }
    for (const [n, size] of [0.22, 0.18, 0.14, 0.1].entries()) {
      const piece = new Mesh(shape, stone);
      piece.scale.set(size, size * 0.8, size);
      piece.rotation.y = n * 1.3;
      piece.position.set((n % 2) * 0.02, y, 0);
      y += size * 0.62;
      cairn.add(piece);
    }
    cairn.position.set(spot.x, 0, spot.z);
    group.add(cairn);
  }
  group.userData.dispose = (): void => { shape.dispose(); stone.dispose(); };
  return group;
}

// --- el camino que sale ------------------------------------------------------

/**
 * La senda de tierra que se va del valle por cada garganta (Vera la eligió con
 * ella: «un camino que sale»). Arranca en la **boca**, donde empieza el camino
 * pintado del valle (`road.ts`), baja por la orilla de la garganta, sale del
 * mapa y sigue el río hasta perderse en la sierra: una cinta de tierra del
 * color de los caminos del pueblo, que se afina y se funde al irse.
 *
 * **Y pegada al suelo que se dibuja** (2 oct 2026). Vera: «el camino sigue
 * flotando… no sé cómo llegan las visitas al valle». Medido en ocho semillas
 * (`tools/reports/gorge-road-report.ts`): el 76 % de los vértices de la cinta
 * iba más de 0,35 celdas por encima de la malla que se ve, el peor a 30. Tres
 * causas, de menos a más honda: la cota salía de la fórmula de la sierra y no
 * de su malla; una rampa que sólo subía levantaba decenas de celdas de calzada
 * cuando una muestra rozaba un cortado; y fuera del mapa el cañón iba recto
 * mientras el río se curvaba, así que la senda no cabía en el fondo y trepaba
 * por la pared. Ahora el cañón sigue al río (`canyonX`, `ridge.ts`), la senda
 * va por la orilla a una distancia fija del agua, y cada vértice de la cinta
 * se apoya en lo que se dibuja (`surface`): ni plataformas ni rampas.
 *
 * Para el motor es decorado: no es un camino de la partida. Pero **es por
 * donde entran los de fuera** (`life/visitors.ts`): bajan por ella hasta la
 * boca y de ahí siguen por el camino pintado.
 */
export interface GorgeRoads {
  mesh: Mesh;
  /** Los puentes: donde la senda cruza una cascada, unas tablas por encima del agua. */
  bridges: Group;
  season(palette: Palette): void;
  dispose(): void;
}

/**
 * El puente de la garganta, en celdas: tablas, barandas, lo que el tablero se
 * despega de lo que salva (`over`) y la flecha del arco entre estribos, la
 * mínima y la máxima (`arch`, `archMax`). TUNE visual, en capturas del 2 oct
 * 2026: con la flecha fija de 0,3 y sólo donde hacía falta, el tablero copiaba
 * los baches.
 */
const BRIDGE = { deck: 0.05, over: 0.12, arch: 0.12, archMax: 0.6, rail: 0.14, post: 0.04, timber: '#6b4a2e', planks: '#8f6b45' } as const;

/** Hasta dónde se aleja por fuera del mapa, en celdas. TUNE visual. */
const ROAD_OUT = 42;
/** Hasta dónde entra si el valle no tiene boca por ese extremo, en celdas. */
const ROAD_IN = 14;
/** Ancho de la senda, en celdas. TUNE visual. */
const ROAD_WIDTH = 0.6;
/**
 * Lo lejos del agua que va el eje de la senda, en celdas. TUNE visual: la
 * orilla de la garganta es de dos celdas (el mapa), y la de fuera ya es ladera
 * —su esquina promedia la subida de la montaña—, así que la senda va por la
 * celda pegada al agua (capturas del 2 oct 2026).
 */
const ROAD_BANK = 0.9;
/** El paso de muestreo de la senda; cuántas muestras a cada lado promedia el suavizado del trazado, y cuántas veces. */
const ROAD_STEP = 0.5;
const ROAD_SMOOTH = 2;
const ROAD_PASSES = 24;
/**
 * Lo que se aparta del agua el borde de la cinta, como poco; lo que se aparta
 * de la roca; hasta dónde puede alejarse del agua el eje, en celdas; y cuánto
 * tira cada muestra de vuelta a su sitio al suavizar (de 0 a 1). TUNE visual.
 */
const ROAD_CLEAR = 0.1;
const ROAD_ROCK = 0.5;
const ROAD_SPREAD = 2;
const ROAD_PULL = 0.3;
/**
 * Cuántas filas antes de la boca puede dejar la orilla para ir a ella. En 31
 * de 80 gargantas (40 semillas) la boca del motor queda a más de una celda y
 * media de la orilla —la orilla de la garganta la cortan filas de marisma, que
 * el A* del motor no pisa—, y la senda tiene que cruzar hasta ella.
 */
const ROAD_TURN = 8;
/** Lo que pesa subir en el cruce hasta la boca: cada celda de cota cuenta como tantas de camino. TUNE. */
const ROAD_CLIMB = 4;

export interface RoadPoint { readonly x: number; readonly z: number }

/**
 * El trazado de cada senda, **de la boca hacia fuera**: el primer punto es el
 * centro de la celda donde empieza el camino pintado, el último el extremo que
 * se pierde en la sierra. Trazado único: la cinta, los pinos, el bosque y
 * quien anda por ella sacan el mismo.
 */
export function gorgeRoadPaths(map: ValleyMap, seed: number): RoadPoint[][] {
  const paths: RoadPoint[][] = [];
  const mouths = roadMouths(map, seed);
  for (const end of [0, 1] as const) {
    const mouth = mouths.find((one) => one.end === end) ?? null;
    const side: 1 | -1 = mouth?.side ?? (unit(seed, `road:${end}`) > 0.5 ? 1 : -1);
    const centre = riverMouthCentre(map, end);
    if (centre === null) continue;
    const half = riverHalfWidth(map, end === 0 ? 0 : map.height - 1);
    // «Hacia dentro», en celdas desde el borde: negativo, fuera del mapa.
    const zAt = (inward: number): number => (end === 0 ? inward : map.height - inward);
    // Por dónde puede ir en cada muestra, a lo ancho: fuera, de la orilla del
    // cauce que sigue la curva del río; dentro, de la orilla de cada fila, sin
    // pisar el agua ni subirse a la roca. En el borde las dos son la misma.
    const bandAt = (inward: number): Band => {
      const z = zAt(inward);
      if (inward <= 0) return bankBand(centre + riverBend(map, seed, z) + side * half, side, ROAD_SPREAD);
      return rowBand(map, z, side);
    };
    const bankAt = (inward: number): RoadPoint => ({ x: bandAt(inward).aim, z: zAt(inward) });
    // Hasta la boca: la orilla mientras se pueda, y el cruce de menos roca hasta
    // ella. Sin boca, la orilla hasta `ROAD_IN` celdas.
    const turn = mouth === null ? null : turnToMouth(map, mouth.cell, end, bankAt);
    const reach = turn === null ? ROAD_IN : turn.from;
    const samples: Sample[] = [];
    if (turn !== null) {
      // El cruce, cada media celda, con medio paso de holgura para redondear.
      for (const point of resampled([...turn.cells, bankAt(reach)]).slice(0, -1)) {
        samples.push({ x: point.x, z: point.z, lo: point.x - 0.45, hi: point.x + 0.45, aim: point.x });
      }
    }
    // Las muestras de la orilla, a un cuarto de celda de la frontera entre
    // filas: así cada una cae en una sola fila. En la frontera misma, la banda
    // era lo que valía para las dos, y donde el río salta una celda eso eran
    // dos décimas pegadas a la roca de una de ellas (semilla 19, fila 4).
    const first = Math.floor(reach - 0.25) + 0.25;
    for (let inward = first; inward >= -ROAD_OUT; inward -= ROAD_STEP) {
      const band = bandAt(inward);
      samples.push({ x: band.aim, z: zAt(inward), lo: band.lo, hi: band.hi, aim: band.aim });
    }
    // La boca no se mueve: ahí empalma el camino pintado.
    samples[0] = { ...samples[0]!, lo: samples[0]!.x, hi: samples[0]!.x, aim: samples[0]!.x };
    paths.push(settled(samples));
  }
  return paths;
}

/** Una muestra del trazado y lo que puede moverse a lo ancho (`x` de mundo). */
interface Sample { x: number; readonly z: number; readonly lo: number; readonly hi: number; readonly aim: number }
interface Band { readonly lo: number; readonly hi: number; readonly aim: number }

/**
 * Lo que la senda puede apartarse de la orilla, más allá de su medio ancho y
 * un margen: desde la orilla del agua hasta `ROAD_SPREAD` celdas más allá.
 * Apunta a `ROAD_BANK` del agua.
 */
function bankBand(edge: number, side: 1 | -1, room: number): Band {
  const near = ROAD_WIDTH / 2 + ROAD_CLEAR;
  // Del lado de la roca, más margen: la esquina que toca una celda de montaña
  // promedia su subida, y la mitad de fuera de la orilla ya es ladera (semilla
  // 11, tras el puente: la senda iba a 0,64 por la mitad de fuera).
  const far = Math.max(near, Math.min(room, ROAD_SPREAD) - ROAD_WIDTH / 2 - ROAD_ROCK);
  const aim = Math.max(near, Math.min(far, ROAD_BANK));
  const a = edge + side * near, b = edge + side * far;
  return { lo: Math.min(a, b), hi: Math.max(a, b), aim: edge + side * aim };
}

/**
 * La banda de una muestra dentro del mapa: la orilla de la fila —donde acaba
 * el agua y cuántas celdas secas siguen antes de la roca—, y a menos de un
 * cuarto de celda del borde entre dos filas, lo que valga para las dos.
 * **Por filas y no por el eje**: el río de la garganta salta una celda de una
 * fila a la siguiente, y con el eje promediado la cinta pisaba el agua en el
 * salto (semilla 7, fila 6).
 */
function rowBand(map: ValleyMap, z: number, side: 1 | -1): Band {
  let lo = -Infinity, hi = Infinity, aim = 0, rows = 0;
  for (let row = Math.floor(z - 0.24); row <= Math.floor(z + 0.24); row += 1) {
    const r = Math.max(0, Math.min(map.height - 1, row));
    const { edge, room } = rowBank(map, r, side);
    const band = bankBand(edge, side, room);
    lo = Math.max(lo, band.lo);
    hi = Math.min(hi, band.hi);
    aim += band.aim;
    rows += 1;
  }
  // Si las dos filas no dejan sitio, manda no pisar el agua.
  if (hi < lo) {
    if (side > 0) hi = lo;
    else lo = hi;
  }
  return { lo, hi, aim: Math.max(lo, Math.min(hi, aim / rows)) };
}

/** Dónde acaba el agua de una fila por ese lado, y cuántas celdas secas siguen antes de la roca (hasta tres). */
function rowBank(map: ValleyMap, row: number, side: 1 | -1): { edge: number; room: number } {
  const axis = valleyAxis(map, row);
  let first = Infinity, last = -Infinity;
  for (let x = Math.floor(axis - 5); x <= Math.ceil(axis + 5); x += 1) {
    if (x < 0 || x >= map.width) continue;
    const t = map.terrain[row * map.width + x];
    if (t === TERRAIN_CODE.water || t === TERRAIN_CODE.ford) { first = Math.min(first, x); last = Math.max(last, x); }
  }
  if (!Number.isFinite(first)) { first = Math.floor(axis) - 1; last = Math.floor(axis); }
  const edge = side > 0 ? last + 1 : first;
  let room = 0;
  for (let k = 0; k < 3; k += 1) {
    const x = side > 0 ? edge + k : edge - 1 - k;
    if (x < 0 || x >= map.width) break;
    const t = map.terrain[row * map.width + x];
    if (t === TERRAIN_CODE.mountain || t === TERRAIN_CODE.water || t === TERRAIN_CODE.lake || t === TERRAIN_CODE.ford) break;
    room += 1;
  }
  return { edge, room };
}

/**
 * El trazado suave dentro de sus bandas: se promedia con las vecinas y se
 * devuelve a la banda, unas cuantas veces. Así la senda no hace zigzag con los
 * saltos del río y tampoco se mete en él para alisarlos.
 */
function settled(samples: Sample[]): RoadPoint[] {
  const xs = samples.map((s) => s.x);
  for (let pass = 0; pass < ROAD_PASSES; pass += 1) {
    const next = xs.map((_, i) => {
      const reach = Math.min(ROAD_SMOOTH, i, xs.length - 1 - i);
      let sum = 0;
      for (let k = i - reach; k <= i + reach; k += 1) sum += xs[k]!;
      const s = samples[i]!;
      // Con un tirón hacia su sitio: sólo con el promedio, la orilla de dentro
      // del mapa y la de fuera se arrastraban la una a la otra hasta el borde
      // de la banda.
      const mean = sum / (reach * 2 + 1);
      return Math.max(s.lo, Math.min(s.hi, mean + (s.aim - mean) * ROAD_PULL));
    });
    for (let i = 0; i < xs.length; i += 1) xs[i] = next[i]!;
  }
  return samples.map((s, i) => ({ x: xs[i]!, z: s.z }));
}

/** La mitad del ancho del río en una fila: sus celdas de agua (y vado) cerca del eje, entre dos. */
function riverHalfWidth(map: ValleyMap, row: number): number {
  const axis = valleyAxis(map, row);
  let count = 0;
  for (let x = Math.floor(axis - 5); x <= Math.ceil(axis + 5); x += 1) {
    if (x < 0 || x >= map.width) continue;
    const t = map.terrain[row * map.width + x];
    if (t === TERRAIN_CODE.water || t === TERRAIN_CODE.ford) count += 1;
  }
  return Math.max(1, count) / 2;
}

/**
 * El cruce de la orilla a la boca: el camino de menos subida, por celdas, desde
 * cualquier celda de la orilla de las últimas `ROAD_TURN` filas hasta la boca.
 * Nunca por el agua. Devuelve los centros de celda **de la boca hacia fuera** y
 * desde qué fila (en celdas hacia dentro) sigue la orilla.
 */
function turnToMouth(
  map: ValleyMap, mouthCell: number, end: 0 | 1, bankAt: (inward: number) => RoadPoint,
): { cells: RoadPoint[]; from: number } | null {
  const mx = mouthCell % map.width, mz = Math.floor(mouthCell / map.width);
  const inwardOf = (row: number): number => (end === 0 ? row + 0.5 : map.height - row - 0.5);
  const mouthIn = inwardOf(mz);
  // La caja donde se busca: de la orilla a la boca, con margen.
  const bankRows: number[] = [];
  for (let k = 0; k <= ROAD_TURN; k += 1) {
    const row = end === 0 ? mz - k : mz + k;
    if (row >= 0 && row < map.height) bankRows.push(row);
  }
  const xs = bankRows.map((row) => bankAt(inwardOf(row)).x);
  const x0 = Math.max(0, Math.floor(Math.min(mx, ...xs)) - 3), x1 = Math.min(map.width - 1, Math.ceil(Math.max(mx, ...xs)) + 3);
  const z0 = Math.max(0, Math.min(mz, ...bankRows) - 2), z1 = Math.min(map.height - 1, Math.max(mz, ...bankRows) + 2);
  const w = x1 - x0 + 1, h = z1 - z0 + 1;
  const local = (x: number, z: number): number => (z - z0) * w + (x - x0);
  const open = (x: number, z: number): boolean => {
    const t = map.terrain[z * map.width + x];
    return t !== TERRAIN_CODE.water && t !== TERRAIN_CODE.lake && t !== TERRAIN_CODE.ford;
  };
  // Lo que cuesta pisar una celda: su esquina más alta, para rodear la roca.
  const rise = (x: number, z: number): number => Math.max(0, Math.max(
    elevationAt(map, x, z), elevationAt(map, x + 1, z), elevationAt(map, x, z + 1), elevationAt(map, x + 1, z + 1)));
  const cost = new Float64Array(w * h).fill(Number.POSITIVE_INFINITY);
  const from = new Int32Array(w * h).fill(-1);
  const done = new Uint8Array(w * h);
  // Salida: la celda de la orilla en cada fila de la caja, gratis; andar por la
  // orilla es lo que la senda ya hace.
  const source = new Map<number, number>();
  for (const row of bankRows) {
    const x = Math.floor(bankAt(inwardOf(row)).x);
    if (x < x0 || x > x1 || !open(x, row)) continue;
    cost[local(x, row)] = 0;
    source.set(local(x, row), inwardOf(row));
  }
  if (source.size === 0) return null;
  const goal = local(mx, mz);
  // Dijkstra sencillo: la caja tiene unas doscientas celdas.
  for (;;) {
    let best = -1;
    for (let i = 0; i < w * h; i += 1) if (done[i] === 0 && cost[i]! < (best < 0 ? Infinity : cost[best]!)) best = i;
    if (best < 0 || best === goal) break;
    done[best] = 1;
    const bx = best % w + x0, bz = Math.floor(best / w) + z0;
    for (let dz = -1; dz <= 1; dz += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dz === 0) continue;
        const nx = bx + dx, nz = bz + dz;
        if (nx < x0 || nx > x1 || nz < z0 || nz > z1 || !open(nx, nz)) continue;
        // En diagonal no se corta una esquina de agua.
        if (dx !== 0 && dz !== 0 && (!open(bx + dx, bz) || !open(bx, bz + dz))) continue;
        const next = local(nx, nz);
        const step = Math.hypot(dx, dz) * (1 + ROAD_CLIMB * Math.max(0, rise(nx, nz) - 0.15));
        if (cost[best]! + step < cost[next]!) { cost[next] = cost[best]! + step; from[next] = best; }
      }
    }
  }
  if (!Number.isFinite(cost[goal]!)) return null;
  // De la boca hacia atrás. La boca va siempre, aunque esté en la orilla: es
  // donde empieza el camino pintado; la celda de la orilla donde sale el cruce
  // no, que la pone la orilla misma.
  const centreOf = (cell: number): RoadPoint => ({ x: cell % w + x0 + 0.5, z: Math.floor(cell / w) + z0 + 0.5 });
  const cells: RoadPoint[] = [centreOf(goal)];
  let at = goal;
  while (!source.has(at)) {
    at = from[at]!;
    if (at < 0) return null;
    if (!source.has(at)) cells.push(centreOf(at));
  }
  return { cells, from: Math.min(source.get(at)!, mouthIn) };
}

/** Los puntos, a `ROAD_STEP` de distancia a lo largo de la línea que forman. */
function resampled(points: readonly RoadPoint[]): RoadPoint[] {
  if (points.length < 2) return [...points];
  const out: RoadPoint[] = [points[0]!];
  let carry = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!, b = points[i]!;
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    let along = ROAD_STEP - carry;
    while (along <= length) {
      const t = along / length;
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
      along += ROAD_STEP;
    }
    carry = length - (along - ROAD_STEP);
  }
  const last = points[points.length - 1]!;
  if (Math.hypot(last.x - out[out.length - 1]!.x, last.z - out[out.length - 1]!.z) > ROAD_STEP * 0.25) out.push(last);
  return out;
}

// La boca de cada desfiladero la decide el motor (`world/valley-road.ts`): la
// misma fila y la misma orilla para la cinta, los pinos, el bosque y el
// camino pintado.
export { valleyReach } from '@engine/world/valley-road';

/** El decorado deja libre la senda, sus barandas y su propia huella. */
export function clearsGorgeRoad(
  paths: readonly (readonly { x: number; z: number }[])[], x: number, z: number, radius: number,
): boolean {
  return paths.every(path => path.every((a, i) => {
    const b = path[i + 1];
    if (b === undefined) return true;
    const dx = b.x - a.x, dz = b.z - a.z;
    const length = dx * dx + dz * dz;
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length));
    return Math.hypot(x - a.x - dx * t, z - a.z - dz * t) > radius + ROAD_WIDTH / 2 + 0.06;
  }));
}

/**
 * La cinta de las dos sendas. `surface` es la cota de lo que se dibuja en cada
 * punto —el suelo y la piel dentro del mapa, la malla de la sierra fuera—, y
 * cada vértice se apoya en ella: tres por sección, para que la cinta siga
 * también la ladera a lo ancho. `crossing` dice dónde cae una cascada.
 */
export function buildGorgeRoads(
  map: ValleyMap, seed: number, palette: Palette, surface: (x: number, z: number) => number,
  crossing: (x: number, z: number) => boolean = () => false,
): GorgeRoads {
  const points: number[] = [];
  const fades: number[] = [];
  const corners: number[] = [];
  // Los puentes (Vera, 27 sep 2026: «podrías poner un puente»): donde la senda
  // cruza el corredor de una cascada, unas tablas con baranda por encima del
  // agua, y el agua pasa por debajo. Antes la senda tapaba la cinta.
  const bridges = new Group();
  bridges.name = 'Valley_Gorge_Bridges';
  const planks = new MeshStandardMaterial({ color: BRIDGE.planks, vertexColors: true, roughness: 0.9, metalness: 0, side: DoubleSide });
  const timber = new MeshStandardMaterial({ color: BRIDGE.timber, roughness: 0.9, metalness: 0 });
  const bridgeGeometries: BufferGeometry[] = [];
  // El puente sigue la senda: un tablero por tramo, de muestra en muestra, en
  // arco —sube de la cota del camino a un palmo sobre el agua y vuelve a
  // bajar—, con baranda a los dos lados. Una tabla recta cruzaba en otra
  // dirección que la senda y sus rampas salían torcidas (captura del 27 sep).
  const plank = (from: Vector3, to: Vector3, width: number, thick: number, material: MeshStandardMaterial): Mesh => {
    const run = to.clone().sub(from);
    const piece = new Mesh(new BoxGeometry(run.length() + 0.02, thick, width), material);
    piece.position.copy(from).add(to).multiplyScalar(0.5);
    piece.quaternion.setFromUnitVectors(new Vector3(1, 0, 0), run.normalize());
    return piece;
  };
  const bridgeAt = (samples: readonly { x: number; z: number; y: number }[]): void => {
    const bridge = new Group();
    // Cuatro tablas por tramo de senda: con uno solo, el arco salía en pico.
    const path: { x: number; z: number; y: number }[] = [];
    for (let k = 0; k < samples.length - 1; k += 1) {
      for (let n = 0; n < 4; n += 1) {
        const a = samples[k]!, b = samples[k + 1]!, u = n / 4;
        path.push({ x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, y: a.y + (b.y - a.y) * u });
      }
    }
    path.push(samples[samples.length - 1]!);
    // Y en planta, recto de estribo a estribo: la senda trae curvas de muestra
    // a muestra, y un tablero que dobla pliega su canto en escalón (captura del
    // 2 oct 2026). Una pasarela de tres o cuatro celdas va recta.
    const last = path.length - 1;
    for (let k = 1; k < last; k += 1) {
      const t = k / last;
      path[k] = { ...path[k]!, x: path[0]!.x + (path[last]!.x - path[0]!.x) * t, z: path[0]!.z + (path[last]!.z - path[0]!.z) * t };
    }
    // **El tablero es un arco, no la senda en alto** (Vera, 2 oct 2026: «se ve
    // roto el puente»). Con la senda apoyada en el suelo, cada tabla tomaba el
    // bache que tenía debajo y el tablero subía, bajaba y volvía a subir en
    // tres palmos: el estribo parecía partido. Ahora cada punto pide lo que
    // tiene que salvar —el suelo y la cascada, con un palmo de holgura— y un
    // arco mínimo sobre la recta de estribo a estribo, y el tablero es la
    // envolvente cóncava de todo eso: sube y baja una vez, nunca hace dientes.
    const ends = { from: path[0]!.y, to: path[last]!.y };
    const base = (t: number): number => ends.from + (ends.to - ends.from) * t;
    const need = path.map((p) => surface(p.x, p.z) + BRIDGE.over);
    // La flecha del arco: la justa para salvar lo de en medio, entre la mínima
    // y la máxima. Con la envolvente sola, el tablero subía de golpe sobre un
    // bulto junto al estribo y luego se aplanaba, y el canto hacía rodilla.
    let rise: number = BRIDGE.arch;
    path.forEach((_, k) => {
      const t = k / last;
      if (t >= 0.15 && t <= 0.85) rise = Math.max(rise, (need[k]! - base(t)) / Math.sin(Math.PI * t));
    });
    rise = Math.min(rise, BRIDGE.archMax);
    const wanted = path.map((_, k) => {
      const t = k / last;
      if (k === 0 || k === last) return { t, y: k === 0 ? ends.from : ends.to };
      return { t, y: Math.max(need[k]!, base(t) + rise * Math.sin(Math.PI * t)) };
    });
    const arch = upperHull(wanted);
    const deckAt = path.map((p, k) => new Vector3(p.x, hullAt(arch, k / last), p.z));
    const sideAt = (k: number): Vector3 => {
      const a = deckAt[Math.max(0, k - 1)]!, b = deckAt[Math.min(last, k + 1)]!;
      return new Vector3(-(b.z - a.z), 0, b.x - a.x).normalize().multiplyScalar(ROAD_WIDTH / 2 + 0.04);
    };
    // **Un tablero de una pieza** (Vera, 2 oct 2026: «sigo viendo baldosas de
    // madera mal puestas»). Eran cajas sueltas, una por tramo y girada cada una
    // a su tramo: donde el puente dobla y sube se montaban en escalón. Ahora es
    // una sola malla que sigue el arco, y las tablas se ven por el color.
    const deck = new Mesh(deckGeometry(deckAt, ROAD_WIDTH / 2 + 0.06, BRIDGE.deck), planks);
    deck.name = 'Valley_Gorge_Bridge_Deck';
    // Por dónde va, de estribo a estribo: lo leen las pruebas del arco.
    deck.userData.centre = deckAt.map((point) => point.clone());
    deck.castShadow = true;
    bridge.add(deck);
    for (let k = 0; k < last; k += 1) {
      for (const side of [-1, 1]) {
        const up = new Vector3(0, BRIDGE.rail, 0);
        const from = deckAt[k]!.clone().addScaledVector(sideAt(k), side).add(up);
        const to = deckAt[k + 1]!.clone().addScaledVector(sideAt(k + 1), side).add(up);
        bridge.add(plank(from, to, 0.03, 0.03, timber));
      }
    }
    for (const k of [0, Math.floor(last / 2), last]) {
      for (const side of [-1, 1]) {
        const post = new Mesh(new BoxGeometry(BRIDGE.post, BRIDGE.rail, BRIDGE.post), timber);
        post.position.copy(deckAt[k]!).addScaledVector(sideAt(k), side);
        post.position.y += BRIDGE.rail / 2;
        bridge.add(post);
      }
    }
    bridge.traverse((node) => { if (node instanceof Mesh) bridgeGeometries.push(node.geometry as BufferGeometry); });
    bridges.add(bridge);
  };
  for (const centre of gorgeRoadPaths(map, seed)) {
    const count = centre.length - 1;
    if (count < 1) continue;
    // Lo andado desde la boca, para el afilado de dentro y el fundido de fuera.
    const walked: number[] = [0];
    for (let i = 1; i <= count; i += 1) walked.push(walked[i - 1]! + Math.hypot(centre[i]!.x - centre[i - 1]!.x, centre[i]!.z - centre[i - 1]!.z));
    const length = walked[count]!;
    // Al irse se afina y se funde con la pedrera a lo largo de doce celdas; y
    // por dentro no empieza de golpe: se afila hasta morir en el camino pintado
    // a lo largo de tres (un corte recto era una de las sendas que se cortan de
    // las capturas de Vera, 27 sep).
    const fadeAt = (i: number): number => Math.max(0, Math.min(1, (length - walked[i]!) / 12));
    const startAt = (i: number): number => Math.max(0.08, Math.min(1, walked[i]! / 3));
    const across = (i: number): { x: number; z: number } => {
      const a = centre[Math.max(0, i - 1)]!, b = centre[Math.min(count, i + 1)]!;
      const run = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      return { x: -(b.z - a.z) / run, z: (b.x - a.x) / run };
    };
    // Cinco vértices por sección, cada uno en el suelo que se dibuja bajo él.
    const section = (i: number): number[][] => {
      const p = centre[i]!, n = across(i);
      const half = ROAD_WIDTH * 0.5 * (0.5 + 0.5 * fadeAt(i)) * startAt(i);
      return ROAD_ACROSS.map((s) => {
        const x = p.x + n.x * half * s, z = p.z + n.z * half * s;
        return [x, surface(x, z) + ROAD_LIFT, z];
      });
    };
    const sections = centre.map((_, i) => section(i));
    // Y entre vértices: una arista del suelo puede asomar por el medio de un
    // triángulo de la cinta aunque sus esquinas estén apoyadas («los caminos se
    // cortan», capturas de Vera, 27 sep). Se sube **ese** triángulo lo que
    // asome, y nada más: la rampa larga de antes levantaba decenas de celdas.
    for (let pass = 0; pass < 3; pass += 1) {
      for (let i = 0; i < count; i += 1) {
        const here = sections[i]!, next = sections[i + 1]!;
        for (let lane = 0; lane < ROAD_ACROSS.length - 1; lane += 1) {
          for (const corners of [[here[lane]!, next[lane]!, here[lane + 1]!], [here[lane + 1]!, next[lane]!, next[lane + 1]!]]) {
            for (const weights of [[0.5, 0.5, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [1 / 3, 1 / 3, 1 / 3]] as const) {
              const [a, b, c] = corners as [number[], number[], number[]];
              const [u, v, w] = weights;
              const x = a[0]! * u + b[0]! * v + c[0]! * w, z = a[2]! * u + b[2]! * v + c[2]! * w;
              const poke = surface(x, z) + ROAD_SEAM - (a[1]! * u + b[1]! * v + c[1]! * w);
              if (poke <= 0) continue;
              // Cada esquina sube en proporción a lo que pesa en ese punto: lo
              // justo para tapar el pliegue, y la esquina lejana se queda en su sitio.
              const norm = u * u + v * v + w * w;
              corners.forEach((corner, k) => { corner[1] = corner[1]! + poke * weights[k]! / norm; });
            }
          }
        }
      }
    }
    // Los tramos que caen dentro de una cascada, con una muestra de margen a
    // cada lado: ahí va el puente y **no** se pinta la senda, que tapaba el
    // agua. El tablero sube hasta un palmo sobre el suelo del tramo.
    const bridged = new Set<number>();
    for (let i = 0; i < count; i += 1) {
      if (!crossing(centre[i]!.x, centre[i]!.z)) continue;
      let j = i;
      while (j + 1 < count && crossing(centre[j + 1]!.x, centre[j + 1]!.z)) j += 1;
      const a = Math.max(0, i - 2), b = Math.min(count, j + 2);
      const path = [];
      for (let k = a; k <= b; k += 1) path.push({ ...centre[k]!, y: sections[k]![ROAD_MIDDLE]![1]! });
      bridgeAt(path);
      for (let k = a; k < b; k += 1) bridged.add(k);
      i = j;
    }
    // Los vértices se comparten de sección a sección, para que la luz se
    // reparta por la cinta y no cambie en cada faceta del suelo que pisa: con
    // una normal por triángulo, la senda sobre una ladera facetada se leía como
    // losas sueltas (Vera, 2 oct 2026).
    const base = points.length / 3;
    sections.forEach((section, i) => { for (const corner of section) { points.push(...corner); fades.push(fadeAt(i)); } });
    const lanes = ROAD_ACROSS.length;
    for (let i = 0; i < count; i += 1) {
      if (bridged.has(i)) continue;
      for (let lane = 0; lane < lanes - 1; lane += 1) {
        const a = base + i * lanes + lane, b = a + 1, c = a + lanes, d = c + 1;
        corners.push(a, c, b, b, c, d);
      }
    }
  }
  const shared = new BufferGeometry();
  shared.setAttribute('position', new BufferAttribute(new Float32Array(points), 3));
  shared.setAttribute('fade', new BufferAttribute(new Float32Array(fades), 1));
  shared.setAttribute('color', new BufferAttribute(new Float32Array(points.length), 3));
  shared.setIndex(corners);
  shared.computeVertexNormals();
  // Y suelta por triángulos, con las normales ya repartidas: quien lee la cinta
  // la lee de tres en tres, como antes.
  const geometry = shared.toNonIndexed();
  shared.dispose();
  const material = new MeshStandardMaterial({
    vertexColors: true, roughness: 1, metalness: 0, side: DoubleSide,
    // Encima del suelo sin pelearse con él por la profundidad.
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'Valley_Gorge_Roads';
  mesh.receiveShadow = true;
  const season = (next: Palette): void => {
    const colour = geometry.getAttribute('color') as BufferAttribute;
    const fade = geometry.getAttribute('fade') as BufferAttribute;
    const dirt = new Color(next.path);
    const rock = new Color(next.rock);
    const tint = new Color();
    for (let i = 0; i < fade.count; i += 1) {
      // Al irse se funde con la pedrera, en vez de acabar de golpe.
      tint.copy(rock).lerp(dirt, fade.getX(i));
      colour.setXYZ(i, tint.r, tint.g, tint.b);
    }
    colour.needsUpdate = true;
  };
  season(palette);
  return {
    mesh, bridges, season,
    dispose(): void {
      geometry.dispose();
      material.dispose();
      for (const one of bridgeGeometries) one.dispose();
      planks.dispose();
      timber.dispose();
    },
  };
}

/**
 * El tablero de un puente, de una pieza: una losa de `thick` de grueso y
 * `half` de medio ancho que sigue la línea `centre` por arriba. Cada tramo es
 * una tabla, un poco más clara o más oscura que la de al lado; los cantos y la
 * cara de abajo, en sombra.
 */
function deckGeometry(centre: readonly Vector3[], half: number, thick: number): BufferGeometry {
  const last = centre.length - 1;
  const across = (k: number): Vector3 => {
    const a = centre[Math.max(0, k - 1)]!, b = centre[Math.min(last, k + 1)]!;
    return new Vector3(-(b.z - a.z), 0, b.x - a.x).normalize().multiplyScalar(half);
  };
  const positions: number[] = [];
  const colours: number[] = [];
  const at = (k: number, side: number, low: boolean): number[] => {
    const point = centre[k]!.clone().addScaledVector(across(k), side);
    return [point.x, point.y - (low ? thick : 0), point.z];
  };
  const face = (shade: number, ...points: number[][]): void => {
    for (const point of points) { positions.push(...point); colours.push(shade, shade, shade); }
  };
  for (let k = 0; k < last; k += 1) {
    const plank = k % 2 === 0 ? 1 : 0.86;
    const tl = at(k, 1, false), tr = at(k, -1, false), nl = at(k + 1, 1, false), nr = at(k + 1, -1, false);
    const bl = at(k, 1, true), br = at(k, -1, true), ml = at(k + 1, 1, true), mr = at(k + 1, -1, true);
    face(plank, tl, nl, tr, tr, nl, nr);
    face(plank * 0.62, tl, bl, nl, nl, bl, ml);
    face(plank * 0.62, tr, nr, br, br, nr, mr);
    face(0.5, bl, ml, br, br, ml, mr);
  }
  for (const k of [0, last]) {
    const tl = at(k, 1, false), tr = at(k, -1, false), bl = at(k, 1, true), br = at(k, -1, true);
    face(0.62, tl, bl, tr, tr, bl, br);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colours), 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * La envolvente superior y cóncava de unos puntos ordenados por `t`: la cuerda
 * más baja que pasa por encima de todos y que nunca hace valle.
 */
function upperHull(points: readonly { t: number; y: number }[]): { t: number; y: number }[] {
  const hull: { t: number; y: number }[] = [];
  for (const point of points) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2]!, b = hull[hull.length - 1]!;
      // Se quita `b` si queda por debajo (o encima) de la cuerda de `a` al nuevo.
      if ((b.t - a.t) * (point.y - a.y) - (b.y - a.y) * (point.t - a.t) >= 0) hull.pop();
      else break;
    }
    hull.push(point);
  }
  return hull;
}

/** La envolvente en `t`, de tramo en tramo. */
function hullAt(hull: readonly { t: number; y: number }[], t: number): number {
  for (let k = 1; k < hull.length; k += 1) {
    const a = hull[k - 1]!, b = hull[k]!;
    if (t <= b.t) return a.y + (b.y - a.y) * ((t - a.t) / ((b.t - a.t) || 1));
  }
  return hull[hull.length - 1]!.y;
}

/**
 * Lo que la senda se levanta sobre el suelo, en celdas.
 *
 * TUNE (v5.74): 0,02. Vera, con la senda ya pegada al suelo (v5.70): «el camino
 * flotando… casi». Iba a 0,07 por encima de lo que se dibuja (el peor vértice a
 * 0,09) y de lejos se leía como una cinta posada. Con 0,02 el suelo la tapaba a
 * trozos cuando la cota salía de la fórmula de la sierra; desde que cada vértice
 * se apoya en la malla dibujada (`surface`) ya no: medido en ocho semillas
 * (9 025 vértices, `gorge-road-measure.ts`), ninguno por debajo, nada tapado y
 * el 98,4 % a menos de 0,05; los que pasan, hasta 0,11, están en la costura con
 * la sierra del borde del mapa. Con 0,07 iban todos a 0,07.
 */
const ROAD_LIFT = 0.02;
/** Lo que la cinta queda, como poco, por encima del suelo entre sus vértices, en celdas. */
const ROAD_SEAM = 0.01;
/**
 * Dónde van los vértices de cada sección, de un borde al otro, en medios
 * anchos. Cinco y no dos: con los dos bordes solos, la cinta tendía un plano
 * sobre la orilla y una arista del suelo asomaba por el medio; con tres,
 * quedaban vértices medio palmo por encima del suyo (semilla 19, 0,43 celdas).
 */
const ROAD_ACROSS = [-1, -0.5, 0, 0.5, 1] as const;
const ROAD_MIDDLE = 2;
