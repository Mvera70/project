// M-31 · What the world does to people. design.md §6.4, §7.9.
//
// Until now only the player's decisions left a mark. Everything the valley did
// on its own — a winter with an empty granary, a house burning down — happened
// to a population, not to anybody. Two memory kinds proved it: `went_hungry`
// and `lost_home` had epitaphs written for them in the bank since M-09 and no
// system had ever written one. Dead content, waiting for a writer.
//
// This is the writer. The rule it follows is that a memory must be about a
// thing that happened TO SOMEONE — the villager who went hungry, the villager
// whose roof burned — never about a thing that happened to the village.
// Otherwise every named villager ends up carrying an identical set of twelve
// memories and the whole system says nothing.

import { MEMORY, SCARS, TIME } from '../balance';
import { remember } from './memories';
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
  for (const v of state.people.villagers) {
    if (!v.named || !isHere(v)) continue;
    if (alreadyThisYear(v, 'went_hungry', state.tick)) continue;
    remember(v, { tick: state.tick, kind: 'went_hungry', aboutId: null, weight });
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
  for (const v of state.people.villagers) {
    if (!v.named || !isHere(v)) continue;
    if (v.homeId !== homeId) continue;
    remember(v, {
      tick: state.tick,
      kind: 'lost_home',
      aboutId: null,
      weight: SCARS.LOST_HOME_WEIGHT,
    });
  }
}

/** Years a memory of this weight survives the decay of §6.4, for the tests. */
export function memoryLifespan(weight: number): number {
  return weight / MEMORY.DECAY_PER_YEAR / TIME.WEEKS_PER_YEAR * TIME.WEEKS_PER_YEAR;
}
