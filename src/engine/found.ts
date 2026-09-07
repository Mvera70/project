// M-10 · The founding. design.md §12.2, §3.1.
//
// Twenty came over the ridge and stopped where the river bends.

import { FOUNDING, WORLD } from './balance';
import { foundPeople } from './people/villagers';
import { makeBundle, next } from './rng';
import { TERRAIN_CODE } from './state';
import type { Building, BuildingKind, GameState, ValleyMap } from './state';
import { BUILDINGS } from './balance';

/**
 * A stand-in valley until M-13 generates one.
 *
 * §7.1 wants a river, a forest between 18 % and 30 %, and a founding site that
 * the terrain justifies. None of that exists yet, and the engine below it needs
 * a map to read: `forestLeft` counts forest cells, and a map of nothing would
 * make every forest template dead on arrival.
 *
 * So: a meadow with a band of forest along one edge and a river down the
 * middle, drawn from the 'map' stream so that two seeds differ and one seed
 * repeats. It is the right shape and the wrong valley, and M-13 replaces it
 * whole.
 */
function stubMap(seed: number): ValleyMap {
  const cells = WORLD.WIDTH * WORLD.HEIGHT;
  const terrain = new Uint8Array(cells);
  const b = makeBundle(seed);

  const forestTarget = WORLD.FOREST_TARGET[0] +
    next(b, 'map') * (WORLD.FOREST_TARGET[1] - WORLD.FOREST_TARGET[0]);
  const forestRows = Math.round(WORLD.HEIGHT * forestTarget);
  const riverX = Math.floor(WORLD.WIDTH / 2) + Math.round((next(b, 'map') - 0.5) * 6);

  for (let y = 0; y < WORLD.HEIGHT; y += 1) {
    for (let x = 0; x < WORLD.WIDTH; x += 1) {
      const i = y * WORLD.WIDTH + x;
      terrain[i] = y < forestRows ? TERRAIN_CODE.forest : TERRAIN_CODE.meadow;
      if (x === riverX) terrain[i] = TERRAIN_CODE.water;
    }
  }

  return {
    width: WORLD.WIDTH,
    height: WORLD.HEIGHT,
    terrain,
    traffic: new Uint16Array(cells),
    path: new Uint8Array(cells),
    ruins: new Uint8Array(cells),
    forestAge: new Uint8Array(cells),
  };
}

/**
 * The buildings the village is founded with. §12.2: four houses and two fields.
 *
 * Placed in a row down the meadow, which is M-13/M-14's job to do properly
 * (§7.4). Nothing in the engine reads a building's coordinates yet; everything
 * reads its kind and whether it still stands.
 */
function foundingBuildings(): Building[] {
  const out: Building[] = [];
  const place = (kind: BuildingKind, n: number): void => {
    const spec = BUILDINGS[kind];
    for (let i = 0; i < n; i += 1) {
      out.push({
        id: out.length,
        kind,
        x: 2 + ((out.length * 3) % (WORLD.WIDTH - 6)),
        y: WORLD.HEIGHT - 8 - Math.floor((out.length * 3) / (WORLD.WIDTH - 6)) * 3,
        w: spec.w,
        h: spec.h,
        builtTick: 0,
        lostTick: null,
        tier: spec.tier,
        lit: true,
      });
    }
  };
  place('house', FOUNDING.HOUSES);
  place('field', FOUNDING.FIELDS);
  return out;
}

/**
 * A new game. §12.2, and the one place a GameState is created from nothing.
 *
 * The weather of year 0 is fair rather than drawn: the first roll of §4.2's
 * step 2 lands in week 0 of year 1, and a village that is founded into a
 * ruinous year before it has done anything is a village the player never had a
 * hand in.
 */
export function foundGame(seed: number): GameState {
  const rng = makeBundle(seed);
  return {
    version: 1,
    seed,
    tick: 0,
    rng,
    map: stubMap(seed),
    village: {
      grain: FOUNDING.GRAIN,
      wood: FOUNDING.WOOD,
      morale: FOUNDING.MORALE,
      faith: FOUNDING.FAITH,
    },
    people: foundPeople(rng, 0),
    buildings: foundingBuildings(),
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
    ended: null,
  };
}
