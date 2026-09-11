// G-06 · The valley floor. design.md D.6, D.8.
//
// One mesh for the whole map, with a colour per vertex. Thirty-six by fifty-six
// cells is four thousand triangles, which is nothing, and one mesh is one draw
// call instead of two thousand.
//
// It is rebuilt only when `groundSignature` changes, which is when terrain or
// paths change — a few times a year, not sixty times a second. D.6 asks not to
// rebuild everything every frame and this is the biggest thing there is to
// rebuild.

import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, Mesh, MeshStandardMaterial,
} from 'three';
import type { ValleyMap } from '@engine/state';
import type { Palette } from '@render/palette';
import { GROUND_BIAS } from '../visual-config';

/**
 * How much a cell's colour varies from its neighbours of the same kind.
 *
 * A meadow painted in one flat green reads as a bedsheet. The variation is
 * derived from the cell index and never from randomness: §4.3 forbids the
 * renderer drawing a number, and a valley that shimmered differently on every
 * frame would be worse than a flat one.
 */
const MOTTLE = 0.05;

function mottleOf(cell: number): number {
  const mixed = Math.imul(cell + 1, 2_654_435_761) >>> 0;
  return ((mixed % 1000) / 999 - 0.5) * 2 * MOTTLE;
}

/**
 * El color de una celda: su terreno, o el camino gastado encima.
 *
 * Los colores salen de la paleta de la estación, que es la de §10.3 y la que el
 * render 2D ya usa. Duplicarla aquí habría hecho que los dos valles se
 * separaran en cuanto alguien retocara un verde, y G-08 pide expresamente
 * reutilizar el significado existente en vez de repetir las reglas.
 */
export function cellColour(map: ValleyMap, cell: number, palette: Palette): string {
  const wear = map.path[cell] ?? 0;
  if (wear > 0) {
    // Un camino más pisado es más claro: de la senda al camino real.
    return wear >= 3 ? palette.accent : wear === 2 ? palette.path : mixed(palette.path, palette.meadowAlt);
  }
  switch (map.terrain[cell] ?? 0) {
    case 1: return palette.forest;
    case 2: return palette.water;
    case 3: return palette.rock;
    case 4: return palette.forestDark;
    case 5: return palette.field;
    default: return palette.meadow;
  }
}

/** Media de dos colores, para el escalón que la paleta no nombra. */
function mixed(from: string, to: string): string {
  const parse = (hex: string): number[] => [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
  const a = parse(from);
  const b = parse(to);
  return `#${a.map((value, index) => Math.round((value + (b[index] ?? value)) / 2)
    .toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Cuanto sube o baja cada terreno respecto al prado, en celdas.
 *
 * El rio era color plano: agua y prado a la misma altura, y desde arriba se
 * leia como una alfombra azul. Un cauce hundido hace que el rio corte el valle
 * y que el prado tenga orilla. La roca sube un poco por el mismo motivo: un
 * afloramiento que no sobresale no aflora.
 *
 * TUNE: catorce centesimas de celda son cuarenta centimetros (D.6.2). Poco es
 * suficiente porque lo que hace el cauce no es la profundidad, es la sombra
 * que proyecta el borde.
 */
const RELIEF: Readonly<Record<number, number>> = {
  2: -0.14,   // agua
  4: -0.05,   // marisma
  3: 0.09,    // roca
};

/**
 * La altura de una esquina de celda, promediando las celdas que la tocan.
 *
 * Promediar es lo que da la orilla. Bajando la celda entera de golpe, el rio
 * queda con paredes verticales y un escalon en cada borde; promediando, el
 * prado baja hacia el agua y sube desde ella.
 */
/**
 * Cuanto se hunde un camino segun lo pisado que este, en celdas.
 *
 * Un camino era solo un color mas claro. Un camino de verdad es una rodada: el
 * paso se lleva la hierba y luego la tierra, y lo que se ve desde arriba es la
 * sombra del borde. TUNE: seis centimetros la senda, quince el camino real.
 */
const RUT: readonly number[] = [0, -0.02, -0.035, -0.05];

/** La cota de una **esquina** de celda, promediando las celdas que la tocan. */
function heightAt(map: ValleyMap, x: number, z: number): number {
  let total = 0;
  let seen = 0;
  for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]] as const) {
    const cx = x + dx;
    const cz = z + dz;
    if (cx < 0 || cz < 0 || cx >= map.width || cz >= map.height) continue;
    const cell = cz * map.width + cx;
    total += RELIEF[map.terrain[cell] ?? 0] ?? 0;
    // La rodada se suma al terreno, no lo sustituye: un vado es camino sobre
    // agua y tiene que seguir estando mas bajo que el prado.
    total += RUT[Math.min(RUT.length - 1, map.path[cell] ?? 0)] ?? 0;
    seen += 1;
  }
  return seen === 0 ? 0 : total / seen;
}

/**
 * A que altura esta la lamina de agua, en celdas.
 *
 * Por encima del fondo del cauce y por debajo de la orilla, que es lo que hace
 * que el borde del prado asome dentro del agua y se lea como ribera en vez de
 * como un corte.
 */
const WATER_LEVEL = -0.10;

/**
 * La lamina de agua sobre las celdas de rio.
 *
 * El suelo esta pintado con color por vertice y un solo material mate: un rio
 * pintado ahi es hierba azul. El agua necesita ser otra superficie porque lo
 * que la distingue no es el color, es que brilla y el prado no. Va aparte
 * tambien porque es plana: el cauce baja, ella no, y esa diferencia es la que
 * dibuja la orilla.
 */
function buildWater(map: ValleyMap, palette: Palette): Mesh | null {
  const cells: number[] = [];
  for (let cell = 0; cell < map.terrain.length; cell += 1) {
    if (map.terrain[cell] === 2) cells.push(cell);
  }
  if (cells.length === 0) return null;

  const positions = new Float32Array(cells.length * 4 * 3);
  const indices = new Uint32Array(cells.length * 6);
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index] ?? 0;
    const x = cell % map.width;
    const z = Math.floor(cell / map.width);
    const corner = index * 4;
    const points = [[x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1]] as const;
    for (let vertex = 0; vertex < 4; vertex += 1) {
      const at = (corner + vertex) * 3;
      positions[at] = points[vertex]?.[0] ?? 0;
      positions[at + 1] = GROUND_BIAS + WATER_LEVEL;
      positions[at + 2] = points[vertex]?.[1] ?? 0;
    }
    const face = index * 6;
    indices[face] = corner;
    indices[face + 1] = corner + 2;
    indices[face + 2] = corner + 1;
    indices[face + 3] = corner;
    indices[face + 4] = corner + 3;
    indices[face + 5] = corner + 2;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new MeshStandardMaterial({
    color: palette.water,
    roughness: 0.18,
    metalness: 0.1,
    // Translucida lo justo para que el fondo del cauce se intuya. Del todo
    // opaca el rio es una chapa; del todo clara no hay rio.
    transparent: true,
    opacity: 0.86,
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'Valley_Water';
  // No recibe sombra: un rio a la sombra de sus propios arboles se veia negro,
  // y el agua de un valle refleja el cielo aunque tenga un roble encima.
  mesh.receiveShadow = false;
  return mesh;
}

/**
 * Cuanto sube y baja la superficie del agua, en celdas.
 *
 * TUNE: dos centesimas, seis centimetros. Lo que se ve desde arriba no es la
 * ola: es que la luz cambia al inclinarse la superficie, y con seis centimetros
 * ya cambia. Con mas, el rio parece el mar.
 */
const RIPPLE = 0.02;

/** Cuanto tarda la onda en recorrer una celda, en segundos. */
const RIPPLE_SECONDS = 2.2;

/**
 * La cota del suelo en un punto cualquiera, en celdas.
 *
 * `heightAt` vale para esquinas de celda, que son los vertices de la malla. Un
 * aldeano no anda por las esquinas: anda por el medio, asi que aqui se
 * interpola entre las cuatro que le rodean. Es exactamente la superficie que se
 * dibuja, asi que nadie flota ni se hunde.
 *
 * Se exporta porque en cuanto el suelo dejo de ser plano dejo de valer poner
 * las cosas a cero. Todo lo que pisa el valle pregunta aqui.
 */
export function elevationAt(map: ValleyMap, x: number, z: number): number {
  const cx = Math.floor(x);
  const cz = Math.floor(z);
  const fx = x - cx;
  const fz = z - cz;
  const a = heightAt(map, cx, cz);
  const b = heightAt(map, cx + 1, cz);
  const c = heightAt(map, cx, cz + 1);
  const d = heightAt(map, cx + 1, cz + 1);
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}

export interface Ground {
  readonly mesh: Mesh;
  /** La lamina de agua, o `null` si el mapa no tiene rio. */
  readonly water: Mesh | null;
  /**
   * Hace correr el agua.
   *
   * Un rio quieto es un suelo azul, por bien hecho que este el cauce. Lo que
   * dice que eso es agua y no piedra pintada es que se mueve, y basta con que
   * la superficie se incline un poco para que la luz haga el resto.
   *
   * La hora sale del reloj de presentacion y de nada mas, asi que el mismo
   * instante da siempre la misma onda (§4.3).
   */
  ripple(presentationSeconds: number): void;
  dispose(): void;
}

export function buildGround(map: ValleyMap, palette: Palette): Ground {
  const cells = map.width * map.height;
  const positions = new Float32Array(cells * 4 * 3);
  const colours = new Float32Array(cells * 4 * 3);
  const normals = new Float32Array(cells * 4 * 3);
  const indices = new Uint32Array(cells * 6);
  const tint = new Color();

  for (let cell = 0; cell < cells; cell += 1) {
    const x = cell % map.width;
    const z = Math.floor(cell / map.width);
    tint.set(cellColour(map, cell, palette));
    const shade = 1 + mottleOf(cell);
    const corner = cell * 4;

    // Map (x, y) becomes scene (x, 0, y), per D.4's spatial convention.
    const points = [
      [x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1],
    ] as const;
    for (let vertex = 0; vertex < 4; vertex += 1) {
      const at = (corner + vertex) * 3;
      const px = points[vertex]?.[0] ?? 0;
      const pz = points[vertex]?.[1] ?? 0;
      positions[at] = px;
      positions[at + 1] = GROUND_BIAS + heightAt(map, px, pz);
      positions[at + 2] = pz;
      normals[at] = 0;
      normals[at + 1] = 1;
      normals[at + 2] = 0;
      colours[at] = tint.r * shade;
      colours[at + 1] = tint.g * shade;
      colours[at + 2] = tint.b * shade;
    }

    const face = cell * 6;
    indices[face] = corner;
    indices[face + 1] = corner + 2;
    indices[face + 2] = corner + 1;
    indices[face + 3] = corner;
    indices[face + 4] = corner + 3;
    indices[face + 5] = corner + 2;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('color', new BufferAttribute(colours, 3));
  geometry.setIndex(new BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  // Las normales se recalculan porque el suelo dejo de ser plano en cuanto el
  // rio se hundio: con todas apuntando arriba, la orilla no coge luz y el cauce
  // no se ve.
  geometry.computeVertexNormals();
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'Valley_Ground';
  mesh.receiveShadow = true;

  // El agua cuelga del suelo para que quien pone el suelo en la escena no tenga
  // que saber que ademas hay un rio: se mueven y se sueltan juntos siempre.
  const water = buildWater(map, palette);
  if (water !== null) mesh.add(water);
  // El reposo se guarda una vez: la onda se calcula desde el, no desde donde
  // quedo el fotograma anterior, que acumularia error hasta hundir el rio.
  const still = water === null
    ? null
    : Float32Array.from((water.geometry.getAttribute('position') as BufferAttribute).array);

  return {
    mesh,
    water,
    ripple(presentationSeconds: number): void {
      if (water === null || still === null) return;
      const surface = water.geometry.getAttribute('position') as BufferAttribute;
      const turn = (presentationSeconds / RIPPLE_SECONDS) * Math.PI * 2;
      for (let vertex = 0; vertex < surface.count; vertex += 1) {
        const at = vertex * 3;
        const px = still[at] ?? 0;
        const pz = still[at + 2] ?? 0;
        // La onda viaja en diagonal y lleva dos frecuencias: una sola deja un
        // oleaje de piscina, con dos el patron tarda en repetirse.
        const wave = Math.sin((px + pz) * 1.7 - turn) + 0.5 * Math.sin((px - pz * 1.3) * 0.9 - turn * 0.6);
        surface.setY(vertex, (still[at + 1] ?? 0) + wave * RIPPLE * 0.5);
      }
      surface.needsUpdate = true;
      water.geometry.computeVertexNormals();
    },
    dispose(): void {
      geometry.dispose();
      material.dispose();
      if (water !== null) {
        mesh.remove(water);
        water.geometry.dispose();
        (water.material as MeshStandardMaterial).dispose();
      }
    },
  };
}
