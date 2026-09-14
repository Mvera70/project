// M-43 · Lo que cada uno lleva dentro. design.md §6.2, §6.3, §6.4.
//
// **Todos tienen carácter desde v3.61, y esto es lo que hace con él.**
//
// Hasta aquí los rasgos se repartían al nombrar a alguien, así que la
// personalidad la fabricaba el cargo: el herrero salía terco *porque* era
// herrero, y los setenta y dos aldeanos sin nombre no eran nadie —ni rasgos, ni
// memoria, ni opiniones—, sólo aritmética de población. Ahora se nace con
// carácter, el oficio va a parar a quien encaja (`suitsRole`), y de los quince
// rasgos ya no hay cuatro que no hagan nada.
//
// Lo que vive aquí es lo que ningún otro módulo podía tener sin morderse la
// cola: `opinions` necesita `demography`, `demography` necesita `villagers`, y
// el resentimiento necesita a los tres. Nadie importa este fichero salvo el
// tick, así que el grafo sigue siendo un árbol.
//
// §4.3 intacto: es determinista y lo que sortea sale del flujo `minds`, que es
// suyo y de nadie más.

import { CHARACTER } from '../balance';
import type { GameState, VillagerId } from '../state';
import { isHere } from './demography';
import { remember } from './memories';
import { adjustOpinion } from './opinions';

/**
 * A quién le sienta mal que el puesto sea de otro. §6.2, §6.3.
 *
 * **Éste es el empujón que a §6.4 le faltaba.** Las opiniones sólo se movían
 * con los efectos de las encrucijadas y con las riñas, y las riñas necesitan un
 * rencor que necesita una opinión por debajo de −50: un ciclo cerrado que nadie
 * arrancaba, y por eso se medían cero rencores en cuarenta años. Un ambicioso
 * al que pasan por alto lo arranca desde dentro, sin que el jugador decida
 * nada, que es justo lo que hacía falta.
 *
 * Resiente el que es ambicioso y **no tiene oficio**: el que ya tiene el suyo no
 * se siente pasado por alto. Y deja memoria además de opinión, porque
 * `was_passed_over` ya es una de las causas que el catálogo sabe contar (§8.2),
 * así que el feudo que salga de aquí llega sabiendo de dónde viene.
 *
 * No consume azar: los mismos caracteres dan siempre el mismo resentimiento.
 */
export function passedOver(state: GameState, chosen: VillagerId): number {
  let stung = 0;
  for (const id of state.people.namedIds) {
    if (id === chosen) continue;
    const who = state.people.villagers.find((v) => v.id === id);
    if (who === undefined || !isHere(who)) continue;
    if (who.role !== null) continue;
    if (!who.traits.includes('ambitious')) continue;

    adjustOpinion(state, who.id, chosen, CHARACTER.AMBITIOUS_PASSED_OVER);
    remember(who, {
      tick: state.tick,
      kind: 'was_passed_over',
      aboutId: chosen,
      weight: 3,
    });
    stung += 1;
  }
  return stung;
}

/**
 * Cuánto ata este par, comparado con lo que ataría cualquier otro. §7.9.
 *
 * El reservado no llega a atarse: ni hace amigos a la velocidad de los demás ni
 * llega a detestar del todo, porque para las dos cosas hay que dejar entrar a
 * alguien. Multiplica lo que la convivencia da y lo que el roce quita, así que
 * vale para los dos lados y no hace falta escribirlo dos veces.
 */
export function bondFactor(a: readonly string[], b: readonly string[]): number {
  const closed = a.includes('secretive') || b.includes('secretive');
  return closed ? CHARACTER.SECRETIVE_BOND : 1;
}
