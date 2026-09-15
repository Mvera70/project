// La fundación de veinte, para las pruebas de mecánica.
//
// El juego funda con una pareja desde el 15 sep 2026 (`FOUNDING`, balance.ts).
// Las pruebas de este directorio que reparten oficios, plantean encrucijadas
// con herrero y cura, o miden la subsistencia de una aldea hecha, se
// escribieron con los veinte de §12.2 y siguen midiendo lo mismo con ellos:
// prueban cómo se comporta una aldea, no cómo nace. Lo que nace lo prueban las
// de fundación, con el perfil del juego.

import { foundGame, type InheritedValley } from '@engine/found';
import { foundPeople } from '@engine/people/villagers';
import type { RngBundle } from '@engine/rng';
import type { FoundingProfile, GameState, PeopleState } from '@engine/state';

/** Los veinte de §12.2 tal como eran hasta v3.68. */
export const TWENTY: FoundingProfile = {
  POPULATION: 20,
  ADULTS: 13,
  CHILDREN: 5,
  ELDERS: 2,
  GRAIN: 800,
  WOOD: 200,
  MORALE: 55,
  FAITH: 50,
  HOUSES: 4,
  FIELDS: 2,
  HERD: { hens: 4, pigs: 0, cows: 1 },
  AGE_RANGES: { adults: [16, 45], children: [1, 13], elders: [60, 70] },
  MIN_FERTILE_WOMEN: 4,
  MIN_MEN: 1,
};

export function foundTwenty(seed: number, inherited?: InheritedValley): GameState {
  return foundGame(seed, inherited, TWENTY);
}

export function foundPeopleTwenty(b: RngBundle, tick: number): PeopleState {
  return foundPeople(b, tick, TWENTY);
}
