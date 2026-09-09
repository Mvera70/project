// M-36 · Lo que la aldea hace cuando pasa algo. design.md §11.9.
//
// El valle tenía sucesos y no tenía reacciones. Ardía una casa y la gente
// seguía camino del campo; se moría alguien y nadie levantaba la cabeza. Una
// aldea que no se entera de lo que le pasa no parece una aldea.
//
// Esto no inventa un suceso: lee los que el estado ya guarda y que ocurrieron
// **esta misma semana**. Un edificio con `lostTick` igual al tick de hoy es un
// edificio que se acaba de perder; un aldeano con `diedTick` de hoy es alguien
// a quien están enterrando ahora. No hace falta nada más, y por eso esto es
// derivado como todo lo demás: ni estado, ni azar, ni memoria entre pintadas.

import type { GameState } from '@engine/state';
import { standing, valleyCore } from './anchors';

export interface Reaction {
  x: number;
  y: number;
  /** Qué la provocó, por si el dibujo quiere distinguirlas algún día. */
  cause: 'loss' | 'death';
}

/**
 * Lo que ha pasado esta semana y merece que la aldea deje lo que estaba
 * haciendo.
 *
 * Se devuelve en orden de peso: una pérdida material se ve donde ocurrió, y una
 * muerte lleva a la gente al cementerio si lo hay, o al centro del pueblo si
 * todavía no lo han levantado.
 */
export function reactionsAt(state: GameState): Reaction[] {
  const out: Reaction[] = [];

  for (const building of state.buildings) {
    if (building.lostTick !== state.tick) continue;
    out.push({
      x: building.x + building.w * 0.5,
      y: building.y + building.h * 0.5,
      cause: 'loss',
    });
  }

  const buried = state.people.villagers.some((v) => v.diedTick === state.tick && v.named);
  if (buried) {
    const yard = standing(state, 'grave_yard')[0];
    const at = yard === undefined
      ? valleyCore(state)
      : { x: yard.x + yard.w * 0.5, y: yard.y + yard.h * 0.5 };
    out.push({ x: at.x, y: at.y, cause: 'death' });
  }

  return out;
}
