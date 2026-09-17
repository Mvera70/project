import { visibleBuildings } from '@derive/visible-buildings';
import { TRAITS, WORLD } from '@engine/balance';
import { TERRAIN_CODE, type GameState } from '@engine/state';

export type ForestState = Pick<GameState, 'map' | 'buildings' | 'works' | 'traits'>;

export interface ForestLook {
  readonly cell: number;
  readonly stage: 'standing' | 'stump' | 'regrowth';
  /** Escala de la copa. El tronco adulto conserva siempre su huella. */
  readonly crown: number;
  /** Escala completa, usada sólo por el plantón transitable. */
  readonly size: number;
}

function occupiedCells(state: ForestState): Set<number> {
  const occupied = new Set<number>();
  for (const box of [...visibleBuildings(state), ...state.works]) {
    for (let z = box.y; z < box.y + box.h; z += 1) {
      for (let x = box.x; x < box.x + box.w; x += 1) {
        occupied.add(z * state.map.width + x);
      }
    }
  }
  return occupied;
}

function forestNeighbours(state: ForestState, cell: number): number {
  const { width, height, terrain } = state.map;
  const x = cell % width;
  const z = Math.floor(cell / width);
  let count = 0;
  if (x > 0 && terrain[cell - 1] === TERRAIN_CODE.forest) count += 1;
  if (x + 1 < width && terrain[cell + 1] === TERRAIN_CODE.forest) count += 1;
  if (z > 0 && terrain[cell - width] === TERRAIN_CODE.forest) count += 1;
  if (z + 1 < height && terrain[cell + width] === TERRAIN_CODE.forest) count += 1;
  return count;
}

/**
 * Aspecto forestal derivado del estado persistente, sin inventario paralelo.
 *
 * Una celda adulta conserva tronco y obstáculo mientras le quede madera. La
 * copa pierde volumen en cuatro pasos para que el tajo avance sin hacer que el
 * árbol entero encoja dentro de una colisión invisible. Los claros sólo muestran
 * un tocón durante el primer año y luego un plantón cuando cumplen ya las mismas
 * tres vecinas que exige el motor; ambos son transitables y desaparecen cuando
 * `terrain` vuelve realmente a `forest`.
 */
export function forestLooks(
  state: ForestState,
  suppressed: ReadonlySet<number> = new Set(),
): ForestLook[] {
  const occupied = occupiedCells(state);
  const oldCapacity = Math.round(WORLD.WOOD_PER_FOREST_TILE * TRAITS.OLD_FOREST_WOOD);
  const looks: ForestLook[] = [];
  for (let cell = 0; cell < state.map.terrain.length; cell += 1) {
    if (occupied.has(cell) || suppressed.has(cell)) continue;
    const terrain = state.map.terrain[cell];
    const age = state.map.forestAge[cell] as number;
    if (terrain === TERRAIN_CODE.forest && (state.map.forestStock[cell] as number) > 0) {
      const capacity = age === WORLD.VIRGIN_FOREST && state.traits.includes('old_forest')
        ? oldCapacity : WORLD.WOOD_PER_FOREST_TILE;
      const ratio = Math.max(0, Math.min(1, (state.map.forestStock[cell] as number) / capacity));
      const crown = ratio > 0.75 ? 1 : ratio > 0.5 ? 0.88 : ratio > 0.25 ? 0.75 : 0.62;
      looks.push({ cell, stage: 'standing', crown, size: 1 });
      continue;
    }
    if (terrain !== TERRAIN_CODE.cleared) continue;
    if (age === 0) {
      looks.push({ cell, stage: 'stump', crown: 1, size: 1 });
      continue;
    }
    if (age === WORLD.BARREN_CLEARING
      || forestNeighbours(state, cell) < WORLD.FOREST_REGROWTH_NEIGHBOURS) continue;
    const progress = Math.min(WORLD.FOREST_REGROWTH_YEARS - 1, age)
      / WORLD.FOREST_REGROWTH_YEARS;
    looks.push({ cell, stage: 'regrowth', crown: 1, size: 0.18 + progress * 0.78 });
  }
  return looks;
}

/** Firma cuantizada: cambia de etapa, no por cada astilla extraída. */
export function forestSignature(state: ForestState): number {
  let hash = 2_166_136_261;
  for (const look of forestLooks(state)) {
    hash = Math.imul(hash ^ look.cell, 16_777_619);
    hash = Math.imul(hash ^ (look.stage === 'standing' ? 1 : look.stage === 'stump' ? 2 : 3), 16_777_619);
    hash = Math.imul(hash ^ Math.round(look.crown * 100), 16_777_619);
    hash = Math.imul(hash ^ Math.round(look.size * 100), 16_777_619);
  }
  return hash >>> 0;
}
