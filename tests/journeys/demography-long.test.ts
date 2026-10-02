// Lo lento de `tests/fast/demography.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 3 s en el trabajo `fast` de CI, y además pagaba ~10 s (en local) al
// recogerse, porque juega sus partidas en el cuerpo del `describe`. Mismo
// cuerpo y mismo umbral; lo barato se queda allí.
//
// M-04 · design.md §5.2, §5.7, §6.5, §12.4.
//
// Lo que hay que proteger aquí son curvas, no llamadas: que la gente viva lo
// que la tabla de §12.4 dice que vive, que una aldea holgada crezca, que una
// hambrienta deje de reproducirse, y que las seis puertas de §5.7 estén cada
// una en su sitio.
import { TWENTY, foundPeopleTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { TIME, WORLD } from '@engine/balance';
import { makeBundle } from '@engine/rng';
import type { Building, GameState, TickContext } from '@engine/state';
import {
  isHere,
  resolveDeaths,
  } from '@engine/people/demography';
import { makeVillager } from '@engine/people/villagers';
import { rectangleHeart } from '@engine/world/tiles';

const CELLS = WORLD.WIDTH * WORLD.HEIGHT;
const CALM: TickContext = { severity: 0, cold: false, outbreak: null, deaths: 0, unexplainedDeaths: 0 };

function house(id: number): Building {
  return {
    id,
    kind: 'house',
    x: 0,
    y: id * 2,
    w: 2,
    h: 2,
    builtTick: 0,
    lostTick: null,
    tier: 0,
    lit: true,
    blockedUntil: null,
  };
}

/** Una aldea fundada, con las casas que se le pidan y el granero lleno. */
function village(seed: number, houses: number): GameState {
  const rng = makeBundle(seed);
  const people = foundPeopleTwenty(rng, 0);
  return {
    version: 2,
    seed,
    terrainSeed: seed,
    tick: 0,
    peakPeople: 20,
    rng,
    // P-1 · la plaza del esquema 8. Aquí el centro del corazón a secas: estos
    // estados se montan a mano y no fundan nada, así que no hay casa junto a la
    // que elegirla.
    plaza: { x: 36, y: 56 },
    ring: null, // P-4 · sin muralla empezada (esquema 9)
    crown: null, // K-1 · sin rey (esquema 10)
    map: {
      width: WORLD.WIDTH,
      height: WORLD.HEIGHT,
      terrain: new Uint8Array(CELLS),
      traffic: new Uint16Array(CELLS),
      path: new Uint8Array(CELLS),
      ruins: new Uint8Array(CELLS),
      forestAge: new Uint8Array(CELLS),
      forestStock: new Uint16Array(CELLS), heart: rectangleHeart(),
    },
    herd: { hens: 0, pigs: 0, cows: 0 },
    crowBite: 0,
    traits: [],
    village: { grain: 5000, wood: TWENTY.WOOD, morale: TWENTY.MORALE, faith: TWENTY.FAITH, stone: 0, silver: 0, hides: 0 },
    people,
    buildings: Array.from({ length: houses }, (_, i) => house(i)),
    works: [],
    crossroad: null,
    seeds: [],
    flags: {},
    chronicle: [],
    history: [], happenings: [], offer: null, acts: [],
    weather: { year: 0, index: 2, factor: 1 },
    outbreak: null,
    dwindlingSince: null, noOneStreak: 0, harvestModifier: null,
    // B1 · el clan vecino: esta aldea de laboratorio no tiene vecinos.
    threat: { strength: 0, comingTick: null, comingBand: 0, raids: 0, arrivedTick: null, lastBand: 0 },
    woodRun: null,
    expeditions: [],
    ended: null,
  };
}
describe('mortalidad · la curva que sale de ella', () => {
  /**
   * Una cohorte nacida el mismo día, seguida hasta que muere el último, con la
   * tabla PURA: sin hambre, sin frío y sin brote. Es la única forma de medir
   * §12.4; medida dentro de una partida con hambre baja de 28 y el test
   * fallaría sin que nada estuviera mal.
   */
  function cohort(seed: number, size: number): number[] {
    const s = village(seed, 100);
    s.people.villagers = Array.from({ length: size }, (_, i) =>
      makeVillager({ id: i, female: i % 2 === 0, bornTick: 0 }),
    );
    s.people.namedIds = [];

    const ages: number[] = [];
    while (s.people.villagers.length > 0) {
      s.tick += 1;
      for (const e of resolveDeaths(s, CALM)) ages.push(e.age);
      // Se compacta la lista para no recorrer 20 000 registros por semana. Es
      // cosa del banco de pruebas: el motor nunca borra a nadie (§3.4).
      if (s.tick % TIME.WEEKS_PER_YEAR === 0) {
        s.people.villagers = s.people.villagers.filter(isHere);
      }
    }
    return ages;
  }

  const ages = cohort(4242, 20_000);

  it('la esperanza de vida al nacer cae entre 28 y 38 años', () => {
    expect(ages.length).toBe(20_000);
    const mean = ages.reduce((a, b) => a + b, 0) / ages.length;
    expect(mean).toBeGreaterThanOrEqual(28);
    expect(mean).toBeLessThanOrEqual(38);
  });

  it('en torno a dos de cada tres llegan a los 15', () => {
    // El aserto que detecta que alguien ha "arreglado" el 0.060 infantil
    // creyéndolo una errata. Si la mortalidad de 0-4 se aplana, esto sube.
    const reached = ages.filter((a) => a >= 15).length / ages.length;
    expect(reached).toBeGreaterThan(0.6);
    expect(reached).toBeLessThan(0.72);
  });

  it('la infancia mata más que la adolescencia', () => {
    const before5 = ages.filter((a) => a < 5).length / ages.length;
    const from5to14 = ages.filter((a) => a >= 5 && a < 15).length / ages.length;
    expect(before5).toBeGreaterThan(from5to14);
  });

  it('nadie pasa de una vejez creíble', () => {
    expect(Math.max(...ages)).toBeLessThan(120);
  });
});
