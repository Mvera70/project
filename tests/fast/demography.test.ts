// M-04 · design.md §5.2, §5.7, §6.5, §12.4.
//
// Lo que hay que proteger aquí son curvas, no llamadas: que la gente viva lo
// que la tabla de §12.4 dice que vive, que una aldea holgada crezca, que una
// hambrienta deje de reproducirse, y que las seis puertas de §5.7 estén cada
// una en su sitio.
import { describe, expect, it } from 'vitest';
import { FOOD, FOUNDING, LIFE, MIGRATION, TIME } from '@engine/balance';
import { makeBundle } from '@engine/rng';
import type { Building, GameState, TickContext, Villager } from '@engine/state';
import {
  annualMortality,
  freeBeds,
  housingCapacity,
  isHere,
  population,
  resolveBirths,
  resolveDeaths,
  resolveMigration,
  workforce,
} from '@engine/people/demography';
import { ageOf, foundPeople, makeVillager } from '@engine/people/villagers';

const CELLS = 36 * 56;
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
  const people = foundPeople(rng, 0);
  return {
    version: 2,
    seed,
    terrainSeed: seed,
    tick: 0,
    peakPeople: 20,
    rng,
    map: {
      width: 36,
      height: 56,
      terrain: new Uint8Array(CELLS),
      traffic: new Uint16Array(CELLS),
      path: new Uint8Array(CELLS),
      ruins: new Uint8Array(CELLS),
      forestAge: new Uint8Array(CELLS),
      forestStock: new Uint16Array(CELLS),
    },
    herd: { hens: 0, pigs: 0, cows: 0 },
    village: { grain: 5000, wood: FOUNDING.WOOD, morale: FOUNDING.MORALE, faith: FOUNDING.FAITH },
    people,
    buildings: Array.from({ length: houses }, (_, i) => house(i)),
    works: [],
    crossroad: null,
    seeds: [],
    flags: {},
    chronicle: [],
    history: [],
    weather: { year: 0, index: 2, factor: 1 },
    outbreak: null,
    dwindlingSince: null, noOneStreak: 0, harvestModifier: null,
    ended: null,
  };
}

/**
 * Un tick en el orden de §4.2: paso 2 (envejecer, migrar), paso 12 (muertes),
 * paso 13 (nacimientos). Los pasos que son de otros módulos no están.
 *
 * `starve` mete a mano el paso 7 (CONSUME) de §5.3, que es de M-06, para poder
 * comprobar la afirmación de diseño que el brief de M-04 pide.
 */
function step(s: GameState, ctx: TickContext, starve?: { acc: number }): void {
  s.tick += 1;
  if (s.tick % TIME.WEEKS_PER_YEAR === 0) resolveMigration(s);
  if (starve !== undefined) {
    // §5.3 paso 7: los muertos de la semana son una FRACCIÓN de la población.
    // Con veinte personas eso es medio muerto por semana, así que el resto se
    // arrastra en vez de truncarse; truncar no mataría nunca a nadie.
    starve.acc += population(s) * FOOD.STARVATION_RATE * ctx.severity;
    const toll = Math.floor(starve.acc);
    starve.acc -= toll;
    for (const v of s.people.villagers.filter(isHere).slice(0, toll)) {
      v.diedTick = s.tick;
      v.causeOfDeath = 'hunger';
    }
  }
  resolveDeaths(s, ctx);
  resolveBirths(s, ctx);
}

describe('recuento', () => {
  it('la población son los vivos que siguen en el valle', () => {
    const s = village(7, 6);
    expect(population(s)).toBe(FOUNDING.POPULATION);

    const [a, b] = s.people.villagers;
    (a as Villager).diedTick = 1;
    (b as Villager).leftTick = 1;
    expect(population(s)).toBe(FOUNDING.POPULATION - 2);
  });

  it('el aforo cuenta las casas en pie, de madera o de piedra', () => {
    const s = village(7, 4);
    expect(housingCapacity(s)).toBe(4 * LIFE.HOUSE_CAPACITY);
    expect(freeBeds(s)).toBe(4 * LIFE.HOUSE_CAPACITY - FOUNDING.POPULATION);

    (s.buildings[0] as Building).lostTick = 10; // una ruina no aloja a nadie
    expect(housingCapacity(s)).toBe(3 * LIFE.HOUSE_CAPACITY);

    (s.buildings[1] as Building).kind = 'stone_house';
    expect(housingCapacity(s)).toBe(3 * LIFE.HOUSE_CAPACITY);
  });

  it('la mano de obra de §5.2 cuenta enteros y medios', () => {
    const s = village(7, 6);
    s.people.villagers = [
      makeVillager({ id: 0, female: false, bornTick: -20 * TIME.WEEKS_PER_YEAR }), // 20 · 1.0
      makeVillager({ id: 1, female: true, bornTick: -13 * TIME.WEEKS_PER_YEAR }), // 13 · 0.5
      makeVillager({ id: 2, female: false, bornTick: -65 * TIME.WEEKS_PER_YEAR }), // 65 · 0.5
      makeVillager({ id: 3, female: true, bornTick: -8 * TIME.WEEKS_PER_YEAR }), // 8 · 0
      makeVillager({ id: 4, female: false, bornTick: -75 * TIME.WEEKS_PER_YEAR }), // 75 · 0
      makeVillager({ id: 5, female: true, bornTick: -59 * TIME.WEEKS_PER_YEAR }), // 59 · 1.0
    ];
    expect(workforce(s)).toBe(3);
  });

  it('los muertos y los que se fueron no trabajan', () => {
    const s = village(7, 6);
    const before = workforce(s);
    const adult = s.people.villagers.find((v) => ageOf(v, 0) >= LIFE.ADULT[0]);
    (adult as Villager).leftTick = 0;
    expect(workforce(s)).toBe(before - 1);
  });
});

describe('mortalidad · la tabla de §12.4', () => {
  it('cada edad cae en su tramo', () => {
    expect(annualMortality(0)).toBe(0.06);
    expect(annualMortality(4)).toBe(0.06);
    expect(annualMortality(5)).toBe(0.012);
    expect(annualMortality(14)).toBe(0.012);
    expect(annualMortality(15)).toBe(0.015);
    expect(annualMortality(60)).toBe(0.12);
    expect(annualMortality(75)).toBe(0.3);
    expect(annualMortality(200)).toBe(0.3);
    expect(annualMortality(300)).toBe(0.3); // nadie llega, pero no devuelve NaN
  });
});

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

describe('mortalidad · lo que la agrava', () => {
  function tollOver(years: number, ctx: TickContext, seed: number): number {
    const s = village(seed, 100);
    s.people.villagers = Array.from({ length: 2000 }, (_, i) =>
      makeVillager({ id: i, female: i % 2 === 0, bornTick: -25 * TIME.WEEKS_PER_YEAR }),
    );
    s.people.namedIds = [];
    let dead = 0;
    for (let i = 0; i < years * TIME.WEEKS_PER_YEAR; i += 1) {
      s.tick += 1;
      dead += resolveDeaths(s, ctx).length;
    }
    return dead;
  }

  it('el hambre multiplica la mortalidad', () => {
    const calm = tollOver(5, CALM, 11);
    const hungry = tollOver(5, { severity: 1, cold: false, outbreak: null, deaths: 0, unexplainedDeaths: 0 }, 11);
    expect(hungry).toBeGreaterThan(calm * 2);
  });

  it('el frío la multiplica por 1.4', () => {
    const calm = tollOver(10, CALM, 12);
    const cold = tollOver(10, { severity: 0, cold: true, outbreak: null, deaths: 0, unexplainedDeaths: 0 }, 12);
    expect(cold).toBeGreaterThan(calm);
    expect(cold / calm).toBeGreaterThan(1.2);
    expect(cold / calm).toBeLessThan(1.6);
  });

  it('un brote se lleva entre un cuarto y la mitad de la aldea', () => {
    // §5.8: "debe sentirse como una catástrofe, no como un impuesto".
    const s = village(13, 100);
    const weeks = 8;
    const ctx: TickContext = {
      severity: 0,
      cold: false,
      outbreak: { startedTick: 1, endsTick: 1 + weeks, deaths: 0 },
      deaths: 0,
      unexplainedDeaths: 0,
    };
    const before = population(s);
    for (let i = 0; i < weeks; i += 1) {
      s.tick += 1;
      resolveDeaths(s, ctx);
    }
    const lost = (before - population(s)) / before;
    expect(lost).toBeGreaterThan(0.15);
    expect(lost).toBeLessThan(0.6);
  });

  it('el brote sólo mata mientras dura', () => {
    const s = village(13, 100);
    const ctx: TickContext = {
      severity: 0,
      cold: false,
      outbreak: { startedTick: 1, endsTick: 3, deaths: 0 },
      deaths: 0,
      unexplainedDeaths: 0,
    };
    for (let i = 0; i < 2; i += 1) {
      s.tick += 1;
      resolveDeaths(s, ctx);
    }
    const after = population(s);
    for (let i = 0; i < 20; i += 1) {
      s.tick += 1;
      resolveDeaths(s, ctx); // ya fuera de [startedTick, endsTick)
    }
    // Fuera del brote sólo queda la tabla, que en 20 semanas casi no mata.
    expect(after - population(s)).toBeLessThan(3);
  });

  it('hardy y frail mueven la tasa en las direcciones de §6.3', () => {
    const s = village(21, 100);
    const N = 4000;
    s.people.villagers = [
      ...Array.from({ length: N }, (_, i) =>
        makeVillager({ id: i, female: false, bornTick: -70 * TIME.WEEKS_PER_YEAR, traits: ['hardy'] }),
      ),
      ...Array.from({ length: N }, (_, i) =>
        makeVillager({ id: N + i, female: false, bornTick: -70 * TIME.WEEKS_PER_YEAR, traits: ['frail'] }),
      ),
    ];
    s.people.namedIds = [];
    for (let i = 0; i < TIME.WEEKS_PER_YEAR; i += 1) {
      s.tick += 1;
      resolveDeaths(s, CALM);
    }
    const dead = (from: number, to: number) =>
      s.people.villagers.slice(from, to).filter((v) => v.diedTick !== null).length;
    expect(dead(N, 2 * N)).toBeGreaterThan(dead(0, N) * 1.5);
  });

  it('la muerte marca tick y causa, y saca al nombrado del reparto', () => {
    const s = village(7, 6);
    s.tick = 100;
    const victim = s.people.villagers.find((v) => v.named) as Villager;
    const before = [...s.people.namedIds];

    // Una tabla imposible de esquivar: se fuerza con una edad altísima.
    victim.bornTick = -300 * TIME.WEEKS_PER_YEAR;
    let events = resolveDeaths(s, CALM);
    for (let i = 0; i < 3000 && victim.diedTick === null; i += 1) {
      s.tick += 1;
      events = resolveDeaths(s, CALM);
    }
    expect(victim.diedTick).not.toBeNull();
    expect(victim.causeOfDeath).toBe('old_age');
    expect(s.people.namedIds).not.toContain(victim.id);
    expect(before).toContain(victim.id);
    expect(events.some((e) => e.id === victim.id)).toBe(true);
  });

  it('no toca opinions ni grudges: eso es de M-05', () => {
    const s = village(7, 6);
    const victim = s.people.villagers.find((v) => v.named) as Villager;
    const other = s.people.villagers.find((v) => v.named && v.id !== victim.id) as Villager;
    victim.bornTick = -300 * TIME.WEEKS_PER_YEAR;
    s.people.grudges = [
      { fromId: other.id, toId: victim.id, cause: 'was_blamed', causeTick: 0, formedTick: 0, healedTick: null },
    ];
    for (let i = 0; i < 3000 && victim.diedTick === null; i += 1) {
      s.tick += 1;
      resolveDeaths(s, CALM);
    }
    expect(victim.diedTick).not.toBeNull();
    expect(other.opinions[victim.id]).toBe(0);
    expect(s.people.grudges).toHaveLength(1);
    expect(s.people.grudges[0]?.healedTick).toBeNull();
  });
});

describe('nacimientos', () => {
  it('la fórmula de §6.5 responde a comida, ánimo y camas', () => {
    const births = (grain: number, morale: number, houses: number): number => {
      const s = village(31, houses);
      s.village.grain = grain;
      s.village.morale = morale;
      let n = 0;
      for (let i = 0; i < 20 * TIME.WEEKS_PER_YEAR; i += 1) {
        s.tick += 1;
        n += resolveBirths(s, CALM).length;
        s.village.grain = grain; // el granero no es asunto de este test
      }
      return n;
    };

    const rich = births(5000, 90, 12);
    const poor = births(60, 90, 12); // foodFactor casi 0
    const glum = births(5000, 5, 12); // moraleFactor 0.64 contra 1.32
    const cramped = births(5000, 90, 4); // sin camas libres: ×0.15

    expect(poor).toBeLessThan(rich / 3);
    expect(glum).toBeLessThan(rich);
    expect(cramped).toBeLessThan(rich / 2);
  });

  it('sin comida no nace nadie', () => {
    const s = village(31, 12);
    s.village.grain = 0;
    for (let i = 0; i < 5 * TIME.WEEKS_PER_YEAR; i += 1) {
      s.tick += 1;
      expect(resolveBirths(s, CALM)).toEqual([]);
    }
  });

  it('sólo paren las mujeres en edad fértil', () => {
    const s = village(31, 12);
    for (let i = 0; i < 30 * TIME.WEEKS_PER_YEAR; i += 1) {
      s.tick += 1;
      for (const e of resolveBirths(s, CALM)) {
        const mother = s.people.villagers.find((v) => v.id === e.motherId) as Villager;
        expect(mother.female).toBe(true);
        const age = ageOf(mother, s.tick);
        expect(age).toBeGreaterThanOrEqual(LIFE.FERTILE[0]);
        expect(age).toBeLessThanOrEqual(LIFE.FERTILE[1]);
      }
    }
  });

  it('el padre es un adulto vivo, o nadie si no hay ninguno', () => {
    const s = village(31, 12);
    for (let i = 0; i < 20 * TIME.WEEKS_PER_YEAR; i += 1) {
      s.tick += 1;
      for (const e of resolveBirths(s, CALM)) {
        if (e.fatherId === null) continue;
        const father = s.people.villagers.find((v) => v.id === e.fatherId) as Villager;
        expect(father.female).toBe(false);
        expect(isHere(father)).toBe(true);
        expect(ageOf(father, s.tick)).toBeGreaterThanOrEqual(LIFE.ADULT[0]);
      }
    }
  });

  it('el recién nacido nace hoy, anónimo y con sus dos padres apuntados', () => {
    const s = village(31, 12);
    for (let i = 0; i < 10 * TIME.WEEKS_PER_YEAR; i += 1) {
      s.tick += 1;
      for (const e of resolveBirths(s, CALM)) {
        const baby = s.people.villagers.find((v) => v.id === e.id) as Villager;
        expect(baby.bornTick).toBe(s.tick);
        expect(ageOf(baby, s.tick)).toBe(0);
        expect(baby.named).toBe(false);
        expect(baby.name).toBe('');
        expect(baby.traits).toEqual([]);
        expect(baby.parentIds[0]).toBe(e.motherId);
        expect(baby.parentIds[1]).toBe(e.fatherId);
      }
    }
  });

  it('un recién nacido no muere en el tick en que nace', () => {
    // §4.2: los pasos 12 y 13 van sobre listas fotografiadas.
    const s = village(31, 12);
    s.tick = 500;
    const born = resolveBirths(s, CALM).map((e) => e.id);
    const killed = resolveDeaths(s, CALM).map((e) => e.id);
    for (const id of born) expect(killed).not.toContain(id);
  });

  it('los ids no se reciclan', () => {
    const s = village(31, 12);
    const seen = new Set<number>(s.people.villagers.map((v) => v.id));
    for (let i = 0; i < 30 * TIME.WEEKS_PER_YEAR; i += 1) {
      s.tick += 1;
      for (const e of resolveBirths(s, CALM)) {
        expect(seen.has(e.id)).toBe(false);
        seen.add(e.id);
      }
      resolveDeaths(s, CALM);
    }
    expect(s.people.nextId).toBe(seen.size);
  });
});

describe('migración · las puertas de §5.7', () => {
  /** Un estado con las cinco puertas abiertas, en la semana 0. */
  function open(seed: number): GameState {
    const s = village(seed, 12); // 60 camas para 20 personas
    s.tick = TIME.WEEKS_PER_YEAR;
    s.village.morale = 70;
    s.village.grain = 3000;
    return s;
  }

  const arrivalsOver = (make: (seed: number) => GameState, seeds = 60): number => {
    let n = 0;
    for (let seed = 0; seed < seeds; seed += 1) {
      for (const e of resolveMigration(make(seed))) if (e.kind === 'arrival') n += 1;
    }
    return n;
  };

  it('con las cinco puertas abiertas, a veces llega gente', () => {
    expect(arrivalsOver(open)).toBeGreaterThan(5);
  });

  it('puerta 1 · hacen falta al menos ARRIVE_MIN_PEOPLE', () => {
    expect(
      arrivalsOver((seed) => {
        const s = open(seed);
        const keep = MIGRATION.ARRIVE_MIN_PEOPLE - 1;
        for (const v of s.people.villagers.slice(keep)) v.diedTick = 0;
        return s;
      }),
    ).toBe(0);
  });

  it('puerta 2 · hace falta ánimo ARRIVE_MIN_MORALE', () => {
    expect(
      arrivalsOver((seed) => {
        const s = open(seed);
        s.village.morale = MIGRATION.ARRIVE_MIN_MORALE - 1;
        return s;
      }),
    ).toBe(0);
  });

  it('puerta 3 · hace falta medio año de grano', () => {
    expect(
      arrivalsOver((seed) => {
        const s = open(seed);
        const halfYear =
          population(s) * TIME.WEEKS_PER_YEAR * MIGRATION.ARRIVE_MIN_GRAIN_YEARS;
        s.village.grain = halfYear - 1;
        return s;
      }),
    ).toBe(0);
  });

  it('puerta 4 · la bandera hostile cierra el valle', () => {
    // §5.7: una aldea con mala reputación deja de crecer sin que muera nadie.
    expect(
      arrivalsOver((seed) => {
        const s = open(seed);
        s.flags['hostile'] = 0; // permanente
        return s;
      }),
    ).toBe(0);

    // Y una bandera ya caducada no cierra nada.
    expect(
      arrivalsOver((seed) => {
        const s = open(seed);
        s.flags['hostile'] = s.tick - 1;
        return s;
      }),
    ).toBeGreaterThan(5);
  });

  it('puerta 5 · hacen falta ARRIVE_MIN_FREE_BEDS camas libres', () => {
    expect(
      arrivalsOver((seed) => {
        const s = open(seed);
        // Justo una cama menos de las que exige §5.7.
        const needed = population(s) + MIGRATION.ARRIVE_MIN_FREE_BEDS - 1;
        s.buildings = Array.from(
          { length: Math.floor(needed / LIFE.HOUSE_CAPACITY) },
          (_, i) => house(i),
        );
        return s;
      }),
    ).toBe(0);
  });

  it('puerta 6 · aun con todo abierto, sólo pasa el 30 % de las veces', () => {
    let arrivals = 0;
    const SEEDS = 400;
    for (let seed = 0; seed < SEEDS; seed += 1) {
      if (resolveMigration(open(seed)).some((e) => e.kind === 'arrival')) arrivals += 1;
    }
    expect(arrivals / SEEDS).toBeGreaterThan(MIGRATION.ARRIVE_CHANCE - 0.08);
    expect(arrivals / SEEDS).toBeLessThan(MIGRATION.ARRIVE_CHANCE + 0.08);
  });

  it('sólo se mira en la semana 0', () => {
    for (const tick of [1, 13, 35, 47, 49]) {
      const s = open(0);
      s.tick = tick;
      expect(resolveMigration(s)).toEqual([]);
    }
  });

  it('llegan de 2 a 4, anónimos, jóvenes o niños', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const s = open(seed);
      for (const e of resolveMigration(s)) {
        if (e.kind !== 'arrival') continue;
        expect(e.ids.length).toBeGreaterThanOrEqual(MIGRATION.ARRIVE_COUNT[0]);
        expect(e.ids.length).toBeLessThanOrEqual(MIGRATION.ARRIVE_COUNT[1]);
        for (const id of e.ids) {
          const v = s.people.villagers.find((x) => x.id === id) as Villager;
          expect(v.named).toBe(false);
          expect(v.role).toBeNull();
          expect(v.traits).toEqual([]);
          const age = ageOf(v, s.tick);
          expect(age).toBeGreaterThanOrEqual(FOUNDING.AGE_RANGES.children[0]);
          expect(age).toBeLessThanOrEqual(MIGRATION.ARRIVE_ADULT_AGE[1]);
        }
      }
    }
  });

  it('llegan adultos jóvenes y niños, no sólo una cosa', () => {
    let adults = 0;
    let children = 0;
    for (let seed = 0; seed < 300; seed += 1) {
      const s = open(seed);
      for (const e of resolveMigration(s)) {
        if (e.kind !== 'arrival') continue;
        for (const id of e.ids) {
          const v = s.people.villagers.find((x) => x.id === id) as Villager;
          if (ageOf(v, s.tick) >= MIGRATION.ARRIVE_ADULT_AGE[0]) adults += 1;
          else children += 1;
        }
      }
    }
    expect(adults).toBeGreaterThan(0);
    expect(children).toBeGreaterThan(0);
    expect(children / (adults + children)).toBeGreaterThan(0.15);
    expect(children / (adults + children)).toBeLessThan(0.55);
  });
});

describe('migración · la marcha', () => {
  function glum(seed: number, morale: number): GameState {
    const s = village(seed, 12);
    s.tick = TIME.WEEKS_PER_YEAR;
    s.village.morale = morale;
    return s;
  }

  it('con el ánimo por los suelos se va gente', () => {
    let departures = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      if (resolveMigration(glum(seed, 5)).some((e) => e.kind === 'departure')) departures += 1;
    }
    // p = (30 − 5)/60 ≈ 0.417
    expect(departures / 200).toBeGreaterThan(0.3);
    expect(departures / 200).toBeLessThan(0.55);
  });

  it('por encima de LEAVE_BELOW_MORALE no se va nadie', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const s = glum(seed, MIGRATION.LEAVE_BELOW_MORALE);
      expect(resolveMigration(s).some((e) => e.kind === 'departure')).toBe(false);
    }
  });

  it('se van de 1 a 3, y sólo anónimos', () => {
    for (let seed = 0; seed < 200; seed += 1) {
      const s = glum(seed, 5);
      for (const e of resolveMigration(s)) {
        if (e.kind !== 'departure') continue;
        expect(e.ids.length).toBeGreaterThanOrEqual(MIGRATION.LEAVE_COUNT[0]);
        expect(e.ids.length).toBeLessThanOrEqual(MIGRATION.LEAVE_COUNT[1]);
        expect(new Set(e.ids).size).toBe(e.ids.length);
        for (const id of e.ids) {
          const v = s.people.villagers.find((x) => x.id === id) as Villager;
          expect(v.named).toBe(false);
          expect(v.leftTick).toBe(s.tick);
          expect(v.diedTick).toBeNull(); // se fueron, no murieron
          expect(isHere(v)).toBe(false);
        }
      }
    }
  });

  it('nadie llega y se va el mismo año', () => {
    // Las dos puertas se excluyen: una pide ánimo ≥ 50, la otra < 30.
    for (let seed = 0; seed < 200; seed += 1) {
      for (const morale of [5, 29, 30, 49, 50, 70]) {
        const s = village(seed, 12);
        s.tick = TIME.WEEKS_PER_YEAR;
        s.village.morale = morale;
        const kinds = resolveMigration(s).map((e) => e.kind);
        expect(new Set(kinds).size).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('la aldea a lo largo de los años', () => {
  it('sin hambre ni peste, y con techo, crece en diez semillas', () => {
    for (let seed = 0; seed < 10; seed += 1) {
      const s = village(seed, 12);
      const before = population(s);
      for (let i = 0; i < 15 * TIME.WEEKS_PER_YEAR; i += 1) {
        step(s, CALM);
        s.village.grain = 5000;
      }
      expect(population(s), `semilla ${seed}`).toBeGreaterThan(before);
    }
  });

  it('con severity 1 sostenido, deja de reproducirse y encoge', () => {
    // Sólo con la mortalidad de §6.5. La extinción en cinco años es del paso 7
    // (FOOD.STARVATION_RATE), que es de M-06 — ver el test siguiente.
    const hungry: TickContext = { severity: 1, cold: false, outbreak: null, deaths: 0, unexplainedDeaths: 0 };
    for (let seed = 0; seed < 10; seed += 1) {
      const s = village(seed, 12);
      s.village.grain = 0;
      const before = population(s);
      let born = 0;
      for (let i = 0; i < 5 * TIME.WEEKS_PER_YEAR; i += 1) {
        s.tick += 1;
        resolveDeaths(s, hungry);
        born += resolveBirths(s, hungry).length;
      }
      expect(born, `semilla ${seed}`).toBe(0);
      expect(population(s), `semilla ${seed}`).toBeLessThan(before);
    }
  });

  it('con el paso 7 de §5.3 encima, muere en menos de cinco años', () => {
    // La afirmación del brief, con el consumo de M-06 puesto a mano.
    const hungry: TickContext = { severity: 1, cold: false, outbreak: null, deaths: 0, unexplainedDeaths: 0 };
    for (let seed = 0; seed < 10; seed += 1) {
      const s = village(seed, 12);
      s.village.grain = 0;
      const starve = { acc: 0 };
      let weeks = 0;
      for (let i = 0; i < 5 * TIME.WEEKS_PER_YEAR && population(s) > 0; i += 1) {
        step(s, hungry, starve);
        weeks += 1;
      }
      expect(population(s), `semilla ${seed}`).toBe(0);
      expect(weeks, `semilla ${seed}`).toBeLessThan(5 * TIME.WEEKS_PER_YEAR);
    }
  });

  it('la misma semilla vive la misma vida', () => {
    const run = (): GameState => {
      const s = village(77, 12);
      for (let i = 0; i < 5 * TIME.WEEKS_PER_YEAR; i += 1) {
        step(s, CALM);
        s.village.grain = 5000;
      }
      return s;
    };
    expect(run().people).toEqual(run().people);
  });

  it('ninguna edad se vuelve negativa ni NaN en un siglo', () => {
    const s = village(5, 16);
    for (let i = 0; i < 100 * TIME.WEEKS_PER_YEAR; i += 1) {
      step(s, CALM);
      s.village.grain = 8000;
      if (i % 500 !== 0) continue;
      for (const v of s.people.villagers) {
        const age = ageOf(v, s.tick);
        expect(Number.isFinite(age)).toBe(true);
        expect(age).toBeGreaterThanOrEqual(0);
        expect(v.bornTick).toBeLessThanOrEqual(s.tick);
      }
    }
  });

  it('todos cumplen a la vez, en la semana 0, sin que nadie los envejezca', () => {
    // §6.5: la edad se deriva de bornTick en años de calendario. No hay ninguna
    // función de envejecer porque no hay ningún campo que incrementar.
    const s = village(7, 6);
    for (const v of s.people.villagers) {
      expect(ageOf(v, TIME.WEEKS_PER_YEAR - 1)).toBe(ageOf(v, 0));
      expect(ageOf(v, TIME.WEEKS_PER_YEAR)).toBe(ageOf(v, 0) + 1);
    }
  });
});
