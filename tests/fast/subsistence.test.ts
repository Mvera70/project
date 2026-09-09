// M-06 · design.md §5.2 a §5.9, §12.3, §12.5, §12.6.
//
// Lo que hay que proteger son las dos ineficiencias defendidas de §5.2 —el tope
// de campos trabajados y la reserva de obras—, el orden comer-antes-de-cosechar,
// los límites de ánimo y fe, y que el suelo de fe sostenga de verdad.
import { describe, expect, it } from 'vitest';
import { DISASTER, FOOD, FOUNDING, LABOUR, MOOD, TIME, WEATHER } from '@engine/balance';
import { makeBundle } from '@engine/rng';
import type {
  Building,
  BuildingKind,
  GameState,
  TickContext,
  Villager,
} from '@engine/state';
import { isHere, population, workforce } from '@engine/people/demography';
import { foundPeople, makeVillager } from '@engine/people/villagers';
import { count, has, smithyWorking, standing } from '@engine/subsistence/building-counts';
import { allocateLabour, produce } from '@engine/subsistence/labour';
import { consume, overwinter } from '@engine/subsistence/consumption';
import { applySpoilage, harvest, storageCapacity } from '@engine/subsistence/harvest';
import { isUnexplained, updateMood } from '@engine/subsistence/mood';
import { rollWeather } from '@engine/subsistence/seasons';
import { outbreakActive, rollFire, rollPlague } from '@engine/subsistence/disasters';

const CELLS = 36 * 56;
const CALM: TickContext = {
  severity: 0,
  cold: false,
  outbreak: null,
  deaths: 0,
  unexplainedDeaths: 0,
};

let nextBuildingId = 0;
function build(kind: BuildingKind, tier: 0 | 1 = 0): Building {
  nextBuildingId += 1;
  return {
    id: nextBuildingId,
    kind,
    x: 0,
    y: 0,
    w: 2,
    h: 2,
    builtTick: 0,
    lostTick: null,
    tier,
    lit: true,
    blockedUntil: null,
  };
}

/** La aldea fundacional: 4 casas, 2 campos, 800 de grano. §12.2. */
function founded(seed: number, extra: BuildingKind[] = []): GameState {
  nextBuildingId = 0;
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
    village: {
      grain: FOUNDING.GRAIN,
      wood: FOUNDING.WOOD,
      morale: FOUNDING.MORALE,
      faith: FOUNDING.FAITH,
    },
    people,
    buildings: [
      ...Array.from({ length: FOUNDING.HOUSES }, () => build('house')),
      ...Array.from({ length: FOUNDING.FIELDS }, () => build('field')),
      ...extra.map((k) => build(k)),
    ],
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

describe('edificios · un solo origen de verdad', () => {
  it('cuenta sólo los que siguen en pie', () => {
    const s = founded(7);
    expect(count(s, 'house')).toBe(FOUNDING.HOUSES);
    expect(count(s, 'field')).toBe(FOUNDING.FIELDS);
    expect(has(s, 'mill')).toBe(false);

    (s.buildings[0] as Building).lostTick = 5;
    expect(count(s, 'house')).toBe(FOUNDING.HOUSES - 1);
    expect(standing(s, 'house').every((b) => b.lostTick === null)).toBe(true);
  });

  it('la fragua apagada no cuenta como fragua que trabaja', () => {
    // §3.5: el taller del herrero se apaga si se enfada.
    const s = founded(7, ['smithy']);
    expect(smithyWorking(s)).toBe(true);
    (standing(s, 'smithy')[0] as Building).lit = false;
    expect(smithyWorking(s)).toBe(false);
    expect(has(s, 'smithy')).toBe(true); // sigue en pie, pero fría
  });
});

describe('mano de obra · §5.2', () => {
  it('el tope de workedFields muerde: 8 campos y 20 personas son 3 campos', () => {
    // neededFields = ceil(20 · 48 · 1.3 / 600) = ceil(2.08) = 3.
    const s = founded(7, ['field', 'field', 'field', 'field', 'field', 'field']);
    expect(count(s, 'field')).toBe(FOOD.MAX_FIELDS);
    expect(population(s)).toBe(FOUNDING.POPULATION);

    const a = allocateLabour(s);
    expect(a.workedFields).toBe(3);

    // Y la cosecha es la de tres campos, no la de ocho.
    s.tick = TIME.HARVEST_WEEK;
    const r = harvest(s, a);
    expect(r.workedFields).toBe(3);
    const threeFields = 3 * FOOD.FIELD_YIELD * 1 * (0.8 + 0.4 * 0.55) * a.labourFactor;
    expect(r.yielded).toBeCloseTo(threeFields, 6);
  });

  it('una aldea sin campos no divide por cero', () => {
    const s = founded(7);
    s.buildings = s.buildings.filter((b) => b.kind !== 'field');
    const a = allocateLabour(s);
    expect(a.workedFields).toBe(0);
    expect(a.labourFactor).toBe(0);
    expect(Number.isFinite(a.labourFactor)).toBe(true);
  });

  it('la reserva de obras nunca baja del 15 % de W', () => {
    // Sin ella una aldea justa de gente no construye nunca y el valle no
    // cambia, que es el pecado capital del juego (§5.2).
    for (let seed = 0; seed < 40; seed += 1) {
      for (const fields of [1, 2, 4, 8]) {
        const s = founded(seed, Array.from({ length: fields - FOUNDING.FIELDS }, () => 'field' as const));
        const a = allocateLabour(s);
        const spare = a.cutters + a.builders;
        expect(spare, `semilla ${seed}, ${fields} campos`).toBeGreaterThanOrEqual(
          a.workforce * LABOUR.WORKS_RESERVE - 1e-9,
        );
      }
    }
  });

  it('la reserva se toma prestada de los campos, no de la nada', () => {
    const s = founded(7, ['field', 'field', 'field', 'field', 'field', 'field']);
    const a = allocateLabour(s);
    expect(a.farmers + a.cutters + a.builders).toBeCloseTo(a.workforce, 9);
    expect(a.workforce).toBe(workforce(s));
  });

  it('el sobrante se reparte entre leñadores y constructores según §5.2', () => {
    const s = founded(7);
    const a = allocateLabour(s);
    const spare = a.cutters + a.builders;
    expect(a.cutters).toBeCloseTo(spare * LABOUR.CUTTER_SHARE, 9);
    expect(a.builders).toBeCloseTo(spare - spare * LABOUR.CUTTER_SHARE, 9);
  });

  it('labourFactor va de 0 a 1', () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const a = allocateLabour(founded(seed));
      expect(a.labourFactor).toBeGreaterThanOrEqual(0);
      expect(a.labourFactor).toBeLessThanOrEqual(1);
    }
  });
});

describe('producción · §5.2, §5.4', () => {
  it('la madera entra en el granero y los puntos de obra no tocan el estado', () => {
    const s = founded(7);
    const before = structuredClone(s);
    const a = allocateLabour(s);
    const out = produce(s, a);

    expect(out.wood).toBeCloseTo(a.cutters * LABOUR.WOOD_PER_CUTTER, 9);
    expect(s.village.wood).toBeCloseTo(before.village.wood + out.wood, 9);
    expect(out.buildPoints).toBeCloseTo(a.builders * LABOUR.BP_PER_BUILDER, 9);

    // Nada más ha cambiado: los puntos de obra viajan de vuelta, no al estado.
    expect(s.works).toEqual([]);
    expect(s.people).toEqual(before.people);
    expect(s.village.grain).toBe(before.village.grain);
  });

  it('la fragua encendida acelera la obra un 20 %', () => {
    const plain = founded(7);
    const forged = founded(7, ['smithy']);
    const bpPlain = produce(plain, allocateLabour(plain)).buildPoints;
    const bpForged = produce(forged, allocateLabour(forged)).buildPoints;
    expect(bpForged / bpPlain).toBeCloseTo(LABOUR.SMITHY_BONUS, 6);
  });

  it('la fragua apagada no acelera nada', () => {
    const s = founded(7, ['smithy']);
    (standing(s, 'smithy')[0] as Building).lit = false;
    const plain = founded(7);
    expect(produce(s, allocateLabour(s)).buildPoints).toBeCloseTo(
      produce(plain, allocateLabour(plain)).buildPoints,
      9,
    );
  });

  it('las promesas de obra aplican el factor más duro y caducan', () => {
    const plain = founded(7);
    const baseline = produce(plain, allocateLabour(plain)).buildPoints;
    const slowed = founded(7);
    slowed.flags['works_slowed_85'] = slowed.tick + 20;
    slowed.flags['works_slowed_40'] = slowed.tick + 6;
    expect(produce(slowed, allocateLabour(slowed)).buildPoints).toBeCloseTo(baseline * 0.4, 9);
    slowed.tick += 6;
    expect(produce(slowed, allocateLabour(slowed)).buildPoints).toBeCloseTo(baseline * 0.85, 9);
    slowed.tick += 14;
    expect(produce(slowed, allocateLabour(slowed)).buildPoints).toBeCloseTo(baseline, 9);
  });

  it('woodCap limita la tala y por defecto no limita nada', () => {
    // M-15 aportará el tope del bosque; la firma ya lo acepta.
    const s = founded(7);
    const a = allocateLabour(s);
    const capped = produce(s, a, 1);
    expect(capped.wood).toBe(1);

    const free = founded(7);
    expect(produce(free, allocateLabour(free)).wood).toBeGreaterThan(1);
  });

  it('un tope negativo no resta madera', () => {
    const s = founded(7);
    const before = s.village.wood;
    expect(produce(s, allocateLabour(s), -50).wood).toBe(0);
    expect(s.village.wood).toBe(before);
  });
});

describe('consumo · §5.3', () => {
  it('sin hambre no muere nadie y la severidad es 0', () => {
    const s = founded(7);
    const r = consume(s);
    expect(r.severity).toBe(0);
    expect(r.starved).toEqual([]);
    expect(s.village.grain).toBe(FOUNDING.GRAIN - FOUNDING.POPULATION * FOOD.GRAIN_PER_PERSON);
  });

  it('el grano nunca baja de cero y la severidad llega a 1', () => {
    const s = founded(7);
    s.village.grain = 0;
    const r = consume(s);
    expect(r.severity).toBe(1);
    expect(s.village.grain).toBe(0);
  });

  it('la severidad es la fracción de la demanda que falta', () => {
    const s = founded(7);
    const demand = population(s) * FOOD.GRAIN_PER_PERSON;
    s.village.grain = demand / 2;
    expect(consume(s).severity).toBeCloseTo(0.5, 9);
  });

  it('los muertos por hambre llevan su causa y salen del reparto', () => {
    const s = founded(7);
    s.village.grain = 0;
    let starved = 0;
    for (let i = 0; i < 200 && population(s) > 0; i += 1) {
      s.tick += 1;
      for (const id of consume(s).starved) {
        const v = s.people.villagers.find((x) => x.id === id) as Villager;
        expect(v.diedTick).toBe(s.tick);
        expect(v.causeOfDeath).toBe('hunger');
        expect(isHere(v)).toBe(false);
        expect(s.people.namedIds).not.toContain(id);
        starved += 1;
      }
    }
    expect(starved).toBeGreaterThan(0);
  });

  it('mueren los más débiles primero: los mayores de 60, luego los menores de 5', () => {
    const s = founded(7);
    s.people.villagers = [
      ...Array.from({ length: 5 }, (_, i) =>
        makeVillager({ id: i, female: false, bornTick: -70 * TIME.WEEKS_PER_YEAR }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        makeVillager({ id: 5 + i, female: false, bornTick: -2 * TIME.WEEKS_PER_YEAR }),
      ),
      ...Array.from({ length: 40 }, (_, i) =>
        makeVillager({ id: 10 + i, female: false, bornTick: -30 * TIME.WEEKS_PER_YEAR }),
      ),
    ];
    s.people.namedIds = [];
    s.village.grain = 0;

    const order: number[] = [];
    for (let i = 0; i < 40 && order.length < 10; i += 1) {
      s.tick += 1;
      order.push(...consume(s).starved);
    }
    // Los diez primeros en caer son los cinco ancianos y los cinco críos.
    expect(order.slice(0, 5).every((id) => id < 5)).toBe(true);
    expect(order.slice(5, 10).every((id) => id >= 5 && id < 10)).toBe(true);
  });

  it('no acumula la fracción entre ticks: el sorteo la resuelve cada vez', () => {
    // 20 personas · 0.025 · 1 = 0.5 muertos por semana. Sin acumulador, unas
    // semanas cae uno y otras ninguno, y a la larga es medio por semana.
    const weeks = 400;
    let toll = 0;
    const s = founded(3);
    s.village.grain = 0;
    // Población fija para aislar la tasa del encogimiento.
    for (let i = 0; i < weeks; i += 1) {
      s.tick += 1;
      s.village.grain = 0;
      toll += consume(s).starved.length;
      for (const v of s.people.villagers) {
        v.diedTick = null;
        v.causeOfDeath = null;
      }
    }
    const expected = weeks * FOUNDING.POPULATION * FOOD.STARVATION_RATE;
    expect(toll).toBeGreaterThan(expected * 0.8);
    expect(toll).toBeLessThan(expected * 1.2);
  });

  it('una aldea vacía no divide por cero', () => {
    const s = founded(7);
    for (const v of s.people.villagers) v.diedTick = 0;
    expect(consume(s)).toEqual({ severity: 0, starved: [] });
  });
});

describe('invierno · §5.4', () => {
  const winterTick = TIME.WEEKS_PER_SEASON * 3; // semana 36

  it('fuera del invierno no se quema leña', () => {
    const s = founded(7);
    for (const tick of [0, 11, 12, 23, 24, 35]) {
      s.tick = tick;
      const before = s.village.wood;
      expect(overwinter(s).cold).toBe(false);
      expect(s.village.wood).toBe(before);
    }
  });

  it('en invierno se quema WINTER_WOOD por persona y semana', () => {
    const s = founded(7);
    s.tick = winterTick;
    const before = s.village.wood;
    expect(overwinter(s).cold).toBe(false);
    expect(s.village.wood).toBeCloseTo(before - population(s) * LABOUR.WINTER_WOOD, 9);
  });

  it('las casas frías queman un cincuenta por ciento más durante su bandera', () => {
    const plain = founded(7);
    const cold = founded(7);
    plain.tick = cold.tick = winterTick;
    cold.flags['cold_houses'] = cold.tick + 20 * TIME.WEEKS_PER_YEAR;
    overwinter(plain);
    overwinter(cold);
    const plainSpent = FOUNDING.WOOD - plain.village.wood;
    const coldSpent = FOUNDING.WOOD - cold.village.wood;
    expect(coldSpent).toBeCloseTo(plainSpent * LABOUR.COLD_HOUSES_WOOD_MULTIPLIER, 9);
  });

  it('sin leña se marca cold y la reserva queda a cero', () => {
    const s = founded(7);
    s.tick = winterTick;
    s.village.wood = 1;
    expect(overwinter(s).cold).toBe(true);
    expect(s.village.wood).toBe(0);
  });

  it('las doce semanas de invierno se pueden pagar con la madera fundacional', () => {
    const s = founded(7);
    let cold = 0;
    for (let w = 0; w < TIME.WEEKS_PER_SEASON; w += 1) {
      s.tick = winterTick + w;
      if (overwinter(s).cold) cold += 1;
    }
    // 20 · 0.4 · 12 = 96 contra 200 de madera inicial.
    expect(cold).toBe(0);
    expect(s.village.wood).toBeGreaterThan(0);
  });
});

describe('cosecha y granero · §5.3', () => {
  it('sólo se cosecha en la semana 35', () => {
    const s = founded(7);
    const a = allocateLabour(s);
    for (const tick of [0, 12, 34, 36, 47]) {
      s.tick = tick;
      const before = s.village.grain;
      const r = harvest(s, a);
      expect(r.happened).toBe(false);
      expect(r.yielded).toBe(0);
      expect(s.village.grain).toBe(before);
    }
  });

  it('el año 1 con clima 1.00 da 1 224 y el grano acaba positivo', () => {
    // El aserto que ata §12.2 con la fórmula de §5.3: dos campos, veinte bocas,
    // ánimo 55 y mano de obra completa.
    const s = founded(7);
    s.weather = { year: 0, index: 2, factor: 1.0 };
    let harvested = 0;

    for (let week = 0; week < TIME.WEEKS_PER_YEAR; week += 1) {
      s.tick = week;
      const a = allocateLabour(s);
      s.village.morale = FOUNDING.MORALE; // el ánimo lo mueve mood.ts, no este test
      consume(s); // paso 7, antes de la cosecha
      overwinter(s);
      const r = harvest(s, a); // paso 9
      if (r.happened) harvested = r.yielded;
      applySpoilage(s); // paso 10
    }

    expect(harvested).toBeGreaterThanOrEqual(1223);
    expect(harvested).toBeLessThanOrEqual(1225);
    expect(s.village.grain).toBeGreaterThan(0);
  });

  it('la cosecha responde al clima, al ánimo y al molino', () => {
    const yieldWith = (factor: number, morale: number, mill: boolean): number => {
      const s = founded(7, mill ? ['mill'] : []);
      s.tick = TIME.HARVEST_WEEK;
      s.weather = { year: 0, index: 2, factor };
      s.village.morale = morale;
      return harvest(s, allocateLabour(s)).yielded;
    };
    const base = yieldWith(1.0, 55, false);
    expect(yieldWith(0.6, 55, false) / base).toBeCloseTo(0.6, 6);
    expect(yieldWith(1.45, 55, false) / base).toBeCloseTo(1.45, 6);
    expect(yieldWith(1.0, 55, true) / base).toBeCloseTo(FOOD.MILL_BONUS, 6);
    expect(yieldWith(1.0, 100, false)).toBeGreaterThan(base);
    expect(yieldWith(1.0, 0, false)).toBeLessThan(base);
  });

  it('la capacidad crece con los graneros', () => {
    expect(storageCapacity(founded(7))).toBe(FOOD.BASE_STORAGE);
    expect(storageCapacity(founded(7, ['granary']))).toBe(
      FOOD.BASE_STORAGE + FOOD.GRANARY_CAPACITY,
    );
    expect(storageCapacity(founded(7, ['granary', 'granary', 'granary']))).toBe(
      FOOD.BASE_STORAGE + FOOD.MAX_GRANARIES * FOOD.GRANARY_CAPACITY,
    );
  });

  it('la merma converge a la capacidad sin cruzarla', () => {
    const s = founded(7);
    s.village.grain = 2000;
    expect(storageCapacity(s)).toBe(800);

    let previous = s.village.grain;
    for (let i = 0; i < 500; i += 1) {
      const lost = applySpoilage(s);
      expect(s.village.grain).toBeLessThan(previous + 1e-9);
      expect(s.village.grain).toBeGreaterThanOrEqual(800);
      expect(lost).toBeGreaterThanOrEqual(0);
      previous = s.village.grain;
    }
    expect(s.village.grain).toBeCloseTo(800, 3);
  });

  it('por debajo de la capacidad no se pierde nada', () => {
    const s = founded(7);
    s.village.grain = 500;
    expect(applySpoilage(s)).toBe(0);
    expect(s.village.grain).toBe(500);
  });

  it('la aldea fundacional no nace mermando', () => {
    // §12.2: GRAIN es exactamente BASE_STORAGE, y por eso el primer tick no
    // pierde ni un grano.
    const s = founded(7);
    expect(applySpoilage(s)).toBe(0);
  });
});

describe('ánimo y fe · §5.5, §5.6', () => {
  it('se mantienen en [0, 100] a lo largo de 50 000 ticks', () => {
    let loMorale = 100;
    let hiMorale = 0;
    let loFaith = 100;
    let hiFaith = 0;
    let broke = 0;
    for (const seed of [1, 2, 3]) {
      const s = founded(seed);
      for (let i = 0; i < 50_000; i += 1) {
        s.tick += 1;
        // Un contexto que castiga sin descanso: hambre, brote y muertos.
        const ctx: TickContext = {
          severity: i % 3 === 0 ? 1 : 0,
          cold: true,
          outbreak: i % 7 === 0 ? { startedTick: s.tick, endsTick: s.tick + 8, deaths: 0 } : null,
          deaths: i % 5 === 0 ? 4 : 0,
          unexplainedDeaths: i % 11 === 0 ? 3 : 0,
        };
        updateMood(s, ctx);
        // Los extremos se acumulan y se comprueban al final: la suite rápida no
        // puede permitirse 300 000 asertos.
        loMorale = Math.min(loMorale, s.village.morale);
        hiMorale = Math.max(hiMorale, s.village.morale);
        loFaith = Math.min(loFaith, s.village.faith);
        hiFaith = Math.max(hiFaith, s.village.faith);
        if (!Number.isFinite(s.village.morale) || !Number.isFinite(s.village.faith)) broke += 1;
      }
    }
    expect(broke).toBe(0);
    expect(loMorale).toBeGreaterThanOrEqual(0);
    expect(hiMorale).toBeLessThanOrEqual(100);
    expect(loFaith).toBeGreaterThanOrEqual(0);
    expect(hiFaith).toBeLessThanOrEqual(100);
  });

  it('el suelo de ánimo por fe se respeta en todo momento', () => {
    // §5.6: morale no baja nunca de faith · 0.25, pase lo que pase esa semana.
    const s = founded(7);
    s.village.faith = 100;
    s.village.morale = 1;
    for (let i = 0; i < 400; i += 1) {
      s.tick += 1;
      updateMood(s, { ...CALM, severity: 1, deaths: 10 });
      expect(s.village.morale).toBeGreaterThanOrEqual(
        s.village.faith * MOOD.MORALE_FLOOR_FROM_FAITH - 1e-9,
      );
    }
  });

  it('una aldea devota aguanta lo que hunde a una descreída', () => {
    // La consecuencia de diseño del suelo (§5.6), medida como diferencia y no
    // contra un número inventado: la fe deriva sola hacia 40 y el suelo con
    // ella, así que lo que importa es la distancia entre las dos aldeas.
    const punish = (faith: number): number => {
      const s = founded(7);
      s.village.morale = 50;
      for (let i = 0; i < 300; i += 1) {
        s.tick += 1;
        s.village.faith = faith; // fe fijada para aislar el suelo de su deriva
        updateMood(s, { ...CALM, severity: 1, deaths: 5 });
      }
      return s.village.morale;
    };
    // La fe fijada aún deriva dentro de la propia llamada, así que el suelo se
    // calcula sobre la fe de ese tick: 0 sube a 0.4 y deja el suelo en 0.1.
    const devout = punish(100);
    const faithless = punish(0);
    expect(faithless).toBeLessThan(1);
    expect(devout).toBeGreaterThan(24);
    expect(devout - faithless).toBeGreaterThan(20);
  });

  it('el ánimo deriva hacia 50 cuando no pasa nada', () => {
    const low = founded(7);
    low.village.morale = 10;
    const high = founded(7);
    high.village.morale = 90;
    for (let i = 0; i < 800; i += 1) {
      low.tick += 1;
      high.tick += 1;
      updateMood(low, CALM);
      updateMood(high, CALM);
    }
    // Deriva del 2 % semanal: converge, pero asintóticamente.
    expect(Math.abs(low.village.morale - MOOD.MORALE_DRIFT_TO)).toBeLessThan(0.5);
    expect(Math.abs(high.village.morale - MOOD.MORALE_DRIFT_TO)).toBeLessThan(0.5);
  });

  it('la fe deriva hacia 40 y el cura la sostiene', () => {
    const godless = founded(7);
    godless.people.villagers = godless.people.villagers.filter((v) => v.role !== 'priest');
    const withPriest = founded(7);
    for (let i = 0; i < 400; i += 1) {
      godless.tick += 1;
      withPriest.tick += 1;
      updateMood(godless, CALM);
      updateMood(withPriest, CALM);
    }
    expect(withPriest.village.faith).toBeGreaterThan(godless.village.faith);
    expect(godless.village.faith).toBeLessThan(MOOD.FAITH_DRIFT_TO);
  });

  it('cada término de §5.5 empuja en su dirección', () => {
    const after = (patch: Partial<TickContext>, extra: BuildingKind[] = []): number => {
      const s = founded(7, extra);
      s.village.morale = 50;
      s.village.faith = 0; // sin suelo, para ver el término desnudo
      updateMood(s, { ...CALM, ...patch });
      return s.village.morale;
    };
    const base = after({});
    expect(after({ severity: 1 })).toBeLessThan(base);
    expect(after({ deaths: 3 })).toBeLessThan(base);
    expect(after({ outbreak: { startedTick: 0, endsTick: 8, deaths: 0 } })).toBeLessThan(base);
    expect(after({}, ['chapel'])).toBeGreaterThan(base);
    expect(after({}, ['church'])).toBeGreaterThan(after({}, ['chapel']));
    expect(after({}, ['mill'])).toBeGreaterThan(base);
  });

  it('un brote vencido deja de castigar el ánimo y la fe', () => {
    const expired = founded(7);
    const calm = founded(7);
    expired.tick = 20;
    calm.tick = 20;
    expired.village.morale = calm.village.morale = 50;
    expired.village.faith = calm.village.faith = 50;
    updateMood(expired, {
      ...CALM,
      outbreak: { startedTick: 2, endsTick: 10, deaths: 0 },
    });
    updateMood(calm, CALM);
    expect(expired.village.morale).toBeCloseTo(calm.village.morale, 12);
    expect(expired.village.faith).toBeCloseTo(calm.village.faith, 12);
  });

  it('el hacinamiento pesa por cada persona sin cama', () => {
    const roomy = founded(7);
    const cramped = founded(7);
    cramped.buildings = cramped.buildings.filter((b) => b.kind !== 'house');
    roomy.village.faith = 0;
    cramped.village.faith = 0;
    updateMood(roomy, CALM);
    updateMood(cramped, CALM);
    expect(cramped.village.morale).toBeLessThan(roomy.village.morale);
  });

  it('el bono de cosecha se aplica en la semana 35 y sólo ahí', () => {
    const moraleAfter = (tick: number, factor: number): number => {
      const s = founded(7);
      s.tick = tick;
      s.weather = { year: 0, index: 0, factor };
      s.village.morale = 50;
      s.village.faith = 0;
      updateMood(s, CALM);
      return s.village.morale;
    };
    expect(moraleAfter(TIME.HARVEST_WEEK, 1.45)).toBeGreaterThan(moraleAfter(34, 1.45));
    expect(moraleAfter(TIME.HARVEST_WEEK, 0.6)).toBeLessThan(moraleAfter(34, 0.6));
    expect(moraleAfter(34, 1.45)).toBeCloseTo(moraleAfter(34, 0.6), 9);
  });

  it('las muertes sin explicación hunden la fe; las explicadas no', () => {
    // §5.6: alguien de 5 a 59 años al que no se lo llevó nada que se pueda
    // nombrar. Lo demás se explica solo.
    expect(isUnexplained('natural', 30)).toBe(true);
    expect(isUnexplained('natural', 5)).toBe(true);
    expect(isUnexplained('natural', 59)).toBe(true);
    expect(isUnexplained('natural', 4)).toBe(false); // un crío, no un presagio
    expect(isUnexplained('natural', 60)).toBe(false); // un anciano tampoco
    expect(isUnexplained('old_age', 70)).toBe(false);
    expect(isUnexplained('plague', 30)).toBe(false);
    expect(isUnexplained('fire', 30)).toBe(false);
    expect(isUnexplained('hunger', 30)).toBe(false);
    expect(isUnexplained('cold', 30)).toBe(false);
    expect(isUnexplained('violence', 30)).toBe(false);

    const s = founded(7);
    const plain = founded(7);
    updateMood(s, { ...CALM, deaths: 5, unexplainedDeaths: 5 });
    updateMood(plain, { ...CALM, deaths: 5, unexplainedDeaths: 0 });
    expect(s.village.faith).toBeLessThan(plain.village.faith);
  });

  it('un cura devout sostiene más la fe que uno mundano', () => {
    const devout = founded(7);
    const priest = devout.people.villagers.find((v) => v.role === 'priest') as Villager;
    priest.traits = ['devout'];
    const worldly = founded(7);
    const other = worldly.people.villagers.find((v) => v.role === 'priest') as Villager;
    other.traits = ['proud'];
    for (let i = 0; i < 200; i += 1) {
      devout.tick += 1;
      worldly.tick += 1;
      updateMood(devout, CALM);
      updateMood(worldly, CALM);
    }
    expect(devout.village.faith).toBeGreaterThan(worldly.village.faith);
  });
});

describe('clima · §5.1, §12.3', () => {
  it('sale siempre una fila de la tabla', () => {
    const s = founded(7);
    for (let i = 0; i < 2000; i += 1) {
      s.tick += TIME.WEEKS_PER_YEAR;
      const w = rollWeather(s);
      expect(w.index).toBeGreaterThanOrEqual(0);
      expect(w.index).toBeLessThan(WEATHER.length);
      expect(w.factor).toBe(WEATHER[w.index]?.f);
      expect(w.year).toBe(s.tick / TIME.WEEKS_PER_YEAR);
    }
  });

  it('respeta las probabilidades de §12.3', () => {
    const s = founded(7);
    const N = 20_000;
    const seen = new Array<number>(WEATHER.length).fill(0);
    for (let i = 0; i < N; i += 1) {
      const idx = rollWeather(s).index;
      seen[idx] = (seen[idx] ?? 0) + 1;
    }
    WEATHER.forEach((row, i) => {
      expect((seen[i] ?? 0) / N).toBeGreaterThan(row.p - 0.02);
      expect((seen[i] ?? 0) / N).toBeLessThan(row.p + 0.02);
    });
  });

  it('las laderas desnudas trasladan cinco puntos de clima justo a ruinoso', () => {
    const s = founded(7);
    s.flags['flood_prone'] = 0;
    const N = 20_000;
    const seen = new Array<number>(WEATHER.length).fill(0);
    for (let i = 0; i < N; i += 1) {
      const index = rollWeather(s).index;
      seen[index] = (seen[index] ?? 0) + 1;
    }
    expect((seen[0] ?? 0) / N).toBeGreaterThan(0.18);
    expect((seen[0] ?? 0) / N).toBeLessThan(0.22);
    expect((seen[2] ?? 0) / N).toBeGreaterThan(0.33);
    expect((seen[2] ?? 0) / N).toBeLessThan(0.37);
  });

  it('consume del flujo weather y de ningún otro', () => {
    const s = founded(7);
    const before = { ...s.rng };
    rollWeather(s);
    expect(s.rng.weather).not.toBe(before.weather);
    for (const k of ['births', 'deaths', 'names', 'cast', 'crossroads', 'map'] as const) {
      expect(s.rng[k]).toBe(before[k]);
    }
  });
});

describe('desastres · §5.8, §5.9', () => {
  it('la peste y el incendio sólo se miran en la semana 0', () => {
    const s = founded(7);
    for (const tick of [1, 12, 35, 47, 49]) {
      s.tick = tick;
      expect(rollPlague(s)).toBeNull();
      expect(rollFire(s)).toBeNull();
    }
  });

  it('la peste sale con la probabilidad de §5.8', () => {
    let outbreaks = 0;
    const SEEDS = 3000;
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const s = founded(seed);
      s.tick = TIME.WEEKS_PER_YEAR;
      if (rollPlague(s) !== null) outbreaks += 1;
    }
    const expected = DISASTER.PLAGUE_BASE + FOUNDING.POPULATION / DISASTER.PLAGUE_PER_PEOPLE;
    expect(outbreaks / SEEDS).toBeGreaterThan(expected - 0.01);
    expect(outbreaks / SEEDS).toBeLessThan(expected + 0.01);
  });

  it('el pozo la hace menos probable', () => {
    const rate = (extra: BuildingKind[]): number => {
      let n = 0;
      for (let seed = 0; seed < 4000; seed += 1) {
        const s = founded(seed, extra);
        s.tick = TIME.WEEKS_PER_YEAR;
        if (rollPlague(s) !== null) n += 1;
      }
      return n / 4000;
    };
    expect(rate(['well'])).toBeLessThan(rate([]));
  });

  it('dura de 6 a 10 semanas y no se solapa con otra', () => {
    for (let seed = 0; seed < 600; seed += 1) {
      const s = founded(seed);
      s.tick = TIME.WEEKS_PER_YEAR;
      const o = rollPlague(s);
      if (o === null) continue;
      const weeks = o.endsTick - o.startedTick;
      expect(weeks).toBeGreaterThanOrEqual(DISASTER.PLAGUE_WEEKS[0]);
      expect(weeks).toBeLessThanOrEqual(DISASTER.PLAGUE_WEEKS[1]);
      expect(o.deaths).toBe(0);
      expect(outbreakActive(s, o)).toBe(true);

      s.outbreak = o;
      expect(rollPlague(s)).toBeNull(); // ya hay uno corriendo
    }
  });

  it('un brote vencido no bloquea la tirada anual siguiente', () => {
    let clearRolls = 0;
    let expiredRolls = 0;
    for (let seed = 0; seed < 1000; seed += 1) {
      const clear = founded(seed);
      clear.tick = TIME.WEEKS_PER_YEAR;
      const expired = founded(seed);
      expired.tick = TIME.WEEKS_PER_YEAR;
      expired.outbreak = { startedTick: 1, endsTick: 9, deaths: 0 };
      if (rollPlague(clear) !== null) clearRolls += 1;
      if (rollPlague(expired) !== null) expiredRolls += 1;
    }
    expect(expiredRolls).toBe(clearRolls);
    expect(expiredRolls).toBeGreaterThan(0);
  });

  it('el incendio sale con FIRE_CHANCE y devuelve qué arde', () => {
    let fires = 0;
    const SEEDS = 6000;
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const s = founded(seed);
      s.tick = TIME.WEEKS_PER_YEAR;
      const f = rollFire(s);
      if (f === null) continue;
      fires += 1;
      expect(s.buildings.some((b) => b.id === f.buildingId)).toBe(true);
      expect(f.moraleDelta).toBe(DISASTER.FIRE_MORALE);
    }
    expect(fires / SEEDS).toBeGreaterThan(DISASTER.FIRE_CHANCE - 0.012);
    expect(fires / SEEDS).toBeLessThan(DISASTER.FIRE_CHANCE + 0.012);
  });

  it('no destruye nada: el estado queda intacto', () => {
    // §5.9 lo ejecuta M-14. Aquí sólo se informa.
    for (let seed = 0; seed < 400; seed += 1) {
      const s = founded(seed);
      s.tick = TIME.WEEKS_PER_YEAR;
      const before = structuredClone({ buildings: s.buildings, village: s.village });
      const f = rollFire(s);
      if (f === null) continue;
      expect(s.buildings).toEqual(before.buildings);
      expect(s.village).toEqual(before.village);
    }
  });

  it('prefiere las casas y nunca toca la piedra', () => {
    let houses = 0;
    let others = 0;
    for (let seed = 0; seed < 8000; seed += 1) {
      const s = founded(seed, ['granary', 'chapel']);
      s.buildings.push({ ...build('stone_house', 1), id: 900 });
      s.tick = TIME.WEEKS_PER_YEAR;
      const f = rollFire(s);
      if (f === null) continue;
      expect(f.kind).not.toBe('stone_house');
      if (f.kind === 'house') houses += 1;
      else others += 1;
    }
    expect(houses + others).toBeGreaterThan(50);
    // 4 casas a peso 3 contra 4 edificios de madera a peso 1: 12 de 16.
    expect(houses / (houses + others)).toBeGreaterThan(0.6);
  });

  it('un granero ardiendo se lleva el 45 % del grano', () => {
    for (let seed = 0; seed < 3000; seed += 1) {
      const s = founded(seed, ['granary']);
      s.tick = TIME.WEEKS_PER_YEAR;
      const f = rollFire(s);
      if (f === null) continue;
      if (f.kind === 'granary') {
        expect(f.grainLost).toBeCloseTo(s.village.grain * DISASTER.FIRE_GRAIN_LOSS, 6);
      } else {
        expect(f.grainLost).toBe(0);
      }
    }
  });

  it('sin nada de madera en pie no arde nada', () => {
    for (let seed = 0; seed < 500; seed += 1) {
      const s = founded(seed);
      for (const b of s.buildings) b.tier = 1;
      s.tick = TIME.WEEKS_PER_YEAR;
      expect(rollFire(s)).toBeNull();
    }
  });
});

describe('el tick de subsistencia completo', () => {
  /** Los pasos 5 a 12 de §4.2 v2.5, sin los que son de otros módulos. */
  function subsistenceTick(s: GameState): TickContext {
    s.tick += 1;
    if (s.tick % TIME.WEEKS_PER_YEAR === 0) s.weather = rollWeather(s);

    const a = allocateLabour(s); // 5 LABOUR
    produce(s, a); // 6
    const { severity, starved } = consume(s); // 7 CONSUME
    const { cold } = overwinter(s); // 8 WINTER
    harvest(s, a); // 9 HARVEST
    applySpoilage(s); // 10 STORAGE

    const ctx: TickContext = {
      severity,
      cold,
      outbreak: s.outbreak,
      deaths: starved.length,
      unexplainedDeaths: 0,
    };
    updateMood(s, ctx); // 12 MOOD (DEATHS, el 11, es de M-04)
    return ctx;
  }

  it('comer va antes que cosechar: la semana 35 se come primero', () => {
    // §4.2: es lo que hace que un otoño malo se note en el granero antes del
    // invierno. Si se cosechara primero, la aldea nunca pasaría hambre esa
    // semana por muy vacío que estuviera el granero.
    const s = founded(7);
    s.tick = TIME.HARVEST_WEEK - 1;
    s.village.grain = 0;
    s.weather = { year: 0, index: 4, factor: 1.45 };

    const ctx = subsistenceTick(s);
    expect(s.tick).toBe(TIME.HARVEST_WEEK);
    expect(ctx.severity).toBe(1); // pasó hambre pese a la cosecha del mismo tick
    expect(s.village.grain).toBeGreaterThan(0); // y aun así cosechó
  });

  it('con severity 1 sostenido la aldea se extingue, en 10 semillas', () => {
    // El test que M-04 no podía tener: la extinción la produce el paso 7.
    for (let seed = 0; seed < 10; seed += 1) {
      const s = founded(seed);
      let weeks = 0;
      while (population(s) > 0 && weeks < 5 * TIME.WEEKS_PER_YEAR) {
        s.village.grain = 0; // hambre perpetua
        subsistenceTick(s);
        weeks += 1;
      }
      expect(population(s), `semilla ${seed}`).toBe(0);
      expect(weeks, `semilla ${seed}`).toBeLessThan(5 * TIME.WEEKS_PER_YEAR);
    }
  });

  it('dos años seguidos de clima 0.60 meten a la aldea en hambruna', () => {
    const s = founded(7);
    let hungryWeeks = 0;
    for (let year = 0; year < 3; year += 1) {
      for (let w = 0; w < TIME.WEEKS_PER_YEAR; w += 1) {
        if (s.tick % TIME.WEEKS_PER_YEAR === 0) s.weather = { year, index: 0, factor: 0.6 };
        const ctx = subsistenceTick(s);
        s.weather = { year, index: 0, factor: 0.6 };
        if (ctx.severity > 0) hungryWeeks += 1;
      }
    }
    expect(hungryWeeks).toBeGreaterThan(0);
  });

  it('el grano nunca es negativo ni NaN en un siglo', () => {
    for (const seed of [1, 2, 3]) {
      const s = founded(seed);
      for (let i = 0; i < 100 * TIME.WEEKS_PER_YEAR; i += 1) {
        subsistenceTick(s);
        expect(Number.isFinite(s.village.grain)).toBe(true);
        expect(s.village.grain).toBeGreaterThanOrEqual(0);
        expect(s.village.wood).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('la misma semilla vive el mismo siglo', () => {
    const run = (): GameState => {
      const s = founded(55);
      for (let i = 0; i < 20 * TIME.WEEKS_PER_YEAR; i += 1) subsistenceTick(s);
      return s;
    };
    const a = run();
    const b = run();
    expect(a.village).toEqual(b.village);
    expect(a.rng).toEqual(b.rng);
    expect(population(a)).toBe(population(b));
  });
});

describe('tripulación mínima de campo · §5.2, v2.14', () => {
  // Una aldea diminuta no puede ser MÁS segura en comida que una grande. Sin
  // esta regla, dos supervivientes cosechaban trescientas fanegas contra
  // noventa y seis de consumo y el valle se quedaba cuarenta años en una línea
  // plana: ni se moría ni se recuperaba.
  const village = (adults: number, fields: number): GameState => {
    const s = founded(7);
    s.people.villagers = s.people.villagers.map((v, i) => (
      i < adults
        ? { ...v, bornTick: -30 * TIME.WEEKS_PER_YEAR }
        : { ...v, diedTick: 0, causeOfDeath: 'natural' as const }
    ));
    s.people.namedIds = s.people.namedIds.filter(
      (id) => s.people.villagers.find((v) => v.id === id)?.diedTick === null,
    );
    s.buildings = s.buildings.filter((b) => b.kind !== 'field');
    for (let i = 0; i < fields; i += 1) s.buildings.push(build('field'));
    return s;
  };

  it('dos supervivientes no trabajan ningún campo', () => {
    const a = allocateLabour(village(2, 4));
    expect(a.workedFields).toBe(0);
    expect(a.labourFactor).toBe(0);
  });

  it('y por tanto no cosechan nada', () => {
    const s = village(2, 4);
    s.tick = TIME.HARVEST_WEEK;
    const reaped = harvest(s, allocateLabour(s));
    expect(reaped.happened).toBe(true);
    expect(reaped.yielded).toBe(0);
  });

  it('una aldea entera sí trabaja sus campos', () => {
    expect(allocateLabour(village(20, 4)).workedFields).toBeGreaterThan(0);
  });

  it('nunca se trabajan más campos de los que hay brazos para tripular', () => {
    for (const adults of [1, 2, 3, 4, 6, 8, 12, 20]) {
      const a = allocateLabour(village(adults, 8));
      expect(a.workedFields * FOOD.MIN_FIELD_CREW, `${adults} adultos`)
        .toBeLessThanOrEqual(a.farmers + 1e-9);
    }
  });
});

describe('la cosecha ya vendida · §5.3, v2.25', () => {
  // El mecanismo que el Anexo A pedía desde A.3 —«cosecha del año ×0.55»— y que
  // se había implementado como una bandera que nadie lee.
  function ready(seed = 7): GameState {
    const s = founded(seed);
    s.tick = TIME.HARVEST_WEEK;
    return s;
  }

  it('sin modificador, la cosecha es la de siempre', () => {
    const s = ready();
    expect(s.harvestModifier).toBeNull();
    expect(harvest(s, allocateLabour(s)).yielded).toBeGreaterThan(0);
  });

  it('con 0,55, la cosecha sale al 55 % de lo que habría sido', () => {
    const plain = harvest(ready(), allocateLabour(ready())).yielded;
    const s = ready();
    s.harvestModifier = { factor: 0.55, harvests: 1 };
    expect(harvest(s, allocateLabour(s)).yielded).toBeCloseTo(plain * 0.55, 6);
  });

  it('se gasta en la cosecha, no con el tiempo', () => {
    // La promesa es «la cosecha del año siguiente», no «un año»: la paga la
    // siguiente siega, se decida en primavera o la semana antes de segar.
    const s = ready();
    s.harvestModifier = { factor: 0.55, harvests: 1 };
    harvest(s, allocateLabour(s));
    expect(s.harvestModifier).toBeNull();
  });

  it('dos siegas si son dos las prometidas', () => {
    const s = ready();
    s.harvestModifier = { factor: 0.5, harvests: 2 };
    harvest(s, allocateLabour(s));
    expect(s.harvestModifier).toEqual({ factor: 0.5, harvests: 1 });
    harvest(s, allocateLabour(s));
    expect(s.harvestModifier).toBeNull();
  });

  it('una semana que no es la de la siega no gasta la promesa', () => {
    const s = founded(7);
    s.tick = TIME.HARVEST_WEEK + 1;
    s.harvestModifier = { factor: 0.55, harvests: 1 };
    harvest(s, allocateLabour(s));
    expect(s.harvestModifier).toEqual({ factor: 0.55, harvests: 1 });
  });
});

describe('el grano reservado para sembrar · A.3', () => {
  it('fuerza hambre 0,5 mientras la bandera sigue activa', () => {
    const s = founded(7);
    s.flags['forced_hunger'] = s.tick + 8;
    expect(consume(s).severity).toBe(0.5);
  });

  it('deja de forzarla al vencer las ocho semanas', () => {
    const s = founded(7);
    s.flags['forced_hunger'] = 8;
    s.tick = 8;
    expect(consume(s).severity).toBe(0);
  });
});
