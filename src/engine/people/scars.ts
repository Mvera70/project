// M-31 · What the world does to people. design.md §6.4, §7.9.
//
// Until now only the player's decisions left a mark. Everything the valley did
// on its own — a winter with an empty granary, a house burning down — happened
// to a population, not to anybody. Two memory kinds proved it: `went_hungry`
// and `lost_home` had epitaphs written for them in the bank since M-09 and no
// system had ever written one. Dead content, waiting for a writer.
//
// Desde v3.02 no sólo escribe recuerdos: también mueve lo que la gente piensa
// de la gente. Un año de hambre le resta al líder, y perder la casa en el mismo
// fuego acerca a los que la perdieron. Uno separa y otro une, a propósito: un
// mundo que sólo separase acabaría siempre en un valle de enemigos.
//
// This is the writer. The rule it follows is that a memory must be about a
// thing that happened TO SOMEONE — the villager who went hungry, the villager
// whose roof burned — never about a thing that happened to the village.
// Otherwise every named villager ends up carrying an identical set of twelve
// memories and the whole system says nothing.

import { MEMORY, OPINION, SCARS, TIME } from '../balance';
import { remember } from './memories';
import { adjustOpinion } from './opinions';
import { isHere } from './demography';
import type { BuildingId, GameState, MemoryKind, Villager } from '../state';
import { yearOf } from '../time';

/**
 * Has this villager already recorded a memory of this kind this year?
 *
 * Hunger is weekly and a bad winter runs for months. Without this a single
 * famine would write twenty identical memories and push out everything else a
 * person had lived through — §6.4's twelve slots are meant to hold a life, not
 * one season of it. One a year is also what a person would actually carry: the
 * memory is "the year we starved", not "the ninth week of it".
 */
function alreadyThisYear(v: Villager, kind: MemoryKind, tick: number): boolean {
  const year = yearOf(tick);
  return v.memories.some((m) => m.kind === kind && yearOf(m.tick) === year);
}

/**
 * The weight a hunger leaves, from how bad the week was. A pinch is a 1 and an
 * empty granary is close to the maximum: what marks a person is not that food
 * was short but how short it was.
 */
function hungerWeight(severity: number): number {
  const span = MEMORY.WEIGHT_MAX - MEMORY.WEIGHT_MIN;
  return MEMORY.WEIGHT_MIN + Math.min(1, severity / SCARS.HUNGER_FULL) * span;
}

/**
 * §5.3's hunger, written into the people who lived through it.
 *
 * Only the survivors: the dead have their epitaph and do not need a memory to
 * carry. And only above a threshold, because a week where the granary ran a
 * little short is not something anybody remembers for the rest of their life.
 */
export function scarHunger(state: GameState, severity: number): void {
  if (severity < SCARS.HUNGER_MIN) return;
  const weight = hungerWeight(severity);
  const share = Math.min(1, severity / SCARS.HUNGER_FULL);

  // §7.9, v3.02: quien manda carga con el año malo. No porque sea culpa suya
  // —el hambre casi nunca lo es— sino porque es la única cabeza visible cuando
  // no hay pan, y eso sí es cierto. Un solo año pesa poco; el que pasa tres
  // seguidos bajo el mismo líder acaba cruzando el umbral de §6.4 y le sale un
  // rencor con nombre.
  const leader = state.people.villagers.find((v) => v.role === 'leader' && isHere(v));

  for (const v of state.people.villagers) {
    if (!v.named || !isHere(v)) continue;
    if (alreadyThisYear(v, 'went_hungry', state.tick)) continue;
    // `aboutId` es el líder, no `null`. §6.4 saca la causa de un rencor de la
    // memoria más pesada que el resentido guarda **sobre esa persona**; con un
    // recuerdo que no apunta a nadie, el rencor salía mudo (`unspoken`) y la
    // crónica no podía decir por qué dos aldeanos dejaron de hablarse. El
    // recuerdo no es «pasé hambre»: es «pasé hambre bajo su mando».
    remember(v, {
      tick: state.tick,
      kind: 'went_hungry',
      aboutId: leader?.id ?? null,
      weight,
    });
    if (leader !== undefined) {
      adjustOpinion(state, v.id, leader.id, OPINION.HUNGER_TO_LEADER * share);
    }
  }
}

/**
 * §5.9's fire, written into the people whose roof it was.
 *
 * This one is deliberately narrow: only the household. A fire is a village
 * event in the chronicle and a personal one in a memory, and conflating the
 * two would mark forty people with the loss of one house.
 */
export function scarFire(state: GameState, homeId: BuildingId): void {
  const burned = state.people.villagers.filter(
    (v) => v.named && isHere(v) && v.homeId === homeId,
  );

  for (const v of burned) {
    remember(v, {
      tick: state.tick,
      kind: 'lost_home',
      aboutId: null,
      weight: SCARS.LOST_HOME_WEIGHT,
    });
  }

  // §7.9, v3.02: y los que lo perdieron juntos se acercan. Es la otra mitad de
  // esto y hacía falta que existiera: si el mundo sólo separase a la gente,
  // toda partida larga acabaría en un valle de enemigos. Compartir una
  // desgracia es de las pocas cosas que unen sin que nadie lo decida.
  for (const a of burned) {
    for (const b of burned) {
      if (a.id === b.id) continue;
      adjustOpinion(state, a.id, b.id, OPINION.SHARED_LOSS);
    }
  }
}

/** Years a memory of this weight survives the decay of §6.4, for the tests. */
export function memoryLifespan(weight: number): number {
  return weight / MEMORY.DECAY_PER_YEAR / TIME.WEEKS_PER_YEAR * TIME.WEEKS_PER_YEAR;
}
