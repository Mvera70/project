// M-02 · Coherencia interna de design.md §12 y de la tabla de §7.2.
//
// Estos tests no comprueban que el juego esté bien balanceado — eso es la suite
// de balance (§12.9). Comprueban que los números concuerdan entre sí: los topes
// que aparecen en dos sitios, las unidades que se derivan unas de otras y las
// relaciones que §4.1 y §12 declaran como decisiones de diseño. Un fallo aquí
// es una errata en el documento, y cinco módulos la heredarían.
import { describe, expect, it } from 'vitest';
import {
  BUILDINGS,
  CROSSROADS,
  FOOD,
  FOUNDING,
  LIFE,
  TIME,
  WEATHER,
} from '@engine/balance';
import type { BuildingKind } from '@engine/state';

/** Aforo máximo de la aldea: 16 casas × 5. design.md §12.4. */
const MAX_CAPACITY = LIFE.MAX_HOUSES * LIFE.HOUSE_CAPACITY;

describe('balance · fundación', () => {
  it('los tres grupos de edad suman la población fundadora', () => {
    expect(FOUNDING.ADULTS + FOUNDING.CHILDREN + FOUNDING.ELDERS).toBe(FOUNDING.POPULATION);
  });

  it('la fundación arranca con margen alimentario, pero poco', () => {
    // design.md §12.2: dos campos contra veinte bocas. El margen tiene que
    // dejar crecer y no perdonar un año malo seguido de otro.
    const yielded = FOUNDING.FIELDS * FOOD.FIELD_YIELD;
    const eaten = FOUNDING.POPULATION * TIME.WEEKS_PER_YEAR * FOOD.GRAIN_PER_PERSON;
    const margin = yielded / eaten;
    expect(margin).toBeGreaterThanOrEqual(1.2);
    expect(margin).toBeLessThanOrEqual(1.35);
  });

  it('el grano inicial cubre casi un año entero', () => {
    const yearOfFood = FOUNDING.POPULATION * TIME.WEEKS_PER_YEAR * FOOD.GRAIN_PER_PERSON;
    expect(FOUNDING.GRAIN / yearOfFood).toBeGreaterThan(0.75);
    expect(FOUNDING.GRAIN / yearOfFood).toBeLessThan(1.2);
  });

  it('la aldea no nace por encima de su propia capacidad', () => {
    // §12.2: GRAIN es exactamente BASE_STORAGE. Con más, la merma de §5.3
    // mordería desde el primer tick y se leería como un fallo.
    expect(FOUNDING.GRAIN).toBeLessThanOrEqual(FOOD.BASE_STORAGE);
    expect(FOUNDING.GRAIN).toBe(FOOD.BASE_STORAGE);
  });

  it('la aldea nace con casas de sobra para su gente', () => {
    expect(FOUNDING.HOUSES * LIFE.HOUSE_CAPACITY).toBeGreaterThanOrEqual(FOUNDING.POPULATION);
    expect(FOUNDING.HOUSES).toBeLessThanOrEqual(LIFE.MAX_HOUSES);
    expect(FOUNDING.FIELDS).toBeLessThanOrEqual(FOOD.MAX_FIELDS);
  });
});

describe('balance · clima', () => {
  it('las probabilidades suman exactamente 1', () => {
    expect(WEATHER.reduce((a, w) => a + w.p, 0)).toBe(1);
  });

  it('suman 1 también en aritmética entera, no por casualidad de coma flotante', () => {
    // El aserto de arriba depende del orden de suma. Éste no.
    expect(WEATHER.reduce((a, w) => a + Math.round(w.p * 1000), 0)).toBe(1000);
  });

  it('los factores están ordenados de ruinoso a abundante y rodean el 1', () => {
    const factors = WEATHER.map((w) => w.f);
    expect([...factors].sort((a, b) => a - b)).toEqual([...factors]);
    expect(Math.min(...factors)).toBeLessThan(1);
    expect(Math.max(...factors)).toBeGreaterThan(1);
    expect(factors).toContain(1);
  });

  it('el año esperado es algo peor que uno normal', () => {
    // Si la esperanza fuera ≥ 1 la hambruna nunca llegaría sola (§12.2).
    const expected = WEATHER.reduce((a, w) => a + w.f * w.p, 0);
    expect(expected).toBeGreaterThan(0.9);
    expect(expected).toBeLessThan(1.0);
  });
});

describe('balance · mortalidad', () => {
  const brackets = LIFE.MORTALITY;

  it('los tramos son monótonos en edad y cubren de 0 a 200 sin hueco', () => {
    let previousTo = -1;
    for (const b of brackets) {
      expect(b.to).toBeGreaterThan(previousTo); // sin hueco y sin solape
      previousTo = b.to;
    }
    expect(brackets[0]?.to).toBeGreaterThanOrEqual(0);
    expect(brackets[brackets.length - 1]?.to).toBe(200);
  });

  it('toda edad de 0 a 200 cae en exactamente un tramo', () => {
    for (let age = 0; age <= 200; age += 1) {
      const matching = brackets.filter((b, i) => age <= b.to && (i === 0 || age > (brackets[i - 1]?.to ?? -1)));
      expect(matching.length).toBe(1);
    }
  });

  // La curva es una bañera, no una rampa: la mortalidad infantil es alta, cae
  // en la infancia y vuelve a subir con la edad. Por eso la monotonía se exige
  // a partir del segundo tramo, y el escalón inicial se asevera aparte para que
  // nadie lo "arregle" creyéndolo una errata.
  it('a partir de la infancia la mortalidad sólo sube', () => {
    const adultCurve = brackets.slice(1);
    for (let i = 1; i < adultCurve.length; i += 1) {
      expect(adultCurve[i]?.rate).toBeGreaterThanOrEqual(adultCurve[i - 1]?.rate ?? 0);
    }
  });

  it('el tramo de los recién nacidos es deliberadamente más mortal que el siguiente', () => {
    expect(brackets[0]?.rate).toBeGreaterThan(brackets[1]?.rate ?? 0);
  });

  it('ninguna tasa anual es negativa ni pasa de 1', () => {
    for (const b of brackets) {
      expect(b.rate).toBeGreaterThan(0);
      expect(b.rate).toBeLessThanOrEqual(1);
    }
  });

  it('los tramos de edad adulta y fértil caben dentro de la tabla', () => {
    expect(LIFE.FERTILE[0]).toBeGreaterThanOrEqual(LIFE.ADULT[0]);
    expect(LIFE.FERTILE[1]).toBeLessThanOrEqual(LIFE.ADULT[1]);
    expect(LIFE.ADULT[1]).toBeLessThanOrEqual(200);
  });
});

describe('balance · topes duplicados', () => {
  it('el aforo máximo es 80, y coincide con el tope de casas de §7.2', () => {
    expect(MAX_CAPACITY).toBe(80);
    expect(BUILDINGS.house.cap).toBe(LIFE.MAX_HOUSES);
  });

  it('los topes de campos y graneros concuerdan entre §12.3 y §7.2', () => {
    expect(BUILDINGS.field.cap).toBe(FOOD.MAX_FIELDS);
    expect(BUILDINGS.granary.cap).toBe(FOOD.MAX_GRANARIES);
  });

  it('la tabla de edificios cubre todos los BuildingKind', () => {
    // Comprobación de tipos: si §3.5 añade un edificio y §7.2 no, no compila.
    const covered: Record<BuildingKind, unknown> = BUILDINGS;
    expect(Object.keys(covered).length).toBe(13);
  });

  it('cada edificio ocupa celdas y cuesta obra', () => {
    for (const [kind, b] of Object.entries(BUILDINGS)) {
      expect(b.w, kind).toBeGreaterThan(0);
      expect(b.h, kind).toBeGreaterThan(0);
      expect(b.bp, kind).toBeGreaterThan(0);
      expect(b.wood, kind).toBeGreaterThanOrEqual(0);
      expect(b.stone, kind).toBeGreaterThanOrEqual(0);
    }
  });

  it('los edificios de piedra son tier 1 y los de madera tier 0', () => {
    // §5.9: los de piedra no arden. El tier es lo que decide qué puede arder.
    for (const [kind, b] of Object.entries(BUILDINGS)) {
      expect(b.tier === 1, kind).toBe(b.stone > 0);
    }
  });

  it('toda mejora apunta a un edificio de madera que existe', () => {
    for (const [kind, b] of Object.entries(BUILDINGS)) {
      if (b.upgradeOf === null) continue;
      const base = BUILDINGS[b.upgradeOf];
      expect(base, kind).toBeDefined();
      expect(base.tier, kind).toBe(0);
      expect(b.tier, kind).toBe(1);
    }
  });

  it('el valle lleno de campos puede alimentar al valle lleno de gente', () => {
    const grown = FOOD.MAX_FIELDS * FOOD.FIELD_YIELD;
    const eaten = MAX_CAPACITY * TIME.WEEKS_PER_YEAR * FOOD.GRAIN_PER_PERSON;
    expect(grown).toBeGreaterThanOrEqual(eaten);
  });

  it('los graneros llenos guardan más de medio año de comida', () => {
    const storage = FOOD.BASE_STORAGE + FOOD.MAX_GRANARIES * FOOD.GRANARY_CAPACITY;
    const yearOfFood = MAX_CAPACITY * TIME.WEEKS_PER_YEAR * FOOD.GRAIN_PER_PERSON;
    expect(storage / yearOfFood).toBeGreaterThan(0.5);
  });
});

describe('balance · tiempo', () => {
  it('cuatro estaciones hacen un año', () => {
    expect(TIME.WEEKS_PER_SEASON * 4).toBe(TIME.WEEKS_PER_YEAR);
  });

  it('la semana de la cosecha cae en otoño', () => {
    // design.md §5.1: autumn son las semanas 24 a 35.
    const season = Math.floor(TIME.HARVEST_WEEK / TIME.WEEKS_PER_SEASON);
    expect(season).toBe(2);
    expect(TIME.HARVEST_WEEK).toBeLessThan(TIME.WEEKS_PER_YEAR);
  });

  it('una generación y la ventana de letargo son la misma unidad', () => {
    // design.md §4.1: no es una coincidencia, es una decisión de diseño. Volver
    // tras la ausencia máxima es volver una generación después.
    const generationMs = TIME.GENERATION_YEARS * TIME.WEEKS_PER_YEAR * TIME.REAL_MS_PER_TICK;
    expect(generationMs).toBe(TIME.LETHARGY_CAP_MS);
  });

  it('las velocidades incluyen la pausa y están ordenadas', () => {
    expect(TIME.SPEEDS[0]).toBe(0);
    expect([...TIME.SPEEDS].sort((a, b) => a - b)).toEqual([...TIME.SPEEDS]);
  });
});

describe('balance · encrucijadas', () => {
  it('la garantía es exactamente una generación', () => {
    expect(CROSSROADS.GUARANTEE_TICKS).toBe(TIME.GENERATION_YEARS * TIME.WEEKS_PER_YEAR);
  });

  it('el techo son 30 minutos reales a ×1', () => {
    expect(CROSSROADS.MIN_TICKS_BETWEEN * TIME.REAL_MS_PER_TICK).toBe(30 * 60 * 1000);
  });

  it('el techo es mucho más estrecho que la garantía', () => {
    expect(CROSSROADS.MIN_TICKS_BETWEEN).toBeLessThan(CROSSROADS.GUARANTEE_TICKS);
  });

  it('la crisis empuja hacia arriba y la repetición hacia abajo', () => {
    expect(CROSSROADS.CRISIS_MULTIPLIER).toBeGreaterThan(1);
    expect(CROSSROADS.NOVELTY_MULTIPLIER).toBeLessThan(1);
    expect(CROSSROADS.NOVELTY_MULTIPLIER).toBeGreaterThan(0);
  });
});
