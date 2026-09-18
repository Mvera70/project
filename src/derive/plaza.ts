// P-2 · La plaza, traducida para quien la dibuja. `docs/task-log.md` §4.0b.
//
// El render no puede importar del motor (`CLAUDE.md`, las cuatro capas) y el
// motor no sabe que hay una pantalla, así que el radio de la plaza —que es una
// constante de balance, `PLAZA.RADIUS`— cruza por aquí, igual que `anchors.ts`
// traduce el centro de lo construido. Una función pura y nada más.

import { PLAZA } from '@engine/balance';
import { plazaCentre } from '@engine/world/plaza';
import type { GameState } from '@engine/state';

export interface PlazaPatch {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

/**
 * Dónde está la plaza de este valle y cuánto mide, en celdas.
 *
 * Devuelve el **centro geométrico** —el medio de la celda que el estado
 * guarda— porque es lo que quien dibuja necesita: el empedrado se mide desde
 * ahí y la fuente se pone ahí.
 */
export function plazaOf(state: GameState): PlazaPatch {
  const at = plazaCentre(state.plaza);
  return { x: at.x, y: at.y, radius: PLAZA.RADIUS };
}

/** La celda de la fuente, que es la que no se pisa. */
export function plazaCell(state: GameState): { x: number; y: number } {
  return { x: state.plaza.x, y: state.plaza.y };
}
