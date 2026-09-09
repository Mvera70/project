// M-29 · design.md §7.7, §5.3 — los cuervos.
//
// Lo que se protege: que muerdan solo cuando el grano está en pie, que la
// vigilancia sirva, que vigilar cueste brazos de verdad, y que un año no pague
// nunca los pájaros del anterior.
import { describe, expect, it } from 'vitest';
import { ANIMALS, CROWS, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run, tick } from '@engine/sim';
import { crowSeason, crowsPeck, wardensWanted } from '@engine/subsistence/crows';
import { harvest } from '@engine/subsistence/harvest';
import { allocateLabour } from '@engine/subsistence/labour';
import { SCHEMA_VERSION, type GameState } from '@engine/state';

function village(years: number, seed = 7): GameState {
  const state = foundGame(seed);
  run(state, years * 48, 'prudent', CATALOG);
  return state;
}

/** Coloca el reloj en una semana concreta del año en curso. */
function atWeek(state: GameState, week: number): GameState {
  state.tick = Math.floor(state.tick / TIME.WEEKS_PER_YEAR) * TIME.WEEKS_PER_YEAR + week;
  return state;
}

describe('cuándo hay cuervos · §7.7', () => {
  it('solo en las semanas con el grano en pie antes de la siega', () => {
    const first = TIME.HARVEST_WEEK - ANIMALS.CROW_WEEKS_BEFORE_HARVEST;
    expect(crowSeason(first)).toBe(true);
    expect(crowSeason(TIME.HARVEST_WEEK - 1)).toBe(true);
    expect(crowSeason(first - 1)).toBe(false);
    // La semana de la siega ya no: el grano está segado.
    expect(crowSeason(TIME.HARVEST_WEEK)).toBe(false);
  });

  it('fuera de temporada no se pide un solo guarda', () => {
    const state = atWeek(village(20), 5);
    expect(wardensWanted(state, 8)).toBe(0);
    expect(allocateLabour(state).wardens).toBe(0);
  });

  it('sin campos no hay nada que vigilar', () => {
    const state = atWeek(village(20), TIME.HARVEST_WEEK - 2);
    for (const b of state.buildings) if (b.kind === 'field') b.lostTick = state.tick;
    expect(wardensWanted(state, 0)).toBe(0);
  });
});

describe('lo que muerden · §7.7', () => {
  it('sin nadie vigilando muerden cada semana', () => {
    const state = atWeek(village(20), TIME.HARVEST_WEEK - 3);
    const a = { ...allocateLabour(state), wardens: 0 };
    state.crowBite = 0;
    const bit = crowsPeck(state, a);
    expect(bit).toBeCloseTo(CROWS.BITE_PER_WEEK);
    expect(state.crowBite).toBeCloseTo(CROWS.BITE_PER_WEEK);
  });

  it('con los campos vigilados no muerden nada', () => {
    const state = atWeek(village(20), TIME.HARVEST_WEEK - 3);
    const base = allocateLabour(state);
    const a = { ...base, wardens: wardensWanted(state, base.workedFields) };
    state.crowBite = 0;
    expect(crowsPeck(state, a)).toBe(0);
    expect(state.crowBite).toBe(0);
  });

  it('media vigilancia, medio mordisco', () => {
    const state = atWeek(village(20), TIME.HARVEST_WEEK - 3);
    const base = allocateLabour(state);
    const half = wardensWanted(state, base.workedFields) / 2;
    state.crowBite = 0;
    expect(crowsPeck(state, { ...base, wardens: half })).toBeCloseTo(CROWS.BITE_PER_WEEK / 2);
  });

  it('por mucho que se descuiden nunca pasan del tope', () => {
    const state = atWeek(village(20), TIME.HARVEST_WEEK - 3);
    const a = { ...allocateLabour(state), wardens: 0 };
    state.crowBite = 0;
    for (let n = 0; n < 200; n += 1) crowsPeck(state, a);
    expect(state.crowBite).toBeLessThanOrEqual(CROWS.MAX_BITE);
  });

  it('la siega paga el mordisco y lo deja a cero', () => {
    const state = atWeek(village(20), TIME.HARVEST_WEEK);
    const a = allocateLabour(state);
    const clean = { ...state, village: { ...state.village }, crowBite: 0 };
    const bitten = { ...state, village: { ...state.village }, crowBite: 0.2 };
    const full = harvest(clean, a).yielded;
    const less = harvest(bitten, a).yielded;
    expect(less).toBeCloseTo(full * 0.8);
    expect(bitten.crowBite).toBe(0);
  });

  it('un año no paga nunca los pájaros del anterior', () => {
    // Dos siegas seguidas sin tocar nada: la segunda no arrastra la primera.
    const state = village(20);
    state.crowBite = 0.3;
    atWeek(state, TIME.HARVEST_WEEK);
    harvest(state, allocateLabour(state));
    expect(state.crowBite).toBe(0);
  });
});

describe('vigilar cuesta · §5.2', () => {
  it('los guardas salen de los brazos que sobran, no de la siega', () => {
    const state = atWeek(village(20), TIME.HARVEST_WEEK - 2);
    const a = allocateLabour(state);
    expect(a.wardens).toBeGreaterThan(0);
    expect(a.wardens).toBeLessThanOrEqual(a.workforce - a.farmers);
  });

  it('en temporada de cuervos quedan menos brazos para el bosque y la obra', () => {
    const inSeason = allocateLabour(atWeek(village(20), TIME.HARVEST_WEEK - 2));
    const outOfSeason = allocateLabour(atWeek(village(20), 5));
    expect(inSeason.wardens).toBeGreaterThan(0);
    expect(inSeason.cutters + inSeason.builders)
      .toBeLessThan(outOfSeason.cutters + outOfSeason.builders);
  });

  it('los cuervos no consumen una sola tirada de azar', () => {
    const state = atWeek(village(20), TIME.HARVEST_WEEK - 2);
    const before = { ...state.rng };
    crowsPeck(state, { ...allocateLabour(state), wardens: 0 });
    expect(state.rng).toEqual(before);
  });
});

describe('el esquema de guardado · §13.1', () => {
  it('una partida recién fundada se sella con la versión de este build', () => {
    // v2.93: estuvo escrito a mano en dos sitios y se desincronizaron. Esta
    // prueba existe para que no vuelva a pasar en silencio.
    expect(foundGame(7).version).toBe(SCHEMA_VERSION);
  });

  it('un año entero de ticks deja el mordisco en un valor legal', () => {
    const state = foundGame(11);
    for (let n = 0; n < TIME.WEEKS_PER_YEAR * 3; n += 1) tick(state, CATALOG);
    expect(state.crowBite).toBeGreaterThanOrEqual(0);
    expect(state.crowBite).toBeLessThanOrEqual(CROWS.MAX_BITE);
  });
});
