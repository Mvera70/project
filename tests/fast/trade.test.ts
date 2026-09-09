// M-30 · design.md §7.8 — los comerciantes del camino.
//
// Lo que se protege: que un trato mueva de verdad el rebaño y no sólo el
// texto, que ningún trato deje a la aldea con más cabezas de las que puede
// alimentar ni con menos de cero, que la sal cumpla lo que promete, y que los
// tres comerciantes sean gente distinta y no un mismo menú con tres nombres.
import { describe, expect, it } from 'vitest';
import { ANIMALS, TIME } from '@engine/balance';
import { BANK, CROSSROAD_BANK } from '@engine/chronicle/bank.en';
import { CATALOG, TRADE_TEMPLATES } from '@engine/crossroads/catalog';
import { applyEffect } from '@engine/crossroads/resolve';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { herdCapacity } from '@engine/subsistence/herd';
import { consume } from '@engine/subsistence/consumption';
import type { AppliedEffects } from '@engine/crossroads/schema';
import type { GameState } from '@engine/state';

const grown = new Map<string, GameState>();
function village(years: number, seed = 7): GameState {
  const key = `${years}:${seed}`;
  let base = grown.get(key);
  if (base === undefined) {
    base = foundGame(seed);
    run(base, years * 48, 'prudent', CATALOG);
    grown.set(key, base);
  }
  return structuredClone(base);
}

/** `applyEffect` pide reparto y acumulador; ningún efecto de trueque usa ni
 * uno ni otro, así que aquí van vacíos y se comprueba que siguen vacíos. */
function blank(): AppliedEffects {
  return {
    templateId: 'test', optionId: 'test', killed: [], left: [], arrived: [],
    seedsPlanted: [], build: [], destroy: [], fell: [], visible: [],
  };
}

function trade(state: GameState, kind: 'hens' | 'pigs' | 'cows', delta: number): AppliedEffects {
  const out = blank();
  applyEffect(state, {}, { k: 'herd', kind, delta }, out);
  return out;
}

/** Todas las opciones de los tres comerciantes, aplanadas. */
const OPTIONS = TRADE_TEMPLATES.flatMap((t) => t.options.map((o) => ({ t, o })));

describe('el trato mueve el rebaño · §7.8', () => {
  it('comprar la vaca deja una vaca más', () => {
    const state = village(20);
    state.herd.cows = 0;
    trade(state, 'cows', 1);
    expect(state.herd.cows).toBe(1);
  });

  it('vender cerdos deja dos cerdos menos y no baja de cero', () => {
    const state = village(20);
    state.herd.pigs = 3;
    trade(state, 'pigs', -2);
    expect(state.herd.pigs).toBe(1);

    state.herd.pigs = 1;
    trade(state, 'pigs', -2);
    expect(state.herd.pigs).toBe(0);
  });

  it('nadie puede venderle a la aldea más cabezas de las que alimenta', () => {
    // Un tratante no deja un valle con más vacas que pasto: es el mismo techo
    // que respeta la cría de §7.7.
    const state = village(20);
    const ceiling = herdCapacity(state).cows;
    state.herd.cows = ceiling;
    trade(state, 'cows', 5);
    expect(state.herd.cows).toBe(ceiling);
  });

  it('un trato de ganado no toca ninguna otra especie', () => {
    const state = village(20);
    const before = { ...state.herd };
    trade(state, 'pigs', -1);
    expect(state.herd.hens).toBe(before.hens);
    expect(state.herd.cows).toBe(before.cows);
  });

  it('comerciar no consume una sola tirada de azar', () => {
    const state = village(20);
    const before = { ...state.rng };
    const out = trade(state, 'cows', 1);
    trade(state, 'pigs', -2);
    expect(state.rng).toEqual(before);
    // Y un trueque no mata, ni expulsa, ni construye: sólo mueve cabezas.
    expect(out.killed).toEqual([]);
    expect(out.arrived).toEqual([]);
    expect(out.build).toEqual([]);
  });
});

describe('la sal cumple lo que promete · §7.8', () => {
  it('con sal, la misma matanza da más comida', () => {
    const make = (): GameState => {
      const s = village(20);
      s.village.grain = 0;
      s.herd = { hens: 0, pigs: 4, cows: 0 };
      return s;
    };

    const plain = make();
    const plainMeat = consume(plain).herd.meat;

    const salted = make();
    salted.flags['salted'] = salted.tick + 5 * TIME.WEEKS_PER_YEAR;
    const saltedMeat = consume(salted).herd.meat;

    expect(saltedMeat).toBeGreaterThan(plainMeat);
    expect(saltedMeat).toBeCloseTo(plainMeat * ANIMALS.SALTED_MEAT);
  });

  it('la sal caducada ya no vale', () => {
    const state = village(20);
    state.village.grain = 0;
    state.herd = { hens: 0, pigs: 4, cows: 0 };
    // Una bandera que expiró la semana pasada.
    state.flags['salted'] = state.tick - 1;

    const plain = village(20);
    plain.village.grain = 0;
    plain.herd = { hens: 0, pigs: 4, cows: 0 };

    expect(consume(state).herd.meat).toBeCloseTo(consume(plain).herd.meat);
  });
});

describe('son tres personas distintas · §7.8', () => {
  it('cada comerciante toca un sistema que los otros no tocan', () => {
    const kinds = (id: string): Set<string> => {
      const t = TRADE_TEMPLATES.find((x) => x.id === id)!;
      return new Set(t.options.flatMap((o) => o.effects.map((e) => e.k)));
    };
    // El tratante mueve el rebaño, el salinero deja bandera, el factor no
    // hace ninguna de las dos con el ganado.
    expect(kinds('cattle_drover').has('herd')).toBe(true);
    expect(kinds('salt_carrier').has('flag')).toBe(true);
    expect(kinds('grain_factor').has('herd')).toBe(false);
  });

  it('cada uno llega en una estación distinta', () => {
    // Tres comerciantes que llegaran el mismo mes serían el mismo comerciante.
    const seasons = TRADE_TEMPLATES.map((t) => {
      const c = t.requires.find((r) => r.k === 'season');
      return c === undefined ? null : c.season;
    });
    expect(new Set(seasons).size).toBe(seasons.length);
    expect(seasons.includes(null)).toBe(false);
  });

  it('ninguno entra en una aldea hostil', () => {
    // Nadie sube por ese camino a vender si le van a recibir con piedras.
    for (const t of TRADE_TEMPLATES) {
      expect(t.requires, t.id).toContainEqual({ k: 'flag', flag: 'hostile', set: false });
    }
  });

  it('vender el excedente se paga en ser visto, no en grano', () => {
    const sell = TRADE_TEMPLATES.find((t) => t.id === 'grain_factor')!
      .options.find((o) => o.id === 'sell_the_surplus')!;
    expect(sell.effects).toContainEqual({ k: 'flag', flag: 'watched', years: 15 });
  });
});

describe('los textos existen · §9.1', () => {
  it('cada comerciante tiene título, cuerpo y todas sus etiquetas', () => {
    for (const t of TRADE_TEMPLATES) {
      expect(CROSSROAD_BANK[t.title], t.title).toBeTruthy();
      expect(CROSSROAD_BANK[t.body], t.body).toBeTruthy();
      for (const o of t.options) {
        expect(CROSSROAD_BANK[o.label], o.label).toBeTruthy();
        expect(CROSSROAD_BANK[o.cost], o.cost).toBeTruthy();
      }
    }
  });

  it('cada opción tiene su línea de crónica', () => {
    for (const { t, o } of OPTIONS) {
      const key = `crossroad.${t.id}.${o.id}`;
      expect(BANK[key], key).toBeTruthy();
    }
  });

  it('toda opción de un comerciante cambia algo en pantalla', () => {
    // El principio 1 del juego, aplicado a la categoría nueva.
    for (const { t, o } of OPTIONS) {
      expect(o.visible.length, `${t.id}.${o.id}`).toBeGreaterThanOrEqual(1);
    }
  });
});
