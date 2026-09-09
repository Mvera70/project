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

import { ANIMALS, TIME } from '@engine/balance';
import type { Building, GameState } from '@engine/state';
import { TERRAIN_CODE } from '@engine/state';
import { seasonOf, weekOf } from '@engine/time';

export type AnimalKind = 'hen' | 'pig' | 'cow' | 'crow' | 'wolf' | 'fish';

/** The village's own, which go indoors at dusk. The rest is wildlife. */
export const LIVESTOCK: readonly AnimalKind[] = ['hen', 'pig', 'cow'];

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
  const animals: Animal[] = [];
  let id = 0;

  const place = (kind: AnimalKind, anchorX: number, anchorY: number): void => {
    const point = wander(anchorX, anchorY, id, fraction);
    if (inside(state, point.x, point.y)) animals.push({ id, kind, x: point.x, y: point.y });
    id += 1;
  };

  // §7.7, v2.91: the counts come from `state.herd`, which is the herd the
  // village actually keeps — not from what its buildings could hold. If a wolf
  // took the cow, there is one fewer cow on the screen. What you see is true.
  // Where each head stands is still derived: a hen belongs to a doorstep, a
  // cow to a field, and that never needed saving.

  // Hens: spread two to a house, from the first house onwards.
  for (let n = 0; n < state.herd.hens; n += 1) {
    const house = houses[Math.floor(n / ANIMALS.HENS_PER_HOUSE) % Math.max(1, houses.length)];
    if (house === undefined) break;
    place('hen', house.x + house.w * 0.5 + ((n % ANIMALS.HENS_PER_HOUSE) - 0.5) * 0.6, house.y + house.h + 0.15);
  }

  // Pigs: one to every other house.
  for (let n = 0; n < state.herd.pigs; n += 1) {
    const house = houses[(n * ANIMALS.HOUSES_PER_PIG) % Math.max(1, houses.length)];
    if (house === undefined) break;
    place('pig', house.x - 0.35, house.y + house.h * 0.65);
  }

  // Cows: pasture, so they follow the fields onto the meadow beside them.
  for (let n = 0; n < state.herd.cows; n += 1) {
    const field = fields[(n * ANIMALS.FIELDS_PER_COW) % Math.max(1, fields.length)];
    if (field === undefined) break;
    const x = field.x + field.w + 0.4;
    const y = field.y + field.h * 0.5;
    const cell = Math.round(y) * state.map.width + Math.round(x);
    // Beside the field if that is open meadow, otherwise on the field itself.
    const onMeadow = state.map.terrain[cell] === TERRAIN_CODE.meadow;
    place('cow', onMeadow ? x : field.x + field.w * 0.5, y);
  }

  return animals;
}

/** The centre of the village, the same figure §11.5 and the woodcutters use. */
function core(state: GameState): { x: number; y: number } {
  const live = state.buildings.filter((b) => b.lostTick === null);
  if (live.length === 0) return { x: state.map.width / 2, y: state.map.height / 2 };
  return {
    x: live.reduce((n, b) => n + b.x + b.w / 2, 0) / live.length,
    y: live.reduce((n, b) => n + b.y + b.h / 2, 0) / live.length,
  };
}

/** Cells of one terrain within `range` of the village, nearest first and stable. */
function nearbyCells(state: GameState, terrain: number, range: number, limit: number): number[] {
  const centre = core(state);
  const found: { cell: number; distance: number }[] = [];
  for (let i = 0; i < state.map.terrain.length; i += 1) {
    if (state.map.terrain[i] !== terrain) continue;
    const dx = (i % state.map.width) - centre.x;
    const dy = Math.floor(i / state.map.width) - centre.y;
    const distance = dx * dx + dy * dy;
    if (distance <= range * range) found.push({ cell: i, distance });
  }
  // Distance then index: never the order the array happened to be walked in.
  found.sort((a, b) => a.distance - b.distance || a.cell - b.cell);
  return found.slice(0, limit).map((item) => item.cell);
}

/**
 * The wildlife, §7.7. Cosmetic like the herd — a crow eats no grain yet and a
 * wolf takes no cow — but on their own clocks, which is the point: they are
 * what makes a night in winter look different from an afternoon in summer.
 *
 *   crows  over ripening fields, in the weeks before the reaping of §5.1
 *   wolves at the treeline, on winter nights, once the yard has emptied
 *   fish   in the river, by day
 */
export function wildlifePositions(state: GameState, tickFraction: number): Animal[] {
  const fraction = Math.max(0, Math.min(1, tickFraction));
  const night = fraction >= NIGHT;
  const week = weekOf(state.tick);
  const animals: Animal[] = [];
  let id = 10_000; // its own range, so a crow never shares an id with a hen

  const place = (kind: AnimalKind, anchorX: number, anchorY: number): void => {
    const point = wander(anchorX, anchorY, id, fraction);
    if (inside(state, point.x, point.y)) animals.push({ id, kind, x: point.x, y: point.y });
    id += 1;
  };

  // Crows: only while there is standing grain worth taking.
  const ripening = week <= TIME.HARVEST_WEEK && week > TIME.HARVEST_WEEK - ANIMALS.CROW_WEEKS_BEFORE_HARVEST;
  if (!night && ripening) {
    const fields = state.buildings
      .filter((b) => b.kind === 'field' && b.lostTick === null)
      .sort((a, b) => a.id - b.id);
    const crows = Math.min(Math.floor(fields.length / ANIMALS.FIELDS_PER_CROW), ANIMALS.CROWS_MAX);
    for (let n = 0; n < crows; n += 1) {
      const field = fields[n * ANIMALS.FIELDS_PER_CROW] as Building;
      place('crow', field.x + field.w * 0.5, field.y + field.h * 0.4);
    }
  }

  // Wolves: winter nights, at the treeline. The empty yard is the invitation.
  if (night && seasonOf(state.tick) === 'winter') {
    const trees = nearbyCells(state, TERRAIN_CODE.forest, ANIMALS.WOLF_RANGE, ANIMALS.WOLVES_MAX);
    for (const cell of trees) {
      place('wolf', cell % state.map.width, Math.floor(cell / state.map.width));
    }
  }

  // Fish: the river was on the map from M-13 and had nothing in it.
  if (!night) {
    const water = nearbyCells(state, TERRAIN_CODE.water, ANIMALS.FISH_RANGE, ANIMALS.FISH_MAX);
    for (const cell of water) {
      place('fish', cell % state.map.width, Math.floor(cell / state.map.width));
    }
  }

  return animals;
}
