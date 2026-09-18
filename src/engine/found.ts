// M-10 · The founding. design.md §12.2, §3.1.
//
// Two came over the ridge and stopped where the river bends (una pareja desde
// el 15 sep 2026; antes, veinte).

import { BUILDINGS, FOUNDING, LIFE } from './balance';
import { foundPeople } from './people/villagers';
import { makeBundle } from './rng';
import { SCHEMA_VERSION, valleyTraits } from './state';
import type { BuildingKind, FoundingProfile, GameState } from './state';
import { generateMap } from './world/mapgen';
import { placeBuilding } from './world/placement';
import { choosePlaza } from './world/plaza';

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
    // P-1 · se elige más abajo, en cuanto la pareja ha levantado su casa: la
    // plaza se busca **al lado** de ella, así que no puede decidirse antes de
    // que exista.
    //
    // **Y hasta entonces está fuera del mapa, no en el centro.** Con el centro
    // del corazón como valor de partida, la reserva ya estaba puesta cuando la
    // pareja buscaba solar, y la casa fundadora se corría tres celdas: medido,
    // de (34,55) a (31,55) en la semilla 7. Una plaza que aún no se ha elegido
    // no puede estorbar a la casa que la va a elegir.
    plaza: { x: -1_000, y: -1_000 },
    // P-4 · sin muralla empezada: el primer tramo fija el anillo.
    ring: null,
    // K-1 · sin rey: el jefe de la fundación manda, pero no ejerce ninguna
    // voluntad hasta que alguien le da la corona (aunque sea a él).
    crown: null,
    herd: { ...profile.HERD },
    village: {
      grain: profile.GRAIN,
      wood: profile.WOOD,
      morale: profile.MORALE,
      faith: profile.FAITH,
      // M-0 · una aldea nace sin piedra y sin plata: la primera la cantea
      // cuando tiene fragua, la segunda le llega del camino.
      stone: 0,
      silver: 0,
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
    happenings: [],
    offer: null,
    acts: [],
    weather: { year: 0, index: 2, factor: 1 },
    outbreak: null,
    dwindlingSince: null, noOneStreak: 0, harvestModifier: null, crowBite: 0,
    // E5 · Lo que este valle tiene y otro no. Con la semilla del **terreno**, así
    // que una aldea que hereda el valle hereda sus rasgos: el valle no cambia
    // porque haya muerto la gente (§13.3).
    traits: valleyTraits(terrainSeed),
    // B1 · el clan vecino empieza donde empieza todo: sin nada y sin bajar.
    threat: { strength: 0, comingTick: null, comingBand: 0, raids: 0, arrivedTick: null, lastBand: 0 },
    ended: null,
  };
  foundingBuildings(state, profile);
  // P-1 · **y aquí se elige la plaza, una vez y para siempre.** Después de la
  // casa y el campo, porque se pone a su lado; antes del primer tick, porque
  // desde el primero ya nadie puede construir dentro (`world/placement.ts`).
  state.plaza = choosePlaza(state);
  if (inherited !== undefined) {
    if (inherited.ruins.length !== state.map.ruins.length) {
      throw new Error('Inherited ruin mask does not fit the valley.');
    }
    state.map.ruins.set(inherited.ruins);
  }
  return state;
}
