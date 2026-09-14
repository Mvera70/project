// §11.1.1 · Lo que cada uno está viviendo esta semana. design.md §11.1.1, §6.4.
//
// La tabla de §11.1 dice cómo se lee el estado de la *aldea* en el valle: el
// granero medio lleno, las velas de la capilla, el humo de las chimeneas. Lo
// que no dice en ninguna de sus filas es qué le pasa a **una persona**. Dos
// vecinos que se odian desde hace diez años se cruzan en el campo y no se nota
// nada; alguien entierra a un hijo y sigue cavando igual que ayer.
//
// Esto es lo que va en la burbuja sobre su cabeza, y **sale sólo de estado con
// fecha**: un rencor tiene semana de formación, una muerte tiene tick, un
// nacimiento también. Nada de esto se guarda, nada consume azar (§4.3) y nada
// se inventa: si el estado no lo dice, no hay burbuja.
//
// La charla no está aquí. Quién se para con quién lo deciden los encuentros de
// §11.9, que el render ya deriva para mover a la gente, y por eso la pone quien
// dibuja en vez de repetirse el cálculo.

import { BUBBLE } from '@engine/balance';
import type { GameState, VillagerId } from '@engine/state';
import { isHere } from '@engine/people/demography';

/**
 * Qué está viviendo alguien, de lo más suyo a lo más de todos.
 *
 * El orden de esta lista **es la prioridad**, y por eso está en este orden:
 * quien acaba de enterrar a un hijo no enseña que tiene hambre. Una persona
 * lleva una burbuja o ninguna, nunca dos.
 */
export const MOODS = ['grief', 'birth', 'quarrel'] as const;
export type Mood = (typeof MOODS)[number];

/** Si algo que pasó en `then` sigue estando fresco en `tick`. */
function fresh(tick: number, then: number): boolean {
  return then <= tick && tick - then < BUBBLE.WEEKS;
}

/**
 * Lo que está viviendo cada uno ahora mismo.
 *
 * Función pura del estado: el mismo tick da siempre las mismas caras, en esta
 * máquina y en la de al lado. Sólo devuelve a los que llevan algo; quien no
 * sale de aquí no lleva burbuja, que es el caso de casi toda la aldea casi
 * todo el tiempo y así debe ser: si todo el mundo lleva una, no dice nada.
 */
export function moodsFor(state: GameState): Map<VillagerId, Mood> {
  const out = new Map<VillagerId, Mood>();
  const here = state.people.villagers.filter(isHere);
  if (here.length === 0) return out;

  // **Nada de lo que le pasa a la aldea entera va aquí**, y se probó al revés:
  // con un brote puesto, los cuarenta llevaban una cruz sobre la cabeza y la
  // pantalla dejaba de decir nada. La peste y el hambre son de la aldea y §11.1
  // ya las cuenta donde se leen —las cruces en las puertas, el granero, la
  // gente moviéndose despacio—. La burbuja es para lo que le pasa **a uno**.
  //
  // Se escribe en orden inverso a la prioridad: `set` sobrescribe.

  // §6.4 · un rencor recién formado es una riña reciente, y la riña la tuvieron
  // los dos. Uno curado ya no: el estado dice cuándo se curó.
  for (const grudge of state.people.grudges) {
    if (grudge.healedTick !== null || !fresh(state.tick, grudge.formedTick)) continue;
    for (const id of [grudge.fromId, grudge.toId]) {
      if (here.some((person) => person.id === id)) out.set(id, 'quarrel');
    }
  }

  // Un hijo nacido hace poco. La cara la ponen los padres: el recién nacido no
  // se entera.
  for (const person of state.people.villagers) {
    if (!fresh(state.tick, person.bornTick)) continue;
    for (const parent of person.parentIds) {
      if (parent !== null && here.some((who) => who.id === parent)) out.set(parent, 'birth');
    }
  }

  // Y un duelo, que manda sobre todo lo demás. Vale en las dos direcciones: por
  // un padre y por un hijo, que es hasta donde llega el parentesco que el
  // estado guarda.
  for (const dead of state.people.villagers) {
    if (dead.diedTick === null || !fresh(state.tick, dead.diedTick)) continue;
    for (const parent of dead.parentIds) {
      if (parent !== null && here.some((who) => who.id === parent)) out.set(parent, 'grief');
    }
    for (const child of state.people.villagers) {
      if (!child.parentIds.includes(dead.id)) continue;
      if (here.some((who) => who.id === child.id)) out.set(child.id, 'grief');
    }
  }

  return out;
}
