// D4 · El cuerpo a cuerpo en la muralla. design.md §1b, fase 4.
//
// **Es lo que hace que defender cueste.** Hasta aquí la batalla era de un solo
// sentido: las flechas de D2 salían de la muralla y la partida de D3b golpeaba
// una puerta, pero nadie tocaba a los que defendían y el parte de B4 informaba
// `lost: 0` siempre. Un asedio en el que sólo muere el que ataca no es un
// asedio, es una diana.
//
// **Lo que decide es la distancia, y nada más.** Un saqueador que llega al
// alcance de un brazo deja de ser un blanco y pasa a ser un problema: golpea a
// quien tenga delante. Y el que defiende le devuelve el golpe, con lo que
// tenga. No hay tiradas, no hay iniciativa y no hay turnos: hay dos cuerpos a
// una distancia y un reloj de golpes, que es lo que §1b pide —«que haya física
// entre los muñecos»— con la maquinaria que esta capa ya tiene.
//
// **Y no escribe en el motor.** A quien cae se le marca aquí; el motor lo
// entierra cuando lee el parte (B4, `lost`), que es la única puerta. Es la misma
// regla que ya cumple todo lo demás de esta capa (E.3).
//
// Lo que esta ronda **no** hace, y queda anotado en `encargos-3d.md`: el
// ragdoll —los cuerpos de la gente todavía no son cuerpos de Rapier, y eso es
// una tanda entera—, el clip del golpe (E1 pide `spear_thrust` y `hit_take`) y
// cómo se ve morir, que es decisión del dueño (E4).

import type { Manned } from './garrison';
import type { Raider } from './raiders';

/** Lo que hace falta saber de quien defiende un puesto, sin conocer `Dweller`. */
export interface Defender {
  /** El cuerpo, para medir distancias. */
  readonly at: { readonly x: number; readonly z: number };
  /** Qué puesto ocupa: con lanza se pelea mejor que con un arco tensado. */
  readonly post: Manned;
  /** Los golpes que lleva encima. */
  hits: number;
  /** Si ya ha caído. La jornada lo deja en el suelo; el motor lo entierra. */
  down: boolean;
}

/**
 * El alcance de un golpe, en celdas.
 *
 * TUNE: 0,9, o sea dos metros y medio: un brazo con lo que lleve en la mano.
 * **Y es mucho menos que el alcance del golpe al portón** (2,6) a propósito:
 * contra una puerta empuja el grupo entero, y contra un hombre pega el que lo
 * tiene delante. Que los dos números fueran el mismo convertiría cualquier
 * asalto en una pelea de doce contra uno desde el primer paso.
 */
const REACH = 0.9;

/**
 * Cada cuántos pasos se da un golpe, y cuántos aguanta una persona.
 *
 * TUNE: un golpe cada medio segundo (quince pasos) y tres golpes para caer, y
 * los dos salen de lo que ya hay medido: el portón recibe un golpe por hombre y
 * por segundo, y un hombre se mueve más deprisa que una puerta. Tres golpes
 * son un segundo y medio de pelea perdida, que a la escala de esta escena —una
 * jornada son ciento veinte segundos— es un intercambio y no un desmayo.
 *
 * Y el que defiende con **lanza** pega igual que el que ataca; el **arquero**
 * pega la mitad de veces, porque está soltando un arco cuando le llegan encima.
 * Es el defecto clásico del arquero y es el que hace que una muralla necesite
 * las dos cosas (C1: lanzas **y** arcos).
 */
const BLOW_STEPS = 15;
const BLOWS_TO_FALL = 3;
const ARCHER_PENALTY = 2;

/**
 * Un paso de cuerpo a cuerpo.
 *
 * Empareja por cercanía: cada saqueador que tenga un defensor al alcance pega,
 * y el defensor le devuelve. Nada de esto ordena a nadie ir a ningún sitio —la
 * partida ya va a por la puerta (D3b) y los defensores ya están en sus puestos
 * (C2)— así que lo que hace esta función es **lo que pasa cuando se encuentran**.
 */
export function stepMelee(
  raiders: readonly Raider[],
  defenders: readonly Defender[],
  step: number,
): void {
  if (step % BLOW_STEPS !== 0) return;
  for (const raider of raiders) {
    if (raider.phase === 'gone' || raider.phase === 'down') continue;
    // El más cercano al alcance. Uno por golpe: nadie pega a dos a la vez.
    let target: Defender | null = null;
    let best = REACH;
    for (const defender of defenders) {
      if (defender.down) continue;
      const gap = Math.hypot(defender.at.x - raider.body.x, defender.at.z - raider.body.z);
      if (gap >= best) continue;
      best = gap;
      target = defender;
    }
    if (target === null) continue;

    target.hits += 1;
    if (target.hits >= BLOWS_TO_FALL) target.down = true;

    // **Y le devuelve el golpe.** El arquero, la mitad de veces: tensar un arco
    // con alguien encima es lo que le pasa a un arquero.
    const slower = target.post.post.arm === 'bow' && step % (BLOW_STEPS * ARCHER_PENALTY) !== 0;
    if (slower) continue;
    raider.hits += 1;
    if (raider.hits >= BLOWS_TO_FALL) {
      raider.phase = 'down';
      raider.body.vx = 0;
      raider.body.vz = 0;
    }
  }
}

/** Cuántos de los nuestros han caído. Es el `lost` del parte de B4. */
export function fallenDefenders(defenders: readonly Defender[]): number {
  return defenders.filter((defender) => defender.down).length;
}
