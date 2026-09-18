// K-1 · Coronar. `docs/plan-rey.md` §1.
//
// **El acto**: cobrar la plata, mover el asiento, agriar al que se queda sin él
// y contarlo. Lo que el rey *quiere* vive en `people/crown.ts`; esto es lo que
// pasa el día que se le da la corona.
//
// Es el mismo patrón que `giveMeans` (M-2) y por la misma razón: un acto del
// jugador **no consume azar** (§4.3). El jugador elige a quién, el estilo sale
// de una tabla y el precio es plata, así que dos partidas con la misma semilla y
// la misma coronación son idénticas byte a byte.

import { CROWN, TIME } from '../balance';
import { crownRefusal, styleOf, type CrownRefusal } from '../people/crown';
import { remember } from '../people/memories';
import { adjustOpinion } from '../people/opinions';
import { passedOver } from '../people/minds';
import type { ChronicleEntry, CrownStyle, GameState, Season, VillagerId } from '../state';

export interface CrownOutcome {
  readonly who: VillagerId;
  readonly crowned: boolean;
  readonly refusal: CrownRefusal | null;
  readonly style: CrownStyle | null;
  /** El líder desplazado, si había uno y no era el coronado. */
  readonly setAside: VillagerId | null;
  readonly entries: readonly Omit<ChronicleEntry, 'tick'>[];
}

/**
 * Da la corona a alguien. Devuelve qué pasó, sin lanzar.
 *
 * **Y el asiento de `leader` no se renombra.** El rey ocupa el mismo puesto que
 * el jefe de la fundación —siete plantillas de encrucijada reparten
 * `{as:'A', role:'leader'}` y la migración a la pareja depende de que exista—;
 * lo que cambia es que ahora **hay alguien que decidió quién lo ocupa**, y que
 * el que lo ocupa hace cosas. La palabra «king» la pone la pantalla
 * (`derive/crown.ts`), no el motor: §2.2, los identificadores de contenido son
 * estables para siempre porque se guardan en las partidas.
 */
export function crownKing(
  state: GameState, who: VillagerId, season: Season, year: number,
): CrownOutcome {
  const refusal = crownRefusal(state, who);
  if (refusal !== null) {
    return { who, crowned: false, refusal, style: null, setAside: null, entries: [] };
  }
  const king = state.people.villagers.find((v) => v.id === who);
  if (king === undefined) {
    return { who, crowned: false, refusal: 'who', style: null, setAside: null, entries: [] };
  }

  state.village.silver -= CROWN.SILVER;

  // El que tenía el asiento lo pierde, y no lo olvida: es la misma pareja de
  // números que A.15 cobra a quien pasan por alto en una sucesión (§6.4).
  const old = state.people.villagers.find(
    (v) => v.role === 'leader' && v.diedTick === null && v.leftTick === null && v.id !== who,
  );
  if (old !== undefined) {
    old.role = null;
    adjustOpinion(state, old.id, who, CROWN.SET_ASIDE_OPINION);
    remember(old, {
      tick: state.tick, kind: 'was_passed_over', aboutId: who,
      weight: CROWN.SET_ASIDE_MEMORY,
    });
  }

  // El oficio de antes se guarda **antes** de ocupar el asiento: es lo que
  // decide el estilo, y al coronar se pierde.
  const trade = king.role;
  king.role = 'leader';
  state.crown = { id: who, since: state.tick, trade };
  const style = styleOf(trade);
  // Queda puesta para que una fase posterior pueda preguntar «¿este valle tiene
  // rey?» desde una condición de encrucijada sin leer `state.crown`.
  state.flags['crowned'] = 0;
  // Un rey de corte se ve desde el camino: el señor se entera de que aquí hay
  // con quién hablar (§7.12 hace lo mismo con la reliquia, doce años).
  if (style === 'court') {
    state.flags['watched'] = state.tick + CROWN.COURT_WATCHED_YEARS * TIME.WEEKS_PER_YEAR;
  }

  const entries: Omit<ChronicleEntry, 'tick'>[] = [{
    kind: 'succession', templateKey: `crown.given.${style}`,
    params: { name: king.name, season, year }, weight: 3,
  }];
  if (old !== undefined) {
    entries.push({
      kind: 'succession', templateKey: 'crown.set_aside',
      // `other` y no `king`: es el nombre que el banco usa para el segundo de
      // una frase, y `chronicle.test.ts` lo comprueba sobre cinco mil entradas.
      params: { name: old.name, other: king.name, season, year }, weight: 2,
    });
  }

  // Y los ambiciosos sin puesto se enteran de que había una corona y no era
  // para ellos. Es la misma llamada que hace `fillVacancies` al repartir un
  // oficio: el resentimiento de §6.4 no distingue entre un puesto y una corona.
  passedOver(state, who);

  return { who, crowned: true, refusal: null, style, setAside: old?.id ?? null, entries };
}
