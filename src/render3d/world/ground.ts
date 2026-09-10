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
function heightAt(map: ValleyMap, x: number, z: number): number {
  let total = 0;
  let seen = 0;
  for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]] as const) {
    const cx = x + dx;
    const cz = z + dz;
    if (cx < 0 || cz < 0 || cx >= map.width || cz >= map.height) continue;
    total += RELIEF[map.terrain[cz * map.width + cx] ?? 0] ?? 0;
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

export interface Ground {
  readonly mesh: Mesh;
  /** La lamina de agua, o `null` si el mapa no tiene rio. */
  readonly water: Mesh | null;
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

  return {
    mesh,
    water,
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
