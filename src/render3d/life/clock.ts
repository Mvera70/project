// V-01 · El reloj de la vida. design.md Anexo E.
//
// **La capa que faltaba tiene que correr a paso fijo, y esto es el paso.**
//
// Los tres relojes del juego, para no confundirlos nunca más:
//
// | | Manda sobre | Ritmo |
// |---|---|---|
// | El tick (§4.2) | quién nace, quién muere, cuánto grano | una semana |
// | La jornada (D.6) | qué hora es en el valle | 120 s escénicos |
// | **La vida (esto)** | dónde está cada cuerpo ahora | 1/30 s escénico |
//
// El de arriba es del motor y no se toca. El de en medio ya existe
// (`presentation-clock.ts`). Éste es el de abajo, y su único trabajo es convertir
// «han pasado 16 milisegundos de pantalla» en «da tres pasos» sin perder ni
// doblar ninguno.
//
// Suena a contabilidad y es la pieza de la que cuelga todo lo demás: si el paso
// no es fijo, dos móviles con distinta tasa de refresco ven dos aldeas
// distintas, y no hay forma de reproducir nada.

import { hash32 } from '@engine/rng';

/**
 * El paso de la vida, en segundos escénicos.
 *
 * TUNE: 1/30. Treinta pasos por segundo escénico es el doble de lo que la vista
 * distingue en un cuerpo que anda, y a la vez lo bastante fino para que una
 * colisión se resuelva antes de verse. Medido en el descarte: con ochenta
 * cuerpos en el valle real, un paso cuesta 236 µs contra los 33 000 de
 * presupuesto — el 0,7 %.
 */
export const LIFE_STEP = 1 / 30;

/**
 * Cuántos pasos puede dar un fotograma antes de rendirse.
 *
 * Un móvil que se atraganta no puede tragarse media jornada de golpe y quedarse
 * colgado: prefiere perder tiempo escénico y seguir respondiendo. Ocho segundos
 * escénicos de una sentada es más de lo que ningún fotograma honrado necesita.
 */
const MAX_STEPS_PER_FRAME = 240;

/**
 * Cuántos pasos tiene una jornada entera.
 *
 * El número que hace viable no guardar nada: reconstruir la jornada desde su
 * amanecer cuesta 8 ms medidos, contra los 120 de presupuesto. Por eso la capa
 * de vida puede ser efímera y por eso no puede corromper una partida.
 */
export const STEPS_PER_DAY = 3600;

export interface LifeClock {
  /**
   * Adelanta la vida el tiempo escénico que se le diga.
   *
   * Devuelve cuántos pasos ha dado. El resto que no llega a un paso se guarda
   * para el fotograma siguiente, que es lo que hace que treinta fotogramas por
   * segundo y sesenta den exactamente la misma aldea.
   */
  advance(scenicSeconds: number, step: (n: number) => void): number;
  /**
   * Lleva la vida hasta el paso que se diga, viviéndola.
   *
   * Es la cura del letargo: en vez de guardar dónde estaba todo el mundo, se
   * vuelve a vivir el día desde el amanecer. Si ya se pasó de ese paso —porque
   * la jornada es otra— no hace nada y el llamante debe reiniciar.
   */
  rebuildTo(steps: number, step: (n: number) => void): number;
  /** Empieza una jornada de cero. El resto acumulado se tira. */
  reset(): void;
  /** Pasos dados desde el último `reset`. Es el reloj de esta capa. */
  readonly steps: number;
  /** Tiempo escénico que ha vivido la vida, en segundos. */
  readonly seconds: number;
}

export function createLifeClock(): LifeClock {
  let steps = 0;
  let carry = 0;

  return {
    get steps(): number {
      return steps;
    },

    get seconds(): number {
      return steps * LIFE_STEP;
    },

    reset(): void {
      steps = 0;
      carry = 0;
    },

    advance(scenicSeconds: number, step: (n: number) => void): number {
      // Un delta negativo o absurdo no retrocede la vida: la deja quieta. El
      // tiempo de esta capa sólo va hacia delante, y quien quiera volver atrás
      // reconstruye.
      //
      // **Y un número que no es un número se descarta, no se suma.**
      // `Math.max(0, NaN)` es `NaN`, así que sumarlo envenenaba el acumulador
      // para siempre: el reloj se quedaba parado y nada volvía a moverse. Un
      // delta llega de restar dos marcas de tiempo, y ahí un `NaN` es una
      // marca que faltaba, no una orden de detener el valle.
      carry += Number.isFinite(scenicSeconds) ? Math.max(0, scenicSeconds) : 0;
      let given = 0;
      while (carry >= LIFE_STEP && given < MAX_STEPS_PER_FRAME) {
        step(steps);
        steps += 1;
        given += 1;
        carry -= LIFE_STEP;
      }
      // Si se llegó al tope, lo que sobra se tira en vez de arrastrarse: el
      // fotograma siguiente no debe heredar una deuda que no va a poder pagar,
      // porque entonces la deuda crece sola y el valle se queda a cámara lenta
      // para siempre.
      if (given >= MAX_STEPS_PER_FRAME) carry = 0;
      return given;
    },

    rebuildTo(target: number, step: (n: number) => void): number {
      if (target < steps) return 0;
      let given = 0;
      while (steps < target) {
        step(steps);
        steps += 1;
        given += 1;
      }
      carry = 0;
      return given;
    },
  };
}

/**
 * La semilla de una jornada.
 *
 * **Del día y no del reloj de la pared**, que es lo que permite reconstruirla:
 * vivir el mismo día dos veces da la misma aldea, esté el jugador mirando o
 * acabe de volver de un letargo de cuatro horas.
 *
 * Flujo propio, derivado de la semilla maestra. §4.3 sigue en pie: la vida no
 * toca el azar del motor, así que tener la pestaña abierta más rato no desplaza
 * una sola tirada de la simulación.
 */
export function seedOfDay(seed: number, day: number): number {
  return hash32(seed, `life:${day}`);
}

/**
 * En qué paso de su jornada está el valle a esta hora.
 *
 * Traduce la fase de D.6 —cero al amanecer, uno a la noche— al reloj de esta
 * capa. Es lo que `rebuildTo` necesita cuando hay que alcanzar el presente
 * viviéndolo.
 */
export function stepOfPhase(phase: number): number {
  const wrapped = ((phase % 1) + 1) % 1;
  return Math.floor(wrapped * STEPS_PER_DAY);
}
