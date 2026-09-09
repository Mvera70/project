// M-10 · The founding. design.md §12.2, §3.1.
//
// Twenty came over the ridge and stopped where the river bends.

import { BUILDINGS, FOUNDING, LIFE } from './balance';
import { foundPeople } from './people/villagers';
import { makeBundle } from './rng';
import { SCHEMA_VERSION } from './state';
import type { BuildingKind, GameState } from './state';
import { generateMap } from './world/mapgen';
import { placeBuilding } from './world/placement';

/** Place completed founding buildings without charging the opening stores. */
function foundingBuildings(state: GameState): void {
  const place = (kind: BuildingKind, n: number): void => {
    const spec = BUILDINGS[kind];
    for (let i = 0; i < n; i += 1) {
      const position = placeBuilding(state, kind);
      if (position === null) throw new Error(`No founding site for ${kind}`);
      state.buildings.push({
        id: state.buildings.length, kind, ...position,
        w: spec.w, h: spec.h, builtTick: 0, lostTick: null, tier: spec.tier, lit: true, blockedUntil: null,
      });
    }
  };
  place('house', FOUNDING.HOUSES);
  place('field', FOUNDING.FIELDS);
  const homes = state.buildings.filter((b) => b.kind === 'house');
  for (const [index, villager] of state.people.villagers.entries()) {
    villager.homeId = homes[Math.floor(index / LIFE.HOUSE_CAPACITY)]?.id ?? null;
  }
}
/**
 * A new game. §12.2, and the one place a GameState is created from nothing.
 *
 * The weather of year 0 is fair rather than drawn: the first roll of §4.2's
 * step 2 lands in week 0 of year 1, and a village that is founded into a
 * ruinous year before it has done anything is a village the player never had a
 * hand in.
 */
export interface InheritedValley {
  terrainSeed: number;
  ruins: Uint8Array;
}

export function foundGame(seed: number, inherited?: InheritedValley): GameState {
  const rng = makeBundle(seed);
  const terrainSeed = inherited?.terrainSeed ?? seed;
  const mapRng = terrainSeed === seed ? rng : makeBundle(terrainSeed);
  const state: GameState = {
    version: SCHEMA_VERSION,
    seed,
    terrainSeed,
    tick: 0,
    peakPeople: FOUNDING.POPULATION,
    rng,
    map: generateMap(mapRng),
    herd: { ...FOUNDING.HERD },
    village: {
      grain: FOUNDING.GRAIN,
      wood: FOUNDING.WOOD,
      morale: FOUNDING.MORALE,
      faith: FOUNDING.FAITH,
    },
    people: foundPeople(rng, 0),
    buildings: [],
    works: [],
    crossroad: null,
    seeds: [],
    flags: {},
    chronicle: [
      { tick: 0, kind: 'founding', templateKey: 'founding', params: {}, weight: 3 },
    ],
    history: [],
    weather: { year: 0, index: 2, factor: 1 },
    outbreak: null,
    dwindlingSince: null, noOneStreak: 0, harvestModifier: null, crowBite: 0,
    ended: null,
  };
  foundingBuildings(state);
  if (inherited !== undefined) {
    if (inherited.ruins.length !== state.map.ruins.length) {
      throw new Error('Inherited ruin mask does not fit the valley.');
    }
    state.map.ruins.set(inherited.ruins);
  }
  return state;
}
