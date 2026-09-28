// §7.15 · El tablón de misiones de la plaza (28 sep 2026).
//
// Vera: «habrá un cartel en la plaza del pueblo donde se anuncian las
// misiones; al pulsarlo se abrirá una ventana que imita un cartel de madera».
// Es el primer objeto del valle que abre su propia interfaz al tocarlo, y el
// patrón que vendrá para más cosas: la interfaz no aparece hasta que se pulsa.
//
// Dónde está lo dice esto y nada más, para que la vida (que lo rodea) y el
// render (que lo dibuja y lo toca) lean el mismo sitio. En el borde de la
// plaza, **frente a la hoguera** (que está a +1,8/+1,1 del centro,
// `effects/hearth.ts`) y entre dos postes de la fiesta (45° + k·90°), mirando
// al centro.

import type { GameState } from '@engine/state';
import { plazaOf } from './plaza';

/** TUNE: el ángulo desde el centro (desde +X hacia +Z) y la distancia, en celdas. */
export const NOTICE_BOARD = { ANGLE: Math.PI, REACH: 2.6 } as const;

export interface NoticeBoardPlace {
  readonly x: number;
  readonly z: number;
  /** Giro en Y para que la cara (+Z del modelo) mire al centro de la plaza. */
  readonly yaw: number;
  /** La celda que ocupa, que la gente rodea. */
  readonly cell: { readonly x: number; readonly y: number };
}

/** El sitio del tablón en la plaza de este valle. */
export function noticeBoardOf(state: Pick<GameState, 'plaza'>): NoticeBoardPlace {
  const plaza = plazaOf(state as GameState);
  const x = plaza.x + Math.cos(NOTICE_BOARD.ANGLE) * NOTICE_BOARD.REACH;
  const z = plaza.y + Math.sin(NOTICE_BOARD.ANGLE) * NOTICE_BOARD.REACH;
  // En Three, girar `yaw` en Y lleva el +Z local a (sin, cos): que apunte al centro.
  const yaw = Math.atan2(plaza.x - x, plaza.y - z);
  return { x, z, yaw, cell: { x: Math.floor(x), y: Math.floor(z) } };
}
