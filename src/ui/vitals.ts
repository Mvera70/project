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

/**
 * Hacia dónde va una cifra. E4 de `docs/plan-juego.md`.
 *
 * **La mitad que faltaba para que un número signifique algo.** «Comida 40» es
 * ruido: cuarenta semanas subiendo es una aldea que va bien y cuarenta bajando
 * es una aldea que se está comiendo la reserva, y son la misma cifra en
 * pantalla. Con la dirección puesta, el jugador puede atribuir —la comida baja
 * **porque** mandé las manos al bosque— y eso es el cierre del bucle: no hace
 * falta explicarle el juego si el juego le contesta.
 *
 * `steady` cuando no se mueve, que en un idle es la mayoría del tiempo y por eso
 * no se dibuja nada.
 */
export type Trend = 'up' | 'down' | 'steady';

/**
 * Una muestra de la tira, para comparar contra ella.
 *
 * La dirección se mide contra **un mes y no contra la semana anterior**: el
 * grano baja cada semana y sube de golpe en la cosecha, así que una flecha
 * semanal apuntaría hacia abajo once meses al año y no diría nada. Cuatro
 * semanas es el horizonte en el que una decisión del jugador ya se ve.
 */
export const TREND_WEEKS = 4;

/** La dirección de cada cifra entre dos muestras, con el mes de por medio. */
export function trendsOf(now: Vitals, then: Vitals): Record<keyof Vitals, Trend> {
  const of = (a: number, b: number): Trend => (a === b ? 'steady' : a > b ? 'up' : 'down');
  return {
    people: of(now.people, then.people),
    weeks: of(now.weeks, then.weeks),
    wood: of(now.wood, then.wood),
    morale: of(now.morale, then.morale),
  };
}

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
