// C2/B3 · Cuánta defensa tiene el valle. design.md §1b, fase 4; §12.
//
// **Por qué esto está en el motor y no en `derive/`.** Cuántas manos sube una
// aldea al cerco es una **regla del juego** con sus constantes en §12: sale de
// lo que se le dio (C1), de quién manda (K-2) y de cuánta gente hay, y B3 la
// necesita para saber si una partida armada se lleva el valle por delante. Lo
// que sí es presentación —**a qué celda** sube cada uno, y con qué clip— vive en
// `derive/garrison.ts` y `life/garrison.ts`, que leen esto.
//
// Es pura: lee el estado, no consume azar y no escribe nada.

import { GARRISON, LIFE, THREAT } from '../balance';
import { ageOf } from '../people/villagers';
import { will } from '../people/crown';
import { count } from '../subsistence/building-counts';
import { hasTrait, type GameState } from '../state';

/** Si la aldea está en vísperas de un asalto, o en ello. */
export function alertOf(state: GameState): 'coming' | 'arrived' | null {
  if (state.threat.arrivedTick === state.tick) return 'arrived';
  const coming = state.threat.comingTick;
  if (coming === null) return null;
  const away = coming - state.tick;
  if (away < 0 || away > GARRISON.ALERT_WEEKS) return null;
  return 'coming';
}

/** Los adultos, que son los únicos que suben. */
function adultsOf(state: GameState): number {
  return state.people.villagers.filter((v) => {
    if (v.diedTick !== null || v.leftTick !== null) return false;
    const age = ageOf(v, state.tick);
    return age >= LIFE.ADULT[0] && age <= LIFE.ADULT[1];
  }).length;
}

/**
 * Cuántas manos sube la aldea al cerco.
 *
 * Todo lo que suma es **algo que se dio o se decidió** (C1, K-2), que es §1b: la
 * defensa se construye dando. Lo único que no se da es la primera mano, la del
 * portón, porque un pueblo que sabe que bajan pone a alguien en la puerta
 * aunque no tenga con qué. Y el techo es la aldea: como mucho un tercio de sus
 * adultos, para que un caserío no se pare por estar de guardia.
 */
export function defenders(state: GameState): number {
  let hands = GARRISON.BASE_HANDS;
  if (hasTrait(state, 'arms')) hands += GARRISON.ARMS_HANDS;
  if (hasTrait(state, 'bows')) hands += GARRISON.BOWS_HANDS;
  if (count(state, 'smithy') > 0) hands += GARRISON.SMITH_HANDS;
  if (will(state).arms) hands += GARRISON.KING_HANDS;
  return Math.max(0, Math.min(hands, Math.floor(adultsOf(state) * GARRISON.MOST_SHARE)));
}

/**
 * B3 · **Lo que el valle pone contra una partida armada.**
 *
 * Las manos del cerco más lo que vale el cerco mismo, y esa suma es lo que B3
 * compara con la partida que baja para saber si entran o sólo saquean. Se
 * escribe aquí, junto a la cuenta de manos, porque son la misma pregunta hecha
 * dos veces: «con qué se defiende esta aldea».
 *
 * **La muralla cuenta aunque no haya nadie encima**, y tiene que contar: una
 * estacada cerrada con su puerta obliga a romper algo antes de entrar, y eso ya
 * es defensa. Lo que no hace es defenderse sola — sin manos, el cerco vale
 * `WALL_WORTH` y nada más.
 */
export function resistance(state: GameState): number {
  const standing = state.buildings.filter((b) => b.lostTick === null);
  const gate = standing.some((b) => b.kind === 'gate');
  // A3 · el bastión es una pieza de muralla, así que cuenta como ella.
  const wall = standing.some((b) => b.kind === 'palisade' || b.kind === 'wall' || b.kind === 'bastion');
  return defenders(state)
    // **Y la aldea entera cuenta, aunque no le hayan dado nada.** Sin esto la
    // resistencia de un caserío es dos —una mano y el herrero— y **cualquier**
    // partida la triplica: medido, caían **12 de 12 valles**, el primero a las
    // 58 horas de reloj, tomados por seis hombres. Un pueblo de treinta con
    // horcas no se toma con seis, y eso no es una concesión: es lo que hace que
    // «caer» sea el asalto grande y no el primero que baje.
    + Math.min(THREAT.HOMESTEAD_CAP, adultsOf(state) * THREAT.HOMESTEAD_SHARE)
    + (wall ? THREAT.WALL_WORTH : 0)
    + (gate ? THREAT.GATE_WORTH : 0);
}
