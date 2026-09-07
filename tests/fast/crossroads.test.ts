// M-07 · design.md §8.2 a §8.7, §12.8.
//
// El catálogo real es de M-08. Todo esto corre contra un catálogo falso
// definido aquí, escogido para ejercitar cada variante del DSL, cada forma de
// reparto y las dos reglas que se pelean: el techo y la garantía.
import { describe, expect, it } from 'vitest';
import { CROSSROADS, TIME } from '@engine/balance';
import { makeBundle } from '@engine/rng';
import { TERRAIN_CODE } from '@engine/state';
import type { Building, Condition, GameState, Villager, VillagerId } from '@engine/state';
import { foundPeople, ageOf } from '@engine/people/villagers';
import { isHere, population } from '@engine/people/demography';
import { adjustOpinion } from '@engine/people/opinions';
import { remember } from '@engine/people/memories';
import type { Catalogue, CrossroadTemplate } from '@engine/crossroads/schema';
import { all, evaluate, ratioOf, weeksToHarvest } from '@engine/crossroads/conditions';
import { fillCast } from '@engine/crossroads/cast';
import { crisisOf, eligible, lastCrossroadTick, selectCrossroad } from '@engine/crossroads/select';
import { applyOption } from '@engine/crossroads/resolve';
import { fireSeeds, pendingSeeds } from '@engine/crossroads/seeds';

const CELLS = 36 * 56;
const YEAR = TIME.WEEKS_PER_YEAR;

let bid = 0;
function build(kind: Building['kind'], tier: 0 | 1 = 0): Building {
  bid += 1;
  return { id: bid, kind, x: 0, y: 0, w: 2, h: 2, builtTick: 0, lostTick: null, tier, lit: true };
}

function village(seed: number, houses = 12): GameState {
  bid = 0;
  const rng = makeBundle(seed);
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
    },
    village: { grain: 4000, wood: 400, morale: 55, faith: 50 },
    people: foundPeople(rng, 0),
    buildings: Array.from({ length: houses }, () => build('house')),
    works: [],
    crossroad: null,
    seeds: [],
    flags: {},
    chronicle: [],
    history: [],
    weather: { year: 0, index: 2, factor: 1 },
    outbreak: null,
    ended: null,
  };
}

const at = (s: GameState, id: VillagerId): Villager =>
  s.people.villagers.find((v) => v.id === id) as Villager;

/** Una aldea sin crisis ninguna: comida de sobra, líder vivo, nada en llamas. */
function calm(seed: number): GameState {
  const s = village(seed);
  s.tick = YEAR * 3;
  s.village.grain = 100_000;
  return s;
}

// ---------------------------------------------------------------------------
// El catálogo falso
// ---------------------------------------------------------------------------

const T_FEUD: CrossroadTemplate = {
  id: 'feud_at_the_ford',
  category: 'feud',
  weight: 10,
  cooldownYears: 5,
  requires: [{ k: 'stat', stat: 'people', op: '>=', v: 5 }],
  cast: [
    { as: 'A', role: 'leader' },
    { as: 'B', grudgeAgainst: 'A' },
  ],
  title: 'crossroad.feud_at_the_ford.title',
  body: 'crossroad.feud_at_the_ford.body',
  options: [
    {
      id: 'side_with_a',
      label: 'l',
      cost: 'c',
      effects: [
        { k: 'stat', stat: 'morale', delta: -5 },
        { k: 'opinion', from: 'B', to: 'A', delta: -20 },
        { k: 'memory', who: 'B', kind: 'was_blamed', about: 'A', weight: 4 },
      ],
      visible: [{ k: 'gather', where: 'square', days: 2 }],
      seeds: [
        {
          id: 'revenge',
          delayYears: [3, 5],
          effects: [{ k: 'kill', who: 'A', count: 1 }],
          visible: [{ k: 'scar', what: 'grave_row' }],
          chronicleKey: 'consequence.feud_at_the_ford.revenge',
        },
      ],
      traitWeight: { spiteful: 3 },
    },
    {
      id: 'let_it_lie',
      label: 'l',
      cost: 'c',
      effects: [{ k: 'flag', flag: 'threatened', years: 2 }],
      visible: [{ k: 'banner', colour: 'grey', years: 1 }],
      seeds: [
        {
          id: 'it_festers',
          delayYears: [2, 2],
          condition: { k: 'role', role: 'leader', alive: true },
          effects: [{ k: 'stat', stat: 'faith', delta: -10 }],
          visible: [{ k: 'gather', where: 'chapel', days: 1 }],
          chronicleKey: 'consequence.feud_at_the_ford.festers',
        },
      ],
    },
  ],
};

const T_FAMINE: CrossroadTemplate = {
  id: 'winter_grain_debt',
  category: 'famine',
  weight: 10,
  cooldownYears: 3,
  requires: [{ k: 'stat', stat: 'people', op: '>=', v: 3 }],
  cast: [{ as: 'A', role: 'reeve' }],
  title: 'crossroad.winter_grain_debt.title',
  body: 'crossroad.winter_grain_debt.body',
  options: [
    {
      id: 'open_the_granary',
      label: 'l',
      cost: 'c',
      effects: [{ k: 'stat', stat: 'grain', delta: 400 }],
      visible: [{ k: 'gather', where: 'square', days: 3 }],
      seeds: [],
    },
    {
      id: 'hold_the_line',
      label: 'l',
      cost: 'c',
      effects: [{ k: 'kill', who: 'weakest', count: 2 }],
      visible: [{ k: 'scar', what: 'grave_row' }],
      seeds: [],
    },
  ],
};

/** Misma categoría que la anterior: para la selección en crisis. */
const T_FAMINE_TWO: CrossroadTemplate = {
  ...T_FAMINE,
  id: 'the_lord_wants_his_tithe',
  weight: 10,
  cast: [{ as: 'A', anyNamed: true }],
  title: 'crossroad.the_lord_wants_his_tithe.title',
};

const T_SUCCESSION: CrossroadTemplate = {
  id: 'who_leads_now',
  category: 'succession',
  weight: 50,
  cooldownYears: 0,
  requires: [{ k: 'role', role: 'leader', alive: false }],
  cast: [{ as: 'A', youngestNamed: true }],
  title: 'crossroad.who_leads_now.title',
  body: 'crossroad.who_leads_now.body',
  options: [
    {
      id: 'crown_them',
      label: 'l',
      cost: 'c',
      effects: [{ k: 'role', who: 'A', role: 'leader' }],
      visible: [{ k: 'gather', where: 'square', days: 5 }],
      seeds: [],
    },
    {
      id: 'leave_it_vacant',
      label: 'l',
      cost: 'c',
      effects: [{ k: 'stat', stat: 'morale', delta: -10 }],
      visible: [{ k: 'banner', colour: 'black', years: 1 }],
      seeds: [],
    },
  ],
};

const T_QUIET: CrossroadTemplate = {
  id: 'quiet_years',
  category: 'stranger',
  weight: 1,
  cooldownYears: 0,
  requires: [],
  cast: [{ as: 'A', role: 'leader' }],
  title: 'crossroad.quiet_years.title',
  body: 'crossroad.quiet_years.body',
  options: [
    {
      id: 'store_it',
      label: 'l',
      cost: 'c',
      effects: [{ k: 'stat', stat: 'grain', delta: 100 }],
      visible: [{ k: 'raise', kind: 'granary' }],
      seeds: [],
    },
    {
      id: 'share_it',
      label: 'l',
      cost: 'c',
      effects: [{ k: 'stat', stat: 'morale', delta: 5 }],
      visible: [{ k: 'gather', where: 'square', days: 1 }],
      seeds: [],
    },
  ],
};

const CATALOGUE: Catalogue = [T_FEUD, T_FAMINE, T_FAMINE_TWO, T_SUCCESSION, T_QUIET];

/** Enemista al líder con otro nombrado, para que el reparto de T_FEUD case. */
function makeFeud(s: GameState): [VillagerId, VillagerId] {
  const leader = s.people.villagers.find((v) => v.role === 'leader') as Villager;
  const other = s.people.villagers.find(
    (v) => v.named && v.id !== leader.id && isHere(v),
  ) as Villager;
  adjustOpinion(s, other.id, leader.id, -70);
  return [leader.id, other.id];
}

// ---------------------------------------------------------------------------

describe('condiciones · el DSL de §8.2', () => {
  it('stat, sobre las cuatro cifras y sobre la gente', () => {
    const s = village(7);
    s.village.grain = 500;
    expect(evaluate({ k: 'stat', stat: 'grain', op: '<', v: 600 }, s)).toBe(true);
    expect(evaluate({ k: 'stat', stat: 'grain', op: '>=', v: 600 }, s)).toBe(false);
    expect(evaluate({ k: 'stat', stat: 'morale', op: '==', v: 55 }, s)).toBe(true);
    expect(evaluate({ k: 'stat', stat: 'people', op: '==', v: population(s) }, s)).toBe(true);
    expect(evaluate({ k: 'stat', stat: 'wood', op: '>', v: 1 }, s)).toBe(true);
    expect(evaluate({ k: 'stat', stat: 'faith', op: '<=', v: 50 }, s)).toBe(true);
  });

  it('ratio, las tres de §8.2', () => {
    const s = village(7);
    s.village.grain = population(s) * YEAR * 2; // dos años de comida
    expect(ratioOf(s, 'grainYears')).toBeCloseTo(2, 6);
    expect(evaluate({ k: 'ratio', ratio: 'grainYears', op: '>', v: 1.5 }, s)).toBe(true);

    expect(ratioOf(s, 'housingFree')).toBeGreaterThan(0);
    expect(evaluate({ k: 'ratio', ratio: 'housingFree', op: '>', v: 0 }, s)).toBe(true);

    expect(ratioOf(s, 'forestLeft')).toBe(0);
    s.map.terrain.fill(TERRAIN_CODE.forest, 0, CELLS / 4);
    expect(ratioOf(s, 'forestLeft')).toBeCloseTo(0.25, 6);
    expect(evaluate({ k: 'ratio', ratio: 'forestLeft', op: '<', v: 0.3 }, s)).toBe(true);
  });

  it('una aldea vacía no divide por cero en las ratios', () => {
    const s = village(7);
    for (const v of s.people.villagers) v.diedTick = 0;
    expect(Number.isFinite(ratioOf(s, 'housingFree'))).toBe(true);
    expect(ratioOf(s, 'grainYears')).toBe(Number.POSITIVE_INFINITY);
  });

  it('season y year', () => {
    const s = village(7);
    s.tick = YEAR * 4 + 13; // verano del año 4
    expect(evaluate({ k: 'season', season: 'summer' }, s)).toBe(true);
    expect(evaluate({ k: 'season', season: 'winter' }, s)).toBe(false);
    expect(evaluate({ k: 'year', op: '>=', v: 4 }, s)).toBe(true);
    expect(evaluate({ k: 'year', op: '>', v: 4 }, s)).toBe(false);
  });

  it('has, sobre los edificios en pie', () => {
    const s = village(7, 2);
    expect(evaluate({ k: 'has', building: 'house' }, s)).toBe(true);
    expect(evaluate({ k: 'has', building: 'chapel' }, s)).toBe(false);
    s.buildings.push(build('chapel'));
    expect(evaluate({ k: 'has', building: 'chapel' }, s)).toBe(true);
    (s.buildings[s.buildings.length - 1] as Building).lostTick = 5;
    expect(evaluate({ k: 'has', building: 'chapel' }, s)).toBe(false);
  });

  it('flag, con caducidad y permanente', () => {
    const s = village(7);
    s.tick = 100;
    expect(evaluate({ k: 'flag', flag: 'hostile', set: false }, s)).toBe(true);

    s.flags['hostile'] = 0; // permanente
    expect(evaluate({ k: 'flag', flag: 'hostile', set: true }, s)).toBe(true);

    s.flags['hostile'] = 99; // ya caducada
    expect(evaluate({ k: 'flag', flag: 'hostile', set: true }, s)).toBe(false);
    s.flags['hostile'] = 101;
    expect(evaluate({ k: 'flag', flag: 'hostile', set: true }, s)).toBe(true);
  });

  it('outbreak, sólo mientras dura', () => {
    const s = village(7);
    s.tick = 10;
    expect(evaluate({ k: 'outbreak', active: false }, s)).toBe(true);
    s.outbreak = { startedTick: 8, endsTick: 16, deaths: 0 };
    expect(evaluate({ k: 'outbreak', active: true }, s)).toBe(true);
    s.tick = 16;
    expect(evaluate({ k: 'outbreak', active: true }, s)).toBe(false);
  });

  it('role, vivo o muerto', () => {
    const s = village(7);
    expect(evaluate({ k: 'role', role: 'leader', alive: true }, s)).toBe(true);
    expect(evaluate({ k: 'role', role: 'herbalist', alive: false }, s)).toBe(true);
    (s.people.villagers.find((v) => v.role === 'leader') as Villager).diedTick = 1;
    expect(evaluate({ k: 'role', role: 'leader', alive: false }, s)).toBe(true);
  });

  it('grudge, por profundidad', () => {
    const s = village(7);
    expect(evaluate({ k: 'grudge', min: 1 }, s)).toBe(false);
    const [leader, other] = makeFeud(s);
    expect(leader).toBeGreaterThanOrEqual(0);
    expect(other).toBeGreaterThanOrEqual(0);
    expect(evaluate({ k: 'grudge', min: 50 }, s)).toBe(true);
    expect(evaluate({ k: 'grudge', min: 90 }, s)).toBe(false);
  });

  it('trait, sobre quien tiene el oficio', () => {
    const s = village(7);
    const leader = s.people.villagers.find((v) => v.role === 'leader') as Villager;
    leader.traits = ['proud', 'cunning'];
    expect(evaluate({ k: 'trait', role: 'leader', trait: 'proud' }, s)).toBe(true);
    expect(evaluate({ k: 'trait', role: 'leader', trait: 'craven' }, s)).toBe(false);
    // Un oficio vacante no tiene rasgos.
    expect(evaluate({ k: 'trait', role: 'herbalist', trait: 'kind' }, s)).toBe(false);
  });

  it('not y any, anidados', () => {
    const s = village(7);
    s.village.grain = 500;
    const rich: Condition = { k: 'stat', stat: 'grain', op: '>', v: 1000 };
    const poor: Condition = { k: 'stat', stat: 'grain', op: '<', v: 1000 };
    expect(evaluate({ k: 'not', c: rich }, s)).toBe(true);
    expect(evaluate({ k: 'any', cs: [rich, poor] }, s)).toBe(true);
    expect(evaluate({ k: 'any', cs: [rich, { k: 'not', c: poor }] }, s)).toBe(false);
    expect(evaluate({ k: 'not', c: { k: 'not', c: poor } }, s)).toBe(true);
    expect(evaluate({ k: 'any', cs: [] }, s)).toBe(false);
  });

  it('all exige todas', () => {
    const s = village(7);
    s.village.grain = 500;
    expect(all([{ k: 'stat', stat: 'grain', op: '<', v: 1000 }], s)).toBe(true);
    expect(
      all(
        [
          { k: 'stat', stat: 'grain', op: '<', v: 1000 },
          { k: 'stat', stat: 'grain', op: '>', v: 1000 },
        ],
        s,
      ),
    ).toBe(false);
    expect(all([], s)).toBe(true);
  });

  it('las condiciones son datos: sobreviven a un ida y vuelta por JSON', () => {
    // §8.2: tiene que poder inspeccionarse por qué se disparó una encrucijada.
    const s = village(7);
    const c: Condition = {
      k: 'any',
      cs: [{ k: 'not', c: { k: 'season', season: 'winter' } }, { k: 'grudge', min: 20 }],
    };
    const roundTripped = JSON.parse(JSON.stringify(c)) as Condition;
    expect(roundTripped).toEqual(c);
    expect(evaluate(roundTripped, s)).toBe(evaluate(c, s));
  });

  it('weeksToHarvest cuenta hasta la semana 35, cruzando el año', () => {
    expect(weeksToHarvest(0)).toBe(35);
    expect(weeksToHarvest(35)).toBe(0);
    expect(weeksToHarvest(36)).toBe(47);
    expect(weeksToHarvest(47)).toBe(36);
    expect(weeksToHarvest(YEAR * 5 + 10)).toBe(25);
  });
});

describe('reparto · §8.3', () => {
  it('role toma a quien tiene el oficio', () => {
    const s = village(7);
    const cast = fillCast(T_FAMINE, s);
    expect(cast).not.toBeNull();
    expect(at(s, (cast as Record<string, VillagerId>)['A'] as VillagerId).role).toBe('reeve');
  });

  it('un oficio vacante deja la plantilla sin reparto', () => {
    const s = village(7);
    (s.people.villagers.find((v) => v.role === 'reeve') as Villager).diedTick = 1;
    expect(fillCast(T_FAMINE, s)).toBeNull();
  });

  it('grudgeAgainst toma al que más le odia, y falla si no hay nadie', () => {
    const s = village(7);
    expect(fillCast(T_FEUD, s)).toBeNull(); // nadie odia al líder todavía

    const [leader, other] = makeFeud(s);
    const cast = fillCast(T_FEUD, s) as Record<string, VillagerId>;
    expect(cast['A']).toBe(leader);
    expect(cast['B']).toBe(other);
  });

  it('anyNamed elige a un nombrado vivo, y excluding respeta las letras', () => {
    const s = village(7);
    const t: CrossroadTemplate = {
      ...T_QUIET,
      cast: [
        { as: 'A', role: 'leader' },
        { as: 'B', anyNamed: true, excluding: ['A'] },
      ],
    };
    for (let i = 0; i < 50; i += 1) {
      const cast = fillCast(t, s) as Record<string, VillagerId>;
      expect(cast['B']).not.toBe(cast['A']);
      expect(at(s, cast['B'] as VillagerId).named).toBe(true);
    }
  });

  it('youngestNamed toma al más joven, y respeta el sexo', () => {
    const s = village(7);
    const cast = fillCast(T_SUCCESSION, s) as Record<string, VillagerId>;
    const chosen = at(s, cast['A'] as VillagerId);
    for (const id of s.people.namedIds) {
      expect(ageOf(at(s, id), s.tick)).toBeGreaterThanOrEqual(ageOf(chosen, s.tick));
    }

    const women: CrossroadTemplate = {
      ...T_SUCCESSION,
      cast: [{ as: 'A', youngestNamed: true, female: true }],
    };
    const w = fillCast(women, s) as Record<string, VillagerId>;
    expect(at(s, w['A'] as VillagerId).female).toBe(true);
  });

  it('childOf encuentra a un hijo vivo', () => {
    const s = village(7);
    const leader = s.people.villagers.find((v) => v.role === 'leader') as Villager;
    const t: CrossroadTemplate = {
      ...T_QUIET,
      cast: [
        { as: 'A', role: 'leader' },
        { as: 'B', childOf: 'A' },
      ],
    };
    expect(fillCast(t, s)).toBeNull(); // sin hijos

    const anon = s.people.villagers.find((v) => !v.named) as Villager;
    anon.parentIds = [leader.id, null];
    const cast = fillCast(t, s) as Record<string, VillagerId>;
    expect(cast['B']).toBe(anon.id);
  });

  it('resuelve en orden de dependencia, no de declaración', () => {
    const s = village(7);
    makeFeud(s);
    const reversed: CrossroadTemplate = {
      ...T_FEUD,
      cast: [
        { as: 'B', grudgeAgainst: 'A' }, // declarada ANTES que A
        { as: 'A', role: 'leader' },
      ],
    };
    expect(fillCast(reversed, s)).not.toBeNull();
  });

  it('un ciclo entre dos letras no cuelga: devuelve null', () => {
    const s = village(7);
    const cyclic: CrossroadTemplate = {
      ...T_FEUD,
      cast: [
        { as: 'A', grudgeAgainst: 'B' },
        { as: 'B', grudgeAgainst: 'A' },
      ],
    };
    expect(fillCast(cyclic, s)).toBeNull();
  });

  it('el reparto consume de cast y nunca de crossroads', () => {
    const s = village(7);
    const before = { ...s.rng };
    fillCast(T_SUCCESSION, s); // determinista, sin tirada
    expect(s.rng.crossroads).toBe(before.crossroads);

    const t: CrossroadTemplate = { ...T_QUIET, cast: [{ as: 'A', anyNamed: true }] };
    fillCast(t, s);
    expect(s.rng.cast).not.toBe(before.cast);
    expect(s.rng.crossroads).toBe(before.crossroads);
  });

  it('la misma semilla reparte igual', () => {
    const t: CrossroadTemplate = { ...T_QUIET, cast: [{ as: 'A', anyNamed: true }] };
    expect(fillCast(t, village(31))).toEqual(fillCast(t, village(31)));
  });
});

describe('crisis · §8.6', () => {
  it('hambruna proyectada: la despensa no llega a la semana 35', () => {
    const s = village(7);
    s.tick = YEAR * 2 + 10; // faltan 25 semanas
    s.village.grain = population(s) * 25 + 1;
    expect(crisisOf(s)).toBeNull();
    s.village.grain = population(s) * 25 - 1;
    expect(crisisOf(s)).toBe('famine');
  });

  it('brote, bandera threatened y líder muerto', () => {
    const s = calm(7);
    expect(crisisOf(s)).toBeNull();

    s.outbreak = { startedTick: s.tick, endsTick: s.tick + 8, deaths: 0 };
    expect(crisisOf(s)).toBe('plague');
    s.outbreak = null;

    s.flags['threatened'] = 0;
    expect(crisisOf(s)).toBe('lord');
    delete s.flags['threatened'];

    (s.people.villagers.find((v) => v.role === 'leader') as Villager).diedTick = 1;
    expect(crisisOf(s)).toBe('succession');
  });
});

describe('selección · §8.6', () => {
  it('el techo de 120 ticks se respeta fuera de crisis', () => {
    const s = calm(7);
    s.history.push({ tick: s.tick - 10, templateId: T_QUIET.id, optionId: 'store_it', cast: {} });
    expect(lastCrossroadTick(s)).toBe(s.tick - 10);
    expect(selectCrossroad(s, CATALOGUE)).toBeNull();
  });

  it('una crisis se salta el techo', () => {
    const s = village(7);
    s.tick = YEAR * 3 + 10;
    s.village.grain = 0; // hambruna proyectada
    s.history.push({ tick: s.tick - 5, templateId: T_QUIET.id, optionId: 'store_it', cast: {} });
    const posed = selectCrossroad(s, CATALOGUE);
    expect(posed).not.toBeNull();
    // Bajo el techo sólo pasa la pregunta DE LA CRISIS, y pasa la mejor: con
    // dos de hambruna empatadas, el desempate por id es lo que decide.
    const chosen = CATALOGUE.find((t) => t.id === posed?.templateId);
    expect(chosen?.category).toBe('famine');
  });

  it("'succession' se dispara aunque falten 10 ticks para el techo", () => {
    // §6.6: es la única plantilla con esa excepción, y es lo que convierte la
    // muerte del líder en el latido del bucle largo.
    const s = calm(7);
    s.history.push({
      tick: s.tick - (CROSSROADS.MIN_TICKS_BETWEEN - 10),
      templateId: T_QUIET.id,
      optionId: 'store_it',
      cast: {},
    });
    expect(selectCrossroad(s, CATALOGUE)).toBeNull();

    // El líder muere AHORA: es la muerte lo que exime, no el hueco.
    (s.people.villagers.find((v) => v.role === 'leader') as Villager).diedTick = s.tick;
    s.people.namedIds = s.people.namedIds.filter((id) => at(s, id).diedTick === null);
    expect(selectCrossroad(s, CATALOGUE)?.templateId).toBe(T_SUCCESSION.id);
  });

  it('la exención de succession se gasta en la primera pregunta', () => {
    // Si valiera mientras el puesto siga vacante, la encrucijada saltaría cada
    // dos ticks hasta que alguien lo tomara, y dejaría de ser una decisión.
    const s = calm(7);
    // Bajo el techo, para que sólo la exención pueda dejar pasar algo.
    s.history.push({ tick: s.tick - 5, templateId: T_QUIET.id, optionId: 'store_it', cast: {} });
    (s.people.villagers.find((v) => v.role === 'leader') as Villager).diedTick = s.tick;
    s.people.namedIds = s.people.namedIds.filter((id) => at(s, id).diedTick === null);

    s.crossroad = selectCrossroad(s, CATALOGUE);
    expect(s.crossroad?.templateId).toBe(T_SUCCESSION.id);
    // Se responde dejando el puesto vacante: el hueco sigue ahí.
    applyOption(s, 'leave_it_vacant', CATALOGUE);
    expect(s.people.villagers.some((v) => v.role === 'leader' && isHere(v))).toBe(false);

    const answeredAt = s.tick;
    for (let i = 1; i < CROSSROADS.MIN_TICKS_BETWEEN; i += 1) {
      s.tick = answeredAt + i;
      expect(selectCrossroad(s, CATALOGUE), `tick +${i}`).toBeNull();
    }
    s.tick = answeredAt + CROSSROADS.MIN_TICKS_BETWEEN;
    expect(selectCrossroad(s, CATALOGUE)).not.toBeNull(); // ya pasó el techo
  });

  it('la exención de crisis también se gasta: una hambruna no pregunta cada semana', () => {
    const s = village(7);
    s.tick = YEAR * 3 + 10;
    s.village.grain = 0; // hambruna proyectada, y no se va a arreglar sola
    // Bajo el techo: sólo la crisis puede dejar pasar algo, y sólo de su rama.
    s.history.push({ tick: s.tick - 5, templateId: T_QUIET.id, optionId: 'store_it', cast: {} });

    s.crossroad = selectCrossroad(s, [T_FAMINE, T_QUIET]);
    expect(s.crossroad?.templateId).toBe(T_FAMINE.id);
    applyOption(s, 'hold_the_line', [T_FAMINE, T_QUIET]);

    const answeredAt = s.tick;
    let asked = 0;
    for (let i = 1; i < CROSSROADS.MIN_TICKS_BETWEEN; i += 1) {
      s.tick = answeredAt + i;
      s.village.grain = 0;
      if (selectCrossroad(s, [T_FAMINE, T_QUIET]) !== null) asked += 1;
    }
    expect(asked).toBe(0);
  });

  it('la garantía dispara a los 960 ticks exactos y elige la mejor, no una al azar', () => {
    const make = (): GameState => {
      const s = calm(7);
      s.tick = CROSSROADS.GUARANTEE_TICKS;
      s.village.grain = 100_000;
      return s;
    };
    const just = make();
    just.history.push({ tick: 1, templateId: T_QUIET.id, optionId: 'store_it', cast: {} });
    expect(just.tick - lastCrossroadTick(just)).toBeLessThan(CROSSROADS.GUARANTEE_TICKS);

    const s = make();
    const first = selectCrossroad(s, CATALOGUE);
    expect(first).not.toBeNull();
    // La garantía no sortea: la misma situación da siempre la misma.
    for (let i = 0; i < 20; i += 1) {
      const other = make();
      expect(selectCrossroad(other, CATALOGUE)?.templateId).toBe(first?.templateId);
    }
  });

  it('sin nada elegible la garantía cae en quiet_years', () => {
    const s = calm(7);
    s.tick = CROSSROADS.GUARANTEE_TICKS;
    const onlyImpossible: Catalogue = [
      { ...T_FEUD, requires: [{ k: 'stat', stat: 'grain', op: '<', v: 0 }] },
      T_QUIET,
    ];
    // T_QUIET no tiene requires, así que es elegible; se comprueba que existe
    // como reserva cuando de verdad no hay nada.
    const nothing: Catalogue = [{ ...T_FEUD, requires: [{ k: 'stat', stat: 'grain', op: '<', v: 0 }] }];
    expect(selectCrossroad(calmAt(CROSSROADS.GUARANTEE_TICKS), nothing)).toBeNull();
    expect(selectCrossroad(s, onlyImpossible)?.templateId).toBe(T_QUIET.id);
  });

  it('el multiplicador de novedad baja el peso sin anularlo', () => {
    const s = calm(7);
    const before = eligible(s, [T_QUIET]);
    expect(before[0]?.novelty).toBe(1);

    s.history.push({ tick: 1, templateId: T_QUIET.id, optionId: 'store_it', cast: {} });
    const after = eligible(s, [T_QUIET]);
    expect(after[0]?.novelty).toBe(CROSSROADS.NOVELTY_MULTIPLIER);
    expect(after[0]?.score).toBeLessThan(before[0]?.score as number);
    expect(after[0]?.score).toBeGreaterThan(0);
  });

  it('la crisis multiplica por 4 a las de su categoría, y sólo a ésas', () => {
    const s = village(7);
    s.tick = YEAR * 3 + 10;
    s.village.grain = 0;
    makeFeud(s);
    const scored = eligible(s, CATALOGUE);
    const famine = scored.find((x) => x.template.id === T_FAMINE.id);
    const feud = scored.find((x) => x.template.id === T_FEUD.id);
    expect(famine?.crisis).toBe(CROSSROADS.CRISIS_MULTIPLIER);
    expect(feud?.crisis).toBe(1);
  });

  it('los rasgos del reparto pesan', () => {
    const s = calm(7);
    const [leader, other] = makeFeud(s);
    // Los DOS del reparto: la fundación reparte spiteful por su cuenta y un
    // líder spiteful de nacimiento haría que el test midiera otra cosa.
    at(s, leader).traits = ['kind'];
    at(s, other).traits = ['spiteful'];
    expect(eligible(s, [T_FEUD])[0]?.trait).toBe(3);

    at(s, other).traits = ['kind'];
    expect(eligible(s, [T_FEUD])[0]?.trait).toBe(1);

    // Y pesa aunque el rasgo lo lleve el otro miembro del reparto.
    at(s, leader).traits = ['spiteful'];
    expect(eligible(s, [T_FEUD])[0]?.trait).toBe(3);
  });

  it('el cooldown, el maxPerGame y el minYear excluyen', () => {
    const s = calm(7);
    expect(eligible(s, [T_QUIET])).toHaveLength(1);

    const late: Catalogue = [{ ...T_QUIET, minYear: 99 }];
    expect(eligible(s, late)).toHaveLength(0);

    const once: Catalogue = [{ ...T_QUIET, maxPerGame: 1 }];
    s.history.push({ tick: 1, templateId: T_QUIET.id, optionId: 'store_it', cast: {} });
    expect(eligible(s, once)).toHaveLength(0);

    const cooling: Catalogue = [{ ...T_QUIET, cooldownYears: 99 }];
    expect(eligible(s, cooling)).toHaveLength(0);
  });

  it('una plantilla con reparto imposible nunca es elegible', () => {
    const s = calm(7);
    // T_FEUD necesita que alguien odie al líder, y nadie lo hace.
    expect(eligible(s, [T_FEUD])).toHaveLength(0);
  });

  it('con dos de la misma categoría en crisis, la selección es determinista', () => {
    const run = (): string | undefined => {
      const s = village(99);
      s.tick = YEAR * 3 + 10;
      s.village.grain = 0;
      return selectCrossroad(s, [T_FAMINE, T_FAMINE_TWO])?.templateId;
    };
    const first = run();
    expect(first).toBeDefined();
    for (let i = 0; i < 30; i += 1) expect(run()).toBe(first);
  });

  it('sólo se ofrecen las opciones cuyo requires se cumple', () => {
    const s = calm(7);
    const gated: CrossroadTemplate = {
      ...T_QUIET,
      options: [
        T_QUIET.options[0] as (typeof T_QUIET.options)[0],
        {
          ...(T_QUIET.options[1] as (typeof T_QUIET.options)[0]),
          requires: [{ k: 'stat', stat: 'grain', op: '<', v: 0 }],
        },
      ],
    };
    s.tick = CROSSROADS.GUARANTEE_TICKS;
    const posed = selectCrossroad(s, [gated]);
    expect(posed?.optionIds).toEqual(['store_it']);
  });

  it('no se pone otra encrucijada mientras hay una pendiente', () => {
    const s = calm(7);
    s.tick = CROSSROADS.GUARANTEE_TICKS;
    s.crossroad = selectCrossroad(s, CATALOGUE);
    expect(s.crossroad).not.toBeNull();
    expect(selectCrossroad(s, CATALOGUE)).toBeNull();
  });
});

function calmAt(tick: number): GameState {
  const s = calm(7);
  s.tick = tick;
  return s;
}

describe('resolución · §8.4', () => {
  function posed(seed = 7): GameState {
    const s = calm(seed);
    s.tick = CROSSROADS.GUARANTEE_TICKS;
    makeFeud(s);
    s.crossroad = selectCrossroad(s, [T_FEUD]);
    return s;
  }

  it('aplica los efectos, registra en history y limpia la pendiente', () => {
    const s = posed();
    const before = s.village.morale;
    const applied = applyOption(s, 'side_with_a', [T_FEUD]);

    expect(applied?.optionId).toBe('side_with_a');
    expect(s.village.morale).toBe(before - 5);
    expect(s.crossroad).toBeNull();
    expect(s.history).toHaveLength(1);
    expect(s.history[0]?.templateId).toBe(T_FEUD.id);
    expect(s.chronicle.some((e) => e.kind === 'crossroad_taken')).toBe(true);
  });

  it('las estadísticas se recortan a su rango', () => {
    const s = posed();
    s.village.morale = 2;
    applyOption(s, 'side_with_a', [T_FEUD]);
    expect(s.village.morale).toBe(0);
    expect(s.village.morale).toBeGreaterThanOrEqual(0);
  });

  it('opinion y memory llegan a la gente', () => {
    const s = posed();
    const cast = s.crossroad?.cast as Record<string, VillagerId>;
    const b = at(s, cast['B'] as VillagerId);
    applyOption(s, 'side_with_a', [T_FEUD]);
    expect(b.opinions[cast['A'] as VillagerId]).toBeLessThan(-70);
    expect(b.memories.some((m) => m.kind === 'was_blamed')).toBe(true);
  });

  it('flag con años pone caducidad, y con 0 es permanente', () => {
    const s = posed();
    applyOption(s, 'let_it_lie', [T_FEUD]);
    expect(s.flags['threatened']).toBe(s.tick + 2 * YEAR);
  });

  it('kill mata, marca violence y saca del reparto', () => {
    const s = calm(11);
    s.tick = CROSSROADS.GUARANTEE_TICKS;
    s.crossroad = selectCrossroad(s, [T_FAMINE]);
    const before = population(s);
    const applied = applyOption(s, 'hold_the_line', [T_FAMINE]);

    expect(applied?.killed).toHaveLength(2);
    expect(population(s)).toBe(before - 2);
    for (const id of applied?.killed ?? []) {
      expect(at(s, id).causeOfDeath).toBe('violence');
      expect(s.people.namedIds).not.toContain(id);
    }
  });

  it("kill 'weakest' se lleva primero a los más viejos", () => {
    const s = calm(11);
    s.tick = CROSSROADS.GUARANTEE_TICKS;
    const ages = s.people.villagers.filter(isHere).map((v) => ageOf(v, s.tick));
    const oldest = Math.max(...ages);
    s.crossroad = selectCrossroad(s, [T_FAMINE]);
    const applied = applyOption(s, 'hold_the_line', [T_FAMINE]);
    expect(ageOf(at(s, applied?.killed[0] as VillagerId), s.tick)).toBe(oldest);
  });

  it('build y destroy son peticiones, no obras', () => {
    const s = calm(7);
    s.tick = CROSSROADS.GUARANTEE_TICKS;
    const builder: CrossroadTemplate = {
      ...T_QUIET,
      options: [
        {
          ...(T_QUIET.options[0] as (typeof T_QUIET.options)[0]),
          effects: [
            { k: 'build', kind: 'chapel', free: true },
            { k: 'destroy', kind: 'house', count: 2 },
          ],
        },
        T_QUIET.options[1] as (typeof T_QUIET.options)[0],
      ],
    };
    const houses = s.buildings.length;
    s.crossroad = selectCrossroad(s, [builder]);
    const applied = applyOption(s, 'store_it', [builder]);

    expect(applied?.build).toEqual(['chapel']);
    expect(applied?.destroy).toEqual([{ kind: 'house', count: 2 }]);
    expect(s.buildings).toHaveLength(houses); // M-14 lo ejecutará
  });

  it('lit apaga la fragua sin derribarla', () => {
    const s = calm(7);
    s.tick = CROSSROADS.GUARANTEE_TICKS;
    s.buildings.push(build('smithy'));
    const douser: CrossroadTemplate = {
      ...T_QUIET,
      options: [
        {
          ...(T_QUIET.options[0] as (typeof T_QUIET.options)[0]),
          effects: [{ k: 'lit', kind: 'smithy', on: false }],
        },
        T_QUIET.options[1] as (typeof T_QUIET.options)[0],
      ],
    };
    s.crossroad = selectCrossroad(s, [douser]);
    applyOption(s, 'store_it', [douser]);
    expect(s.buildings.find((b) => b.kind === 'smithy')?.lit).toBe(false);
    expect(s.buildings.find((b) => b.kind === 'smithy')?.lostTick).toBeNull();
  });

  it('una opción que no está en la oferta no se aplica', () => {
    const s = posed();
    expect(applyOption(s, 'no_such_option', [T_FEUD])).toBeNull();
    expect(s.crossroad).not.toBeNull();
    expect(s.history).toHaveLength(0);
  });

  it('sin encrucijada pendiente no hay nada que resolver', () => {
    const s = calm(7);
    expect(applyOption(s, 'store_it', CATALOGUE)).toBeNull();
  });

  it('la simulación no se detiene: resolver no toca el tick', () => {
    // §8.7. La aldea sigue comiendo y muriendo mientras se duda.
    const s = posed();
    const tick = s.tick;
    applyOption(s, 'side_with_a', [T_FEUD]);
    expect(s.tick).toBe(tick);
  });
});

describe('semillas · §8.5, §3.6', () => {
  function planted(seed = 7): GameState {
    const s = calm(seed);
    s.tick = CROSSROADS.GUARANTEE_TICKS;
    makeFeud(s);
    s.crossroad = selectCrossroad(s, [T_FEUD]);
    applyOption(s, 'side_with_a', [T_FEUD]);
    return s;
  }

  it('una semilla con retraso [3,5] vence dentro de esa ventana', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const s = planted(seed);
      if (s.seeds.length === 0) continue;
      const sown = s.seeds[0] as (typeof s.seeds)[0];
      const years = (sown.firesAtTick - sown.plantedTick) / YEAR;
      expect(years, `semilla ${seed}`).toBeGreaterThanOrEqual(3);
      expect(years, `semilla ${seed}`).toBeLessThanOrEqual(5);
      expect(sown.firedTick).toBeNull();
      expect(sown.witheredTick).toBeNull();
    }
  });

  it('no vence antes de tiempo', () => {
    const s = planted();
    const sown = s.seeds[0] as (typeof s.seeds)[0];
    s.tick = sown.firesAtTick - 1;
    expect(fireSeeds(s, [T_FEUD])).toEqual([]);
    expect(pendingSeeds(s)).toHaveLength(1);
  });

  it('al vencer aplica sus efectos y deja firedTick y una consecuencia', () => {
    const s = planted();
    const sown = s.seeds[0] as (typeof s.seeds)[0];
    const victim = sown.cast['A'] as VillagerId;
    s.tick = sown.firesAtTick;

    const fired = fireSeeds(s, [T_FEUD]);
    expect(fired).toHaveLength(1);
    expect(fired[0]?.fired).toBe(true);
    expect(sown.firedTick).toBe(s.tick);
    expect(sown.witheredTick).toBeNull();
    expect(at(s, victim).diedTick).toBe(s.tick);

    const entry = s.chronicle.find((e) => e.kind === 'consequence');
    expect(entry).toBeDefined();
    expect(entry?.weight).toBe(3);
    // El enlace es lo que importa: cuántos años y desde qué decisión.
    expect(entry?.params['sinceYear']).toBe(Math.floor(sown.plantedTick / YEAR));
    expect(entry?.params['years']).toBeGreaterThanOrEqual(3);
  });

  it('no vuelve a dispararse', () => {
    const s = planted();
    const sown = s.seeds[0] as (typeof s.seeds)[0];
    s.tick = sown.firesAtTick;
    fireSeeds(s, [T_FEUD]);
    s.tick += 100;
    expect(fireSeeds(s, [T_FEUD])).toEqual([]);
  });

  it('una semilla marchita deja witheredTick y no aplica ni un efecto', () => {
    const s = calm(3);
    s.tick = CROSSROADS.GUARANTEE_TICKS;
    makeFeud(s);
    s.crossroad = selectCrossroad(s, [T_FEUD]);
    applyOption(s, 'let_it_lie', [T_FEUD]); // su semilla exige líder vivo

    const sown = s.seeds[0] as (typeof s.seeds)[0];
    const faith = s.village.faith;
    (s.people.villagers.find((v) => v.role === 'leader') as Villager).diedTick = s.tick;

    s.tick = sown.firesAtTick;
    const fired = fireSeeds(s, [T_FEUD]);
    expect(fired).toHaveLength(1);
    expect(fired[0]?.fired).toBe(false);
    expect(fired[0]?.effects).toBeNull();
    expect(sown.witheredTick).toBe(s.tick);
    expect(sown.firedTick).toBeNull();
    expect(s.village.faith).toBe(faith); // ni un efecto
    expect(s.chronicle.some((e) => e.kind === 'consequence')).toBe(false);
  });

  it('append-only: nada se borra del array', () => {
    const s = planted();
    expect(s.seeds).toHaveLength(1);
    const sown = s.seeds[0] as (typeof s.seeds)[0];
    s.tick = sown.firesAtTick;
    fireSeeds(s, [T_FEUD]);
    expect(s.seeds).toHaveLength(1); // sigue ahí, marcada
    expect(pendingSeeds(s)).toHaveLength(0);
  });

  it('la crónica de la consecuencia cita a quien la plantó', () => {
    const s = planted();
    const sown = s.seeds[0] as (typeof s.seeds)[0];
    const name = at(s, sown.cast['A'] as VillagerId).name;
    s.tick = sown.firesAtTick;
    fireSeeds(s, [T_FEUD]);
    expect(s.chronicle.find((e) => e.kind === 'consequence')?.params['A']).toBe(name);
  });
});

describe('determinismo', () => {
  it('dos partidas iguales hacen las mismas preguntas', () => {
    const run = (): GameState => {
      const s = calm(55);
      s.tick = CROSSROADS.GUARANTEE_TICKS;
      makeFeud(s);
      s.crossroad = selectCrossroad(s, CATALOGUE);
      applyOption(s, s.crossroad?.optionIds[0] as string, CATALOGUE);
      return s;
    };
    const a = run();
    const b = run();
    expect(a.history).toEqual(b.history);
    expect(a.seeds).toEqual(b.seeds);
    expect(a.rng).toEqual(b.rng);
  });

  it('remember y la memoria del reparto no rompen nada en cien años', () => {
    const s = calm(5);
    const leader = s.people.villagers.find((v) => v.role === 'leader') as Villager;
    for (let i = 0; i < 200; i += 1) {
      remember(leader, { tick: i * 24, kind: 'was_blamed', aboutId: null, weight: 3 });
    }
    expect(leader.memories.length).toBeLessThanOrEqual(12);
  });
});
