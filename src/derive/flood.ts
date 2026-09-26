// La riada, como la pantalla la necesita. 26 sep 2026.
//
// El motor apunta la riada (R-1, `river_flood`) en `state.happenings` con su
// semana, y se lleva el grano; hasta hoy la pantalla sólo enseñaba a la gente
// reunida en el vado. Esto dice cuánto sube el agua: del todo la semana de la
// riada, a medias la siguiente mientras baja, y nada después. Puro.

import type { GameState } from '@engine/state';

/** Lo crecido que va el río esta semana, de 0 a 1. */
export function floodOf(state: Readonly<GameState>): number {
  let level = 0;
  for (let i = state.happenings.length - 1; i >= 0; i -= 1) {
    const happening = state.happenings[i]!;
    if (happening.tick < state.tick - 1) break;
    if (happening.id !== 'river_flood') continue;
    level = Math.max(level, happening.tick === state.tick ? 1 : 0.5);
  }
  return level;
}
