// E3b.1a · La pasarela se deriva de la defensa ya construida, sin guardarla.

import { bastionAccessOf, type BastionAccess, type BastionAccessState } from './bastion-access';
import type { Building } from '../state';

export interface BastionWalkway {
  readonly access: BastionAccess;
  readonly firstWallId: number;
  readonly nextWallId: number;
  readonly side: BastionAccess;
}

function covers(item: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }, x: number, y: number): boolean {
  return x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h;
}

function stoneWallAt(buildings: readonly Building[], x: number, y: number): Building | undefined {
  return buildings.find(building => building.kind === 'wall' && building.lostTick === null
    && building.tier === 1 && building.w === 1 && building.h === 1 && building.x === x && building.y === y);
}

function liveDefenceAt(buildings: readonly Building[], x: number, y: number): boolean {
  return buildings.some(building => building.lostTick === null
    && (building.kind === 'palisade' || building.kind === 'wall' || building.kind === 'gate' || building.kind === 'bastion')
    && covers(building, x, y));
}

/**
 * La salida este local sólo se ofrece sobre dos tramos de piedra rectos.
 * La escalera conserva su selector E3a: aquí no se busca otra orientación.
 */
export function bastionWalkwayOf(state: BastionAccessState, bastion: Building): BastionWalkway | null {
  const access = bastionAccessOf(state, bastion);
  if (access === null) return null;
  const side: BastionAccess = { x: access.z, z: -access.x as -1 | 0 | 1 };
  const first = { x: bastion.x + side.x, y: bastion.y + side.z };
  const next = { x: first.x + side.x, y: first.y + side.z };
  const insideFirst = { x: first.x + access.x, y: first.y + access.z };
  const insideNext = { x: next.x + access.x, y: next.y + access.z };
  const firstWall = stoneWallAt(state.buildings, first.x, first.y);
  const nextWall = stoneWallAt(state.buildings, next.x, next.y);
  if (firstWall === undefined || nextWall === undefined) return null;

  // Una obra comparte volumen aunque sea una mejora de esos mismos muros.
  if (state.works.some(work => covers(work, bastion.x, bastion.y) || covers(work, first.x, first.y)
    || covers(work, next.x, next.y) || covers(work, insideFirst.x, insideFirst.y)
    || covers(work, insideNext.x, insideNext.y))) return null;

  // El tablero y el pretil interior vuelan 0,27 celdas hacia +Z local.
  if (state.buildings.some(building => covers(building, insideFirst.x, insideFirst.y)
    || covers(building, insideNext.x, insideNext.y))) return null;

  // Los vecinos cardinales o diagonales cambian el ensamblado recto del tramo.
  if (liveDefenceAt(state.buildings, first.x + access.x, first.y + access.z)
    || liveDefenceAt(state.buildings, first.x - access.x, first.y - access.z)
    || liveDefenceAt(state.buildings, next.x + access.x, next.y + access.z)
    || liveDefenceAt(state.buildings, next.x - access.x, next.y - access.z)) return null;
  for (const wall of [first, next]) {
    for (const x of [-1, 1] as const) {
      for (const y of [-1, 1] as const) {
        if (liveDefenceAt(state.buildings, wall.x + x, wall.y + y)) return null;
      }
    }
  }
  return { access, firstWallId: firstWall.id, nextWallId: nextWall.id, side };
}
