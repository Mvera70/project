// G-05 · The shape of one villager's scenic day. design.md D.6, §11.9.
//
// The same shape the Canvas renderer already established, expressed in scenic
// time instead of tick fraction. It is not copied for the sake of it: what §11.9
// learned is that a village whose forty people leave at the same instant, arrive
// at the same instant and come home together reads as a mechanism rather than as
// people. Every constant here is the one balance.ts already holds, so the two
// renderers cannot drift apart on the one thing that makes the valley look
// inhabited.

import { DAY, TIME } from '@engine/balance';
import type { Villager } from '@engine/state';

/**
 * What a villager is doing at this instant.
 *
 * D.6 names five, and `leaving` is the one that matters beyond bookkeeping: it
 * is the moment on the doorstep, before the walk. It exists so that a door has
 * something to open against. The renderer derives the door's angle from whoever
 * is `leaving` its house; nothing is stored and nothing is simulated.
 *
 * `resting` is the honest answer when a villager has no reachable destination.
 * D.6 forbids inventing a workshop: someone with nowhere to go stays put.
 */
export type Activity = 'home' | 'leaving' | 'walking' | 'working' | 'returning' | 'resting';

export interface Day {
  /** Scenic day fraction at which this person steps out. */
  readonly leave: number;
  /** ...reaches their destination. */
  readonly arrive: number;
  /** ...gives the day up. */
  readonly depart: number;
  /** ...is back inside. */
  readonly home: number;
}

/**
 * How long the doorstep moment lasts, in scenic day fraction.
 *
 * TUNE: short enough not to look like dithering, long enough for a door to
 * swing. At fifteen scenic seconds a day this is a third of a second.
 */
export const DOORSTEP = 0.022;

/**
 * A stable number in [0,1) for a pair of integers.
 *
 * Not `Math.random`: this file is presentation, and §4.3 forbids the renderer
 * consuming randomness. The same person on the same tick must get the same day
 * every time it is asked, or the village would reshuffle on every frame.
 */
function stable(a: number, b: number): number {
  const mixed = Math.imul(a * 73_856_093 + b * 19_349_663, 2_654_435_761) >>> 0;
  return (mixed % 100_003) / 100_003;
}

/**
 * La jornada de una persona en un dia escenico.
 *
 * **Se sortea con el numero de dia escenico, no con el tick.** Es la clase de
 * detalle que parece bookkeeping y no lo es: un tick es una semana y dura
 * quince segundos reales, mientras que un dia escenico dura ciento veinte
 * (D.6.1). Sorteando con el tick, el plan de cada aldeano —a que hora sale, a
 * que paso anda, cuando vuelve— se rehacia ocho veces por dia a x1, y cada vez
 * lo teletransportaba a donde le tocara estar con el plan nuevo. A x16 pasaba
 * una vez por segundo, y lo que se veia era gente parpadeando por el valle.
 *
 * `tick` sigue haciendo falta, pero solo para la edad: cuantos anos tiene
 * decide si su jornada es corta, y eso si es cosa de la semana.
 */
export function dayOf(person: Villager, tick: number, day: number): Day {
  const leave = stable(person.id, day) * DAY.LEAVE_SPAN;
  // Each at their own pace. With a fixed journey, two who left together arrived
  // together, and the village marched in step.
  const gait = 1 + (stable(person.id, day + 977) - 0.5) * 2 * DAY.GAIT;
  const arrive = leave + DAY.TRAVEL * gait;
  const age = Math.floor((tick - person.bornTick) / TIME.WEEKS_PER_YEAR);
  const short = age < DAY.CHILD_UNDER || age >= DAY.ELDER_OVER;
  const full = DAY.RETURN_EARLIEST + stable(day, person.id) * DAY.RETURN_SPAN;
  const depart = short ? arrive + (full - arrive) * DAY.SHORT_DAY : full;
  return { leave, arrive, depart, home: depart + DAY.TRAVEL * gait };
}

/** How far along the outbound journey, from 0 at the door to 1 at the destination. */
export function progressOf(day: Day, phase: number): { activity: Activity; along: number } {
  if (phase < day.leave) return { activity: 'home', along: 0 };
  if (phase < day.leave + DOORSTEP) return { activity: 'leaving', along: 0 };
  if (phase < day.arrive) {
    const span = Math.max(1e-6, day.arrive - (day.leave + DOORSTEP));
    return { activity: 'walking', along: (phase - (day.leave + DOORSTEP)) / span };
  }
  if (phase < day.depart) return { activity: 'working', along: 1 };
  if (phase < day.home) {
    const span = Math.max(1e-6, day.home - day.depart);
    return { activity: 'returning', along: 1 - (phase - day.depart) / span };
  }
  return { activity: 'home', along: 0 };
}

/** A child plays instead of working, and plays harder than an adult works. */
export function energyOf(person: Villager, tick: number): number {
  const years = Math.floor((tick - person.bornTick) / TIME.WEEKS_PER_YEAR);
  return years < DAY.CHILD_UNDER ? DAY.CHILD_ENERGY : 1;
}

export { stable };
