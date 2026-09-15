// M-10 · The founding. design.md §12.2, §3.1.
//
// Two came over the ridge and stopped where the river bends (una pareja desde
// el 15 sep 2026; antes, veinte).

import { BUILDINGS, FOUNDING, LIFE } from './balance';
import { foundPeople } from './people/villagers';
import { makeBundle } from './rng';
import { SCHEMA_VERSION, restingIntent, valleyTraits } from './state';
import type { BuildingKind, FoundingProfile, GameState } from './state';
import { generateMap } from './world/mapgen';
import { placeBuilding } from './world/placement';

/** Place completed founding buildings without charging the opening stores. */
function foundingBuildings(state: GameState, profile: FoundingProfile): void {
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
  place('house', profile.HOUSES);
  place('field', profile.FIELDS);
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

export function foundGame(
  seed: number, inherited?: InheritedValley, profile: FoundingProfile = FOUNDING,
): GameState {
  const rng = makeBundle(seed);
  const terrainSeed = inherited?.terrainSeed ?? seed;
  const mapRng = terrainSeed === seed ? rng : makeBundle(terrainSeed);
  const state: GameState = {
    version: SCHEMA_VERSION,
    seed,
    terrainSeed,
    tick: 0,
    peakPeople: profile.POPULATION,
    rng,
    map: generateMap(mapRng, terrainSeed),
    herd: { ...profile.HERD },
    village: {
      grain: profile.GRAIN,
      wood: profile.WOOD,
      morale: profile.MORALE,
      faith: profile.FAITH,
    },
    people: foundPeople(rng, 0, profile),
    buildings: [],
    works: [],
    crossroad: null,
    seeds: [],
    flags: {},
    chronicle: [
      { tick: 0, kind: 'founding', templateKey: 'founding', params: {}, weight: 3 },
      // E5 · y qué valle es éste. En la crónica y no sólo en un aviso, por dos
      // razones: es un hecho de la fundación y la crónica es donde viven los
      // hechos, y porque **es lo primero que distingue una partida de otra para
      // quien la lea de fuera** — que es exactamente lo que el hito 0 pregunta.
      ...valleyTraits(terrainSeed).map((trait) => ({
        tick: 0, kind: 'founding' as const, templateKey: `valley.${trait}`,
        params: {}, weight: 2 as const,
      })),
    ],
    history: [],
    weather: { year: 0, index: 2, factor: 1 },
    outbreak: null,
    dwindlingSince: null, noOneStreak: 0, harvestModifier: null, crowBite: 0,
    // La aldea arranca haciendo lo que hacía sola (§5.2, y D-6 del plan).
    intent: restingIntent(),
    // E5 · Lo que este valle tiene y otro no. Con la semilla del **terreno**, así
    // que una aldea que hereda el valle hereda sus rasgos: el valle no cambia
    // porque haya muerto la gente (§13.3).
    traits: valleyTraits(terrainSeed),
    ended: null,
  };
  foundingBuildings(state, profile);
  if (inherited !== undefined) {
    if (inherited.ruins.length !== state.map.ruins.length) {
      throw new Error('Inherited ruin mask does not fit the valley.');
    }
    state.map.ruins.set(inherited.ruins);
  }
  return state;
}
