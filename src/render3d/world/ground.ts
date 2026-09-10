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
  BufferAttribute, BufferGeometry, Color, Mesh, MeshStandardMaterial,
} from 'three';
import type { ValleyMap } from '@engine/state';
import { GROUND_BIAS, PATH_COLOURS, TERRAIN_COLOURS, VALLEY_COLOURS } from '../visual-config';

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

/** The colour of one cell: its terrain, or the path worn over it. */
export function cellColour(map: ValleyMap, cell: number): string {
  const path = PATH_COLOURS[map.path[cell] ?? 0];
  if (path !== null && path !== undefined) return path;
  return TERRAIN_COLOURS[map.terrain[cell] ?? 0] ?? VALLEY_COLOURS.ground;
}

export interface Ground {
  readonly mesh: Mesh;
  dispose(): void;
}

export function buildGround(map: ValleyMap): Ground {
  const cells = map.width * map.height;
  const positions = new Float32Array(cells * 4 * 3);
  const colours = new Float32Array(cells * 4 * 3);
  const normals = new Float32Array(cells * 4 * 3);
  const indices = new Uint32Array(cells * 6);
  const tint = new Color();

  for (let cell = 0; cell < cells; cell += 1) {
    const x = cell % map.width;
    const z = Math.floor(cell / map.width);
    tint.set(cellColour(map, cell));
    const shade = 1 + mottleOf(cell);
    const corner = cell * 4;

    // Map (x, y) becomes scene (x, 0, y), per D.4's spatial convention.
    const points = [
      [x, z], [x + 1, z], [x + 1, z + 1], [x, z + 1],
    ] as const;
    for (let vertex = 0; vertex < 4; vertex += 1) {
      const at = (corner + vertex) * 3;
      positions[at] = points[vertex]?.[0] ?? 0;
      positions[at + 1] = GROUND_BIAS;
      positions[at + 2] = points[vertex]?.[1] ?? 0;
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

  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'Valley_Ground';
  mesh.receiveShadow = true;

  return {
    mesh,
    dispose(): void {
      geometry.dispose();
      material.dispose();
    },
  };
}
