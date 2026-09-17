// M-30 · design.md §7.8 — los comerciantes del camino.
//
// Lo que se protege: que un trato mueva de verdad el rebaño y no sólo el
// texto, que ningún trato deje a la aldea con más cabezas de las que puede
// alimentar ni con menos de cero, que la sal cumpla lo que promete, y que los
// tres comerciantes sean gente distinta y no un mismo menú con tres nombres.
import { population } from '@engine/people/demography';
import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { FOOD, ANIMALS, TIME } from '@engine/balance';
import { BANK, CROSSROAD_BANK } from '@engine/chronicle/bank.en';
import { CATALOG, TRADE_TEMPLATES } from '@engine/crossroads/catalog';
import { applyEffect } from '@engine/crossroads/resolve';
import { OFFER } from '@engine/balance';
import { postOffer } from '@engine/world/road';
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
    base = foundTwenty(seed);
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
  it('con sal, cada res cunde más y hace falta matar menos', () => {
    // v2.97: esta prueba medía antes la carne TOTAL de la semana, y eso es la
    // métrica equivocada — con sal se para de matar antes, así que el total
    // puede salir menor. Lo que la sal salva son cabezas, y eso es lo que se
    // mide aquí.
    // **Se barre el hueco que hay que tapar, no el tamaño del rebaño.**
    //
    // La sal no da carne: hace que cada res cunda un 35 % más, y las reses se
    // matan de una en una hasta cubrir la semana. Así que la sal salva una
    // cabeza sólo cuando el déficit cae donde los dos redondeos difieren: con
    // un hueco de 40 hacen falta dos reses con sal y sin ella (40/25 y 40/33,75
    // suben las dos a 2), y con uno de 30 hacen falta dos sin sal y una con.
    //
    // La primera versión fijaba un solo escenario y medía, sin saberlo, si ese
    // escenario caía en el tramo bueno. En v3.61 el carácter cambió la
    // población, el hueco se movió y la prueba acusó a la sal de no funcionar.
    // Y en R-1 volvió a pasar con cerdos: el hueco de una res de 25 está entre
    // 25 y 33,75 de déficit, y una aldea de dieciséis no debe nunca tanto en
    // una semana. Con gallinas —dos de carne, 2,7 saladas— el hueco se repite
    // cada pocos celemines y el barrido lo cruza sea cual sea la población.
    const make = (grain: number): GameState => {
      const s = village(20);
      s.village.grain = grain;
      s.herd = { hens: 40, pigs: 0, cows: 0 };
      return s;
    };

    let saved = 0;
    const demand = population(make(0)) * FOOD.GRAIN_PER_PERSON;
    for (let grain = 0; grain <= demand; grain += 1) {
      const plain = make(grain);
      consume(plain);

      const salted = make(grain);
      salted.flags['salted'] = salted.tick + 5 * TIME.WEEKS_PER_YEAR;
      consume(salted);

      expect(salted.herd.hens, `con ${grain} de grano, la sal nunca cuesta cabezas`)
        .toBeGreaterThanOrEqual(plain.herd.hens);
      saved += salted.herd.hens - plain.herd.hens;
    }
    expect(saved, 'barriendo el hueco, la sal salva cabezas').toBeGreaterThan(0);
  });

  it('una sola res salada alimenta más que una sin salar', () => {
    // La misma regla vista de cerca: una cabeza, y lo que rinde.
    const one = (flagged: boolean): number => {
      const s = village(20);
      s.village.grain = 0;
      s.herd = { hens: 0, pigs: 1, cows: 0 };
      if (flagged) s.flags['salted'] = s.tick + 5 * TIME.WEEKS_PER_YEAR;
      return consume(s).herd.meat;
    };
    expect(one(true)).toBeCloseTo(one(false) * ANIMALS.SALTED_MEAT);
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
    expect(state.herd.pigs).toBe(plain.herd.pigs);
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

/**
 * Una aldea en primavera, con la despensa llena y sin crisis: el estado exacto
 * en que el tratante de ganado puede llamar a la puerta. Las dos pruebas que
 * comprueban que NO llega necesitan partir de aquí, o pasarían por el motivo
 * equivocado — y de hecho pasaban, hasta que una mutación lo destapó.
 */
function driverWelcome(): GameState {
  const state = village(20);
  state.tick = Math.floor(state.tick / TIME.WEEKS_PER_YEAR) * TIME.WEEKS_PER_YEAR + 2;
  state.village.grain = 6000;
  state.village.morale = 70;
  delete state.flags['hostile'];
  // Sin pregunta pendiente y sin comerciante reciente: las dos cosas que el
  // canal comprueba antes que nada. Una aldea de veinte anos puede llegar aqui
  // con cualquiera de las dos puestas, y entonces el escenario no probaria lo
  // que dice probar.
  state.crossroad = null;
  state.history = state.history.filter((d) => !TRADE_TEMPLATES.some((t) => t.id === d.templateId));
  return state;
}

describe('las visitas del camino · M-0', () => {
  // **El canal propio de §7.8 se retiró en M-0** y sus pruebas viven aquí, en
  // la forma que las visitas tienen ahora: sucesos que dejan una oferta. Lo
  // que aquellas pruebas protegían sigue protegido, y dos cosas se cumplen ya
  // por construcción: un comerciante no cuenta para el reposo de §8.6 (no es
  // una encrucijada) y no entra en el sorteo del catálogo (no está en él).
  const VISITS = ['pedlar', 'factor_visit', 'drover_visit', 'salt_visit'] as const;

  it('los tres comerciantes ya no plantean encrucijadas', () => {
    const ids = new Set(CATALOG.map((t) => t.id));
    for (const t of TRADE_TEMPLATES) expect(ids.has(t.id), t.id).toBe(false);
  });

  it('nadie sube a vender a una aldea hostil, ni con otra oferta esperando', () => {
    const state = driverWelcome();
    state.flags['hostile'] = 0;
    // Desde aquí: el valle de estas pruebas viene de veinte años jugados y ya
    // tiene visitas en su historia. Lo que se mide es lo que pasa **después**.
    const before = state.happenings.length;
    run(state, TIME.WEEKS_PER_YEAR * 5, 'prudent', CATALOG);
    expect(state.happenings.slice(before)
      .some((h) => (VISITS as readonly string[]).includes(h.id))).toBe(false);
    // Y con una oferta en pie no sube otro: `state.offer` es una sola casilla,
    // así que una segunda visita borraría la primera sin que nadie la viera.
    const busy = driverWelcome();
    postOffer(busy, 'pedlar', [], []);
    const posted = busy.offer;
    run(busy, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    if (busy.offer !== null) expect(busy.offer.postedTick).toBe(posted?.postedTick);
  });

  it('nadie sube a vender con una encrucijada sin responder', () => {
    const state = driverWelcome();
    state.crossroad = {
      templateId: 'strangers_at_the_ford', posedTick: state.tick, cast: {}, optionIds: [],
    };
    const before = state.happenings.length;
    run(state, TIME.WEEKS_PER_YEAR * 3, 'prudent', CATALOG);
    const visits = state.happenings.slice(before)
      .filter((h) => (VISITS as readonly string[]).includes(h.id));
    expect(visits).toEqual([]);
  });

  it('una visita no repite hasta que pasa su plazo', () => {
    // Medido: sin plazo, el factor subía 1 181 veces en dieciséis partidas de
    // sesenta años y tapaba al resto de los sucesos.
    const state = driverWelcome();
    run(state, TIME.WEEKS_PER_YEAR * 40, 'prudent', CATALOG);
    for (const id of VISITS) {
      const ticks = state.happenings.filter((h) => h.id === id).map((h) => h.tick);
      for (let i = 1; i < ticks.length; i += 1) {
        expect((ticks[i] ?? 0) - (ticks[i - 1] ?? 0), id).toBeGreaterThanOrEqual(OFFER.AGAIN_WEEKS[id]);
      }
    }
  });

  it('una visita tira sólo del flujo de los sucesos', () => {
    // §4.3, la misma propiedad que guardaba el canal viejo: que venga o no
    // venga alguien a vender no puede desplazar una muerte.
    const state = driverWelcome();
    const before = { ...state.rng };
    run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    // Lo comprueba `fate.test.ts` para todos los sucesos; aquí basta con que
    // el flujo de los comerciantes ya no se toque: no hay canal que lo tire.
    expect(state.rng.traders).toBe(before.traders);
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
