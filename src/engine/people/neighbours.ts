// M-42 · Lo que hace la convivencia. design.md §6.4, §7.9.
//
// El valle tenía dos fuerzas sobre las opiniones y las dos empujaban hacia
// abajo: el hambre le pasaba factura al líder y las riñas hundían a los que ya
// se detestaban. Lo único que subía era el olvido de §6.4, que lleva todo hacia
// cero pero nunca por encima. Un mundo así acaba siempre en un valle de gente
// que no se aprecia, sólo que unos menos que otros.
//
// Esto es la otra mitad. Segar el mismo campo un año tras otro con la misma
// persona acerca. Es lento a propósito —mucho más lento que un incendio o una
// riña— porque así es como funciona: nadie se hace amigo de nadie en una
// semana, y sin embargo la mayoría de los afectos de una vida se hicieron así.

import { NEIGHBOUR } from '../balance';
import type { GameState, Villager, VillagerId } from '../state';
import { isHere } from './demography';
import { bondFactor } from './minds';
import { adjustOpinion, opinionOf } from './opinions';

/**
 * Si estos dos se desgastan de verse en vez de acercarse.
 *
 * Dos caracteres ásperos se rozan; uno amable al lado desactiva el roce por
 * duro que sea el otro, que es lo mismo que `kind` ya hacía en la riña. No hay
 * azar aquí: los mismos dos caracteres dan siempre la misma respuesta, y por
 * eso esto puede vivir en el tick sin desplazar la simulación (§4.3).
 */
function grates(a: Villager, b: Villager): boolean {
  const gentle = (v: Villager): boolean => NEIGHBOUR.GENTLE.some((t) => v.traits.includes(t));
  if (gentle(a) || gentle(b)) return false;
  const harsh = (v: Villager): boolean => NEIGHBOUR.HARSH.some((t) => v.traits.includes(t));
  return harsh(a) && harsh(b);
}

/**
 * Una semana de trabajar codo con codo.
 *
 * `together` agrupa por sitio de trabajo: quién comparte destino con quién. Se
 * recibe de fuera porque los destinos viven en `world/`, y §17 no deja que
 * `people/` mire hacia allí — la misma razón por la que `produce` recibe su
 * tope de leña en vez de ir a buscarlo.
 *
 * No sube sin techo. Por encima de `CEILING` la convivencia deja de dar: se
 * puede llegar a apreciar a alguien de tanto trabajar con él, no a quererlo
 * como a un hermano. Para eso hacen falta las cosas que cuenta el catálogo.
 */
/**
 * Cuánto agria el hambre lo que dos se dan esta semana. Un tercio de hambre
 * anula la convivencia y el hambre entera la vuelve del revés (§7.9, v3.60).
 */
function sourness(severity: number): number {
  return 1 - severity * NEIGHBOUR.SOURS;
}

/**
 * Mueve lo que los dos piensan el uno del otro, cada uno dentro de su tope.
 *
 * Los topes son los de la convivencia sola y se miran por el lado hacia el que
 * se empuja: se llega a apreciar de tanto segar al lado y a detestar de tanto
 * aguantar, pero ni al cariño ni al odio de los cien puntos se llega sin que
 * pase algo, y eso lo cuenta el catálogo.
 */
function push(state: GameState, a: VillagerId, b: VillagerId, step: number): number {
  const stuck = (from: VillagerId, to: VillagerId): boolean => {
    const view = opinionOf(state, from, to);
    return step > 0 ? view >= NEIGHBOUR.CEILING : view <= NEIGHBOUR.FLOOR;
  };
  const one = stuck(a, b);
  const two = stuck(b, a);
  if (one && two) return 0;
  if (!one) adjustOpinion(state, a, b, step);
  if (!two) adjustOpinion(state, b, a, step);
  return 1;
}

export function workedTogether(
  state: GameState,
  together: readonly VillagerId[][],
  severity = 0,
): number {
  const hunger = sourness(severity);
  let touched = 0;
  for (const crew of together) {
    if (crew.length < 2) continue;
    // Una cuadrilla entera no se hace amiga a la vez: se mira de dos en dos, y
    // sólo entre los que tienen nombre, que son los únicos con opiniones (§6.1).
    for (let i = 0; i < crew.length; i += 1) {
      for (let j = i + 1; j < crew.length; j += 1) {
        const a = crew[i] as VillagerId;
        const b = crew[j] as VillagerId;
        const who = state.people.villagers.find((v) => v.id === a);
        const other = state.people.villagers.find((v) => v.id === b);
        if (who === undefined || other === undefined) continue;
        const step = NEIGHBOUR.PER_WEEK * hunger * bondFactor(who.traits, other.traits);
        if (step === 0) continue;
        touched += push(state, a, b, step);
      }
    }
  }
  return touched;
}

/**
 * Una semana de aguantarse, que no es lo mismo que una semana de trabajar juntos.
 *
 * **Va sobre todos los nombrados y no sobre la cuadrilla**, y la diferencia no
 * es un detalle: es la que hace que esto funcione. El afecto se hace codo con
 * codo —hay que compartir la tarea—, pero la antipatía no necesita compartir
 * nada. En una aldea de cuarenta personas dos que no se tragan se ven todos los
 * días, sieguen o no el mismo campo.
 *
 * La primera versión metió el roce dentro de `workedTogether` y casi no movió
 * nada: el desgaste sólo corría las semanas en que los dos coincidían de
 * destino, mientras el olvido de §6.4 corre **todas**. Con una coincidencia de
 * una semana de cada tres, −0,18 contra +0,05 se quedaba en −0,01 por semana, y
 * las partidas morían rozando el umbral —medido: −45, −48— sin llegar a
 * cruzarlo nunca. Contra una fuerza que actúa siempre hay que poner otra que
 * actúe siempre.
 *
 * No consume azar: los mismos caracteres dan siempre lo mismo (§4.3).
 */
export function rubShoulders(state: GameState, severity = 0): number {
  const named = state.people.villagers.filter((v) => v.named && isHere(v));
  const hunger = sourness(severity);
  let touched = 0;
  for (let i = 0; i < named.length; i += 1) {
    for (let j = i + 1; j < named.length; j += 1) {
      const a = named[i] as Villager;
      const b = named[j] as Villager;
      if (!grates(a, b)) continue;
      // El hambre agria el roce como agria todo lo demás; lo que no hace es
      // volverlo cariño, así que un año bueno lo deja quieto y no al revés.
      const step = NEIGHBOUR.FRICTION * Math.max(1, hunger === 0 ? 1 : 2 - hunger)
        * bondFactor(a.traits, b.traits);
      touched += push(state, a.id, b.id, step);
    }
  }
  return touched;
}
