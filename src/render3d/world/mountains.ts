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
  BufferAttribute, BufferGeometry, Color, DodecahedronGeometry, DoubleSide, DynamicDrawUsage, Euler, Group, InstancedMesh,
  Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3,
} from 'three';
import { hash32 } from '@engine/rng';
import { TERRAIN_CODE, type ValleyMap } from '@engine/state';
import type { Palette } from '@derive/palette';
import { GROUND_BIAS } from '../visual-config';
import { elevationAt, groundColourAt } from './ground';

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
/** A partir de qué altura hay piel: el pie de la montaña se deja al suelo, que lo funde con el prado. */
const SKIN_FROM = 0.35;
/** Hasta qué altura la piel lleva el color del suelo que tapa, en celdas. */
const SKIN_OWN = 1.6;

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
      if (map.terrain[z * map.width + x] !== TERRAIN_CODE.mountain) continue;
      const a = elevationAt(map, x, z), b = elevationAt(map, x + 1, z);
      const c = elevationAt(map, x, z + 1), d = elevationAt(map, x + 1, z + 1);
      if (Math.max(a, b, c, d) < SKIN_FROM) continue;
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

/** Los peñascos, instanciados por forma: unos pocos objetos para cientos de rocas. */
export function buildCrags(crags: readonly Crag[], palette: Palette): Crags {
  const group = new Group();
  group.name = 'Valley_Crags';
  const material = new MeshStandardMaterial({ color: '#ffffff', flatShading: true, roughness: 1, metalness: 0 });
  const shapes = Array.from({ length: SHAPES }, (_, n) => rockShape(n + 1));
  const matrix = new Matrix4();
  const at = new Vector3();
  const turn = new Quaternion();
  const size = new Vector3();
  const meshes: InstancedMesh[] = [];
  const tint = new Color();
  const buckets = shapes.map(() => [] as Crag[]);
  crags.forEach((crag, n) => buckets[n % SHAPES]!.push(crag));
  shapes.forEach((shape, n) => {
    const list = buckets[n]!;
    if (list.length === 0) return;
    const mesh = new InstancedMesh(shape, material, list.length);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    list.forEach((crag, k) => {
      at.set(crag.x, crag.y, crag.z);
      turn.setFromEuler(new Euler(crag.tilt, crag.turn, crag.tilt * 0.5));
      size.set(crag.size, crag.size, crag.size * (0.8 + (k % 3) * 0.15));
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
  wet: (x: number, z: number) => boolean, axis: (z: number) => number,
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
 * ella: «un camino que sale»). Arranca dentro del mapa, en la ribera del paso,
 * y sigue la orilla hasta perderse en la sierra: una cinta de tierra pegada al
 * suelo, del color de los caminos del pueblo, que se afina y se funde al irse.
 *
 * Decorado: no es un camino de la partida ni de la capa de vida. Por eso sólo
 * pisa la ribera de la garganta, donde no se levanta nunca nada.
 */
export interface GorgeRoads { mesh: Mesh; season(palette: Palette): void; dispose(): void }

/** Hasta dónde entra en el mapa y hasta dónde se aleja por fuera, en celdas. TUNE visual. */
const ROAD_IN = 14;
const ROAD_OUT = 42;
/** Ancho de la senda, y su distancia al eje del río. TUNE visual: el río ocupa dos celdas. */
const ROAD_WIDTH = 0.6;
/** Lo más cerca del eje que va la senda aunque no haya agua, en celdas. */
const ROAD_MIN = 1.9;
/** El paso de muestreo de la senda y cuántas muestras a cada lado promedia el suavizado. */
const ROAD_STEP = 0.5;
const ROAD_SMOOTH = 4;
/** Cuántas muestras a cada lado promedia la cota de la senda. */
const ROAD_LEVEL = 6;
/** Hasta dónde a cada lado del eje se busca el agua, en celdas. */
const ROAD_SEARCH = 6;

export function buildGorgeRoads(
  map: ValleyMap, seed: number, palette: Palette, heightAt: (x: number, z: number) => number,
  wet: (x: number, z: number) => boolean, axis: (z: number) => number,
): GorgeRoads {
  const points: number[] = [];
  const fades: number[] = [];
  const length = ROAD_IN + ROAD_OUT;
  const count = Math.round(length / ROAD_STEP);
  for (const end of [0, 1] as const) {
    // Cada entrada saca su senda por una orilla, la que diga el hash.
    const side = unit(seed, `road:${end}`) > 0.5 ? 1 : -1;
    const zOf = (t: number): number => (end === 0 ? ROAD_IN - t : map.height - ROAD_IN + t);
    // Primero lo lejos del eje que puede ir sin mojarse, muestra a muestra; y
    // luego suavizado, que con los saltos de una orilla a otra la senda salía
    // en zigzag y trepaba por la pared (captura del 26 sep).
    // Lo lejos del eje que va la senda en cada muestra: justo pasada la orilla
    // real del río, que no es el eje del valle —el cauce serpentea— y medido
    // con la propia agua, dentro del mapa y fuera.
    const offsets: number[] = [];
    for (let i = 0; i <= count; i += 1) {
      const z = zOf(i * ROAD_STEP);
      const centre = axis(z);
      let bank = -Infinity;
      for (let d = -ROAD_SEARCH; d <= ROAD_SEARCH; d += 0.1) {
        const x = centre + side * d;
        if (wet(x, z) || soggy(map, x, z)) bank = Math.max(bank, d);
      }
      const dry = bank === -Infinity ? ROAD_MIN : Math.max(ROAD_MIN, bank + ROAD_WIDTH * 0.5 + ROAD_SMOOTH_SLACK);
      offsets.push(dry);
    }
    // Suave y sin mojarse: primero cada muestra toma lo más lejos que pida
    // cualquiera de sus vecinas y después se promedia. Así el promedio nunca
    // queda más cerca del agua que ninguna muestra cruda. Con el máximo
    // aplicado después del promedio, los saltos volvían y la senda doblaba en
    // zigzag (captura del 26 sep).
    const window = (i: number): [number, number] => [Math.max(0, i - ROAD_SMOOTH), Math.min(count, i + ROAD_SMOOTH)];
    const wide = offsets.map((_, i) => {
      const [from, to] = window(i);
      return Math.max(...offsets.slice(from, to + 1));
    });
    const centre = wide.map((_, i) => {
      const [from, to] = window(i);
      let sum = 0;
      for (let k = from; k <= to; k += 1) sum += wide[k]!;
      const z = zOf(i * ROAD_STEP);
      // Y un vaivén suave, siempre hacia fuera del río.
      const sway = (Math.sin(i * 0.23 + unit(seed, `road:w:${end}`) * 6) + 1) * 0.1;
      return { x: axis(z) + side * (sum / (to - from + 1) + sway), z };
    });
    const fadeAt = (i: number): number => Math.max(0, Math.min(1, (length - i * ROAD_STEP) / 12));
    // La cota va suavizada a lo largo y plana de lado a lado, como una
    // plataforma: copiando cada bache de la ladera, con la cámara en diagonal
    // cada subida se leía como un quiebro y la senda salía en dientes de sierra
    // (captura del 26 sep, semilla 11).
    const raw = centre.map((p) => heightAt(p.x, p.z));
    const level = raw.map((_, i) => {
      let sum = 0, n = 0;
      for (let k = Math.max(0, i - ROAD_LEVEL); k <= Math.min(count, i + ROAD_LEVEL); k += 1) { sum += raw[k]!; n += 1; }
      return sum / n;
    });
    const edge = (i: number, s: number): number[] => {
      const p = centre[i]!;
      const x = p.x + s * ROAD_WIDTH * 0.5 * (0.5 + 0.5 * fadeAt(i));
      return [x, level[i]! + GROUND_BIAS + ROAD_LIFT, p.z];
    };
    for (let i = 0; i < count; i += 1) {
      const a = edge(i, -1), b = edge(i, 1), c = edge(i + 1, -1), d = edge(i + 1, 1);
      points.push(...a, ...c, ...b, ...b, ...c, ...d);
      const f0 = fadeAt(i), f1 = fadeAt(i + 1);
      fades.push(f0, f1, f0, f0, f1, f1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(points), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(points.length), 3));
  geometry.computeVertexNormals();
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
    const dirt = new Color(next.path);
    const rock = new Color(next.rock);
    const tint = new Color();
    for (let i = 0; i < fades.length; i += 1) {
      // Al irse se funde con la pedrera, en vez de acabar de golpe.
      tint.copy(rock).lerp(dirt, fades[i]!);
      colour.setXYZ(i, tint.r, tint.g, tint.b);
    }
    colour.needsUpdate = true;
  };
  season(palette);
  return { mesh, season, dispose(): void { geometry.dispose(); material.dispose(); } };
}

/** El margen que se deja al agua porque el suavizado puede acercar la senda a la orilla. */
const ROAD_SMOOTH_SLACK = 0.12;

/**
 * Si en ese punto del mapa hay agua; fuera del mapa, nunca (eso lo mira `wet`).
 * La marisma no cuenta: una senda la cruza, y en la garganta, donde la ribera
 * es de dos celdas y a veces toda marisma, contarla la subía por la pared.
 */
function soggy(map: ValleyMap, x: number, z: number): boolean {
  if (x < 0 || z < 0 || x >= map.width || z >= map.height) return false;
  const t = map.terrain[Math.floor(z) * map.width + Math.floor(x)];
  return t === TERRAIN_CODE.water || t === TERRAIN_CODE.lake || t === TERRAIN_CODE.ford;
}

/** Lo que la senda se levanta sobre el suelo, en celdas. TUNE: con 0,02 el suelo, que no es plano entre vértices, la tapaba a trozos. */
const ROAD_LIFT = 0.07;
