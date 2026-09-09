// M-39 · Cuando dos dejan de aguantarse. design.md §6.4, §7.9.
//
// El valle sabía escribir rencores desde M-05 y no sabía qué hacer con ellos.
// Un rencor abierto era una fila en un registro: nadie discutía, nadie se
// gritaba, nadie dejaba de hablarse en la plaza. Sólo servía para que el
// catálogo pesara más una plantilla de rencilla dentro de veinte años.
//
// Esto es lo que pasa mientras tanto. Dos que se detestan y viven en la misma
// aldea acaban teniendo un mal día, y ese mal día deja rastro: se odian un poco
// más, cada uno recuerda de quién fue la culpa, y la aldea entera se entera —
// una discusión a gritos en una aldea de cuarenta personas no es un secreto.

import { OPINION, QUARREL } from '../balance';
import { next } from '../rng';
import type { GameState, Villager, VillagerId } from '../state';
import { isHere } from './demography';
import { remember } from './memories';
import { adjustOpinion, opinionOf } from './opinions';

export interface Quarrel {
  a: VillagerId;
  b: VillagerId;
  /** Si llegaron a las manos o se quedó en gritos. */
  blows: boolean;
}

/**
 * Las ganas que este tiene de que hoy sea el día. Un rencor es la condición;
 * el carácter es lo que decide si el asunto estalla o se aguanta un año más.
 */
function temper(v: Villager): number {
  let n = 1;
  if (v.traits.includes('hot_tempered')) n *= QUARREL.HOT_TEMPERED;
  if (v.traits.includes('spiteful')) n *= QUARREL.SPITEFUL;
  if (v.traits.includes('kind')) n *= QUARREL.KIND;
  return n;
}

/**
 * Una semana de convivencia entre gente que no se aguanta.
 *
 * Como mucho una riña por semana: dos peleas el mismo martes en una aldea de
 * cuarenta no es una aldea con tensión, es una taberna. Y el que ya ha reñido
 * este año no vuelve a hacerlo, porque si no los mismos dos se pasan la partida
 * gritándose y deja de significar nada.
 */
export function quarrelOf(state: GameState): Quarrel | null {
  const named = state.people.villagers.filter((v) => v.named && isHere(v));
  if (named.length < 2) return null;

  for (const grudge of state.people.grudges) {
    if (grudge.healedTick !== null) continue;
    if (state.tick - grudge.formedTick < QUARREL.COOLING_TICKS) continue;

    const a = named.find((v) => v.id === grudge.fromId);
    const b = named.find((v) => v.id === grudge.toId);
    if (a === undefined || b === undefined) continue;
    // El rencor tiene que seguir vivo hoy, no sólo estar escrito.
    if (opinionOf(state, a.id, b.id) > OPINION.GRUDGE_HEALS_AT) continue;

    const chance = QUARREL.WEEKLY * temper(a) * temper(b);
    if (next(state.rng, 'quarrels') >= chance) continue;

    // Llegar a las manos es lo raro. Lo corriente es una voz más alta que otra
    // delante de todo el mundo, que es lo que de verdad hace daño en un sitio
    // donde todos se conocen.
    const blows = next(state.rng, 'quarrels') < QUARREL.TO_BLOWS * temper(a);

    adjustOpinion(state, a.id, b.id, blows ? QUARREL.AFTER_BLOWS : QUARREL.AFTER_WORDS);
    adjustOpinion(state, b.id, a.id, blows ? QUARREL.AFTER_BLOWS : QUARREL.AFTER_WORDS);
    remember(a, {
      tick: state.tick,
      kind: 'was_blamed',
      aboutId: b.id,
      weight: blows ? QUARREL.MEMORY_BLOWS : QUARREL.MEMORY_WORDS,
    });
    remember(b, {
      tick: state.tick,
      kind: 'was_blamed',
      aboutId: a.id,
      weight: blows ? QUARREL.MEMORY_BLOWS : QUARREL.MEMORY_WORDS,
    });
    return { a: a.id, b: b.id, blows };
  }
  return null;
}
