// M-03 · design.md §3.4, §6.1, §6.2, §6.3, §12.2.
//
// La primera vez que el proyecto produce algo parecido a contenido. Lo que hay
// que proteger no es que las funciones se llamen entre sí, sino tres
// propiedades: que la fundación sea jugable, que dos partidas se lean distintas
// y que nadie tenga el nombre de otro.
import { describe, expect, it } from 'vitest';
import { FOUNDING, LIFE, PEOPLE, TIME, TRAIT_WEIGHTS } from '@engine/balance';
import { makeBundle } from '@engine/rng';
import type { GameState, Role, Trait, Villager } from '@engine/state';
import { FEMALE_NAMES, MALE_NAMES, makeName } from '@engine/people/names';
import { ALL_TRAITS, rollTraits } from '@engine/people/traits';
import {
  FOUNDING_ROLES,
  ageOf,
  foundPeople,
  makeVillager,
  minAgeFor,
  promoteToNamed,
} from '@engine/people/villagers';

const CELLS = 36 * 56;

/** Un estado mínimo pero completo, fundado con la semilla dada. */
function stateOf(seed: number): GameState {
  const rng = makeBundle(seed);
  const people = foundPeople(rng, 0);
  return {
    version: 1,
    seed,
    tick: 0,
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
    village: {
      grain: FOUNDING.GRAIN,
      wood: FOUNDING.WOOD,
      morale: FOUNDING.MORALE,
      faith: FOUNDING.FAITH,
    },
    people,
    buildings: [],
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

const namedOf = (s: GameState): Villager[] =>
  s.people.namedIds
    .map((id) => s.people.villagers.find((v) => v.id === id))
    .filter((v): v is Villager => v !== undefined);

describe('nombres · bancos', () => {
  it('cada banco tiene 60 entradas', () => {
    expect(MALE_NAMES.length).toBe(60);
    expect(FEMALE_NAMES.length).toBe(60);
  });

  it('no hay repetidos dentro de cada banco', () => {
    expect(new Set(MALE_NAMES).size).toBe(MALE_NAMES.length);
    expect(new Set(FEMALE_NAMES).size).toBe(FEMALE_NAMES.length);
  });

  it('conserva literalmente las 24 primeras del Anexo B.1', () => {
    expect(MALE_NAMES.slice(0, 6)).toEqual([
      'Aelric', 'Osric', 'Cuthbert', 'Godwin', 'Leofric', 'Wulfstan',
    ]);
    expect(FEMALE_NAMES.slice(0, 6)).toEqual([
      'Mildreth', 'Aelfgifu', 'Edith', 'Godgifu', 'Hild', 'Leofwynn',
    ]);
    expect(MALE_NAMES).toContain('Edmund');
    expect(FEMALE_NAMES).toContain('Edith');
  });

  it('son nombres de pila, sin apellidos ni espacios', () => {
    for (const n of [...MALE_NAMES, ...FEMALE_NAMES]) {
      expect(n).toMatch(/^[A-Z][a-z]+$/);
      expect(n.length).toBeGreaterThan(3);
    }
  });

  it('makeName nunca devuelve un nombre ya usado', () => {
    const b = makeBundle(3);
    const used = new Set<string>();
    for (let i = 0; i < 60; i += 1) {
      const n = makeName(b, false, used);
      expect(used.has(n)).toBe(false);
      used.add(n);
    }
    expect(used.size).toBe(MALE_NAMES.length);
  });

  it('makeName consume exactamente una tirada, colisione o no', () => {
    const control = makeBundle(3);
    const first = makeName(control, true, new Set());

    const narrow = makeBundle(3);
    makeName(narrow, true, new Set([first]));
    const wide = makeBundle(3);
    makeName(wide, true, new Set());
    expect(narrow.names).toBe(wide.names);
  });

  it('respeta el sexo', () => {
    const b = makeBundle(9);
    for (let i = 0; i < 200; i += 1) {
      expect(FEMALE_NAMES).toContain(makeName(b, true, new Set()));
      expect(MALE_NAMES).toContain(makeName(b, false, new Set()));
    }
  });
});

describe('rasgos', () => {
  it('siempre 3 o 4, y sin duplicados', () => {
    const b = makeBundle(11);
    const roles: (Role | null)[] = [...FOUNDING_ROLES, 'herbalist', 'stranger', null];
    for (let i = 0; i < 3000; i += 1) {
      const role = roles[i % roles.length] ?? null;
      const t = rollTraits(b, role);
      expect(t.length).toBeGreaterThanOrEqual(3);
      expect(t.length).toBeLessThanOrEqual(4);
      expect(new Set(t).size).toBe(t.length);
      for (const x of t) expect(ALL_TRAITS).toContain(x);
    }
  });

  it('nadie es a la vez hardy y frail', () => {
    // §6.3 les da multiplicadores opuestos sobre el mismo número.
    const b = makeBundle(12);
    for (let i = 0; i < 3000; i += 1) {
      const t = rollTraits(b, null);
      expect(t.includes('hardy') && t.includes('frail')).toBe(false);
    }
  });

  it('la inclinación del rol se nota, sin volverse determinista', () => {
    // §6.3: "un priest tiene alta probabilidad de devout". Alta, no segura:
    // un cura mundano tiene que poder existir.
    const b = makeBundle(13);
    const N = 4000;
    let devoutPriests = 0;
    let devoutReeves = 0;
    for (let i = 0; i < N; i += 1) {
      if (rollTraits(b, 'priest').includes('devout')) devoutPriests += 1;
      if (rollTraits(b, 'reeve').includes('devout')) devoutReeves += 1;
    }
    expect(devoutPriests / N).toBeGreaterThan(2 * (devoutReeves / N));
    expect(devoutPriests / N).toBeLessThan(0.95);
    expect(devoutPriests / N).toBeGreaterThan(0.4);
  });

  it('la tabla de pesos sólo nombra roles y rasgos que existen', () => {
    const roles: readonly Role[] = [...FOUNDING_ROLES, 'herbalist', 'stranger'];
    for (const [role, leaning] of Object.entries(TRAIT_WEIGHTS)) {
      expect(roles).toContain(role as Role);
      for (const trait of Object.keys(leaning)) expect(ALL_TRAITS).toContain(trait as Trait);
    }
    // Todos los roles de §6.2 tienen fila: un rol sin inclinación sería un
    // personaje sin oficio en el reparto.
    expect(Object.keys(TRAIT_WEIGHTS).sort()).toEqual([...roles].sort());
  });

  it('un rol nulo reparte uniformemente', () => {
    const b = makeBundle(14);
    const counts = new Map<Trait, number>();
    for (let i = 0; i < 6000; i += 1) {
      for (const t of rollTraits(b, null)) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    expect(counts.size).toBe(ALL_TRAITS.length);
    const values = [...counts.values()];
    expect(Math.min(...values) / Math.max(...values)).toBeGreaterThan(0.8);
  });
});

describe('fundación', () => {
  it('produce exactamente FOUNDING.POPULATION personas', () => {
    for (const seed of [7, 42, 108, 999]) {
      const p = foundPeople(makeBundle(seed), 0);
      expect(p.villagers.length).toBe(FOUNDING.POPULATION);
      expect(p.nextId).toBe(FOUNDING.POPULATION);
      expect(p.grudges).toEqual([]);
    }
  });

  it('reparte las edades como manda §12.2', () => {
    const inRange = (a: number, r: readonly [number, number]) => a >= r[0] && a <= r[1];
    for (const seed of [7, 42, 108, 999, 2024]) {
      const p = foundPeople(makeBundle(seed), 0);
      const ages = p.villagers.map((v) => ageOf(v, 0));
      const adults = ages.filter((a) => inRange(a, FOUNDING.AGE_RANGES.adults)).length;
      const children = ages.filter((a) => inRange(a, FOUNDING.AGE_RANGES.children)).length;
      const elders = ages.filter((a) => inRange(a, FOUNDING.AGE_RANGES.elders)).length;
      expect([adults, children, elders]).toEqual([
        FOUNDING.ADULTS,
        FOUNDING.CHILDREN,
        FOUNDING.ELDERS,
      ]);
    }
  });

  it('cubre los seis oficios de §6.2, uno por persona y todos adultos', () => {
    for (const seed of [7, 42, 108, 999]) {
      const p = foundPeople(makeBundle(seed), 0);
      const named = p.namedIds.map((id) => p.villagers[id]);
      expect(named.length).toBe(FOUNDING_ROLES.length);
      expect(named.map((v) => v?.role).sort()).toEqual([...FOUNDING_ROLES].sort());
      expect(new Set(p.namedIds).size).toBe(p.namedIds.length);
      for (const v of named) {
        expect(v?.named).toBe(true);
        const age = ageOf(v as Villager, 0);
        expect(age).toBeGreaterThanOrEqual(FOUNDING.AGE_RANGES.adults[0]);
        expect(age).toBeLessThanOrEqual(FOUNDING.AGE_RANGES.adults[1]);
      }
    }
  });

  it('la comadrona es una mujer', () => {
    // §6.2: "Una adulta lo hereda".
    for (let seed = 0; seed < 200; seed += 1) {
      const p = foundPeople(makeBundle(seed), 0);
      const midwife = p.villagers.find((v) => v.role === 'midwife');
      expect(midwife?.female, `semilla ${seed}`).toBe(true);
    }
  });

  it('nadie toma un oficio por debajo de su edad mínima habiendo quien lo cumpla', () => {
    // §12.4 ROLE_MIN_AGE. Sin suelo salían comadronas de diecisiete años. El
    // respaldo —el de más edad disponible— sólo puede saltar cuando NADIE lo
    // cumple: un oficio joven es mejor que un oficio vacante, pero sólo
    // entonces.
    let fallbacks = 0;
    const SEEDS = 500;
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const p = foundPeople(makeBundle(seed), 0);
      for (const role of FOUNDING_ROLES) {
        const v = p.villagers.find((x) => x.role === role);
        expect(v, `semilla ${seed} · ${role}`).toBeDefined();
        const holder = v as Villager;
        if (ageOf(holder, 0) >= minAgeFor(role)) continue;

        fallbacks += 1;
        const spare = p.villagers.filter(
          (x) =>
            x.role === null &&
            ageOf(x, 0) >= FOUNDING.AGE_RANGES.adults[0] &&
            ageOf(x, 0) <= FOUNDING.AGE_RANGES.adults[1] &&
            (role !== 'midwife' || x.female) &&
            ageOf(x, 0) >= minAgeFor(role),
        );
        expect(spare, `semilla ${seed} · ${role} tenía candidato de sobra`).toEqual([]);
      }
    }
    // Y el respaldo tiene que ser una rareza, no la vía normal.
    expect(fallbacks / (SEEDS * FOUNDING_ROLES.length)).toBeLessThan(0.01);
  });

  it('cada oficio va al más viejo que lo cumple, no a uno cualquiera', () => {
    // La comadrona (suelo 28) reparte primero por ser la más exigente y la
    // única con requisito de sexo; nadie puede llevarse a la anciana que
    // necesitaba.
    for (const seed of [7, 42, 108, 999, 2024]) {
      const p = foundPeople(makeBundle(seed), 0);
      const midwife = p.villagers.find((x) => x.role === 'midwife');
      const olderWomen = p.villagers.filter(
        (x) =>
          x.female &&
          x.id !== midwife?.id &&
          ageOf(x, 0) > ageOf(midwife as Villager, 0) &&
          ageOf(x, 0) <= FOUNDING.AGE_RANGES.adults[1] &&
          ageOf(x, 0) >= FOUNDING.AGE_RANGES.adults[0],
      );
      expect(olderWomen, `semilla ${seed}`).toEqual([]);
    }
  });

  it('los seis oficios siguen cubiertos aunque el suelo apriete', () => {
    // Un oficio joven es mejor que un oficio vacante en la fundación.
    for (let seed = 0; seed < 500; seed += 1) {
      const p = foundPeople(makeBundle(seed), 0);
      expect(p.namedIds.length, `semilla ${seed}`).toBe(FOUNDING_ROLES.length);
    }
  });

  it('garantiza mujeres fértiles suficientes en 1 000 semillas', () => {
    // Una fundación que no puede reproducirse es una partida muerta al nacer.
    for (let seed = 0; seed < 1000; seed += 1) {
      const p = foundPeople(makeBundle(seed), 0);
      const fertile = p.villagers.filter(
        (v) => v.female && ageOf(v, 0) >= LIFE.FERTILE[0] && ageOf(v, 0) <= LIFE.FERTILE[1],
      ).length;
      expect(fertile, `semilla ${seed}`).toBeGreaterThanOrEqual(FOUNDING.MIN_FERTILE_WOMEN);
    }
  });

  it('no repite ningún nombre en 1 000 semillas', () => {
    for (let seed = 0; seed < 1000; seed += 1) {
      const p = foundPeople(makeBundle(seed), 0);
      const names = p.villagers.filter((v) => v.named).map((v) => v.name);
      expect(new Set(names).size, `semilla ${seed}`).toBe(names.length);
      for (const n of names) expect(n.length, `semilla ${seed}`).toBeGreaterThan(0);
    }
  });

  it('los nombrados llevan 3 o 4 rasgos y el nombre de su sexo', () => {
    for (const seed of [7, 42, 108, 999]) {
      const p = foundPeople(makeBundle(seed), 0);
      for (const v of p.villagers.filter((x) => x.named)) {
        expect(v.traits.length).toBeGreaterThanOrEqual(3);
        expect(v.traits.length).toBeLessThanOrEqual(4);
        expect(new Set(v.traits).size).toBe(v.traits.length);
        expect(v.female ? FEMALE_NAMES : MALE_NAMES).toContain(v.name);
      }
    }
  });

  it('los anónimos no tienen nombre, rasgos, memoria ni opiniones', () => {
    // §6.1: existen como registros con edad, sexo y casa. Nada más.
    for (const seed of [7, 42, 108]) {
      const p = foundPeople(makeBundle(seed), 0);
      const anon = p.villagers.filter((v) => !v.named);
      expect(anon.length).toBe(FOUNDING.POPULATION - FOUNDING_ROLES.length);
      for (const v of anon) {
        expect(v.name).toBe('');
        expect(v.role).toBeNull();
        expect(v.traits).toEqual([]);
        expect(v.memories).toEqual([]);
        expect(v.opinions).toEqual({});
      }
    }
  });

  it('nadie tiene padres: son los que llegaron', () => {
    const p = foundPeople(makeBundle(7), 0);
    for (const v of p.villagers) {
      expect(v.parentIds).toEqual([null, null]);
      expect(v.diedTick).toBeNull();
      expect(v.causeOfDeath).toBeNull();
      expect(v.homeId).toBeNull();
    }
  });

  it('los nombrados se opinan entre sí, neutralmente', () => {
    const p = foundPeople(makeBundle(7), 0);
    for (const id of p.namedIds) {
      const v = p.villagers[id];
      expect(Object.keys(v?.opinions ?? {}).map(Number).sort()).toEqual(
        p.namedIds.filter((x) => x !== id).sort(),
      );
      for (const o of Object.values(v?.opinions ?? {})) expect(o).toBe(0);
    }
  });

  it('nadie nace después del tick de fundación', () => {
    // Invariante de §14.1, comprobada ya en el origen.
    for (const tick of [0, 480, 5000]) {
      for (const v of foundPeople(makeBundle(7), tick).villagers) {
        expect(v.bornTick).toBeLessThanOrEqual(tick);
      }
    }
  });

  it('la misma semilla funda la misma aldea', () => {
    expect(foundPeople(makeBundle(7), 0)).toEqual(foundPeople(makeBundle(7), 0));
  });
});

describe('fundación · variedad', () => {
  it('dos semillas dan repartos claramente distintos', () => {
    // El criterio del brief: al menos 4 de los 6 nombres de rol difieren.
    const roleNames = (seed: number): Map<Role, string> => {
      const p = foundPeople(makeBundle(seed), 0);
      const m = new Map<Role, string>();
      for (const id of p.namedIds) {
        const v = p.villagers[id];
        if (v?.role) m.set(v.role, v.name);
      }
      return m;
    };

    const pairs: ReadonlyArray<readonly [number, number]> = [
      [7, 42],
      [42, 108],
      [7, 108],
      [1, 2],
      [999, 1000],
    ];
    for (const [a, z] of pairs) {
      const x = roleNames(a);
      const y = roleNames(z);
      let differ = 0;
      for (const role of FOUNDING_ROLES) if (x.get(role) !== y.get(role)) differ += 1;
      expect(differ, `semillas ${a} y ${z}`).toBeGreaterThanOrEqual(4);
    }
  });

  it('cien semillas no producen cien veces el mismo líder', () => {
    const leaders = new Set<string>();
    const traitSets = new Set<string>();
    for (let seed = 0; seed < 100; seed += 1) {
      const p = foundPeople(makeBundle(seed), 0);
      const leader = p.villagers.find((v) => v.role === 'leader');
      if (leader) {
        leaders.add(leader.name);
        traitSets.add([...leader.traits].sort().join(','));
      }
    }
    expect(leaders.size).toBeGreaterThan(30);
    expect(traitSets.size).toBeGreaterThan(50);
  });
});

describe('promoteToNamed', () => {
  const anonAdultId = (s: GameState): number => {
    const v = s.people.villagers.find(
      (x) => !x.named && ageOf(x, s.tick) >= FOUNDING.AGE_RANGES.adults[0],
    );
    return v?.id ?? -1;
  };

  it('nace un personaje: nombre, rasgos y rol', () => {
    const s = stateOf(7);
    const id = anonAdultId(s);
    promoteToNamed(s, id, 'herbalist');
    const v = s.people.villagers.find((x) => x.id === id);
    expect(v?.named).toBe(true);
    expect(v?.role).toBe('herbalist');
    expect(v?.name.length).toBeGreaterThan(0);
    expect(v?.traits.length).toBeGreaterThanOrEqual(3);
    expect(s.people.namedIds).toContain(id);
  });

  it('no le pone el nombre de un vivo', () => {
    const s = stateOf(7);
    const taken = new Set(namedOf(s).map((v) => v.name));
    const id = anonAdultId(s);
    promoteToNamed(s, id, 'herbalist');
    const v = s.people.villagers.find((x) => x.id === id);
    expect(taken.has(v?.name ?? '')).toBe(false);
  });

  it('nunca pasa de ocho nombrados', () => {
    const s = stateOf(7);
    expect(s.people.namedIds.length).toBe(FOUNDING_ROLES.length);
    for (const v of s.people.villagers) {
      if (v.named) continue;
      promoteToNamed(s, v.id, 'stranger');
    }
    expect(s.people.namedIds.length).toBe(PEOPLE.MAX_NAMED);
    expect(s.people.villagers.filter((v) => v.named).length).toBe(PEOPLE.MAX_NAMED);
  });

  it('opina de todos los nombrados vivos, y de ninguno muerto', () => {
    const s = stateOf(42);
    const dead = namedOf(s)[0];
    if (dead === undefined) throw new Error('la fundación no nombró a nadie');
    dead.diedTick = 10;
    dead.causeOfDeath = 'old_age';
    s.people.namedIds = s.people.namedIds.filter((x) => x !== dead.id);

    const id = anonAdultId(s);
    promoteToNamed(s, id, 'herbalist');
    const v = s.people.villagers.find((x) => x.id === id);

    const living = namedOf(s).filter((x) => x.id !== id);
    expect(Object.keys(v?.opinions ?? {}).map(Number).sort()).toEqual(
      living.map((x) => x.id).sort(),
    );
    expect(v?.opinions[dead.id]).toBeUndefined();
    // Y la opinión es recíproca: los demás también lo ven llegar.
    for (const other of living) expect(other.opinions[id]).toBe(0);
    expect(dead.opinions[id]).toBeUndefined();
  });

  it('no asciende a quien no tiene edad para el oficio', () => {
    const s = stateOf(7);
    const before = [...s.people.namedIds];
    const young = s.people.villagers.find(
      (v) => !v.named && ageOf(v, s.tick) < minAgeFor('leader'),
    );
    if (young === undefined) throw new Error('la fundación no dejó a nadie joven');
    promoteToNamed(s, young.id, 'leader');
    expect(s.people.namedIds).toEqual(before);
    expect(young.named).toBe(false);
    // El mismo aldeano sí puede ser herbalist: ese oficio no tiene suelo.
    promoteToNamed(s, young.id, 'herbalist');
    expect(young.named).toBe(true);
  });

  it('no asciende a un muerto, ni a quien ya tiene nombre, ni a un desconocido', () => {
    const s = stateOf(7);
    const before = [...s.people.namedIds];

    const named = namedOf(s)[0];
    promoteToNamed(s, named?.id ?? -1, 'stranger');

    const corpse = s.people.villagers.find((v) => !v.named);
    if (corpse === undefined) throw new Error('no hay anónimos');
    corpse.diedTick = 5;
    promoteToNamed(s, corpse.id, 'stranger');
    promoteToNamed(s, 9999, 'stranger');

    expect(s.people.namedIds).toEqual(before);
    expect(corpse.named).toBe(false);
    expect(corpse.name).toBe('');
  });

  it('consume del estado, así que dos partidas iguales ascienden igual', () => {
    const a = stateOf(108);
    const z = stateOf(108);
    promoteToNamed(a, anonAdultId(a), 'herbalist');
    promoteToNamed(z, anonAdultId(z), 'herbalist');
    expect(a.people).toEqual(z.people);
    expect(a.rng).toEqual(z.rng);
  });
});

describe('makeVillager', () => {
  it('por defecto crea un anónimo', () => {
    const v = makeVillager({ id: 3, female: true, bornTick: -480 });
    expect(v).toEqual({
      id: 3,
      name: '',
      named: false,
      role: null,
      female: true,
      bornTick: -480,
      diedTick: null,
      causeOfDeath: null,
      leftTick: null,
      traits: [],
      homeId: null,
      parentIds: [null, null],
      memories: [],
      opinions: {},
    });
  });

  it('la edad sale del tick, no de un campo guardado', () => {
    const v = makeVillager({ id: 0, female: false, bornTick: 0 });
    expect(ageOf(v, 0)).toBe(0);
    expect(ageOf(v, TIME.WEEKS_PER_YEAR - 1)).toBe(0);
    expect(ageOf(v, TIME.WEEKS_PER_YEAR)).toBe(1);
    expect(ageOf(v, TIME.WEEKS_PER_YEAR * 40)).toBe(40);
  });

  it('no comparte el array de padres con quien lo pidió', () => {
    const parents: [number | null, number | null] = [1, 2];
    const v = makeVillager({ id: 0, female: false, bornTick: 0, parentIds: parents });
    parents[0] = 99;
    expect(v.parentIds).toEqual([1, 2]);
  });
});
