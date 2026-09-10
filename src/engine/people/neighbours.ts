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
import type { GameState, VillagerId } from '../state';
import { adjustOpinion, opinionOf } from './opinions';

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
export function workedTogether(state: GameState, together: readonly VillagerId[][]): number {
  let touched = 0;
  for (const crew of together) {
    if (crew.length < 2) continue;
    // Una cuadrilla entera no se hace amiga a la vez: se mira de dos en dos, y
    // sólo entre los que tienen nombre, que son los únicos con opiniones (§6.1).
    for (let i = 0; i < crew.length; i += 1) {
      for (let j = i + 1; j < crew.length; j += 1) {
        const a = crew[i] as VillagerId;
        const b = crew[j] as VillagerId;
        if (opinionOf(state, a, b) >= NEIGHBOUR.CEILING) continue;
        adjustOpinion(state, a, b, NEIGHBOUR.PER_WEEK);
        adjustOpinion(state, b, a, NEIGHBOUR.PER_WEEK);
        touched += 1;
      }
    }
  }
  return touched;
}
