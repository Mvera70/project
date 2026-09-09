// M-32 · Los puntos del valle a los que se agarra lo que se dibuja.
//
// `standing` y `core` vivían privados dentro de `animals.ts`. Al necesitarlos
// también las reuniones de §11.8 tocaba elegir entre duplicarlos o sacarlos, y
// duplicar dos funciones de tres líneas es cómo empiezan a divergir: el día que
// una cuente los edificios perdidos y la otra no, los animales y la gente
// estarán mirando a valles distintos.

import type { Building, GameState } from '@engine/state';

/** Los edificios de un tipo que siguen en pie. */
export function standing(state: GameState, kind: Building['kind']): Building[] {
  return state.buildings.filter((b) => b.kind === kind && b.lostTick === null);
}

/** El centro de la aldea, la misma cifra que usan §11.5 y los leñadores. */
export function valleyCore(state: GameState): { x: number; y: number } {
  const live = state.buildings.filter((b) => b.lostTick === null);
  if (live.length === 0) return { x: state.map.width / 2, y: state.map.height / 2 };
  return {
    x: live.reduce((n, b) => n + b.x + b.w / 2, 0) / live.length,
    y: live.reduce((n, b) => n + b.y + b.h / 2, 0) / live.length,
  };
}
