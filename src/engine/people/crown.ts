// K-1 · La corona: quién la lleva y qué quiere. `docs/historico/plan-rey.md`.
//
// **El jugador no manda; dice quién manda.** Es el principio de los medios
// (§7.12) aplicado a una persona: no se le dice a la aldea qué hacer, se le da
// una corona a alguien, y lo que la aldea haga con ese alguien lo deciden los
// sistemas que ya existen —la cola de obras de §7.3, el reparto de manos de
// §5.2, la tabla de sucesos de §7.10—.
//
// Este módulo es la **hoja**: dice quién es rey, quién puede serlo y qué quiere
// el que lo es. Coronar —cobrar la plata, mover el asiento, agriar al
// desplazado— es un acto y vive en `world/crown.ts`.
//
// **No importa `demography`** aunque le haría falta `isHere`, y es a propósito:
// `resolveMigration` va a leer `will()` desde ahí, y el ciclo rompería el grafo
// de módulos. `isHere` se copia en local, igual que `flagSet` está copiado en
// `demography.ts` por la misma razón.

import { CROWN } from '../balance';
import type { CrownStyle, GameState, PriorityName, Role, Villager, VillagerId } from '../state';
import { ageOf } from './villagers';

/** Presente: ni muerto ni marchado. Copiado de `demography.ts` (ver cabecera). */
function isHere(v: Villager): boolean {
  return v.diedTick === null && v.leftTick === null;
}

/**
 * Lo que el rey quiere, traducido a lo que el tick ya sabe leer.
 *
 * **Ni un sistema nuevo.** Cada campo de aquí lo consume un paso que existe hoy
 * y que hasta ahora leía una constante o la postura retirada de v2.0: el
 * reparto de manos (§5.2), la cola de obras (§7.3), el ánimo y la fe (§5.6),
 * los pesos de los sucesos (§7.10), la puerta de los que llegan (§5.7) y el
 * reparto de encrucijadas (§8.6).
 */
export interface Will {
  /** El estilo del rey, o nada si no hay rey o el trono está vacante. */
  readonly style: CrownStyle | null;
  /** Qué familia de obras va delante (§7.3). `'none'` sin rey. */
  readonly priority: PriorityName;
  /** Cuánto se esfuerza la aldea en sembrar (§5.2). 1 sin rey. */
  readonly fields: number;
  /**
   * Cuántos campos más de los que §12 permite puede roturar la aldea. 0 sin rey.
   *
   * **Y es lo que de verdad hace al rey del campo**, medido: `will.fields` solo
   * casi nunca muerde, porque §5.2 trabaja `min(campos, necesarios, dotables)` y
   * en una aldea hecha el tope de ocho campos es lo que manda —cuarenta personas
   * ya trabajan los ocho, así que multiplicar «lo necesario» no añade nada—.
   * Levantar el tope sí: el valle rotura tierra nueva, se ve en el mapa, y no es
   * el efecto del arado (que libera manos) sino otro.
   */
  readonly moreFields: number;
  /**
   * Cuántos graneros más de los que §12 permite. 0 sin rey.
   *
   * **Y es la mitad que faltaba del rey del campo**, medido: con sólo los campos
   * no se veía nada —siete campos y cinco trabajados con rey y sin él, y 2 189
   * de grano contra 2 272—, porque lo que limita no es la tierra sino **dónde
   * guardar lo que da**. Un granero más son otras mil fanegas de sitio, y eso es
   * lo que hace que un valle del campo aguante el invierno que hunde a otro.
   */
  readonly moreGranaries: number;
  /** Si la muralla se levanta sin esperar a que haya amenaza (§7.3, punto 8). */
  readonly arms: boolean;
  /** Hacia qué fe deriva el valle, o nada si el rey no la toca (§5.6). */
  readonly faithTo: number | null;
  /** Lo que valen las fiestas en ánimo. 1 sin rey. */
  readonly feast: number;
  /** La puerta de los que llegan de fuera (§5.7). 1 sin rey. */
  readonly gate: number;
  /** El peso de la riña de la plaza (§7.10). 1 sin rey. */
  readonly quarrel: number;
  /** Los puntos de obra de la semana (§5.2). 1 sin rey. */
  readonly works: number;
  /** Lo que el hambre cuesta de ánimo (§5.6). 1 sin rey. */
  readonly hunger: number;
}

/**
 * La voluntad de un valle sin rey, **que es literalmente lo que el motor hacía
 * antes de que existiera la corona**.
 *
 * Es la garantía de §13.1 escrita en un objeto: una partida sin coronar tiene
 * que ser byte a byte la de antes de esta fase, y la prueba de K-1 lo mide.
 */
export const RESTING_WILL: Will = {
  style: null, priority: 'none', fields: 1, moreFields: 0, moreGranaries: 0, arms: false, faithTo: null,
  feast: 1, gate: 1, quarrel: 1, works: 1, hunger: 1,
};

/** El estilo que da un oficio. Sin oficio, el del arado: quien no tiene puesto
 *  viene del campo. */
export function styleOf(trade: Role | null): CrownStyle {
  if (trade === null) return 'plough';
  return CROWN.STYLE_OF_TRADE[trade];
}

/**
 * El rey vivo de este valle, o nada.
 *
 * **Nada si no hay corona**, aunque haya un jefe: el líder de la fundación no
 * ejerce ninguna voluntad hasta que alguien le da la corona (aunque sea a él).
 * Y nada si el trono está vacante —el rey murió y la sucesión aún no ha
 * pasado—, que es el interregno de A.15 y cuesta lo que costaba.
 */
export function kingOf(state: GameState): Villager | null {
  if (state.crown === null) return null;
  const who = state.people.villagers.find((v) => v.id === state.crown?.id);
  if (who === undefined || !isHere(who)) return null;
  return who.role === 'leader' ? who : null;
}

/** Si el rey lleva ese rasgo. */
function has(king: Villager | null, trait: Villager['traits'][number]): boolean {
  return king !== null && king.traits.includes(trait);
}

/**
 * Qué quiere el rey de este valle. Pura y sin azar: el mismo estado da la misma
 * voluntad.
 *
 * Por oficio salen las cuatro primeras cosas; por rasgo, las cuatro últimas. Y
 * **dos de esos cuatro rasgos son deuda de §6.3**: la tabla prometía «el líder
 * ambicioso levanta un 5 % más de obra» y «el generoso hace que el hambre
 * cueste menos ánimo» desde el primer día, y nadie las había escrito.
 */
export function will(state: GameState): Will {
  const king = kingOf(state);
  if (state.crown === null || king === null) return RESTING_WILL;
  const style = styleOf(state.crown.trade);
  return {
    style,
    priority: style === 'forge' ? 'defence'
      : style === 'plough' ? 'food'
        : style === 'chapel' ? 'faith' : 'court',
    fields: style === 'plough' ? CROWN.PLOUGH_FIELDS : 1,
    moreFields: style === 'plough' ? CROWN.PLOUGH_MORE_FIELDS : 0,
    moreGranaries: style === 'plough' ? CROWN.PLOUGH_MORE_GRANARIES : 0,
    arms: style === 'forge',
    faithTo: style === 'chapel' ? CROWN.CHAPEL_FAITH_TO : null,
    feast: style === 'chapel' ? CROWN.CHAPEL_FEAST : 1,
    gate: has(king, 'craven') ? CROWN.CRAVEN_GATE : 1,
    quarrel: has(king, 'hot_tempered') ? CROWN.TEMPER_QUARREL : 1,
    // **Y la obra del rey cura va más despacio**, que es su precio: medido, sin
    // él era una mejora limpia —fe 82 contra 34, población 49 contra 42 y más
    // grano— y un rey que sólo da no es una elección. Las manos que están en la
    // capilla no están en el andamio. Si además es ambicioso, las dos cosas se
    // multiplican: un rey puede ser cura y ambicioso.
    works: (has(king, 'ambitious') ? CROWN.AMBITIOUS_WORKS : 1)
      * (style === 'chapel' ? CROWN.CHAPEL_WORKS : 1),
    hunger: has(king, 'generous') ? CROWN.GENEROUS_HUNGER : 1,
  };
}

/**
 * Entre quiénes se elige: los nombrados presentes en la banda de edad de la
 * sucesión.
 *
 * **La misma banda que A.15** (`CROWN.CANDIDATE_AGES`), y por el mismo motivo:
 * un niño no manda y un viejo de setenta no empieza un reinado. Ordenados por
 * `id` para que la lista no dependa del orden del array.
 */
export function crownCandidates(state: GameState): Villager[] {
  const [young, old] = CROWN.CANDIDATE_AGES;
  return state.people.namedIds
    .map((id) => state.people.villagers.find((v) => v.id === id))
    .filter((v): v is Villager => v !== undefined && isHere(v))
    .filter((v) => {
      const age = ageOf(v, state.tick);
      return age >= young && age <= old;
    })
    .sort((a, b) => a.id - b.id);
}

/** Por qué no se puede coronar, con el motivo que la pantalla escribe. */
export type CrownRefusal = 'already' | 'small' | 'cost' | 'nobody' | 'who';

/**
 * Si la corona no se puede dar, el motivo; y si se puede, nada.
 *
 * Sin `who` contesta si **se puede coronar a alguien**, que es lo que la
 * pantalla necesita para encender la fila del carro.
 */
export function crownRefusal(state: GameState, who?: VillagerId): CrownRefusal | null {
  if (state.crown !== null) return 'already';
  const people = state.people.villagers.filter(isHere).length;
  if (people < CROWN.MIN_PEOPLE) return 'small';
  if (state.village.silver < CROWN.SILVER) return 'cost';
  const candidates = crownCandidates(state);
  if (candidates.length === 0) return 'nobody';
  if (who !== undefined && !candidates.some((v) => v.id === who)) return 'who';
  return null;
}
