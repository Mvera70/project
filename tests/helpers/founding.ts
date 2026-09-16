// La fundación de veinte, para las pruebas de mecánica.
//
// El juego funda con una pareja desde el 15 sep 2026 (`FOUNDING`, balance.ts).
// Las pruebas de este directorio que reparten oficios, plantean encrucijadas
// con herrero y cura, o miden la subsistencia de una aldea hecha, se
// escribieron con los veinte de §12.2 y siguen midiendo lo mismo con ellos:
// prueban cómo se comporta una aldea, no cómo nace. Lo que nace lo prueban las
// de fundación, con el perfil del juego.

import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame, type InheritedValley } from '@engine/found';
import { run } from '@engine/sim';
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

/**
 * La primera aldea de `years` años, entre varias semillas, **que cumpla lo que
 * la prueba necesita**.
 *
 * Desde R-1 (§7.10) el valle pierde edificios: el rayo quema, la nieve hunde
 * un tejado, y desde §2.6 del rework ninguna puerta lo impide, porque «que
 * haya caos y que haya partidas que se rompan es la idea del juego». La
 * consecuencia para las pruebas es que **una aldea concreta ya no promete
 * tener una fragua en pie a los veinte años**, y media docena de pruebas
 * dependían de eso sin decirlo: medían la fragua de la semilla 7 y fallaban
 * cuando a esa semilla se le quemaba.
 *
 * Esto no relaja ninguna cota: la propiedad que se quería medir —«una fragua
 * apagada no suena», «una decisión apaga un edificio»— sigue igual. Lo que
 * cambia es que el valle donde se mide se elige por lo que tiene, no por su
 * número. Si ninguna semilla lo cumple, devuelve `null` y la prueba tiene que
 * fallar diciéndolo: eso sí sería un cambio de comportamiento del motor.
 */
const PLAYED = new Map<string, GameState>();

export function villageWhere(
  years: number,
  wants: (state: GameState) => boolean,
  seeds: readonly number[] = [7, 11, 23, 41, 97, 3, 53, 67],
): GameState | null {
  for (const seed of seeds) {
    // Jugada una vez por semilla y por número de años dentro del módulo: el
    // primer intento de esto jugaba hasta ochocientos años de aldea por
    // fichero de pruebas y **tiró un trabajador de vitest por memoria**. Se
    // devuelve una copia, para que quien la reciba pueda ensuciarla.
    const key = `${seed}:${years}`;
    let base = PLAYED.get(key);
    if (base === undefined) {
      base = foundTwenty(seed);
      for (let y = 0; y < years && base.ended === null; y += 1) {
        run(base, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
      }
      PLAYED.set(key, base);
    }
    if (wants(base)) return structuredClone(base);
  }
  return null;
}
