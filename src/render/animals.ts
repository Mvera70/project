// M-29 · Livestock. design.md §7.7.
//
// Derived exactly like the crowd of §10.6: positions are computed from the
// state and GameState is NEVER written. The herd is cosmetic on purpose
// (§7.7) — it is not saved, it feeds nobody and it moves no number of §12,
// the same deal §13.3 gives inherited ruins. The day livestock becomes food is
// the day it becomes state and the balance bench has to be run again.
//
// The day is the tick fraction, as in §10.6: past 0.8 everyone is indoors and
// so is the herd. That empty yard at dusk is not decoration — it is the window
// the wolves of §7.7 will come through.

import { ANIMALS } from '@engine/balance';
import type { Building, GameState } from '@engine/state';
import { TERRAIN_CODE } from '@engine/state';

export type AnimalKind = 'hen' | 'pig' | 'cow';

export interface Animal {
  id: number;
  kind: AnimalKind;
  x: number;
  y: number;
}

/** Dusk, the same threshold the crowd uses to go home (§10.6). */
const NIGHT = 0.8;

function standing(state: GameState, kind: Building['kind']): Building[] {
  return state.buildings.filter((b) => b.kind === kind && b.lostTick === null);
}

/**
 * A stable pseudo-random in 0..1 from two integers.
 *
 * Not from an RNG stream on purpose: §4.3 says a draw in the render must never
 * be able to displace the simulation, and the safest way to obey that is to
 * take no draw at all. The same animal is in the same place for the same tick
 * on every machine.
 */
function noise(a: number, b: number): number {
  const hash = Math.imul(((a << 8) ^ b) + 0x9e37, 2654435761) >>> 0;
  return (hash % 1000) / 999;
}

/** Slow drift around an anchor, a full loop per day, each animal on its own phase. */
function wander(anchorX: number, anchorY: number, id: number, fraction: number): { x: number; y: number } {
  const phase = noise(id, 11) * Math.PI * 2;
  const rate = 0.6 + noise(id, 23) * 0.8;
  const radius = ANIMALS.WANDER * (0.35 + noise(id, 37) * 0.65);
  return {
    x: anchorX + Math.cos(phase + fraction * Math.PI * 2 * rate) * radius,
    y: anchorY + Math.sin(phase + fraction * Math.PI * 2 * rate) * radius * 0.6,
  };
}

function inside(state: GameState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x <= state.map.width - 1 && y <= state.map.height - 1;
}

/**
 * Where the village's animals are this instant.
 *
 * Pure: same state and same fraction give the same herd, and nothing is
 * written. Empty at night and empty in a village with nothing standing.
 */
export function animalPositions(state: GameState, tickFraction: number): Animal[] {
  const fraction = Math.max(0, Math.min(1, tickFraction));
  if (fraction >= NIGHT) return [];

  const houses = [...standing(state, 'house'), ...standing(state, 'stone_house')]
    .sort((a, b) => a.id - b.id);
  const fields = standing(state, 'field').sort((a, b) => a.id - b.id);
  const hasGranary = standing(state, 'granary').length > 0;
  const animals: Animal[] = [];
  let id = 0;

  const place = (kind: AnimalKind, anchorX: number, anchorY: number): void => {
    const point = wander(anchorX, anchorY, id, fraction);
    if (inside(state, point.x, point.y)) animals.push({ id, kind, x: point.x, y: point.y });
    id += 1;
  };

  // Hens: every house has a couple, scratching at its own doorstep.
  for (const house of houses.slice(0, ANIMALS.MAX_PER_KIND)) {
    for (let n = 0; n < ANIMALS.HENS_PER_HOUSE; n += 1) {
      place('hen', house.x + house.w * 0.5 + (n - 0.5) * 0.6, house.y + house.h + 0.15);
    }
  }

  // Pigs: only once there is a granary — a pig eats what the village can spare.
  if (hasGranary) {
    const pigs = Math.min(Math.floor(houses.length / ANIMALS.HOUSES_PER_PIG), ANIMALS.MAX_PER_KIND);
    for (let n = 0; n < pigs; n += 1) {
      const house = houses[n * ANIMALS.HOUSES_PER_PIG] as Building;
      place('pig', house.x - 0.35, house.y + house.h * 0.65);
    }
  }

  // Cows: pasture, so they follow the fields onto the meadow beside them.
  const cows = Math.min(Math.floor(fields.length / ANIMALS.FIELDS_PER_COW), ANIMALS.MAX_PER_KIND);
  for (let n = 0; n < cows; n += 1) {
    const field = fields[n * ANIMALS.FIELDS_PER_COW] as Building;
    const x = field.x + field.w + 0.4;
    const y = field.y + field.h * 0.5;
    const cell = Math.round(y) * state.map.width + Math.round(x);
    // Beside the field if that is open meadow, otherwise on the field itself.
    const onMeadow = state.map.terrain[cell] === TERRAIN_CODE.meadow;
    place('cow', onMeadow ? x : field.x + field.w * 0.5, y);
  }

  return animals;
}
