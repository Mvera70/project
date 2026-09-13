// §11.1.1 · La tira de la aldea. design.md §11.1.1, §5.3, §5.5.
//
// Cuatro cifras y sólo cuatro, porque son las cuatro que deciden si la aldea
// vive: la gente es el juego, la comida es la muerte por hambre de §5.3, la
// leña es el invierno de §5.5 y las obras de §7.3, y el ánimo mueve la
// migración de §5.7 y el peso de las encrucijadas de §8.
//
// **La comida va en semanas y no en unidades.** La unidad de grano es «una
// persona una semana» (§12), así que lo que el jugador decide con ella es
// cuántas semanas aguanta la aldea: la división la hace el juego en vez de
// pedírsela a él. Es la misma cifra, dicha en lo que significa.
//
// Aquí no hay oro ni piedra, y no por falta de sitio: no existen. El comercio
// de §8 es trueque y la piedra de §7.2 se convierte en puntos de obra sin
// almacenarse nunca. Un contador de monedas sería un número inventado.

import { FOOD } from '@engine/balance';
import { population } from '@engine/people/demography';
import type { GameState } from '@engine/state';

export interface Vitals {
  people: number;
  /** Semanas de comida que quedan al ritmo de hoy. */
  weeks: number;
  wood: number;
  /** 0..100. */
  morale: number;
}

/**
 * Las cuatro cifras, leídas del estado y sin tocarlo.
 *
 * Función pura: el mismo estado da la misma tira, y dibujarla no mueve nada
 * (§4.3). Las semanas se truncan hacia abajo porque media semana de comida no
 * es media semana de vida: es una semana en la que se pasa hambre.
 */
export function vitalsOf(state: GameState): Vitals {
  const people = population(state);
  const eaten = people * FOOD.GRAIN_PER_PERSON;
  return {
    people,
    weeks: eaten <= 0 ? 0 : Math.floor(state.village.grain / eaten),
    wood: Math.floor(state.village.wood),
    morale: Math.round(state.village.morale),
  };
}
