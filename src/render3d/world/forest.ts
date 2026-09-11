// G-10, lote del mundo · El bosque. design.md D.8, D.9.
//
// Un valle maduro tiene varios cientos de celdas de bosque. Un árbol por celda
// como objeto suelto serían varios cientos de llamadas de dibujo, y D.9 nombra
// este caso concreto: **instanciar árboles**. Una malla por material, y cada
// árbol es una matriz dentro de ella. Trescientos árboles cuestan tres llamadas.
//
// Dónde va cada uno sale de su celda y de nada más. §4.3 prohíbe que el render
// consuma azar, y además un bosque que se resembrara en cada fotograma sería
// peor que uno alineado: aquí el mismo valle da siempre el mismo bosque.

import {
  InstancedMesh, Group, Matrix4, Quaternion, Vector3,
  type BufferGeometry, type Material, type Object3D,
} from 'three';
import type { ValleyMap } from '@engine/state';
import { TERRAIN_CODE } from '@engine/state';

/**
 * Cuántos árboles caben en una celda de bosque.
 *
 * TUNE: uno. Una copa mide casi tres celdas de ancho, así que uno por celda ya
 * se solapa con sus vecinos y lee como espesura. Dos por celda no añadían
 * bosque, añadían triángulos.
 */
const PER_CELL = 1;

/** Cuánto varía el tamaño de un árbol al siguiente, en tanto por uno. */
const SIZE_SPREAD = 0.28;

/** Cuánto se aparta del centro de su celda, en celdas. */
const JITTER = 0.34;

function stable(cell: number, salt: number): number {
  const mixed = Math.imul(cell * 73_856_093 + salt * 19_349_663, 2_654_435_761) >>> 0;
  return (mixed % 100_003) / 100_003;
}

export interface Piece {
  readonly geometry: BufferGeometry;
  readonly material: Material;
}

/** Las mallas de un recurso, aplanadas y con su transformación ya incorporada. */
export function piecesOf(source: Object3D): Piece[] {
  const pieces: Piece[] = [];
  source.updateMatrixWorld(true);
  source.traverse((object) => {
    const mesh = object as Object3D & { isMesh?: boolean; geometry?: BufferGeometry; material?: Material };
    if (mesh.isMesh !== true || mesh.geometry === undefined || mesh.material === undefined) return;
    // La geometría se clona con la transformación del nodo aplicada, para que
    // la instancia sólo tenga que colocar el árbol entero.
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    pieces.push({ geometry, material: mesh.material });
  });
  return pieces;
}

export interface Forest {
  readonly group: Group;
  /** Cuántos árboles hay plantados. */
  readonly count: number;
  dispose(): void;
}

/**
 * Planta un árbol en cada celda de bosque del mapa.
 *
 * Se rehace cuando el suelo cambia, que es cuando alguien tala: unas pocas veces
 * al año, no sesenta veces por segundo.
 */
export function buildForest(map: ValleyMap, tree: Object3D): Forest {
  return scatterOn(map, tree, TERRAIN_CODE.forest);
}

/**
 * Lo mismo para cualquier terreno: un recurso repetido sobre las celdas de un
 * tipo. Los arboles sobre el bosque y las rocas sobre la roca son el mismo
 * problema, y separarlos habria sido tener dos veces la misma cuenta.
 */
export function scatterOn(map: ValleyMap, source: Object3D, terrain: number): Forest {
  const cells: number[] = [];
  for (let cell = 0; cell < map.terrain.length; cell += 1) {
    if (map.terrain[cell] === terrain) cells.push(cell);
  }
  return scatterCells(map, source, cells);
}

/**
 * Las celdas de prado que tocan el agua, que es donde crecen los juncos.
 *
 * La orilla no es un terreno: el mapa no la nombra y no tiene por que. Es la
 * frontera entre dos que si nombra, y sale de mirar los cuatro vecinos.
 */
export function shoreCells(map: ValleyMap): number[] {
  const cells: number[] = [];
  for (let cell = 0; cell < map.terrain.length; cell += 1) {
    if (map.terrain[cell] !== TERRAIN_CODE.meadow) continue;
    // Nada crece en mitad de un camino pisado.
    if ((map.path[cell] ?? 0) > 0) continue;
    const x = cell % map.width;
    const wet = [
      x > 0 ? cell - 1 : -1,
      x < map.width - 1 ? cell + 1 : -1,
      cell - map.width,
      cell + map.width,
    ].some((side) => side >= 0 && map.terrain[side] === TERRAIN_CODE.water);
    if (wet) cells.push(cell);
  }
  return cells;
}

/** Lo mismo sobre una lista de celdas ya elegida. */
export function scatterCells(map: ValleyMap, source: Object3D, cells: readonly number[]): Forest {
  const tree = source;
  const group = new Group();
  group.name = 'Valley_Forest';
  const pieces = piecesOf(tree);
  const owned: InstancedMesh[] = [];
  const total = cells.length * PER_CELL;

  if (total > 0) {
    const matrix = new Matrix4();
    const position = new Vector3();
    const turn = new Quaternion();
    const size = new Vector3();
    const up = new Vector3(0, 1, 0);

    for (const piece of pieces) {
      const instanced = new InstancedMesh(piece.geometry, piece.material, total);
      instanced.castShadow = true;
      instanced.receiveShadow = true;
      let slot = 0;
      for (const cell of cells) {
        for (let extra = 0; extra < PER_CELL; extra += 1) {
          const salt = extra * 977;
          const x = (cell % map.width) + 0.5 + (stable(cell, salt + 1) - 0.5) * 2 * JITTER;
          const z = Math.floor(cell / map.width) + 0.5 + (stable(cell, salt + 2) - 0.5) * 2 * JITTER;
          const scale = 1 + (stable(cell, salt + 3) - 0.5) * 2 * SIZE_SPREAD;
          position.set(x, 0, z);
          // Girar cada uno lo suyo: una copa asimétrica repetida sin girar deja
          // un patrón que se ve desde arriba como un papel pintado.
          turn.setFromAxisAngle(up, stable(cell, salt + 4) * Math.PI * 2);
          size.set(scale, scale, scale);
          matrix.compose(position, turn, size);
          instanced.setMatrixAt(slot, matrix);
          slot += 1;
        }
      }
      instanced.instanceMatrix.needsUpdate = true;
      instanced.computeBoundingSphere();
      group.add(instanced);
      owned.push(instanced);
    }
  }

  return {
    group,
    count: total,
    dispose(): void {
      for (const instanced of owned) {
        group.remove(instanced);
        instanced.dispose();
        // La geometría es una copia nuestra y se suelta. El material es del
        // recurso compartido y no: soltarlo dejaría sin material a cualquier
        // otro que estuviera usando el mismo árbol.
        instanced.geometry.dispose();
      }
      owned.length = 0;
    },
  };
}
